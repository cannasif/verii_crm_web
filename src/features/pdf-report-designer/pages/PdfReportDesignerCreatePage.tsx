import type { ReactElement } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useRef, useMemo, useEffect, useCallback, useState } from 'react';
import { DndContext, type DragEndEvent } from '@dnd-kit/core';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Undo2, Redo2, Grid3X3, ArrowLeft, AlertTriangle, FileText } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import {
  pdfReportDesignerCreateSchema,
  type PdfReportDesignerCreateFormValues,
} from '../schemas/pdf-report-designer-create-schema';
import {
  PdfA4Canvas,
  getSectionFromDroppableId,
  parseContainerIdFromDroppableId,
  parseTableIdFromDroppableId,
} from '../components/PdfA4Canvas';
import {
  PdfSidebar,
  type PdfSidebarDragData,
  type PdfFieldPaletteItem,
} from '../components/PdfSidebar';
import { PdfInspectorPanel } from '../components/PdfInspectorPanel';
import { PdfLayersPanel } from '../components/PdfLayersPanel';
import type { PdfCanvasElement, PdfReportElement, PdfTableElement } from '../types/pdf-report-template.types';
import { usePdfReportDesignerStore } from '../store/usePdfReportDesignerStore';
import { usePdfReportTemplateFields } from '../hooks/usePdfReportTemplateFields';
import { useCreatePdfReportTemplate } from '../hooks/useCreatePdfReportTemplate';
import { useUpdatePdfReportTemplate } from '../hooks/useUpdatePdfReportTemplate';
import { usePdfReportTemplateById } from '../hooks/usePdfReportTemplateById';
import { dtoToPdfCanvasElements, pdfCanvasElementsToDto } from '../utils/dto-to-canvas';
import { getApiErrorMessage } from '../utils/get-api-error-message';
import { createClientId } from '@/lib/create-client-id';
import type {
  ReportTemplateCreateDto,
  ReportTemplateGetDto,
  ReportTemplateElementDto,
} from '@/features/pdf-report';
import type { DocumentRuleType } from '@/features/pdf-report';
import { TemplateDesignerRuleType, type TemplateDesignerRuleType as TemplateDesignerRuleTypeValue } from '@/features/pdf-report';
import {
  A4_MM_WIDTH,
  A4_MM_HEIGHT,
  PDF_REPORT_DRAFT_STORAGE_KEY,
} from '../constants';
import {
  PDF_LAYOUT_PRESET,
  getAvailableLayoutPresets,
} from '../constants/layout-presets';

const RULE_TYPE_OPTIONS: TemplateDesignerRuleTypeValue[] = [
  TemplateDesignerRuleType.Demand,
  TemplateDesignerRuleType.Quotation,
  TemplateDesignerRuleType.Order,
  TemplateDesignerRuleType.FastQuotation,
  TemplateDesignerRuleType.Activity,
];

const DEFAULT_ELEMENT_WIDTH = 200;
const DEFAULT_ELEMENT_HEIGHT = 50;
const DEFAULT_TABLE_WIDTH = 680;
const DEFAULT_TABLE_HEIGHT = 220;

function getElementPaddingValue(element?: PdfCanvasElement): number {
  if (!element || element.type === 'table') return 0;
  const padding = element.style?.padding;
  if (typeof padding === 'number') return padding;
  if (typeof padding === 'string') {
    const parsed = Number.parseFloat(padding);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function resolveAbsolutePosition(
  elementsById: Record<string, PdfCanvasElement>,
  element: PdfCanvasElement
): { x: number; y: number } {
  const seen = new Set<string>();
  let current: PdfCanvasElement | undefined = element;
  let x = element.x;
  let y = element.y;

  while (current && current.type !== 'table' && current.parentId) {
    if (seen.has(current.id)) break;
    seen.add(current.id);
    const parent: PdfCanvasElement | undefined = elementsById[current.parentId];
    if (!parent) break;
    const parentPadding = getElementPaddingValue(parent);
    x += parent.x + parentPadding;
    y += parent.y + parentPadding;
    current = parent;
  }

  return { x, y };
}

function ruleTypeForApi(ruleType: TemplateDesignerRuleTypeValue): number {
  return (ruleType - 1) as number;
}

function apiRuleTypeToForm(apiRuleType: number): TemplateDesignerRuleTypeValue {
  const n = apiRuleType + 1;
  if (
    n === TemplateDesignerRuleType.Demand ||
    n === TemplateDesignerRuleType.Quotation ||
    n === TemplateDesignerRuleType.Order ||
    n === TemplateDesignerRuleType.FastQuotation ||
    n === TemplateDesignerRuleType.Activity
  )
    return n;
  return TemplateDesignerRuleType.Demand;
}

function normalizeFormRuleType(value: number | null | undefined): TemplateDesignerRuleTypeValue {
  if (
    value === TemplateDesignerRuleType.Demand ||
    value === TemplateDesignerRuleType.Quotation ||
    value === TemplateDesignerRuleType.Order ||
    value === TemplateDesignerRuleType.FastQuotation ||
    value === TemplateDesignerRuleType.Activity
  ) {
    return value;
  }

  return TemplateDesignerRuleType.Demand;
}

function getRuleTypeLabel(
  ruleType: TemplateDesignerRuleTypeValue,
  t: (key: string) => string
): string {
  if (ruleType === TemplateDesignerRuleType.Demand) return t('reportDesigner.ruleType.demand');
  if (ruleType === TemplateDesignerRuleType.Quotation) return t('reportDesigner.ruleType.quotation');
  if (ruleType === TemplateDesignerRuleType.Order) return t('reportDesigner.ruleType.order');
  if (ruleType === TemplateDesignerRuleType.FastQuotation) return t('reportDesigner.ruleType.fastQuotation');
  return t('reportDesigner.ruleType.activity');
}

function createActivityStarterElements(): PdfCanvasElement[] {
  return [
    {
      id: createClientId(),
      type: 'text',
      section: 'page',
      x: 60,
      y: 36,
      width: 690,
      height: 36,
      text: 'FUAR GORUSME FORMU',
      fontSize: 22,
      fontFamily: 'Helvetica-Bold',
      color: '#0f172a',
      style: { textAlign: 'center' },
    },
    {
      id: createClientId(),
      type: 'field',
      section: 'page',
      x: 60,
      y: 92,
      width: 320,
      height: 24,
      text: 'Firma',
      path: 'CustomerName',
      fontSize: 12,
      fontFamily: 'Helvetica',
      color: '#111827',
    },
    {
      id: createClientId(),
      type: 'field',
      section: 'page',
      x: 400,
      y: 92,
      width: 350,
      height: 24,
      text: 'Gorusulen kisi',
      path: 'ContactName',
      fontSize: 12,
      fontFamily: 'Helvetica',
      color: '#111827',
    },
    {
      id: createClientId(),
      type: 'field',
      section: 'page',
      x: 60,
      y: 124,
      width: 520,
      height: 42,
      text: 'Adres',
      path: 'CustomerAddress',
      fontSize: 11,
      fontFamily: 'Helvetica',
      color: '#334155',
      style: { padding: 8, border: '1px solid #cbd5e1', radius: 8 },
    },
    {
      id: createClientId(),
      type: 'image',
      section: 'page',
      x: 600,
      y: 124,
      width: 150,
      height: 90,
      text: 'Müşteri Kartviziti',
      path: 'CustomerLatestImageUrl',
      style: { imageFit: 'contain', border: '1px dashed #94a3b8', radius: 8, padding: 6 },
    },
    {
      id: createClientId(),
      type: 'field',
      section: 'page',
      x: 60,
      y: 190,
      width: 220,
      height: 22,
      text: 'Odeme',
      path: 'PaymentTypeName',
      fontSize: 11,
      fontFamily: 'Helvetica',
      color: '#111827',
    },
    {
      id: createClientId(),
      type: 'field',
      section: 'page',
      x: 300,
      y: 190,
      width: 220,
      height: 22,
      text: 'Gorusme',
      path: 'ActivityMeetingTypeName',
      fontSize: 11,
      fontFamily: 'Helvetica',
      color: '#111827',
    },
    {
      id: createClientId(),
      type: 'field',
      section: 'page',
      x: 540,
      y: 190,
      width: 210,
      height: 22,
      text: 'Teslimat',
      path: 'ActivityShippingName',
      fontSize: 11,
      fontFamily: 'Helvetica',
      color: '#111827',
    },
    {
      id: createClientId(),
      type: 'field',
      section: 'page',
      x: 60,
      y: 224,
      width: 690,
      height: 30,
      text: 'Ilgilenilen konular',
      path: 'ActivityTopicPurposeName',
      fontSize: 11,
      fontFamily: 'Helvetica',
      color: '#111827',
      style: { padding: 8, border: '1px solid #cbd5e1', radius: 8 },
    },
    {
      id: createClientId(),
      type: 'field',
      section: 'page',
      x: 60,
      y: 270,
      width: 690,
      height: 130,
      text: 'Gorusme ozeti',
      path: 'Description',
      fontSize: 11,
      fontFamily: 'Helvetica',
      color: '#111827',
      style: { padding: 10, border: '1px solid #cbd5e1', radius: 8 },
    },
    {
      id: createClientId(),
      type: 'field',
      section: 'page',
      x: 60,
      y: 420,
      width: 330,
      height: 24,
      text: 'Gorusen kisi',
      path: 'AssignedUserName',
      fontSize: 11,
      fontFamily: 'Helvetica',
      color: '#111827',
    },
    {
      id: createClientId(),
      type: 'field',
      section: 'page',
      x: 430,
      y: 420,
      width: 320,
      height: 24,
      text: 'Tarih',
      path: 'StartDateTime',
      fontSize: 11,
      fontFamily: 'Helvetica',
      color: '#111827',
    },
  ];
}

function isPdfSidebarDragData(data: unknown): data is PdfSidebarDragData {
  const d = data as PdfSidebarDragData | null;
  return (
    typeof d === 'object' &&
    d !== null &&
    typeof d.type === 'string' &&
    typeof d.path === 'string' &&
    typeof d.label === 'string'
  );
}

function applyTemplateToFormAndStore(
  template: ReportTemplateGetDto,
  form: ReturnType<typeof useForm<PdfReportDesignerCreateFormValues>>,
  setElements: (elements: import('../types/pdf-report-template.types').PdfCanvasElement[]) => void
): void {
  const formRuleType = apiRuleTypeToForm(template.ruleType as number);
  form.reset({
    ruleType: formRuleType,
    title: template.title,
    default: template.default ?? false,
    pageCount: Math.max(1, template.templateData.page.pageCount ?? 1),
    layoutPreset: PDF_LAYOUT_PRESET.Custom,
  });
  setElements(dtoToPdfCanvasElements(template.templateData.elements, template.templateData.page.unit));
}

export function PdfReportDesignerCreatePage(): ReactElement {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id: idParam } = useParams<{ id: string }>();
  const location = useLocation();
  const copyFrom = (location.state as { copyFrom?: ReportTemplateGetDto } | null)?.copyFrom;
  const editId = idParam != null ? parseInt(idParam, 10) : null;
  const isEdit = editId != null && !Number.isNaN(editId) && editId > 0;

  const pageCanvasRefs = useRef<Map<number, HTMLDivElement | null>>(new Map());
  const handlePageRef = useCallback((page: number, el: HTMLDivElement | null) => {
    if (el) pageCanvasRefs.current.set(page, el);
    else pageCanvasRefs.current.delete(page);
  }, []);
  const setElements = usePdfReportDesignerStore((s) => s.setElements);
  const addElement = usePdfReportDesignerStore((s) => s.addElement);
  const addColumnToTable = usePdfReportDesignerStore((s) => s.addColumnToTable);
  const getOrderedElements = usePdfReportDesignerStore((s) => s.getOrderedElements);
  const undo = usePdfReportDesignerStore((s) => s.undo);
  const redo = usePdfReportDesignerStore((s) => s.redo);
  const historyIndex = usePdfReportDesignerStore((s) => s.historyIndex);
  const history = usePdfReportDesignerStore((s) => s.history);
  const snapEnabled = usePdfReportDesignerStore((s) => s.snapEnabled);
  const setSnapEnabled = usePdfReportDesignerStore((s) => s.setSnapEnabled);

  const form = useForm<PdfReportDesignerCreateFormValues, unknown, PdfReportDesignerCreateFormValues>(
    {
      resolver: zodResolver(pdfReportDesignerCreateSchema),
      mode: 'onChange',
      reValidateMode: 'onChange',
        defaultValues: {
        ruleType: TemplateDesignerRuleType.Demand,
        title: '',
        default: false,
        pageCount: 1,
        layoutPreset: PDF_LAYOUT_PRESET.Custom,
      },
    }
  );
  const isFormValid = form.formState.isValid;
  const [currentPage, setCurrentPage] = useState(1);
  const { data: templateById, isSuccess: templateByIdLoaded } = usePdfReportTemplateById(
    isEdit && editId != null ? editId : null
  );
  const appliedEditIdRef = useRef<number | null>(null);
  const justAppliedCopyRef = useRef(false);

  useEffect(() => {
    if (copyFrom) {
      applyTemplateToFormAndStore(copyFrom, form, setElements);
      justAppliedCopyRef.current = true;
      navigate(location.pathname, { replace: true, state: {} });
      return;
    }
  }, [copyFrom, form, setElements, navigate, location.pathname]);

  useEffect(() => {
    if (!isEdit && !copyFrom) {
      if (justAppliedCopyRef.current) {
        justAppliedCopyRef.current = false;
        return;
      }
      setElements([]);
    }
  }, [isEdit, copyFrom, setElements]);

  useEffect(() => {
    if (!isEdit || !templateById || editId == null) return;
    if (appliedEditIdRef.current === editId) return;
    appliedEditIdRef.current = editId;
    applyTemplateToFormAndStore(templateById, form, setElements);
  }, [isEdit, editId, templateById, form, setElements]);

  useEffect(() => {
    if (!isEdit) appliedEditIdRef.current = null;
  }, [isEdit]);

  const ruleType = (form.watch('ruleType') ?? TemplateDesignerRuleType.Demand) as TemplateDesignerRuleTypeValue;
  const layoutPreset = form.watch('layoutPreset') ?? PDF_LAYOUT_PRESET.Custom;
  const availableLayoutPresets = useMemo(() => getAvailableLayoutPresets(ruleType), [ruleType]);
  const isCanvasLocked = false;
  const ruleTypeForFields = ruleTypeForApi(ruleType);
  const { data: fieldsData } = usePdfReportTemplateFields(ruleTypeForFields);
  const headerFields: PdfFieldPaletteItem[] = useMemo(
    () =>
      (fieldsData?.headerFields ?? []).map((f) => ({
        label: f.label,
        path: f.path,
        type: 'field' as const,
      })),
    [fieldsData?.headerFields]
  );
  const lineFields: PdfFieldPaletteItem[] = useMemo(
    () =>
      (fieldsData?.lineFields ?? []).map((f) => ({
        label: f.label,
        path: f.path,
        type: 'table-column' as const,
      })),
    [fieldsData?.lineFields]
  );
  const imageFields: PdfFieldPaletteItem[] = useMemo(
    () =>
      (fieldsData?.lineFields ?? [])
        .filter((f) => f.path.endsWith('DefaultImagePath'))
        .map((f) => ({
          label: f.label,
          path: f.path,
          type: 'image' as const,
        })),
    [fieldsData?.lineFields]
  );
  const exchangeRateFields: PdfFieldPaletteItem[] = useMemo(
    () =>
      (fieldsData?.exchangeRateFields ?? []).map((f) => ({
        label: f.label,
        path: f.path,
        type: 'table-column' as const,
      })),
    [fieldsData?.exchangeRateFields]
  );

  const draftKey = useMemo(
    () => (isEdit && editId ? `${PDF_REPORT_DRAFT_STORAGE_KEY}-${editId}` : `${PDF_REPORT_DRAFT_STORAGE_KEY}-new`),
    [isEdit, editId]
  );

  const saveDraft = useCallback(() => {
    try {
      const elements = getOrderedElements();
      const title = form.getValues('title');
      const ruleTypeVal = form.getValues('ruleType') as TemplateDesignerRuleTypeValue;
      const defaultVal = form.getValues('default');
      const payload = {
        title,
        ruleType: ruleTypeVal,
        default: defaultVal,
        pageCount: form.getValues('pageCount'),
        layoutPreset: form.getValues('layoutPreset'),
        layoutOptions: undefined,
        elements: pdfCanvasElementsToDto(elements),
      };
      localStorage.setItem(draftKey, JSON.stringify(payload));
    } catch {
      // ignore
    }
  }, [draftKey, form, getOrderedElements]);

  useEffect(() => {
    const interval = setInterval(saveDraft, 30000);
    return () => clearInterval(interval);
  }, [saveDraft]);

  const [draftBannerDismissed, setDraftBannerDismissed] = useState(false);
  const [hasDraft, setHasDraft] = useState(false);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(draftKey);
      setHasDraft(Boolean(raw));
    } catch {
      setHasDraft(false);
    }
  }, [draftKey]);

  const handleRestoreDraft = useCallback(() => {
    try {
      const raw = localStorage.getItem(draftKey);
      if (!raw) return;
      const payload = JSON.parse(raw) as {
        title?: string;
        ruleType?: number;
        default?: boolean;
        pageCount?: number;
        layoutPreset?: string;
        layoutOptions?: Record<string, string>;
        page?: {
          unit?: string;
        };
        elements?: unknown[];
      };
      if (payload.title != null) form.setValue('title', String(payload.title));
      if (payload.ruleType != null)
        form.setValue('ruleType', normalizeFormRuleType(Number(payload.ruleType)));
      if (payload.default != null) form.setValue('default', Boolean(payload.default));
      if (payload.pageCount != null)
        form.setValue('pageCount', Math.max(1, Number(payload.pageCount) || 1));
      form.setValue('layoutPreset', PDF_LAYOUT_PRESET.Custom);
      if (Array.isArray(payload.elements)) {
        const canvasEls = dtoToPdfCanvasElements(
          payload.elements as ReportTemplateElementDto[],
          payload.page?.unit
        );
        setElements(canvasEls);
      }
      localStorage.removeItem(draftKey);
      setHasDraft(false);
      setDraftBannerDismissed(true);
      toast.success(t('pdfReportDesigner.draftRestored'));
    } catch {
      toast.error(t('pdfReportDesigner.draftRestoreFailed'));
    }
  }, [draftKey, form, setElements, t]);

  const handleClearDraft = useCallback(() => {
    try {
      localStorage.removeItem(draftKey);
      setHasDraft(false);
      setDraftBannerDismissed(true);
    } catch {
      // ignore
    }
  }, [draftKey]);

  const createMutation = useCreatePdfReportTemplate();
  const updateMutation = useUpdatePdfReportTemplate();

  useEffect(() => {
    if (layoutPreset !== PDF_LAYOUT_PRESET.Custom) {
      form.setValue('layoutPreset', PDF_LAYOUT_PRESET.Custom, {
        shouldDirty: true,
        shouldValidate: true,
      });
    }
  }, [form, layoutPreset]);

  const onSubmit = async (values: PdfReportDesignerCreateFormValues): Promise<void> => {
    const elements = getOrderedElements();
    const payload: ReportTemplateCreateDto = {
      ruleType: ruleTypeForApi(values.ruleType as TemplateDesignerRuleTypeValue) as DocumentRuleType,
      title: values.title,
      templateData: {
        schemaVersion: 1,
        layoutKey: undefined,
        layoutOptions: undefined,
        page: {
          width: A4_MM_WIDTH,
          height: A4_MM_HEIGHT,
          unit: 'mm',
          pageCount: values.pageCount,
        },
        elements: pdfCanvasElementsToDto(elements, 'mm'),
      },
      isActive: true,
      default: values.default ?? false,
    };
    try {
      if (isEdit && editId != null) {
        await updateMutation.mutateAsync({ id: editId, data: payload });
        toast.success(t('pdfReportDesigner.updated'), {
          description: `${values.title}`,
        });
      } else {
        await createMutation.mutateAsync(payload);
        toast.success(t('pdfReportDesigner.saved'), {
          description: `${values.title}`,
        });
      }
      try {
        localStorage.removeItem(draftKey);
      } catch {
        // ignore
      }
      navigate('/report-designer');
    } catch (err) {
      const detail = getApiErrorMessage(err);
      toast.error(
        isEdit
          ? t('pdfReportDesigner.updateFailed')
          : t('pdfReportDesigner.saveFailed'),
        { description: detail }
      );
    }
  };

  const handleDragEnd = (event: DragEndEvent): void => {
    const { active, over } = event;
    const data = active.data.current;
    if (!isPdfSidebarDragData(data)) return;

    const tableId = over?.id != null ? parseTableIdFromDroppableId(String(over.id)) : null;
    const containerId = over?.id != null ? parseContainerIdFromDroppableId(String(over.id)) : null;

    if (tableId != null) {
      if (data.type !== 'table-column') return;
      addColumnToTable(tableId, { label: data.label, path: data.path });
      return;
    }

    const overId = over?.id != null ? String(over.id) : null;
    const elementsById = usePdfReportDesignerStore.getState().elementsById;
    const containerTarget = containerId ? elementsById[containerId] : undefined;
    const section = containerTarget?.section ?? (overId != null ? getSectionFromDroppableId(overId) : null);

    if (section == null) return;
    if (data.type === 'table-column') return;

    if (data.type === 'table' && section !== 'content') return;
    const translated = active.rect.current.translated;
    if (!translated) return;

    const activePageCanvas = pageCanvasRefs.current.get(currentPage);
    if (!activePageCanvas) return;
    const canvasRect = activePageCanvas.getBoundingClientRect();
    const absoluteX = Math.round((translated.left - canvasRect.left) / 8) * 8;
    const absoluteY = Math.round((translated.top - canvasRect.top) / 8) * 8;
    const parentAbsolute = containerTarget ? resolveAbsolutePosition(elementsById, containerTarget) : null;
    const parentPadding = getElementPaddingValue(containerTarget);
    const x = parentAbsolute ? absoluteX - parentAbsolute.x - parentPadding : absoluteX;
    const y = parentAbsolute ? absoluteY - parentAbsolute.y - parentPadding : absoluteY;

    if (data.type === 'text') {
      const newElement: PdfReportElement = {
        id: createClientId(),
        type: 'text',
        section,
        x,
        y,
        width: 200,
        height: 60,
        text: t('reportDesigner.defaults.doubleClickToEdit'),
        fontSize: 14,
        fontFamily: 'Arial',
        parentId: containerTarget?.id,
        pageNumbers: [currentPage],
      };
      addElement(newElement);
      return;
    }

    if (data.type === 'shape') {
      const newElement: PdfReportElement = {
        id: createClientId(),
        type: 'shape',
        section,
        x,
        y,
        width: 220,
        height: 80,
        style: {
          background: '#ffffff',
          border: '1px solid #d7dde8',
          radius: 12,
        },
        parentId: containerTarget?.id,
        pageNumbers: [currentPage],
      };
      addElement(newElement);
      return;
    }

    if (data.type === 'container') {
      const newElement: PdfReportElement = {
        id: createClientId(),
        type: 'container',
        section,
        x,
        y,
        width: 260,
        height: 140,
        style: {
          background: '#ffffff',
          border: '1px solid #cbd5e1',
          radius: 16,
          padding: 16,
        },
        parentId: containerTarget?.id,
        pageNumbers: [currentPage],
      };
      addElement(newElement);
      return;
    }

    if (data.type === 'note') {
      const newElement: PdfReportElement = {
        id: createClientId(),
        type: 'note',
        section,
        x,
        y,
        width: 260,
        height: 120,
        text: 'Notlar',
        value: 'Aciklama veya sart metni',
        fontSize: 13,
        fontFamily: 'Arial',
        parentId: containerTarget?.id,
        style: {
          background: '#ffffff',
          border: '1px solid #cbd5e1',
          radius: 12,
          padding: 14,
        },
        pageNumbers: [currentPage],
      };
      addElement(newElement);
      return;
    }

    if (data.type === 'summary') {
      const newElement: PdfReportElement = {
        id: createClientId(),
        type: 'summary',
        section,
        x,
        y,
        width: 240,
        height: 150,
        text: 'Toplamlar',
        fontSize: 13,
        fontFamily: 'Arial',
        parentId: containerTarget?.id,
        style: {
          background: '#ffffff',
          border: '1px solid #cbd5e1',
          radius: 12,
          padding: 14,
        },
        summaryItems: [
          { label: 'Ara Toplam', path: 'SubTotal', format: 'currency' },
          { label: 'KDV', path: 'VatAmount', format: 'currency' },
          { label: 'Genel Toplam', path: 'GrandTotal', format: 'currency' },
        ],
        pageNumbers: [currentPage],
      };
      addElement(newElement);
      return;
    }

    if (data.type === 'quotationTotals') {
      const newElement: PdfReportElement = {
        id: createClientId(),
        type: 'quotationTotals',
        section,
        x,
        y,
        width: 260,
        height: 176,
        text: 'Teklif Toplamlari',
        fontSize: 13,
        fontFamily: 'Arial',
        parentId: containerTarget?.id,
        style: {
          background: '#ffffff',
          border: '1px solid #cbd5e1',
          radius: 12,
          padding: 14,
        },
        quotationTotalsOptions: {
          layout: 'single',
          currencyMode: 'code',
          currencyPath: 'Currency',
          grossLabel: 'Brut Toplam',
          discountLabel: 'Iskonto',
          netLabel: 'Net Toplam',
          vatLabel: 'KDV',
          grandLabel: 'Genel Toplam',
          showGross: true,
          showDiscount: true,
          showVat: true,
          emphasizeGrandTotal: true,
          noteTitle: 'Aciklama',
          notePath: 'Description',
          showNote: false,
          hideEmptyNote: true,
        },
        pageNumbers: [currentPage],
      };
      addElement(newElement);
      return;
    }

    if (data.type === 'field') {
      const newElement: PdfReportElement = {
        id: createClientId(),
        type: 'field',
        section,
        x,
        y,
        width: DEFAULT_ELEMENT_WIDTH,
        height: DEFAULT_ELEMENT_HEIGHT,
        value: data.label,
        path: data.path,
        parentId: containerTarget?.id,
        pageNumbers: [currentPage],
      };
      addElement(newElement);
      return;
    }

    if (data.type === 'table') {
      const newTable: PdfTableElement = {
        id: createClientId(),
        type: 'table',
        section,
        x,
        y,
        width: DEFAULT_TABLE_WIDTH,
        height: DEFAULT_TABLE_HEIGHT,
        columns: [],
        parentId: containerTarget?.id,
        pageNumbers: [currentPage],
      };
      addElement(newTable);
      return;
    }

    if (data.type === 'image') {
      const newElement: PdfReportElement = {
        id: createClientId(),
        type: 'image',
        section,
        x,
        y,
        width: 120,
        height: 80,
        value: data.value ?? '',
        path: data.path || undefined,
        parentId: containerTarget?.id,
        pageNumbers: [currentPage],
      };
      addElement(newElement);
    }
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;
  const activityStarterAppliedRef = useRef(false);

  useEffect(() => {
    if (isEdit || copyFrom) return;
    if (ruleType !== TemplateDesignerRuleType.Activity) {
      activityStarterAppliedRef.current = false;
      return;
    }

    if (activityStarterAppliedRef.current) return;
    if (getOrderedElements().length > 0) return;

    setElements(createActivityStarterElements());
    activityStarterAppliedRef.current = true;
  }, [ruleType, isEdit, copyFrom, getOrderedElements, setElements]);
  const pageCount = form.watch('pageCount') ?? 1;

  useEffect(() => {
    if (currentPage > pageCount) {
      setCurrentPage(pageCount);
    }
  }, [currentPage, pageCount]);

  const handleNavigateToPage = useCallback((page: number) => {
    setCurrentPage(page);
    requestAnimationFrame(() => {
      document
        .getElementById(`pdf-canvas-page-${page}`)
        ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }, []);

  return (
    <div className="flex h-full min-h-0 flex-col">
      {hasDraft && !draftBannerDismissed && (
        <Alert className="rounded-none border-x-0 border-t-0 border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30">
          <AlertTriangle className="size-4 text-amber-600 dark:text-amber-400" />
          <AlertDescription className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-amber-800 dark:text-amber-200">{t('pdfReportDesigner.draftFound')}</span>
            <span className="flex gap-2">
              <Button type="button" variant="outline" size="sm" onClick={handleRestoreDraft}>
                {t('pdfReportDesigner.restoreDraft')}
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={handleClearDraft}>
                {t('pdfReportDesigner.discardDraft')}
              </Button>
            </span>
          </AlertDescription>
        </Alert>
      )}

      <div className="shrink-0 border-b border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-950">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <div className="flex items-center gap-2 px-4 py-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="-ml-1 gap-1.5 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
                onClick={() => navigate('/report-designer')}
              >
                <ArrowLeft className="size-4" />
              </Button>
              <Separator orientation="vertical" className="mx-0.5 h-5" />
              <div className="flex min-w-0 items-center gap-2">
                <FileText className="size-4 shrink-0 text-slate-400 dark:text-slate-500" />
                <span className="truncate text-sm font-semibold text-slate-800 dark:text-white">
                  {isEdit ? t('pdfReportDesigner.editTemplate') : t('pdfReportDesigner.newTemplate')}
                </span>
                {isEdit && (
                  <Badge variant="secondary" className="shrink-0 text-[11px]">
                    {t('common.update')}
                  </Badge>
                )}
              </div>
              <div className="flex-1" />
              <TooltipProvider delayDuration={400}>
                <div className="flex items-center gap-0.5">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-8 text-slate-500 hover:text-slate-900 dark:hover:text-white"
                        disabled={historyIndex <= 0}
                        onClick={() => undo()}
                      >
                        <Undo2 className="size-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">{t('pdfReportDesigner.undo')}</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-8 text-slate-500 hover:text-slate-900 dark:hover:text-white"
                        disabled={historyIndex >= history.length - 1 || history.length === 0}
                        onClick={() => redo()}
                      >
                        <Redo2 className="size-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">{t('pdfReportDesigner.redo')}</TooltipContent>
                  </Tooltip>
                </div>
              </TooltipProvider>
              <Separator orientation="vertical" className="mx-1 h-5" />
              <div className="flex items-center gap-1.5">
                <Grid3X3 className="size-3.5 text-slate-400" />
                <Switch
                  id="snap-toggle"
                  checked={snapEnabled}
                  onCheckedChange={setSnapEnabled}
                />
                <Label htmlFor="snap-toggle" className="cursor-pointer text-xs font-normal text-slate-600 dark:text-slate-400">
                  {t('pdfReportDesigner.snapToGrid')}
                </Label>
              </div>
              <Separator orientation="vertical" className="mx-1 h-5" />
              <Button
                type="submit"
                size="sm"
                disabled={isSaving || (isEdit && !templateByIdLoaded) || !isFormValid}
                className="min-w-[80px]"
              >
                {isSaving ? t('common.saving') : isEdit ? t('common.update') : t('common.save')}
              </Button>
            </div>

            <div className="flex flex-wrap items-end gap-3 border-t border-slate-100 bg-slate-50/70 px-4 py-2.5 dark:border-slate-800 dark:bg-slate-900/40">
              <FormField
                control={form.control}
                name="ruleType"
                render={({ field }) => (
                  <FormItem className="w-44">
                    <FormLabel className="text-xs text-slate-600">{t('pdfReportDesigner.documentType')}</FormLabel>
                    <Select
                      onValueChange={(value) => field.onChange(Number(value) as TemplateDesignerRuleTypeValue)}
                      value={field.value?.toString()}
                    >
                      <FormControl>
                        <SelectTrigger className="h-8 w-full text-xs">
                          <SelectValue placeholder={t('common.select')} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {RULE_TYPE_OPTIONS.map((value) => (
                          <SelectItem key={value} value={value.toString()}>
                            {getRuleTypeLabel(value, t)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem className="min-w-[180px] flex-1">
                    <FormLabel className="text-xs text-slate-600">{t('pdfReportDesigner.title')}</FormLabel>
                    <FormControl>
                      <Input className="h-8 text-xs" placeholder={t('pdfReportDesigner.titlePlaceholder')} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="layoutPreset"
                render={({ field }) => (
                  <FormItem className="w-60">
                    <FormLabel className="text-xs text-slate-600">{t('pdfReportDesigner.layoutPreset.label')}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="h-8 w-full text-xs">
                          <SelectValue placeholder={t('common.select')} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {availableLayoutPresets.map((preset) => (
                          <SelectItem key={preset.value} value={preset.value}>
                            {t(preset.titleKey)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="pageCount"
                render={({ field }) => (
                  <FormItem className="w-24">
                    <FormLabel className="text-xs text-slate-600">{t('pdfReportDesigner.pageCount')}</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={1}
                        max={20}
                        disabled={isCanvasLocked}
                        value={field.value}
                        onChange={(e) =>
                          field.onChange(Math.min(20, Math.max(1, Number(e.target.value) || 1)))
                        }
                        className="h-8 text-xs"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="default"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center gap-2 space-y-0 pb-1">
                    <FormControl>
                      <Checkbox checked={field.value ?? false} onCheckedChange={field.onChange} />
                    </FormControl>
                    <FormLabel className="cursor-pointer text-xs font-normal text-slate-700 dark:text-slate-300">
                      {t('pdfReportDesigner.setDefaultTemplate')}
                    </FormLabel>
                  </FormItem>
                )}
              />
            </div>
          </form>
        </Form>

        <div className="flex items-center gap-2.5 border-t border-slate-100 bg-white px-4 py-1.5 dark:border-slate-800 dark:bg-slate-950">
          <span className="shrink-0 text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            {t('pdfReportDesigner.pages')}
          </span>
          <div className="flex flex-wrap gap-1">
            {Array.from({ length: pageCount }, (_, index) => index + 1).map((pageNumber) => (
              <Button
                key={pageNumber}
                type="button"
                size="sm"
                variant={currentPage === pageNumber ? 'default' : 'outline'}
                className="h-6 min-w-[52px] px-3 text-xs"
                onClick={() => handleNavigateToPage(pageNumber)}
              >
                {t('pdfReportDesigner.pageNumber', { page: pageNumber })}
              </Button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col">
        {!isCanvasLocked ? (
          <DndContext onDragEnd={handleDragEnd}>
            <div className="flex min-h-0 flex-1">
              <PdfSidebar
                headerFields={headerFields}
                lineFields={lineFields}
                exchangeRateFields={exchangeRateFields}
                imageFields={imageFields}
                templateId={editId}
              />
              <PdfA4Canvas
                currentPage={currentPage}
                pageCount={pageCount}
                templateId={editId}
                onPageRef={handlePageRef}
                onPageChange={handleNavigateToPage}
              />
              <PdfInspectorPanel pageCount={pageCount} />
              <PdfLayersPanel onNavigateToPage={handleNavigateToPage} templateId={editId} />
            </div>
          </DndContext>
        ) : null}
      </div>
    </div>
  );
}

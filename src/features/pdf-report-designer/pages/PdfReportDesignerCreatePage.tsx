import type { ReactElement } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useRef, useMemo, useEffect, useCallback, useState } from 'react';
import { DndContext, type DragEndEvent } from '@dnd-kit/core';
import { PricingRuleType } from '@/features/pricing-rule/types/pricing-rule-types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Undo2, Redo2, Grid3X3 } from 'lucide-react';
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
  parseTableIdFromDroppableId,
} from '../components/PdfA4Canvas';
import {
  PdfSidebar,
  type PdfSidebarDragData,
  type PdfFieldPaletteItem,
} from '../components/PdfSidebar';
import { PdfInspectorPanel } from '../components/PdfInspectorPanel';
import { PdfLayersPanel } from '../components/PdfLayersPanel';
import type { PdfReportElement, PdfTableElement } from '../types/pdf-report-template.types';
import { usePdfReportDesignerStore } from '../store/usePdfReportDesignerStore';
import { usePdfReportTemplateFields } from '../hooks/usePdfReportTemplateFields';
import { useCreatePdfReportTemplate } from '../hooks/useCreatePdfReportTemplate';
import { useUpdatePdfReportTemplate } from '../hooks/useUpdatePdfReportTemplate';
import { usePdfReportTemplateById } from '../hooks/usePdfReportTemplateById';
import { dtoToPdfCanvasElements, pdfCanvasElementsToDto } from '../utils/dto-to-canvas';
import { getApiErrorMessage } from '../utils/get-api-error-message';
import type {
  ReportTemplateCreateDto,
  ReportTemplateGetDto,
  ReportTemplateElementDto,
} from '@/features/pdf-report';
import type { DocumentRuleType } from '@/features/pdf-report';
import { A4_CANVAS_WIDTH, A4_CANVAS_HEIGHT, PDF_REPORT_DRAFT_STORAGE_KEY } from '../constants';

const RULE_TYPE_OPTIONS: PricingRuleType[] = [
  PricingRuleType.Demand,
  PricingRuleType.Quotation,
  PricingRuleType.Order,
];

const DEFAULT_ELEMENT_WIDTH = 200;
const DEFAULT_ELEMENT_HEIGHT = 50;

function ruleTypeForApi(ruleType: PricingRuleType): number {
  return (ruleType - 1) as number;
}

function apiRuleTypeToForm(apiRuleType: number): PricingRuleType {
  const n = apiRuleType + 1;
  if (
    n === PricingRuleType.Demand ||
    n === PricingRuleType.Quotation ||
    n === PricingRuleType.Order
  )
    return n;
  return PricingRuleType.Demand;
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
  form.reset({
    ruleType: apiRuleTypeToForm(template.ruleType as number),
    title: template.title,
    default: template.default ?? false,
  });
  setElements(dtoToPdfCanvasElements(template.templateData.elements));
}

export function PdfReportDesignerCreatePage(): ReactElement {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id: idParam } = useParams<{ id: string }>();
  const location = useLocation();
  const copyFrom = (location.state as { copyFrom?: ReportTemplateGetDto } | null)?.copyFrom;
  const editId = idParam != null ? parseInt(idParam, 10) : null;
  const isEdit = editId != null && !Number.isNaN(editId) && editId > 0;

  const canvasRef = useRef<HTMLDivElement | null>(null);
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
        ruleType: PricingRuleType.Demand,
        title: '',
        default: false,
      },
    }
  );
  const isFormValid = form.formState.isValid;

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

  const ruleType = form.watch('ruleType') ?? PricingRuleType.Demand;
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
      const ruleTypeVal = form.getValues('ruleType');
      const defaultVal = form.getValues('default');
      const payload = {
        title,
        ruleType: ruleTypeVal,
        default: defaultVal,
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
        elements?: unknown[];
      };
      if (payload.title != null) form.setValue('title', String(payload.title));
      if (payload.ruleType != null)
        form.setValue('ruleType', apiRuleTypeToForm(Number(payload.ruleType)));
      if (payload.default != null) form.setValue('default', Boolean(payload.default));
      if (Array.isArray(payload.elements)) {
        const canvasEls = dtoToPdfCanvasElements(payload.elements as ReportTemplateElementDto[]);
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

  const onSubmit = async (values: PdfReportDesignerCreateFormValues): Promise<void> => {
    const elements = getOrderedElements();
    const payload: ReportTemplateCreateDto = {
      ruleType: ruleTypeForApi(values.ruleType) as DocumentRuleType,
      title: values.title,
      templateData: {
        schemaVersion: 1,
        page: { width: A4_CANVAS_WIDTH, height: A4_CANVAS_HEIGHT, unit: 'px' },
        elements: pdfCanvasElementsToDto(elements),
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

    if (tableId != null) {
      if (data.type !== 'table-column') return;
      addColumnToTable(tableId, { label: data.label, path: data.path });
      return;
    }

    const overId = over?.id != null ? String(over.id) : null;
    const section = overId != null ? getSectionFromDroppableId(overId) : null;

    if (section == null || !canvasRef.current) return;
    if (data.type === 'table-column') return;

    if (data.type === 'table' && section !== 'content') return;
    if (data.type === 'image' && section === 'content') return;

    const translated = active.rect.current.translated;
    if (!translated) return;

    const canvasRect = canvasRef.current.getBoundingClientRect();
    const x = Math.round((translated.left - canvasRect.left) / 8) * 8;
    const y = Math.round((translated.top - canvasRect.top) / 8) * 8;

    if (data.type === 'text') {
      const newElement: PdfReportElement = {
        id: crypto.randomUUID(),
        type: 'text',
        section,
        x,
        y,
        width: 200,
        height: 60,
        text: t('reportDesigner.defaults.doubleClickToEdit'),
        fontSize: 14,
        fontFamily: 'Arial',
      };
      addElement(newElement);
      return;
    }

    if (data.type === 'field') {
      const newElement: PdfReportElement = {
        id: crypto.randomUUID(),
        type: 'field',
        section,
        x,
        y,
        width: DEFAULT_ELEMENT_WIDTH,
        height: DEFAULT_ELEMENT_HEIGHT,
        value: data.label,
        path: data.path,
      };
      addElement(newElement);
      return;
    }

    if (data.type === 'table') {
      const newTable: PdfTableElement = {
        id: crypto.randomUUID(),
        type: 'table',
        section,
        x,
        y,
        width: DEFAULT_ELEMENT_WIDTH,
        height: DEFAULT_ELEMENT_HEIGHT,
        columns: [],
      };
      addElement(newTable);
      return;
    }

    if (data.type === 'image') {
      const newElement: PdfReportElement = {
        id: crypto.randomUUID(),
        type: 'image',
        section,
        x,
        y,
        width: 120,
        height: 80,
        value: data.value ?? '',
        path: data.path || undefined,
      };
      addElement(newElement);
    }
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="flex h-full min-h-0 flex-col">
      {hasDraft && !draftBannerDismissed && (
        <Alert className="rounded-none border-x-0 border-t-0 border-b border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30">
          <AlertDescription className="flex flex-wrap items-center justify-between gap-2">
            <span>{t('pdfReportDesigner.draftFound')}</span>
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
      <div className="shrink-0 border-b border-slate-200 bg-white px-6 py-4 dark:border-slate-700 dark:bg-slate-900/50">
        <h1 className="mb-4 text-xl font-semibold text-slate-900 dark:text-white">
          {isEdit ? t('pdfReportDesigner.editTemplate') : t('pdfReportDesigner.newTemplate')}
        </h1>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-wrap items-end gap-4">
            <FormField
              control={form.control}
              name="ruleType"
              render={({ field }) => (
                <FormItem className="w-48">
                  <FormLabel>{t('pdfReportDesigner.documentType')}</FormLabel>
                  <Select
                    onValueChange={(value) => field.onChange(Number(value) as PricingRuleType)}
                    value={field.value?.toString()}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder={t('common.select')} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {RULE_TYPE_OPTIONS.map((value) => (
                        <SelectItem key={value} value={value.toString()}>
                          {value === PricingRuleType.Demand
                            ? t('reportDesigner.ruleType.demand')
                            : value === PricingRuleType.Quotation
                              ? t('reportDesigner.ruleType.quotation')
                              : t('reportDesigner.ruleType.order')}
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
                <FormItem className="min-w-[200px] flex-1">
                  <FormLabel>{t('pdfReportDesigner.title')}</FormLabel>
                  <FormControl>
                    <Input placeholder={t('pdfReportDesigner.titlePlaceholder')} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="default"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center gap-2 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value ?? false}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <FormLabel className="font-normal">
                    {t('pdfReportDesigner.setDefaultTemplate')}
                  </FormLabel>
                </FormItem>
              )}
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="shrink-0"
              disabled={historyIndex <= 0}
              onClick={() => undo()}
              title={t('pdfReportDesigner.undo')}
            >
              <Undo2 className="size-4" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="shrink-0"
              disabled={historyIndex >= history.length - 1 || history.length === 0}
              onClick={() => redo()}
              title={t('pdfReportDesigner.redo')}
            >
              <Redo2 className="size-4" />
            </Button>
            <div className="flex items-center gap-2">
              <Grid3X3 className="size-4 text-slate-500" />
              <Switch
                id="snap-toggle"
                checked={snapEnabled}
                onCheckedChange={setSnapEnabled}
              />
              <Label htmlFor="snap-toggle" className="text-sm font-normal cursor-pointer">
                {t('pdfReportDesigner.snapToGrid')}
              </Label>
            </div>
            <Button
              type="submit"
              disabled={isSaving || (isEdit && !templateByIdLoaded) || !isFormValid}
            >
              {isSaving ? t('common.saving') : isEdit ? t('common.update') : t('common.save')}
            </Button>
          </form>
        </Form>
      </div>
      <div className="flex min-h-0 flex-1 flex-col">
        <DndContext onDragEnd={handleDragEnd}>
          <div className="flex min-h-0 flex-1">
          <PdfSidebar
            headerFields={headerFields}
            lineFields={lineFields}
            exchangeRateFields={exchangeRateFields}
            imageFields={imageFields}
          />
            <PdfA4Canvas canvasRef={canvasRef} />
            <PdfInspectorPanel />
            <PdfLayersPanel />
          </div>
        </DndContext>
      </div>
    </div>
  );
}

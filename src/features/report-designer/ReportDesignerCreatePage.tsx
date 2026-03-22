import type { ReactElement } from 'react';
import { useForm, type UseFormReturn } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useRef, useMemo, useEffect } from 'react';
import { DndContext, type DragEndEvent } from '@dnd-kit/core';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  reportDesignerCreateSchema,
  type ReportDesignerCreateFormValues,
} from './schemas/report-designer-create-schema';
import {
  A4Canvas,
  getSectionFromDroppableId,
  parseTableIdFromDroppableId,
} from './components/A4Canvas';
import { Sidebar, type SidebarDragData, type FieldPaletteItem } from './components/Sidebar';
import type { ReportElement, TableElement } from './models/report-element';
import { isTableElement } from './models/report-element';
import { useReportStore } from './store/useReportStore';
import { useReportTemplateFields } from './hooks/useReportTemplateFields';
import { useCreateReportTemplate } from './hooks/useCreateReportTemplate';
import { useUpdateReportTemplate } from './hooks/useUpdateReportTemplate';
import { useReportTemplateById } from './hooks/useReportTemplateById';
import { dtoElementsToCanvasElements } from './utils/dto-to-canvas';
import { DocumentRuleType, type ReportTemplateCreateDto, type ReportTemplateElementDto } from './types/report-template-types';
import { TemplateDesignerRuleType, type TemplateDesignerRuleType as TemplateDesignerRuleTypeValue } from './types/report-template-types';
import type { ReportTemplateGetDto } from './types/report-template-types';
import { A4_CANVAS_WIDTH, A4_CANVAS_HEIGHT } from './constants';
import { createClientId } from '@/lib/create-client-id';

const RULE_TYPE_OPTIONS: TemplateDesignerRuleTypeValue[] = [
  TemplateDesignerRuleType.Demand,
  TemplateDesignerRuleType.Quotation,
  TemplateDesignerRuleType.Order,
  TemplateDesignerRuleType.FastQuotation,
];

const DEFAULT_ELEMENT_WIDTH = 200;
const DEFAULT_ELEMENT_HEIGHT = 50;

function ruleTypeForApi(ruleType: TemplateDesignerRuleTypeValue): DocumentRuleType {
  return (ruleType - 1) as DocumentRuleType;
}

function apiRuleTypeToForm(apiRuleType: number): TemplateDesignerRuleTypeValue {
  const n = apiRuleType + 1;
  if (
    n === TemplateDesignerRuleType.Demand ||
    n === TemplateDesignerRuleType.Quotation ||
    n === TemplateDesignerRuleType.Order ||
    n === TemplateDesignerRuleType.FastQuotation
  )
    return n;
  return TemplateDesignerRuleType.Demand;
}

function isSidebarDragData(data: unknown): data is SidebarDragData {
  const d = data as SidebarDragData | null;
  return (
    typeof d === 'object' &&
    d !== null &&
    typeof d.type === 'string' &&
    typeof d.path === 'string' &&
    typeof d.label === 'string'
  );
}

function elementToDto(el: ReportElement | TableElement): ReportTemplateElementDto {
  const base = {
    id: el.id,
    type: el.type,
    section: el.section,
    x: el.x,
    y: el.y,
    width: el.width,
    height: el.height,
    value: el.value,
    text: el.text,
    path: el.path,
    fontSize: el.fontSize,
    fontFamily: el.fontFamily,
    color: el.color,
  };
  if (isTableElement(el)) {
    return { ...base, columns: el.columns };
  }
  return base;
}

function applyTemplateToFormAndStore(
  template: ReportTemplateGetDto,
  form: UseFormReturn<ReportDesignerCreateFormValues>,
  setElements: (elements: import('./models/report-element').CanvasElement[]) => void
): void {
  form.reset({
    ruleType: apiRuleTypeToForm(template.ruleType as number),
    title: template.title,
    default: template.default ?? false,
  });
  setElements(dtoElementsToCanvasElements(template.templateData.elements));
}

export function ReportDesignerCreatePage(): ReactElement {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id: idParam } = useParams<{ id: string }>();
  const location = useLocation();
  const copyFrom = (location.state as { copyFrom?: ReportTemplateGetDto } | null)?.copyFrom;
  const editId = idParam != null ? parseInt(idParam, 10) : null;
  const isEdit = editId != null && !Number.isNaN(editId) && editId > 0;

  const canvasRef = useRef<HTMLDivElement | null>(null);
  const elements = useReportStore((s) => s.elements);
  const addElement = useReportStore((s) => s.addElement);
  const addColumnToTable = useReportStore((s) => s.addColumnToTable);
  const setElements = useReportStore((s) => s.setElements);

  const form = useForm<ReportDesignerCreateFormValues, unknown, ReportDesignerCreateFormValues>({
    resolver: zodResolver(reportDesignerCreateSchema),
    defaultValues: {
      ruleType: TemplateDesignerRuleType.Demand,
      title: '',
      default: false,
    },
  });

  const { data: templateById, isSuccess: templateByIdLoaded } = useReportTemplateById(isEdit ? editId! : null);
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
  const ruleTypeForFields = ruleTypeForApi(ruleType);
  const { data: fieldsData } = useReportTemplateFields(ruleTypeForFields);
  const headerFields: FieldPaletteItem[] = useMemo(
    () =>
      (fieldsData?.headerFields ?? []).map((f) => ({
        label: f.label,
        path: f.path,
        type: 'field' as const,
      })),
    [fieldsData?.headerFields]
  );
  const lineFields: FieldPaletteItem[] = useMemo(
    () =>
      (fieldsData?.lineFields ?? []).map((f) => ({
        label: f.label,
        path: f.path,
        type: 'table-column' as const,
      })),
    [fieldsData?.lineFields]
  );
  const exchangeRateFields: FieldPaletteItem[] = useMemo(
    () =>
      (fieldsData?.exchangeRateFields ?? []).map((f) => ({
        label: f.label,
        path: f.path,
        type: 'table-column' as const,
      })),
    [fieldsData?.exchangeRateFields]
  );

  const createMutation = useCreateReportTemplate();
  const updateMutation = useUpdateReportTemplate();

  const onSubmit = async (values: ReportDesignerCreateFormValues): Promise<void> => {
    const payload: ReportTemplateCreateDto = {
      ruleType: ruleTypeForApi(values.ruleType as TemplateDesignerRuleTypeValue),
      title: values.title,
      templateData: {
        page: { width: A4_CANVAS_WIDTH, height: A4_CANVAS_HEIGHT, unit: 'px' },
        elements: elements.map(elementToDto),
      },
      isActive: true,
      default: values.default ?? false,
    };
    try {
      if (isEdit && editId != null) {
        await updateMutation.mutateAsync({ id: editId, data: payload });
        toast.success(t('common.updated'), {
          description: t('common.templateUpdatedWithTitle', { title: values.title }),
        });
      } else {
        await createMutation.mutateAsync(payload);
        toast.success(t('common.saved'), {
          description: t('common.templateSavedWithTitle', { title: values.title }),
        });
      }
      navigate('/report-designer');
    } catch (err) {
      toast.error(isEdit ? t('reportDesigner.form.updateFailed') : t('reportDesigner.form.saveFailed'), {
        description: err instanceof Error ? err.message : undefined,
      });
    }
  };

  const handleDragEnd = (event: DragEndEvent): void => {
    const { active, over } = event;
    const data = active.data.current;
    if (!isSidebarDragData(data)) return;

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
    const x = Math.round(translated.left - canvasRect.left);
    const y = Math.round(translated.top - canvasRect.top);

    if (data.type === 'text') {
      const newElement: ReportElement = {
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
      };
      addElement(newElement);
      return;
    }

    if (data.type === 'field') {
      const newElement: ReportElement = {
        id: createClientId(),
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
      const newTable: TableElement = {
        id: createClientId(),
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
      const newElement: ReportElement = {
        id: createClientId(),
        type: 'image',
        section,
        x,
        y,
        width: 120,
        height: 80,
        value: data.value ?? data.label ?? '',
      };
      addElement(newElement);
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="shrink-0 border-b border-slate-200 bg-white px-6 py-4 dark:border-slate-700 dark:bg-slate-900/50">
        <h1 className="mb-4 text-xl font-semibold text-slate-900 dark:text-white">
          {isEdit ? t('reportDesigner.form.editTemplate') : t('reportDesigner.form.newTemplate')}
        </h1>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-wrap items-end gap-4">
            <FormField
              control={form.control}
              name="ruleType"
              render={({ field }) => (
                <FormItem className="w-48">
                  <FormLabel>{t('reportDesigner.form.documentType')}</FormLabel>
                  <Select
                    onValueChange={(value) => field.onChange(Number(value) as TemplateDesignerRuleTypeValue)}
                    value={field.value?.toString()}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder={t('reportDesigner.form.selectPlaceholder')} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {RULE_TYPE_OPTIONS.map((value) => (
                        <SelectItem key={value} value={value.toString()}>
                          {value === TemplateDesignerRuleType.Demand
                            ? t('reportDesigner.ruleType.demand')
                            : value === TemplateDesignerRuleType.Quotation
                              ? t('reportDesigner.ruleType.quotation')
                              : value === TemplateDesignerRuleType.Order
                                ? t('reportDesigner.ruleType.order')
                                : t('reportDesigner.ruleType.fastQuotation')}
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
                  <FormLabel>{t('reportDesigner.form.title')}</FormLabel>
                  <FormControl>
                    <Input placeholder={t('reportDesigner.form.titlePlaceholder')} {...field} />
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
                  <FormLabel className="font-normal">{t('reportDesigner.form.setDefaultTemplate')}</FormLabel>
                </FormItem>
              )}
            />
            <Button
              type="submit"
              disabled={isEdit && (updateMutation.isPending || !templateByIdLoaded)}
            >
              {isEdit ? t('common.update') : t('common.save')}
            </Button>
          </form>
        </Form>
      </div>
      <div className="flex min-h-0 flex-1 flex-col">
        <DndContext onDragEnd={handleDragEnd}>
          <div className="flex min-h-0 flex-1">
            <Sidebar headerFields={headerFields} lineFields={lineFields} exchangeRateFields={exchangeRateFields} />
            <A4Canvas canvasRef={canvasRef} />
          </div>
        </DndContext>
      </div>
    </div>
  );
}

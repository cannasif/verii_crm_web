import type { ReactElement } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Settings2,
  ChevronLeft,
  ChevronRight,
  Move,
  Layers2,
  Palette,
  Eye,
  Table as TableIcon,
  Columns3,
  MessageSquareText,
  Sigma,
  Receipt,
  Layers,
  Type as TypeIcon,
  MousePointer2,
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { usePdfReportDesignerStore } from '../store/usePdfReportDesignerStore';
import { isPdfTableElement } from '../types/pdf-report-template.types';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { FONT_FAMILIES, FONT_SIZES } from '../constants';
import { PDF_TABLE_PRESETS, getPdfTablePreset } from '../constants/table-presets';
import { usePdfTablePresetList } from '../hooks/usePdfTablePresetList';
import type { FieldDefinitionDto } from '@/features/pdf-report';
import type { PdfCanvasElement, PdfConditionalStyleRule, PdfRuleOperator, PdfVisibilityRule } from '../types/pdf-report-template.types';
import { PdfInspectorSection } from './PdfInspectorSection';
import { PdfElementTypeIcon, getPdfElementTypeKey } from './PdfElementTypeBadge';

interface PdfInspectorPanelProps {
  pageCount: number;
  fieldDefinitions?: FieldDefinitionDto[];
}

function normalizePageNumbers(rawValue: string, pageCount: number): number[] | undefined {
  const raw = rawValue.trim();
  if (raw.length === 0) return undefined;

  const normalized = Array.from(
    new Set(
      raw
        .split(',')
        .map((part) => Number(part.trim()))
        .filter((pageNumber) => Number.isInteger(pageNumber) && pageNumber > 0 && pageNumber <= pageCount)
    )
  ).sort((left, right) => left - right);

  return normalized.length > 0 ? normalized : undefined;
}

function evaluateVisibilityRule(
  rule: {
    fieldPath?: string;
    operator?: PdfRuleOperator;
    value?: string;
  } | undefined,
  sampleValue?: string,
): boolean | null {
  if (!rule?.fieldPath || !rule.operator) return null;
  return evaluateRule(rule.operator, sampleValue, rule.value);
}

function evaluateVisibilityRules(
  rules: PdfVisibilityRule[] | undefined,
  logic: 'all' | 'any',
  getSampleValue: (fieldPath?: string) => string | undefined,
): boolean | null {
  const normalizedRules = (rules ?? []).filter((rule) => rule.fieldPath || rule.operator || rule.value);
  if (normalizedRules.length === 0) return null;
  const results = normalizedRules.map((rule) => evaluateVisibilityRule(rule, getSampleValue(rule.fieldPath)));
  if (results.some((result) => result == null)) return null;
  return logic === 'any' ? results.some(Boolean) : results.every(Boolean);
}

function parseRuleNumber(value?: string): number | null {
  if (value == null) return null;
  const normalized = value.trim().replace(/\s+/g, '').replace(',', '.');
  if (!normalized) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function evaluateRule(
  operator: PdfRuleOperator,
  sampleValue?: string,
  expectedValue?: string,
): boolean | null {
  const currentValue = sampleValue?.trim() ?? '';
  if (operator === 'isEmpty') return currentValue.length === 0;
  if (operator === 'isNotEmpty') return currentValue.length > 0;
  if (operator === 'contains') {
    if (!expectedValue) return null;
    return currentValue.toLowerCase().includes(expectedValue.trim().toLowerCase());
  }
  if (expectedValue == null) return null;
  const expected = expectedValue.trim();
  if (operator === 'equals' || operator === 'notEquals') {
    const currentNumber = parseRuleNumber(currentValue);
    const expectedNumber = parseRuleNumber(expected);
    const equals =
      currentNumber != null && expectedNumber != null
        ? currentNumber === expectedNumber
        : currentValue.localeCompare(expected, undefined, { sensitivity: 'accent' }) === 0;
    return operator === 'equals' ? equals : !equals;
  }
  const currentNumber = parseRuleNumber(currentValue);
  const expectedNumber = parseRuleNumber(expected);
  if (currentNumber == null || expectedNumber == null) return false;
  switch (operator) {
    case 'greaterThan':
      return currentNumber > expectedNumber;
    case 'greaterOrEqual':
      return currentNumber >= expectedNumber;
    case 'lessThan':
      return currentNumber < expectedNumber;
    case 'lessOrEqual':
      return currentNumber <= expectedNumber;
    default:
      return null;
  }
}

export function PdfInspectorPanel({ pageCount, fieldDefinitions = [] }: PdfInspectorPanelProps): ReactElement {
  const { t } = useTranslation(['report-designer', 'common']);
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(max-width: 1279px)').matches;
  });
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mql = window.matchMedia('(max-width: 1279px)');
    const handleChange = (event: MediaQueryListEvent): void => {
      setCollapsed(event.matches);
    };
    mql.addEventListener('change', handleChange);
    return () => mql.removeEventListener('change', handleChange);
  }, []);
  const elementsById = usePdfReportDesignerStore((s) => s.elementsById);
  const elementOrder = usePdfReportDesignerStore((s) => s.elementOrder);
  const selectedIds = usePdfReportDesignerStore((s) => s.selectedIds);
  const updateElement = usePdfReportDesignerStore((s) => s.updateElement);
  const updateReportElement = usePdfReportDesignerStore((s) => s.updateReportElement);
  const addColumnToTable = usePdfReportDesignerStore((s) => s.addColumnToTable);
  const updateTableColumn = usePdfReportDesignerStore((s) => s.updateTableColumn);
  const removeColumnFromTable = usePdfReportDesignerStore((s) => s.removeColumnFromTable);
  const moveTableColumn = usePdfReportDesignerStore((s) => s.moveTableColumn);
  const updateTableOptions = usePdfReportDesignerStore((s) => s.updateTableOptions);
  const { data: presetData } = usePdfTablePresetList({
    pageNumber: 1,
    pageSize: 100,
    isActive: true,
  });
  const elements = useMemo(
    () => elementOrder.map((id) => elementsById[id]).filter(Boolean),
    [elementOrder, elementsById]
  );
  const selectedElement =
    selectedIds.length === 1 ? elements.find((el) => el.id === selectedIds[0]) : null;
  const availableContainers = elements.filter(
    (element) => element.type === 'container' && element.id !== selectedElement?.id
  );
  const visibilityRules =
    selectedElement
      ? selectedElement.visibilityRules ?? (selectedElement.visibilityRule ? [selectedElement.visibilityRule] : [])
      : [];
  const conditionalStyleRules = selectedElement?.conditionalStyleRules ?? [];
  const visibilityPreviewResult =
    selectedElement
      ? evaluateVisibilityRules(
          visibilityRules,
          selectedElement.visibilityLogic ?? 'all',
          (fieldPath) => fieldDefinitions.find((field) => field.path === fieldPath)?.exampleValue,
        )
      : null;

  if (collapsed) {
    return (
      <TooltipProvider delayDuration={300}>
        <div className="relative flex min-h-0 w-8 shrink-0 flex-col items-center border-l border-slate-300/80 bg-stone-50/95 py-2 backdrop-blur-xl dark:border-white/10 dark:bg-[#1a1025]/60">
          <div className="absolute inset-0 pointer-events-none bg-linear-to-r from-pink-500/0 to-orange-500/0 dark:from-pink-500/5 dark:to-orange-500/5 opacity-30" />
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                className="relative z-10 rounded p-1.5 text-slate-500 hover:bg-slate-200 hover:text-slate-800 dark:hover:bg-white/10"
                onClick={() => setCollapsed(false)}
              >
                <ChevronLeft className="size-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="left">{t('reportDesigner.inspector.title')}</TooltipContent>
          </Tooltip>
          <div className="relative z-10 mt-3">
            <Settings2 className="size-3.5 text-slate-300 dark:text-slate-600" />
          </div>
        </div>
      </TooltipProvider>
    );
  }

  if (!selectedElement) {
    return (
      <div className="relative flex min-h-0 w-64 shrink-0 flex-col overflow-y-auto border-l border-slate-300/80 bg-stone-50/95 shadow-md ring-1 ring-slate-200/70 backdrop-blur-xl transition-all duration-300 dark:border-white/10 dark:bg-[#1a1025]/60 dark:shadow-sm dark:ring-0">
        <div className="absolute inset-0 pointer-events-none bg-linear-to-r from-pink-500/0 to-orange-500/0 dark:from-pink-500/5 dark:to-orange-500/5 opacity-30" />
        <div className="relative z-10 flex h-full flex-col">
          <div className="flex items-center justify-between border-b border-slate-300/80 px-4 py-2.5 dark:border-white/5">
            <div className="flex items-center gap-1.5">
              <Settings2 className="size-3.5 text-slate-400" />
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                {t('reportDesigner.inspector.title')}
              </span>
            </div>
            <TooltipProvider delayDuration={300}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    className="rounded p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-700 dark:hover:bg-white/10"
                    onClick={() => setCollapsed(true)}
                  >
                    <ChevronRight className="size-3.5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="left">Daralt</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
            <div className="flex size-14 items-center justify-center rounded-2xl bg-white/50 shadow-sm ring-1 ring-slate-200/50 dark:bg-white/5 dark:ring-white/10">
              <MousePointer2 className="size-7 text-slate-300 dark:text-slate-600" />
            </div>
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-bold uppercase tracking-widest text-slate-700 dark:text-slate-200">
                {t('pdfReportDesigner.inspectorSelectionEmptyHeadline', { defaultValue: 'No element selected' })}
              </span>
              <p className="text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
                {t('pdfReportDesigner.inspectorSelectionEmptyBody', { defaultValue: 'Select an element on the canvas to fine-tune its properties and behavior.' })}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const style = selectedElement.style ?? {};
  const opacity = style.opacity ?? 1;
  const pageNumbersValue = selectedElement.pageNumbers?.join(', ') ?? '';
  const serverPresets = presetData?.items ?? [];
  const presetOptions =
    serverPresets.length > 0
      ? serverPresets.map((preset) => ({
          key: preset.key,
          label: `${preset.name} (${preset.key})`,
          columns: preset.columns,
          tableOptions: preset.tableOptions,
        }))
      : PDF_TABLE_PRESETS;

  const updateVisibilityRules = (rules: PdfVisibilityRule[], nextLogic?: 'all' | 'any'): void => {
    if (!selectedElement) return;
    const normalizedRules = rules.filter((rule) => rule.fieldPath || rule.operator || rule.value);
    updateElement(selectedElement.id, {
      visibilityRule: normalizedRules[0],
      visibilityRules: normalizedRules.length > 0 ? normalizedRules : undefined,
      visibilityLogic: nextLogic ?? selectedElement.visibilityLogic ?? 'all',
    } as Partial<PdfCanvasElement>);
  };
  const updateConditionalStyleRules = (rules: PdfConditionalStyleRule[]): void => {
    if (!selectedElement) return;
    const normalizedRules = rules.filter((rule) =>
      rule.fieldPath ||
      rule.operator ||
      rule.value ||
      rule.color ||
      rule.background ||
      rule.border ||
      rule.fontWeight != null ||
      rule.opacity != null
    );
    updateElement(selectedElement.id, {
      conditionalStyleRules: normalizedRules.length > 0 ? normalizedRules : undefined,
    } as Partial<PdfCanvasElement>);
  };
  const visibilityRulePresets = [
    {
      key: 'approvedOnly',
      label: t('pdfReportDesigner.visibilityPresets.approvedOnly'),
      rules: [{ fieldPath: 'ApprovalStatus', operator: 'equals' as const, value: 'Approved' }],
      logic: 'all' as const,
    },
    {
      key: 'hideWhenEmpty',
      label: t('pdfReportDesigner.visibilityPresets.hideWhenEmpty'),
      rules: [{ fieldPath: 'Note1', operator: 'isNotEmpty' as const }],
      logic: 'all' as const,
    },
    {
      key: 'showWhenDiscountExists',
      label: t('pdfReportDesigner.visibilityPresets.showWhenDiscountExists'),
      rules: [
        { fieldPath: 'GeneralDiscountRate', operator: 'notEquals' as const, value: '0' },
        { fieldPath: 'GeneralDiscountAmount', operator: 'notEquals' as const, value: '0' },
      ],
      logic: 'any' as const,
    },
  ];

  const elementTypeKey = getPdfElementTypeKey(selectedElement);
  const elementTypeLabel = t(`pdfReportDesigner.elementTypes.${elementTypeKey}` as unknown as string);

  return (
    <div className="relative flex min-h-0 w-64 shrink-0 flex-col overflow-y-auto border-l border-slate-300/80 bg-stone-50/95 shadow-md ring-1 ring-slate-200/70 backdrop-blur-xl transition-all duration-300 dark:border-white/10 dark:bg-[#1a1025]/60 dark:shadow-sm dark:ring-0">
      <div className="absolute inset-0 pointer-events-none bg-linear-to-r from-pink-500/0 to-orange-500/0 dark:from-pink-500/5 dark:to-orange-500/5 opacity-30" />
      <div className="relative z-10 flex flex-col">
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-300/80 bg-stone-50/95 px-4 py-2.5 backdrop-blur-sm dark:border-white/5 dark:bg-[#1a1025]/80">
        <div className="flex items-center gap-1.5">
          <Settings2 className="size-3.5 text-slate-400" />
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            {t('reportDesigner.inspector.title')}
          </span>
        </div>
        <TooltipProvider delayDuration={300}>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                className="rounded p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-700 dark:hover:bg-slate-700"
                onClick={() => setCollapsed(true)}
              >
                <ChevronRight className="size-3.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="left">Daralt</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      <div className="border-b border-slate-300/80 bg-white/50 px-3 py-2.5 dark:border-white/5 dark:bg-white/5">
        <div className="flex items-center gap-2">
          <div className="flex size-7 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
            <PdfElementTypeIcon type={elementTypeKey} className="size-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">
              {t('pdfReportDesigner.inspectorSelectionTitle')}
            </div>
            <div className="truncate text-xs font-semibold text-slate-700 dark:text-slate-200">
              {elementTypeLabel}
            </div>
          </div>
          {selectedElement.locked ? (
            <Badge variant="outline" className="shrink-0 text-[9px] uppercase tracking-wider">
              lock
            </Badge>
          ) : null}
          {selectedElement.hidden ? (
            <Badge variant="secondary" className="shrink-0 text-[9px] uppercase tracking-wider">
              hide
            </Badge>
          ) : null}
        </div>
        {selectedElement.locked ? (
          <p className="mt-1.5 text-[10.5px] leading-snug text-amber-600 dark:text-amber-400">
            {t('pdfReportDesigner.inspectorLockHint')}
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-2 p-3">
      <PdfInspectorSection
        title={t('pdfReportDesigner.inspectorGroups.position')}
        icon={<Move className="size-3.5" />}
        defaultOpen={true}
      >
        <div className="grid grid-cols-2 gap-2">
          <div className="flex flex-col gap-1">
            <Label className="text-xs">X</Label>
            <Input
              type="number"
              value={selectedElement.x}
              onChange={(e) =>
                updateElement(selectedElement.id, { x: Number(e.target.value) || 0 })
              }
              className="h-8 text-xs"
            />
          </div>
          <div className="flex flex-col gap-1">
            <Label className="text-xs">Y</Label>
            <Input
              type="number"
              value={selectedElement.y}
              onChange={(e) =>
                updateElement(selectedElement.id, { y: Number(e.target.value) || 0 })
              }
              className="h-8 text-xs"
            />
          </div>
          <div className="flex flex-col gap-1">
            <Label className="text-xs">W</Label>
            <Input
              type="number"
              value={selectedElement.width}
              onChange={(e) =>
                updateElement(selectedElement.id, { width: Number(e.target.value) || 0 })
              }
              className="h-8 text-xs"
            />
          </div>
          <div className="flex flex-col gap-1">
            <Label className="text-xs">H</Label>
            <Input
              type="number"
              value={selectedElement.height}
              onChange={(e) =>
                updateElement(selectedElement.id, { height: Number(e.target.value) || 0 })
              }
              className="h-8 text-xs"
            />
          </div>
        </div>
      </PdfInspectorSection>

      <PdfInspectorSection
        title={t('pdfReportDesigner.inspectorGroups.pageVisibility')}
        icon={<Eye className="size-3.5" />}
        defaultOpen={false}
        tone="muted"
      >
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <Label className="text-xs">{t('pdfReportDesigner.visiblePages')}</Label>
            <Input
              value={pageNumbersValue}
              onChange={(e) =>
                updateElement(selectedElement.id, {
                  pageNumbers: normalizePageNumbers(e.target.value, pageCount),
                })
              }
              className="h-8 text-xs"
              placeholder={t('pdfReportDesigner.visiblePagesPlaceholder')}
            />
          </div>
          <div className="flex flex-col gap-2">
              <Label className="text-xs">{t('pdfReportDesigner.visibilityRuleTitle')}</Label>
              <p className="text-[11px] leading-snug text-slate-500 dark:text-slate-400">
                {t('pdfReportDesigner.visibilityRuleDescription')}
              </p>
              <div className="grid gap-1.5">
                {visibilityRulePresets.map((preset) => (
                  <button
                    key={preset.key}
                    type="button"
                    className="rounded-md border border-slate-200 bg-white px-3 py-1.5 text-left text-xs font-medium transition-colors hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900/40 dark:hover:bg-slate-800"
                    onClick={() => updateVisibilityRules(preset.rules, preset.logic)}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
              <Select
                value={selectedElement.visibilityLogic ?? 'all'}
                onValueChange={(value: 'all' | 'any') => updateVisibilityRules(visibilityRules, value)}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('pdfReportDesigner.visibilityLogic.all')}</SelectItem>
                  <SelectItem value="any">{t('pdfReportDesigner.visibilityLogic.any')}</SelectItem>
                </SelectContent>
              </Select>
              {visibilityRules.map((rule, ruleIndex) => {
                const fieldDefinition = fieldDefinitions.find((field) => field.path === rule.fieldPath);
                return (
                  <div key={`${selectedElement.id}-rule-${ruleIndex}`} className="rounded-md border border-slate-200 p-2 dark:border-slate-700">
                    <div className="mb-2 flex items-center justify-between">
                      <div className="text-[11px] font-medium text-slate-600 dark:text-slate-300">
                        {t('pdfReportDesigner.visibilityRuleItemTitle', { index: ruleIndex + 1 })}
                      </div>
                      <button
                        type="button"
                        className="text-[11px] font-medium text-rose-500"
                        onClick={() => updateVisibilityRules(visibilityRules.filter((_, index) => index !== ruleIndex))}
                      >
                        {t('pdfReportDesigner.visibilityRuleRemove')}
                      </button>
                    </div>
                    <Input
                      value={rule.fieldPath ?? ''}
                      onChange={(e) =>
                        updateVisibilityRules(
                          visibilityRules.map((item, index) =>
                            index === ruleIndex ? { ...item, fieldPath: e.target.value || undefined } : item,
                          ),
                        )
                      }
                      className="h-8 text-xs"
                      placeholder={t('pdfReportDesigner.visibilityRuleFieldPlaceholder')}
                    />
                    <Select
                      value={rule.operator ?? 'equals'}
                      onValueChange={(value: PdfRuleOperator) =>
                        updateVisibilityRules(
                          visibilityRules.map((item, index) =>
                            index === ruleIndex ? { ...item, operator: value } : item,
                          ),
                        )
                      }
                    >
                      <SelectTrigger className="mt-2 h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="equals">{t('pdfReportDesigner.visibilityOperators.equals')}</SelectItem>
                        <SelectItem value="notEquals">{t('pdfReportDesigner.visibilityOperators.notEquals')}</SelectItem>
                        <SelectItem value="isEmpty">{t('pdfReportDesigner.visibilityOperators.isEmpty')}</SelectItem>
                        <SelectItem value="isNotEmpty">{t('pdfReportDesigner.visibilityOperators.isNotEmpty')}</SelectItem>
                        <SelectItem value="greaterThan">{t('pdfReportDesigner.visibilityOperators.greaterThan')}</SelectItem>
                        <SelectItem value="greaterOrEqual">{t('pdfReportDesigner.visibilityOperators.greaterOrEqual')}</SelectItem>
                        <SelectItem value="lessThan">{t('pdfReportDesigner.visibilityOperators.lessThan')}</SelectItem>
                        <SelectItem value="lessOrEqual">{t('pdfReportDesigner.visibilityOperators.lessOrEqual')}</SelectItem>
                        <SelectItem value="contains">{t('pdfReportDesigner.visibilityOperators.contains')}</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input
                      value={rule.value ?? ''}
                      onChange={(e) =>
                        updateVisibilityRules(
                          visibilityRules.map((item, index) =>
                            index === ruleIndex ? { ...item, value: e.target.value || undefined } : item,
                          ),
                        )
                      }
                      className="mt-2 h-8 text-xs"
                      placeholder={t('pdfReportDesigner.visibilityRuleValuePlaceholder')}
                    />
                    <div className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
                      {fieldDefinition?.description ?? t('pdfReportDesigner.visibilityRulePreviewNoField')}
                    </div>
                  </div>
                );
              })}
              <button
                type="button"
                className="h-8 rounded-md border px-3 text-xs font-medium"
                onClick={() => updateVisibilityRules([...visibilityRules, { operator: 'equals' }])}
              >
                {t('pdfReportDesigner.visibilityRuleAdd')}
              </button>
              <div className="rounded-md bg-slate-50 px-2 py-2 text-[11px] text-slate-600 dark:bg-slate-900 dark:text-slate-300">
                <div className="font-medium">{t('pdfReportDesigner.visibilityRulePreviewTitle')}</div>
                {visibilityRules.length > 0 ? visibilityRules.map((rule, ruleIndex) => {
                  const fieldDefinition = fieldDefinitions.find((field) => field.path === rule.fieldPath);
                  return (
                    <div key={`${selectedElement.id}-preview-${ruleIndex}`} className="mt-1">
                      <div>{t('pdfReportDesigner.visibilityRulePreviewRule', { index: ruleIndex + 1 })}</div>
                      <div>{fieldDefinition?.description ?? t('pdfReportDesigner.visibilityRulePreviewNoField')}</div>
                      <div>
                        {t('pdfReportDesigner.visibilityRulePreviewSample', {
                          value: fieldDefinition?.exampleValue ?? t('pdfReportDesigner.visibilityRulePreviewEmptyValue'),
                        })}
                      </div>
                    </div>
                  );
                }) : null}
                <div className="mt-1 font-medium">
                  {visibilityPreviewResult == null
                    ? t('pdfReportDesigner.visibilityRulePreviewIncomplete')
                    : visibilityPreviewResult
                      ? t('pdfReportDesigner.visibilityRulePreviewVisible')
                      : t('pdfReportDesigner.visibilityRulePreviewHidden')}
                </div>
              </div>
            </div>
        </div>
      </PdfInspectorSection>

      <PdfInspectorSection
        title={t('pdfReportDesigner.inspectorGroups.conditionalStyling')}
        icon={<Palette className="size-3.5" />}
        defaultOpen={false}
        tone="muted"
      >
        <div className="flex flex-col gap-3">
          <p className="text-[11px] leading-snug text-slate-500 dark:text-slate-400">
            {t('pdfReportDesigner.conditionalStyleDescription')}
          </p>
          {conditionalStyleRules.map((rule, ruleIndex) => {
            const fieldDefinition = fieldDefinitions.find((field) => field.path === rule.fieldPath);
            return (
              <div key={`${selectedElement.id}-style-rule-${ruleIndex}`} className="rounded-md border border-slate-200 p-2 dark:border-slate-700">
                <div className="mb-2 flex items-center justify-between">
                  <div className="text-[11px] font-medium text-slate-600 dark:text-slate-300">
                    {t('pdfReportDesigner.conditionalStyleItemTitle', { index: ruleIndex + 1 })}
                  </div>
                  <button
                    type="button"
                    className="text-[11px] font-medium text-rose-500"
                    onClick={() =>
                      updateConditionalStyleRules(conditionalStyleRules.filter((_, index) => index !== ruleIndex))
                    }
                  >
                    {t('pdfReportDesigner.visibilityRuleRemove')}
                  </button>
                </div>
                <Input
                  value={rule.fieldPath ?? ''}
                  onChange={(e) =>
                    updateConditionalStyleRules(
                      conditionalStyleRules.map((item, index) =>
                        index === ruleIndex ? { ...item, fieldPath: e.target.value || undefined } : item,
                      ),
                    )
                  }
                  className="h-8 text-xs"
                  placeholder={t('pdfReportDesigner.visibilityRuleFieldPlaceholder')}
                />
                <Select
                  value={rule.operator ?? 'equals'}
                  onValueChange={(value: PdfRuleOperator) =>
                    updateConditionalStyleRules(
                      conditionalStyleRules.map((item, index) =>
                        index === ruleIndex ? { ...item, operator: value } : item,
                      ),
                    )
                  }
                >
                  <SelectTrigger className="mt-2 h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="equals">{t('pdfReportDesigner.visibilityOperators.equals')}</SelectItem>
                    <SelectItem value="notEquals">{t('pdfReportDesigner.visibilityOperators.notEquals')}</SelectItem>
                    <SelectItem value="isEmpty">{t('pdfReportDesigner.visibilityOperators.isEmpty')}</SelectItem>
                    <SelectItem value="isNotEmpty">{t('pdfReportDesigner.visibilityOperators.isNotEmpty')}</SelectItem>
                    <SelectItem value="greaterThan">{t('pdfReportDesigner.visibilityOperators.greaterThan')}</SelectItem>
                    <SelectItem value="greaterOrEqual">{t('pdfReportDesigner.visibilityOperators.greaterOrEqual')}</SelectItem>
                    <SelectItem value="lessThan">{t('pdfReportDesigner.visibilityOperators.lessThan')}</SelectItem>
                    <SelectItem value="lessOrEqual">{t('pdfReportDesigner.visibilityOperators.lessOrEqual')}</SelectItem>
                    <SelectItem value="contains">{t('pdfReportDesigner.visibilityOperators.contains')}</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  value={rule.value ?? ''}
                  onChange={(e) =>
                    updateConditionalStyleRules(
                      conditionalStyleRules.map((item, index) =>
                        index === ruleIndex ? { ...item, value: e.target.value || undefined } : item,
                      ),
                    )
                  }
                  className="mt-2 h-8 text-xs"
                  placeholder={t('pdfReportDesigner.visibilityRuleValuePlaceholder')}
                />
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <div className="flex flex-col gap-1">
                    <Label className="text-[11px]">{t('pdfReportDesigner.conditionalStyleColor')}</Label>
                    <Input
                      value={rule.color ?? ''}
                      onChange={(e) =>
                        updateConditionalStyleRules(
                          conditionalStyleRules.map((item, index) =>
                            index === ruleIndex ? { ...item, color: e.target.value || undefined } : item,
                          ),
                        )
                      }
                      className="h-8 text-xs"
                      placeholder="#dc2626"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <Label className="text-[11px]">{t('pdfReportDesigner.conditionalStyleBackground')}</Label>
                    <Input
                      value={rule.background ?? ''}
                      onChange={(e) =>
                        updateConditionalStyleRules(
                          conditionalStyleRules.map((item, index) =>
                            index === ruleIndex ? { ...item, background: e.target.value || undefined } : item,
                          ),
                        )
                      }
                      className="h-8 text-xs"
                      placeholder="#fef2f2"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <Label className="text-[11px]">{t('pdfReportDesigner.conditionalStyleBorder')}</Label>
                    <Input
                      value={rule.border ?? ''}
                      onChange={(e) =>
                        updateConditionalStyleRules(
                          conditionalStyleRules.map((item, index) =>
                            index === ruleIndex ? { ...item, border: e.target.value || undefined } : item,
                          ),
                        )
                      }
                      className="h-8 text-xs"
                      placeholder="1px solid #dc2626"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <Label className="text-[11px]">{t('pdfReportDesigner.conditionalStyleFontWeight')}</Label>
                    <Input
                      value={rule.fontWeight?.toString() ?? ''}
                      onChange={(e) =>
                        updateConditionalStyleRules(
                          conditionalStyleRules.map((item, index) =>
                            index === ruleIndex
                              ? { ...item, fontWeight: e.target.value || undefined }
                              : item,
                          ),
                        )
                      }
                      className="h-8 text-xs"
                      placeholder="700"
                    />
                  </div>
                </div>
                <div className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
                  {fieldDefinition?.description ?? t('pdfReportDesigner.visibilityRulePreviewNoField')}
                </div>
              </div>
            );
          })}
          <button
            type="button"
            className="h-8 rounded-md border px-3 text-xs font-medium"
            onClick={() => updateConditionalStyleRules([...conditionalStyleRules, { operator: 'equals' }])}
          >
            {t('pdfReportDesigner.conditionalStyleAdd')}
          </button>
        </div>
      </PdfInspectorSection>

      {isPdfTableElement(selectedElement) ? (
        <>
          <PdfInspectorSection
            title={t('pdfReportDesigner.inspectorGroups.tableSetup')}
            icon={<TableIcon className="size-3.5" />}
            defaultOpen={true}
            tone="accent"
          >
            <div className="flex flex-col gap-2">
            <div className="flex flex-col gap-1">
              <Label className="text-xs">{t('reportDesigner.tableDesigner.presetLibrary')}</Label>
              <Select
                value={selectedElement.tableOptions?.presetName ?? '__custom__'}
                onValueChange={(value) => {
                  if (value === '__custom__') return;
                  const preset =
                    presetOptions.find((item) => item.key === value) ??
                    getPdfTablePreset(value);
                  if (!preset) return;
                  updateTableOptions(selectedElement.id, {
                    columns: preset.columns,
                    tableOptions: {
                      ...selectedElement.tableOptions,
                      ...preset.tableOptions,
                      presetName: preset.key,
                    },
                  });
                }}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__custom__">{t('reportDesigner.tableDesigner.customPreset')}</SelectItem>
                  {presetOptions.map((preset) => (
                    <SelectItem key={preset.key} value={preset.key}>
                      {preset.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Label className="text-xs">{t('reportDesigner.tableDesigner.presetName')}</Label>
            <Input
              value={selectedElement.tableOptions?.presetName ?? ''}
              onChange={(e) =>
                updateTableOptions(selectedElement.id, {
                  tableOptions: {
                    ...selectedElement.tableOptions,
                    presetName: e.target.value || undefined,
                  },
                })
              }
              className="h-8 text-xs"
              placeholder={t('reportDesigner.tableDesigner.presetNamePlaceholder')}
            />
            <div className="grid grid-cols-2 gap-2">
              <div className="flex flex-col gap-1">
                <Label className="text-xs">{t('reportDesigner.tableDesigner.pageBreak')}</Label>
                <Select
                  value={selectedElement.tableOptions?.pageBreak ?? 'auto'}
                  onValueChange={(value: 'auto' | 'avoid' | 'always') =>
                    updateTableOptions(selectedElement.id, {
                      tableOptions: {
                        ...selectedElement.tableOptions,
                        pageBreak: value,
                      },
                    })
                  }
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto">auto</SelectItem>
                    <SelectItem value="avoid">avoid</SelectItem>
                    <SelectItem value="always">always</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1">
                <Label className="text-xs">{t('reportDesigner.tableDesigner.density')}</Label>
                <Select
                  value={selectedElement.tableOptions?.dense ? 'dense' : 'comfortable'}
                  onValueChange={(value) =>
                    updateTableOptions(selectedElement.id, {
                      tableOptions: {
                        ...selectedElement.tableOptions,
                        dense: value === 'dense',
                      },
                    })
                  }
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="comfortable">{t('reportDesigner.tableDesigner.comfortable')}</SelectItem>
                    <SelectItem value="dense">{t('reportDesigner.tableDesigner.dense')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="flex flex-col gap-1">
                <Label className="text-xs">Detail column path</Label>
                <Input
                  value={selectedElement.tableOptions?.detailColumnPath ?? ''}
                  onChange={(e) =>
                    updateTableOptions(selectedElement.id, {
                      tableOptions: {
                        ...selectedElement.tableOptions,
                        detailColumnPath: e.target.value || undefined,
                      },
                    })
                  }
                  className="h-8 text-xs"
                  placeholder="Lines.ProductName"
                />
              </div>
              <div className="flex flex-col gap-1">
                <Label className="text-xs">Detail line font</Label>
                <Input
                  type="number"
                  value={selectedElement.tableOptions?.detailLineFontSize ?? ''}
                  onChange={(e) =>
                    updateTableOptions(selectedElement.id, {
                      tableOptions: {
                        ...selectedElement.tableOptions,
                        detailLineFontSize: e.target.value === '' ? undefined : Number(e.target.value),
                      },
                    })
                  }
                  className="h-8 text-xs"
                  placeholder="8"
                />
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <Label className="text-xs">Detail paths (comma separated)</Label>
              <Input
                value={(selectedElement.tableOptions?.detailPaths ?? []).join(', ')}
                onChange={(e) =>
                  updateTableOptions(selectedElement.id, {
                    tableOptions: {
                      ...selectedElement.tableOptions,
                      detailPaths: e.target.value
                        .split(',')
                        .map((item) => item.trim())
                        .filter(Boolean),
                    },
                  })
                }
                className="h-8 text-xs"
                placeholder="Description, Description1, Description2"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="flex flex-col gap-1">
                <Label className="text-xs">Group by path</Label>
                <Input
                  value={selectedElement.tableOptions?.groupByPath ?? ''}
                  onChange={(e) =>
                    updateTableOptions(selectedElement.id, {
                      tableOptions: {
                        ...selectedElement.tableOptions,
                        groupByPath: e.target.value || undefined,
                      },
                    })
                  }
                  className="h-8 text-xs"
                  placeholder="Lines.ErpProjectCode"
                />
              </div>
              <div className="flex flex-col gap-1">
                <Label className="text-xs">Group header label</Label>
                <Input
                  value={selectedElement.tableOptions?.groupHeaderLabel ?? ''}
                  onChange={(e) =>
                    updateTableOptions(selectedElement.id, {
                      tableOptions: {
                        ...selectedElement.tableOptions,
                        groupHeaderLabel: e.target.value || undefined,
                      },
                    })
                  }
                  className="h-8 text-xs"
                  placeholder="Proje"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="flex flex-col gap-1">
                <Label className="text-xs">Group footer label</Label>
                <Input
                  value={selectedElement.tableOptions?.groupFooterLabel ?? ''}
                  onChange={(e) =>
                    updateTableOptions(selectedElement.id, {
                      tableOptions: {
                        ...selectedElement.tableOptions,
                        groupFooterLabel: e.target.value || undefined,
                      },
                    })
                  }
                  className="h-8 text-xs"
                  placeholder="Grup Toplami"
                />
              </div>
              <div className="flex flex-col gap-1">
                <Label className="text-xs">Group footer value path</Label>
                <Input
                  value={selectedElement.tableOptions?.groupFooterValuePath ?? ''}
                  onChange={(e) =>
                    updateTableOptions(selectedElement.id, {
                      tableOptions: {
                        ...selectedElement.tableOptions,
                        groupFooterValuePath: e.target.value || undefined,
                        showGroupFooter: (selectedElement.tableOptions?.showGroupFooter ?? true),
                      },
                    })
                  }
                  className="h-8 text-xs"
                  placeholder="LineTotal"
                />
              </div>
            </div>
            </div>
          </PdfInspectorSection>
          <PdfInspectorSection
            title={t('pdfReportDesigner.inspectorGroups.tableColumns')}
            icon={<Columns3 className="size-3.5" />}
            defaultOpen={true}
            tone="accent"
            actions={
              <button
                type="button"
                className="rounded border border-slate-300 bg-white px-2 py-0.5 text-[10.5px] font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200"
                onClick={(e) => {
                  e.stopPropagation();
                  addColumnToTable(selectedElement.id, {
                    label: `Column ${selectedElement.columns.length + 1}`,
                    path: '',
                    align: 'left',
                    format: 'text',
                  });
                }}
              >
                +
              </button>
            }
          >
          <div className="flex flex-col gap-2">
            {selectedElement.columns.map((column, index) => (
              <div key={`${column.path}-${index}`} className="rounded border border-slate-200 bg-white p-2">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <span className="text-[11px] font-medium text-slate-600">
                    {t('reportDesigner.tableDesigner.columnLabel', { index: index + 1 })}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      className="rounded border px-1.5 py-0.5 text-[10px]"
                      onClick={() => moveTableColumn(selectedElement.id, index, 'left')}
                    >
                      ←
                    </button>
                    <button
                      type="button"
                      className="rounded border px-1.5 py-0.5 text-[10px]"
                      onClick={() => moveTableColumn(selectedElement.id, index, 'right')}
                    >
                      →
                    </button>
                    <button
                      type="button"
                      className="rounded border border-red-200 px-1.5 py-0.5 text-[10px] text-red-600"
                      onClick={() => removeColumnFromTable(selectedElement.id, index)}
                    >
                      ×
                    </button>
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <Input
                    value={column.label}
                    onChange={(e) => updateTableColumn(selectedElement.id, index, { label: e.target.value })}
                    className="h-8 text-xs"
                    placeholder={t('reportDesigner.tableDesigner.header')}
                  />
                  <Input
                    value={column.path}
                    onChange={(e) => updateTableColumn(selectedElement.id, index, { path: e.target.value })}
                    className="h-8 text-xs"
                    placeholder={t('reportDesigner.tableDesigner.binding')}
                  />
                  <div className="grid grid-cols-3 gap-2">
                    <Input
                      type="number"
                      value={column.width ?? ''}
                      onChange={(e) =>
                        updateTableColumn(selectedElement.id, index, {
                          width: e.target.value === '' ? undefined : Number(e.target.value),
                        })
                      }
                      className="h-8 text-xs"
                      placeholder={t('reportDesigner.tableDesigner.width')}
                    />
                    <Select
                      value={column.align ?? 'left'}
                      onValueChange={(value: 'left' | 'center' | 'right') =>
                        updateTableColumn(selectedElement.id, index, { align: value })
                      }
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="left">{t('reportDesigner.inspector.left')}</SelectItem>
                        <SelectItem value="center">{t('reportDesigner.inspector.center')}</SelectItem>
                        <SelectItem value="right">{t('reportDesigner.inspector.right')}</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select
                      value={column.format ?? 'text'}
                      onValueChange={(value: 'text' | 'number' | 'currency' | 'date' | 'image') =>
                        updateTableColumn(selectedElement.id, index, { format: value })
                      }
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="text">text</SelectItem>
                        <SelectItem value="number">number</SelectItem>
                        <SelectItem value="currency">currency</SelectItem>
                        <SelectItem value="date">date</SelectItem>
                        <SelectItem value="image">image</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            ))}
          </div>
          </PdfInspectorSection>
        </>
      ) : (
        <>
          {selectedElement.type !== 'container' ? (
            <PdfInspectorSection
              title={t('pdfReportDesigner.inspectorGroups.parent')}
              icon={<Layers2 className="size-3.5" />}
              defaultOpen={false}
              tone="muted"
            >
              <div className="flex flex-col gap-1">
                <Label className="text-xs">{t('reportDesigner.inspector.parentContainer')}</Label>
                <Select
                  value={selectedElement.parentId ?? '__none__'}
                  onValueChange={(value) =>
                    updateReportElement(selectedElement.id, {
                      parentId: value === '__none__' ? undefined : value,
                    })
                  }
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">{t('reportDesigner.inspector.noParent')}</SelectItem>
                    {availableContainers.map((container) => (
                      <SelectItem key={container.id} value={container.id}>
                        {container.text || container.value || container.id}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </PdfInspectorSection>
          ) : null}
          {selectedElement.type === 'note' ? (
            <PdfInspectorSection
              title={t('pdfReportDesigner.inspectorGroups.noteContent')}
              icon={<MessageSquareText className="size-3.5" />}
              defaultOpen={true}
              tone="accent"
            >
              <div className="flex flex-col gap-2">
                <div className="flex flex-col gap-1">
                  <Label className="text-xs">{t('reportDesigner.noteDesigner.title')}</Label>
                  <Input
                    value={selectedElement.text ?? ''}
                    onChange={(e) => updateReportElement(selectedElement.id, { text: e.target.value })}
                    className="h-8 text-xs"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <Label className="text-xs">{t('reportDesigner.noteDesigner.body')}</Label>
                  <Input
                    value={selectedElement.value ?? ''}
                    onChange={(e) => updateReportElement(selectedElement.id, { value: e.target.value })}
                    className="h-8 text-xs"
                    placeholder={t('reportDesigner.noteDesigner.bodyPlaceholder')}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <Label className="text-xs">{t('reportDesigner.noteDesigner.binding')}</Label>
                  <Input
                    value={selectedElement.path ?? ''}
                    onChange={(e) => updateReportElement(selectedElement.id, { path: e.target.value })}
                    className="h-8 text-xs"
                    placeholder={t('reportDesigner.noteDesigner.bindingPlaceholder')}
                  />
                </div>
              </div>
            </PdfInspectorSection>
          ) : null}
          {selectedElement.type === 'summary' ? (
            <PdfInspectorSection
              title={t('pdfReportDesigner.inspectorGroups.summary')}
              icon={<Sigma className="size-3.5" />}
              defaultOpen={true}
              tone="accent"
              actions={
                <button
                  type="button"
                  className="rounded border border-slate-300 bg-white px-2 py-0.5 text-[10.5px] font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200"
                  onClick={(e) => {
                    e.stopPropagation();
                    updateReportElement(selectedElement.id, {
                      summaryItems: [
                        ...(selectedElement.summaryItems ?? []),
                        { label: `Item ${(selectedElement.summaryItems?.length ?? 0) + 1}`, path: '', format: 'text' },
                      ],
                    });
                  }}
                >
                  +
                </button>
              }
            >
              <div className="flex flex-col gap-2 rounded border border-slate-200 bg-white p-2 dark:border-slate-700 dark:bg-slate-900/30">
              {(selectedElement.summaryItems ?? []).map((item, index) => (
                <div key={`${item.label}-${index}`} className="rounded border border-slate-200 p-2">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <span className="text-[11px] font-medium text-slate-600">
                      {t('reportDesigner.summaryDesigner.itemLabel', { index: index + 1 })}
                    </span>
                    <button
                      type="button"
                      className="rounded border border-red-200 px-1.5 py-0.5 text-[10px] text-red-600"
                      onClick={() =>
                        updateReportElement(selectedElement.id, {
                          summaryItems: (selectedElement.summaryItems ?? []).filter((_, itemIndex) => itemIndex !== index),
                        })
                      }
                    >
                      ×
                    </button>
                  </div>
                  <div className="flex flex-col gap-2">
                    <Input
                      value={item.label}
                      onChange={(e) =>
                        updateReportElement(selectedElement.id, {
                          summaryItems: (selectedElement.summaryItems ?? []).map((summaryItem, itemIndex) =>
                            itemIndex === index ? { ...summaryItem, label: e.target.value } : summaryItem
                          ),
                        })
                      }
                      className="h-8 text-xs"
                      placeholder={t('reportDesigner.summaryDesigner.label')}
                    />
                    <Input
                      value={item.path}
                      onChange={(e) =>
                        updateReportElement(selectedElement.id, {
                          summaryItems: (selectedElement.summaryItems ?? []).map((summaryItem, itemIndex) =>
                            itemIndex === index ? { ...summaryItem, path: e.target.value } : summaryItem
                          ),
                        })
                      }
                      className="h-8 text-xs"
                      placeholder={t('reportDesigner.summaryDesigner.binding')}
                    />
                    <Select
                      value={item.format ?? 'text'}
                      onValueChange={(value: 'text' | 'number' | 'currency' | 'date') =>
                        updateReportElement(selectedElement.id, {
                          summaryItems: (selectedElement.summaryItems ?? []).map((summaryItem, itemIndex) =>
                            itemIndex === index ? { ...summaryItem, format: value } : summaryItem
                          ),
                        })
                      }
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="text">text</SelectItem>
                        <SelectItem value="number">number</SelectItem>
                        <SelectItem value="currency">currency</SelectItem>
                        <SelectItem value="date">date</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ))}
              </div>
            </PdfInspectorSection>
          ) : null}
          {selectedElement.type === 'quotationTotals' ? (
            <PdfInspectorSection
              title={t('pdfReportDesigner.inspectorGroups.quotationTotalsOptions')}
              icon={<Receipt className="size-3.5" />}
              defaultOpen={true}
              tone="accent"
            >
            <div className="flex flex-col gap-2 rounded border border-slate-200 bg-white p-2 dark:border-slate-700 dark:bg-slate-900/30">
              <Label className="text-xs">{t('reportDesigner.quotationTotalsDesigner.title')}</Label>
              <Input
                value={selectedElement.text ?? ''}
                onChange={(e) => updateReportElement(selectedElement.id, { text: e.target.value })}
                className="h-8 text-xs"
                placeholder={t('reportDesigner.quotationTotalsDesigner.titlePlaceholder')}
              />
              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-1">
                  <Label className="text-xs">{t('reportDesigner.quotationTotalsDesigner.layout')}</Label>
                  <Select
                    value={selectedElement.quotationTotalsOptions?.layout ?? 'single'}
                    onValueChange={(value: 'single' | 'two-column') =>
                      updateReportElement(selectedElement.id, {
                        quotationTotalsOptions: {
                          ...selectedElement.quotationTotalsOptions,
                          layout: value,
                        },
                      })
                    }
                  >
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="single">{t('reportDesigner.quotationTotalsDesigner.layoutSingle')}</SelectItem>
                      <SelectItem value="two-column">{t('reportDesigner.quotationTotalsDesigner.layoutTwoColumn')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-1">
                  <Label className="text-xs">{t('reportDesigner.quotationTotalsDesigner.currencyMode')}</Label>
                  <Select
                    value={selectedElement.quotationTotalsOptions?.currencyMode ?? 'none'}
                    onValueChange={(value: 'none' | 'code') =>
                      updateReportElement(selectedElement.id, {
                        quotationTotalsOptions: {
                          ...selectedElement.quotationTotalsOptions,
                          currencyMode: value,
                        },
                      })
                    }
                  >
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">{t('reportDesigner.quotationTotalsDesigner.currencyNone')}</SelectItem>
                      <SelectItem value="code">{t('reportDesigner.quotationTotalsDesigner.currencyCode')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-1">
                  <Label className="text-xs">{t('reportDesigner.quotationTotalsDesigner.grossLabel')}</Label>
                  <Input value={selectedElement.quotationTotalsOptions?.grossLabel ?? ''} onChange={(e) => updateReportElement(selectedElement.id, { quotationTotalsOptions: { ...selectedElement.quotationTotalsOptions, grossLabel: e.target.value } })} className="h-8 text-xs" />
                </div>
                <div className="flex flex-col gap-1">
                  <Label className="text-xs">{t('reportDesigner.quotationTotalsDesigner.discountLabel')}</Label>
                  <Input value={selectedElement.quotationTotalsOptions?.discountLabel ?? ''} onChange={(e) => updateReportElement(selectedElement.id, { quotationTotalsOptions: { ...selectedElement.quotationTotalsOptions, discountLabel: e.target.value } })} className="h-8 text-xs" />
                </div>
                <div className="flex flex-col gap-1">
                  <Label className="text-xs">{t('reportDesigner.quotationTotalsDesigner.netLabel')}</Label>
                  <Input value={selectedElement.quotationTotalsOptions?.netLabel ?? ''} onChange={(e) => updateReportElement(selectedElement.id, { quotationTotalsOptions: { ...selectedElement.quotationTotalsOptions, netLabel: e.target.value } })} className="h-8 text-xs" />
                </div>
                <div className="flex flex-col gap-1">
                  <Label className="text-xs">{t('reportDesigner.quotationTotalsDesigner.vatLabel')}</Label>
                  <Input value={selectedElement.quotationTotalsOptions?.vatLabel ?? ''} onChange={(e) => updateReportElement(selectedElement.id, { quotationTotalsOptions: { ...selectedElement.quotationTotalsOptions, vatLabel: e.target.value } })} className="h-8 text-xs" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-1">
                  <Label className="text-xs">{t('reportDesigner.quotationTotalsDesigner.grandLabel')}</Label>
                  <Input value={selectedElement.quotationTotalsOptions?.grandLabel ?? ''} onChange={(e) => updateReportElement(selectedElement.id, { quotationTotalsOptions: { ...selectedElement.quotationTotalsOptions, grandLabel: e.target.value } })} className="h-8 text-xs" />
                </div>
                <div className="flex flex-col gap-1">
                  <Label className="text-xs">{t('reportDesigner.quotationTotalsDesigner.currencyPath')}</Label>
                  <Input value={selectedElement.quotationTotalsOptions?.currencyPath ?? ''} onChange={(e) => updateReportElement(selectedElement.id, { quotationTotalsOptions: { ...selectedElement.quotationTotalsOptions, currencyPath: e.target.value } })} className="h-8 text-xs" placeholder="Currency" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-1">
                  <Label className="text-xs">{t('reportDesigner.quotationTotalsDesigner.noteTitle')}</Label>
                  <Input value={selectedElement.quotationTotalsOptions?.noteTitle ?? ''} onChange={(e) => updateReportElement(selectedElement.id, { quotationTotalsOptions: { ...selectedElement.quotationTotalsOptions, noteTitle: e.target.value } })} className="h-8 text-xs" />
                </div>
                <div className="flex flex-col gap-1">
                  <Label className="text-xs">{t('reportDesigner.quotationTotalsDesigner.notePath')}</Label>
                  <Input value={selectedElement.quotationTotalsOptions?.notePath ?? ''} onChange={(e) => updateReportElement(selectedElement.id, { quotationTotalsOptions: { ...selectedElement.quotationTotalsOptions, notePath: e.target.value } })} className="h-8 text-xs" placeholder="Description" />
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <Label className="text-xs">{t('reportDesigner.quotationTotalsDesigner.noteText')}</Label>
                <Input value={selectedElement.quotationTotalsOptions?.noteText ?? ''} onChange={(e) => updateReportElement(selectedElement.id, { quotationTotalsOptions: { ...selectedElement.quotationTotalsOptions, noteText: e.target.value } })} className="h-8 text-xs" placeholder={t('reportDesigner.noteDesigner.bodyPlaceholder')} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-1">
                  <Label className="text-xs">{t('reportDesigner.quotationTotalsDesigner.showGross')}</Label>
                  <Select value={selectedElement.quotationTotalsOptions?.showGross === false ? 'no' : 'yes'} onValueChange={(value) => updateReportElement(selectedElement.id, { quotationTotalsOptions: { ...selectedElement.quotationTotalsOptions, showGross: value === 'yes' } })}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="yes">{t('common.yes')}</SelectItem><SelectItem value="no">{t('common.no')}</SelectItem></SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-1">
                  <Label className="text-xs">{t('reportDesigner.quotationTotalsDesigner.showDiscount')}</Label>
                  <Select value={selectedElement.quotationTotalsOptions?.showDiscount === false ? 'no' : 'yes'} onValueChange={(value) => updateReportElement(selectedElement.id, { quotationTotalsOptions: { ...selectedElement.quotationTotalsOptions, showDiscount: value === 'yes' } })}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="yes">{t('common.yes')}</SelectItem><SelectItem value="no">{t('common.no')}</SelectItem></SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-1">
                  <Label className="text-xs">{t('reportDesigner.quotationTotalsDesigner.showVat')}</Label>
                  <Select value={selectedElement.quotationTotalsOptions?.showVat === false ? 'no' : 'yes'} onValueChange={(value) => updateReportElement(selectedElement.id, { quotationTotalsOptions: { ...selectedElement.quotationTotalsOptions, showVat: value === 'yes' } })}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="yes">{t('common.yes')}</SelectItem><SelectItem value="no">{t('common.no')}</SelectItem></SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-1">
                  <Label className="text-xs">{t('reportDesigner.quotationTotalsDesigner.emphasizeGrandTotal')}</Label>
                  <Select value={selectedElement.quotationTotalsOptions?.emphasizeGrandTotal === false ? 'no' : 'yes'} onValueChange={(value) => updateReportElement(selectedElement.id, { quotationTotalsOptions: { ...selectedElement.quotationTotalsOptions, emphasizeGrandTotal: value === 'yes' } })}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="yes">{t('common.yes')}</SelectItem><SelectItem value="no">{t('common.no')}</SelectItem></SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-1">
                  <Label className="text-xs">{t('reportDesigner.quotationTotalsDesigner.showNote')}</Label>
                  <Select value={selectedElement.quotationTotalsOptions?.showNote === true ? 'yes' : 'no'} onValueChange={(value) => updateReportElement(selectedElement.id, { quotationTotalsOptions: { ...selectedElement.quotationTotalsOptions, showNote: value === 'yes' } })}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="yes">{t('common.yes')}</SelectItem><SelectItem value="no">{t('common.no')}</SelectItem></SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-1">
                  <Label className="text-xs">{t('reportDesigner.quotationTotalsDesigner.hideEmptyNote')}</Label>
                  <Select value={selectedElement.quotationTotalsOptions?.hideEmptyNote === false ? 'no' : 'yes'} onValueChange={(value) => updateReportElement(selectedElement.id, { quotationTotalsOptions: { ...selectedElement.quotationTotalsOptions, hideEmptyNote: value === 'yes' } })}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="yes">{t('common.yes')}</SelectItem><SelectItem value="no">{t('common.no')}</SelectItem></SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            </PdfInspectorSection>
          ) : null}

          <PdfInspectorSection
            title={t('pdfReportDesigner.inspectorGroups.typography')}
            icon={<TypeIcon className="size-3.5" />}
            defaultOpen={true}
          >
            <div className="flex flex-col gap-2">
              <div className="flex flex-col gap-1">
                <Label className="text-xs">{t('reportDesigner.properties.fontSize')}</Label>
                <Select
                  value={String(selectedElement.fontSize ?? 14)}
                  onValueChange={(v) =>
                    updateReportElement(selectedElement.id, { fontSize: Number(v) })
                  }
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FONT_SIZES.map((size) => (
                      <SelectItem key={size} value={String(size)}>
                        {size} px
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1">
                <Label className="text-xs">{t('reportDesigner.properties.fontFamily')}</Label>
                <Select
                  value={selectedElement.fontFamily ?? 'Arial'}
                  onValueChange={(v) =>
                    updateReportElement(selectedElement.id, { fontFamily: v })
                  }
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FONT_FAMILIES.map((f) => (
                      <SelectItem key={f.value} value={f.value}>
                        {f.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1">
                <Label className="text-xs">{t('reportDesigner.inspector.alignment')}</Label>
                <Select
                  value={style.textAlign ?? 'left'}
                  onValueChange={(v: 'left' | 'center' | 'right') =>
                    updateReportElement(selectedElement.id, {
                      style: { ...style, textAlign: v },
                    })
                  }
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="left">{t('reportDesigner.inspector.left')}</SelectItem>
                    <SelectItem value="center">{t('reportDesigner.inspector.center')}</SelectItem>
                    <SelectItem value="right">{t('reportDesigner.inspector.right')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </PdfInspectorSection>

          <PdfInspectorSection
            title={t('pdfReportDesigner.inspectorGroups.appearance')}
            icon={<Palette className="size-3.5" />}
            defaultOpen={false}
          >
            <div className="flex flex-col gap-2">
              <div className="flex flex-col gap-1">
                <Label className="text-xs">{t('reportDesigner.inspector.background')}</Label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={style.background ?? '#ffffff'}
                    onChange={(e) =>
                      updateReportElement(selectedElement.id, {
                        style: { ...style, background: e.target.value },
                      })
                    }
                    className="h-8 w-10 cursor-pointer rounded border border-slate-200 bg-white p-0.5"
                  />
                  <Input
                    value={style.background ?? ''}
                    onChange={(e) =>
                      updateReportElement(selectedElement.id, {
                        style: { ...style, background: e.target.value || undefined },
                      })
                    }
                    className="h-8 flex-1 text-xs"
                    placeholder={t('reportDesigner.inspector.backgroundPlaceholder')}
                  />
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <Label className="text-xs">{t('reportDesigner.inspector.border')}</Label>
                <Input
                  value={style.border ?? ''}
                  onChange={(e) =>
                    updateReportElement(selectedElement.id, {
                      style: { ...style, border: e.target.value || undefined },
                    })
                  }
                  className="h-8 text-xs"
                  placeholder={t('reportDesigner.inspector.borderPlaceholder')}
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-1">
                  <Label className="text-xs">{t('reportDesigner.inspector.radius')}</Label>
                  <Input
                    type="number"
                    min={0}
                    value={style.radius ?? 0}
                    onChange={(e) =>
                      updateReportElement(selectedElement.id, {
                        style: { ...style, radius: Number(e.target.value) || 0 },
                      })
                    }
                    className="h-8 text-xs"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <Label className="text-xs">{t('reportDesigner.inspector.opacity')}</Label>
                  <Input
                    type="number"
                    min={0}
                    max={1}
                    step={0.1}
                    value={opacity}
                    onChange={(e) =>
                      updateReportElement(selectedElement.id, {
                        style: { ...style, opacity: Number(e.target.value) || 0 },
                      })
                    }
                    className="h-8 text-xs"
                  />
                </div>
              </div>
            </div>
          </PdfInspectorSection>
        </>
      )}

      <PdfInspectorSection
        title={t('pdfReportDesigner.inspectorGroups.advanced')}
        icon={<Layers className="size-3.5" />}
        defaultOpen={false}
        tone="muted"
      >
        <div className="flex flex-col gap-2">
          <div className="flex flex-col gap-1">
            <Label className="text-xs">{t('reportDesigner.inspector.zIndex')}</Label>
            <Input
              type="number"
              value={selectedElement.zIndex ?? ''}
              onChange={(e) =>
                updateElement(selectedElement.id, {
                  zIndex: e.target.value === '' ? undefined : Number(e.target.value),
                })
              }
              className="h-8 text-xs"
              placeholder={t('reportDesigner.inspector.zIndexPlaceholder')}
            />
          </div>
          <div className="flex flex-col gap-1">
            <Label className="text-xs">{t('reportDesigner.inspector.rotation')}</Label>
            <Input
              type="number"
              value={selectedElement.rotation ?? 0}
              onChange={(e) =>
                updateElement(selectedElement.id, { rotation: Number(e.target.value) || 0 })
              }
              className="h-8 text-xs"
            />
          </div>
        </div>
      </PdfInspectorSection>
      </div>
      </div>
    </div>
  );
}

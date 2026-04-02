import type { ReactElement } from 'react';
import { useMemo, useState } from 'react';
import { DndContext, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Combobox, type ComboboxOption } from '@/components/ui/combobox';
import { cn } from '@/lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useReportBuilderStore } from '../store';
import type {
  ChartType,
  Aggregation,
  DateGrouping,
  CalculatedFieldOperation,
  WidgetKpiFormat,
  WidgetBackgroundStyle,
  WidgetKpiLayout,
  WidgetValueFormat,
  WidgetTableDensity,
  WidgetThemePreset,
  WidgetTableColumnAlign,
  WidgetTableColumnWidth,
  WidgetTitleAlign,
  WidgetTone,
  WidgetSeriesVisibilityMode,
  WidgetSeriesOverflowMode,
} from '../types';
import { getFieldSemanticType, getOperatorsForField } from '../utils';
import type { Field } from '../types';
import { BarChart3, Calculator, Filter, GripVertical, LayoutTemplate, MoveVertical, PieChart, Sparkles, Table2, TrendingUp, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useUserList } from '@/features/user-management/hooks/useUserList';

const CHART_TYPES: { value: ChartType; label: string }[] = [
  { value: 'table', label: 'Table' }, // translated at render time
  { value: 'bar', label: 'Bar' },
  { value: 'stackedBar', label: 'Stacked Bar' },
  { value: 'line', label: 'Line' },
  { value: 'pie', label: 'Pie' },
  { value: 'donut', label: 'Donut' },
  { value: 'kpi', label: 'KPI' },
  { value: 'matrix', label: 'Matrix' },
];

const AGGREGATIONS: { value: Aggregation; label: string }[] = [
  { value: 'sum', label: 'Sum' },
  { value: 'count', label: 'Count' },
  { value: 'avg', label: 'Avg' },
  { value: 'min', label: 'Min' },
  { value: 'max', label: 'Max' },
];

const DATE_GROUPINGS: { value: DateGrouping; label: string }[] = [
  { value: 'day', label: 'Day' },
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month' },
  { value: 'year', label: 'Year' },
];

const CALCULATED_FIELD_OPERATIONS: { value: CalculatedFieldOperation; label: string }[] = [
  { value: 'add', label: 'A + B' },
  { value: 'subtract', label: 'A - B' },
  { value: 'multiply', label: 'A × B' },
  { value: 'divide', label: 'A ÷ B' },
];

const WIDGET_TONES: WidgetTone[] = ['neutral', 'soft', 'bold'];
const TABLE_DENSITIES: WidgetTableDensity[] = ['comfortable', 'compact'];
const THEME_PRESETS: WidgetThemePreset[] = ['executive', 'operations', 'performance'];
const TITLE_ALIGNS: WidgetTitleAlign[] = ['left', 'center'];
const KPI_FORMATS: WidgetKpiFormat[] = ['number', 'currency', 'percent'];
const BACKGROUND_STYLES: WidgetBackgroundStyle[] = ['card', 'glass', 'gradient', 'muted'];
const KPI_LAYOUTS: WidgetKpiLayout[] = ['split', 'spotlight', 'compact'];
const VALUE_FORMATS: WidgetValueFormat[] = ['default', 'number', 'currency', 'percent'];
const TABLE_COLUMN_ALIGNS: WidgetTableColumnAlign[] = ['left', 'center', 'right'];
const TABLE_COLUMN_WIDTHS: WidgetTableColumnWidth[] = ['auto', 'sm', 'md', 'lg'];
const SERIES_VISIBILITY_MODES: WidgetSeriesVisibilityMode[] = ['auto', 'limited', 'all'];
const SERIES_OVERFLOW_MODES: WidgetSeriesOverflowMode[] = ['others', 'hide'];
const SERIES_LIMIT_OPTIONS = [5, 8, 10, 15];

const OPERATOR_LABELS: Record<string, string> = {
  eq: '=',
  ne: '!=',
  gt: '>',
  gte: '>=',
  lt: '<',
  lte: '<=',
  between: 'Between',
  contains: 'Contains',
  startsWith: 'Starts with',
  endsWith: 'Ends with',
  in: 'In list',
  isNull: 'Is empty',
  isNotNull: 'Has value',
};

function getInputType(field?: Field): 'text' | 'number' | 'date' {
  if (!field) return 'text';
  const semanticType = getFieldSemanticType(field);
  if (semanticType === 'number') return 'number';
  if (semanticType === 'date') return 'date';
  return 'text';
}

interface PropertiesPanelProps {
  schema: Field[];
  slotError: string | null;
  disabled?: boolean;
  mode?: 'basic' | 'advanced';
}

function getChartIcon(type: ChartType): ReactElement {
  switch (type) {
    case 'table':
    case 'matrix':
      return <Table2 className="size-4" />;
    case 'pie':
    case 'donut':
      return <PieChart className="size-4" />;
    case 'line':
      return <TrendingUp className="size-4" />;
    default:
      return <BarChart3 className="size-4" />;
  }
}

interface SortableColumnRowProps {
  id: string;
  children: React.ReactNode;
}

function SortableColumnRow({ id, children }: SortableColumnRowProps): ReactElement {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(isDragging && 'opacity-70')}
    >
      <div className="flex items-start gap-2">
        <button
          type="button"
          className="mt-2 inline-flex size-7 shrink-0 items-center justify-center rounded-md border bg-background text-muted-foreground"
          {...attributes}
          {...listeners}
          aria-label="Sutunu tasimak icin surukle"
        >
          <MoveVertical className="size-3.5" />
        </button>
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}

export function PropertiesPanel({ schema, slotError: _slotError, disabled, mode = 'advanced' }: PropertiesPanelProps): ReactElement {
  const { t } = useTranslation('common');
  const numericFields = schema.filter((field) => getFieldSemanticType(field) === 'number');
  const [calcName, setCalcName] = useState('');
  const [calcLabel, setCalcLabel] = useState('');
  const [calcLeftField, setCalcLeftField] = useState('');
  const [calcRightField, setCalcRightField] = useState('');
  const [calcOperation, setCalcOperation] = useState<CalculatedFieldOperation>('add');
  const {
    config,
    meta,
    setMeta,
    setChartType,
    setDateGrouping,
    setSorting,
    setAggregation,
    setAxisLabel,
    setLegendLabel,
    setValueLabel,
    removeFromSlot,
    addCalculatedField,
    removeCalculatedField,
    rollbackToHistory,
    setGovernanceMetadata,
    setLifecycleReleaseNote,
    updateFilter,
    removeFilter,
    addToSlot,
    setWidgetAppearance,
  } = useReportBuilderStore();
  const lifecycle = config.lifecycle ?? { status: 'draft' as const, version: 1 };
  const governance = config.governance ?? {
    audience: 'private' as const,
    refreshCadence: 'manual' as const,
    favorite: false,
    tags: [],
    sharedWith: [],
    subscriptionEnabled: false,
    subscriptionChannel: 'email' as const,
    subscriptionFrequency: 'weekly' as const,
    certified: false,
  };
  const { data: usersResponse } = useUserList({
    pageNumber: 1,
    pageSize: 100,
    sortBy: 'fullName',
    sortDirection: 'asc',
  });
  const userOptions = useMemo<ComboboxOption[]>(
    () =>
      (usersResponse?.data ?? [])
        .filter((user) => Boolean(user.email))
        .map((user) => ({
          value: String(user.id),
          label: `${user.fullName || user.username} (${user.email})`,
        })),
    [usersResponse?.data],
  );
  const assignedUserIds = meta.assignedUserIds ?? [];
  const activeWidget = (config.widgets ?? []).find((widget) => widget.id === config.activeWidgetId);
  const activeAppearance = activeWidget?.appearance ?? {
    tone: 'neutral' as const,
    accentColor: '#1d4ed8',
    showStats: true,
    tableDensity: 'comfortable' as const,
  };
  const selectedAssignedUserOptions = useMemo(
    () =>
      assignedUserIds.map((userId) => {
        const match = userOptions.find((option) => option.value === String(userId));
        return {
          userId,
          label: match?.label ?? String(userId),
        };
      }),
    [assignedUserIds, userOptions],
  );

  const axisField = config.axis?.field;
  const axisSchema = schema.find((f) => f.name === axisField);
  const chartTypeLabel = (value: string): string => t(`common.reportBuilder.chartTypes.${value}`);
  const aggregationLabel = (value: string): string => t(`common.reportBuilder.aggregations.${value}`);
  const dateGroupingLabel = (value: string): string => t(`common.reportBuilder.dateGroupings.${value}`);
  const operatorLabel = (value: string): string => t(`common.reportBuilder.operators.${value}`, { defaultValue: OPERATOR_LABELS[value] ?? value });
  const isBasicMode = mode === 'basic';
  const dimensionFields = useMemo(
    () => schema.filter((field) => {
      const type = getFieldSemanticType(field);
      return type === 'text' || type === 'date';
    }),
    [schema],
  );
  const metricOptions = useMemo(
    () => [
      ...schema
        .filter((field) => getFieldSemanticType(field) === 'number')
        .map((field) => ({
          value: field.name,
          label: field.displayName || field.name,
          defaultAggregation: (field.defaultAggregation === 'count' ? 'count' : field.defaultAggregation ?? 'sum') as Aggregation,
        })),
      ...(config.calculatedFields ?? []).map((field) => ({
        value: field.name,
        label: field.label || field.name,
        defaultAggregation: 'sum' as Aggregation,
      })),
    ],
    [config.calculatedFields, schema],
  );
  const selectedMetricField = config.values[0]?.field ?? '';
  const selectedMetricLabel = config.values[0]?.label ?? '';
  const selectedAggregation = config.values[0]?.aggregation ?? 'sum';
  const selectedAxisField = config.axis?.field ?? '';
  const selectedAxisLabel = config.axis?.label ?? '';
  const selectedLegendField = config.legend?.field ?? '';
  const selectedLegendLabel = config.legend?.label ?? '';
  const selectedAxisFieldSchema = schema.find((field) => field.name === selectedAxisField);
  const selectedAxisType = selectedAxisFieldSchema ? getFieldSemanticType(selectedAxisFieldSchema) : null;
  const fieldLabelMap = useMemo(
    () => new Map([
      ...schema.map((field) => [field.name, field.displayName || field.name] as const),
      ...(config.calculatedFields ?? []).map((field) => [field.name, field.label || field.name] as const),
    ]),
    [config.calculatedFields, schema],
  );
  const getFieldLabel = (fieldName?: string): string =>
    fieldName ? fieldLabelMap.get(fieldName) ?? fieldName : t('common.reportBuilder.basicNoneSelected');
  const tableColumnCandidates = useMemo(() => {
    const items: Array<{ key: string; label: string }> = [];
    if (config.axis?.field) items.push({ key: config.axis.field, label: config.axis.label?.trim() || getFieldLabel(config.axis.field) });
    if (config.legend?.field) items.push({ key: config.legend.field, label: config.legend.label?.trim() || getFieldLabel(config.legend.field) });
    config.values.forEach((value) => {
      if (!items.some((item) => item.key === value.field)) {
        items.push({ key: value.field, label: value.label?.trim() || getFieldLabel(value.field) });
      }
    });
    return items;
  }, [config.axis, config.legend, config.values, getFieldLabel]);
  const orderedTableColumns = useMemo(() => {
    const configuredOrder = activeAppearance.tableColumnOrder ?? [];
    const ordered = configuredOrder
      .map((key) => tableColumnCandidates.find((item) => item.key === key))
      .filter((item): item is { key: string; label: string } => Boolean(item));
    const rest = tableColumnCandidates.filter((item) => !configuredOrder.includes(item.key));
    return [...ordered, ...rest];
  }, [activeAppearance.tableColumnOrder, tableColumnCandidates]);
  const hiddenColumns = activeAppearance.hiddenColumns ?? [];
  const tableColumnSettings = activeAppearance.tableColumnSettings ?? [];
  const columnSensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const setSingleMetric = (fieldName: string): void => {
    for (let index = config.values.length - 1; index >= 0; index -= 1) {
      removeFromSlot('values', index);
    }
    const defaultAggregation = metricOptions.find((option) => option.value === fieldName)?.defaultAggregation ?? 'sum';
    addToSlot('values', fieldName, { aggregation: defaultAggregation });
  };

  const setAxisField = (fieldName: string): void => {
    if (fieldName === 'none') {
      removeFromSlot('axis', 0);
      return;
    }
    addToSlot('axis', fieldName);
  };

  const setLegendField = (fieldName: string): void => {
    if (fieldName === 'none') {
      removeFromSlot('legend', 0);
      return;
    }
    addToSlot('legend', fieldName);
  };
  const toggleTableColumnVisibility = (columnKey: string): void => {
    if (!activeWidget) return;
    const next = hiddenColumns.includes(columnKey)
      ? hiddenColumns.filter((item) => item !== columnKey)
      : [...hiddenColumns, columnKey];
    setWidgetAppearance(activeWidget.id, { hiddenColumns: next });
  };
  const updateTableColumnSetting = (
    columnKey: string,
    patch: { align?: WidgetTableColumnAlign; width?: WidgetTableColumnWidth; valueFormat?: WidgetValueFormat; decimalPlaces?: number },
  ): void => {
    if (!activeWidget) return;
    const nextSettings = [...tableColumnSettings];
    const existingIndex = nextSettings.findIndex((item) => item.key === columnKey);
    const current = existingIndex >= 0 ? nextSettings[existingIndex] : { key: columnKey };
    const next = { ...current, ...patch };
    if (existingIndex >= 0) nextSettings[existingIndex] = next;
    else nextSettings.push(next);
    setWidgetAppearance(activeWidget.id, { tableColumnSettings: nextSettings });
  };
  const getTableColumnSetting = (columnKey: string) => tableColumnSettings.find((item) => item.key === columnKey);
  const handleTableColumnDragEnd = (event: DragEndEvent): void => {
    if (!activeWidget || !event.over || event.active.id === event.over.id) return;
    const overId = event.over?.id;
    if (!overId) return;
    const currentOrder = [...orderedTableColumns];
    const oldIndex = currentOrder.findIndex((item) => item.key === String(event.active.id));
    const newIndex = currentOrder.findIndex((item) => item.key === String(overId));
    if (oldIndex < 0 || newIndex < 0) return;
    const reordered = arrayMove(currentOrder, oldIndex, newIndex);
    setWidgetAppearance(activeWidget.id, { tableColumnOrder: reordered.map((item) => item.key) });
  };

  if (!disabled && isBasicMode) {
    const simpleChartTypes: ChartType[] = ['table', 'bar', 'line', 'pie', 'donut', 'kpi'];
    const showAxisSelector = config.chartType !== 'kpi';
    const showLegendSelector = config.chartType !== 'kpi';

    return (
      <div className="flex flex-col gap-4 overflow-y-auto">
        <div className="rounded-xl border bg-muted/20 p-4">
          <div className="mb-1 flex items-center gap-2">
            <Sparkles className="size-4 text-primary" />
            <Label>{t('common.reportBuilder.basicSetupTitle')}</Label>
          </div>
          <p className="text-muted-foreground text-xs">{t('common.reportBuilder.basicSetupDescription')}</p>
        </div>

        <div className="space-y-3 rounded-xl border p-4">
          <div>
            <Label>{t('common.reportBuilder.basicChooseVisualTitle')}</Label>
            <p className="text-muted-foreground mt-1 text-xs">{t('common.reportBuilder.basicChooseVisualDescription')}</p>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {simpleChartTypes.map((type) => (
              <Button
                key={type}
                type="button"
                variant={config.chartType === type ? 'default' : 'outline'}
                className="h-auto justify-start px-3 py-3 text-left"
                onClick={() => setChartType(type)}
              >
                <div>
                  <div className="font-medium">{chartTypeLabel(type)}</div>
                  <div className="mt-1 text-xs opacity-80">{t(`common.reportBuilder.chartTypeDescriptions.${type}`)}</div>
                </div>
              </Button>
            ))}
          </div>
        </div>

        {showAxisSelector ? (
          <div className="space-y-2 rounded-xl border p-4">
            <div>
              <Label>{t('common.reportBuilder.basicChooseGroupByTitle')}</Label>
              <p className="text-muted-foreground mt-1 text-xs">{t('common.reportBuilder.basicChooseGroupByDescription')}</p>
            </div>
            <Select value={selectedAxisField || 'none'} onValueChange={setAxisField}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">{t('common.reportBuilder.basicNoneSelected')}</SelectItem>
                {dimensionFields.map((field) => (
                  <SelectItem key={field.name} value={field.name}>
                    {field.displayName || field.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {selectedAxisType === 'date' ? (
              <div className="space-y-2 rounded-lg bg-muted/40 p-3">
                <Label>{t('common.reportBuilder.basicChooseDateGroupingTitle')}</Label>
                <Select value={config.axis?.dateGrouping ?? 'day'} onValueChange={(value) => setDateGrouping(value as DateGrouping)}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DATE_GROUPINGS.map((grouping) => (
                      <SelectItem key={grouping.value} value={grouping.value}>
                        {dateGroupingLabel(grouping.value)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}
          </div>
        ) : null}

        <div className="space-y-2 rounded-xl border p-4">
          <div>
            <Label>{t('common.reportBuilder.basicChooseMetricTitle')}</Label>
            <p className="text-muted-foreground mt-1 text-xs">{t('common.reportBuilder.basicChooseMetricDescription')}</p>
          </div>
          <Select
            value={selectedMetricField || 'none'}
            onValueChange={(value) => {
              if (value === 'none') {
                for (let index = config.values.length - 1; index >= 0; index -= 1) {
                  removeFromSlot('values', index);
                }
                return;
              }
              setSingleMetric(value);
            }}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">{t('common.reportBuilder.basicNoneSelected')}</SelectItem>
              {metricOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {selectedMetricField ? (
          <div className="space-y-2 rounded-xl border p-4">
            <div>
              <Label>{t('common.reportBuilder.basicChooseAggregationTitle')}</Label>
              <p className="text-muted-foreground mt-1 text-xs">{t('common.reportBuilder.basicChooseAggregationDescription')}</p>
            </div>
            <Select value={selectedAggregation} onValueChange={(value) => setAggregation(0, value as Aggregation)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {AGGREGATIONS.map((aggregation) => (
                  <SelectItem key={aggregation.value} value={aggregation.value}>
                    {aggregationLabel(aggregation.value)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : null}

        {showLegendSelector ? (
          <div className="space-y-2 rounded-xl border p-4">
            <div>
              <Label>{t('common.reportBuilder.basicChooseBreakdownTitle')}</Label>
              <p className="text-muted-foreground mt-1 text-xs">{t('common.reportBuilder.basicChooseBreakdownDescription')}</p>
            </div>
            <Select value={selectedLegendField || 'none'} onValueChange={setLegendField}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">{t('common.reportBuilder.basicNoBreakdown')}</SelectItem>
                {dimensionFields
                  .filter((field) => field.name !== selectedAxisField)
                  .map((field) => (
                    <SelectItem key={field.name} value={field.name}>
                      {field.displayName || field.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
        ) : null}

        {(selectedAxisField || selectedMetricField || selectedLegendField) ? (
          <div className="space-y-3 rounded-xl border p-4">
            <div>
              <Label>{t('common.reportBuilder.basicCustomLabelsTitle')}</Label>
              <p className="text-muted-foreground mt-1 text-xs">{t('common.reportBuilder.basicCustomLabelsDescription')}</p>
            </div>
            {selectedAxisField ? (
              <div className="space-y-2">
                <Label>{t('common.reportBuilder.basicCustomAxisLabel')}</Label>
                <Input
                  value={selectedAxisLabel}
                  placeholder={getFieldLabel(selectedAxisField)}
                  onChange={(e) => setAxisLabel(e.target.value)}
                />
              </div>
            ) : null}
            {selectedMetricField ? (
              <div className="space-y-2">
                <Label>{t('common.reportBuilder.basicCustomMetricLabel')}</Label>
                <Input
                  value={selectedMetricLabel}
                  placeholder={getFieldLabel(selectedMetricField)}
                  onChange={(e) => setValueLabel(0, e.target.value)}
                />
              </div>
            ) : null}
            {selectedLegendField ? (
              <div className="space-y-2">
                <Label>{t('common.reportBuilder.basicCustomBreakdownLabel')}</Label>
                <Input
                  value={selectedLegendLabel}
                  placeholder={getFieldLabel(selectedLegendField)}
                  onChange={(e) => setLegendLabel(e.target.value)}
                />
              </div>
            ) : null}
          </div>
        ) : null}

        <div className="space-y-3 rounded-xl border bg-slate-50/80 p-4 dark:bg-slate-900/40">
          <div>
            <Label>{t('common.reportBuilder.basicSummaryTitle')}</Label>
            <p className="text-muted-foreground mt-1 text-xs">{t('common.reportBuilder.basicSummaryDescription')}</p>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="rounded-lg border bg-background p-3">
              <div className="text-muted-foreground text-[11px] uppercase tracking-wide">{t('common.reportBuilder.basicSummaryVisual')}</div>
              <div className="mt-1 text-sm font-medium">{chartTypeLabel(config.chartType)}</div>
            </div>
            <div className="rounded-lg border bg-background p-3">
              <div className="text-muted-foreground text-[11px] uppercase tracking-wide">{t('common.reportBuilder.basicSummaryGroupBy')}</div>
              <div className="mt-1 text-sm font-medium">
                {showAxisSelector ? (selectedAxisLabel || getFieldLabel(selectedAxisField)) : t('common.reportBuilder.basicKpiNoGrouping')}
              </div>
            </div>
            <div className="rounded-lg border bg-background p-3">
              <div className="text-muted-foreground text-[11px] uppercase tracking-wide">{t('common.reportBuilder.basicSummaryMetric')}</div>
              <div className="mt-1 text-sm font-medium">{selectedMetricLabel || getFieldLabel(selectedMetricField)}</div>
            </div>
            <div className="rounded-lg border bg-background p-3">
              <div className="text-muted-foreground text-[11px] uppercase tracking-wide">{t('common.reportBuilder.basicSummaryAggregation')}</div>
              <div className="mt-1 text-sm font-medium">{selectedMetricField ? aggregationLabel(selectedAggregation) : t('common.reportBuilder.basicNoneSelected')}</div>
            </div>
            <div className="rounded-lg border bg-background p-3 sm:col-span-2">
              <div className="text-muted-foreground text-[11px] uppercase tracking-wide">{t('common.reportBuilder.basicSummaryBreakdown')}</div>
              <div className="mt-1 text-sm font-medium">
                {showLegendSelector ? (selectedLegendField ? (selectedLegendLabel || getFieldLabel(selectedLegendField)) : t('common.reportBuilder.basicNoBreakdown')) : t('common.reportBuilder.basicNoBreakdown')}
              </div>
            </div>
          </div>
        </div>

        {activeWidget ? (
          <div className="space-y-3 rounded-xl border p-4">
            <div>
              <Label>{t('common.reportBuilder.stylePresets')}</Label>
              <p className="text-muted-foreground mt-1 text-xs">{t('common.reportBuilder.basicStyleDescription')}</p>
            </div>
            <div className="grid gap-2 sm:grid-cols-3">
              {THEME_PRESETS.map((preset) => (
                <Button
                  key={preset}
                  type="button"
                  variant={(activeAppearance.themePreset ?? 'executive') === preset ? 'default' : 'outline'}
                  className="justify-start"
                  onClick={() => handleApplyStylePreset(preset)}
                >
                  {t(`common.reportBuilder.widgetThemePresets.${preset}`)}
                </Button>
              ))}
            </div>
          </div>
        ) : null}

        {activeWidget && config.chartType === 'table' && orderedTableColumns.length > 0 ? (
          <div className="space-y-3 rounded-xl border p-4">
            <div>
              <Label>{t('common.reportBuilder.basicTableColumnsTitle')}</Label>
              <p className="text-muted-foreground mt-1 text-xs">{t('common.reportBuilder.basicTableColumnsDescription')}</p>
            </div>
            <DndContext sensors={columnSensors} collisionDetection={closestCenter} onDragEnd={handleTableColumnDragEnd}>
              <SortableContext items={orderedTableColumns.map((column) => column.key)} strategy={verticalListSortingStrategy}>
                <div className="space-y-2">
                  {orderedTableColumns.map((column) => {
                    const isHidden = hiddenColumns.includes(column.key);
                    const setting = getTableColumnSetting(column.key);
                    return (
                      <SortableColumnRow key={column.key} id={column.key}>
                        <div className="space-y-3 rounded-lg border bg-background px-3 py-3">
                          <div className="flex items-center gap-2">
                            <div className="min-w-0 flex-1">
                              <div className={cn('text-sm font-medium', isHidden && 'text-muted-foreground line-through')}>{column.label}</div>
                            </div>
                            <Button type="button" variant={isHidden ? 'outline' : 'secondary'} size="sm" onClick={() => toggleTableColumnVisibility(column.key)}>
                              {isHidden ? t('common.reportBuilder.showColumn') : t('common.reportBuilder.hideColumn')}
                            </Button>
                          </div>
                          <div className="grid gap-2 sm:grid-cols-2">
                            <Select value={setting?.align ?? 'left'} onValueChange={(value) => updateTableColumnSetting(column.key, { align: value as WidgetTableColumnAlign })}>
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder={t('common.reportBuilder.columnAlign')} />
                              </SelectTrigger>
                              <SelectContent>
                                {TABLE_COLUMN_ALIGNS.map((align) => (
                                  <SelectItem key={align} value={align}>
                                    {t(`common.reportBuilder.columnAligns.${align}`)}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Select value={setting?.width ?? 'auto'} onValueChange={(value) => updateTableColumnSetting(column.key, { width: value as WidgetTableColumnWidth })}>
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder={t('common.reportBuilder.columnWidth')} />
                              </SelectTrigger>
                              <SelectContent>
                                {TABLE_COLUMN_WIDTHS.map((width) => (
                                  <SelectItem key={width} value={width}>
                                    {t(`common.reportBuilder.columnWidths.${width}`)}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Select value={setting?.valueFormat ?? 'default'} onValueChange={(value) => updateTableColumnSetting(column.key, { valueFormat: value as WidgetValueFormat })}>
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder={t('common.reportBuilder.columnValueFormat')} />
                              </SelectTrigger>
                              <SelectContent>
                                {VALUE_FORMATS.map((format) => (
                                  <SelectItem key={format} value={format}>
                                    {t(`common.reportBuilder.widgetValueFormats.${format}`)}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Input
                              type="number"
                              min={0}
                              max={4}
                              value={String(setting?.decimalPlaces ?? 0)}
                              onChange={(e) => updateTableColumnSetting(column.key, { decimalPlaces: Math.max(0, Math.min(4, Number(e.target.value || 0))) })}
                              placeholder={t('common.reportBuilder.columnDecimalPlaces')}
                            />
                          </div>
                        </div>
                      </SortableColumnRow>
                    );
                  })}
                </div>
              </SortableContext>
            </DndContext>
          </div>
        ) : null}
      </div>
    );
  }

  const handleApplyStylePreset = (preset: WidgetThemePreset): void => {
    if (!activeWidget) return;
    if (preset === 'executive') {
      setWidgetAppearance(activeWidget.id, {
        themePreset: 'executive',
        tone: 'neutral',
        backgroundStyle: 'card',
        titleAlign: 'left',
        showStats: true,
        accentColor: '#1d4ed8',
      });
      return;
    }
    if (preset === 'operations') {
      setWidgetAppearance(activeWidget.id, {
        themePreset: 'operations',
        tone: 'soft',
        backgroundStyle: 'muted',
        titleAlign: 'left',
        showStats: true,
        accentColor: '#d97706',
      });
      return;
    }
    setWidgetAppearance(activeWidget.id, {
      themePreset: 'performance',
      tone: 'bold',
      backgroundStyle: 'gradient',
      titleAlign: 'center',
      showStats: true,
      accentColor: '#059669',
    });
  };

  if (disabled) {
    return (
      <div className="space-y-4">
        <p className="text-muted-foreground text-sm">{t('common.reportBuilder.checkFirst')}</p>
      </div>
    );
  }

  const handleAddCalculatedField = (): void => {
    if (!calcName.trim() || !calcLeftField || !calcRightField) return;
    addCalculatedField({
      name: calcName.trim(),
      label: calcLabel.trim() || calcName.trim(),
      leftField: calcLeftField,
      rightField: calcRightField,
      operation: calcOperation,
    });
    setCalcName('');
    setCalcLabel('');
    setCalcLeftField('');
    setCalcRightField('');
    setCalcOperation('add');
  };

  const handleAddAssignedUser = (userIdRaw: string): void => {
    const userId = Number(userIdRaw);
    if (!Number.isFinite(userId) || userId <= 0) return;
    if (assignedUserIds.includes(userId)) return;
    const user = (usersResponse?.data ?? []).find((item) => item.id === userId);
    const email = user?.email?.toLowerCase();
    setMeta({
      assignedUserIds: [...assignedUserIds, userId],
    });
    setGovernanceMetadata({
      sharedWith: email && !(governance.sharedWith ?? []).includes(email)
        ? [...(governance.sharedWith ?? []), email]
        : governance.sharedWith ?? [],
    });
  };

  const handleRemoveAssignedUser = (userId: number): void => {
    const user = (usersResponse?.data ?? []).find((item) => item.id === userId);
    const email = user?.email?.toLowerCase();
    setMeta({
      assignedUserIds: assignedUserIds.filter((value) => value !== userId),
    });
    setGovernanceMetadata({
      sharedWith: email ? (governance.sharedWith ?? []).filter((value) => value !== email) : governance.sharedWith ?? [],
    });
  };

  return (
    <div className="flex flex-col gap-4 overflow-y-auto">
      <div className="rounded-lg border border-dashed p-3">
        <div className="mb-3 flex items-center gap-2">
          <LayoutTemplate className="size-4 text-primary" />
          <Label>{t('common.reportBuilder.visualGallery')}</Label>
        </div>
        <p className="text-muted-foreground mb-3 text-xs">{t('common.reportBuilder.visualGalleryDescription')}</p>
        <div className="grid gap-2 sm:grid-cols-2">
          {CHART_TYPES.map((item) => {
            const active = config.chartType === item.value;
            return (
              <button
                key={item.value}
                type="button"
                onClick={() => setChartType(item.value)}
                className={`rounded-xl border px-3 py-3 text-left transition-colors ${
                  active ? 'border-primary bg-primary/5' : 'border-border bg-background hover:bg-muted/40'
                }`}
              >
                <div className="mb-2 flex items-center gap-2 font-medium">
                  {getChartIcon(item.value)}
                  {chartTypeLabel(item.value)}
                </div>
                <p className="text-muted-foreground text-xs">
                  {t(`common.reportBuilder.chartTypeDescriptions.${item.value}`)}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-2">
        <Label>{t('common.reportBuilder.chartType')}</Label>
        <Select value={config.chartType} onValueChange={(v) => setChartType(v as ChartType)}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CHART_TYPES.map((t) => (
              <SelectItem key={t.value} value={t.value}>
                    {chartTypeLabel(t.value)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-lg border border-dashed p-3">
        <div className="mb-2 flex items-center gap-2">
          <Filter className="size-4 text-primary" />
          <Label>{t('common.reportBuilder.configGuide')}</Label>
        </div>
        <p className="text-muted-foreground text-xs">{t('common.reportBuilder.configGuideDescription')}</p>
      </div>

      {activeWidget ? (
        <div className="rounded-lg border border-dashed p-3">
          <div className="mb-2 flex items-center gap-2">
            <GripVertical className="size-4 text-primary" />
            <Label>{t('common.reportBuilder.designControls')}</Label>
          </div>
          <p className="text-muted-foreground mb-3 text-xs">{t('common.reportBuilder.designControlsDescription')}</p>

          <div className="mb-3 space-y-2">
            <Label>{t('common.reportBuilder.stylePresets')}</Label>
            <div className="grid gap-2 sm:grid-cols-3">
              {THEME_PRESETS.map((preset) => (
                <Button
                  key={preset}
                  type="button"
                  variant={(activeAppearance.themePreset ?? 'executive') === preset ? 'default' : 'outline'}
                  className="justify-start"
                  onClick={() => handleApplyStylePreset(preset)}
                >
                  {t(`common.reportBuilder.widgetThemePresets.${preset}`)}
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>{t('common.reportBuilder.widgetSubtitle')}</Label>
            <Input
              value={activeAppearance.subtitle ?? ''}
              placeholder={t('common.reportBuilder.widgetSubtitlePlaceholder')}
              onChange={(e) => setWidgetAppearance(activeWidget.id, { subtitle: e.target.value })}
            />
          </div>

          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>{t('common.reportBuilder.widgetThemePreset')}</Label>
              <Select
                value={activeAppearance.themePreset ?? 'executive'}
                onValueChange={(value) => setWidgetAppearance(activeWidget.id, { themePreset: value as WidgetThemePreset })}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {THEME_PRESETS.map((preset) => (
                    <SelectItem key={preset} value={preset}>
                      {t(`common.reportBuilder.widgetThemePresets.${preset}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t('common.reportBuilder.widgetTone')}</Label>
              <Select
                value={activeAppearance.tone ?? 'neutral'}
                onValueChange={(value) => setWidgetAppearance(activeWidget.id, { tone: value as WidgetTone })}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {WIDGET_TONES.map((tone) => (
                    <SelectItem key={tone} value={tone}>
                      {t(`common.reportBuilder.widgetTones.${tone}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t('common.reportBuilder.widgetAccentColor')}</Label>
              <Input
                type="color"
                value={activeAppearance.accentColor ?? '#1d4ed8'}
                onChange={(e) => setWidgetAppearance(activeWidget.id, { accentColor: e.target.value })}
                className="h-11 w-full"
              />
            </div>
          </div>

          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>{t('common.reportBuilder.widgetSectionLabel')}</Label>
              <Input
                value={activeAppearance.sectionLabel ?? ''}
                placeholder={t('common.reportBuilder.widgetSectionLabelPlaceholder')}
                onChange={(e) => setWidgetAppearance(activeWidget.id, { sectionLabel: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>{t('common.reportBuilder.widgetSectionDescription')}</Label>
              <Input
                value={activeAppearance.sectionDescription ?? ''}
                placeholder={t('common.reportBuilder.widgetSectionDescriptionPlaceholder')}
                onChange={(e) => setWidgetAppearance(activeWidget.id, { sectionDescription: e.target.value })}
              />
            </div>
          </div>

          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>{t('common.reportBuilder.widgetTitleAlign')}</Label>
              <Select
                value={activeAppearance.titleAlign ?? 'left'}
                onValueChange={(value) => setWidgetAppearance(activeWidget.id, { titleAlign: value as WidgetTitleAlign })}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TITLE_ALIGNS.map((align) => (
                    <SelectItem key={align} value={align}>
                      {t(`common.reportBuilder.widgetTitleAligns.${align}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t('common.reportBuilder.widgetValueFormat')}</Label>
              <Select
                value={activeAppearance.valueFormat ?? 'default'}
                onValueChange={(value) => setWidgetAppearance(activeWidget.id, { valueFormat: value as WidgetValueFormat })}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {VALUE_FORMATS.map((format) => (
                    <SelectItem key={format} value={format}>
                      {t(`common.reportBuilder.widgetValueFormats.${format}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>{t('common.reportBuilder.widgetTableDensity')}</Label>
              <Select
                value={activeAppearance.tableDensity ?? 'comfortable'}
                onValueChange={(value) => setWidgetAppearance(activeWidget.id, { tableDensity: value as WidgetTableDensity })}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TABLE_DENSITIES.map((density) => (
                    <SelectItem key={density} value={density}>
                      {t(`common.reportBuilder.tableDensities.${density}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t('common.reportBuilder.widgetBackgroundStyle')}</Label>
              <Select
                value={activeAppearance.backgroundStyle ?? 'card'}
                onValueChange={(value) => setWidgetAppearance(activeWidget.id, { backgroundStyle: value as WidgetBackgroundStyle })}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {BACKGROUND_STYLES.map((style) => (
                    <SelectItem key={style} value={style}>
                      {t(`common.reportBuilder.widgetBackgroundStyles.${style}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t('common.reportBuilder.widgetDecimalPlaces')}</Label>
              <Input
                type="number"
                min={0}
                max={4}
                value={String(activeAppearance.decimalPlaces ?? 0)}
                onChange={(e) =>
                  setWidgetAppearance(activeWidget.id, {
                    decimalPlaces: Math.max(0, Math.min(4, Number(e.target.value || 0))),
                  })
                }
              />
            </div>
          </div>

          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>{t('common.reportBuilder.widgetStatsVisibility')}</Label>
              <Select
                value={activeAppearance.showStats === false ? 'hidden' : 'visible'}
                onValueChange={(value) => setWidgetAppearance(activeWidget.id, { showStats: value === 'visible' })}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="visible">{t('common.reportBuilder.widgetStatsVisible')}</SelectItem>
                  <SelectItem value="hidden">{t('common.reportBuilder.widgetStatsHidden')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {activeWidget.chartType === 'kpi' ? (
              <div className="space-y-2">
                <Label>{t('common.reportBuilder.widgetKpiFormat')}</Label>
                <Select
                  value={activeAppearance.kpiFormat ?? 'number'}
                  onValueChange={(value) => setWidgetAppearance(activeWidget.id, { kpiFormat: value as WidgetKpiFormat })}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {KPI_FORMATS.map((format) => (
                      <SelectItem key={format} value={format}>
                        {t(`common.reportBuilder.widgetKpiFormats.${format}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div className="space-y-2">
                <Label>{t('common.reportBuilder.widgetCanvasHint')}</Label>
                <div className="text-muted-foreground rounded-md border border-dashed px-3 py-2 text-xs">
                  {t('common.reportBuilder.widgetCanvasHintDescription')}
                </div>
              </div>
            )}
          </div>

          {activeWidget.chartType === 'kpi' ? (
            <div className="mt-3 space-y-2">
              <Label>{t('common.reportBuilder.widgetKpiLayout')}</Label>
              <Select
                value={activeAppearance.kpiLayout ?? 'split'}
                onValueChange={(value) => setWidgetAppearance(activeWidget.id, { kpiLayout: value as WidgetKpiLayout })}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {KPI_LAYOUTS.map((layout) => (
                    <SelectItem key={layout} value={layout}>
                      {t(`common.reportBuilder.widgetKpiLayouts.${layout}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}
        </div>
      ) : null}

      {isBasicMode ? (
        <div className="rounded-lg border border-dashed p-3">
          <div className="mb-2 font-medium">{t('common.reportBuilder.basicModeTitle')}</div>
          <p className="text-muted-foreground text-xs">{t('common.reportBuilder.basicModeDescription')}</p>
        </div>
      ) : null}

      {!isBasicMode && config.axis &&
        axisSchema &&
        (axisSchema.dotNetType?.includes('DateTime') ?? axisSchema.sqlType?.toLowerCase().includes('date')) && (
          <div className="space-y-2">
            <Label>{t('common.reportBuilder.dateGrouping')}</Label>
            <Select
              value={config.axis.dateGrouping ?? 'day'}
              onValueChange={(v) => setDateGrouping(v as DateGrouping)}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DATE_GROUPINGS.map((g) => (
                  <SelectItem key={g.value} value={g.value}>
                    {dateGroupingLabel(g.value)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

      {!isBasicMode && (
      <div className="space-y-2">
        <Label>{t('common.reportBuilder.sorting')}</Label>
        <div className="flex gap-2">
          <Select
            value={config.sorting?.by ?? 'axis'}
            onValueChange={(by) =>
              setSorting({
                by: by as 'axis' | 'value',
                direction: config.sorting?.direction ?? 'asc',
                valueField: config.sorting?.valueField,
              })
            }
          >
            <SelectTrigger className="flex-1">
              <SelectValue placeholder={t('common.reportBuilder.sortBy')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="axis">{t('common.reportBuilder.axis')}</SelectItem>
              <SelectItem value="value">{t('common.reportBuilder.value')}</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={config.sorting?.direction ?? 'asc'}
            onValueChange={(direction) =>
              setSorting({
                by: config.sorting?.by ?? 'axis',
                direction: direction as 'asc' | 'desc',
                valueField: config.sorting?.valueField,
              })
            }
          >
            <SelectTrigger className="w-24">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="asc">{t('common.reportBuilder.asc')}</SelectItem>
              <SelectItem value="desc">{t('common.reportBuilder.desc')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      )}

      {!isBasicMode && config.values.length > 0 && (
        <div className="space-y-2">
          <Label>{t('common.reportBuilder.valuesAggregation')}</Label>
          <div className="space-y-1">
            {config.values.map((v, i) => (
              <div key={`${v.field}-${i}`} className="space-y-2 rounded bg-muted/50 px-2 py-2 text-sm">
                <div className="flex items-center gap-1">
                <GripVertical className="size-3.5 text-muted-foreground" />
                <span className="flex-1 truncate">{v.field}</span>
                <Select value={v.aggregation} onValueChange={(agg) => setAggregation(i, agg as Aggregation)}>
                  <SelectTrigger className="h-7 w-20 border-0 bg-transparent px-1 shadow-none">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {AGGREGATIONS.map((a) => (
                      <SelectItem key={a.value} value={a.value}>
                        {aggregationLabel(a.value)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button type="button" variant="ghost" size="icon-sm" onClick={() => removeFromSlot('values', i)} aria-label={t('common.reportBuilder.dismiss')}>
                  <X className="size-3" />
                </Button>
                </div>
                <Input
                  value={v.label ?? ''}
                  placeholder={getFieldLabel(v.field)}
                  onChange={(e) => setValueLabel(i, e.target.value)}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {!isBasicMode && (config.axis?.field || config.legend?.field) && (
        <div className="space-y-3 rounded-lg border border-dashed p-3">
          <div>
            <Label>{t('common.reportBuilder.customLabelsTitle')}</Label>
            <p className="text-muted-foreground mt-1 text-xs">{t('common.reportBuilder.customLabelsDescription')}</p>
          </div>
          {config.axis?.field ? (
            <div className="space-y-2">
              <Label>{t('common.reportBuilder.customAxisLabel')}</Label>
              <Input
                value={config.axis.label ?? ''}
                placeholder={getFieldLabel(config.axis.field)}
                onChange={(e) => setAxisLabel(e.target.value)}
              />
            </div>
          ) : null}
          {config.legend?.field ? (
            <div className="space-y-2">
              <Label>{t('common.reportBuilder.customLegendLabel')}</Label>
              <Input
                value={config.legend.label ?? ''}
                placeholder={getFieldLabel(config.legend.field)}
                onChange={(e) => setLegendLabel(e.target.value)}
              />
            </div>
          ) : null}
        </div>
      )}

      {!isBasicMode && activeWidget && config.chartType === 'table' && orderedTableColumns.length > 0 && (
        <div className="space-y-3 rounded-lg border border-dashed p-3">
          <div>
            <Label>{t('common.reportBuilder.tableColumnsTitle')}</Label>
            <p className="text-muted-foreground mt-1 text-xs">{t('common.reportBuilder.tableColumnsDescription')}</p>
          </div>
          <DndContext sensors={columnSensors} collisionDetection={closestCenter} onDragEnd={handleTableColumnDragEnd}>
            <SortableContext items={orderedTableColumns.map((column) => column.key)} strategy={verticalListSortingStrategy}>
              <div className="space-y-2">
                {orderedTableColumns.map((column) => {
                  const isHidden = hiddenColumns.includes(column.key);
                  const setting = getTableColumnSetting(column.key);
                  return (
                    <SortableColumnRow key={column.key} id={column.key}>
                      <div className="space-y-2 rounded bg-muted/50 px-2 py-2 text-sm">
                        <div className="flex items-center gap-2">
                          <div className={cn('min-w-0 flex-1 truncate', isHidden && 'text-muted-foreground line-through')}>{column.label}</div>
                          <Button type="button" variant={isHidden ? 'outline' : 'secondary'} size="sm" onClick={() => toggleTableColumnVisibility(column.key)}>
                            {isHidden ? t('common.reportBuilder.showColumn') : t('common.reportBuilder.hideColumn')}
                          </Button>
                        </div>
                        <div className="grid gap-2 sm:grid-cols-2">
                          <Select value={setting?.align ?? 'left'} onValueChange={(value) => updateTableColumnSetting(column.key, { align: value as WidgetTableColumnAlign })}>
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder={t('common.reportBuilder.columnAlign')} />
                            </SelectTrigger>
                            <SelectContent>
                              {TABLE_COLUMN_ALIGNS.map((align) => (
                                <SelectItem key={align} value={align}>
                                  {t(`common.reportBuilder.columnAligns.${align}`)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Select value={setting?.width ?? 'auto'} onValueChange={(value) => updateTableColumnSetting(column.key, { width: value as WidgetTableColumnWidth })}>
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder={t('common.reportBuilder.columnWidth')} />
                            </SelectTrigger>
                            <SelectContent>
                              {TABLE_COLUMN_WIDTHS.map((width) => (
                                <SelectItem key={width} value={width}>
                                  {t(`common.reportBuilder.columnWidths.${width}`)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Select value={setting?.valueFormat ?? 'default'} onValueChange={(value) => updateTableColumnSetting(column.key, { valueFormat: value as WidgetValueFormat })}>
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder={t('common.reportBuilder.columnValueFormat')} />
                            </SelectTrigger>
                            <SelectContent>
                              {VALUE_FORMATS.map((format) => (
                                <SelectItem key={format} value={format}>
                                  {t(`common.reportBuilder.widgetValueFormats.${format}`)}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Input
                            type="number"
                            min={0}
                            max={4}
                            value={String(setting?.decimalPlaces ?? 0)}
                            onChange={(e) => updateTableColumnSetting(column.key, { decimalPlaces: Math.max(0, Math.min(4, Number(e.target.value || 0))) })}
                            placeholder={t('common.reportBuilder.columnDecimalPlaces')}
                          />
                        </div>
                      </div>
                    </SortableColumnRow>
                  );
                })}
              </div>
            </SortableContext>
          </DndContext>
        </div>
      )}

      {activeWidget && (config.chartType === 'line' || config.chartType === 'bar' || config.chartType === 'stackedBar') ? (
        <div className={cn('space-y-3 rounded-lg border border-dashed p-3', isBasicMode && 'bg-muted/20')}>
          <div>
            <Label>{t('common.reportBuilder.seriesVisibilityTitle')}</Label>
            <p className="text-muted-foreground mt-1 text-xs">{t('common.reportBuilder.seriesVisibilityDescription')}</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>{t('common.reportBuilder.seriesVisibilityMode')}</Label>
              <Select
                value={activeAppearance.seriesVisibilityMode ?? 'auto'}
                onValueChange={(value) => setWidgetAppearance(activeWidget.id, { seriesVisibilityMode: value as WidgetSeriesVisibilityMode })}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SERIES_VISIBILITY_MODES.map((modeOption) => (
                    <SelectItem key={modeOption} value={modeOption}>
                      {t(`common.reportBuilder.seriesVisibilityModes.${modeOption}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t('common.reportBuilder.seriesOverflowMode')}</Label>
                <Select
                  value={activeAppearance.seriesOverflowMode ?? 'others'}
                  onValueChange={(value) => setWidgetAppearance(activeWidget.id, { seriesOverflowMode: value as WidgetSeriesOverflowMode })}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SERIES_OVERFLOW_MODES.map((modeOption) => (
                      <SelectItem key={modeOption} value={modeOption}>
                        {t(`common.reportBuilder.seriesOverflowModes.${modeOption}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            {(activeAppearance.seriesVisibilityMode ?? 'auto') !== 'all' ? (
              <div className="space-y-2">
                <Label>{t('common.reportBuilder.seriesLimit')}</Label>
                <Select
                  value={String(activeAppearance.maxVisibleSeries ?? 8)}
                  onValueChange={(value) => setWidgetAppearance(activeWidget.id, { maxVisibleSeries: Number(value) })}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SERIES_LIMIT_OPTIONS.map((option) => (
                      <SelectItem key={option} value={String(option)}>
                        {t('common.reportBuilder.seriesLimitOption', { count: option })}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div className="space-y-2">
                <Label>{t('common.reportBuilder.seriesLimit')}</Label>
                <div className="text-muted-foreground rounded-md border border-dashed px-3 py-2 text-xs">
                  {t('common.reportBuilder.seriesLimitDisabled')}
                </div>
              </div>
            )}
          </div>
        </div>
      ) : null}

      {!isBasicMode && config.filters.length > 0 && (
        <div className="space-y-2">
          <Label>{t('common.reportBuilder.filtersOperator')}</Label>
          <div className="space-y-1">
            {config.filters.map((f, i) => {
              const fieldSchema = schema.find((s) => s.name === f.field);
              const operators = fieldSchema ? getOperatorsForField(fieldSchema) : ['eq', 'ne'];
              const inputType = getInputType(fieldSchema);
              const semanticType = fieldSchema ? getFieldSemanticType(fieldSchema) : 'text';
              const isUnary = f.operator === 'isNull' || f.operator === 'isNotNull';
              const isBetween = f.operator === 'between';
              const isList = f.operator === 'in';
              return (
                <div key={`${f.field}-${i}`} className="space-y-2 rounded bg-muted/50 px-2 py-2 text-sm">
                  <div className="flex items-center gap-1">
                    <GripVertical className="size-3.5 text-muted-foreground" />
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium">{f.field}</div>
                      <div className="text-muted-foreground text-[11px] uppercase tracking-wide">{semanticType}</div>
                    </div>
                    <Select
                      value={f.operator}
                      onValueChange={(op) => updateFilter(i, { operator: op, value: undefined, values: undefined, from: undefined, to: undefined })}
                    >
                      <SelectTrigger className="h-7 w-28 border-0 bg-transparent px-1 shadow-none">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {operators.map((op) => (
                          <SelectItem key={op} value={op}>
                            {operatorLabel(op)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button type="button" variant="ghost" size="icon-sm" onClick={() => removeFilter(i)} aria-label={t('common.advancedFilter.remove')}>
                      <X className="size-3" />
                    </Button>
                  </div>

                  {!isUnary && (
                    <div className="space-y-2">
                      {isBetween && (
                        <div className="grid grid-cols-2 gap-2">
                          <Input
                            type={inputType}
                            placeholder={t('common.reportBuilder.from')}
                            value={String(f.from ?? '')}
                            onChange={(e) => updateFilter(i, { from: e.target.value })}
                            className="h-8"
                          />
                          <Input
                            type={inputType}
                            placeholder={t('common.reportBuilder.to')}
                            value={String(f.to ?? '')}
                            onChange={(e) => updateFilter(i, { to: e.target.value })}
                            className="h-8"
                          />
                        </div>
                      )}

                      {isList && (
                        <Input
                          placeholder={t('common.reportBuilder.valuesListCompactPlaceholder')}
                          value={Array.isArray(f.values) ? f.values.map((item) => String(item ?? '')).join(', ') : ''}
                          onChange={(e) =>
                            updateFilter(i, {
                              values: e.target.value
                                .split(',')
                                .map((item) => item.trim())
                                .filter(Boolean),
                            })
                          }
                          className="h-8"
                        />
                      )}

                      {!isBetween && !isList && (
                        <Input
                          type={inputType}
                          placeholder={t('common.reportBuilder.value')}
                          value={String(f.value ?? '')}
                          onChange={(e) => updateFilter(i, { value: e.target.value })}
                          className="h-8"
                        />
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {!isBasicMode && <div className="space-y-3 rounded-lg border border-dashed p-3">
        <div>
          <Label>{t('common.reportBuilder.governance')}</Label>
          <p className="text-muted-foreground mt-1 text-xs">{t('common.reportBuilder.governanceDescription')}</p>
        </div>
        <Input
          placeholder={t('common.reportBuilder.category')}
          value={governance.category ?? ''}
          onChange={(e) => setGovernanceMetadata({ category: e.target.value })}
        />
        <Input
          placeholder={t('common.reportBuilder.owner')}
          value={governance.owner ?? ''}
          onChange={(e) => setGovernanceMetadata({ owner: e.target.value })}
        />
        <Input
          placeholder={t('common.reportBuilder.tagsPlaceholder')}
          value={(governance.tags ?? []).join(', ')}
          onChange={(e) =>
            setGovernanceMetadata({
              tags: e.target.value
                .split(',')
                .map((item) => item.trim())
                .filter(Boolean),
            })
          }
        />
        <div className="grid grid-cols-2 gap-2">
          <Select value={governance.audience ?? 'private'} onValueChange={(value) => setGovernanceMetadata({ audience: value as 'private' | 'team' | 'organization' })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="private">{t('common.reportBuilder.audiences.private')}</SelectItem>
              <SelectItem value="team">{t('common.reportBuilder.audiences.team')}</SelectItem>
              <SelectItem value="organization">{t('common.reportBuilder.audiences.organization')}</SelectItem>
            </SelectContent>
          </Select>
          <Select value={governance.refreshCadence ?? 'manual'} onValueChange={(value) => setGovernanceMetadata({ refreshCadence: value as 'manual' | 'hourly' | 'daily' | 'weekly' })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="manual">{t('common.reportBuilder.refreshCadences.manual')}</SelectItem>
              <SelectItem value="hourly">{t('common.reportBuilder.refreshCadences.hourly')}</SelectItem>
              <SelectItem value="daily">{t('common.reportBuilder.refreshCadences.daily')}</SelectItem>
              <SelectItem value="weekly">{t('common.reportBuilder.refreshCadences.weekly')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Button
            type="button"
            variant={governance.certified ? 'default' : 'outline'}
            onClick={() =>
              setGovernanceMetadata({
                certified: !governance.certified,
                lastReviewedAt: !governance.certified ? new Date().toISOString() : governance.lastReviewedAt,
              })
            }
          >
            {governance.certified ? t('common.reportBuilder.certified') : t('common.reportBuilder.markCertified')}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => setGovernanceMetadata({ lastReviewedAt: new Date().toISOString() })}
          >
            {t('common.reportBuilder.stampReview')}
          </Button>
        </div>
        <div className="space-y-3 rounded-xl border border-dashed p-3">
          <div className="space-y-1">
            <Label>{t('common.reportBuilder.sharedWith')}</Label>
            <p className="text-muted-foreground text-xs">{t('common.reportBuilder.sharedWithDescription')}</p>
          </div>
          <div className="bg-muted/40 rounded-lg border px-3 py-2 text-xs">
            <div className="font-medium">{t('common.reportBuilder.sharedWithHelpTitle')}</div>
            <div className="text-muted-foreground mt-1">{t('common.reportBuilder.sharedWithHelpDescription')}</div>
          </div>
          <Combobox
            options={userOptions.filter((option) => !assignedUserIds.includes(Number(option.value)))}
            onValueChange={handleAddAssignedUser}
            placeholder={t('common.reportBuilder.sharedWithSelect')}
            searchPlaceholder={t('common.reportBuilder.sharedWithSearch')}
            emptyText={t('common.reportBuilder.sharedWithEmpty')}
          />
          <div className="flex flex-wrap gap-2">
            {selectedAssignedUserOptions.length > 0 ? (
              selectedAssignedUserOptions.map((user) => (
                <Badge key={user.userId} variant="secondary" className="gap-2 pr-1">
                  <span className="max-w-[240px] truncate">{user.label}</span>
                  <button
                    type="button"
                    className="rounded-sm p-0.5 hover:bg-black/10"
                    onClick={() => handleRemoveAssignedUser(user.userId)}
                    aria-label={t('common.reportBuilder.removeAssignedUser')}
                  >
                    <X className="size-3" />
                  </button>
                </Badge>
              ))
            ) : (
              <p className="text-muted-foreground text-xs">{t('common.reportBuilder.sharedWithNone')}</p>
            )}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Button
            type="button"
            variant={governance.subscriptionEnabled ? 'default' : 'outline'}
            onClick={() => setGovernanceMetadata({ subscriptionEnabled: !governance.subscriptionEnabled })}
          >
            {governance.subscriptionEnabled ? t('common.reportBuilder.subscriptionOn') : t('common.reportBuilder.subscriptionOff')}
          </Button>
          <Select
            value={governance.subscriptionFrequency ?? 'weekly'}
            onValueChange={(value) => setGovernanceMetadata({ subscriptionFrequency: value as 'manual' | 'daily' | 'weekly' | 'monthly' })}
            disabled={!governance.subscriptionEnabled}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="manual">{t('common.reportBuilder.subscriptionFrequencies.manual')}</SelectItem>
              <SelectItem value="daily">{t('common.reportBuilder.subscriptionFrequencies.daily')}</SelectItem>
              <SelectItem value="weekly">{t('common.reportBuilder.subscriptionFrequencies.weekly')}</SelectItem>
              <SelectItem value="monthly">{t('common.reportBuilder.subscriptionFrequencies.monthly')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Select
          value={governance.subscriptionChannel ?? 'email'}
          onValueChange={(value) => setGovernanceMetadata({ subscriptionChannel: value as 'email' | 'inbox' | 'webhook' })}
          disabled={!governance.subscriptionEnabled}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="email">{t('common.reportBuilder.subscriptionChannels.email')}</SelectItem>
            <SelectItem value="inbox">{t('common.reportBuilder.subscriptionChannels.inbox')}</SelectItem>
            <SelectItem value="webhook">{t('common.reportBuilder.subscriptionChannels.webhook')}</SelectItem>
          </SelectContent>
        </Select>
        <Button type="button" variant={governance.favorite ? 'default' : 'outline'} onClick={() => setGovernanceMetadata({ favorite: !governance.favorite })}>
          {governance.favorite ? t('common.reportBuilder.favorite') : t('common.reportBuilder.markFavorite')}
        </Button>
      </div>}

      <div className="space-y-3 rounded-lg border border-dashed p-3">
        <div>
          <Label>{t('common.reportBuilder.releaseManagement')}</Label>
          <p className="text-muted-foreground mt-1 text-xs">{t('common.reportBuilder.releaseManagementDescription')}</p>
        </div>
        <Input
          placeholder={t('common.reportBuilder.releaseNote')}
          value={lifecycle.releaseNote ?? ''}
          onChange={(e) => setLifecycleReleaseNote(e.target.value)}
        />
        {(config.history?.length ?? 0) > 0 && (
          <div className="space-y-2">
            {config.history?.slice().reverse().map((entry) => (
              <div key={entry.version} className="flex items-center justify-between gap-2 rounded-md bg-muted/50 p-2 text-sm">
                <div>
                  <div className="font-medium">v{entry.version}</div>
                  <div className="text-muted-foreground text-xs">{entry.releaseNote || t('common.reportBuilder.noReleaseNote')}</div>
                </div>
                <Button type="button" variant="ghost" size="sm" onClick={() => rollbackToHistory(entry.version)}>
                  {t('common.reportBuilder.rollback')}
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-3 rounded-lg border border-dashed p-3">
        <div>
          <div className="flex items-center gap-2">
            <Calculator className="size-4 text-primary" />
            <Label>{t('common.reportBuilder.calculatedFields')}</Label>
          </div>
          <p className="text-muted-foreground mt-1 text-xs">{t('common.reportBuilder.calculatedFieldsDescription')}</p>
        </div>
        <div className="grid gap-2">
          <Input placeholder={t('common.reportBuilder.fieldNamePlaceholder')} value={calcName} onChange={(e) => setCalcName(e.target.value)} />
          <Input placeholder={t('common.reportBuilder.displayLabel')} value={calcLabel} onChange={(e) => setCalcLabel(e.target.value)} />
          <div className="grid grid-cols-2 gap-2">
            <Select value={calcLeftField} onValueChange={setCalcLeftField}>
              <SelectTrigger>
                <SelectValue placeholder={t('common.reportBuilder.leftField')} />
              </SelectTrigger>
              <SelectContent>
                {numericFields.map((field) => (
                  <SelectItem key={field.name} value={field.name}>
                    {field.displayName || field.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={calcRightField} onValueChange={setCalcRightField}>
              <SelectTrigger>
                <SelectValue placeholder={t('common.reportBuilder.rightField')} />
              </SelectTrigger>
              <SelectContent>
                {numericFields.map((field) => (
                  <SelectItem key={field.name} value={field.name}>
                    {field.displayName || field.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Select value={calcOperation} onValueChange={(value) => setCalcOperation(value as CalculatedFieldOperation)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CALCULATED_FIELD_OPERATIONS.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {t(`common.reportBuilder.calculatedOperations.${item.value}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button type="button" variant="outline" onClick={handleAddCalculatedField}>
            {t('common.reportBuilder.addCalculatedField')}
          </Button>
        </div>

        {(config.calculatedFields?.length ?? 0) > 0 && (
          <div className="space-y-2">
            {config.calculatedFields?.map((field) => (
              <div key={field.name} className="rounded-md bg-muted/50 p-2 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <div className="font-medium">{field.label || field.name}</div>
                    <div className="text-muted-foreground text-xs">
                      {field.leftField} {field.operation} {field.rightField}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button type="button" variant="ghost" size="sm" onClick={() => addToSlot('values', field.name, { aggregation: 'sum' })}>
                      {t('common.reportBuilder.use')}
                    </Button>
                    <Button type="button" variant="ghost" size="icon-sm" onClick={() => removeCalculatedField(field.name)}>
                      <X className="size-3" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

import { lazy, Suspense, type ReactElement } from 'react';
import { useEffect, useRef, useCallback, useState, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  pointerWithin,
  type DragEndEvent,
} from '@dnd-kit/core';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Combobox, type ComboboxOption } from '@/components/ui/combobox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { TopBarSelector } from '../components/TopBarSelector';
import { FieldsPanel } from '../components/FieldsPanel';
import { SlotsPanel } from '../components/SlotsPanel';
import { PropertiesPanel } from '../components/PropertiesPanel';
import { DashboardLayoutPreview } from '../components/DashboardLayoutPreview';
import { Toast } from '../components/Toast';
import { useReportBuilderStore } from '../store';
import {
  isAxisCompatible,
  isValuesCompatible,
  isLegendCompatible,
  getFieldSemanticType,
  getOperatorsForField,
  validateKpiConfig,
  validateMatrixConfig,
  validatePieConfig,
} from '../utils';
import type { Field } from '../types';
import { Loader2 } from 'lucide-react';
import { ArrowLeft, ArrowRight, BarChart3, CheckCircle2, ChevronDown, Filter, LayoutGrid, Lightbulb, Plus, Sparkles, Trash2, TriangleAlert, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useUserList } from '@/features/user-management/hooks/useUserList';
import { DeferOnView } from '@/components/shared/DeferOnView';
import { Skeleton } from '@/components/ui/skeleton';
import { clearPerfMarks, perfMark, perfMeasureOnNextPaint } from '@/lib/perf-metrics';
import { cn } from '@/lib/utils';

const PreviewPanel = lazy(() =>
  import('../components/PreviewPanel').then((module) => ({ default: module.PreviewPanel }))
);

function getSlotTypeFromId(id: string): 'axis' | 'values' | 'legend' | 'filters' | null {
  if (id === 'slot-axis') return 'axis';
  if (id === 'slot-values') return 'values';
  if (id === 'slot-legend') return 'legend';
  if (id === 'slot-filters') return 'filters';
  return null;
}

function PreviewPanelSkeleton({ className = '' }: { className?: string }): ReactElement {
  return <Skeleton className={`min-h-[320px] w-full rounded-2xl ${className}`.trim()} />;
}

interface CollapsibleCardProps {
  icon?: ReactElement;
  title: string;
  description?: string;
  summary?: string;
  defaultOpen?: boolean;
  tone?: 'default' | 'muted';
  action?: ReactElement;
  children: React.ReactNode;
}

function CollapsibleCard({
  icon,
  title,
  description,
  summary,
  defaultOpen = false,
  tone = 'default',
  action,
  children,
}: CollapsibleCardProps): ReactElement {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div
      className={cn(
        'rounded-2xl border p-4 transition-colors',
        tone === 'muted' ? 'bg-muted/20' : 'bg-card'
      )}
    >
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex w-full items-start justify-between gap-3 text-left"
        aria-expanded={open}
      >
        <div className="flex min-w-0 items-start gap-2">
          {icon ? <span className="mt-0.5 shrink-0 text-primary">{icon}</span> : null}
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold">{title}</h2>
            </div>
            {description ? (
              <p className="text-muted-foreground mt-1 text-xs">{description}</p>
            ) : null}
            {summary && !open ? (
              <p className="mt-1 text-xs font-medium text-foreground/80">{summary}</p>
            ) : null}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {action}
          <ChevronDown
            className={cn(
              'size-4 text-muted-foreground transition-transform',
              open ? 'rotate-180' : ''
            )}
          />
        </div>
      </button>
      {open ? <div className="mt-4">{children}</div> : null}
    </div>
  );
}

function ReportAssignmentPanel({
  title,
  description,
  summary,
  emptyState,
  selectPlaceholder,
  searchPlaceholder,
  emptyText,
  userOptions,
  assignedUserIds,
  selectedAssignedUsers,
  onAddAssignedUser,
  onRequestRemoveAssignedUser,
  removeLabel,
}: {
  title: string;
  description: string;
  summary: string;
  emptyState: string;
  selectPlaceholder: string;
  searchPlaceholder: string;
  emptyText: string;
  userOptions: ComboboxOption[];
  assignedUserIds: number[];
  selectedAssignedUsers: Array<{ userId: number; label: string }>;
  onAddAssignedUser: (userIdRaw: string) => void;
  onRequestRemoveAssignedUser: (userId: number) => void;
  removeLabel: string;
}): ReactElement {
  return (
    <div className="rounded-2xl border bg-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-[260px] flex-1">
          <div className="mb-2 inline-flex rounded-full border bg-muted/30 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            {title}
          </div>
          <p className="text-muted-foreground text-sm leading-6">{description}</p>
        </div>
        <Badge variant="secondary" className="rounded-full px-3 py-1">
          {summary}
        </Badge>
      </div>
      <div className="mt-4 grid gap-4 xl:grid-cols-[360px_1fr]">
        <div className="space-y-3">
          <Combobox
            options={userOptions.filter((option) => !assignedUserIds.includes(Number(option.value)))}
            onValueChange={onAddAssignedUser}
            placeholder={selectPlaceholder}
            searchPlaceholder={searchPlaceholder}
            emptyText={emptyText}
          />
          <div className="rounded-xl border border-dashed bg-muted/10 px-3 py-3 text-xs text-muted-foreground">
            {description}
          </div>
        </div>
        <div className="rounded-xl border bg-background p-3">
          {selectedAssignedUsers.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {selectedAssignedUsers.map((user) => (
                <div
                  key={user.userId}
                  className="inline-flex max-w-full items-center gap-2 rounded-full border bg-muted/30 px-3 py-1.5 text-sm"
                >
                  <span className="truncate">{user.label}</span>
                  <button
                    type="button"
                    className="text-muted-foreground transition hover:text-foreground"
                    onClick={() => onRequestRemoveAssignedUser(user.userId)}
                    aria-label={removeLabel}
                    title={removeLabel}
                  >
                    <X className="size-3.5" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">{emptyState}</div>
          )}
        </div>
      </div>
    </div>
  );
}

function buildWidgetLabelOverrides(widget?: {
  axis?: { field: string; label?: string };
  legend?: { field: string; label?: string };
  values?: Array<{ field: string; label?: string }>;
}): Record<string, string> {
  const overrides: Record<string, string> = {};
  if (widget?.axis?.field && widget.axis.label?.trim()) overrides[widget.axis.field] = widget.axis.label.trim();
  if (widget?.legend?.field && widget.legend.label?.trim()) overrides[widget.legend.field] = widget.legend.label.trim();
  widget?.values?.forEach((value) => {
    if (value.field && value.label?.trim()) overrides[value.field] = value.label.trim();
  });
  return overrides;
}

function getRecommendedChartType(args: {
  hasAxis: boolean;
  axisField?: Field;
  hasLegend: boolean;
  chartType: string;
  previewSeriesCount: number;
  previewRowCount: number;
}): 'table' | 'bar' | 'line' | 'kpi' {
  const { hasAxis, axisField, hasLegend, previewSeriesCount, previewRowCount } = args;
  const axisSemanticType = axisField ? getFieldSemanticType(axisField) : null;

  if (!hasAxis) return 'kpi';
  if (previewSeriesCount > 8) return 'table';
  if (axisSemanticType === 'date') return 'line';
  if (hasLegend && previewRowCount > 30) return 'table';
  return 'bar';
}

function getRecommendedGuidedTask(args: {
  goal: 'executive' | 'operations' | 'performance';
  hasDateAxis: boolean;
  hasMetric: boolean;
  hasBreakdownCandidate: boolean;
  previewRowCount: number;
}): GuidedWidgetTask {
  const { goal, hasDateAxis, hasMetric, hasBreakdownCandidate, previewRowCount } = args;

  if (goal === 'performance') {
    if (hasDateAxis && hasMetric) return 'trend';
    if (hasMetric) return 'summaryKpi';
    return 'compare';
  }

  if (goal === 'executive') {
    if (hasMetric && previewRowCount <= 1) return 'summaryKpi';
    if (hasBreakdownCandidate && hasMetric) return 'compare';
    if (hasDateAxis && hasMetric) return 'trend';
    return 'detailTable';
  }

  return 'detailTable';
}

type ChartRepairPlan =
  | { kind: 'switch-table'; title: string; description: string; buttonLabel: string }
  | { kind: 'switch-bar'; title: string; description: string; buttonLabel: string }
  | { kind: 'switch-line'; title: string; description: string; buttonLabel: string }
  | { kind: 'fix-pie'; title: string; description: string; buttonLabel: string }
  | { kind: 'fix-kpi'; title: string; description: string; buttonLabel: string }
  | { kind: 'fix-matrix'; title: string; description: string; buttonLabel: string };

type GuidedWidgetTask = 'detailTable' | 'trend' | 'compare' | 'summaryKpi';

const FILTER_OPERATOR_LABELS: Record<string, string> = {
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

function getFilterInputType(field?: Field): 'text' | 'number' | 'date' {
  if (!field) return 'text';
  const semanticType = getFieldSemanticType(field);
  if (semanticType === 'number') return 'number';
  if (semanticType === 'date') return 'date';
  return 'text';
}

export function ReportBuilderPage(): ReactElement {
  const { t } = useTranslation('common');
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEdit = id != null && id !== 'new';
  const reportId = isEdit ? parseInt(id!, 10) : null;

  const {
    connections,
    dataSources,
    dataSourceParameters,
    meta,
    schema,
    dataSourceChecked,
    fieldsSearch,
    config,
    preview,
    ui,
    loadConnections,
    loadDataSources,
    setConnectionKey,
    setType,
    setDataSourceName,
    setDatasetParameterBinding,
    checkDataSource,
    setMeta,
    setFieldsSearch,
    addToSlot,
    addWidget,
    setActiveWidget,
    renameWidget,
    removeWidget,
    removeFromSlot,
    setWidgetSize,
    setWidgetHeight,
    reorderWidgets,
    setChartType,
    setWidgetAppearance,
    addWidgetWithConfig,
    replaceActiveWidget,
    setLifecycleStatus,
    setUi,
    setConfig,
    saveNewReport,
    updateReport,
    loadReportById,
  } = useReportBuilderStore();
  const [dataSourceSearch, setDataSourceSearch] = useState('');
  const [builderMode, setBuilderMode] = useState<'basic' | 'advanced'>('basic');
  const [advancedWorkspaceMode, setAdvancedWorkspaceMode] = useState<'guided' | 'expert'>('guided');
  const [guidedGoal, setGuidedGoal] = useState<'executive' | 'operations' | 'performance' | null>(null);
  const [guidedVisualIntent, setGuidedVisualIntent] = useState<GuidedWidgetTask | null>(null);
  const [guidedVisualRecommendation, setGuidedVisualRecommendation] = useState<GuidedWidgetTask | null>(null);
  const [filterDraftField, setFilterDraftField] = useState('');
  const lifecycle = config.lifecycle ?? { status: 'draft' as const, version: 1 };
  const lifecycleStatusLabel = lifecycle.status === 'published'
    ? t('common.reportBuilder.lifecycle.publish')
    : lifecycle.status === 'archived'
      ? t('common.reportBuilder.lifecycle.archive')
      : t('common.reportBuilder.lifecycle.draft');
  const widgetSizeLabel = (size?: 'third' | 'half' | 'full'): string => t(`common.reportBuilder.widgetSizes.${size ?? 'half'}`);
  const widgetHeightLabel = (height?: 'sm' | 'md' | 'lg'): string => t(`common.reportBuilder.widgetHeights.${height ?? 'md'}`);
  const [deleteWidgetId, setDeleteWidgetId] = useState<string | null>(null);
  const [removeAssignedUserId, setRemoveAssignedUserId] = useState<number | null>(null);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState<1 | 2 | 3>(1);
  const [wizardGoal, setWizardGoal] = useState<'executive' | 'operations' | 'performance'>('operations');
  const [wizardVisual, setWizardVisual] = useState<'table' | 'chart' | 'trend' | 'kpi'>('table');
  const [wizardBreakdown, setWizardBreakdown] = useState<'recommended' | 'none'>('recommended');
  const previewCycleRef = useRef(0);
  const previewLoadingRef = useRef(false);

  useEffect(() => {
    const startMark = 'report-builder:mount:start';
    clearPerfMarks(startMark, 'report-builder:mount_to_paint', 'report-builder:mount_to_paint:end');
    perfMark(startMark);
    perfMeasureOnNextPaint('report-builder:mount_to_paint', startMark);
  }, []);
  const { data: usersResponse } = useUserList({
    pageNumber: 1,
    pageSize: 100,
    sortBy: 'firstName',
    sortDirection: 'asc',
    filters: [{ column: 'isActive', operator: 'eq', value: 'true' }],
  });
  const userOptions = useMemo<ComboboxOption[]>(
    () =>
      (usersResponse?.data ?? [])
        .filter((user) => user.isActive === true && Boolean(user.email))
        .map((user) => ({
          value: String(user.id),
          label: `${user.fullName || user.username} (${user.email})`,
        })),
    [usersResponse?.data],
  );
  const assignedUserIds = useMemo<number[]>(() => meta.assignedUserIds ?? [], [meta.assignedUserIds]);
  const selectedAssignedUsers = useMemo(
    () =>
      assignedUserIds.map((userId) => {
        const match = userOptions.find((option) => option.value === String(userId));
        return { userId, label: match?.label ?? String(userId) };
      }),
    [assignedUserIds, userOptions],
  );
  const allSelectableFields = useMemo(
    () => [
      ...schema.map((field) => ({
        name: field.name,
        label: field.displayName || field.name,
      })),
      ...(config.calculatedFields ?? []).map((field) => ({
        name: field.name,
        label: field.label || field.name,
      })),
    ],
    [config.calculatedFields, schema],
  );
  const fieldsCount = schema.length + (config.calculatedFields?.length ?? 0);
  const widgetsCount = config.widgets?.length ?? 0;
  const datasetReady = Boolean(dataSourceChecked && meta.dataSourceName);
  const requiresAxis = config.chartType !== 'kpi' && config.chartType !== 'table';
  const hasAxis = Boolean(config.axis?.field);
  const hasValue = config.values.length > 0;
  const hasLegend = Boolean(config.legend?.field);
  const firstAxisField = schema.find((field) => {
    const type = getFieldSemanticType(field);
    return type === 'text' || type === 'date';
  });
  const firstValueField = schema.find((field) => getFieldSemanticType(field) === 'number');
  const firstLegendField = schema.find((field) => getFieldSemanticType(field) === 'text' && field.name !== firstAxisField?.name);
  const activeWidget = (config.widgets ?? []).find((widget) => widget.id === config.activeWidgetId);
  const fieldLabelMap = useMemo(
    () => new Map([
      ...schema.map((field) => [field.name, field.displayName || field.name] as const),
      ...(config.calculatedFields ?? []).map((field) => [field.name, field.label || field.name] as const),
    ]),
    [config.calculatedFields, schema],
  );
  const getFieldLabel = useCallback((fieldName?: string) => {
    if (!fieldName) return t('common.reportBuilder.basicNoneSelected');
    return fieldLabelMap.get(fieldName) ?? fieldName;
  }, [fieldLabelMap, t]);
  const selectedAxisSchemaField = useMemo(
    () => schema.find((field) => field.name === config.axis?.field),
    [config.axis?.field, schema],
  );
  const previewSeriesCount = useMemo(() => {
    if (!config.legend?.field || preview.columns.length < 2 || preview.rows.length === 0) return 0;
    const legendColumnIndex = preview.columns.findIndex((column) => column === (config.legend?.label?.trim() || config.legend?.field));
    const fallbackLegendIndex = legendColumnIndex >= 0 ? legendColumnIndex : 1;
    return new Set(preview.rows.map((row) => String((row as unknown[])[fallbackLegendIndex] ?? ''))).size;
  }, [config.legend?.field, config.legend?.label, preview.columns, preview.rows]);
  const previewSampleMap = useMemo(() => {
    const map: Record<string, string[]> = {};
    preview.columns.forEach((column, columnIndex) => {
      const values = Array.from(
        new Set(
          preview.rows
            .map((row) => row[columnIndex])
            .filter((value) => value != null && String(value).trim().length > 0)
            .map((value) => String(value)),
        ),
      ).slice(0, 3);
      map[column] = values;
    });
    return map;
  }, [preview.columns, preview.rows]);
  const recommendedAxisField = useMemo(
    () => schema.find((field) => /date|tarih|created|offer|order|demand/i.test(`${field.name} ${field.displayName ?? ''}`)) ?? firstAxisField,
    [firstAxisField, schema],
  );
  const recommendedValueField = useMemo(
    () => schema.find((field) => /amount|total|count|price|tutar|toplam|adet|quantity/i.test(`${field.name} ${field.displayName ?? ''}`)) ?? firstValueField,
    [firstValueField, schema],
  );
  const recommendedLegendField = useMemo(
    () => schema.find((field) => /user|sales|rep|customer|plasiyer|musteri|cari/i.test(`${field.name} ${field.displayName ?? ''}`)) ?? firstLegendField,
    [firstLegendField, schema],
  );
  const dimensionFieldOptions = useMemo<ComboboxOption[]>(
    () =>
      schema
        .filter((field) => {
          const semanticType = getFieldSemanticType(field);
          return semanticType === 'text' || semanticType === 'date';
        })
        .map((field) => ({
          value: field.name,
          label: field.displayName || field.name,
        })),
    [schema],
  );
  const metricFieldOptions = useMemo<ComboboxOption[]>(
    () =>
      [...schema, ...(config.calculatedFields ?? []).map((field) => ({
        name: field.name,
        displayName: field.label || field.name,
        semanticType: 'number',
        defaultAggregation: 'sum' as const,
        sqlType: 'decimal',
        dotNetType: 'decimal',
        isNullable: true,
      }))]
        .filter((field) => getFieldSemanticType(field) === 'number')
        .map((field) => ({
          value: field.name,
          label: field.displayName || field.name,
        })),
    [config.calculatedFields, schema],
  );
  const breakdownFieldOptions = useMemo<ComboboxOption[]>(
    () => [
      { value: '__none__', label: t('common.reportBuilder.widgetAssistantNoBreakdown') },
      ...dimensionFieldOptions,
    ],
    [dimensionFieldOptions, t],
  );
  const filterFieldOptions = useMemo<ComboboxOption[]>(
    () =>
      [...schema, ...(config.calculatedFields ?? []).map((field) => ({
        name: field.name,
        displayName: field.label || field.name,
        semanticType: 'number',
        defaultAggregation: 'sum' as const,
        sqlType: 'decimal',
        dotNetType: 'decimal',
        isNullable: true,
      }))]
        .map((field) => ({
          value: field.name,
          label: field.displayName || field.name,
        })),
    [config.calculatedFields, schema],
  );
  const filterFieldMap = useMemo(
    () => new Map(
      [...schema, ...(config.calculatedFields ?? []).map((field) => ({
        name: field.name,
        displayName: field.label || field.name,
        semanticType: 'number',
        defaultAggregation: 'sum' as const,
        sqlType: 'decimal',
        dotNetType: 'decimal',
        isNullable: true,
      }))].map((field) => [field.name, field] as const),
    ),
    [config.calculatedFields, schema],
  );
  const activeWidgetLooksConfigured = Boolean(
    activeWidget?.axis?.field
    || activeWidget?.legend?.field
    || (activeWidget?.values?.length ?? 0) > 0,
  );
  const guidedFlowReadyForFields = Boolean(guidedGoal && guidedVisualIntent);
  const recommendedGuidedTask = useMemo<GuidedWidgetTask | null>(
    () =>
      guidedGoal
        ? getRecommendedGuidedTask({
            goal: guidedGoal,
            hasDateAxis: Boolean(recommendedAxisField && getFieldSemanticType(recommendedAxisField) === 'date'),
            hasMetric: Boolean(recommendedValueField),
            hasBreakdownCandidate: Boolean(recommendedLegendField ?? recommendedAxisField),
            previewRowCount: preview.rows.length,
          })
        : null,
    [guidedGoal, preview.rows.length, recommendedAxisField, recommendedLegendField, recommendedValueField],
  );
  const recommendedChartType = useMemo(
    () =>
      getRecommendedChartType({
        hasAxis,
        axisField: selectedAxisSchemaField,
        hasLegend,
        chartType: config.chartType,
        previewSeriesCount,
        previewRowCount: preview.rows.length,
      }),
    [config.chartType, hasAxis, hasLegend, preview.rows.length, previewSeriesCount, selectedAxisSchemaField],
  );
  const recommendedChartLabel = t(`common.reportBuilder.chartTypes.${recommendedChartType}`);
  const chartNeedsSimplification = (config.chartType === 'line' || config.chartType === 'bar' || config.chartType === 'stackedBar') && previewSeriesCount > 8;
  const pieError = config.chartType === 'pie' || config.chartType === 'donut' ? validatePieConfig(config) : null;
  const kpiError = config.chartType === 'kpi' ? validateKpiConfig(config) : null;
  const matrixError = config.chartType === 'matrix' ? validateMatrixConfig(config) : null;
  const chartRepairPlan = useMemo<ChartRepairPlan | null>(() => {
    if (config.chartType === 'line' && selectedAxisSchemaField && getFieldSemanticType(selectedAxisSchemaField) !== 'date') {
      return {
        kind: 'switch-bar',
        title: t('common.reportBuilder.repairTitles.nonDateLine'),
        description: t('common.reportBuilder.repairDescriptions.nonDateLine'),
        buttonLabel: t('common.reportBuilder.repairActions.switchBar'),
      };
    }
    if (config.chartType === 'bar' && selectedAxisSchemaField && getFieldSemanticType(selectedAxisSchemaField) === 'date' && !hasLegend) {
      return {
        kind: 'switch-line',
        title: t('common.reportBuilder.repairTitles.dateBar'),
        description: t('common.reportBuilder.repairDescriptions.dateBar'),
        buttonLabel: t('common.reportBuilder.repairActions.switchLine'),
      };
    }
    if ((config.chartType === 'pie' || config.chartType === 'donut') && pieError) {
      if (config.values.length > 1 || previewSeriesCount > 10) {
        return {
          kind: 'switch-bar',
          title: t('common.reportBuilder.repairTitles.tooComplexPie'),
          description: t('common.reportBuilder.repairDescriptions.tooComplexPie'),
          buttonLabel: t('common.reportBuilder.repairActions.switchBar'),
        };
      }
      return {
        kind: 'fix-pie',
        title: t('common.reportBuilder.repairTitles.incompletePie'),
        description: pieError,
        buttonLabel: t('common.reportBuilder.repairActions.fixPie'),
      };
    }
    if (config.chartType === 'kpi' && kpiError) {
      return {
        kind: 'fix-kpi',
        title: t('common.reportBuilder.repairTitles.incompleteKpi'),
        description: kpiError,
        buttonLabel: t('common.reportBuilder.repairActions.fixKpi'),
      };
    }
    if (config.chartType === 'matrix' && matrixError) {
      return {
        kind: 'fix-matrix',
        title: t('common.reportBuilder.repairTitles.incompleteMatrix'),
        description: matrixError,
        buttonLabel: t('common.reportBuilder.repairActions.fixMatrix'),
      };
    }
    if ((config.chartType === 'line' || config.chartType === 'bar' || config.chartType === 'stackedBar') && previewSeriesCount > 16) {
      return {
        kind: 'switch-table',
        title: t('common.reportBuilder.repairTitles.tooManySeries'),
        description: t('common.reportBuilder.repairDescriptions.tooManySeries', { count: previewSeriesCount }),
        buttonLabel: t('common.reportBuilder.repairActions.switchTable'),
      };
    }
    return null;
  }, [config.chartType, config.values.length, hasLegend, kpiError, matrixError, pieError, previewSeriesCount, selectedAxisSchemaField, t]);
  const reportQualityIssues = useMemo(() => {
    const issues: string[] = [];
    if (!meta.name?.trim()) issues.push(t('common.reportBuilder.qualityIssues.reportName'));
    if (!datasetReady) issues.push(t('common.reportBuilder.qualityIssues.dataset'));
    if (widgetsCount === 0) issues.push(t('common.reportBuilder.qualityIssues.widgets'));
    if (requiresAxis && !hasAxis) issues.push(t('common.reportBuilder.qualityIssues.axis'));
    if (!hasValue) issues.push(t('common.reportBuilder.qualityIssues.value'));
    if (chartRepairPlan) issues.push(t('common.reportBuilder.qualityIssues.visual'));
    return issues;
  }, [chartRepairPlan, datasetReady, hasAxis, hasValue, meta.name, requiresAxis, t, widgetsCount]);
  const reportQualityScore = useMemo(() => {
    const penalty = reportQualityIssues.length * 16;
    return Math.max(0, 100 - penalty);
  }, [reportQualityIssues.length]);
  const reportHardBlockers = useMemo(() => {
    const blockers: string[] = [];
    if (!meta.name?.trim()) blockers.push(t('common.reportBuilder.hardBlockers.reportName'));
    if (!datasetReady) blockers.push(t('common.reportBuilder.hardBlockers.dataset'));
    if (widgetsCount === 0) blockers.push(t('common.reportBuilder.hardBlockers.widgets'));
    if (requiresAxis && !hasAxis) blockers.push(t('common.reportBuilder.hardBlockers.axis'));
    if (!hasValue) blockers.push(t('common.reportBuilder.hardBlockers.value'));
    if ((config.chartType === 'pie' || config.chartType === 'donut') && !!pieError) blockers.push(t('common.reportBuilder.hardBlockers.pie'));
    if (config.chartType === 'kpi' && !!kpiError) blockers.push(t('common.reportBuilder.hardBlockers.kpi'));
    if (config.chartType === 'matrix' && !!matrixError) blockers.push(t('common.reportBuilder.hardBlockers.matrix'));
    if ((config.chartType === 'line' || config.chartType === 'bar' || config.chartType === 'stackedBar') && previewSeriesCount > 24) {
      blockers.push(t('common.reportBuilder.hardBlockers.tooManySeries', { count: previewSeriesCount }));
    }
    return blockers;
  }, [config.chartType, datasetReady, hasAxis, hasValue, kpiError, matrixError, meta.name, pieError, previewSeriesCount, requiresAxis, t, widgetsCount]);
  const saveBlocked = reportHardBlockers.length > 0;
  const reportNarrative = useMemo(() => {
    if (!datasetReady) return t('common.reportBuilder.narrativeNoDataset');
    const visual = t(`common.reportBuilder.chartTypes.${config.chartType}`);
    const metric = config.values.length > 0
      ? config.values.map((value) => `${getFieldLabel(value.field)} (${t(`common.reportBuilder.aggregations.${value.aggregation}`)})`).join(', ')
      : t('common.reportBuilder.basicNoneSelected');
    const axis = hasAxis ? getFieldLabel(config.axis?.field) : t('common.reportBuilder.basicKpiNoGrouping');
    const legend = hasLegend ? getFieldLabel(config.legend?.field) : t('common.reportBuilder.basicNoBreakdown');
    return t('common.reportBuilder.narrativeSummary', {
      visual,
      axis,
      metric,
      legend,
    });
  }, [config.axis?.field, config.chartType, config.legend?.field, config.values, datasetReady, getFieldLabel, hasAxis, hasLegend, t]);

  const previewRunnerRef = useRef<{ execute: () => void; cancel: () => void } | null>(null);
  const guidedAutoGoalRef = useRef<'executive' | 'operations' | 'performance' | null>(null);
  const nextStep = !datasetReady
    ? {
        title: t('common.reportBuilder.nextStepDatasetTitle'),
        description: t('common.reportBuilder.nextStepDatasetDescription'),
        actionLabel: t('common.reportBuilder.nextStepDatasetAction'),
        action: () => checkDataSource(),
      }
    : (requiresAxis && !hasAxis) || !hasValue
      ? {
          title: t('common.reportBuilder.nextStepMappingTitle'),
          description: t('common.reportBuilder.nextStepMappingDescription'),
          actionLabel: t('common.reportBuilder.nextStepMappingAction'),
          action: () => handleSmartComplete(),
        }
      : {
          title: t('common.reportBuilder.nextStepDesignTitle'),
          description: t('common.reportBuilder.nextStepDesignDescription'),
          actionLabel: t('common.reportBuilder.nextStepDesignAction'),
          action: () => setUi({ toast: { message: t('common.reportBuilder.designControlsHint'), variant: 'success' } }),
        };
  const wizardCanContinue = wizardStep === 1 ? datasetReady : true;
  const wizardSummary = useMemo(
    () =>
      t('common.reportBuilder.wizardSummary', {
        goal: t(`common.reportBuilder.wizardGoals.${wizardGoal}.title`),
        visual: t(`common.reportBuilder.wizardVisuals.${wizardVisual}.title`),
        breakdown: wizardBreakdown === 'recommended'
          ? t('common.reportBuilder.wizardBreakdowns.recommended')
          : t('common.reportBuilder.wizardBreakdowns.none'),
      }),
    [t, wizardBreakdown, wizardGoal, wizardVisual],
  );
  const simpleTableFields = useMemo(
    () =>
      config.values.map((value, index) => ({
        index,
        field: value.field,
        label: value.label?.trim() || getFieldLabel(value.field),
      })),
    [config.values, getFieldLabel],
  );
  const simpleFieldSearchTerm = fieldsSearch.trim().toLowerCase();
  const simpleAvailableFields = useMemo(
    () =>
      allSelectableFields.filter((field) =>
        !simpleFieldSearchTerm || `${field.label} ${field.name}`.toLowerCase().includes(simpleFieldSearchTerm),
      ),
    [allSelectableFields, simpleFieldSearchTerm],
  );
  const applySimpleTableValues = useCallback(
    (nextValues: typeof config.values) => {
      const currentWidgets = config.widgets ?? [];
      const nextActiveWidgetId = config.activeWidgetId ?? currentWidgets[0]?.id;
      const nextWidgets = currentWidgets.map((widget) =>
        widget.id === nextActiveWidgetId
          ? {
              ...widget,
              chartType: 'table' as const,
              axis: undefined,
              legend: undefined,
              values: nextValues,
            }
          : widget,
      );

      setConfig({
        chartType: 'table',
        axis: undefined,
        legend: undefined,
        values: nextValues,
        widgets: nextWidgets,
        activeWidgetId: nextActiveWidgetId,
      });
      setUi({ slotError: null });
    },
    [config.activeWidgetId, config.widgets, setConfig, setUi],
  );
  const handleSimpleToggleField = useCallback(
    (fieldName: string) => {
      const existing = config.values.find((item) => item.field === fieldName);
      if (existing) {
        applySimpleTableValues(config.values.filter((item) => item.field !== fieldName));
        return;
      }

      const schemaField = schema.find((field) => field.name === fieldName);
      applySimpleTableValues([
        ...config.values,
        {
          field: fieldName,
          aggregation: schemaField?.defaultAggregation ?? 'sum',
        },
      ]);
    },
    [applySimpleTableValues, config.values, schema],
  );
  const handleSimpleMoveField = useCallback(
    (index: number, direction: -1 | 1) => {
      const nextIndex = index + direction;
      if (nextIndex < 0 || nextIndex >= config.values.length) return;
      const nextValues = [...config.values];
      const [moved] = nextValues.splice(index, 1);
      nextValues.splice(nextIndex, 0, moved);
      applySimpleTableValues(nextValues);
    },
    [applySimpleTableValues, config.values],
  );
  const handleSimpleSelectFirstFields = useCallback(() => {
    if (config.values.length > 0) return;
    const nextValues = allSelectableFields.slice(0, 5).map((field) => {
      const schemaField = schema.find((item) => item.name === field.name);
      return {
        field: field.name,
        aggregation: schemaField?.defaultAggregation ?? 'sum',
      };
    });
    applySimpleTableValues(nextValues);
  }, [allSelectableFields, applySimpleTableValues, config.values.length, schema]);

  const applyGuidedTableValues = useCallback(
    (nextValues: typeof config.values) => {
      replaceActiveWidget({
        title: activeWidget?.title || t('common.reportBuilder.widgetTaskCards.detailTable.title'),
        chartType: 'table',
        axis: undefined,
        legend: undefined,
        values: nextValues,
        filters: activeWidget?.filters ?? [],
        appearance: {
          ...activeWidget?.appearance,
          tableDensity: activeWidget?.appearance?.tableDensity ?? 'comfortable',
        },
        size: activeWidget?.size ?? 'full',
        height: activeWidget?.height ?? 'md',
      });
    },
    [activeWidget, replaceActiveWidget, t],
  );

  const guidedTableFields = useMemo(
    () =>
      (activeWidget?.values ?? []).map((value, index) => ({
        index,
        field: value.field,
        label: value.label?.trim() || getFieldLabel(value.field),
      })),
    [activeWidget?.values, getFieldLabel],
  );

  const handleGuidedTableToggleField = useCallback(
    (fieldName: string) => {
      const existingValues = activeWidget?.values ?? [];
      const existing = existingValues.find((item) => item.field === fieldName);
      if (existing) {
        applyGuidedTableValues(existingValues.filter((item) => item.field !== fieldName));
        return;
      }

      const schemaField = schema.find((field) => field.name === fieldName);
      applyGuidedTableValues([
        ...existingValues,
        {
          field: fieldName,
          aggregation: schemaField?.defaultAggregation ?? 'sum',
        },
      ]);
    },
    [activeWidget?.values, applyGuidedTableValues, schema],
  );

  const handleGuidedTableMoveField = useCallback(
    (index: number, direction: -1 | 1) => {
      const existingValues = [...(activeWidget?.values ?? [])];
      const nextIndex = index + direction;
      if (nextIndex < 0 || nextIndex >= existingValues.length) return;
      const [moved] = existingValues.splice(index, 1);
      existingValues.splice(nextIndex, 0, moved);
      applyGuidedTableValues(existingValues);
    },
    [activeWidget?.values, applyGuidedTableValues],
  );

  const handleGuidedTableLabelChange = useCallback(
    (index: number, label: string) => {
      const existingValues = [...(activeWidget?.values ?? [])];
      if (!existingValues[index]) return;
      existingValues[index] = {
        ...existingValues[index],
        label,
      };
      applyGuidedTableValues(existingValues);
    },
    [activeWidget?.values, applyGuidedTableValues],
  );

  const handleGuidedTableAutoSelect = useCallback(() => {
    if ((activeWidget?.values?.length ?? 0) > 0) return;
    const nextValues = allSelectableFields.slice(0, 6).map((field) => {
      const schemaField = schema.find((item) => item.name === field.name);
      return {
        field: field.name,
        aggregation: schemaField?.defaultAggregation ?? 'sum',
      };
    });
    applyGuidedTableValues(nextValues);
  }, [activeWidget?.values?.length, allSelectableFields, applyGuidedTableValues, schema]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor)
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over) return;
      const slotType = getSlotTypeFromId(String(over.id));
      if (!slotType) return;
      const data = active.data.current;
      if (!data || data.type !== 'field') return;
      const field = data.field as Field;

      let invalid = false;
      let message = '';

      if (slotType === 'axis') {
        if (!isAxisCompatible(field)) {
          invalid = true;
          message = t('common.reportBuilder.validation.axisRequiresStringOrDate');
        } else {
          addToSlot('axis', field.name);
        }
      } else if (slotType === 'values') {
        if (!isValuesCompatible(field)) {
          invalid = true;
          message = t('common.reportBuilder.validation.valuesRequireNumeric');
        } else {
          addToSlot('values', field.name);
        }
      } else if (slotType === 'legend') {
        if (!isLegendCompatible(field)) {
          invalid = true;
          message = t('common.reportBuilder.validation.legendRequiresString');
        } else {
          addToSlot('legend', field.name);
        }
      } else if (slotType === 'filters') {
        addToSlot('filters', field.name);
      }

      if (invalid) {
        setUi({ slotError: message });
        setTimeout(() => setUi({ slotError: null }), 3000);
      }
    },
    [addToSlot, setUi, t]
  );

  useEffect(() => {
    loadConnections();
  }, [loadConnections]);

  useEffect(() => {
    if (isEdit && reportId != null) {
      loadReportById(reportId);
    }
  }, [isEdit, reportId, loadReportById]);

  useEffect(() => {
    if (!meta.connectionKey || !meta.dataSourceType) return;
    loadDataSources(dataSourceSearch);
  }, [meta.connectionKey, meta.dataSourceType, dataSourceSearch, loadDataSources]);

  useEffect(() => {
    const runner = useReportBuilderStore.getState().previewDebounced();
    previewRunnerRef.current = runner;
    return () => runner.cancel();
  }, []);

  useEffect(() => {
    if (!dataSourceChecked || !meta.connectionKey || !meta.dataSourceType || !meta.dataSourceName) return;
    if ((config.chartType === 'pie' || config.chartType === 'donut') && pieError) return;
    if (config.chartType === 'kpi' && kpiError) return;
    if (config.chartType === 'matrix' && matrixError) return;
    previewRunnerRef.current?.execute();
  }, [config, dataSourceChecked, kpiError, matrixError, meta.connectionKey, meta.dataSourceName, meta.dataSourceType, pieError]);

  useEffect(() => {
    if (ui.previewLoading && !previewLoadingRef.current) {
      previewLoadingRef.current = true;
      previewCycleRef.current += 1;
      const startMark = `report-builder:preview:${previewCycleRef.current}:start`;
      clearPerfMarks(startMark);
      perfMark(startMark);
      return;
    }

    if (!ui.previewLoading && previewLoadingRef.current) {
      previewLoadingRef.current = false;
      if (ui.error) return;
      const cycle = previewCycleRef.current;
      const startMark = `report-builder:preview:${cycle}:start`;
      perfMeasureOnNextPaint(
        'report-builder:preview_ready_to_paint',
        startMark,
        `cycle=${cycle}; rows=${preview.rows.length}; columns=${preview.columns.length}`
      );
    }
  }, [preview.columns.length, preview.rows.length, ui.error, ui.previewLoading]);

  const handleSave = async (): Promise<void> => {
    if (saveBlocked) {
      setUi({ toast: { message: reportHardBlockers[0], variant: 'error' } });
      return;
    }
    if (isEdit && reportId != null) {
      const report = await updateReport();
      if (report) navigate(`/reports/${report.id}`, { state: { justSaved: true, fromBuilder: true, isEdit: true } });
    } else {
      const report = await saveNewReport();
      if (report) navigate(`/reports/${report.id}`, { state: { justSaved: true, fromBuilder: true, isEdit: false } });
    }
  };

  const handleQuickUseAxis = useCallback(
    (field: Field) => {
      addToSlot('axis', field.name);
      setUi({ slotError: null });
    },
    [addToSlot, setUi]
  );

  const handleQuickUseValue = useCallback(
    (field: Field) => {
      addToSlot('values', field.name);
      setUi({ slotError: null });
    },
    [addToSlot, setUi]
  );

  const handleQuickUseLegend = useCallback(
    (field: Field) => {
      addToSlot('legend', field.name);
      setUi({ slotError: null });
    },
    [addToSlot, setUi]
  );

  const handleQuickUseFilter = useCallback(
    (field: Field) => {
      addToSlot('filters', field.name);
      setUi({ slotError: null });
    },
    [addToSlot, setUi]
  );

  const handleAddDashboardFilter = useCallback(() => {
    if (!filterDraftField) {
      setUi({ toast: { message: t('common.reportBuilder.dashboardFiltersPickField'), variant: 'error' } });
      return;
    }
    const draftField = filterFieldMap.get(filterDraftField);
    const operators = draftField ? getOperatorsForField(draftField) : ['eq'];
    const nextOperator = operators[0] ?? 'eq';
    useReportBuilderStore.getState().addFilter({ field: filterDraftField, operator: nextOperator });
    setFilterDraftField('');
    setUi({ toast: { message: t('common.reportBuilder.dashboardFiltersAdded'), variant: 'success' } });
  }, [filterDraftField, filterFieldMap, setUi, t]);

  const handleQuickSetup = useCallback(
    (mode: 'table' | 'chart' | 'trend' | 'kpi') => {
      if (mode === 'table') {
        setChartType('table');
        if (firstAxisField) addToSlot('axis', firstAxisField.name);
        if (firstValueField) addToSlot('values', firstValueField.name);
        return;
      }
      if (mode === 'chart') {
        setChartType('bar');
        if (firstAxisField) addToSlot('axis', firstAxisField.name);
        if (firstValueField) addToSlot('values', firstValueField.name);
        if (firstLegendField) addToSlot('legend', firstLegendField.name);
        return;
      }
      if (mode === 'trend') {
        setChartType('line');
        if (firstAxisField) addToSlot('axis', firstAxisField.name);
        if (firstValueField) addToSlot('values', firstValueField.name);
        return;
      }
      setChartType('kpi');
      if (firstValueField) addToSlot('values', firstValueField.name);
    },
    [addToSlot, firstAxisField, firstLegendField, firstValueField, setChartType]
  );

  const handleSmartComplete = useCallback(() => {
    if (!hasAxis && firstAxisField) addToSlot('axis', firstAxisField.name);
    if (!hasValue && firstValueField) addToSlot('values', firstValueField.name);
    if (!hasLegend && (config.chartType === 'bar' || config.chartType === 'stackedBar' || config.chartType === 'pie' || config.chartType === 'donut') && firstLegendField) {
      addToSlot('legend', firstLegendField.name);
    }
    setUi({ slotError: null });
  }, [addToSlot, config.chartType, firstAxisField, firstLegendField, firstValueField, hasAxis, hasLegend, hasValue, setUi]);

  const handleAutoRepairVisualization = useCallback(() => {
    if (!chartRepairPlan) return;
    if (chartRepairPlan.kind === 'switch-table') {
      setChartType('table');
      return;
    }
    if (chartRepairPlan.kind === 'switch-line') {
      setChartType('line');
      if (!hasAxis && firstAxisField) addToSlot('axis', firstAxisField.name);
      if (!hasValue && firstValueField) addToSlot('values', firstValueField.name);
      if (hasLegend && config.legend?.field) removeFromSlot('legend', 0);
      return;
    }
    if (chartRepairPlan.kind === 'switch-bar') {
      setChartType('bar');
      if (!hasAxis && firstAxisField) addToSlot('axis', firstAxisField.name);
      if (!hasValue && firstValueField) addToSlot('values', firstValueField.name);
      if (!hasLegend && firstLegendField) addToSlot('legend', firstLegendField.name);
      return;
    }
    if (chartRepairPlan.kind === 'fix-pie') {
      if (!hasAxis && !hasLegend) {
        if (firstAxisField) addToSlot('axis', firstAxisField.name);
        else if (firstLegendField) addToSlot('legend', firstLegendField.name);
      }
      if (!hasValue && firstValueField) addToSlot('values', firstValueField.name);
      for (let index = config.values.length - 1; index > 0; index -= 1) {
        removeFromSlot('values', index);
      }
      return;
    }
    if (chartRepairPlan.kind === 'fix-kpi') {
      if (!hasValue && firstValueField) addToSlot('values', firstValueField.name);
      if (hasAxis && config.axis?.field) removeFromSlot('axis', 0);
      if (hasLegend && config.legend?.field) removeFromSlot('legend', 0);
      for (let index = config.values.length - 1; index > 0; index -= 1) {
        removeFromSlot('values', index);
      }
      return;
    }
    if (!hasAxis && firstAxisField) addToSlot('axis', firstAxisField.name);
    if (!hasLegend && firstLegendField) addToSlot('legend', firstLegendField.name);
    if (!hasValue && firstValueField) addToSlot('values', firstValueField.name);
  }, [addToSlot, chartRepairPlan, config.axis?.field, config.legend?.field, config.values.length, firstAxisField, firstLegendField, firstValueField, hasAxis, hasLegend, hasValue, removeFromSlot, setChartType]);

  const handleStarterKit = useCallback(
    (kit: 'executive' | 'operations' | 'performance') => {
      const activeWidgetId = config.activeWidgetId ?? config.widgets?.[0]?.id;
      if (kit === 'executive') {
        handleQuickSetup('chart');
        if (activeWidgetId) {
          setWidgetAppearance(activeWidgetId, {
            themePreset: 'executive',
            sectionLabel: t('common.reportBuilder.starterKitLabels.executive'),
            sectionDescription: t('common.reportBuilder.starterKitDescriptions.executive'),
            subtitle: t('common.reportBuilder.starterKitSubtitles.executive'),
            backgroundStyle: 'card',
            tone: 'neutral',
            titleAlign: 'left',
            valueFormat: 'number',
            decimalPlaces: 0,
          });
        }
        return;
      }
      if (kit === 'operations') {
        handleQuickSetup('table');
        if (activeWidgetId) {
          setWidgetAppearance(activeWidgetId, {
            themePreset: 'operations',
            sectionLabel: t('common.reportBuilder.starterKitLabels.operations'),
            sectionDescription: t('common.reportBuilder.starterKitDescriptions.operations'),
            subtitle: t('common.reportBuilder.starterKitSubtitles.operations'),
            backgroundStyle: 'muted',
            tone: 'soft',
            titleAlign: 'left',
            valueFormat: 'number',
            decimalPlaces: 0,
          });
        }
        return;
      }
      handleQuickSetup('kpi');
      if (activeWidgetId) {
        setWidgetAppearance(activeWidgetId, {
          themePreset: 'performance',
          sectionLabel: t('common.reportBuilder.starterKitLabels.performance'),
          sectionDescription: t('common.reportBuilder.starterKitDescriptions.performance'),
          subtitle: t('common.reportBuilder.starterKitSubtitles.performance'),
          backgroundStyle: 'gradient',
          tone: 'bold',
          titleAlign: 'center',
          kpiLayout: 'spotlight',
          kpiFormat: 'currency',
          valueFormat: 'currency',
          decimalPlaces: 0,
        });
      }
    },
    [config.activeWidgetId, config.widgets, handleQuickSetup, setWidgetAppearance, t]
  );

  const buildGuidedWidgetConfig = useCallback(
    (task: GuidedWidgetTask, goal: 'executive' | 'operations' | 'performance') => {
      const goalPreset = goal === 'executive'
        ? {
            themePreset: 'executive' as const,
            tone: 'neutral' as const,
            backgroundStyle: 'card' as const,
          }
        : goal === 'performance'
          ? {
              themePreset: 'performance' as const,
              tone: 'bold' as const,
              backgroundStyle: 'gradient' as const,
            }
          : {
              themePreset: 'operations' as const,
              tone: 'soft' as const,
              backgroundStyle: 'muted' as const,
            };
      if (task === 'summaryKpi') {
        return {
          title: t('common.reportBuilder.widgetTaskCards.summaryKpi.title'),
          chartType: 'kpi' as const,
          values: recommendedValueField
            ? [{ field: recommendedValueField.name, aggregation: recommendedValueField.defaultAggregation ?? 'sum' }]
            : [],
          appearance: {
            ...goalPreset,
            titleAlign: 'center' as const,
            kpiLayout: 'spotlight' as const,
            valueFormat: 'currency' as const,
            kpiFormat: 'currency' as const,
            sectionLabel: t('common.reportBuilder.widgetTaskCards.summaryKpi.badge'),
            subtitle: t('common.reportBuilder.widgetTaskCards.summaryKpi.description'),
          },
          size: 'third' as const,
          height: 'sm' as const,
          filters: [],
        };
      }

      if (task === 'trend') {
        return {
          title: t('common.reportBuilder.widgetTaskCards.trend.title'),
          chartType: 'line' as const,
          axis: recommendedAxisField ? { field: recommendedAxisField.name } : undefined,
          values: recommendedValueField
            ? [{ field: recommendedValueField.name, aggregation: recommendedValueField.defaultAggregation ?? 'sum' }]
            : [],
          appearance: {
            ...goalPreset,
            seriesVisibilityMode: 'auto' as const,
            seriesOverflowMode: 'others' as const,
            maxVisibleSeries: 8,
            sectionLabel: t('common.reportBuilder.widgetTaskCards.trend.badge'),
            subtitle: t('common.reportBuilder.widgetTaskCards.trend.description'),
          },
          size: 'full' as const,
          height: 'md' as const,
          filters: [],
        };
      }

      if (task === 'compare') {
        return {
          title: t('common.reportBuilder.widgetTaskCards.compare.title'),
          chartType: 'bar' as const,
          axis: (recommendedLegendField ?? recommendedAxisField) ? { field: (recommendedLegendField ?? recommendedAxisField)!.name } : undefined,
          values: recommendedValueField
            ? [{ field: recommendedValueField.name, aggregation: recommendedValueField.defaultAggregation ?? 'sum' }]
            : [],
          appearance: {
            ...goalPreset,
            seriesVisibilityMode: 'limited' as const,
            seriesOverflowMode: 'others' as const,
            maxVisibleSeries: 6,
            sectionLabel: t('common.reportBuilder.widgetTaskCards.compare.badge'),
            subtitle: t('common.reportBuilder.widgetTaskCards.compare.description'),
          },
          size: 'half' as const,
          height: 'md' as const,
          filters: [],
        };
      }

      const tableFields = allSelectableFields.slice(0, 5).map((field) => {
        const schemaField = schema.find((item) => item.name === field.name);
        return {
          field: field.name,
          aggregation: schemaField?.defaultAggregation ?? 'sum',
        };
      });
      return {
        title: t('common.reportBuilder.widgetTaskCards.detailTable.title'),
        chartType: 'table' as const,
        values: tableFields,
        appearance: {
          ...goalPreset,
          tableDensity: 'comfortable' as const,
          sectionLabel: t('common.reportBuilder.widgetTaskCards.detailTable.badge'),
          subtitle: t('common.reportBuilder.widgetTaskCards.detailTable.description'),
        },
        size: 'full' as const,
        height: 'md' as const,
        filters: [],
      };
    },
    [allSelectableFields, recommendedAxisField, recommendedLegendField, recommendedValueField, schema, t],
  );

  const handleGuidedWidgetTask = useCallback(
    (task: GuidedWidgetTask) => {
      if (!guidedGoal) {
        setUi({ toast: { message: t('common.reportBuilder.guidedGoalRequired'), variant: 'error' } });
        return;
      }
      const nextWidget = buildGuidedWidgetConfig(task, guidedGoal);
      setGuidedVisualIntent(task);
      if (activeWidgetLooksConfigured) {
        addWidgetWithConfig(nextWidget);
        setUi({ toast: { message: t('common.reportBuilder.widgetAssistantAdded'), variant: 'success' } });
        return;
      }
      replaceActiveWidget(nextWidget);
      setUi({ toast: { message: t('common.reportBuilder.widgetAssistantUpdated'), variant: 'success' } });
    },
    [activeWidgetLooksConfigured, addWidgetWithConfig, buildGuidedWidgetConfig, guidedGoal, replaceActiveWidget, setUi, t],
  );

  const handleAssistantAxisChange = useCallback(
    (fieldName: string) => {
      const axis = fieldName ? { field: fieldName } : undefined;
      replaceActiveWidget({
        title: activeWidget?.title || t('common.reportBuilder.widgetTitleFallback', { index: 1 }),
        chartType: activeWidget?.chartType ?? 'table',
        values: activeWidget?.values ?? [],
        axis,
        legend: activeWidget?.legend,
        filters: activeWidget?.filters ?? [],
        appearance: activeWidget?.appearance,
        size: activeWidget?.size,
        height: activeWidget?.height,
      });
    },
    [activeWidget, replaceActiveWidget, t],
  );

  const handleAssistantMetricChange = useCallback(
    (fieldName: string) => {
      const schemaField = schema.find((field) => field.name === fieldName);
      replaceActiveWidget({
        title: activeWidget?.title || t('common.reportBuilder.widgetTitleFallback', { index: 1 }),
        chartType: activeWidget?.chartType ?? 'table',
        axis: activeWidget?.axis,
        legend: activeWidget?.legend,
        values: fieldName ? [{ field: fieldName, aggregation: schemaField?.defaultAggregation ?? 'sum' }] : [],
        filters: activeWidget?.filters ?? [],
        appearance: activeWidget?.appearance,
        size: activeWidget?.size,
        height: activeWidget?.height,
      });
    },
    [activeWidget, replaceActiveWidget, schema, t],
  );

  const handleAssistantLegendChange = useCallback(
    (fieldName: string) => {
      replaceActiveWidget({
        title: activeWidget?.title || t('common.reportBuilder.widgetTitleFallback', { index: 1 }),
        chartType: activeWidget?.chartType ?? 'table',
        axis: activeWidget?.axis,
        legend: fieldName === '__none__' ? undefined : fieldName ? { field: fieldName } : undefined,
        values: activeWidget?.values ?? [],
        filters: activeWidget?.filters ?? [],
        appearance: activeWidget?.appearance,
        size: activeWidget?.size,
        height: activeWidget?.height,
      });
    },
    [activeWidget, replaceActiveWidget, t],
  );

  const handleApplyWizard = useCallback(() => {
    handleStarterKit(wizardGoal);

    if (wizardVisual === 'table') handleQuickSetup('table');
    else if (wizardVisual === 'chart') handleQuickSetup('chart');
    else if (wizardVisual === 'trend') handleQuickSetup('trend');
    else handleQuickSetup('kpi');

    if (wizardBreakdown === 'none' && config.legend?.field) {
      removeFromSlot('legend', 0);
    } else if (
      wizardBreakdown === 'recommended'
      && !config.legend?.field
      && firstLegendField
      && wizardVisual !== 'kpi'
      && wizardVisual !== 'trend'
    ) {
      addToSlot('legend', firstLegendField.name);
    }

    setWizardOpen(false);
    setWizardStep(1);
    setUi({ toast: { message: t('common.reportBuilder.wizardApplied'), variant: 'success' } });
  }, [
    addToSlot,
    config.legend?.field,
    firstLegendField,
    handleQuickSetup,
    handleStarterKit,
    removeFromSlot,
    setUi,
    t,
    wizardBreakdown,
    wizardGoal,
    wizardVisual,
  ]);

  const handleAddAssignedUser = useCallback(
    (userIdRaw: string) => {
      const userId = Number(userIdRaw);
      if (!Number.isFinite(userId) || userId <= 0 || assignedUserIds.includes(userId)) return;
      setMeta({ assignedUserIds: [...assignedUserIds, userId] });
    },
    [assignedUserIds, setMeta],
  );

  const handleRemoveAssignedUser = useCallback(
    (userId: number) => {
      setMeta({ assignedUserIds: assignedUserIds.filter((value) => value !== userId) });
    },
    [assignedUserIds, setMeta],
  );

  useEffect(() => {
    if (!datasetReady || !guidedGoal || !recommendedGuidedTask) return;
    if (guidedAutoGoalRef.current === guidedGoal && guidedVisualIntent) return;
    const nextWidget = buildGuidedWidgetConfig(recommendedGuidedTask, guidedGoal);
    setGuidedVisualIntent(recommendedGuidedTask);
    setGuidedVisualRecommendation(recommendedGuidedTask);
    guidedAutoGoalRef.current = guidedGoal;
    replaceActiveWidget(nextWidget);
  }, [buildGuidedWidgetConfig, datasetReady, guidedGoal, guidedVisualIntent, recommendedGuidedTask, replaceActiveWidget]);

  useEffect(() => {
    if (!datasetReady || builderMode !== 'advanced' || advancedWorkspaceMode !== 'guided' || guidedGoal) return;
    setGuidedGoal('operations');
  }, [advancedWorkspaceMode, builderMode, datasetReady, guidedGoal]);

  const unifiedProgressSteps = useMemo(() => {
    const fieldsReady = builderMode === 'basic'
      ? simpleTableFields.length > 0
      : (hasValue && (!requiresAxis || hasAxis));
    const datasetDescription = datasetReady
      ? (meta.dataSourceName || t('common.reportBuilder.stepProgressDatasetDone'))
      : t('common.reportBuilder.stepProgressDatasetPending');
    const identityDescription = meta.name?.trim()
      ? t('common.reportBuilder.stepProgressIdentityDone')
      : t('common.reportBuilder.stepProgressIdentityPending');
    const fieldsDescription = fieldsReady
      ? t('common.reportBuilder.stepProgressFieldsDone')
      : t('common.reportBuilder.stepProgressFieldsPending');
    const saveDescription = !saveBlocked
      ? t('common.reportBuilder.stepProgressSaveReady')
      : t('common.reportBuilder.stepProgressSaveBlocked', { count: reportHardBlockers.length });
    return [
      {
        key: 'dataset',
        index: 1,
        done: datasetReady,
        title: t('common.reportBuilder.stepProgressDataset'),
        description: datasetDescription,
      },
      {
        key: 'identity',
        index: 2,
        done: Boolean(meta.name?.trim()),
        title: t('common.reportBuilder.stepProgressIdentity'),
        description: identityDescription,
      },
      {
        key: 'fields',
        index: 3,
        done: fieldsReady,
        title: t('common.reportBuilder.stepProgressFields'),
        description: fieldsDescription,
      },
      {
        key: 'save',
        index: 4,
        done: !saveBlocked,
        title: t('common.reportBuilder.stepProgressSave'),
        description: saveDescription,
      },
    ];
  }, [builderMode, datasetReady, hasAxis, hasValue, meta.dataSourceName, meta.name, reportHardBlockers.length, requiresAxis, saveBlocked, simpleTableFields.length, t]);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={pointerWithin}
      onDragEnd={handleDragEnd}
    >
      <div className="flex h-[calc(100vh-4rem)] min-h-0 flex-col gap-4 p-4">
        <header className="shrink-0 rounded-xl border bg-card shadow-xs">
          <div className="flex flex-wrap items-center gap-3 px-4 py-2.5">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => navigate('/reports')}
              className="h-8 px-2 text-xs"
            >
              <ArrowLeft className="mr-1 size-4" />
              {t('common.back')}
            </Button>
            <div className="h-5 w-px bg-border" aria-hidden="true" />
            <div className="min-w-0">
              <h1 className="truncate text-sm font-semibold tracking-tight">
                {builderMode === 'basic'
                  ? (isEdit ? t('common.reportBuilder.simpleEditTitle') : t('common.reportBuilder.simpleCreateTitle'))
                  : (isEdit ? t('common.reportBuilder.editStudioTitle') : t('common.reportBuilder.newStudioTitle'))}
              </h1>
              {builderMode === 'advanced' ? (
                <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <span className="font-mono uppercase">{lifecycleStatusLabel}</span>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono">v{lifecycle.version}</span>
                  {datasetReady ? (
                    <>
                      <span aria-hidden="true">·</span>
                      <span className="truncate" title={meta.dataSourceName}>{meta.dataSourceName}</span>
                    </>
                  ) : null}
                </div>
              ) : null}
            </div>

            <div className="ml-auto flex flex-wrap items-center gap-2">
              <div
                role="tablist"
                aria-label={t('common.reportBuilder.modeTabGroupLabel')}
                className="flex items-center gap-0.5 rounded-md border bg-muted/40 p-0.5"
              >
                <Button
                  type="button"
                  size="sm"
                  variant={builderMode === 'basic' ? 'default' : 'ghost'}
                  onClick={() => setBuilderMode('basic')}
                  className="h-7 px-3 text-xs"
                  role="tab"
                  aria-selected={builderMode === 'basic'}
                >
                  {t('common.reportBuilder.basicMode')}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={builderMode === 'advanced' ? 'default' : 'ghost'}
                  onClick={() => setBuilderMode('advanced')}
                  className="h-7 px-3 text-xs"
                  role="tab"
                  aria-selected={builderMode === 'advanced'}
                >
                  {t('common.reportBuilder.advancedMode')}
                </Button>
              </div>
              {builderMode === 'advanced' ? (
                <div
                  role="tablist"
                  aria-label={t('common.reportBuilder.workspaceTabGroupLabel')}
                  className="flex items-center gap-0.5 rounded-md border bg-muted/40 p-0.5"
                >
                  <Button
                    type="button"
                    size="sm"
                    variant={advancedWorkspaceMode === 'guided' ? 'default' : 'ghost'}
                    onClick={() => setAdvancedWorkspaceMode('guided')}
                    className="h-7 px-3 text-xs"
                    role="tab"
                    aria-selected={advancedWorkspaceMode === 'guided'}
                  >
                    {t('common.reportBuilder.advancedWorkspaceModes.guided')}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={advancedWorkspaceMode === 'expert' ? 'default' : 'ghost'}
                    onClick={() => setAdvancedWorkspaceMode('expert')}
                    className="h-7 px-3 text-xs"
                    role="tab"
                    aria-selected={advancedWorkspaceMode === 'expert'}
                  >
                    {t('common.reportBuilder.advancedWorkspaceModes.expert')}
                  </Button>
                </div>
              ) : null}
              <div className="h-5 w-px bg-border" aria-hidden="true" />
              {builderMode === 'advanced' && isEdit ? (
                <Button variant="outline" size="sm" asChild>
                  <Link to={`/reports/${reportId}/edit/preview`} target="_blank" rel="noreferrer">
                    {t('common.reportBuilder.preview')}
                  </Link>
                </Button>
              ) : null}
              {builderMode === 'advanced' && isEdit ? (
                <Button variant="outline" size="sm" onClick={() => navigate(`/reports/${reportId}`)}>
                  {t('common.cancel')}
                </Button>
              ) : null}
              <Button size="sm" onClick={handleSave} disabled={ui.saveLoading} className="min-w-[120px]">
                {ui.saveLoading && <Loader2 className="mr-2 size-4 animate-spin" />}
                {builderMode === 'basic'
                  ? (isEdit ? t('common.reportBuilder.simpleUpdateAction') : t('common.reportBuilder.simpleSaveAction'))
                  : (isEdit ? t('common.update') : t('common.save'))}
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 border-t bg-muted/20 px-4 py-2">
            {unifiedProgressSteps.map((step, idx) => (
              <div
                key={step.key}
                className={cn(
                  'flex items-center gap-2 text-[11px]',
                  step.done ? 'text-emerald-700 dark:text-emerald-300' : 'text-muted-foreground'
                )}
              >
                <span
                  className={cn(
                    'flex size-5 items-center justify-center rounded-full border text-[10px] font-semibold',
                    step.done
                      ? 'border-emerald-500 bg-emerald-500 text-white'
                      : 'border-border bg-background'
                  )}
                >
                  {step.done ? <CheckCircle2 className="size-3" /> : step.index}
                </span>
                <span className="font-medium">{step.title}</span>
                {idx < unifiedProgressSteps.length - 1 ? (
                  <span className="mx-1 h-px w-4 bg-border sm:w-6" aria-hidden="true" />
                ) : null}
              </div>
            ))}
            <div className="ml-auto flex items-center gap-2">
              <Badge
                variant="outline"
                className={cn(
                  'text-[10px] font-medium',
                  saveBlocked
                    ? 'border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-300'
                    : 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300'
                )}
              >
                {saveBlocked
                  ? t('common.reportBuilder.stepProgressSaveBlocked', { count: reportHardBlockers.length })
                  : t('common.reportBuilder.stepProgressSaveReady')}
              </Badge>
              {builderMode === 'advanced' && advancedWorkspaceMode === 'expert' && datasetReady ? (
                <div className="hidden items-center gap-3 text-[11px] text-muted-foreground lg:flex">
                  <span>
                    <LayoutGrid className="mr-1 inline size-3" />
                    {t('common.reportBuilder.heroMetricWidgets')}: <span className="font-semibold text-foreground">{widgetsCount}</span>
                  </span>
                  <span>
                    <BarChart3 className="mr-1 inline size-3" />
                    {t('common.reportBuilder.heroMetricFields')}: <span className="font-semibold text-foreground">{fieldsCount}</span>
                  </span>
                  <span>
                    <CheckCircle2
                      className={cn(
                        'mr-1 inline size-3',
                        reportQualityScore >= 84
                          ? 'text-emerald-600'
                          : reportQualityScore >= 60
                            ? 'text-amber-600'
                            : 'text-destructive'
                      )}
                    />
                    <span className="font-semibold text-foreground">{reportQualityScore}/100</span>
                  </span>
                </div>
              ) : null}
            </div>
          </div>
        </header>
        {(() => {
          const showBlockers = saveBlocked && builderMode === 'advanced' && advancedWorkspaceMode === 'expert';
          const showRepair = Boolean(datasetReady && builderMode === 'advanced' && chartRepairPlan);
          const showSimplify = Boolean(datasetReady && builderMode === 'advanced' && chartNeedsSimplification);
          if (!showBlockers && !showRepair && !showSimplify) return null;
          return (
            <div className="shrink-0 rounded-2xl border bg-card p-0">
              <div className="divide-y">
                {showBlockers ? (
                  <div className="flex flex-wrap items-start gap-3 border-l-4 border-destructive bg-destructive/5 p-3">
                    <TriangleAlert className="mt-0.5 size-4 shrink-0 text-destructive" />
                    <div className="min-w-[240px] flex-1">
                      <div className="text-sm font-semibold text-destructive">{t('common.reportBuilder.saveBlockedTitle')}</div>
                      <div className="text-xs text-foreground/80 mt-0.5">{t('common.reportBuilder.saveBlockedDescription')}</div>
                      <ul className="mt-2 space-y-0.5 text-xs text-muted-foreground">
                        {reportHardBlockers.slice(0, 4).map((blocker) => (
                          <li key={blocker}>• {blocker}</li>
                        ))}
                      </ul>
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <Button type="button" variant="outline" size="sm" onClick={handleSmartComplete}>
                        {t('common.reportBuilder.smartComplete')}
                      </Button>
                    </div>
                  </div>
                ) : null}
                {showRepair && chartRepairPlan ? (
                  <div className="flex flex-wrap items-start gap-3 border-l-4 border-rose-500 bg-rose-50/60 p-3 dark:bg-rose-950/20">
                    <TriangleAlert className="mt-0.5 size-4 shrink-0 text-rose-600 dark:text-rose-300" />
                    <div className="min-w-[240px] flex-1">
                      <div className="text-sm font-semibold text-rose-700 dark:text-rose-200">{chartRepairPlan.title}</div>
                      <div className="text-xs text-rose-900/80 mt-0.5 dark:text-rose-100/80">{chartRepairPlan.description}</div>
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <Button type="button" variant="outline" size="sm" onClick={handleAutoRepairVisualization}>
                        {chartRepairPlan.buttonLabel}
                      </Button>
                    </div>
                  </div>
                ) : null}
                {showSimplify ? (
                  <div className="flex flex-wrap items-start gap-3 border-l-4 border-amber-500 bg-amber-50/60 p-3 dark:bg-amber-950/30">
                    <TriangleAlert className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-300" />
                    <div className="min-w-[240px] flex-1">
                      <div className="text-sm font-semibold text-amber-700 dark:text-amber-200">{t('common.reportBuilder.guardrailTitle')}</div>
                      <div className="text-xs text-amber-900/80 mt-0.5 dark:text-amber-100/80">
                        {t('common.reportBuilder.guardrailTooManySeries', { count: previewSeriesCount })}
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-wrap gap-2">
                      <Button type="button" variant="outline" size="sm" onClick={() => setChartType('table')}>
                        {t('common.reportBuilder.guardrailSwitchTable')}
                      </Button>
                      <Button type="button" variant="outline" size="sm" onClick={() => setChartType('bar')}>
                        {t('common.reportBuilder.guardrailSwitchBar')}
                      </Button>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          );
        })()}
        <TopBarSelector
          mode={builderMode}
          connections={connections}
          dataSources={dataSources}
          dataSourceParameters={dataSourceParameters}
          datasetParameterBindings={config.datasetParameters ?? []}
          connectionKey={meta.connectionKey}
          dataSourceType={meta.dataSourceType}
          dataSourceName={meta.dataSourceName}
          reportName={meta.name}
          datasetChecked={dataSourceChecked}
          connectionsLoading={ui.connectionsLoading}
          dataSourcesLoading={ui.dataSourcesLoading}
          checkLoading={ui.checkLoading}
          onConnectionChange={setConnectionKey}
          onTypeChange={setType}
          onNameChange={setDataSourceName}
          onReportNameChange={(name) => setMeta({ name })}
          onParameterBindingChange={setDatasetParameterBinding}
          onSearchChange={setDataSourceSearch}
          onCheck={checkDataSource}
        />
        <ReportAssignmentPanel
          title={t('common.reportBuilder.sharedWith')}
          description={t('common.reportBuilder.sharedWithDescription')}
          summary={
            selectedAssignedUsers.length > 0
              ? t('common.reportBuilder.sharedWithSummary', { count: selectedAssignedUsers.length })
              : t('common.reportBuilder.sharedWithNone')
          }
          emptyState={t('common.reportBuilder.sharedWithNone')}
          selectPlaceholder={t('common.reportBuilder.sharedWithSelect')}
          searchPlaceholder={t('common.reportBuilder.sharedWithSearch')}
          emptyText={t('common.reportBuilder.sharedWithEmpty')}
          userOptions={userOptions}
          assignedUserIds={assignedUserIds}
          selectedAssignedUsers={selectedAssignedUsers}
          onAddAssignedUser={handleAddAssignedUser}
          onRequestRemoveAssignedUser={setRemoveAssignedUserId}
          removeLabel={t('common.reportBuilder.removeAssignedUser')}
        />
        {builderMode === 'advanced' && advancedWorkspaceMode === 'expert' ? (
          <div className="flex flex-wrap items-center gap-2 rounded-xl border bg-muted/20 px-3 py-2 text-xs">
            <CheckCircle2 className="size-3.5 text-primary" />
            <span className="font-semibold uppercase">{lifecycleStatusLabel}</span>
            <span className="text-muted-foreground">v{lifecycle.version}</span>
            <div className="ml-auto flex items-center gap-1.5">
              <Button type="button" variant="outline" size="sm" className="h-7 px-2 text-[11px]" onClick={() => setLifecycleStatus('draft')}>
                {t('common.reportBuilder.lifecycle.draft')}
              </Button>
              <Button type="button" variant="outline" size="sm" className="h-7 px-2 text-[11px]" onClick={() => setLifecycleStatus('published')}>
                {t('common.reportBuilder.lifecycle.publish')}
              </Button>
              <Button type="button" variant="outline" size="sm" className="h-7 px-2 text-[11px]" onClick={() => setLifecycleStatus('archived')}>
                {t('common.reportBuilder.lifecycle.archive')}
              </Button>
            </div>
          </div>
        ) : null}

        {datasetReady && builderMode === 'advanced' ? (
          <CollapsibleCard
            icon={<Filter className="size-4" />}
            title={t('common.reportBuilder.dashboardFiltersTitle')}
            description={t('common.reportBuilder.dashboardFiltersDescription')}
            summary={
              config.filters.length > 0
                ? t('common.reportBuilder.dashboardFiltersSummary', {
                    count: config.filters.length,
                    fields: config.filters.slice(0, 3).map((f) => getFieldLabel(f.field)).join(', '),
                  })
                : t('common.reportBuilder.dashboardFiltersEmptyShort')
            }
            defaultOpen={config.filters.length > 0}
          >
            <div className="mb-4 flex flex-wrap items-end gap-2 rounded-xl border bg-muted/20 p-3">
              <div className="min-w-[240px] flex-1 space-y-1.5">
                <Label className="text-[11px] font-medium text-muted-foreground">{t('common.reportBuilder.dashboardFiltersField')}</Label>
                <Combobox
                  options={filterFieldOptions.filter((option) => !config.filters.some((filter) => filter.field === option.value))}
                  value={filterDraftField}
                  onValueChange={setFilterDraftField}
                  placeholder={t('common.reportBuilder.dashboardFiltersFieldPlaceholder')}
                  searchPlaceholder={t('common.reportBuilder.simpleFieldSearchPlaceholder')}
                  emptyText={t('common.noData')}
                />
              </div>
              <Button type="button" variant="outline" size="sm" onClick={handleAddDashboardFilter}>
                <Plus className="mr-2 size-4" />
                {t('common.reportBuilder.dashboardFiltersAdd')}
              </Button>
            </div>
            <div className="grid gap-3 lg:grid-cols-2">
              {config.filters.length > 0 ? (
                config.filters.map((filter, index) => {
                  const field = filterFieldMap.get(filter.field);
                  const operators = field ? getOperatorsForField(field) : ['eq', 'ne'];
                  const inputType = getFilterInputType(field);
                  const isUnary = filter.operator === 'isNull' || filter.operator === 'isNotNull';
                  const isBetween = filter.operator === 'between';
                  const isList = filter.operator === 'in';

                  return (
                    <div key={`${filter.field}-${index}`} className="rounded-2xl border bg-muted/20 p-4">
                      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-[220px] flex-1">
                          <div className="text-sm font-semibold">{getFieldLabel(filter.field)}</div>
                          <div className="text-muted-foreground mt-1 text-xs">{filter.field}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{t('common.reportBuilder.dashboardFiltersScopeAllWidgets')}</Badge>
                          <Button type="button" variant="ghost" size="sm" onClick={() => useReportBuilderStore.getState().removeFilter(index)}>
                            {t('common.remove')}
                          </Button>
                        </div>
                      </div>
                      <div className="grid gap-3 md:grid-cols-[160px_1fr]">
                        <div className="space-y-2">
                          <Label>{t('common.reportBuilder.dashboardFiltersOperator')}</Label>
                          <Select
                            value={filter.operator}
                            onValueChange={(operator) =>
                              useReportBuilderStore.getState().updateFilter(index, {
                                operator,
                                value: undefined,
                                values: undefined,
                                from: undefined,
                                to: undefined,
                              })
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {operators.map((operator) => (
                                <SelectItem key={operator} value={operator}>
                                  {FILTER_OPERATOR_LABELS[operator] ?? operator}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>{t('common.reportBuilder.dashboardFiltersValue')}</Label>
                          {isUnary ? (
                            <div className="rounded-xl border bg-background px-3 py-2 text-sm text-muted-foreground">
                              {t('common.reportBuilder.dashboardFiltersNoValueNeeded')}
                            </div>
                          ) : isBetween ? (
                            <div className="grid grid-cols-2 gap-2">
                              <Input
                                type={inputType}
                                value={String(filter.from ?? '')}
                                onChange={(event) => useReportBuilderStore.getState().updateFilter(index, { from: event.target.value })}
                                placeholder={t('common.reportBuilder.from')}
                              />
                              <Input
                                type={inputType}
                                value={String(filter.to ?? '')}
                                onChange={(event) => useReportBuilderStore.getState().updateFilter(index, { to: event.target.value })}
                                placeholder={t('common.reportBuilder.to')}
                              />
                            </div>
                          ) : isList ? (
                            <Input
                              value={Array.isArray(filter.values) ? filter.values.map((item) => String(item ?? '')).join(', ') : ''}
                              onChange={(event) =>
                                useReportBuilderStore.getState().updateFilter(index, {
                                  values: event.target.value.split(',').map((item) => item.trim()).filter(Boolean),
                                })
                              }
                              placeholder={t('common.reportBuilder.valuesListPlaceholder')}
                            />
                          ) : (
                            <Input
                              type={inputType}
                              value={String(filter.value ?? '')}
                              onChange={(event) => useReportBuilderStore.getState().updateFilter(index, { value: event.target.value })}
                              placeholder={t('common.reportBuilder.dashboardFiltersValuePlaceholder')}
                            />
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="rounded-xl border border-dashed bg-muted/10 px-4 py-6 text-center lg:col-span-2">
                  <div className="text-sm font-medium">{t('common.reportBuilder.dashboardFiltersEmptyTitle')}</div>
                  <div className="text-muted-foreground mt-1 text-xs">{t('common.reportBuilder.dashboardFiltersEmptyDescription')}</div>
                </div>
              )}
            </div>
          </CollapsibleCard>
        ) : null}

        {saveBlocked && builderMode === 'advanced' && advancedWorkspaceMode === 'guided' ? (
          <div className="rounded-2xl border bg-card p-4">
            <div className="mb-3">
              <h2 className="text-sm font-semibold">{t('common.reportBuilder.guidedReadinessTitle')}</h2>
              <p className="text-muted-foreground mt-1 text-xs">{t('common.reportBuilder.guidedReadinessDescription')}</p>
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              <div className={`rounded-xl border px-3 py-3 text-sm ${meta.name?.trim() ? 'border-emerald-300 bg-emerald-50/60 dark:border-emerald-900 dark:bg-emerald-950/30' : 'bg-background text-muted-foreground'}`}>
                <div className="font-medium">{t('common.reportBuilder.reportName')}</div>
                <div className="mt-1 text-xs">{meta.name?.trim() || t('common.reportBuilder.simpleChecklistNamePending')}</div>
              </div>
              <div className={`rounded-xl border px-3 py-3 text-sm ${datasetReady ? 'border-emerald-300 bg-emerald-50/60 dark:border-emerald-900 dark:bg-emerald-950/30' : 'bg-background text-muted-foreground'}`}>
                <div className="font-medium">{t('common.reportBuilder.datasetHealth')}</div>
                <div className="mt-1 text-xs">{datasetReady ? t('common.reportBuilder.datasetChecked') : t('common.reportBuilder.datasetPending')}</div>
              </div>
              <div className={`rounded-xl border px-3 py-3 text-sm ${hasValue ? 'border-emerald-300 bg-emerald-50/60 dark:border-emerald-900 dark:bg-emerald-950/30' : 'bg-background text-muted-foreground'}`}>
                <div className="font-medium">{t('common.reportBuilder.values')}</div>
                <div className="mt-1 text-xs">{hasValue ? t('common.reportBuilder.guidedReadinessReady') : t('common.reportBuilder.simpleChecklistFieldsPending')}</div>
              </div>
            </div>
          </div>
        ) : null}

        {datasetReady && builderMode === 'advanced' && advancedWorkspaceMode === 'expert' ? (
          <CollapsibleCard
            icon={<Lightbulb className="size-4" />}
            title={t('common.reportBuilder.assistantCardTitle')}
            description={t('common.reportBuilder.assistantCardDescription')}
            summary={t('common.reportBuilder.assistantCardSummary', { visual: recommendedChartLabel })}
            defaultOpen={false}
          >
            <div className="space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-4 rounded-xl border bg-muted/20 p-3">
                <div className="min-w-[260px] flex-1">
                  <div className="mb-1 flex items-center gap-2">
                    <Lightbulb className="size-4 text-primary" />
                    <h3 className="text-sm font-semibold">{t('common.reportBuilder.narrativeTitle')}</h3>
                  </div>
                  <p className="text-sm leading-6 text-foreground">{reportNarrative}</p>
                  <p className="text-muted-foreground mt-2 text-xs">{t('common.reportBuilder.narrativeHint')}</p>
                </div>
                <div className="min-w-[220px] rounded-xl border bg-background p-3">
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    {t('common.reportBuilder.recommendedVisualTitle')}
                  </div>
                  <div className="mt-1 text-sm font-semibold">{recommendedChartLabel}</div>
                  <p className="text-muted-foreground mt-1 text-xs">
                    {chartNeedsSimplification
                      ? t('common.reportBuilder.recommendedVisualTooManySeries', { count: previewSeriesCount })
                      : t('common.reportBuilder.recommendedVisualNormal')}
                  </p>
                  {config.chartType !== recommendedChartType ? (
                    <Button type="button" variant="outline" size="sm" className="mt-2" onClick={() => setChartType(recommendedChartType)}>
                      {t('common.reportBuilder.applyRecommendedVisual')}
                    </Button>
                  ) : null}
                </div>
              </div>

              <div>
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-semibold">{t('common.reportBuilder.datasetCoachTitle')}</h3>
                    <p className="text-muted-foreground mt-0.5 text-xs">{t('common.reportBuilder.datasetCoachDescription')}</p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setWizardStep(1);
                      setWizardOpen(true);
                    }}
                  >
                    <Sparkles className="mr-2 size-4" />
                    {t('common.reportBuilder.openWizard')}
                  </Button>
                </div>
                <div className="grid gap-3 md:grid-cols-3">
                  <div className="rounded-xl border bg-background p-3">
                    <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{t('common.reportBuilder.axis')}</div>
                    <div className="mt-1 text-sm font-medium">{getFieldLabel(recommendedAxisField?.name)}</div>
                    <div className="text-muted-foreground mt-1 text-xs">{t('common.reportBuilder.datasetCoachAxisHint')}</div>
                    {recommendedAxisField ? (
                      <Button type="button" variant="outline" size="sm" className="mt-3" onClick={() => handleQuickUseAxis(recommendedAxisField)}>
                        {t('common.reportBuilder.use')}
                      </Button>
                    ) : null}
                  </div>
                  <div className="rounded-xl border bg-background p-3">
                    <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{t('common.reportBuilder.values')}</div>
                    <div className="mt-1 text-sm font-medium">{getFieldLabel(recommendedValueField?.name)}</div>
                    <div className="text-muted-foreground mt-1 text-xs">{t('common.reportBuilder.datasetCoachValueHint')}</div>
                    {recommendedValueField ? (
                      <Button type="button" variant="outline" size="sm" className="mt-3" onClick={() => handleQuickUseValue(recommendedValueField)}>
                        {t('common.reportBuilder.use')}
                      </Button>
                    ) : null}
                  </div>
                  <div className="rounded-xl border bg-background p-3">
                    <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{t('common.reportBuilder.legend')}</div>
                    <div className="mt-1 text-sm font-medium">{getFieldLabel(recommendedLegendField?.name)}</div>
                    <div className="text-muted-foreground mt-1 text-xs">{t('common.reportBuilder.datasetCoachLegendHint')}</div>
                    {recommendedLegendField ? (
                      <Button type="button" variant="outline" size="sm" className="mt-3" onClick={() => handleQuickUseLegend(recommendedLegendField)}>
                        {t('common.reportBuilder.use')}
                      </Button>
                    ) : null}
                  </div>
                </div>
                <div className="mt-3 rounded-xl border bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">{t('common.reportBuilder.wizardTitle')}:</span>{' '}
                  {wizardSummary}
                </div>
              </div>
            </div>
          </CollapsibleCard>
        ) : null}

        {datasetReady && builderMode === 'advanced' && advancedWorkspaceMode === 'guided' ? (
          <CollapsibleCard
            icon={<Sparkles className="size-4" />}
            title={t('common.reportBuilder.guidedTemplateTitle')}
            description={t('common.reportBuilder.guidedTemplateDescription')}
            summary={
              guidedGoal && guidedVisualIntent
                ? t('common.reportBuilder.guidedTemplateSummaryReady', {
                    goal: t(`common.reportBuilder.wizardGoals.${guidedGoal}.title`),
                    visual: t(`common.reportBuilder.widgetTaskCards.${guidedVisualIntent}.title`),
                  })
                : t('common.reportBuilder.guidedTemplateSummaryPending')
            }
            defaultOpen={!guidedGoal || !guidedVisualIntent}
            action={
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={(event) => {
                  event.stopPropagation();
                  handleSmartComplete();
                }}
              >
                <Sparkles className="mr-2 size-3.5" />
                {t('common.reportBuilder.smartComplete')}
              </Button>
            }
          >
            <div className="space-y-4">
              <div className="grid gap-3 md:grid-cols-2">
                <div className="space-y-1.5">
                  <Label className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
                    <span className="flex size-4 items-center justify-center rounded-full bg-primary/10 text-[9px] font-bold text-primary">1</span>
                    {t('common.reportBuilder.guidedStepGoalTitle')}
                  </Label>
                  <Select value={guidedGoal ?? undefined} onValueChange={(value) => setGuidedGoal(value as typeof guidedGoal)}>
                    <SelectTrigger>
                      <SelectValue placeholder={t('common.reportBuilder.guidedSelectedGoalEmpty')} />
                    </SelectTrigger>
                    <SelectContent>
                      {(['executive', 'operations', 'performance'] as const).map((goal) => (
                        <SelectItem key={goal} value={goal}>
                          <div className="flex flex-col">
                            <span className="font-medium">{t(`common.reportBuilder.wizardGoals.${goal}.title`)}</span>
                            <span className="text-[11px] text-muted-foreground">{t(`common.reportBuilder.wizardGoals.${goal}.description`)}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
                    <span className="flex size-4 items-center justify-center rounded-full bg-primary/10 text-[9px] font-bold text-primary">2</span>
                    {t('common.reportBuilder.guidedStepVisualTitle')}
                  </Label>
                  <Select
                    value={guidedVisualIntent ?? undefined}
                    onValueChange={(value) => handleGuidedWidgetTask(value as GuidedWidgetTask)}
                    disabled={!guidedGoal}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t('common.reportBuilder.guidedVisualPlaceholder')} />
                    </SelectTrigger>
                    <SelectContent>
                      {(['detailTable', 'trend', 'compare', 'summaryKpi'] as GuidedWidgetTask[]).map((task) => (
                        <SelectItem key={task} value={task}>
                          <div className="flex flex-col">
                            <span className="font-medium">{t(`common.reportBuilder.widgetTaskCards.${task}.title`)}</span>
                            <span className="text-[11px] text-muted-foreground">{t(`common.reportBuilder.widgetTaskCards.${task}.description`)}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {guidedVisualRecommendation && !guidedVisualIntent ? (
                    <p className="text-[11px] text-muted-foreground">
                      {t('common.reportBuilder.guidedVisualAutoSelected', {
                        visual: t(`common.reportBuilder.widgetTaskCards.${guidedVisualRecommendation}.title`),
                      })}
                    </p>
                  ) : null}
                </div>
              </div>

              {guidedFlowReadyForFields ? (
                <div className="rounded-xl border bg-muted/10 p-3">
                  <div className="mb-3 flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
                    <span className="flex size-4 items-center justify-center rounded-full bg-primary/10 text-[9px] font-bold text-primary">3</span>
                    {guidedVisualIntent === 'detailTable'
                      ? t('common.reportBuilder.advancedGridColumnsTitle')
                      : t('common.reportBuilder.widgetAssistantConfigureTitle')}
                  </div>
                  {guidedVisualIntent === 'detailTable' ? (
                    <div className="grid gap-3 xl:grid-cols-2">
                      <div className="rounded-lg border bg-background p-3">
                        <div className="mb-2 flex items-center justify-between gap-2">
                          <div className="text-xs font-semibold">{t('common.reportBuilder.simpleAvailableFieldsTitle')}</div>
                          <Button type="button" variant="outline" size="sm" className="h-7 text-[11px]" onClick={handleGuidedTableAutoSelect}>
                            {t('common.reportBuilder.simpleTableAutoSelect')}
                          </Button>
                        </div>
                        <Input
                          value={fieldsSearch}
                          onChange={(event) => setFieldsSearch(event.target.value)}
                          placeholder={t('common.reportBuilder.simpleFieldSearchPlaceholder')}
                          className="h-8 text-xs"
                        />
                        <div className="mt-2 max-h-64 space-y-1.5 overflow-auto pr-1">
                          {simpleAvailableFields.map((field) => {
                            const selected = guidedTableFields.some((item) => item.field === field.name);
                            return (
                              <button
                                key={field.name}
                                type="button"
                                onClick={() => handleGuidedTableToggleField(field.name)}
                                className={`w-full rounded-md border px-2.5 py-2 text-left transition-colors ${selected ? 'border-primary bg-primary/5' : 'bg-card hover:border-primary/40'}`}
                              >
                                <div className="text-xs font-medium">{field.label}</div>
                                <div className="text-[10px] text-muted-foreground">{field.name}</div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                      <div className="rounded-lg border bg-background p-3">
                        <div className="mb-2 text-xs font-semibold">
                          {t('common.reportBuilder.simpleSelectedFieldsCount', { count: guidedTableFields.length })}
                        </div>
                        {guidedTableFields.length > 0 ? (
                          <div className="max-h-64 space-y-2 overflow-auto pr-1">
                            {guidedTableFields.map((field) => (
                              <div key={field.field} className="rounded-md border p-2.5">
                                <div className="flex items-start justify-between gap-2">
                                  <div className="min-w-0 flex-1">
                                    <div className="truncate text-xs font-medium">{getFieldLabel(field.field)}</div>
                                    <Input
                                      value={activeWidget?.values?.[field.index]?.label ?? ''}
                                      onChange={(event) => handleGuidedTableLabelChange(field.index, event.target.value)}
                                      placeholder={field.label}
                                      className="mt-1.5 h-7 text-[11px]"
                                    />
                                  </div>
                                  <div className="flex shrink-0 flex-col gap-1">
                                    <Button type="button" variant="ghost" size="sm" className="h-6 w-6 p-0" disabled={field.index === 0} onClick={() => handleGuidedTableMoveField(field.index, -1)}>
                                      <ArrowLeft className="size-3 rotate-90" />
                                    </Button>
                                    <Button type="button" variant="ghost" size="sm" className="h-6 w-6 p-0" disabled={field.index === guidedTableFields.length - 1} onClick={() => handleGuidedTableMoveField(field.index, 1)}>
                                      <ArrowRight className="size-3 rotate-90" />
                                    </Button>
                                    <Button type="button" variant="ghost" size="sm" className="h-6 w-6 p-0 text-destructive" onClick={() => handleGuidedTableToggleField(field.field)}>
                                      <X className="size-3" />
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="rounded-md border border-dashed px-3 py-6 text-center text-xs text-muted-foreground">
                            {t('common.reportBuilder.simpleNoFieldsSelectedDescription')}
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="grid gap-3 md:grid-cols-3">
                      <div className="space-y-1.5">
                        <Label className="text-[11px] font-medium text-muted-foreground">{t('common.reportBuilder.widgetAssistantDimension')}</Label>
                        <Combobox
                          options={dimensionFieldOptions}
                          value={activeWidget?.axis?.field}
                          onValueChange={handleAssistantAxisChange}
                          placeholder={t('common.reportBuilder.widgetAssistantDimensionPlaceholder')}
                          searchPlaceholder={t('common.reportBuilder.simpleFieldSearchPlaceholder')}
                          emptyText={t('common.noData')}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[11px] font-medium text-muted-foreground">{t('common.reportBuilder.widgetAssistantMetric')}</Label>
                        <Combobox
                          options={metricFieldOptions}
                          value={activeWidget?.values?.[0]?.field}
                          onValueChange={handleAssistantMetricChange}
                          placeholder={t('common.reportBuilder.widgetAssistantMetricPlaceholder')}
                          searchPlaceholder={t('common.reportBuilder.simpleFieldSearchPlaceholder')}
                          emptyText={t('common.noData')}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[11px] font-medium text-muted-foreground">{t('common.reportBuilder.widgetAssistantBreakdown')}</Label>
                        <Combobox
                          options={breakdownFieldOptions}
                          value={activeWidget?.legend?.field ?? '__none__'}
                          onValueChange={handleAssistantLegendChange}
                          placeholder={t('common.reportBuilder.widgetAssistantBreakdownPlaceholder')}
                          searchPlaceholder={t('common.reportBuilder.simpleFieldSearchPlaceholder')}
                          emptyText={t('common.noData')}
                        />
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="rounded-xl border border-dashed bg-muted/10 px-4 py-6 text-center">
                  <div className="text-sm font-medium">{t('common.reportBuilder.guidedFieldsLockedTitle')}</div>
                  <div className="text-muted-foreground mt-1 text-xs">{t('common.reportBuilder.guidedFieldsLockedDescription')}</div>
                </div>
              )}
            </div>
          </CollapsibleCard>
        ) : null}


        {advancedWorkspaceMode === 'expert' || builderMode !== 'advanced' ? (
          <div className="rounded-2xl border bg-primary/5 px-4 py-3">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
                <ArrowRight className="size-4" />
              </div>
              <div className="min-w-[220px] flex-1">
                <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {t('common.reportBuilder.nextStepTitle')}
                </div>
                <div className="mt-0.5 text-sm font-semibold">{nextStep.title}</div>
                <div className="text-muted-foreground text-xs">{nextStep.description}</div>
              </div>
              <Button type="button" size="sm" onClick={nextStep.action}>
                {nextStep.actionLabel}
              </Button>
            </div>
          </div>
        ) : null}

        {builderMode === 'advanced' && advancedWorkspaceMode === 'expert' ? (
          <CollapsibleCard
            icon={<LayoutGrid className="size-4" />}
            title={t('common.reportBuilder.widgets')}
            description={t('common.reportBuilder.widgetCardsDescription')}
            summary={t('common.reportBuilder.widgetsSummary', {
              count: config.widgets?.length ?? 0,
              active: activeWidget?.title ?? '-',
            })}
            defaultOpen={(config.widgets?.length ?? 0) > 1}
            action={
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={(event) => {
                  event.stopPropagation();
                  addWidget();
                }}
              >
                <Plus className="mr-2 size-4" />
                {t('common.reportBuilder.addWidget')}
              </Button>
            }
          >
            <div className="grid gap-3 lg:grid-cols-2 2xl:grid-cols-3">
            {(config.widgets ?? []).map((widget) => {
              const isActive = widget.id === config.activeWidgetId;
              const widgetIndex = (config.widgets ?? []).findIndex((item) => item.id === widget.id);
              const canMoveLeft = widgetIndex > 0;
              const canMoveRight = widgetIndex >= 0 && widgetIndex < (config.widgets?.length ?? 0) - 1;
              return (
                <div
                  key={widget.id}
                  className={`rounded-2xl border p-4 ${isActive ? 'border-primary bg-primary/5' : 'border-border bg-background'}`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-[220px] flex-1 space-y-2">
                      <Input
                        value={widget.title}
                        onChange={(e) => renameWidget(widget.id, e.target.value)}
                        onFocus={() => setActiveWidget(widget.id)}
                        className="h-9"
                      />
                      <div className="flex flex-wrap gap-2">
                        <Badge variant={isActive ? 'default' : 'outline'}>
                          {isActive ? t('common.reportBuilder.widgetCardActive') : t('common.reportBuilder.widgetCardInactive')}
                        </Badge>
                        <Badge variant="outline">{t(`common.reportBuilder.chartTypes.${widget.chartType}`)}</Badge>
                        <Badge variant="outline">{widgetSizeLabel(widget.size)}</Badge>
                        <Badge variant="outline">{widgetHeightLabel(widget.height)}</Badge>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button type="button" variant={isActive ? 'default' : 'outline'} size="sm" onClick={() => setActiveWidget(widget.id)}>
                        {t('common.reportBuilder.widgetCardSelect')}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => canMoveLeft && reorderWidgets(widgetIndex, widgetIndex - 1)}
                        disabled={!canMoveLeft}
                      >
                        <ArrowLeft className="mr-1 size-3.5" />
                        {t('common.previous')}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => canMoveRight && reorderWidgets(widgetIndex, widgetIndex + 1)}
                        disabled={!canMoveRight}
                      >
                        {t('common.next')}
                        <ArrowRight className="ml-1 size-3.5" />
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setWidgetSize(
                            widget.id,
                            widget.size === 'third' ? 'half' : widget.size === 'half' ? 'full' : 'third'
                          )
                        }
                        title={widgetSizeLabel(widget.size)}
                      >
                        {t('common.reportBuilder.widgetCardSizeAction')}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setWidgetHeight(
                            widget.id,
                            widget.height === 'sm' ? 'md' : widget.height === 'md' ? 'lg' : 'sm'
                          )
                        }
                        title={widgetHeightLabel(widget.height)}
                      >
                        {t('common.reportBuilder.widgetCardHeightAction')}
                      </Button>
                      {(config.widgets?.length ?? 0) > 1 && (
                        <Button type="button" variant="ghost" size="sm" onClick={() => setDeleteWidgetId(widget.id)}>
                          <Trash2 className="mr-1 size-3.5" />
                          {t('common.remove')}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            </div>
          </CollapsibleCard>
        ) : null}

        {datasetReady && builderMode === 'basic' ? (
          <div className="rounded-2xl border bg-card p-4">
            <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-[280px] flex-1">
                <div className="mb-2 inline-flex rounded-full border bg-muted/30 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {t('common.reportBuilder.simpleStepChooseFieldsBadge')}
                </div>
                <h2 className="text-sm font-semibold">{t('common.reportBuilder.simpleTableTitle')}</h2>
                <p className="text-muted-foreground mt-1 text-xs">{t('common.reportBuilder.simpleTableDescription')}</p>
              </div>
              <Button type="button" variant="outline" onClick={handleSimpleSelectFirstFields}>
                {t('common.reportBuilder.simpleTableAutoSelect')}
              </Button>
            </div>
            <div className="space-y-4">
              <div className="rounded-2xl border bg-muted/20 p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold">{t('common.reportBuilder.simpleAvailableFieldsTitle')}</h3>
                    <p className="text-muted-foreground mt-1 text-xs">{t('common.reportBuilder.simpleAvailableFieldsDescription')}</p>
                  </div>
                  <Badge variant="secondary">{simpleAvailableFields.length}</Badge>
                </div>
                <Input
                  value={fieldsSearch}
                  onChange={(event) => setFieldsSearch(event.target.value)}
                  placeholder={t('common.reportBuilder.simpleFieldSearchPlaceholder')}
                  className="mb-3"
                />
                <div className="max-h-[420px] space-y-2 overflow-y-auto pr-1">
                  {simpleAvailableFields.map((field) => {
                    const selected = config.values.some((value) => value.field === field.name);
                    const samples = previewSampleMap[field.name] ?? [];

                    return (
                      <button
                        key={field.name}
                        type="button"
                        onClick={() => handleSimpleToggleField(field.name)}
                        className={`w-full rounded-xl border px-3 py-3 text-left transition-colors ${selected ? 'border-primary bg-primary/5' : 'bg-background hover:border-primary/40'}`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-sm font-medium">{field.label}</div>
                            <div className="text-muted-foreground mt-1 text-xs">{field.name}</div>
                            {samples.length > 0 ? (
                              <div className="text-muted-foreground mt-2 line-clamp-2 text-[11px]">{samples.join(' • ')}</div>
                            ) : null}
                          </div>
                          <Badge variant={selected ? 'default' : 'outline'}>
                            {selected ? t('common.selected') : t('common.add')}
                          </Badge>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="rounded-2xl border bg-muted/20 p-4">
                <div className="mb-2 inline-flex rounded-full border bg-background px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {t('common.reportBuilder.simpleStepRenameBadge')}
                </div>
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold">{t('common.reportBuilder.simpleSelectedFieldsTitle')}</h3>
                    <p className="text-muted-foreground mt-1 text-xs">{t('common.reportBuilder.simpleSelectedFieldsDescription')}</p>
                  </div>
                  <Badge variant="secondary">
                    {t('common.reportBuilder.simpleSelectedFieldsCount', { count: simpleTableFields.length })}
                  </Badge>
                </div>
                {simpleTableFields.length === 0 ? (
                  <div className="rounded-xl border border-dashed bg-background px-4 py-8 text-center">
                    <div className="text-sm font-medium">{t('common.reportBuilder.simpleNoFieldsSelectedTitle')}</div>
                    <div className="text-muted-foreground mt-2 text-xs">{t('common.reportBuilder.simpleNoFieldsSelectedDescription')}</div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {simpleTableFields.map((item) => (
                      <div key={item.field} className="rounded-xl border bg-background p-3">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="min-w-[220px] flex-1">
                            <div className="text-sm font-medium">{getFieldLabel(item.field)}</div>
                            <div className="text-muted-foreground mt-1 text-xs">{item.field}</div>
                          </div>
                          <div className="flex gap-2">
                            <Button type="button" variant="outline" size="sm" onClick={() => handleSimpleMoveField(item.index, -1)} disabled={item.index === 0}>
                              {t('common.previous')}
                            </Button>
                            <Button type="button" variant="outline" size="sm" onClick={() => handleSimpleMoveField(item.index, 1)} disabled={item.index === simpleTableFields.length - 1}>
                              {t('common.next')}
                            </Button>
                            <Button type="button" variant="outline" size="sm" onClick={() => handleSimpleToggleField(item.field)}>
                              {t('common.remove')}
                            </Button>
                          </div>
                        </div>
                        <div className="mt-3 space-y-2">
                          <Label htmlFor={`simple-field-label-${item.field}`}>{t('common.reportBuilder.simpleColumnTitleLabel')}</Label>
                          <Input
                            id={`simple-field-label-${item.field}`}
                            value={config.values[item.index]?.label ?? ''}
                            onChange={(event) => useReportBuilderStore.getState().setValueLabel(item.index, event.target.value)}
                            placeholder={t('common.reportBuilder.simpleColumnTitlePlaceholder', { defaultTitle: getFieldLabel(item.field) })}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : null}

        {ui.toast && (
          <div className="fixed right-4 top-4 z-50 max-w-sm">
            <Toast
              message={ui.toast.message}
              variant={ui.toast.variant}
              onDismiss={() => setUi({ toast: null })}
            />
          </div>
        )}

        {builderMode === 'advanced' ? (
          advancedWorkspaceMode === 'expert' ? (
            <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 overflow-hidden xl:grid-cols-[320px_1fr]">
              <div className="flex min-h-0 flex-col gap-4 overflow-y-auto pr-1">
                <div className="rounded-2xl border bg-card p-4">
                  <h3 className="text-sm font-semibold">{t('common.reportBuilder.expertCardFieldsTitle')}</h3>
                  <p className="text-muted-foreground mt-1 text-xs">{t('common.reportBuilder.expertCardFieldsDescription')}</p>
                  <div className="mt-4">
                    <FieldsPanel
                      schema={schema}
                      calculatedFields={config.calculatedFields}
                      sampleValues={previewSampleMap}
                      search={fieldsSearch}
                      onSearchChange={setFieldsSearch}
                      onUseAsAxis={handleQuickUseAxis}
                      onUseAsValue={handleQuickUseValue}
                      onUseAsLegend={handleQuickUseLegend}
                      onUseAsFilter={handleQuickUseFilter}
                      disabled={!dataSourceChecked}
                      mode={builderMode}
                    />
                  </div>
                </div>
                <div className="rounded-2xl border bg-card p-4">
                  <h3 className="text-sm font-semibold">{t('common.reportBuilder.expertCardStructureTitle')}</h3>
                  <p className="text-muted-foreground mt-1 text-xs">{t('common.reportBuilder.expertCardStructureDescription')}</p>
                  {ui.slotError ? (
                    <div className="mt-4 rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm">
                      <div className="font-semibold text-destructive">{t('common.reportBuilder.needAttentionTitle')}</div>
                      <div className="mt-1 text-muted-foreground">{ui.slotError}</div>
                    </div>
                  ) : null}
                  <div className="mt-4">
                    <SlotsPanel
                      axis={config.axis}
                      values={config.values}
                      legend={config.legend}
                      filters={config.filters}
                      slotError={ui.slotError}
                      onRemoveAxis={() => useReportBuilderStore.getState().removeFromSlot('axis', 0)}
                      onRemoveValue={(i) => useReportBuilderStore.getState().removeFromSlot('values', i)}
                      onRemoveLegend={() => useReportBuilderStore.getState().removeFromSlot('legend', 0)}
                      onRemoveFilter={(i) => useReportBuilderStore.getState().removeFilter(i)}
                      disabled={!dataSourceChecked}
                    />
                  </div>
                </div>
              </div>

              <div className="flex min-h-0 flex-col gap-4 overflow-y-auto pr-1">
                <DeferOnView fallback={<PreviewPanelSkeleton className="border bg-card p-4" />}>
                  <div className="rounded-2xl border bg-card p-4">
                    <Suspense fallback={<PreviewPanelSkeleton />}>
                      <PreviewPanel
                        title={t('common.reportBuilder.activeWidgetPreview')}
                        subtitle={activeWidget?.appearance?.subtitle || t('common.reportBuilder.activeWidgetPreviewDescription')}
                        columns={preview.columns}
                        rows={preview.rows}
                        chartType={config.chartType}
                        appearance={activeWidget?.appearance}
                        labelOverrides={buildWidgetLabelOverrides(activeWidget)}
                        loading={ui.previewLoading}
                        error={ui.error}
                        empty={!dataSourceChecked}
                      />
                    </Suspense>
                  </div>
                </DeferOnView>
                <div className="rounded-2xl border bg-card p-4">
                  <h3 className="text-sm font-semibold">{t('common.reportBuilder.expertCardLayoutTitle')}</h3>
                  <p className="text-muted-foreground mt-1 text-xs">{t('common.reportBuilder.expertCardLayoutDescription')}</p>
                  <div className="mt-4">
                    <DashboardLayoutPreview
                      widgets={config.widgets ?? []}
                      activeWidgetId={config.activeWidgetId}
                      onSelect={setActiveWidget}
                      onReorder={reorderWidgets}
                    />
                  </div>
                </div>
                <div className="rounded-2xl border bg-card p-4">
                  <h3 className="text-sm font-semibold">{t('common.reportBuilder.expertCardSettingsTitle')}</h3>
                  <p className="text-muted-foreground mt-1 text-xs">{t('common.reportBuilder.expertCardSettingsDescription')}</p>
                  <div className="mt-4">
                    <PropertiesPanel schema={schema} slotError={ui.slotError} disabled={!dataSourceChecked} mode={builderMode} />
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 xl:grid-cols-[1fr_320px]">
              <div className="flex min-h-0 flex-col overflow-y-auto pr-1">
                <DeferOnView fallback={<PreviewPanelSkeleton className="shrink-0" />}>
                  <div className="shrink-0">
                    <Suspense fallback={<PreviewPanelSkeleton />}>
                      <PreviewPanel
                        title={t('common.reportBuilder.activeWidgetPreview')}
                        subtitle={activeWidget?.appearance?.subtitle || t('common.reportBuilder.activeWidgetPreviewDescription')}
                        columns={preview.columns}
                        rows={preview.rows}
                        chartType={config.chartType}
                        appearance={activeWidget?.appearance}
                        labelOverrides={buildWidgetLabelOverrides(activeWidget)}
                        loading={ui.previewLoading}
                        error={ui.error}
                        empty={!dataSourceChecked}
                      />
                    </Suspense>
                  </div>
                </DeferOnView>
                {(config.widgets?.length ?? 0) > 1 ? (
                  <div className="mt-4 rounded-2xl border bg-card p-4">
                    <div className="mb-3 flex items-center gap-2">
                      <LayoutGrid className="size-4 text-primary" />
                      <h3 className="text-sm font-semibold">{t('common.reportBuilder.expertCardLayoutTitle')}</h3>
                    </div>
                    <DashboardLayoutPreview
                      widgets={config.widgets ?? []}
                      activeWidgetId={config.activeWidgetId}
                      onSelect={setActiveWidget}
                      onReorder={reorderWidgets}
                    />
                  </div>
                ) : null}
              </div>

              <aside className="space-y-3">
                <div className="rounded-2xl border bg-card p-4">
                  <div className="mb-3 flex items-center gap-2">
                    <Sparkles className="size-4 text-primary" />
                    <h3 className="text-sm font-semibold">{t('common.reportBuilder.guidedSidebarTitle')}</h3>
                  </div>
                  <p className="text-muted-foreground mb-4 text-xs">{t('common.reportBuilder.guidedSidebarDescription')}</p>
                  <div className="flex flex-col gap-2">
                    <Button type="button" onClick={handleSmartComplete} className="justify-start">
                      <Sparkles className="mr-2 size-4" />
                      {t('common.reportBuilder.smartComplete')}
                    </Button>
                    {!hasValue && firstValueField ? (
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => handleQuickUseValue(firstValueField)}
                        className="justify-start"
                      >
                        <Plus className="mr-2 size-4" />
                        {t('common.reportBuilder.addRecommendedValue', { field: firstValueField.displayName || firstValueField.name })}
                      </Button>
                    ) : null}
                    {!hasAxis && firstAxisField ? (
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => handleQuickUseAxis(firstAxisField)}
                        className="justify-start"
                      >
                        <Plus className="mr-2 size-4" />
                        {t('common.reportBuilder.addRecommendedAxis', { field: firstAxisField.displayName || firstAxisField.name })}
                      </Button>
                    ) : null}
                  </div>
                </div>

                <CollapsibleCard
                  title={t('common.reportBuilder.widgetAssistantCurrentTitle')}
                  description={t('common.reportBuilder.guidedWorkspaceDescription')}
                  summary={t('common.reportBuilder.guidedActiveSummary', {
                    axis: getFieldLabel(activeWidget?.axis?.field) || '—',
                    value: getFieldLabel(activeWidget?.values?.[0]?.field) || '—',
                  })}
                  defaultOpen={false}
                >
                  <div className="space-y-2">
                    <div className={`rounded-xl border px-3 py-2 text-sm ${activeWidget?.axis?.field ? 'border-emerald-300 bg-emerald-50/60 dark:border-emerald-900 dark:bg-emerald-950/30' : 'bg-background'}`}>
                      <div className="text-xs font-medium text-muted-foreground">{t('common.reportBuilder.widgetAssistantDimension')}</div>
                      <div className="mt-0.5 text-sm">{getFieldLabel(activeWidget?.axis?.field) || '—'}</div>
                    </div>
                    <div className={`rounded-xl border px-3 py-2 text-sm ${activeWidget?.values?.[0]?.field ? 'border-emerald-300 bg-emerald-50/60 dark:border-emerald-900 dark:bg-emerald-950/30' : 'bg-background'}`}>
                      <div className="text-xs font-medium text-muted-foreground">{t('common.reportBuilder.widgetAssistantMetric')}</div>
                      <div className="mt-0.5 text-sm">{getFieldLabel(activeWidget?.values?.[0]?.field) || '—'}</div>
                    </div>
                    <div className={`rounded-xl border px-3 py-2 text-sm ${activeWidget?.legend?.field ? 'border-emerald-300 bg-emerald-50/60 dark:border-emerald-900 dark:bg-emerald-950/30' : 'bg-background'}`}>
                      <div className="text-xs font-medium text-muted-foreground">{t('common.reportBuilder.widgetAssistantBreakdown')}</div>
                      <div className="mt-0.5 text-sm">{activeWidget?.legend?.field ? getFieldLabel(activeWidget.legend.field) : t('common.reportBuilder.widgetAssistantNoBreakdown')}</div>
                    </div>
                  </div>
                </CollapsibleCard>

                <div className="rounded-2xl border border-dashed bg-muted/10 p-3 text-xs text-muted-foreground">
                  <div className="mb-2 font-medium text-foreground">{t('common.reportBuilder.guidedNeedMoreTitle')}</div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full justify-start"
                    onClick={() => setAdvancedWorkspaceMode('expert')}
                  >
                    {t('common.reportBuilder.advancedWorkspaceOpenExpert')}
                  </Button>
                </div>
              </aside>
            </div>
          )
        ) : (
          <div className="space-y-4">
            <div className="rounded-2xl border bg-card p-4">
              <div className="mb-2 inline-flex rounded-full border bg-muted/30 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                {t('common.reportBuilder.simpleStepSaveBadge')}
              </div>
              <h3 className="text-sm font-semibold">{t('common.reportBuilder.simpleFinalStepTitle')}</h3>
              <p className="text-muted-foreground mt-1 text-xs">{t('common.reportBuilder.simpleFinalStepDescription')}</p>
              <div className="mt-4 grid gap-3 md:grid-cols-3">
                <div className={`rounded-xl border px-3 py-3 text-sm ${datasetReady ? 'border-emerald-300 bg-emerald-50/60 dark:border-emerald-900 dark:bg-emerald-950/30' : 'bg-muted/20'}`}>
                  <div className="font-medium">{t('common.reportBuilder.simpleChecklistDatasetTitle')}</div>
                  <div className="text-muted-foreground mt-1 text-xs">{meta.dataSourceName || t('common.reportBuilder.notConnected')}</div>
                </div>
                <div className={`rounded-xl border px-3 py-3 text-sm ${simpleTableFields.length > 0 ? 'border-emerald-300 bg-emerald-50/60 dark:border-emerald-900 dark:bg-emerald-950/30' : 'bg-muted/20'}`}>
                  <div className="font-medium">{t('common.reportBuilder.simpleChecklistFieldsTitle')}</div>
                  <div className="text-muted-foreground mt-1 text-xs">
                    {simpleTableFields.length > 0
                      ? t('common.reportBuilder.simpleSelectedFieldsCount', { count: simpleTableFields.length })
                      : t('common.reportBuilder.simpleChecklistFieldsPending')}
                  </div>
                </div>
                <div className={`rounded-xl border px-3 py-3 text-sm ${meta.name?.trim() ? 'border-emerald-300 bg-emerald-50/60 dark:border-emerald-900 dark:bg-emerald-950/30' : 'bg-muted/20'}`}>
                  <div className="font-medium">{t('common.reportBuilder.simpleChecklistNameTitle')}</div>
                  <div className="text-muted-foreground mt-1 text-xs">
                    {meta.name?.trim() || t('common.reportBuilder.simpleChecklistNamePending')}
                  </div>
                </div>
              </div>
              <div className="mt-4 rounded-xl border bg-background p-3">
                <div className="text-muted-foreground text-[11px] uppercase tracking-wide">{t('common.reportBuilder.simpleSummaryColumns')}</div>
                <div className="mt-2 text-sm font-medium">
                  {simpleTableFields.length > 0
                    ? simpleTableFields.map((item) => item.label).join(', ')
                    : t('common.reportBuilder.basicNoneSelected')}
                </div>
              </div>
              <div className="mt-4 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-sm">
                <div className="font-medium">{t('common.reportBuilder.simpleSaveHintTitle')}</div>
                <div className="text-muted-foreground mt-1 text-xs">{t('common.reportBuilder.simpleSaveHintDescription')}</div>
              </div>
            </div>

            <div className="rounded-2xl border bg-card p-4">
              <div className="mb-2 inline-flex rounded-full border bg-muted/30 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                {t('common.reportBuilder.simplePreviewBadge')}
              </div>
              <DeferOnView fallback={<PreviewPanelSkeleton />}>
                <Suspense fallback={<PreviewPanelSkeleton />}>
                  <PreviewPanel
                    title={t('common.reportBuilder.simplePreviewTitle')}
                    subtitle={t('common.reportBuilder.simplePreviewDescription')}
                    columns={preview.columns}
                    rows={preview.rows}
                    chartType={config.chartType}
                    appearance={activeWidget?.appearance}
                    labelOverrides={buildWidgetLabelOverrides(activeWidget)}
                    loading={ui.previewLoading}
                    error={ui.error}
                    empty={!dataSourceChecked}
                  />
                </Suspense>
              </DeferOnView>
            </div>
          </div>
        )}
        <AlertDialog open={deleteWidgetId != null} onOpenChange={(open) => !open && setDeleteWidgetId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t('common.delete.confirmTitle')}</AlertDialogTitle>
              <AlertDialogDescription>{t('common.delete.confirmMessage')}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  if (deleteWidgetId) removeWidget(deleteWidgetId);
                  setDeleteWidgetId(null);
                }}
              >
                {t('common.delete.action')}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        <AlertDialog open={removeAssignedUserId != null} onOpenChange={(open) => !open && setRemoveAssignedUserId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{t('common.delete.confirmTitle')}</AlertDialogTitle>
              <AlertDialogDescription>{t('common.reportBuilder.removeAssignedUserConfirm')}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  if (removeAssignedUserId != null) handleRemoveAssignedUser(removeAssignedUserId);
                  setRemoveAssignedUserId(null);
                }}
              >
                {t('common.remove')}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        <Dialog open={wizardOpen} onOpenChange={setWizardOpen}>
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>{t('common.reportBuilder.wizardTitle')}</DialogTitle>
              <DialogDescription>{t('common.reportBuilder.wizardDescription')}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid gap-2 sm:grid-cols-3">
                {[1, 2, 3].map((step) => (
                  <div
                    key={step}
                    className={`rounded-xl border px-3 py-2 text-xs ${wizardStep === step ? 'border-primary bg-primary/5' : 'bg-background text-muted-foreground'}`}
                  >
                    <div className="font-semibold">{t('common.reportBuilder.wizardStepLabel', { step })}</div>
                    <div className="mt-1">
                      {step === 1
                        ? t('common.reportBuilder.wizardSteps.dataset')
                        : step === 2
                          ? t('common.reportBuilder.wizardSteps.goal')
                          : t('common.reportBuilder.wizardSteps.visual')}
                    </div>
                  </div>
                ))}
              </div>

              {wizardStep === 1 ? (
                <div className="rounded-xl border bg-muted/20 p-4">
                  <div className="text-sm font-semibold">{t('common.reportBuilder.wizardDatasetTitle')}</div>
                  <p className="text-muted-foreground mt-1 text-xs">{t('common.reportBuilder.wizardDatasetDescription')}</p>
                  <div className="mt-3 rounded-xl border bg-background p-3">
                    <div className="text-xs uppercase tracking-wide text-muted-foreground">{t('common.reportBuilder.datasetHealth')}</div>
                    <div className="mt-1 text-sm font-medium">{meta.dataSourceName || t('common.reportBuilder.notConnected')}</div>
                  </div>
                </div>
              ) : null}

              {wizardStep === 2 ? (
                <div className="grid gap-3 md:grid-cols-3">
                  {(['executive', 'operations', 'performance'] as const).map((goal) => (
                    <button
                      key={goal}
                      type="button"
                      onClick={() => setWizardGoal(goal)}
                      className={`rounded-2xl border p-4 text-left transition-colors ${wizardGoal === goal ? 'border-primary bg-primary/5' : 'bg-background hover:border-primary/40'}`}
                    >
                      <div className="text-sm font-semibold">{t(`common.reportBuilder.wizardGoals.${goal}.title`)}</div>
                      <div className="text-muted-foreground mt-2 text-xs">{t(`common.reportBuilder.wizardGoals.${goal}.description`)}</div>
                    </button>
                  ))}
                </div>
              ) : null}

              {wizardStep === 3 ? (
                <div className="space-y-4">
                  <div className="grid gap-3 md:grid-cols-2">
                    {(['table', 'chart', 'trend', 'kpi'] as const).map((visual) => (
                      <button
                        key={visual}
                        type="button"
                        onClick={() => setWizardVisual(visual)}
                        className={`rounded-2xl border p-4 text-left transition-colors ${wizardVisual === visual ? 'border-primary bg-primary/5' : 'bg-background hover:border-primary/40'}`}
                      >
                        <div className="text-sm font-semibold">{t(`common.reportBuilder.wizardVisuals.${visual}.title`)}</div>
                        <div className="text-muted-foreground mt-2 text-xs">{t(`common.reportBuilder.wizardVisuals.${visual}.description`)}</div>
                      </button>
                    ))}
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    {(['recommended', 'none'] as const).map((breakdown) => (
                      <button
                        key={breakdown}
                        type="button"
                        onClick={() => setWizardBreakdown(breakdown)}
                        className={`rounded-2xl border p-4 text-left transition-colors ${wizardBreakdown === breakdown ? 'border-primary bg-primary/5' : 'bg-background hover:border-primary/40'}`}
                      >
                        <div className="text-sm font-semibold">{t(`common.reportBuilder.wizardBreakdowns.${breakdown}`)}</div>
                        <div className="text-muted-foreground mt-2 text-xs">
                          {breakdown === 'recommended'
                            ? t('common.reportBuilder.wizardBreakdownsRecommendedDescription')
                            : t('common.reportBuilder.wizardBreakdownsNoneDescription')}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
            <DialogFooter className="gap-2 sm:justify-between">
              <div className="text-muted-foreground text-xs">{wizardSummary}</div>
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => setWizardOpen(false)}>
                  {t('common.cancel')}
                </Button>
                {wizardStep > 1 ? (
                  <Button type="button" variant="outline" onClick={() => setWizardStep((wizardStep - 1) as 1 | 2 | 3)}>
                    {t('common.reportBuilder.wizardBack')}
                  </Button>
                ) : null}
                {wizardStep < 3 ? (
                  <Button type="button" onClick={() => wizardCanContinue && setWizardStep((wizardStep + 1) as 1 | 2 | 3)} disabled={!wizardCanContinue}>
                    {t('common.reportBuilder.wizardNext')}
                  </Button>
                ) : (
                  <Button type="button" onClick={handleApplyWizard}>
                    {t('common.reportBuilder.wizardApply')}
                  </Button>
                )}
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DndContext>
  );
}

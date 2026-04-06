import type { ReactElement } from 'react';
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
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
import { PreviewPanel } from '../components/PreviewPanel';
import { DashboardLayoutPreview } from '../components/DashboardLayoutPreview';
import { Toast } from '../components/Toast';
import { useReportBuilderStore } from '../store';
import {
  isAxisCompatible,
  isValuesCompatible,
  isLegendCompatible,
  getFieldSemanticType,
  validateKpiConfig,
  validateMatrixConfig,
  validatePieConfig,
} from '../utils';
import type { Field } from '../types';
import { Loader2 } from 'lucide-react';
import { ArrowLeft, ArrowRight, BarChart3, CheckCircle2, Database, LayoutGrid, Lightbulb, Plus, Sparkles, Trash2, TriangleAlert } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useUserList } from '@/features/user-management/hooks/useUserList';

function getSlotTypeFromId(id: string): 'axis' | 'values' | 'legend' | 'filters' | null {
  if (id === 'slot-axis') return 'axis';
  if (id === 'slot-values') return 'values';
  if (id === 'slot-legend') return 'legend';
  if (id === 'slot-filters') return 'filters';
  return null;
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

type ChartRepairPlan =
  | { kind: 'switch-table'; title: string; description: string; buttonLabel: string }
  | { kind: 'switch-bar'; title: string; description: string; buttonLabel: string }
  | { kind: 'switch-line'; title: string; description: string; buttonLabel: string }
  | { kind: 'fix-pie'; title: string; description: string; buttonLabel: string }
  | { kind: 'fix-kpi'; title: string; description: string; buttonLabel: string }
  | { kind: 'fix-matrix'; title: string; description: string; buttonLabel: string };

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
    setLifecycleStatus,
    setUi,
    saveNewReport,
    updateReport,
    loadReportById,
  } = useReportBuilderStore();
  const [dataSourceSearch, setDataSourceSearch] = useState('');
  const [builderMode, setBuilderMode] = useState<'basic' | 'advanced'>('basic');
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
  const fieldsCount = schema.length + (config.calculatedFields?.length ?? 0);
  const widgetsCount = config.widgets?.length ?? 0;
  const datasetReady = Boolean(dataSourceChecked && meta.dataSourceName);
  const hasAxis = Boolean(config.axis?.field);
  const hasValue = config.values.length > 0;
  const hasLegend = Boolean(config.legend?.field);
  const hasFilters = config.filters.length > 0;
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
    if (config.chartType !== 'kpi' && !hasAxis) issues.push(t('common.reportBuilder.qualityIssues.axis'));
    if (!hasValue) issues.push(t('common.reportBuilder.qualityIssues.value'));
    if (chartRepairPlan) issues.push(t('common.reportBuilder.qualityIssues.visual'));
    return issues;
  }, [chartRepairPlan, config.chartType, datasetReady, hasAxis, hasValue, meta.name, t, widgetsCount]);
  const reportQualityScore = useMemo(() => {
    const penalty = reportQualityIssues.length * 16;
    return Math.max(0, 100 - penalty);
  }, [reportQualityIssues.length]);
  const reportHardBlockers = useMemo(() => {
    const blockers: string[] = [];
    if (!meta.name?.trim()) blockers.push(t('common.reportBuilder.hardBlockers.reportName'));
    if (!datasetReady) blockers.push(t('common.reportBuilder.hardBlockers.dataset'));
    if (widgetsCount === 0) blockers.push(t('common.reportBuilder.hardBlockers.widgets'));
    if (config.chartType !== 'kpi' && !hasAxis) blockers.push(t('common.reportBuilder.hardBlockers.axis'));
    if (!hasValue) blockers.push(t('common.reportBuilder.hardBlockers.value'));
    if ((config.chartType === 'pie' || config.chartType === 'donut') && !!pieError) blockers.push(t('common.reportBuilder.hardBlockers.pie'));
    if (config.chartType === 'kpi' && !!kpiError) blockers.push(t('common.reportBuilder.hardBlockers.kpi'));
    if (config.chartType === 'matrix' && !!matrixError) blockers.push(t('common.reportBuilder.hardBlockers.matrix'));
    if ((config.chartType === 'line' || config.chartType === 'bar' || config.chartType === 'stackedBar') && previewSeriesCount > 24) {
      blockers.push(t('common.reportBuilder.hardBlockers.tooManySeries', { count: previewSeriesCount }));
    }
    return blockers;
  }, [config.chartType, datasetReady, hasAxis, hasValue, kpiError, matrixError, meta.name, pieError, previewSeriesCount, t, widgetsCount]);
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
  const builderReadinessSteps = [
    {
      key: 'dataset',
      done: datasetReady,
      title: t('common.reportBuilder.readiness.datasetTitle'),
      description: t('common.reportBuilder.readiness.datasetDescription'),
    },
    {
      key: 'visual',
      done: Boolean(config.chartType),
      title: t('common.reportBuilder.readiness.visualTitle'),
      description: t('common.reportBuilder.readiness.visualDescription'),
    },
    {
      key: 'axis',
      done: hasAxis,
      title: t('common.reportBuilder.readiness.axisTitle'),
      description: t('common.reportBuilder.readiness.axisDescription'),
    },
    {
      key: 'value',
      done: hasValue,
      title: t('common.reportBuilder.readiness.valueTitle'),
      description: t('common.reportBuilder.readiness.valueDescription'),
    },
  ];

  const previewRunnerRef = useRef<{ execute: () => void; cancel: () => void } | null>(null);
  const nextStep = !datasetReady
    ? {
        title: t('common.reportBuilder.nextStepDatasetTitle'),
        description: t('common.reportBuilder.nextStepDatasetDescription'),
        actionLabel: t('common.reportBuilder.nextStepDatasetAction'),
        action: () => checkDataSource(),
      }
    : !hasAxis || !hasValue
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

  const handleSave = async (): Promise<void> => {
    if (saveBlocked) {
      setUi({ toast: { message: reportHardBlockers[0], variant: 'error' } });
      return;
    }
    if (isEdit && reportId != null) {
      const report = await updateReport();
      if (report) navigate(`/reports/${report.id}`);
    } else {
      const report = await saveNewReport();
      if (report) navigate(`/reports/${report.id}`);
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

  const handleWidgetTemplate = useCallback(
    (template: 'dailyTrend' | 'categoryCompare' | 'summaryTable') => {
      const activeWidgetId = config.activeWidgetId ?? config.widgets?.[0]?.id;
      if (template === 'dailyTrend') {
        handleQuickSetup('trend');
        if (activeWidgetId) {
          setWidgetAppearance(activeWidgetId, {
            themePreset: 'executive',
            sectionLabel: t('common.reportBuilder.widgetTemplateLabels.dailyTrend'),
            sectionDescription: t('common.reportBuilder.widgetTemplateDescriptions.dailyTrend'),
            subtitle: t('common.reportBuilder.widgetTemplateSubtitles.dailyTrend'),
            seriesVisibilityMode: 'auto',
            seriesOverflowMode: 'others',
            maxVisibleSeries: 8,
          });
        }
        return;
      }
      if (template === 'categoryCompare') {
        handleQuickSetup('chart');
        if (activeWidgetId) {
          setWidgetAppearance(activeWidgetId, {
            themePreset: 'operations',
            sectionLabel: t('common.reportBuilder.widgetTemplateLabels.categoryCompare'),
            sectionDescription: t('common.reportBuilder.widgetTemplateDescriptions.categoryCompare'),
            subtitle: t('common.reportBuilder.widgetTemplateSubtitles.categoryCompare'),
            seriesVisibilityMode: 'limited',
            seriesOverflowMode: 'others',
            maxVisibleSeries: 5,
          });
        }
        return;
      }
      handleQuickSetup('table');
      if (activeWidgetId) {
        setWidgetAppearance(activeWidgetId, {
          themePreset: 'operations',
          sectionLabel: t('common.reportBuilder.widgetTemplateLabels.summaryTable'),
          sectionDescription: t('common.reportBuilder.widgetTemplateDescriptions.summaryTable'),
          subtitle: t('common.reportBuilder.widgetTemplateSubtitles.summaryTable'),
          tableDensity: 'comfortable',
        });
      }
    },
    [config.activeWidgetId, config.widgets, handleQuickSetup, setWidgetAppearance, t],
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

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={pointerWithin}
      onDragEnd={handleDragEnd}
    >
      <div className="flex h-[calc(100vh-4rem)] min-h-0 flex-col gap-4 p-4">
        <div className="shrink-0 rounded-2xl border bg-linear-to-r from-slate-50 via-white to-sky-50 px-5 py-4 shadow-xs dark:from-slate-950 dark:via-slate-950 dark:to-slate-900">
          <div className="flex flex-wrap items-start gap-4">
            <div className="min-w-[260px] flex-1">
              <div className="mb-3 flex items-center gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => navigate('/reports')}>
                  <ArrowLeft className="mr-1 size-4" />
                  {t('common.back')}
                </Button>
                <Badge variant="outline" className="font-mono">{lifecycleStatusLabel}</Badge>
                <Badge variant="secondary" className="font-mono">v{lifecycle.version}</Badge>
              </div>
              <h1 className="text-xl font-semibold">
                {isEdit ? t('common.reportBuilder.editStudioTitle') : t('common.reportBuilder.newStudioTitle')}
              </h1>
              <p className="text-muted-foreground mt-2 max-w-3xl text-sm">
                {t('common.reportBuilder.studioDescription')}
              </p>
              <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                {builderReadinessSteps.map((step, index) => (
                  <div key={step.key} className={`rounded-xl border px-3 py-2 text-xs ${step.done ? 'border-emerald-200 bg-emerald-50/80 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300' : 'bg-background text-muted-foreground'}`}>
                    <div className="font-semibold">{index + 1}. {step.title}</div>
                    <div className="mt-1 text-[11px]">{step.description}</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="grid min-w-[300px] gap-3 md:grid-cols-3">
              <div className="rounded-xl border bg-background p-3">
                <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  <Database className="size-4 text-primary" />
                  {t('common.reportBuilder.datasetHealth')}
                </div>
                <div className="text-sm font-semibold">
                  {datasetReady ? meta.dataSourceName : t('common.reportBuilder.notConnected')}
                </div>
                <div className="text-muted-foreground mt-1 text-xs">
                  {datasetReady ? t('common.reportBuilder.datasetChecked') : t('common.reportBuilder.datasetPending')}
                </div>
              </div>
              <div className="rounded-xl border bg-background p-3">
                <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  <LayoutGrid className="size-4 text-primary" />
                  {t('common.reportBuilder.widgetSummary')}
                </div>
                <div className="text-2xl font-semibold">{widgetsCount}</div>
                <div className="text-muted-foreground mt-1 text-xs">{t('common.reportBuilder.widgetSummaryDescription')}</div>
              </div>
              <div className="rounded-xl border bg-background p-3">
                <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  <BarChart3 className="size-4 text-primary" />
                  {t('common.reportBuilder.fieldSummary')}
                </div>
                <div className="text-2xl font-semibold">{fieldsCount}</div>
                <div className="text-muted-foreground mt-1 text-xs">{t('common.reportBuilder.fieldSummaryDescription')}</div>
              </div>
              <div className="rounded-xl border bg-background p-3 md:col-span-3">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    <CheckCircle2 className="size-4 text-primary" />
                    {t('common.reportBuilder.qualityTitle')}
                  </div>
                  <Badge variant={reportQualityScore >= 84 ? 'default' : reportQualityScore >= 60 ? 'secondary' : 'destructive'}>
                    {reportQualityScore}/100
                  </Badge>
                </div>
                {reportQualityIssues.length > 0 ? (
                  <div className="space-y-1.5">
                    <div className="text-sm font-medium">{t('common.reportBuilder.qualityNeedsAttention')}</div>
                    <ul className="text-muted-foreground space-y-1 text-xs">
                      {reportQualityIssues.slice(0, 3).map((issue) => (
                        <li key={issue}>• {issue}</li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <div className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
                    {t('common.reportBuilder.qualityReady')}
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="mr-2 flex rounded-xl border bg-background p-1">
                <Button
                  type="button"
                  size="sm"
                  variant={builderMode === 'basic' ? 'default' : 'ghost'}
                  onClick={() => setBuilderMode('basic')}
                >
                  {t('common.reportBuilder.basicMode')}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={builderMode === 'advanced' ? 'default' : 'ghost'}
                  onClick={() => setBuilderMode('advanced')}
                >
                  {t('common.reportBuilder.advancedMode')}
                </Button>
              </div>
              {isEdit && (
                <Button variant="outline" asChild>
                  <Link to={`/reports/${reportId}/edit/preview`} target="_blank" rel="noreferrer">
                    {t('common.reportBuilder.preview')}
                  </Link>
                </Button>
              )}
              {isEdit && (
                <Button variant="outline" onClick={() => navigate(`/reports/${reportId}`)}>
                  {t('common.cancel')}
                </Button>
              )}
              <Button onClick={handleSave} disabled={ui.saveLoading}>
                {ui.saveLoading && <Loader2 className="mr-2 size-4 animate-spin" />}
                {isEdit ? t('common.update') : t('common.save')}
              </Button>
            </div>
          </div>
        </div>
        {saveBlocked ? (
          <div className="rounded-2xl border border-destructive/40 bg-destructive/5 p-4">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-[260px] flex-1">
                <div className="mb-2 flex items-center gap-2 text-destructive">
                  <TriangleAlert className="size-4" />
                  <h2 className="text-sm font-semibold">{t('common.reportBuilder.saveBlockedTitle')}</h2>
                </div>
                <p className="text-sm text-foreground">{t('common.reportBuilder.saveBlockedDescription')}</p>
                <ul className="mt-3 space-y-1 text-xs text-muted-foreground">
                  {reportHardBlockers.slice(0, 5).map((blocker) => (
                    <li key={blocker}>• {blocker}</li>
                  ))}
                </ul>
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={handleSmartComplete}>
                  {t('common.reportBuilder.smartComplete')}
                </Button>
                {chartRepairPlan ? (
                  <Button type="button" variant="outline" onClick={handleAutoRepairVisualization}>
                    {chartRepairPlan.buttonLabel}
                  </Button>
                ) : null}
              </div>
            </div>
          </div>
        ) : null}
        <TopBarSelector
          connections={connections}
          dataSources={dataSources}
          dataSourceParameters={dataSourceParameters}
          datasetParameterBindings={config.datasetParameters ?? []}
          connectionKey={meta.connectionKey}
          dataSourceType={meta.dataSourceType}
          dataSourceName={meta.dataSourceName}
          dataSourceSearch={dataSourceSearch}
          connectionsLoading={ui.connectionsLoading}
          dataSourcesLoading={ui.dataSourcesLoading}
          checkLoading={ui.checkLoading}
          onConnectionChange={setConnectionKey}
          onTypeChange={setType}
          onNameChange={setDataSourceName}
          onParameterBindingChange={setDatasetParameterBinding}
          onSearchChange={setDataSourceSearch}
          onCheck={checkDataSource}
        />

        <div className="rounded-2xl border bg-card p-4">
          <div className="mb-3">
            <h2 className="text-sm font-semibold">{t('common.reportBuilder.sharedWith')}</h2>
            <p className="text-muted-foreground mt-1 text-xs">{t('common.reportBuilder.sharedWithDescription')}</p>
          </div>
          <div className="grid gap-3 xl:grid-cols-[320px_1fr]">
            <Combobox
              options={userOptions.filter((option) => !assignedUserIds.includes(Number(option.value)))}
              onValueChange={handleAddAssignedUser}
              placeholder={t('common.reportBuilder.sharedWithSelect')}
              searchPlaceholder={t('common.reportBuilder.sharedWithSearch')}
              emptyText={t('common.reportBuilder.sharedWithEmpty')}
            />
          </div>
          <div className="mt-3 rounded-xl border bg-background">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('common.reportBuilder.assignedUserName')}</TableHead>
                  <TableHead>{t('common.reportBuilder.assignedUserEmail')}</TableHead>
                  <TableHead className="w-[120px]">{t('common.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
              {selectedAssignedUsers.length > 0 ? (
                selectedAssignedUsers.map((user) => {
                  const parts = user.label.match(/^(.*)\s+\((.*)\)$/);
                  const name = parts?.[1] ?? user.label;
                  const email = parts?.[2] ?? '-';
                  return (
                    <TableRow key={user.userId}>
                      <TableCell className="font-medium">{name}</TableCell>
                      <TableCell>{email}</TableCell>
                      <TableCell>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setRemoveAssignedUserId(user.userId)}
                        >
                          {t('common.remove')}
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={3} className="text-muted-foreground">
                    {t('common.reportBuilder.sharedWithNone')}
                  </TableCell>
                </TableRow>
              )}
              </TableBody>
            </Table>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4 rounded-2xl border bg-card p-4">
          <div className="flex-1 space-y-1 min-w-[200px]">
            <Label>{t('common.reportBuilder.reportName')}</Label>
            <Input
              placeholder={t('common.reportBuilder.reportName')}
              value={meta.name}
              onChange={(e) => setMeta({ name: e.target.value })}
              className="max-w-md"
            />
          </div>
          <div className="flex items-center gap-2 rounded-xl border bg-muted/30 px-3 py-2 text-sm">
            <CheckCircle2 className="size-4 text-primary" />
            <span className="font-medium uppercase">{lifecycleStatusLabel}</span>
            <span className="text-muted-foreground">v{lifecycle.version}</span>
          </div>
          <div className="flex items-end gap-2">
            <Button type="button" variant="outline" onClick={() => setLifecycleStatus('draft')}>
              {t('common.reportBuilder.lifecycle.draft')}
            </Button>
            <Button type="button" variant="outline" onClick={() => setLifecycleStatus('published')}>
              {t('common.reportBuilder.lifecycle.publish')}
            </Button>
            <Button type="button" variant="outline" onClick={() => setLifecycleStatus('archived')}>
              {t('common.reportBuilder.lifecycle.archive')}
            </Button>
          </div>
          <div className="flex items-center gap-2 rounded-full border bg-background px-3 py-2 text-xs text-muted-foreground">
            <Sparkles className="size-3.5" />
            {t('common.reportBuilder.builderHint')}
          </div>
        </div>

        {datasetReady ? (
          <div className="rounded-2xl border bg-card p-4">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-[280px] flex-1">
                <div className="mb-2 flex items-center gap-2">
                  <Lightbulb className="size-4 text-primary" />
                  <h2 className="text-sm font-semibold">{t('common.reportBuilder.narrativeTitle')}</h2>
                </div>
                <p className="text-sm leading-6 text-foreground">{reportNarrative}</p>
                <p className="text-muted-foreground mt-2 text-xs">{t('common.reportBuilder.narrativeHint')}</p>
              </div>
              <div className="min-w-[260px] rounded-xl border bg-muted/30 p-3">
                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {t('common.reportBuilder.recommendedVisualTitle')}
                </div>
                <div className="mt-2 text-sm font-semibold">{recommendedChartLabel}</div>
                <p className="text-muted-foreground mt-1 text-xs">
                  {chartNeedsSimplification
                    ? t('common.reportBuilder.recommendedVisualTooManySeries', { count: previewSeriesCount })
                    : t('common.reportBuilder.recommendedVisualNormal')}
                </p>
                {config.chartType !== recommendedChartType ? (
                  <Button type="button" variant="outline" className="mt-3" onClick={() => setChartType(recommendedChartType)}>
                    {t('common.reportBuilder.applyRecommendedVisual')}
                  </Button>
                ) : null}
              </div>
            </div>
          </div>
        ) : null}

        {datasetReady && chartRepairPlan ? (
          <div className="rounded-2xl border border-rose-300 bg-rose-50/80 p-4 dark:border-rose-900 dark:bg-rose-950/20">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-[280px] flex-1">
                <div className="mb-2 flex items-center gap-2 text-rose-700 dark:text-rose-300">
                  <TriangleAlert className="size-4" />
                  <h2 className="text-sm font-semibold">{chartRepairPlan.title}</h2>
                </div>
                <p className="text-sm text-rose-900 dark:text-rose-100">{chartRepairPlan.description}</p>
              </div>
              <div className="flex items-center gap-2">
                <Button type="button" variant="outline" onClick={handleAutoRepairVisualization}>
                  {chartRepairPlan.buttonLabel}
                </Button>
              </div>
            </div>
          </div>
        ) : null}

        {datasetReady ? (
          <div className="rounded-2xl border bg-card p-4">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-[260px] flex-1">
                <h2 className="text-sm font-semibold">{t('common.reportBuilder.wizardTitle')}</h2>
                <p className="text-muted-foreground mt-1 text-xs">{t('common.reportBuilder.wizardDescription')}</p>
                <p className="mt-3 text-sm font-medium">{wizardSummary}</p>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setWizardStep(1);
                  setWizardOpen(true);
                }}
              >
                <Sparkles className="mr-2 size-4" />
                {t('common.reportBuilder.openWizard')}
              </Button>
            </div>
          </div>
        ) : null}

        {datasetReady ? (
          <div className="rounded-2xl border bg-card p-4">
            <div className="mb-3">
              <h2 className="text-sm font-semibold">{t('common.reportBuilder.datasetCoachTitle')}</h2>
              <p className="text-muted-foreground mt-1 text-xs">{t('common.reportBuilder.datasetCoachDescription')}</p>
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-xl border bg-background p-3">
                <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{t('common.reportBuilder.axis')}</div>
                <div className="mt-1 text-sm font-medium">{getFieldLabel(recommendedAxisField?.name)}</div>
                <div className="text-muted-foreground mt-1 text-xs">{t('common.reportBuilder.datasetCoachAxisHint')}</div>
                {recommendedAxisField ? (
                  <Button type="button" variant="outline" className="mt-3" onClick={() => handleQuickUseAxis(recommendedAxisField)}>
                    {t('common.reportBuilder.use')}
                  </Button>
                ) : null}
              </div>
              <div className="rounded-xl border bg-background p-3">
                <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{t('common.reportBuilder.values')}</div>
                <div className="mt-1 text-sm font-medium">{getFieldLabel(recommendedValueField?.name)}</div>
                <div className="text-muted-foreground mt-1 text-xs">{t('common.reportBuilder.datasetCoachValueHint')}</div>
                {recommendedValueField ? (
                  <Button type="button" variant="outline" className="mt-3" onClick={() => handleQuickUseValue(recommendedValueField)}>
                    {t('common.reportBuilder.use')}
                  </Button>
                ) : null}
              </div>
              <div className="rounded-xl border bg-background p-3">
                <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{t('common.reportBuilder.legend')}</div>
                <div className="mt-1 text-sm font-medium">{getFieldLabel(recommendedLegendField?.name)}</div>
                <div className="text-muted-foreground mt-1 text-xs">{t('common.reportBuilder.datasetCoachLegendHint')}</div>
                {recommendedLegendField ? (
                  <Button type="button" variant="outline" className="mt-3" onClick={() => handleQuickUseLegend(recommendedLegendField)}>
                    {t('common.reportBuilder.use')}
                  </Button>
                ) : null}
              </div>
            </div>
          </div>
        ) : null}

        {datasetReady ? (
          <div className="rounded-2xl border bg-card p-4">
            <div className="mb-3">
              <h2 className="text-sm font-semibold">{t('common.reportBuilder.quickStartTitle')}</h2>
              <p className="text-muted-foreground mt-1 text-xs">
                {t('common.reportBuilder.quickStartDescription')}
              </p>
            </div>
            <div className="grid gap-2 md:grid-cols-4">
              <Button type="button" variant="outline" onClick={() => handleQuickSetup('table')}>
                {t('common.reportBuilder.quickStartTable')}
              </Button>
              <Button type="button" variant="outline" onClick={() => handleQuickSetup('chart')}>
                {t('common.reportBuilder.quickStartChart')}
              </Button>
              <Button type="button" variant="outline" onClick={() => handleQuickSetup('trend')}>
                {t('common.reportBuilder.quickStartTrend')}
              </Button>
              <Button type="button" variant="outline" onClick={() => handleQuickSetup('kpi')}>
                {t('common.reportBuilder.quickStartKpi')}
              </Button>
            </div>
          </div>
        ) : null}

        {datasetReady ? (
          <div className="rounded-2xl border bg-card p-4">
            <div className="mb-3">
              <h2 className="text-sm font-semibold">{t('common.reportBuilder.widgetTemplatesTitle')}</h2>
              <p className="text-muted-foreground mt-1 text-xs">
                {t('common.reportBuilder.widgetTemplatesDescription')}
              </p>
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              <Button type="button" variant="outline" className="h-auto justify-start px-4 py-3 text-left" onClick={() => handleWidgetTemplate('dailyTrend')}>
                <div>
                  <div className="font-semibold">{t('common.reportBuilder.widgetTemplateLabels.dailyTrend')}</div>
                  <div className="text-muted-foreground mt-1 text-xs">{t('common.reportBuilder.widgetTemplateDescriptions.dailyTrend')}</div>
                </div>
              </Button>
              <Button type="button" variant="outline" className="h-auto justify-start px-4 py-3 text-left" onClick={() => handleWidgetTemplate('categoryCompare')}>
                <div>
                  <div className="font-semibold">{t('common.reportBuilder.widgetTemplateLabels.categoryCompare')}</div>
                  <div className="text-muted-foreground mt-1 text-xs">{t('common.reportBuilder.widgetTemplateDescriptions.categoryCompare')}</div>
                </div>
              </Button>
              <Button type="button" variant="outline" className="h-auto justify-start px-4 py-3 text-left" onClick={() => handleWidgetTemplate('summaryTable')}>
                <div>
                  <div className="font-semibold">{t('common.reportBuilder.widgetTemplateLabels.summaryTable')}</div>
                  <div className="text-muted-foreground mt-1 text-xs">{t('common.reportBuilder.widgetTemplateDescriptions.summaryTable')}</div>
                </div>
              </Button>
            </div>
          </div>
        ) : null}

        {datasetReady ? (
          <div className="rounded-2xl border bg-card p-4">
            <div className="mb-3">
              <h2 className="text-sm font-semibold">{t('common.reportBuilder.starterKitTitle')}</h2>
              <p className="text-muted-foreground mt-1 text-xs">{t('common.reportBuilder.starterKitDescription')}</p>
            </div>
            <div className={`grid gap-3 ${builderMode === 'basic' ? 'md:grid-cols-3' : 'md:grid-cols-3'}`}>
              <Button type="button" variant="outline" className="h-auto justify-start px-4 py-3 text-left" onClick={() => handleStarterKit('executive')}>
                <div>
                  <div className="font-semibold">{t('common.reportBuilder.starterKitLabels.executive')}</div>
                  <div className="text-muted-foreground mt-1 text-xs">{t('common.reportBuilder.starterKitDescriptions.executive')}</div>
                </div>
              </Button>
              <Button type="button" variant="outline" className="h-auto justify-start px-4 py-3 text-left" onClick={() => handleStarterKit('operations')}>
                <div>
                  <div className="font-semibold">{t('common.reportBuilder.starterKitLabels.operations')}</div>
                  <div className="text-muted-foreground mt-1 text-xs">{t('common.reportBuilder.starterKitDescriptions.operations')}</div>
                </div>
              </Button>
              <Button type="button" variant="outline" className="h-auto justify-start px-4 py-3 text-left" onClick={() => handleStarterKit('performance')}>
                <div>
                  <div className="font-semibold">{t('common.reportBuilder.starterKitLabels.performance')}</div>
                  <div className="text-muted-foreground mt-1 text-xs">{t('common.reportBuilder.starterKitDescriptions.performance')}</div>
                </div>
              </Button>
            </div>
          </div>
        ) : null}

        {datasetReady && builderMode === 'basic' ? (
          <div className="rounded-2xl border bg-card p-4">
            <div className="mb-3">
              <h2 className="text-sm font-semibold">{t('common.reportBuilder.basicBigChoiceTitle')}</h2>
              <p className="text-muted-foreground mt-1 text-xs">{t('common.reportBuilder.basicBigChoiceDescription')}</p>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <button
                type="button"
                className="rounded-2xl border bg-background p-5 text-left transition-colors hover:border-primary hover:bg-primary/5"
                onClick={() => handleStarterKit('executive')}
              >
                <div className="text-base font-semibold">{t('common.reportBuilder.starterKitLabels.executive')}</div>
                <div className="text-muted-foreground mt-2 text-sm">{t('common.reportBuilder.basicChoiceExecutive')}</div>
              </button>
              <button
                type="button"
                className="rounded-2xl border bg-background p-5 text-left transition-colors hover:border-primary hover:bg-primary/5"
                onClick={() => handleStarterKit('operations')}
              >
                <div className="text-base font-semibold">{t('common.reportBuilder.starterKitLabels.operations')}</div>
                <div className="text-muted-foreground mt-2 text-sm">{t('common.reportBuilder.basicChoiceOperations')}</div>
              </button>
              <button
                type="button"
                className="rounded-2xl border bg-background p-5 text-left transition-colors hover:border-primary hover:bg-primary/5"
                onClick={() => handleStarterKit('performance')}
              >
                <div className="text-base font-semibold">{t('common.reportBuilder.starterKitLabels.performance')}</div>
                <div className="text-muted-foreground mt-2 text-sm">{t('common.reportBuilder.basicChoicePerformance')}</div>
              </button>
            </div>
          </div>
        ) : null}

        {datasetReady ? (
          <div className="rounded-2xl border bg-card p-4">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-[260px] flex-1">
                <h2 className="text-sm font-semibold">{t('common.reportBuilder.guidedSetupTitle')}</h2>
                <p className="text-muted-foreground mt-1 text-xs">
                  {t('common.reportBuilder.guidedSetupDescription')}
                </p>
                <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                  <div className={`rounded-xl border px-3 py-2 text-xs ${hasAxis ? 'border-emerald-200 bg-emerald-50/80 dark:border-emerald-900 dark:bg-emerald-950/40' : 'bg-background'}`}>
                    <div className="font-semibold">{t('common.reportBuilder.axis')}</div>
                    <div className="mt-1 text-muted-foreground">{hasAxis ? config.axis?.field : t('common.reportBuilder.guidedMissingAxis')}</div>
                  </div>
                  <div className={`rounded-xl border px-3 py-2 text-xs ${hasValue ? 'border-emerald-200 bg-emerald-50/80 dark:border-emerald-900 dark:bg-emerald-950/40' : 'bg-background'}`}>
                    <div className="font-semibold">{t('common.reportBuilder.values')}</div>
                    <div className="mt-1 text-muted-foreground">{hasValue ? config.values.map((value) => value.field).join(', ') : t('common.reportBuilder.guidedMissingValue')}</div>
                  </div>
                  <div className={`rounded-xl border px-3 py-2 text-xs ${hasLegend ? 'border-emerald-200 bg-emerald-50/80 dark:border-emerald-900 dark:bg-emerald-950/40' : 'bg-background'}`}>
                    <div className="font-semibold">{t('common.reportBuilder.legend')}</div>
                    <div className="mt-1 text-muted-foreground">{hasLegend ? config.legend?.field : t('common.reportBuilder.guidedOptionalLegend')}</div>
                  </div>
                  <div className={`rounded-xl border px-3 py-2 text-xs ${hasFilters ? 'border-emerald-200 bg-emerald-50/80 dark:border-emerald-900 dark:bg-emerald-950/40' : 'bg-background'}`}>
                    <div className="font-semibold">{t('common.filters')}</div>
                    <div className="mt-1 text-muted-foreground">{hasFilters ? String(config.filters.length) : t('common.reportBuilder.guidedOptionalFilter')}</div>
                  </div>
                </div>
              </div>
              <div className="flex min-w-[220px] flex-col gap-2">
                <Button type="button" onClick={handleSmartComplete} variant="outline">
                  <Sparkles className="mr-2 size-4" />
                  {t('common.reportBuilder.smartComplete')}
                </Button>
                {!hasValue && firstValueField ? (
                  <Button type="button" variant="secondary" onClick={() => handleQuickUseValue(firstValueField)}>
                    {t('common.reportBuilder.addRecommendedValue', { field: firstValueField.displayName || firstValueField.name })}
                  </Button>
                ) : null}
                {!hasAxis && firstAxisField ? (
                  <Button type="button" variant="secondary" onClick={() => handleQuickUseAxis(firstAxisField)}>
                    {t('common.reportBuilder.addRecommendedAxis', { field: firstAxisField.displayName || firstAxisField.name })}
                  </Button>
                ) : null}
              </div>
            </div>
          </div>
        ) : null}

        {datasetReady && chartNeedsSimplification ? (
          <div className="rounded-2xl border border-amber-300 bg-amber-50/80 p-4 dark:border-amber-900 dark:bg-amber-950/30">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-[280px] flex-1">
                <div className="mb-2 flex items-center gap-2 text-amber-700 dark:text-amber-300">
                  <TriangleAlert className="size-4" />
                  <h2 className="text-sm font-semibold">{t('common.reportBuilder.guardrailTitle')}</h2>
                </div>
                <p className="text-sm text-amber-900 dark:text-amber-100">
                  {t('common.reportBuilder.guardrailTooManySeries', { count: previewSeriesCount })}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" onClick={() => setChartType('table')}>
                  {t('common.reportBuilder.guardrailSwitchTable')}
                </Button>
                <Button type="button" variant="outline" onClick={() => setChartType('bar')}>
                  {t('common.reportBuilder.guardrailSwitchBar')}
                </Button>
              </div>
            </div>
          </div>
        ) : null}

        <div className="rounded-2xl border bg-card p-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-[260px] flex-1">
              <h2 className="text-sm font-semibold">{t('common.reportBuilder.nextStepTitle')}</h2>
              <p className="mt-1 text-sm font-medium">{nextStep.title}</p>
              <p className="text-muted-foreground mt-1 text-xs">{nextStep.description}</p>
            </div>
            <Button type="button" onClick={nextStep.action}>
              {nextStep.actionLabel}
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 rounded-2xl border bg-card p-4">
          <div className="flex items-center gap-2 text-sm font-medium">
            <LayoutGrid className="size-4 text-muted-foreground" />
            {t('common.reportBuilder.widgets')}
          </div>
          <div className="flex flex-1 flex-wrap gap-2">
            {(config.widgets ?? []).map((widget) => {
              const isActive = widget.id === config.activeWidgetId;
              const widgetIndex = (config.widgets ?? []).findIndex((item) => item.id === widget.id);
              const canMoveLeft = widgetIndex > 0;
              const canMoveRight = widgetIndex >= 0 && widgetIndex < (config.widgets?.length ?? 0) - 1;
              return (
                <div
                  key={widget.id}
                  className={`flex items-center gap-2 rounded-md border px-2 py-1 ${isActive ? 'border-primary bg-primary/5' : 'border-border bg-background'}`}
                >
                  <Input
                    value={widget.title}
                    onChange={(e) => renameWidget(widget.id, e.target.value)}
                    onFocus={() => setActiveWidget(widget.id)}
                    className="h-8 min-w-[140px] border-0 bg-transparent px-1 shadow-none"
                  />
                  <Button type="button" variant="ghost" size="icon-sm" onClick={() => setActiveWidget(widget.id)}>
                    {t(`common.reportBuilder.chartTypes.${widget.chartType}`)}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => canMoveLeft && reorderWidgets(widgetIndex, widgetIndex - 1)}
                    disabled={!canMoveLeft}
                  >
                    <ArrowLeft className="size-3.5" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => canMoveRight && reorderWidgets(widgetIndex, widgetIndex + 1)}
                    disabled={!canMoveRight}
                  >
                    <ArrowRight className="size-3.5" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={() =>
                      setWidgetSize(
                        widget.id,
                        widget.size === 'third' ? 'half' : widget.size === 'half' ? 'full' : 'third'
                      )
                    }
                    title={widgetSizeLabel(widget.size)}
                  >
                    {widget.size === 'full' ? '1/1' : widget.size === 'half' ? '1/2' : '1/3'}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={() =>
                      setWidgetHeight(
                        widget.id,
                        widget.height === 'sm' ? 'md' : widget.height === 'md' ? 'lg' : 'sm'
                      )
                    }
                    title={widgetHeightLabel(widget.height)}
                  >
                    {widget.height === 'lg' ? 'H3' : widget.height === 'md' ? 'H2' : 'H1'}
                  </Button>
                  {(config.widgets?.length ?? 0) > 1 && (
                    <Button type="button" variant="ghost" size="icon-sm" onClick={() => setDeleteWidgetId(widget.id)}>
                      <Trash2 className="size-3.5" />
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
          <Button type="button" variant="outline" onClick={addWidget}>
            <Plus className="mr-2 size-4" />
            {t('common.reportBuilder.addWidget')}
          </Button>
        </div>

        {ui.toast && (
          <div className="fixed right-4 top-4 z-50 max-w-sm">
            <Toast
              message={ui.toast.message}
              variant={ui.toast.variant}
              onDismiss={() => setUi({ toast: null })}
            />
          </div>
        )}

        <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 overflow-hidden xl:grid-cols-[280px_1fr_340px]">
          <div className="flex min-h-0 flex-col overflow-hidden rounded-2xl border bg-card p-4">
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

          <div className="flex min-h-0 flex-col overflow-y-auto pr-1">
            <div className="shrink-0">
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
            </div>
            <div className="mt-4 min-h-0 pb-2">
              <DashboardLayoutPreview
                widgets={config.widgets ?? []}
                activeWidgetId={config.activeWidgetId}
                onSelect={setActiveWidget}
                onReorder={reorderWidgets}
              />
            </div>
          </div>

          <div className="flex min-h-0 flex-col overflow-hidden rounded-2xl border bg-card p-4">
            <h3 className="text-muted-foreground mb-1 text-sm font-medium">{t('common.reportBuilder.properties')}</h3>
            <p className="text-muted-foreground mb-3 text-xs">
              {builderMode === 'basic' ? t('common.reportBuilder.propertiesDescriptionBasic') : t('common.reportBuilder.propertiesDescription')}
            </p>
            {ui.slotError ? (
              <div className="mb-3 rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm">
                <div className="font-semibold text-destructive">{t('common.reportBuilder.needAttentionTitle')}</div>
                <div className="mt-1 text-muted-foreground">{ui.slotError}</div>
              </div>
            ) : null}
            {builderMode === 'basic' ? (
              <div className="mb-4 rounded-xl border bg-muted/20 p-4">
                <div className="mb-3">
                  <h4 className="text-sm font-semibold">{t('common.reportBuilder.basicSummaryTitle')}</h4>
                  <p className="text-muted-foreground mt-1 text-xs">{t('common.reportBuilder.basicSummaryDescription')}</p>
                </div>
                <div className="grid gap-2">
                  <div className="rounded-lg border bg-background p-3">
                    <div className="text-muted-foreground text-[11px] uppercase tracking-wide">{t('common.reportBuilder.basicSummaryVisual')}</div>
                    <div className="mt-1 text-sm font-medium">{t(`common.reportBuilder.chartTypes.${config.chartType}`)}</div>
                  </div>
                  <div className="rounded-lg border bg-background p-3">
                    <div className="text-muted-foreground text-[11px] uppercase tracking-wide">{t('common.reportBuilder.basicSummaryGroupBy')}</div>
                    <div className="mt-1 text-sm font-medium">
                      {config.chartType === 'kpi' ? t('common.reportBuilder.basicKpiNoGrouping') : getFieldLabel(config.axis?.field)}
                    </div>
                  </div>
                  <div className="rounded-lg border bg-background p-3">
                    <div className="text-muted-foreground text-[11px] uppercase tracking-wide">{t('common.reportBuilder.basicSummaryMetric')}</div>
                    <div className="mt-1 text-sm font-medium">{getFieldLabel(config.values[0]?.field)}</div>
                  </div>
                  <div className="rounded-lg border bg-background p-3">
                    <div className="text-muted-foreground text-[11px] uppercase tracking-wide">{t('common.reportBuilder.basicSummaryAggregation')}</div>
                    <div className="mt-1 text-sm font-medium">
                      {config.values[0]?.aggregation ? t(`common.reportBuilder.aggregations.${config.values[0].aggregation}`) : t('common.reportBuilder.basicNoneSelected')}
                    </div>
                  </div>
                  <div className="rounded-lg border bg-background p-3">
                    <div className="text-muted-foreground text-[11px] uppercase tracking-wide">{t('common.reportBuilder.basicSummaryBreakdown')}</div>
                    <div className="mt-1 text-sm font-medium">
                      {config.legend?.field ? getFieldLabel(config.legend.field) : t('common.reportBuilder.basicNoBreakdown')}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
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
            )}
            <PropertiesPanel schema={schema} slotError={ui.slotError} disabled={!dataSourceChecked} mode={builderMode} />
          </div>
        </div>
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

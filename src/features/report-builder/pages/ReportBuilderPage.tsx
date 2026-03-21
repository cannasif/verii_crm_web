import type { ReactElement } from 'react';
import { useEffect, useRef, useCallback, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
  validateKpiConfig,
  validateMatrixConfig,
  validatePieConfig,
} from '../utils';
import type { Field } from '../types';
import { Loader2 } from 'lucide-react';
import { ArrowLeft, ArrowRight, LayoutGrid, Plus, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

function getSlotTypeFromId(id: string): 'axis' | 'values' | 'legend' | 'filters' | null {
  if (id === 'slot-axis') return 'axis';
  if (id === 'slot-values') return 'values';
  if (id === 'slot-legend') return 'legend';
  if (id === 'slot-filters') return 'filters';
  return null;
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
    checkDataSource,
    setMeta,
    setFieldsSearch,
    addToSlot,
    addWidget,
    setActiveWidget,
    renameWidget,
    removeWidget,
    setWidgetSize,
    setWidgetHeight,
    reorderWidgets,
    setLifecycleStatus,
    setUi,
    saveNewReport,
    updateReport,
    loadReportById,
  } = useReportBuilderStore();
  const [dataSourceSearch, setDataSourceSearch] = useState('');
  const lifecycle = config.lifecycle ?? { status: 'draft' as const, version: 1 };
  const widgetSizeLabel = (size?: 'third' | 'half' | 'full'): string => t(`common.reportBuilder.widgetSizes.${size ?? 'half'}`);
  const widgetHeightLabel = (height?: 'sm' | 'md' | 'lg'): string => t(`common.reportBuilder.widgetHeights.${height ?? 'md'}`);

  const previewRunnerRef = useRef<{ execute: () => void; cancel: () => void } | null>(null);

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
    [addToSlot, setUi]
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
    const pieError = config.chartType === 'pie' || config.chartType === 'donut' ? validatePieConfig(config) : null;
    const kpiError = config.chartType === 'kpi' ? validateKpiConfig(config) : null;
    const matrixError = config.chartType === 'matrix' ? validateMatrixConfig(config) : null;
    if ((config.chartType === 'pie' || config.chartType === 'donut') && pieError) return;
    if (config.chartType === 'kpi' && kpiError) return;
    if (config.chartType === 'matrix' && matrixError) return;
    previewRunnerRef.current?.execute();
  }, [dataSourceChecked, meta.connectionKey, meta.dataSourceType, meta.dataSourceName, config]);

  const handleSave = async (): Promise<void> => {
    if (isEdit && reportId != null) {
      const report = await updateReport();
      if (report) navigate(`/reports/${report.id}`);
    } else {
      const report = await saveNewReport();
      if (report) navigate(`/reports/${report.id}`);
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={pointerWithin}
      onDragEnd={handleDragEnd}
    >
      <div className="flex h-[calc(100vh-4rem)] flex-col gap-4 p-4">
        <TopBarSelector
          connections={connections}
          dataSources={dataSources}
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
          onSearchChange={setDataSourceSearch}
          onCheck={checkDataSource}
        />

        <div className="flex flex-wrap items-center gap-4 border-b pb-4">
          <div className="flex-1 space-y-1 min-w-[200px]">
            <Label>{t('common.reportBuilder.reportName')}</Label>
            <Input
              placeholder={t('common.reportBuilder.reportName')}
              value={meta.name}
              onChange={(e) => setMeta({ name: e.target.value })}
              className="max-w-md"
            />
          </div>
          <div className="flex items-center gap-2 rounded-md border bg-muted/30 px-3 py-2 text-sm">
            <span className="font-medium uppercase">{lifecycle.status}</span>
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
            <Button onClick={handleSave} disabled={ui.saveLoading}>
              {ui.saveLoading && <Loader2 className="mr-2 size-4 animate-spin" />}
              {isEdit ? t('common.update') : t('common.save')}
            </Button>
            {isEdit && (
              <Button variant="outline" onClick={() => navigate(`/reports/${reportId}`)}>
                {t('common.cancel')}
              </Button>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 rounded-lg border bg-card p-3">
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
                    <Button type="button" variant="ghost" size="icon-sm" onClick={() => removeWidget(widget.id)}>
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

        <div className="grid flex-1 grid-cols-[240px_1fr_280px] gap-4 overflow-hidden">
          <div className="flex flex-col overflow-hidden rounded-lg border bg-card p-4">
            <FieldsPanel
              schema={schema}
              calculatedFields={config.calculatedFields}
              search={fieldsSearch}
              onSearchChange={setFieldsSearch}
              disabled={!dataSourceChecked}
            />
          </div>

          <div className="flex min-h-0 flex-col overflow-hidden">
            <PreviewPanel
              title={t('common.reportBuilder.activeWidgetPreview')}
              subtitle={t('common.reportBuilder.activeWidgetPreviewDescription')}
              columns={preview.columns}
              rows={preview.rows}
              chartType={config.chartType}
              loading={ui.previewLoading}
              error={ui.error}
              empty={!dataSourceChecked}
            />
            <div className="mt-4">
              <DashboardLayoutPreview
                widgets={config.widgets ?? []}
                activeWidgetId={config.activeWidgetId}
                onSelect={setActiveWidget}
                onReorder={reorderWidgets}
              />
            </div>
          </div>

          <div className="sticky top-0 flex flex-col overflow-hidden rounded-lg border bg-card p-4">
            <h3 className="text-muted-foreground mb-2 text-sm font-medium">{t('common.reportBuilder.properties')}</h3>
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
            <PropertiesPanel schema={schema} slotError={ui.slotError} disabled={!dataSourceChecked} />
          </div>
        </div>
      </div>
    </DndContext>
  );
}

import type { ReactElement } from 'react';
import { useEffect, useRef, useCallback } from 'react';
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
import { Toast } from '../components/Toast';
import { useReportBuilderStore } from '../store';
import {
  isAxisCompatible,
  isValuesCompatible,
  isLegendCompatible,
  validatePieConfig,
} from '../utils';
import type { Field } from '../types';
import { Loader2 } from 'lucide-react';
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
    meta,
    schema,
    dataSourceChecked,
    fieldsSearch,
    config,
    preview,
    ui,
    loadConnections,
    setConnectionKey,
    setType,
    setDataSourceName,
    checkDataSource,
    setMeta,
    setFieldsSearch,
    addToSlot,
    setUi,
    saveNewReport,
    updateReport,
    loadReportById,
  } = useReportBuilderStore();

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
          message = 'Axis: string veya date alan gerekli';
        } else {
          addToSlot('axis', field.name);
        }
      } else if (slotType === 'values') {
        if (!isValuesCompatible(field)) {
          invalid = true;
          message = 'Values: numeric alan gerekli';
        } else {
          addToSlot('values', field.name);
        }
      } else if (slotType === 'legend') {
        if (!isLegendCompatible(field)) {
          invalid = true;
          message = 'Legend: string alan gerekli';
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
    const runner = useReportBuilderStore.getState().previewDebounced();
    previewRunnerRef.current = runner;
    return () => runner.cancel();
  }, []);

  useEffect(() => {
    if (!dataSourceChecked || !meta.connectionKey || !meta.dataSourceType || !meta.dataSourceName) return;
    const pieError = config.chartType === 'pie' ? validatePieConfig(config) : null;
    if (config.chartType === 'pie' && pieError) return;
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
          connectionKey={meta.connectionKey}
          dataSourceType={meta.dataSourceType}
          dataSourceName={meta.dataSourceName}
          connectionsLoading={ui.connectionsLoading}
          checkLoading={ui.checkLoading}
          onConnectionChange={setConnectionKey}
          onTypeChange={setType}
          onNameChange={setDataSourceName}
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
          <div className="flex items-end gap-2">
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
              search={fieldsSearch}
              onSearchChange={setFieldsSearch}
              disabled={!dataSourceChecked}
            />
          </div>

          <div className="flex min-h-0 flex-col overflow-hidden">
            <PreviewPanel
              columns={preview.columns}
              rows={preview.rows}
              chartType={config.chartType}
              loading={ui.previewLoading}
              error={ui.error}
              empty={!dataSourceChecked}
            />
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

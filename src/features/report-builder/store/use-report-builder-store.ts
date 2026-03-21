import { create } from 'zustand';
import i18next from 'i18next';
import { reportingApi } from '../api/reporting-api';
import { reportsApi } from '../api/reports-api';
import type {
  ReportConfig,
  ReportConfigSorting,
  ReportConfigFilter,
  ReportDto,
  Field,
  ConnectionDto,
  DataSourceCatalogItem,
  ChartType,
  Aggregation,
  DateGrouping,
  ReportWidget,
  CalculatedField,
  ReportHistoryEntry,
  ReportLifecycleStatus,
} from '../types';

function createDefaultWidget(id = 'widget-1', title = tr('common.reportBuilder.widgetTitleFallback', { index: 1 })): ReportWidget {
  return {
    id,
    title,
    size: 'half',
    height: 'md',
    chartType: 'table',
    values: [],
    filters: [],
  };
}

function tr(key: string, options?: Record<string, unknown>): string {
  return i18next.t(key, { ns: 'common', ...options });
}

function createConfigFromWidget(widget: ReportWidget, widgets?: ReportWidget[], activeWidgetId?: string): ReportConfig {
  return {
    chartType: widget.chartType,
    axis: widget.axis,
    values: widget.values,
    legend: widget.legend,
    sorting: widget.sorting,
    filters: widget.filters,
    widgets,
    activeWidgetId,
    lifecycle: { status: 'draft', version: 1 },
    history: [],
    governance: {
      audience: 'private',
      refreshCadence: 'manual',
      favorite: false,
      tags: [],
      sharedWith: [],
      subscriptionEnabled: false,
      subscriptionChannel: 'email',
      subscriptionFrequency: 'weekly',
      certified: false,
    },
  };
}

function ensureWidgets(config?: Partial<ReportConfig> | null): ReportConfig {
  const incoming = config ?? {};
  const widgets: ReportWidget[] = Array.isArray(incoming.widgets) && incoming.widgets.length > 0
    ? incoming.widgets
    : [
        {
          id: incoming.activeWidgetId ?? 'widget-1',
          title: tr('common.reportBuilder.widgetTitleFallback', { index: 1 }),
          size: 'half' as const,
          height: 'md' as const,
          chartType: incoming.chartType ?? 'table',
          axis: incoming.axis,
          values: incoming.values ?? [],
          legend: incoming.legend,
          sorting: incoming.sorting,
          filters: incoming.filters ?? [],
        },
      ];
  const activeWidgetId = incoming.activeWidgetId && widgets.some((widget) => widget.id === incoming.activeWidgetId)
    ? incoming.activeWidgetId
    : widgets[0].id;
  const activeWidget = widgets.find((widget) => widget.id === activeWidgetId) ?? widgets[0];
  return {
    ...createConfigFromWidget(activeWidget, widgets, activeWidgetId),
    calculatedFields: incoming.calculatedFields ?? [],
    lifecycle: incoming.lifecycle ?? { status: 'draft', version: 1 },
    history: incoming.history ?? [],
    governance: incoming.governance ?? {
      audience: 'private',
      refreshCadence: 'manual',
      favorite: false,
      tags: [],
      sharedWith: [],
      subscriptionEnabled: false,
      subscriptionChannel: 'email',
      subscriptionFrequency: 'weekly',
      certified: false,
    },
  };
}

const DEFAULT_CONFIG: ReportConfig = ensureWidgets();

interface BuilderMeta {
  id?: number;
  name: string;
  description?: string;
  connectionKey: string;
  dataSourceType: string;
  dataSourceName: string;
}

interface BuilderUI {
  connectionsLoading: boolean;
  dataSourcesLoading: boolean;
  checkLoading: boolean;
  previewLoading: boolean;
  saveLoading: boolean;
  error: string | null;
  slotError: string | null;
  toast: { message: string; variant: 'success' | 'error' } | null;
}

interface ReportBuilderState {
  connections: ConnectionDto[];
  dataSources: DataSourceCatalogItem[];
  meta: BuilderMeta;
  schema: Field[];
  dataSourceChecked: boolean;
  fieldsSearch: string;
  config: ReportConfig;
  preview: { columns: string[]; rows: unknown[][] };
  ui: BuilderUI;
  setMeta: (patch: Partial<BuilderMeta>) => void;
  setFieldsSearch: (v: string) => void;
  setConfig: (patch: Partial<ReportConfig>) => void;
  loadConnections: () => Promise<void>;
  loadDataSources: (search?: string) => Promise<void>;
  loadSchemaForCurrentDataSource: () => Promise<void>;
  setConnectionKey: (v: string) => void;
  setType: (v: string) => void;
  setDataSourceName: (v: string) => void;
  checkDataSource: () => Promise<void>;
  setChartType: (t: ChartType) => void;
  addWidget: () => void;
  setActiveWidget: (widgetId: string) => void;
  renameWidget: (widgetId: string, title: string) => void;
  setWidgetSize: (widgetId: string, size: 'third' | 'half' | 'full') => void;
  setWidgetHeight: (widgetId: string, height: 'sm' | 'md' | 'lg') => void;
  reorderWidgets: (fromIndex: number, toIndex: number) => void;
  removeWidget: (widgetId: string) => void;
  addToSlot: (slot: 'axis' | 'values' | 'legend' | 'filters', field: string, options?: { aggregation?: Aggregation }) => void;
  removeFromSlot: (slot: 'axis' | 'values' | 'legend' | 'filters', indexOrField: number | string) => void;
  reorderSlot: (slot: 'values' | 'filters', fromIndex: number, toIndex: number) => void;
  setAggregation: (valuesIndex: number, aggregation: Aggregation) => void;
  setDateGrouping: (grouping: DateGrouping) => void;
  setSorting: (s: ReportConfigSorting | null) => void;
  addFilter: (f: ReportConfigFilter) => void;
  addCalculatedField: (field: CalculatedField) => void;
  updateCalculatedField: (name: string, patch: Partial<CalculatedField>) => void;
  removeCalculatedField: (name: string) => void;
  setLifecycleStatus: (status: ReportLifecycleStatus) => void;
  setLifecycleReleaseNote: (releaseNote: string) => void;
  rollbackToHistory: (version: number) => void;
  setGovernanceMetadata: (patch: Partial<NonNullable<ReportConfig['governance']>>) => void;
  updateFilter: (index: number, patch: Partial<ReportConfigFilter>) => void;
  removeFilter: (index: number) => void;
  reorderFilter: (fromIndex: number, toIndex: number) => void;
  hydrateFromReportDetail: (report: ReportDto) => void;
  serializeConfigJson: () => string;
  previewDebounced: () => { execute: () => void; cancel: () => void };
  saveNewReport: () => Promise<ReportDto | null>;
  updateReport: () => Promise<ReportDto | null>;
  loadReportById: (id: number) => Promise<void>;
  setUi: (patch: Partial<BuilderUI>) => void;
  setPreview: (data: { columns: string[]; rows: unknown[][] }) => void;
  reset: () => void;
}

const defaultMeta: BuilderMeta = {
  name: '',
  connectionKey: '',
  dataSourceType: '',
  dataSourceName: '',
};

const defaultUi: BuilderUI = {
  connectionsLoading: false,
  dataSourcesLoading: false,
  checkLoading: false,
  previewLoading: false,
  saveLoading: false,
  error: null,
  slotError: null,
  toast: null,
};

const initialState = {
  connections: [] as ConnectionDto[],
  dataSources: [] as DataSourceCatalogItem[],
  meta: { ...defaultMeta },
  schema: [] as Field[],
  dataSourceChecked: false,
  fieldsSearch: '',
  config: { ...DEFAULT_CONFIG },
  preview: { columns: [] as string[], rows: [] as unknown[][] },
  ui: { ...defaultUi },
};

export const useReportBuilderStore = create<ReportBuilderState>((set, get) => ({
  ...initialState,

  setMeta: (patch) =>
    set((s) => ({ meta: { ...s.meta, ...patch } })),

  setFieldsSearch: (v) => set({ fieldsSearch: v }),

  setConfig: (patch) =>
    set((s) => ({ config: ensureWidgets({ ...s.config, ...patch }) })),

  setChartType: (t) =>
    set((s) => {
      const current = ensureWidgets(s.config);
      const widgets = (current.widgets ?? []).map((widget) =>
        widget.id === current.activeWidgetId ? { ...widget, chartType: t } : widget
      );
      return { config: ensureWidgets({ ...current, chartType: t, widgets }) };
    }),

  addWidget: () =>
    set((s) => {
      const current = ensureWidgets(s.config);
      const nextIndex = (current.widgets?.length ?? 0) + 1;
      const widget = createDefaultWidget(`widget-${Date.now()}`, tr('common.reportBuilder.widgetTitleFallback', { index: nextIndex }));
      const widgets = [...(current.widgets ?? []), widget];
      return { config: ensureWidgets({ ...current, widgets, activeWidgetId: widget.id }) };
    }),

  setActiveWidget: (widgetId) =>
    set((s) => {
      const current = ensureWidgets(s.config);
      return { config: ensureWidgets({ ...current, activeWidgetId: widgetId }) };
    }),

  renameWidget: (widgetId, title) =>
    set((s) => {
      const current = ensureWidgets(s.config);
      const widgets = (current.widgets ?? []).map((widget) =>
        widget.id === widgetId ? { ...widget, title } : widget
      );
      return { config: ensureWidgets({ ...current, widgets }) };
    }),

  setWidgetSize: (widgetId, size) =>
    set((s) => {
      const current = ensureWidgets(s.config);
      const widgets = (current.widgets ?? []).map((widget) =>
        widget.id === widgetId ? { ...widget, size } : widget
      );
      return { config: ensureWidgets({ ...current, widgets }) };
    }),

  setWidgetHeight: (widgetId, height) =>
    set((s) => {
      const current = ensureWidgets(s.config);
      const widgets = (current.widgets ?? []).map((widget) =>
        widget.id === widgetId ? { ...widget, height } : widget
      );
      return { config: ensureWidgets({ ...current, widgets }) };
    }),

  reorderWidgets: (fromIndex, toIndex) =>
    set((s) => {
      const current = ensureWidgets(s.config);
      const widgets = [...(current.widgets ?? [])];
      if (fromIndex < 0 || fromIndex >= widgets.length || toIndex < 0 || toIndex >= widgets.length) {
        return { config: current };
      }
      const [moved] = widgets.splice(fromIndex, 1);
      widgets.splice(toIndex, 0, moved);
      return { config: ensureWidgets({ ...current, widgets }) };
    }),

  removeWidget: (widgetId) =>
    set((s) => {
      const current = ensureWidgets(s.config);
      const widgets = (current.widgets ?? []).filter((widget) => widget.id !== widgetId);
      const nextWidgets = widgets.length > 0 ? widgets : [createDefaultWidget()];
      const nextActiveWidgetId = current.activeWidgetId === widgetId ? nextWidgets[0].id : current.activeWidgetId;
      return { config: ensureWidgets({ ...current, widgets: nextWidgets, activeWidgetId: nextActiveWidgetId }) };
    }),

  loadConnections: async () => {
    try {
      set((s) => ({ ui: { ...s.ui, connectionsLoading: true, error: null } }));
      const items = await reportingApi.getConnections();
      set({ connections: items, ui: { ...get().ui, connectionsLoading: false } });
    } catch (e) {
      const msg = e instanceof Error ? e.message : tr('common.reportBuilder.messages.loadConnectionsFailed');
      set((s) => ({ ui: { ...s.ui, connectionsLoading: false, error: msg } }));
    }
  },

  loadDataSources: async (search) => {
    const { meta } = get();
    if (!meta.connectionKey || !meta.dataSourceType) {
      set({ dataSources: [] });
      return;
    }

    try {
      set((s) => ({ ui: { ...s.ui, dataSourcesLoading: true, error: null } }));
      const items = await reportingApi.listDataSources({
        connectionKey: meta.connectionKey,
        type: meta.dataSourceType,
        search,
      });
      set((s) => ({
        dataSources: items,
        ui: { ...s.ui, dataSourcesLoading: false },
      }));
    } catch (e) {
      const msg = e instanceof Error ? e.message : tr('common.reportBuilder.messages.loadDatasetsFailed');
      set((s) => ({
        dataSources: [],
        ui: { ...s.ui, dataSourcesLoading: false, error: msg },
      }));
    }
  },

  loadSchemaForCurrentDataSource: async () => {
    const { meta } = get();
    if (!meta.connectionKey?.trim() || !meta.dataSourceType || !meta.dataSourceName?.trim()) {
      return;
    }

    try {
      set((s) => ({
        ui: { ...s.ui, checkLoading: true, error: null },
      }));
      const result = await reportingApi.checkDataSource({
        connectionKey: meta.connectionKey,
        type: meta.dataSourceType,
        name: meta.dataSourceName.trim(),
      });
      const fields = result.schema ?? [];
      set((s) => ({
        schema: fields,
        dataSourceChecked: result.exists && fields.length > 0,
        ui: { ...s.ui, checkLoading: false },
      }));
    } catch (e) {
      const msg = e instanceof Error ? e.message : tr('common.reportBuilder.messages.checkFailed');
      set((s) => ({
        schema: [],
        dataSourceChecked: false,
        ui: { ...s.ui, checkLoading: false, error: msg },
      }));
    }
  },

  setConnectionKey: (v) =>
    set((s) => ({
      meta: { ...s.meta, connectionKey: v, dataSourceName: '' },
      dataSources: [],
      schema: [],
      dataSourceChecked: false,
      preview: { columns: [], rows: [] },
      config: { ...DEFAULT_CONFIG },
    })),

  setType: (v) =>
    set((s) => ({
      meta: { ...s.meta, dataSourceType: v, dataSourceName: '' },
      dataSources: [],
      schema: [],
      dataSourceChecked: false,
      preview: { columns: [], rows: [] },
      config: { ...DEFAULT_CONFIG },
    })),

  setDataSourceName: (v) =>
    set((s) => ({
      meta: { ...s.meta, dataSourceName: v },
      schema: [],
      dataSourceChecked: false,
      preview: { columns: [], rows: [] },
      config: { ...DEFAULT_CONFIG },
    })),

  checkDataSource: async () => {
    const { meta } = get();
    if (!meta.connectionKey?.trim() || !meta.dataSourceType || !meta.dataSourceName?.trim()) {
      get().setUi({ toast: { message: tr('common.reportBuilder.messages.connectionTypeDatasetRequired'), variant: 'error' } });
      return;
    }
    try {
      set((s) => ({
        ui: { ...s.ui, checkLoading: true, error: null },
        dataSourceChecked: false,
      }));
      const result = await reportingApi.checkDataSource({
        connectionKey: meta.connectionKey,
        type: meta.dataSourceType,
        name: meta.dataSourceName.trim(),
      });
      const fields = result.schema ?? [];
      set((s) => ({
        schema: fields,
        config: { ...DEFAULT_CONFIG },
        preview: { columns: [], rows: [] },
        dataSourceChecked: result.exists && fields.length > 0,
        ui: { ...s.ui, checkLoading: false },
      }));
    } catch (e) {
      const msg = e instanceof Error ? e.message : tr('common.reportBuilder.messages.checkFailed');
      set((s) => ({
        schema: [],
        dataSourceChecked: false,
        ui: { ...s.ui, checkLoading: false, error: msg },
      }));
    }
  },

  addToSlot: (slot, field, options) => {
    set((s) => {
      const c = ensureWidgets(s.config);
      if (slot === 'axis') c.axis = { field };
      if (slot === 'legend') c.legend = { field };
      if (slot === 'values') {
        const agg = options?.aggregation ?? 'sum';
        c.values = [...c.values, { field, aggregation: agg }];
      }
      if (slot === 'filters') c.filters = [...c.filters, { field, operator: 'eq' }];
      const widgets = (c.widgets ?? []).map((widget) =>
        widget.id === c.activeWidgetId
          ? {
              ...widget,
              axis: c.axis,
              legend: c.legend,
              values: c.values,
              filters: c.filters,
            }
          : widget
      );
      return { config: ensureWidgets({ ...c, widgets }), ui: { ...s.ui, slotError: null } };
    });
  },

  removeFromSlot: (slot, indexOrField) => {
    set((s) => {
      const c = ensureWidgets(s.config);
      if (slot === 'axis') c.axis = undefined;
      if (slot === 'legend') c.legend = undefined;
      if (slot === 'values') {
        const idx = typeof indexOrField === 'number' ? indexOrField : c.values.findIndex((v) => v.field === indexOrField);
        if (idx >= 0) c.values = c.values.filter((_, i) => i !== idx);
      }
      if (slot === 'filters') {
        const idx = typeof indexOrField === 'number' ? indexOrField : c.filters.findIndex((f) => f.field === indexOrField);
        if (idx >= 0) c.filters = c.filters.filter((_, i) => i !== idx);
      }
      const widgets = (c.widgets ?? []).map((widget) =>
        widget.id === c.activeWidgetId
          ? {
              ...widget,
              axis: c.axis,
              legend: c.legend,
              values: c.values,
              filters: c.filters,
            }
          : widget
      );
      return { config: ensureWidgets({ ...c, widgets }) };
    });
  },

  reorderSlot: (slot, fromIndex, toIndex) => {
    set((s) => {
      const c = ensureWidgets(s.config);
      if (slot === 'values') {
        const arr = [...c.values];
        const [removed] = arr.splice(fromIndex, 1);
        arr.splice(toIndex, 0, removed);
        c.values = arr;
      }
      if (slot === 'filters') {
        const arr = [...c.filters];
        const [removed] = arr.splice(fromIndex, 1);
        arr.splice(toIndex, 0, removed);
        c.filters = arr;
      }
      const widgets = (c.widgets ?? []).map((widget) =>
        widget.id === c.activeWidgetId
          ? { ...widget, values: c.values, filters: c.filters }
          : widget
      );
      return { config: ensureWidgets({ ...c, widgets }) };
    });
  },

  setAggregation: (valuesIndex, aggregation) => {
    set((s) => {
      const values = [...s.config.values];
      if (values[valuesIndex]) values[valuesIndex] = { ...values[valuesIndex], aggregation };
      const current = ensureWidgets(s.config);
      const widgets = (current.widgets ?? []).map((widget) =>
        widget.id === current.activeWidgetId ? { ...widget, values } : widget
      );
      return { config: ensureWidgets({ ...current, values, widgets }) };
    });
  },

  setDateGrouping: (grouping) => {
    set((s) => ({
      config: ensureWidgets({
        ...ensureWidgets(s.config),
        axis: s.config.axis ? { ...s.config.axis, dateGrouping: grouping } : undefined,
        widgets: (ensureWidgets(s.config).widgets ?? []).map((widget) =>
          widget.id === ensureWidgets(s.config).activeWidgetId
            ? { ...widget, axis: s.config.axis ? { ...s.config.axis, dateGrouping: grouping } : undefined }
            : widget
        ),
      }),
    }));
  },

  setSorting: (sorting) => {
    set((s) => {
      const current = ensureWidgets(s.config);
      const widgets = (current.widgets ?? []).map((widget) =>
        widget.id === current.activeWidgetId ? { ...widget, sorting: sorting ?? undefined } : widget
      );
      return { config: ensureWidgets({ ...current, sorting: sorting ?? undefined, widgets }) };
    });
  },

  addFilter: (f) => {
    set((s) => {
      const current = ensureWidgets(s.config);
      const filters = [...current.filters, f];
      const widgets = (current.widgets ?? []).map((widget) =>
        widget.id === current.activeWidgetId ? { ...widget, filters } : widget
      );
      return { config: ensureWidgets({ ...current, filters, widgets }) };
    });
  },

  addCalculatedField: (field) => {
    set((s) => {
      const current = ensureWidgets(s.config);
      const calculatedFields = [...(current.calculatedFields ?? []).filter((item) => item.name !== field.name), field];
      return { config: ensureWidgets({ ...current, calculatedFields }) };
    });
  },

  updateCalculatedField: (name, patch) => {
    set((s) => {
      const current = ensureWidgets(s.config);
      const calculatedFields = (current.calculatedFields ?? []).map((item) =>
        item.name === name ? { ...item, ...patch } : item
      );
      return { config: ensureWidgets({ ...current, calculatedFields }) };
    });
  },

  removeCalculatedField: (name) => {
    set((s) => {
      const current = ensureWidgets(s.config);
      const calculatedFields = (current.calculatedFields ?? []).filter((item) => item.name !== name);
      const values = current.values.filter((item) => item.field !== name);
      const widgets = (current.widgets ?? []).map((widget) =>
        widget.id === current.activeWidgetId ? { ...widget, values } : widget
      );
      return { config: ensureWidgets({ ...current, calculatedFields, values, widgets }) };
    });
  },

  setLifecycleStatus: (status) => {
    set((s) => {
      const current = ensureWidgets(s.config);
      const previous = current.lifecycle ?? { status: 'draft' as const, version: 1 };
      const shouldCreateRelease = status === 'published' && previous.status !== 'published';
      const nextVersion = shouldCreateRelease ? previous.version + 1 : previous.version;
      const nextLifecycle = {
        status,
        version: nextVersion,
        publishedAt: status === 'published' ? new Date().toISOString() : previous.publishedAt,
        releaseNote: previous.releaseNote,
      };
      const historyEntry: ReportHistoryEntry | null = shouldCreateRelease
        ? {
            version: nextVersion,
            status,
            publishedAt: nextLifecycle.publishedAt,
            releaseNote: nextLifecycle.releaseNote,
            snapshotAt: new Date().toISOString(),
            configSnapshot: JSON.stringify({
              ...current,
              lifecycle: nextLifecycle,
              history: undefined,
            }),
          }
        : null;

      return {
        config: ensureWidgets({
          ...current,
          lifecycle: nextLifecycle,
          history: historyEntry ? [...(current.history ?? []), historyEntry] : current.history,
        }),
      };
    });
  },

  setLifecycleReleaseNote: (releaseNote) => {
    set((s) => {
      const current = ensureWidgets(s.config);
      return {
        config: ensureWidgets({
          ...current,
          lifecycle: {
            ...(current.lifecycle ?? { status: 'draft', version: 1 }),
            releaseNote,
          },
        }),
      };
    });
  },

  rollbackToHistory: (version) => {
    set((s) => {
      const current = ensureWidgets(s.config);
      const entry = (current.history ?? []).find((item) => item.version === version);
      if (!entry) return { config: current };
      try {
        const parsed = JSON.parse(entry.configSnapshot) as ReportConfig;
        return {
          config: ensureWidgets({
            ...parsed,
            history: current.history,
            lifecycle: {
              ...(parsed.lifecycle ?? { status: 'draft', version }),
              status: 'draft',
            },
          }),
        };
      } catch {
        return { config: current };
      }
    });
  },

  setGovernanceMetadata: (patch) => {
    set((s) => {
      const current = ensureWidgets(s.config);
      return {
        config: ensureWidgets({
          ...current,
          governance: {
            audience: 'private',
            refreshCadence: 'manual',
            favorite: false,
            tags: [],
            sharedWith: [],
            subscriptionEnabled: false,
            subscriptionChannel: 'email',
            subscriptionFrequency: 'weekly',
            certified: false,
            ...(current.governance ?? {}),
            ...patch,
          },
        }),
      };
    });
  },

  updateFilter: (index, patch) => {
    set((s) => {
      const current = ensureWidgets(s.config);
      const filters = [...current.filters];
      if (filters[index]) filters[index] = { ...filters[index], ...patch };
      const widgets = (current.widgets ?? []).map((widget) =>
        widget.id === current.activeWidgetId ? { ...widget, filters } : widget
      );
      return { config: ensureWidgets({ ...current, filters, widgets }) };
    });
  },

  removeFilter: (index) => {
    set((s) => {
      const current = ensureWidgets(s.config);
      const filters = current.filters.filter((_, i) => i !== index);
      const widgets = (current.widgets ?? []).map((widget) =>
        widget.id === current.activeWidgetId ? { ...widget, filters } : widget
      );
      return { config: ensureWidgets({ ...current, filters, widgets }) };
    });
  },

  reorderFilter: (fromIndex, toIndex) => {
    get().reorderSlot('filters', fromIndex, toIndex);
  },

  hydrateFromReportDetail: (report) => {
    set({
      meta: {
        id: report.id,
        name: report.name,
        description: report.description,
        connectionKey: report.connectionKey,
        dataSourceType: report.dataSourceType,
        dataSourceName: report.dataSourceName,
      },
    });
    try {
      const config = JSON.parse(report.configJson) as ReportConfig;
      set((_s) => ({ config: ensureWidgets({ ...DEFAULT_CONFIG, ...config }) }));
    } catch {
      set((s) => ({ config: ensureWidgets(s.config) }));
    }
  },

  serializeConfigJson: () => JSON.stringify(ensureWidgets(get().config)),

  previewDebounced: () => {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const cancel = (): void => {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = null;
    };

    const execute = (): void => {
      cancel();
      const state = get();
      const { meta, config, dataSourceChecked } = state;
      if (!dataSourceChecked || !meta.connectionKey || !meta.dataSourceType || !meta.dataSourceName) return;

      timeoutId = setTimeout(async () => {
        timeoutId = null;
        set((s) => ({ ui: { ...s.ui, previewLoading: true, error: null } }));

        try {
          const configJson = JSON.stringify(ensureWidgets(config));
          const res = await reportsApi.preview({
            connectionKey: meta.connectionKey,
            dataSourceType: meta.dataSourceType,
            dataSourceName: meta.dataSourceName,
            configJson,
          });
          const rawColumns = res.columns ?? [];
          const columns = rawColumns.map((c) =>
            typeof c === 'string' ? c : (c != null && typeof c === 'object' && 'name' in c ? String((c as { name: string }).name) : String(c))
          );
          const rawRows = res.rows ?? [];
          const rows = Array.isArray(rawRows) ? rawRows : [];
          set({
            preview: { columns, rows },
            ui: { ...get().ui, previewLoading: false },
          });
        } catch (e) {
          const msg = e instanceof Error ? e.message : tr('common.reportBuilder.messages.previewFailed');
          set((s) => ({ ui: { ...s.ui, previewLoading: false, error: msg } }));
        }
      }, 600);
    };

    return { execute, cancel };
  },

  saveNewReport: async () => {
    const state = get();
    const { meta, config } = state;
    if (!meta.name?.trim()) {
      get().setUi({ toast: { message: tr('common.reportBuilder.messages.reportNameRequired'), variant: 'error' } });
      return null;
    }
    if (!meta.connectionKey || !meta.dataSourceType || !meta.dataSourceName) {
      get().setUi({ toast: { message: tr('common.reportBuilder.messages.connectionDatasetRequired'), variant: 'error' } });
      return null;
    }
    get().setUi({ saveLoading: true });
    try {
      const body = {
        name: meta.name.trim(),
        description: meta.description,
        connectionKey: meta.connectionKey,
        dataSourceType: meta.dataSourceType,
        dataSourceName: meta.dataSourceName,
        configJson: JSON.stringify(ensureWidgets(config)),
      };
      const report = await reportsApi.create(body);
      get().setUi({ saveLoading: false, toast: { message: tr('common.saved'), variant: 'success' } });
      return report;
    } catch (e) {
      const msg = e instanceof Error ? e.message : tr('common.reportBuilder.messages.saveFailed');
      get().setUi({ saveLoading: false, toast: { message: msg, variant: 'error' } });
      return null;
    }
  },

  updateReport: async () => {
    const state = get();
    const { meta, config } = state;
    if (meta.id == null) return null;
    if (!meta.name?.trim()) {
      get().setUi({ toast: { message: tr('common.reportBuilder.messages.reportNameRequired'), variant: 'error' } });
      return null;
    }
    if (!meta.connectionKey || !meta.dataSourceType || !meta.dataSourceName) {
      get().setUi({ toast: { message: tr('common.reportBuilder.messages.connectionDatasetRequired'), variant: 'error' } });
      return null;
    }
    get().setUi({ saveLoading: true });
    try {
      const body = {
        name: meta.name.trim(),
        description: meta.description,
        connectionKey: meta.connectionKey,
        dataSourceType: meta.dataSourceType,
        dataSourceName: meta.dataSourceName,
        configJson: JSON.stringify(ensureWidgets(config)),
      };
      const report = await reportsApi.update(meta.id, body);
      get().setUi({ saveLoading: false, toast: { message: tr('common.updated'), variant: 'success' } });
      return report;
    } catch (e) {
      const msg = e instanceof Error ? e.message : tr('common.reportBuilder.messages.updateFailed');
      get().setUi({ saveLoading: false, toast: { message: msg, variant: 'error' } });
      return null;
    }
  },

  loadReportById: async (id) => {
    get().setUi({ checkLoading: true, error: null });
    try {
      const report = await reportsApi.get(id);
      get().hydrateFromReportDetail(report);
      await get().checkDataSource();
      get().setUi({ checkLoading: false });
    } catch (e) {
      const msg = e instanceof Error ? e.message : tr('common.reportBuilder.messages.loadReportFailed');
      get().setUi({ checkLoading: false, error: msg });
    }
  },

  setUi: (patch) =>
    set((s) => ({ ui: { ...s.ui, ...patch } })),

  setPreview: (data) =>
    set({ preview: data }),

  reset: () => set({ ...initialState, meta: { ...defaultMeta }, ui: { ...defaultUi } }),
}));

import type { ReactElement } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from '@/components/ui/dialog';
import {
  DataTableActionBar,
  DataTableGrid,
  ManagementDataTableChrome,
  type DataTableGridColumn,
} from '@/components/shared';
import {
  MANAGEMENT_LIST_CARD_CLASSNAME,
  MANAGEMENT_LIST_CARD_CONTENT_CLASSNAME,
  MANAGEMENT_LIST_CARD_HEADER_CLASSNAME,
  MANAGEMENT_LIST_CARD_TITLE_CLASSNAME,
  MANAGEMENT_LIST_TABLE_SHELL_CLASSNAME,
} from '@/lib/management-list-layout';
import { normalizeSearchValue } from '@/lib/search';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Edit2, Trash2, ArrowLeft, TableProperties, X, ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { DocumentRuleType, type PdfTablePresetCreateDto, type PdfTablePresetDto } from '@/features/pdf-report';
import { usePdfTablePresetList } from '../hooks/usePdfTablePresetList';
import { useCreatePdfTablePreset } from '../hooks/useCreatePdfTablePreset';
import { useUpdatePdfTablePreset } from '../hooks/useUpdatePdfTablePreset';
import { useDeletePdfTablePreset } from '../hooks/useDeletePdfTablePreset';

const EMPTY_COLUMNS_JSON = JSON.stringify(
  [{ label: 'Aciklama', path: 'Lines.ProductName', align: 'left', format: 'text' }],
  null,
  2
);

const EMPTY_OPTIONS_JSON = JSON.stringify(
  { repeatHeader: true, dense: true, showBorders: true },
  null,
  2
);

interface PresetFormState {
  name: string;
  key: string;
  ruleType: DocumentRuleType;
  columnsJson: string;
  optionsJson: string;
  isActive: boolean;
}

const RULE_TYPE_LABEL_KEYS: Record<DocumentRuleType, string> = {
  [DocumentRuleType.Demand]: 'reportDesigner.ruleType.demand',
  [DocumentRuleType.Quotation]: 'reportDesigner.ruleType.quotation',
  [DocumentRuleType.Order]: 'reportDesigner.ruleType.order',
  [DocumentRuleType.FastQuotation]: 'reportDesigner.ruleType.fastQuotation',
  [DocumentRuleType.Activity]: 'reportDesigner.ruleType.activity',
};

type PdfTablePresetColumnKey =
  | 'id'
  | 'name'
  | 'key'
  | 'ruleType'
  | 'columnCount'
  | 'isActive';

const TABLE_COLUMNS: Array<{ key: PdfTablePresetColumnKey; labelKey: string; className?: string; sortable?: boolean }> = [
  { key: 'id', labelKey: 'pdfReportDesigner.tablePresetManagement.id', className: 'w-[80px] font-mono text-slate-500', sortable: true },
  { key: 'name', labelKey: 'pdfReportDesigner.tablePresetManagement.name', className: 'w-[250px]', sortable: true },
  { key: 'key', labelKey: 'pdfReportDesigner.tablePresetManagement.key', className: 'w-[150px]', sortable: true },
  { key: 'ruleType', labelKey: 'pdfReportDesigner.tablePresetManagement.documentType', className: 'w-[150px]', sortable: true },
  { key: 'columnCount', labelKey: 'pdfReportDesigner.tablePresetManagement.columnCount', className: 'w-[100px] text-center', sortable: true },
  { key: 'isActive', labelKey: 'pdfReportDesigner.tablePresetManagement.status', className: 'w-[120px]', sortable: true },
] as const;

function toFormState(preset?: PdfTablePresetDto | null): PresetFormState {
  if (!preset) {
    return {
      name: '',
      key: '',
      ruleType: DocumentRuleType.Quotation,
      columnsJson: EMPTY_COLUMNS_JSON,
      optionsJson: EMPTY_OPTIONS_JSON,
      isActive: true,
    };
  }

  return {
    name: preset.name,
    key: preset.key,
    ruleType: preset.ruleType,
    columnsJson: JSON.stringify(preset.columns, null, 2),
    optionsJson: JSON.stringify(preset.tableOptions ?? {}, null, 2),
    isActive: preset.isActive,
  };
}

export function PdfTablePresetManagementPage(): ReactElement {
  const { t } = useTranslation(['report-designer', 'common']);
  const { data, isLoading } = usePdfTablePresetList();
  const presets = useMemo(() => data?.items ?? [], [data?.items]);
  const createMutation = useCreatePdfTablePreset();
  const updateMutation = useUpdatePdfTablePreset();
  const deleteMutation = useDeletePdfTablePreset();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPreset, setEditingPreset] = useState<PdfTablePresetDto | null>(null);
  const [formState, setFormState] = useState<PresetFormState>(() => toFormState());
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<PdfTablePresetColumnKey>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const [pageNumber, setPageNumber] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [visibleColumns, setVisibleColumns] = useState<string[]>(() => TABLE_COLUMNS.map(c => c.key));
  const [columnOrder, setColumnOrder] = useState<string[]>(() => TABLE_COLUMNS.map(c => c.key));

  useEffect(() => {
    setPageNumber(1);
  }, [searchTerm]);

  const columns = useMemo<DataTableGridColumn<PdfTablePresetColumnKey>[]>(
    () =>
      TABLE_COLUMNS.map((column) => ({
        key: column.key,
        label: t(column.labelKey),
        cellClassName: column.className,
        sortable: column.sortable,
      })),
    [t]
  );

  const filteredPresets = useMemo(() => {
    if (!searchTerm.trim()) return presets;
    const lower = normalizeSearchValue(searchTerm);
    return presets.filter(
      (p) =>
        normalizeSearchValue(p.name).includes(lower) ||
        normalizeSearchValue(p.key).includes(lower) ||
        (RULE_TYPE_LABEL_KEYS[p.ruleType] && normalizeSearchValue(t(RULE_TYPE_LABEL_KEYS[p.ruleType])).includes(lower))
    ).sort((a, b) => {
      const getVal = (item: PdfTablePresetDto, key: PdfTablePresetColumnKey) => {
        if (key === 'columnCount') return item.columns.length;
        return item[key as keyof PdfTablePresetDto];
      };
      const aVal = getVal(a, sortBy);
      const bVal = getVal(b, sortBy);
      if (aVal === bVal) return 0;
      const factor = sortDirection === 'asc' ? 1 : -1;
      return (aVal ?? '') < (bVal ?? '') ? -1 * factor : 1 * factor;
    });
  }, [presets, searchTerm, t, sortBy, sortDirection]);

  const renderSortIcon = (key: PdfTablePresetColumnKey) => {
    if (sortBy !== key) return <ArrowUpDown className="ml-1 h-4 w-4 opacity-60" />;
    return sortDirection === 'asc' ? <ArrowUp className="ml-1 h-4 w-4" /> : <ArrowDown className="ml-1 h-4 w-4" />;
  };

  const dialogTitle = useMemo(
    () => (editingPreset ? t('pdfReportDesigner.tablePresetManagement.editTitle') : t('pdfReportDesigner.tablePresetManagement.createTitle')),
    [editingPreset, t]
  );

  const openCreate = (): void => {
    setEditingPreset(null);
    setFormState(toFormState());
    setDialogOpen(true);
  };

  const openEdit = (preset: PdfTablePresetDto): void => {
    setEditingPreset(preset);
    setFormState(toFormState(preset));
    setDialogOpen(true);
  };

  const handleSubmit = async (): Promise<void> => {
    try {
      const columns = JSON.parse(formState.columnsJson) as PdfTablePresetCreateDto['columns'];
      const tableOptions = JSON.parse(formState.optionsJson) as PdfTablePresetCreateDto['tableOptions'];

      const payload: PdfTablePresetCreateDto = {
        name: formState.name.trim(),
        key: formState.key.trim(),
        ruleType: formState.ruleType,
        columns,
        tableOptions,
        isActive: formState.isActive,
      };

      if (editingPreset) {
        await updateMutation.mutateAsync({ id: editingPreset.id, data: payload });
        toast.success(t('pdfReportDesigner.tablePresetManagement.successUpdate'));
      } else {
        await createMutation.mutateAsync(payload);
        toast.success(t('pdfReportDesigner.tablePresetManagement.successCreate'));
      }

      setDialogOpen(false);
    } catch (error) {
      toast.error(t('pdfReportDesigner.tablePresetManagement.errorSave'), {
        description: error instanceof Error ? error.message : t('pdfReportDesigner.tablePresetManagement.invalidJson'),
      });
    }
  };

  const handleDelete = async (preset: PdfTablePresetDto): Promise<void> => {
    try {
      await deleteMutation.mutateAsync(preset.id);
      toast.success(t('pdfReportDesigner.tablePresetManagement.successDelete'));
    } catch (error) {
      toast.error(t('pdfReportDesigner.tablePresetManagement.errorDelete'), {
        description: error instanceof Error ? error.message : undefined,
      });
    }
  };

  return (
    <div className="flex flex-col gap-6 p-2 relative ">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild className="size-9 rounded-xl hover:bg-white dark:hover:bg-white/5">
            <Link to="/pdf-report-designer">
              <ArrowLeft className="size-5 text-slate-500" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <TableProperties className="size-5 text-rose-500" />
              <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
                {t('pdfReportDesigner.tablePresetManagement.title')}
              </h1>
            </div>
            <p className="mt-1 text-sm font-medium text-slate-500 dark:text-slate-400">
              {t('pdfReportDesigner.tablePresetManagement.description')}
            </p>
          </div>
        </div>
        <Button
          onClick={openCreate}
          className="h-10 bg-[image:var(--crm-brand-gradient)] px-5 font-bold text-white shadow-[0_10px_20px_-10px_var(--crm-brand-shadow)] ring-1 ring-white/10 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] border-0"
        >
          <Plus className="size-4 mr-2" />
          {t('pdfReportDesigner.tablePresetManagement.newPreset')}
        </Button>
      </div>

      <div className={MANAGEMENT_LIST_CARD_CLASSNAME + ' rounded-xl overflow-hidden'}>
        <div className={MANAGEMENT_LIST_CARD_HEADER_CLASSNAME}>
          <div className="flex items-center justify-between mb-2">
            <h2 className={MANAGEMENT_LIST_CARD_TITLE_CLASSNAME + ' font-bold'}>
              {t('pdfReportDesigner.tablePresetManagement.title')}
            </h2>
          </div>
          <DataTableActionBar
            pageKey="pdf-table-presets"
            columns={columns.map(c => ({ key: c.key as string, label: c.label }))}
            visibleColumns={visibleColumns}
            columnOrder={columnOrder}
            onVisibleColumnsChange={setVisibleColumns}
            onColumnOrderChange={setColumnOrder}
            searchValue={searchTerm}
            onSearchChange={setSearchTerm}
            searchPlaceholder={t('reportDesigner.list.searchPlaceholder')}
            translationNamespace="report-designer"
            exportFileName="pdf-table-presets"
            exportColumns={columns.map(c => ({ key: c.key as string, label: c.label }))}
            exportRows={filteredPresets as unknown as Record<string, unknown>[]}
            filterColumns={[]}
            onFilterLogicChange={() => { }}
            onClearFilters={() => { }}
            defaultFilterColumn="name"
            draftFilterRows={[]}
            onDraftFilterRowsChange={() => { }}
            onApplyFilters={() => { }}
          />
        </div>
        <div className={MANAGEMENT_LIST_CARD_CONTENT_CLASSNAME}>
          <div className={MANAGEMENT_LIST_TABLE_SHELL_CLASSNAME}>
            <ManagementDataTableChrome>
              <DataTableGrid<PdfTablePresetDto, PdfTablePresetColumnKey>
                centerColumnHeaders
                columns={columns}
                visibleColumnKeys={columnOrder.filter(k => visibleColumns.includes(k)) as PdfTablePresetColumnKey[]}
                rows={filteredPresets.slice((pageNumber - 1) * pageSize, pageNumber * pageSize)}
                rowKey={(row) => row.id}
                sortBy={sortBy}
                sortDirection={sortDirection}
                onSort={(key) => {
                  if (sortBy === key) {
                    setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
                  } else {
                    setSortBy(key);
                    setSortDirection('asc');
                  }
                }}
                renderSortIcon={renderSortIcon}
                renderCell={(preset, key) => {
                  if (key === 'id') return preset.id;
                  if (key === 'name') return <span className="font-bold text-slate-700 dark:text-slate-200">{preset.name}</span>;
                  if (key === 'key') {
                    return (
                      <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] text-slate-600 dark:bg-white/10 dark:text-slate-400">
                        {preset.key}
                      </code>
                    );
                  }
                  if (key === 'ruleType') {
                    return (
                      <Badge variant="outline" className="bg-white/50 text-[10px] font-bold uppercase tracking-wider dark:bg-white/5">
                        {t(RULE_TYPE_LABEL_KEYS[preset.ruleType] ?? String(preset.ruleType))}
                      </Badge>
                    );
                  }
                  if (key === 'columnCount') return preset.columns.length;
                  if (key === 'isActive') {
                    return preset.isActive ? (
                      <Badge className="bg-emerald-500/10 text-emerald-600 ring-1 ring-emerald-500/20 dark:bg-emerald-500/20 dark:text-emerald-400">
                        {t('pdfReportDesigner.statusActive')}
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="bg-slate-100 text-slate-400 dark:bg-white/5 dark:text-slate-500">
                        {t('pdfReportDesigner.statusInactive')}
                      </Badge>
                    );
                  }
                  return '—';
                }}
                isLoading={isLoading}
                emptyText={searchTerm ? t('common.noResults') : t('pdfReportDesigner.tablePresetManagement.noPresets')}
                minTableWidthClassName="min-w-[800px]"
                showActionsColumn
                actionsHeaderLabel={t('common.actions')}
                renderActionsCell={(preset) => (
                  <div className="flex justify-end gap-1 opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEdit(preset)}
                      className="h-8 w-8 text-blue-600 hover:bg-blue-50 dark:text-blue-400"
                    >
                      <Edit2 size={16} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(preset)}
                      className="h-8 w-8 text-red-600 hover:bg-red-50 dark:text-red-400"
                    >
                      <Trash2 size={16} />
                    </Button>
                  </div>
                )}
                pageSize={pageSize}
                pageSizeOptions={[10, 20, 50]}
                onPageSizeChange={setPageSize}
                pageNumber={pageNumber}
                totalPages={Math.ceil(filteredPresets.length / pageSize) || 1}
                hasPreviousPage={pageNumber > 1}
                hasNextPage={pageNumber < Math.ceil(filteredPresets.length / pageSize)}
                onPreviousPage={() => setPageNumber(prev => Math.max(1, prev - 1))}
                onNextPage={() => setPageNumber(prev => prev + 1)}
                previousLabel={t('common.previous')}
                nextLabel={t('common.next')}
                paginationInfoText={t('common.paginationInfo', {
                  start: Math.min(filteredPresets.length, (pageNumber - 1) * pageSize + 1),
                  end: Math.min(filteredPresets.length, pageNumber * pageSize),
                  total: filteredPresets.length,
                })}
              />
            </ManagementDataTableChrome>
          </div>
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent showCloseButton={false} className="max-w-3xl border-slate-300/80 bg-stone-50/95 p-0 shadow-2xl ring-1 ring-slate-200/70 backdrop-blur-xl dark:border-white/10 dark:bg-[#1a1025]/95 dark:ring-0">
          <div className="absolute inset-0 pointer-events-none bg-linear-to-b from-rose-500/0 to-amber-500/0 dark:from-rose-500/5 dark:to-amber-500/5 opacity-50" />

          <div className="relative z-10">
            <DialogClose className="absolute right-4 top-4 z-20 flex size-8 items-center justify-center rounded-full border border-slate-200/60 bg-white/50 text-slate-400 transition-all duration-300 hover:bg-white hover:text-rose-500 hover:rotate-90 dark:border-white/10 dark:bg-white/5 dark:text-slate-500 dark:hover:bg-white/10 dark:hover:text-rose-400">
              <X className="size-4" />
              <span className="sr-only">{t('pdfReportDesigner.tablePresetManagement.close')}</span>
            </DialogClose>

            <DialogHeader className="px-6 pt-6">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-xl bg-rose-500/10 text-rose-500 ring-1 ring-rose-500/20 dark:bg-rose-500/20 dark:text-rose-400">
                  <TableProperties className="size-5" />
                </div>
                <div>
                  <DialogTitle className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">{dialogTitle}</DialogTitle>
                  <DialogDescription className="text-xs font-medium text-slate-500">
                    {t('pdfReportDesigner.tablePresetManagement.dialogDescription')}
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <div className="grid gap-4 p-6 overflow-y-auto max-h-[70vh]">
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-1.5">
                  <Label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{t('pdfReportDesigner.tablePresetManagement.name')}</Label>
                  <Input
                    value={formState.name}
                    onChange={(e) => setFormState((s) => ({ ...s, name: e.target.value }))}
                    className="h-10 border-slate-200/60 bg-white transition-all focus:ring-rose-500/20 dark:border-white/10 dark:bg-white/5"
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{t('pdfReportDesigner.tablePresetManagement.key')}</Label>
                  <Input
                    value={formState.key}
                    onChange={(e) => setFormState((s) => ({ ...s, key: e.target.value }))}
                    className="h-10 border-slate-200/60 bg-white font-mono transition-all focus:ring-rose-500/20 dark:border-white/10 dark:bg-white/5"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-1.5">
                  <Label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{t('pdfReportDesigner.tablePresetManagement.documentType')}</Label>
                  <Select
                    value={String(formState.ruleType)}
                    onValueChange={(value) => setFormState((s) => ({ ...s, ruleType: Number(value) as DocumentRuleType }))}
                  >
                    <SelectTrigger className="h-10 border-slate-200/60 bg-white dark:border-white/10 dark:bg-white/5">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(RULE_TYPE_LABEL_KEYS).map(([value, labelKey]) => (
                        <SelectItem key={value} value={value}>
                          {t(labelKey)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-1.5">
                  <Label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{t('pdfReportDesigner.tablePresetManagement.status')}</Label>
                  <Select
                    value={formState.isActive ? 'active' : 'inactive'}
                    onValueChange={(value) => setFormState((s) => ({ ...s, isActive: value === 'active' }))}
                  >
                    <SelectTrigger className="h-10 border-slate-200/60 bg-white dark:border-white/10 dark:bg-white/5">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">{t('pdfReportDesigner.statusActive')}</SelectItem>
                      <SelectItem value="inactive">{t('pdfReportDesigner.statusInactive')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-1.5">
                <Label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{t('pdfReportDesigner.tablePresetManagement.columnsJson')}</Label>
                <Textarea
                  value={formState.columnsJson}
                  onChange={(e) => setFormState((s) => ({ ...s, columnsJson: e.target.value }))}
                  rows={10}
                  className="font-mono text-[11px] border-slate-200/60 bg-white transition-all focus:ring-rose-500/20 dark:border-white/10 dark:bg-white/5"
                />
              </div>
              <div className="grid gap-1.5">
                <Label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{t('pdfReportDesigner.tablePresetManagement.optionsJson')}</Label>
                <Textarea
                  value={formState.optionsJson}
                  onChange={(e) => setFormState((s) => ({ ...s, optionsJson: e.target.value }))}
                  rows={5}
                  className="font-mono text-[11px] border-slate-200/60 bg-white transition-all focus:ring-rose-500/20 dark:border-white/10 dark:bg-white/5"
                />
              </div>
            </div>

            <DialogFooter className="px-6 py-4 bg-stone-100/50 dark:bg-white/5 border-t border-slate-200/60 dark:border-white/10">
              <Button
                variant="outline"
                onClick={() => setDialogOpen(false)}
                className="h-10 border-slate-200 bg-transparent px-6 font-bold text-slate-600 transition-all hover:bg-white dark:border-white/10 dark:text-slate-400"
              >
                {t('pdfReportDesigner.tablePresetManagement.cancel')}
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={createMutation.isPending || updateMutation.isPending}
                className="h-10 bg-[image:var(--crm-brand-gradient)] px-8 font-bold text-white shadow-[0_10px_20px_-10px_var(--crm-brand-shadow)] transition-all hover:scale-[1.02] active:scale-[0.98] border-0"
              >
                {t('pdfReportDesigner.tablePresetManagement.save')}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

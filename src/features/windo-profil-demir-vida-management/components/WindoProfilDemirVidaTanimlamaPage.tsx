import { type ReactElement, useCallback, useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { ArrowDown, ArrowUp, ArrowUpDown, Loader2, Pencil, Plus, RefreshCw, Trash2 } from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DataTableActionBar, DataTableGrid, type DataTableGridColumn } from '@/components/shared';
import { VoiceSearchCombobox } from '@/components/shared/VoiceSearchCombobox';
import type { ComboboxOption } from '@/components/shared/VoiceSearchCombobox';
import {
  MANAGEMENT_LIST_CARD_CLASSNAME,
  MANAGEMENT_LIST_CARD_CONTENT_CLASSNAME,
  MANAGEMENT_LIST_CARD_HEADER_CLASSNAME,
  MANAGEMENT_LIST_CARD_TITLE_CLASSNAME,
  MANAGEMENT_LIST_TABLE_SHELL_CLASSNAME,
  MANAGEMENT_TOOLBAR_OUTLINE_BUTTON_CLASSNAME,
} from '@/lib/management-list-layout';
import { loadColumnPreferences } from '@/lib/column-preferences';
import type { FilterRow } from '@/lib/advanced-filter-types';
import { useUIStore } from '@/stores/ui-store';
import { windoDefinitionApi } from '../api/windo-definition-api';
import { useWindoDefinitionOptions } from '../hooks/useWindoDefinitionOptions';
import type { WindoDefinitionCreateDto, WindoDefinitionGetDto } from '../types/windo-definition-types';

const WINDO_I18N_NS = 'windo-profil-demir-vida-management' as const;

type DefinitionKind = 'profil' | 'demir' | 'vida';
type SortKey = 'id' | 'name' | 'profilName' | 'createdDate' | 'updatedDate';

interface DefinitionSectionConfig {
  kind: DefinitionKind;
  title: string;
  description: string;
  queryKey: string;
  requiresProfilParent?: boolean;
  getList: (args: {
    pageNumber: number;
    pageSize: number;
    search?: string;
    sortBy: string;
    sortDirection: 'asc' | 'desc';
  }) => Promise<{
    data: WindoDefinitionGetDto[];
    totalCount: number;
    totalPages: number;
    hasPreviousPage: boolean;
    hasNextPage: boolean;
  }>;
  create: (data: WindoDefinitionCreateDto) => Promise<WindoDefinitionGetDto>;
  update: (id: number, data: WindoDefinitionCreateDto) => Promise<WindoDefinitionGetDto>;
  remove: (id: number) => Promise<void>;
}

const PAGE_KEY = 'windo-profil-demir-vida-management';
const PAGE_SIZE_OPTIONS = [10, 20, 50] as const;
const EMPTY_DEFINITION_ROWS: WindoDefinitionGetDto[] = [];
const SORT_MAP: Record<SortKey, string> = {
  id: 'Id',
  name: 'Name',
  profilName: 'ProfilDefinition.Name',
  createdDate: 'CreatedDate',
  updatedDate: 'UpdatedDate',
};

function DefinitionManagementTable({ config }: { config: DefinitionSectionConfig }): ReactElement {
  const { t, i18n } = useTranslation(WINDO_I18N_NS);
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [pageNumber, setPageNumber] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sortBy, setSortBy] = useState<SortKey>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [draftFilterRows, setDraftFilterRows] = useState<FilterRow[]>([]);
  const [appliedFilterRows, setAppliedFilterRows] = useState<FilterRow[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [draftName, setDraftName] = useState('');
  const [draftProfilDefinitionId, setDraftProfilDefinitionId] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<WindoDefinitionGetDto | null>(null);
  const defaultColumns = useMemo(
    () => (config.requiresProfilParent ? ['id', 'name', 'profilName', 'createdDate', 'updatedDate'] : ['id', 'name', 'createdDate', 'updatedDate']),
    [config.requiresProfilParent]
  );
  const [columnOrder, setColumnOrder] = useState<string[]>(defaultColumns);
  const [visibleColumns, setVisibleColumns] = useState<string[]>(defaultColumns);
  const { profilOptions, isLoading: isProfilOptionsLoading } = useWindoDefinitionOptions();

  const dateLocale = i18n.language.startsWith('tr') ? 'tr-TR' : 'en-US';

  const filterColumns = useMemo(
    () => [{ value: 'name', type: 'string' as const, labelKey: 'table.filterName' }],
    []
  );

  useEffect(() => {
    const defaults = defaultColumns;
    const prefs = loadColumnPreferences(`${PAGE_KEY}-${config.kind}`, user?.id, defaults);
    setVisibleColumns(prefs.visibleKeys);
    setColumnOrder(prefs.order);
  }, [config.kind, defaultColumns, user?.id]);

  const serverSearchTerm = useMemo(() => {
    const filterValue = appliedFilterRows.find((row) => row.column === 'name')?.value?.trim() ?? '';
    return filterValue || searchTerm.trim();
  }, [appliedFilterRows, searchTerm]);

  const { data: apiResponse, isLoading, isFetching } = useQuery({
    queryKey: ['windo-definition-management', config.queryKey, pageNumber, pageSize, serverSearchTerm, sortBy, sortDirection],
    queryFn: () =>
      config.getList({
        pageNumber,
        pageSize,
        search: serverSearchTerm || undefined,
        sortBy: SORT_MAP[sortBy],
        sortDirection,
      }),
  });

  const data = apiResponse?.data ?? EMPTY_DEFINITION_ROWS;
  const totalCount = apiResponse?.totalCount ?? 0;
  const totalPages = apiResponse?.totalPages ?? 1;
  const startRow = totalCount === 0 ? 0 : (pageNumber - 1) * pageSize + 1;
  const endRow = totalCount === 0 ? 0 : Math.min(pageNumber * pageSize, totalCount);
  const appliedFilterCount = appliedFilterRows.filter((row) => row.value.trim().length > 0).length;
  const orderedVisibleColumns = useMemo(
    () => columnOrder.filter((key) => visibleColumns.includes(key)) as SortKey[],
    [columnOrder, visibleColumns]
  );

  const columns = useMemo<DataTableGridColumn<SortKey>[]>(
    () => [
      { key: 'id', label: t('table.id'), cellClassName: 'whitespace-nowrap text-slate-500' },
      { key: 'name', label: t('table.name') },
      ...(config.requiresProfilParent ? [{ key: 'profilName' as SortKey, label: t('table.profilName') }] : []),
      { key: 'createdDate', label: t('table.createdDate') },
      { key: 'updatedDate', label: t('table.updatedDate') },
    ],
    [config.requiresProfilParent, t]
  );

  const profilComboboxOptions = useMemo<ComboboxOption[]>(
    () => profilOptions.map((option) => ({ value: String(option.id), label: option.name })),
    [profilOptions]
  );

  const exportColumns = useMemo(
    () =>
      orderedVisibleColumns.map((key) => ({
        key,
        label: columns.find((column) => column.key === key)?.label ?? key,
      })),
    [columns, orderedVisibleColumns]
  );

  const formatDateCell = useCallback(
    (value: string | null | undefined): string => {
      if (!value) return t('table.dateDash');
      return new Date(value).toLocaleDateString(dateLocale);
    },
    [dateLocale, t]
  );

  const exportRows = useMemo(
    () =>
      data.map((row) => ({
        id: row.id,
        name: row.name,
        profilName: row.profilDefinitionName ?? '',
        createdDate: row.createdDate ? new Date(row.createdDate).toLocaleDateString(dateLocale) : '',
        updatedDate: row.updatedDate ? new Date(row.updatedDate).toLocaleDateString(dateLocale) : '',
      })),
    [data, dateLocale]
  );

  const invalidate = async (): Promise<void> => {
    await queryClient.invalidateQueries({ queryKey: ['windo-definition-management', config.queryKey] });
    await queryClient.invalidateQueries({ queryKey: ['windo-definition', config.kind] });
  };

  const createMutation = useMutation({
    mutationFn: config.create,
    onSuccess: async () => {
      toast.success(t('toasts.created', { section: config.title }));
      await invalidate();
      setDialogOpen(false);
      setDraftName('');
      setDraftProfilDefinitionId(null);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: WindoDefinitionCreateDto }) => config.update(id, data),
    onSuccess: async () => {
      toast.success(t('toasts.updated', { section: config.title }));
      await invalidate();
      setDialogOpen(false);
      setEditingItem(null);
      setDraftName('');
      setDraftProfilDefinitionId(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: config.remove,
    onSuccess: async () => {
      toast.success(t('toasts.deleted', { section: config.title }));
      await invalidate();
    },
  });

  const handleSubmit = async (): Promise<void> => {
    const name = draftName.trim();
    if (!name) {
      toast.error(t('validation.nameRequired'));
      return;
    }

    if (config.requiresProfilParent && !draftProfilDefinitionId) {
      toast.error(t('validation.profilRequired'));
      return;
    }

    const payload: WindoDefinitionCreateDto = {
      name,
      profilDefinitionId: config.requiresProfilParent && draftProfilDefinitionId ? Number(draftProfilDefinitionId) : null,
    };

    if (editingItem) {
      await updateMutation.mutateAsync({ id: editingItem.id, data: payload });
      return;
    }

    await createMutation.mutateAsync(payload);
  };

  useEffect(() => {
    setPageNumber(1);
  }, [pageSize, serverSearchTerm, sortBy, sortDirection]);

  const paginationInfoText = t('table.pagination', { total: totalCount, from: startRow, to: endRow });

  return (
    <>
      <Card className={MANAGEMENT_LIST_CARD_CLASSNAME}>
        <CardHeader className={MANAGEMENT_LIST_CARD_HEADER_CLASSNAME}>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div className="space-y-1">
              <CardTitle className={MANAGEMENT_LIST_CARD_TITLE_CLASSNAME}>{config.title}</CardTitle>
              <p className="text-sm text-muted-foreground">{config.description}</p>
            </div>
            <Button
              type="button"
              className="h-11 rounded-xl bg-linear-to-r from-pink-600 to-orange-600 px-6 font-semibold text-white"
              onClick={() => {
                setEditingItem(null);
                setDraftName('');
                setDraftProfilDefinitionId(null);
                setDialogOpen(true);
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              {t('table.newRecord')}
            </Button>
          </div>
          <DataTableActionBar
            pageKey={`${PAGE_KEY}-${config.kind}`}
            userId={user?.id}
            columns={columns.map((column) => ({ key: column.key, label: column.label }))}
            visibleColumns={visibleColumns}
            columnOrder={columnOrder}
            onVisibleColumnsChange={setVisibleColumns}
            onColumnOrderChange={setColumnOrder}
            exportFileName={`windo-${config.kind}`}
            exportColumns={exportColumns}
            exportRows={exportRows}
            filterColumns={filterColumns}
            defaultFilterColumn="name"
            draftFilterRows={draftFilterRows}
            onDraftFilterRowsChange={setDraftFilterRows}
            onApplyFilters={() => setAppliedFilterRows(draftFilterRows)}
            onClearFilters={() => {
              setDraftFilterRows([]);
              setAppliedFilterRows([]);
            }}
            translationNamespace={WINDO_I18N_NS}
            appliedFilterCount={appliedFilterCount}
            searchValue={searchTerm}
            searchPlaceholder={t('table.searchPlaceholder')}
            onSearchChange={setSearchTerm}
            leftSlot={
              <Button
                variant="outline"
                size="sm"
                className={MANAGEMENT_TOOLBAR_OUTLINE_BUTTON_CLASSNAME}
                onClick={() => void invalidate()}
                disabled={isFetching}
              >
                {isFetching ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                {t('table.refresh')}
              </Button>
            }
          />
        </CardHeader>
        <CardContent className={MANAGEMENT_LIST_CARD_CONTENT_CLASSNAME}>
          <div className={MANAGEMENT_LIST_TABLE_SHELL_CLASSNAME}>
            <DataTableGrid
              columns={columns}
              visibleColumnKeys={orderedVisibleColumns}
              rows={data}
              rowKey={(row) => row.id}
              renderCell={(row, key) => {
                if (key === 'id') return `#${row.id}`;
                if (key === 'profilName') return row.profilDefinitionName ?? '-';
                if (key === 'createdDate') return formatDateCell(row.createdDate);
                if (key === 'updatedDate') return formatDateCell(row.updatedDate);
                return row.name;
              }}
              sortBy={sortBy}
              sortDirection={sortDirection}
              onSort={(key) => {
                if (sortBy === key) {
                  setSortDirection((current) => (current === 'asc' ? 'desc' : 'asc'));
                  return;
                }
                setSortBy(key);
                setSortDirection('asc');
              }}
              renderSortIcon={(key) => {
                if (sortBy !== key) return <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground/70" />;
                return sortDirection === 'asc' ? (
                  <ArrowUp className="h-3.5 w-3.5 text-foreground" />
                ) : (
                  <ArrowDown className="h-3.5 w-3.5 text-foreground" />
                );
              }}
              isLoading={isLoading}
              loadingText={t('table.loading')}
              emptyText={t('table.empty')}
              minTableWidthClassName="min-w-[720px]"
              showActionsColumn
              actionsHeaderLabel={t('table.actions')}
              renderActionsCell={(item) => (
                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="rounded-xl"
                    onClick={() => {
                      setEditingItem(item);
                      setDraftName(item.name);
                      setDraftProfilDefinitionId(item.profilDefinitionId ? String(item.profilDefinitionId) : null);
                      setDialogOpen(true);
                    }}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="rounded-xl text-red-600"
                    onClick={() => {
                      void deleteMutation.mutateAsync(item.id);
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              )}
              pageSize={pageSize}
              pageSizeOptions={PAGE_SIZE_OPTIONS}
              onPageSizeChange={(size) => {
                setPageSize(size);
                setPageNumber(1);
              }}
              pageNumber={pageNumber}
              totalPages={totalPages}
              hasPreviousPage={apiResponse?.hasPreviousPage ?? pageNumber > 1}
              hasNextPage={apiResponse?.hasNextPage ?? pageNumber < totalPages}
              onPreviousPage={() => setPageNumber((current) => Math.max(1, current - 1))}
              onNextPage={() => setPageNumber((current) => Math.min(totalPages, current + 1))}
              previousLabel={t('table.previous')}
              nextLabel={t('table.next')}
              paginationInfoText={paginationInfoText}
              disablePaginationButtons={isFetching}
            />
          </div>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingItem
                ? t('dialog.editTitle', { section: config.title })
                : t('dialog.addTitle', { section: config.title })}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t('dialog.nameLabel')}</Label>
              <Input value={draftName} onChange={(e) => setDraftName(e.target.value)} maxLength={150} />
            </div>
            {config.requiresProfilParent ? (
              <div className="space-y-2">
                <Label>{t('dialog.profilLabel')}</Label>
                <VoiceSearchCombobox
                  options={profilComboboxOptions}
                  value={draftProfilDefinitionId}
                  onSelect={setDraftProfilDefinitionId}
                  placeholder={isProfilOptionsLoading ? t('table.loading') : t('dialog.profilPlaceholder')}
                  searchPlaceholder={t('dialog.profilSearchPlaceholder')}
                  disabled={isProfilOptionsLoading}
                  className="h-11 rounded-xl border-slate-200 bg-slate-50 text-slate-900 dark:border-white/10 dark:bg-[#0f0a18] dark:text-white"
                />
              </div>
            ) : null}
            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                {t('dialog.cancel')}
              </Button>
              <Button
                type="button"
                className="bg-linear-to-r from-pink-600 to-orange-600 text-white"
                onClick={() => void handleSubmit()}
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {t('dialog.save')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function WindoProfilDemirVidaTanimlamaPage(): ReactElement {
  const { t } = useTranslation(WINDO_I18N_NS);
  const { setPageTitle } = useUIStore();
  const [activeKind, setActiveKind] = useState<DefinitionKind>('profil');

  useEffect(() => {
    setPageTitle(t('page.documentTitle'));
    return () => setPageTitle(null);
  }, [setPageTitle, t]);

  const sections = useMemo<DefinitionSectionConfig[]>(
    () => [
      {
        kind: 'profil',
        title: t('sections.profil.title'),
        description: t('sections.profil.description'),
        queryKey: 'profil',
        getList: windoDefinitionApi.getProfilPagedList,
        create: windoDefinitionApi.createProfil,
        update: windoDefinitionApi.updateProfil,
        remove: windoDefinitionApi.deleteProfil,
      },
      {
        kind: 'demir',
        title: t('sections.demir.title'),
        description: t('sections.demir.description'),
        queryKey: 'demir',
        requiresProfilParent: true,
        getList: windoDefinitionApi.getDemirPagedList,
        create: windoDefinitionApi.createDemir,
        update: windoDefinitionApi.updateDemir,
        remove: windoDefinitionApi.deleteDemir,
      },
      {
        kind: 'vida',
        title: t('sections.vida.title'),
        description: t('sections.vida.description'),
        queryKey: 'vida',
        requiresProfilParent: true,
        getList: windoDefinitionApi.getVidaPagedList,
        create: windoDefinitionApi.createVida,
        update: windoDefinitionApi.updateVida,
        remove: windoDefinitionApi.deleteVida,
      },
    ],
    [t]
  );

  const activeSection = sections.find((section) => section.kind === activeKind) ?? sections[0];

  return (
    <div className="space-y-6">
      <div className="rounded-4xl border border-slate-200 bg-white px-6 py-8 shadow-sm dark:border-white/10 dark:bg-[#180F22]">
        <h1 className="text-3xl font-bold tracking-tight">{t('page.title')}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{t('page.description')}</p>
      </div>

      <div className="flex flex-wrap gap-3">
        {sections.map((section) => {
          const isActive = section.kind === activeKind;
          return (
            <Button
              key={section.kind}
              type="button"
              variant={isActive ? 'default' : 'outline'}
              className={
                isActive
                  ? 'rounded-xl bg-linear-to-r from-pink-600 to-orange-600 text-white'
                  : 'rounded-xl border-slate-300 bg-white dark:border-white/10 dark:bg-transparent'
              }
              onClick={() => setActiveKind(section.kind)}
            >
              {section.title}
            </Button>
          );
        })}
      </div>

      <DefinitionManagementTable config={activeSection} />
    </div>
  );
}

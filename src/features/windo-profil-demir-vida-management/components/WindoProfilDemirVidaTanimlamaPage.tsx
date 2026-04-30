import { type ReactElement, useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ArrowDown, ArrowUp, ArrowUpDown, Loader2, Pencil, Plus, RefreshCw, Trash2 } from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DataTableActionBar, DataTableGrid, type DataTableGridColumn } from '@/components/shared';
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
import type { WindoDefinitionCreateDto, WindoDefinitionGetDto } from '../types/windo-definition-types';

type DefinitionKind = 'profil' | 'demir' | 'vida';
type SortKey = 'id' | 'name' | 'createdDate' | 'updatedDate';

interface DefinitionSectionConfig {
  kind: DefinitionKind;
  title: string;
  description: string;
  queryKey: string;
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
const SORT_MAP: Record<SortKey, string> = {
  id: 'Id',
  name: 'Name',
  createdDate: 'CreatedDate',
  updatedDate: 'UpdatedDate',
};
const FILTER_COLUMNS = [{ value: 'name', type: 'string', labelKey: 'name' }] as const;

function DefinitionManagementTable({ config }: { config: DefinitionSectionConfig }): ReactElement {
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
  const [editingItem, setEditingItem] = useState<WindoDefinitionGetDto | null>(null);
  const [columnOrder, setColumnOrder] = useState<string[]>(['id', 'name', 'createdDate', 'updatedDate']);
  const [visibleColumns, setVisibleColumns] = useState<string[]>(['id', 'name', 'createdDate', 'updatedDate']);

  useEffect(() => {
    const defaults = ['id', 'name', 'createdDate', 'updatedDate'];
    const prefs = loadColumnPreferences(`${PAGE_KEY}-${config.kind}`, user?.id, defaults);
    setVisibleColumns(prefs.visibleKeys);
    setColumnOrder(prefs.order);
  }, [config.kind, user?.id]);

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

  const data = apiResponse?.data ?? [];
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
      { key: 'id', label: 'ID', cellClassName: 'whitespace-nowrap text-slate-500' },
      { key: 'name', label: 'Ad' },
      { key: 'createdDate', label: 'Oluşturulma' },
      { key: 'updatedDate', label: 'Güncellenme' },
    ],
    []
  );

  const exportColumns = useMemo(
    () =>
      orderedVisibleColumns.map((key) => ({
        key,
        label: columns.find((column) => column.key === key)?.label ?? key,
      })),
    [columns, orderedVisibleColumns]
  );

  const exportRows = useMemo(
    () =>
      data.map((row) => ({
        id: row.id,
        name: row.name,
        createdDate: row.createdDate ? new Date(row.createdDate).toLocaleDateString('tr-TR') : '',
        updatedDate: row.updatedDate ? new Date(row.updatedDate).toLocaleDateString('tr-TR') : '',
      })),
    [data]
  );

  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: ['windo-definition-management', config.queryKey] });
    await queryClient.invalidateQueries({ queryKey: ['windo-definition', config.kind] });
  };

  const createMutation = useMutation({
    mutationFn: config.create,
    onSuccess: async () => {
      toast.success(`${config.title} kaydı oluşturuldu`);
      await invalidate();
      setDialogOpen(false);
      setDraftName('');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: WindoDefinitionCreateDto }) => config.update(id, data),
    onSuccess: async () => {
      toast.success(`${config.title} kaydı güncellendi`);
      await invalidate();
      setDialogOpen(false);
      setEditingItem(null);
      setDraftName('');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: config.remove,
    onSuccess: async () => {
      toast.success(`${config.title} kaydı silindi`);
      await invalidate();
    },
  });

  const handleSubmit = async () => {
    const name = draftName.trim();
    if (!name) {
      toast.error('Ad alanı zorunludur');
      return;
    }

    if (editingItem) {
      await updateMutation.mutateAsync({ id: editingItem.id, data: { name } });
      return;
    }

    await createMutation.mutateAsync({ name });
  };

  useEffect(() => {
    setPageNumber(1);
  }, [pageSize, serverSearchTerm, sortBy, sortDirection]);

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
                setDialogOpen(true);
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              Yeni Kayıt
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
            filterColumns={FILTER_COLUMNS}
            defaultFilterColumn="name"
            draftFilterRows={draftFilterRows}
            onDraftFilterRowsChange={setDraftFilterRows}
            onApplyFilters={() => setAppliedFilterRows(draftFilterRows)}
            onClearFilters={() => {
              setDraftFilterRows([]);
              setAppliedFilterRows([]);
            }}
            translationNamespace="common"
            appliedFilterCount={appliedFilterCount}
            searchValue={searchTerm}
            searchPlaceholder="Tanım ara..."
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
                Yenile
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
                if (key === 'createdDate') return row.createdDate ? new Date(row.createdDate).toLocaleDateString('tr-TR') : '-';
                if (key === 'updatedDate') return row.updatedDate ? new Date(row.updatedDate).toLocaleDateString('tr-TR') : '-';
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
              loadingText="Tanımlar yükleniyor..."
              emptyText="Kayıt bulunamadı."
              minTableWidthClassName="min-w-[720px]"
              showActionsColumn
              actionsHeaderLabel="İşlem"
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
              previousLabel="Önceki"
              nextLabel="Sonraki"
              paginationInfoText={`Toplam ${totalCount} kayıttan ${startRow}-${endRow} arası gösteriliyor`}
              disablePaginationButtons={isFetching}
            />
          </div>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingItem ? `${config.title} güncelle` : `${config.title} ekle`}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Ad</Label>
              <Input value={draftName} onChange={(e) => setDraftName(e.target.value)} maxLength={150} />
            </div>
            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                İptal
              </Button>
              <Button
                type="button"
                className="bg-linear-to-r from-pink-600 to-orange-600 text-white"
                onClick={() => void handleSubmit()}
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                Kaydet
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function WindoProfilDemirVidaTanimlamaPage(): ReactElement {
  const { setPageTitle } = useUIStore();
  const [activeKind, setActiveKind] = useState<DefinitionKind>('profil');

  useEffect(() => {
    setPageTitle('Windo Profil / Demir / Vida');
    return () => setPageTitle(null);
  }, [setPageTitle]);

  const sections: DefinitionSectionConfig[] = [
    {
      kind: 'profil',
      title: 'Profil Tanımla',
      description: 'Satır bazında seçilecek profil tanımlarını yönetin.',
      queryKey: 'profil',
      getList: windoDefinitionApi.getProfilPagedList,
      create: windoDefinitionApi.createProfil,
      update: windoDefinitionApi.updateProfil,
      remove: windoDefinitionApi.deleteProfil,
    },
    {
      kind: 'demir',
      title: 'Demir Tanımla',
      description: 'Satır bazında seçilecek demir tanımlarını yönetin.',
      queryKey: 'demir',
      getList: windoDefinitionApi.getDemirPagedList,
      create: windoDefinitionApi.createDemir,
      update: windoDefinitionApi.updateDemir,
      remove: windoDefinitionApi.deleteDemir,
    },
    {
      kind: 'vida',
      title: 'Vida Tanımla',
      description: 'Satır bazında seçilecek vida tanımlarını yönetin.',
      queryKey: 'vida',
      getList: windoDefinitionApi.getVidaPagedList,
      create: windoDefinitionApi.createVida,
      update: windoDefinitionApi.updateVida,
      remove: windoDefinitionApi.deleteVida,
    },
  ];

  const activeSection = sections.find((section) => section.kind === activeKind) ?? sections[0];

  return (
    <div className="space-y-6">
      <div className="rounded-[2rem] border border-slate-200 bg-white px-6 py-8 shadow-sm dark:border-white/10 dark:bg-[#180F22]">
        <h1 className="text-3xl font-bold tracking-tight">Windo Profil / Demir / Vida Tanımlama</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Profil, demir ve vida kayıtlarını proje genelindeki yönetim sayfalarıyla uyumlu, sayfalı tablo yapısında yönetin.
        </p>
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

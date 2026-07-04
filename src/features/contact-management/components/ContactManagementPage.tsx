import { type ReactElement, useState, useEffect, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useUIStore } from '@/stores/ui-store';
import { useAuthStore } from '@/stores/auth-store';
import { Button } from '@/components/ui/button';
import { ArrowDown, ArrowUp, ArrowUpDown, Eye, EyeOff, Loader2, Plus, RefreshCw } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { DataTableActionBar, type DataTableGridColumn } from '@/components/shared';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { loadColumnPreferences, saveColumnPreferences } from '@/lib/column-preferences';
import { arraysEqual } from '@/lib/utils';
import {
  MANAGEMENT_LIST_CARD_CLASSNAME,
  MANAGEMENT_LIST_CARD_CONTENT_CLASSNAME,
  MANAGEMENT_LIST_CARD_HEADER_CLASSNAME,
  MANAGEMENT_LIST_CARD_TITLE_CLASSNAME,
  MANAGEMENT_LIST_TABLE_SHELL_CLASSNAME,
  MANAGEMENT_TOOLBAR_OUTLINE_BUTTON_CLASSNAME,
} from '@/lib/management-list-layout';
import { CONTACT_MANAGEMENT_QUERY_KEYS, queryKeys } from '../utils/query-keys';
import { ContactTable, getColumnsConfig } from './ContactTable';
import { ContactForm } from './ContactForm';
import { ContactStats } from './ContactStats';
import { useCreateContact } from '../hooks/useCreateContact';
import { useUpdateContact } from '../hooks/useUpdateContact';
import { useContactList } from '../hooks/useContactList';
import { useContactStats } from '../hooks/useContactStats';
import { ActivityForm } from '@/features/activity-management/components/ActivityForm';
import { useCreateActivity } from '@/features/activity-management/hooks/useCreateActivity';
import { buildCreateActivityPayload } from '@/features/activity-management/utils/build-create-payload';
import type { ActivityFormSchema } from '@/features/activity-management/types/activity-types';
import type { ContactDto } from '../types/contact-types';
import type { ContactFormSchema } from '../types/contact-types';
import { contactFilterRowsToPagedFilters, CONTACT_FILTER_COLUMNS } from '../types/contact-filter.types';
import type { FilterRow } from '@/lib/advanced-filter-types';
import { normalizeQueryParams } from '@/utils/query-params';
import { contactApi } from '../api/contact-api';

const EMPTY_CONTACTS: ContactDto[] = [];
const PAGE_KEY = 'contact-management';
const PAGE_SIZE_OPTIONS = [10, 20, 50] as const;

type ContactColumnKey = keyof ContactDto;

function getQuickActivityWindow(): { start: string; end: string } {
  const start = new Date();
  const end = new Date(start);
  end.setHours(end.getHours() + 1, end.getMinutes(), 0, 0);
  start.setSeconds(0, 0);

  const toInputValue = (value: Date): string => {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');
    const hour = String(value.getHours()).padStart(2, '0');
    const minute = String(value.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hour}:${minute}`;
  };

  return {
    start: toInputValue(start),
    end: toInputValue(end),
  };
}

function resolveLabel(
  t: (key: string) => string,
  key: string,
  fallback: string
): string {
  const translated = t(key);
  return translated && translated !== key ? translated : fallback;
}

export function ContactManagementPage(): ReactElement {
  const { t, i18n } = useTranslation(['contact-management', 'common']);
  const { user } = useAuthStore();
  const { setPageTitle } = useUIStore();

  const [formOpen, setFormOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<ContactDto | null>(null);
  const [quickActivityContact, setQuickActivityContact] = useState<ContactDto | null>(null);
  const [showStats, setShowStats] = useState(() => {
    const userId = useAuthStore.getState().user?.id;
    const stored = localStorage.getItem(`contact-management-show-stats-${userId || 'default'}`);
    return stored !== null ? stored === 'true' : true;
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [pageNumber, setPageNumber] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sortBy, setSortBy] = useState<ContactColumnKey>('fullName');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [draftFilterRows, setDraftFilterRows] = useState<FilterRow[]>([]);
  const [appliedFilterRows, setAppliedFilterRows] = useState<FilterRow[]>([]);

  const queryClient = useQueryClient();
  const createContact = useCreateContact();
  const updateContact = useUpdateContact();
  const createActivity = useCreateActivity();
  const quickActivityWindow = useMemo(() => getQuickActivityWindow(), []);

  const tableColumns = useMemo(() => getColumnsConfig(t), [t]);
  const baseColumns = useMemo(
    () =>
      tableColumns.map((c) => ({
        key: c.key as string,
        label: c.label,
      })),
    [tableColumns]
  );
  const defaultColumnKeys = useMemo(() => tableColumns.map((c) => c.key as string), [tableColumns]);
  const [columnOrder, setColumnOrder] = useState<string[]>(() => defaultColumnKeys);
  const [visibleColumns, setVisibleColumns] = useState<string[]>(() => defaultColumnKeys);

  useEffect(() => {
    setPageTitle(t('menu'));
    return () => setPageTitle(null);
  }, [t, setPageTitle]);

  useEffect(() => {
    localStorage.setItem(`contact-management-show-stats-${user?.id || 'default'}`, String(showStats));
  }, [showStats, user?.id]);

  useEffect(() => {
    const prefs = loadColumnPreferences(PAGE_KEY, user?.id, defaultColumnKeys);
    setVisibleColumns((current) => arraysEqual(current, prefs.visibleKeys) ? current : prefs.visibleKeys);
    setColumnOrder((current) => arraysEqual(current, prefs.order) ? current : prefs.order);
  }, [user?.id, defaultColumnKeys]);

  const { data: contactStats, isLoading: isStatsLoading } = useContactStats();

  const listQueryParams = useMemo(() => {
    const apiFilters = contactFilterRowsToPagedFilters(appliedFilterRows);
    return {
      pageNumber,
      pageSize,
      sortBy,
      sortDirection,
      ...(searchTerm ? { search: searchTerm } : {}),
      ...(apiFilters.length > 0 ? { filters: apiFilters, filterLogic: 'and' as const } : {}),
    };
  }, [pageNumber, pageSize, sortBy, sortDirection, searchTerm, appliedFilterRows]);

  const { data: apiResponse, isLoading } = useContactList(listQueryParams);

  const contacts = useMemo<ContactDto[]>(
    () => apiResponse?.data ?? EMPTY_CONTACTS,
    [apiResponse?.data]
  );

  const currentPageRows = contacts;
  const totalCount = apiResponse?.totalCount ?? 0;
  const totalPages = apiResponse?.totalPages ?? Math.max(1, Math.ceil(totalCount / pageSize));
  const startRow = totalCount === 0 ? 0 : (pageNumber - 1) * pageSize + 1;
  const endRow = totalCount === 0 ? 0 : Math.min(pageNumber * pageSize, totalCount);

  const orderedVisibleColumns = columnOrder.filter((k) => visibleColumns.includes(k)) as ContactColumnKey[];

  const filterColumns = useMemo(
    () =>
      CONTACT_FILTER_COLUMNS.map((col) => ({
        value: col.value,
        type: col.type,
        labelKey: col.labelKey,
      })),
    []
  );

  const exportColumns = useMemo(
    () =>
      orderedVisibleColumns.map((key) => {
        const col = tableColumns.find((c) => c.key === key);
        return { key, label: col?.label ?? key };
      }),
    [tableColumns, orderedVisibleColumns]
  );

  const exportRows = useMemo<Record<string, unknown>[]>(
    () =>
      currentPageRows.map((c) => {
        const row: Record<string, unknown> = {};
        orderedVisibleColumns.forEach((key) => {
          const val = c[key];
          if (key === 'createdDate' && val) {
            row[key] = new Date(String(val)).toLocaleDateString(i18n.language);
          } else if (key === 'fullName') {
            const composed = [c.firstName, c.middleName, c.lastName].filter(Boolean).join(' ').trim();
            row[key] = (composed || val) ?? '';
          } else {
            row[key] = val ?? '';
          }
        });
        return row;
      }),
    [currentPageRows, orderedVisibleColumns, i18n.language]
  );

  const getExportData = useCallback(async (): Promise<{ columns: { key: string; label: string }[]; rows: Record<string, unknown>[] }> => {
    const listResponse = await queryClient.fetchQuery({
      queryKey: queryKeys.list(normalizeQueryParams(listQueryParams)),
      queryFn: () => contactApi.getList(listQueryParams),
    });
    const list: ContactDto[] = listResponse?.data ?? contacts;
    return {
      columns: exportColumns,
      rows: list.map((c) => {
        const row: Record<string, unknown> = {};
        orderedVisibleColumns.forEach((key) => {
          const val = c[key];
          if (key === 'createdDate' && val) {
            row[key] = new Date(String(val)).toLocaleDateString(i18n.language);
          } else if (key === 'fullName') {
            const composed = [c.firstName, c.middleName, c.lastName].filter(Boolean).join(' ').trim();
            row[key] = (composed || val) ?? '';
          } else {
            row[key] = val ?? '';
          }
        });
        return row;
      }),
    };
  }, [contacts, exportColumns, orderedVisibleColumns, i18n.language, listQueryParams, queryClient]);

  const appliedFilterCount = useMemo(
    () => appliedFilterRows.filter((r) => r.value.trim()).length,
    [appliedFilterRows]
  );

  useEffect(() => {
    setPageNumber(1);
  }, [pageSize, searchTerm, appliedFilterRows, sortBy, sortDirection]);

  useEffect(() => {
    if (totalCount === 0) {
      return;
    }

    setPageNumber((current) => (current > totalPages ? totalPages : current));
  }, [totalCount, totalPages]);

  const handleAddClick = (): void => {
    setEditingContact(null);
    setFormOpen(true);
  };

  const handleEdit = (contact: ContactDto): void => {
    setEditingContact(contact);
    setFormOpen(true);
  };

  const handleQuickActivity = (contact: ContactDto): void => {
    setQuickActivityContact(contact);
  };

  const handleFormClose = (open: boolean): void => {
    setFormOpen(open);
    if (!open) setEditingContact(null);
  };

  const handleRefresh = async (): Promise<void> => {
    await queryClient.invalidateQueries({ queryKey: [CONTACT_MANAGEMENT_QUERY_KEYS.LIST] });
  };

  const handleFormSubmit = async (data: ContactFormSchema): Promise<void> => {
    const fullName = [data.firstName, data.middleName, data.lastName]
      .map((part) => (part || '').trim())
      .filter(Boolean)
      .join(' ');

    const cleanData = {
      salutation: data.salutation,
      firstName: data.firstName.trim(),
      middleName: data.middleName?.trim() || undefined,
      lastName: data.lastName.trim(),
      fullName,
      email: data.email || undefined,
      phone: data.phone || undefined,
      mobile: data.mobile || undefined,
      notes: data.notes || undefined,
      customerId: data.customerId,
      titleId: data.titleId || null,
    };

    if (editingContact) {
      await updateContact.mutateAsync({
        id: editingContact.id,
        data: cleanData,
      });
    } else {
      await createContact.mutateAsync(cleanData);
    }
    setFormOpen(false);
    setEditingContact(null);
  };

  const handleQuickActivitySubmit = async (data: ActivityFormSchema): Promise<void> => {
    await createActivity.mutateAsync(
      buildCreateActivityPayload(data, { assignedUserIdFallback: user?.id })
    );
    setQuickActivityContact(null);
  };

  const columns = useMemo<DataTableGridColumn<ContactColumnKey>[]>(
    () =>
      tableColumns.map((c) => ({
        key: c.key as ContactColumnKey,
        label: c.label,
        headClassName: c.headClassName,
        cellClassName: c.className,
      })),
    [tableColumns]
  );

  return (
    <div className="w-full space-y-6 relative">
      <div className="space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pt-2">
          <div className="space-y-1">
            <h1 className="text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-white transition-colors">
              {t('menu')}
            </h1>
            <p className="text-zinc-500 dark:text-muted-foreground text-sm flex items-center gap-2 font-medium">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse shadow-[0_0_8px_rgba(236,72,153,0.6)]" />
              {t('description')}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={() => setShowStats((prev) => !prev)}
              className="h-12 px-5 border-slate-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-2xl hover:bg-slate-50 dark:hover:bg-zinc-800 transition-all duration-300 active:scale-[0.98]"
            >
              {showStats ? <EyeOff size={18} className="mr-2" /> : <Eye size={18} className="mr-2" />}
              {showStats
                ? t('hideStats', { defaultValue: 'İstatistikleri Gizle' })
                : t('showStats', { defaultValue: 'İstatistikleri Göster' })}
            </Button>
            <Button
              onClick={handleAddClick}
              className="h-12 px-8 bg-[image:var(--crm-brand-gradient)] rounded-2xl text-white text-sm font-black shadow-xl shadow-primary/20 transition-all duration-300 hover:scale-[1.05] hover:shadow-primary/30 active:scale-[0.98] border-0 opacity-90 grayscale-[0] dark:opacity-100 dark:grayscale-0"
            >
              <Plus size={20} className="mr-2 stroke-[3px]" />
              {t('addButton')}
            </Button>
          </div>
        </div>

        {showStats && <ContactStats stats={contactStats} isLoading={isStatsLoading} />}
      </div>

      <Card className={MANAGEMENT_LIST_CARD_CLASSNAME}>
        <CardHeader className={MANAGEMENT_LIST_CARD_HEADER_CLASSNAME}>
          <CardTitle className={MANAGEMENT_LIST_CARD_TITLE_CLASSNAME}>
            {t('table.listTitle')}
          </CardTitle>
          <DataTableActionBar
            pageKey={PAGE_KEY}
            userId={user?.id}
            columns={baseColumns}
            visibleColumns={visibleColumns}
            columnOrder={columnOrder}
            onVisibleColumnsChange={setVisibleColumns}
            onColumnOrderChange={setColumnOrder}
            exportFileName="contacts"
            exportColumns={exportColumns}
            exportRows={exportRows}
            getExportData={getExportData}
            filterColumns={filterColumns}
            defaultFilterColumn="fullName"
            draftFilterRows={draftFilterRows}
            onDraftFilterRowsChange={setDraftFilterRows}
            onApplyFilters={() => setAppliedFilterRows(draftFilterRows)}
            onClearFilters={() => {
              setDraftFilterRows([]);
              setAppliedFilterRows([]);
            }}
            translationNamespace="contact-management"
            appliedFilterCount={appliedFilterCount}
            searchValue={searchTerm}
            searchPlaceholder={t('common.search')}
            onSearchChange={setSearchTerm}
            leftSlot={
              <>
                <Button
                  variant="outline"
                  size="sm"
                  className={MANAGEMENT_TOOLBAR_OUTLINE_BUTTON_CLASSNAME}
                  onClick={() => handleRefresh()}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <RefreshCw className="h-4 w-4 mr-2" />
                  )}
                  {resolveLabel(t, 'common.refresh', 'Yenile')}
                </Button>
              </>
            }
          />
        </CardHeader>
        <CardContent className={MANAGEMENT_LIST_CARD_CONTENT_CLASSNAME}>
          <div className={MANAGEMENT_LIST_TABLE_SHELL_CLASSNAME}>
            <ContactTable
              columns={columns}
              visibleColumnKeys={orderedVisibleColumns}
              rows={currentPageRows}
              rowKey={(r) => r.id}
              sortBy={sortBy}
              sortDirection={sortDirection}
              onSort={(k) => {
                if (sortBy === k) setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'));
                else {
                  setSortBy(k);
                  setSortDirection('asc');
                }
              }}
              renderSortIcon={(k) => {
                if (sortBy !== k) return <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground/70" />;
                return sortDirection === 'asc' ? (
                  <ArrowUp className="h-3.5 w-3.5 text-foreground" />
                ) : (
                  <ArrowDown className="h-3.5 w-3.5 text-foreground" />
                );
              }}
              isLoading={isLoading}
              loadingText={t('loading')}
              errorText={t('error', { defaultValue: 'Hata oluştu' })}
              emptyText={t('noData')}
              minTableWidthClassName="min-w-[900px] lg:min-w-[1100px]"
              showActionsColumn
              actionsHeaderLabel={t('actions')}
              onEdit={handleEdit}
              onQuickActivity={handleQuickActivity}
              rowClassName="group"
              pageSize={pageSize}
              pageSizeOptions={PAGE_SIZE_OPTIONS}
              onPageSizeChange={(s) => {
                setPageSize(s);
                setPageNumber(1);
              }}
              pageNumber={pageNumber}
              totalPages={totalPages}
              hasPreviousPage={pageNumber > 1}
              hasNextPage={pageNumber < totalPages}
              onPreviousPage={() => setPageNumber((current) => Math.max(1, current - 1))}
              onNextPage={() => setPageNumber((current) => Math.min(totalPages, current + 1))}
              previousLabel={t('common.previous')}
              nextLabel={t('common.next')}
              paginationInfoText={t('common.table.showing', {
                from: startRow,
                to: endRow,
                total: totalCount,
              })}
              disablePaginationButtons={isLoading}
              onColumnOrderChange={(newVisibleOrder) => {
                setColumnOrder((currentOrder) => {
                  const hiddenCols = currentOrder.filter(k => !newVisibleOrder.includes(k));
                  const finalOrder = [...newVisibleOrder, ...hiddenCols];
                  saveColumnPreferences(PAGE_KEY, user?.id, { visibleKeys: visibleColumns, order: finalOrder });
                  return finalOrder;
                });
              }}
            />
          </div>
        </CardContent>
      </Card>

      <ContactForm
        open={formOpen}
        onOpenChange={handleFormClose}
        onSubmit={handleFormSubmit}
        contact={editingContact}
        isLoading={createContact.isPending || updateContact.isPending}
      />

      <ActivityForm
        open={!!quickActivityContact}
        onOpenChange={(open) => {
          if (!open) setQuickActivityContact(null);
        }}
        onSubmit={handleQuickActivitySubmit}
        isLoading={createActivity.isPending}
        initialStartDateTime={quickActivityWindow.start}
        initialEndDateTime={quickActivityWindow.end}
        initialPotentialCustomerId={quickActivityContact?.customerId}
        initialContactId={quickActivityContact?.id}
        initialCustomerDisplayName={quickActivityContact?.customerName ?? undefined}
      />
    </div>
  );
}

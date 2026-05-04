import { type ReactElement, useState, useEffect, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useUIStore } from '@/stores/ui-store';
import { useAuthStore } from '@/stores/auth-store';
import { Button } from '@/components/ui/button';
import { ArrowDown, ArrowUp, ArrowUpDown, Loader2, Plus, RefreshCw } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { DataTableActionBar, type DataTableGridColumn } from '@/components/shared';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { loadColumnPreferences, saveColumnPreferences } from '@/lib/column-preferences';
import {
  MANAGEMENT_LIST_CARD_CLASSNAME,
  MANAGEMENT_LIST_CARD_CONTENT_CLASSNAME,
  MANAGEMENT_LIST_CARD_HEADER_CLASSNAME,
  MANAGEMENT_LIST_CARD_TITLE_CLASSNAME,
  MANAGEMENT_LIST_TABLE_SHELL_CLASSNAME,
  MANAGEMENT_TOOLBAR_OUTLINE_BUTTON_CLASSNAME,
} from '@/lib/management-list-layout';
import { CONTACT_MANAGEMENT_QUERY_KEYS } from '../utils/query-keys';
import { ContactTable, getColumnsConfig } from './ContactTable';
import { ContactForm } from './ContactForm';
import { ContactStats } from './ContactStats';
import { useCreateContact } from '../hooks/useCreateContact';
import { useUpdateContact } from '../hooks/useUpdateContact';
import { useContactList } from '../hooks/useContactList';
import { ActivityForm } from '@/features/activity-management/components/ActivityForm';
import { useCreateActivity } from '@/features/activity-management/hooks/useCreateActivity';
import { buildCreateActivityPayload } from '@/features/activity-management/utils/build-create-payload';
import type { ActivityFormSchema } from '@/features/activity-management/types/activity-types';
import type { ContactDto } from '../types/contact-types';
import type { ContactFormSchema } from '../types/contact-types';
import { applyContactFilters, CONTACT_FILTER_COLUMNS } from '../types/contact-filter.types';
import type { FilterRow } from '@/lib/advanced-filter-types';

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
    const prefs = loadColumnPreferences(PAGE_KEY, user?.id, defaultColumnKeys);
    setVisibleColumns(prefs.visibleKeys);
    setColumnOrder(prefs.order);
  }, [user?.id, defaultColumnKeys]);

  const { data: apiResponse, isLoading } = useContactList({
    pageNumber,
    pageSize,
    search: searchTerm || undefined,
    sortBy,
    sortDirection,
  });

  const contacts = useMemo<ContactDto[]>(
    () => apiResponse?.data ?? EMPTY_CONTACTS,
    [apiResponse?.data]
  );

  const filteredContacts = useMemo<ContactDto[]>(() => {
    if (!contacts.length) return [];
    let result = [...contacts];
    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase();
      result = result.filter(
        (c) =>
          (c.fullName && c.fullName.toLowerCase().includes(lowerSearch)) ||
          (c.firstName && c.firstName.toLowerCase().includes(lowerSearch)) ||
          (c.lastName && c.lastName.toLowerCase().includes(lowerSearch)) ||
          (c.email && c.email.toLowerCase().includes(lowerSearch)) ||
          (c.phone && c.phone?.includes(lowerSearch)) ||
          (c.customerName && c.customerName.toLowerCase().includes(lowerSearch))
      );
    }
    result = applyContactFilters(result, appliedFilterRows);
    return result;
  }, [contacts, searchTerm, appliedFilterRows]);

  const sortedContacts = useMemo(() => {
    const result = [...filteredContacts];
    result.sort((a, b) => {
      const aVal = a[sortBy] != null ? String(a[sortBy]).toLowerCase() : '';
      const bVal = b[sortBy] != null ? String(b[sortBy]).toLowerCase() : '';
      if (sortBy === 'fullName') {
        const aFull = [a.firstName, a.middleName, a.lastName].filter(Boolean).join(' ').trim();
        const bFull = [b.firstName, b.middleName, b.lastName].filter(Boolean).join(' ').trim();
        const cmp = aFull.localeCompare(bFull);
        return sortDirection === 'asc' ? cmp : -cmp;
      }
      const cmp = aVal.localeCompare(bVal);
      return sortDirection === 'asc' ? cmp : -cmp;
    });
    return result;
  }, [filteredContacts, sortBy, sortDirection]);

  const totalCount = apiResponse?.totalCount ?? sortedContacts.length;
  const totalPages = apiResponse?.totalPages ?? Math.max(1, Math.ceil(totalCount / pageSize));
  const startRow = totalCount === 0 ? 0 : (pageNumber - 1) * pageSize + 1;
  const endRow = totalCount === 0 ? 0 : Math.min(startRow + sortedContacts.length - 1, totalCount);
  const currentPageRows = sortedContacts;

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
    const list: ContactDto[] = sortedContacts;
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
  }, [exportColumns, orderedVisibleColumns, i18n.language, sortedContacts]);

  const appliedFilterCount = useMemo(
    () => appliedFilterRows.filter((r) => r.value.trim()).length,
    [appliedFilterRows]
  );

  useEffect(() => {
    setPageNumber(1);
  }, [pageSize, searchTerm, appliedFilterRows, sortBy, sortDirection]);

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
        cellClassName: c.className,
      })),
    [tableColumns]
  );

  return (
    <div className="w-full space-y-6 relative">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pt-2 pb-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-white transition-colors">
            {t('menu')}
          </h1>
          <p className="text-zinc-500 dark:text-muted-foreground text-sm flex items-center gap-2 font-medium">
            <span className="w-2 h-2 rounded-full bg-pink-500 animate-pulse shadow-[0_0_8px_rgba(236,72,153,0.6)]" />
            {t('description')}
          </p>
        </div>
        <Button
          onClick={handleAddClick}
          className="h-12 px-8 bg-linear-to-r from-pink-600 to-orange-600 rounded-2xl text-white text-sm font-black shadow-xl shadow-pink-500/20 transition-all duration-300 hover:scale-[1.05] hover:shadow-pink-500/30 active:scale-[0.98] border-0 opacity-90 grayscale-[0] dark:opacity-100 dark:grayscale-0"
        >
          <Plus size={20} className="mr-2 stroke-[3px]" />
          {t('addButton')}
        </Button>
      </div>

      <ContactStats />

      <Card className={MANAGEMENT_LIST_CARD_CLASSNAME}>
        <CardHeader className={MANAGEMENT_LIST_CARD_HEADER_CLASSNAME}>
          <CardTitle className={MANAGEMENT_LIST_CARD_TITLE_CLASSNAME}>
            {t('table.title', { defaultValue: t('table.title') })}
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
              onPreviousPage={() => setPageNumber((p) => Math.max(1, p - 1))}
              onNextPage={() => setPageNumber((p) => Math.min(totalPages, p + 1))}
              previousLabel={t('common.previous')}
              nextLabel={t('common.next')}
              paginationInfoText={t('common.table.showing', {
                from: startRow,
                to: endRow,
                total: totalCount,
              })}
              disablePaginationButtons={false}
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

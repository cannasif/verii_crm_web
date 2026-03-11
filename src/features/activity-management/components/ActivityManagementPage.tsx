import { type ReactElement, useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { useUIStore } from '@/stores/ui-store';
import { useAuthStore } from '@/stores/auth-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowDown, ArrowUp, ArrowUpDown, Loader2, Plus, RefreshCw } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { DataTableActionBar, type DataTableGridColumn } from '@/components/shared';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { loadColumnPreferences } from '@/lib/column-preferences';
import type { PagedFilter } from '@/types/api';
import { ActivityTable, getColumnsConfig } from './ActivityTable';
import { ActivityForm } from './ActivityForm';
import { useCreateActivity } from '../hooks/useCreateActivity';
import { useUpdateActivity } from '../hooks/useUpdateActivity';
import { useActivities } from '../hooks/useActivities';
import { buildCreateActivityPayload } from '../utils/build-create-payload';
import { rowsToBackendFilters } from '../types/activity-filter.types';
import type { ActivityFilterRow } from '../types/activity-filter.types';
import { ActivityPriority, ActivityStatus, ReminderChannel, type ActivityDto, type ActivityFormSchema, type ReminderChannel as ReminderChannelType } from '../types/activity-types';
import { ACTIVITY_QUERY_KEYS } from '../utils/query-keys';
import type { FilterRow } from '@/lib/advanced-filter-types';

const PAGE_KEY = 'activity-management';
const PAGE_SIZE_OPTIONS = [10, 20, 50] as const;

function buildSimpleFilters(searchTerm: string): PagedFilter[] {
  const out: PagedFilter[] = [];
  const trimmed = searchTerm.trim();
  if (trimmed) {
    out.push({ column: 'Subject', operator: 'Contains', value: trimmed });
  }
  return out;
}

function toActivityTypeId(value: string): number | undefined {
  const num = Number(value);
  return Number.isInteger(num) && !Number.isNaN(num) ? num : undefined;
}

function toIsoDateTime(value: string | null | undefined): string | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  return date.toISOString();
}

export function ActivityManagementPage(): ReactElement {
  const { t } = useTranslation(['activity-management', 'common']);
  const { user } = useAuthStore();
  const { setPageTitle } = useUIStore();
  const [searchParams, setSearchParams] = useSearchParams();

  const [formOpen, setFormOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState<ActivityDto | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [sortBy, setSortBy] = useState('Id');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [searchTerm, setSearchTerm] = useState('');
  const [draftFilterRows, setDraftFilterRows] = useState<FilterRow[]>([]);
  const [appliedAdvancedFilters, setAppliedAdvancedFilters] = useState<PagedFilter[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshCooldownUntil, setRefreshCooldownUntil] = useState<number>(0);

  const simpleFilters = useMemo(() => buildSimpleFilters(searchTerm), [searchTerm]);
  const apiFilters = useMemo<PagedFilter[]>(
    () => [...simpleFilters, ...appliedAdvancedFilters],
    [simpleFilters, appliedAdvancedFilters]
  );

  const queryClient = useQueryClient();
  const createActivity = useCreateActivity();
  const updateActivity = useUpdateActivity();

  const tableColumns = useMemo(() => getColumnsConfig(t), [t]);
  const defaultColumnKeys = useMemo(() => tableColumns.map((c) => c.key as string), [tableColumns]);
  const [columnOrder, setColumnOrder] = useState<string[]>(() => defaultColumnKeys);
  const [visibleColumns, setVisibleColumns] = useState<string[]>(() => defaultColumnKeys);

  useEffect(() => {
    setPageTitle(t('activityManagement.title'));
    return () => setPageTitle(null);
  }, [t, setPageTitle]);

  useEffect(() => {
    if (searchParams.get('new') === 'true') {
      setFormOpen(true);
      setEditingActivity(null);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    const prefs = loadColumnPreferences(PAGE_KEY, user?.id, defaultColumnKeys, 'id');
    setVisibleColumns(prefs.visibleKeys);
    setColumnOrder(prefs.order);
  }, [user?.id, defaultColumnKeys]);

  const { data: activitiesResponse, isLoading: activitiesLoading } = useActivities({
    pageNumber,
    pageSize,
    sortBy,
    sortDirection,
    filters: apiFilters,
  });

  const activities = useMemo(
    () => activitiesResponse?.data || [],
    [activitiesResponse?.data]
  );
  const totalCount = activitiesResponse?.totalCount || 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const startRow = totalCount === 0 ? 0 : (pageNumber - 1) * pageSize + 1;
  const endRow = totalCount === 0 ? 0 : Math.min(pageNumber * pageSize, totalCount);

  const orderedVisibleColumns = columnOrder.filter((k) => visibleColumns.includes(k));

  const baseColumns = useMemo(
    () =>
      tableColumns.map((c) => ({
        key: c.key as string,
        label: c.label,
      })),
    [tableColumns]
  );

  const filterColumns = useMemo(
    () =>
      [
        { value: 'Subject', type: 'string' as const, labelKey: 'advancedFilter.columnSubject' },
        { value: 'Description', type: 'string' as const, labelKey: 'advancedFilter.columnDescription' },
        { value: 'PotentialCustomerId', type: 'number' as const, labelKey: 'advancedFilter.columnCustomerId' },
        { value: 'ActivityTypeId', type: 'number' as const, labelKey: 'advancedFilter.columnActivityTypeId' },
        { value: 'Priority', type: 'number' as const, labelKey: 'advancedFilter.columnPriority' },
        { value: 'Status', type: 'number' as const, labelKey: 'advancedFilter.columnStatus' },
        { value: 'StartDateTime', type: 'date' as const, labelKey: 'advancedFilter.columnDueDate' },
      ],
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
      activities.map((a) => {
        const row: Record<string, unknown> = {};
        orderedVisibleColumns.forEach((key) => {
          if (key === 'potentialCustomer') row[key] = a.potentialCustomer?.name ?? '';
          else if (key === 'contact') row[key] = (a.contact?.fullName ?? `${a.contact?.firstName ?? ''} ${a.contact?.lastName ?? ''}`.trim()) || '';
          else if (key === 'assignedUser') row[key] = a.assignedUser?.fullName ?? a.assignedUser?.userName ?? '';
          else if (key === 'activityType') row[key] = a.activityType?.name ?? '';
          else {
            const val = a[key as keyof ActivityDto];
            if (key === 'startDateTime' && val) row[key] = new Date(String(val)).toLocaleDateString();
            else row[key] = val ?? '';
          }
        });
        return row;
      }),
    [activities, orderedVisibleColumns]
  );

  const appliedFilterCount = useMemo(
    () => draftFilterRows.filter((r) => r.value.trim()).length,
    [draftFilterRows]
  );

  useEffect(() => {
    setPageNumber(1);
  }, [searchTerm, appliedAdvancedFilters]);

  const handleAddClick = (): void => {
    setEditingActivity(null);
    setFormOpen(true);
  };

  const handleRefresh = async (): Promise<void> => {
    const now = Date.now();
    if (now < refreshCooldownUntil) return;
    setIsRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: [ACTIVITY_QUERY_KEYS.LIST] });
    setTimeout(() => setIsRefreshing(false), 500);
    setRefreshCooldownUntil(now + 45000);
    setTimeout(() => setRefreshCooldownUntil(0), 45000);
  };

  const isRefreshDisabled = Date.now() < refreshCooldownUntil;

  const handleEdit = (activity: ActivityDto): void => {
    setEditingActivity(activity);
    setFormOpen(true);
  };

  const buildUpdatePayload = (data: ActivityFormSchema, fallbackAssignedUserId?: number) => {
    const activityTypeId =
      (typeof data.activityTypeId === 'number' && data.activityTypeId > 0 ? data.activityTypeId : undefined) ??
      toActivityTypeId(data.activityType);
    if (activityTypeId === undefined) {
      throw new Error(t('activityManagement.activityTypeRequired'));
    }
    const assignedUserId = data.assignedUserId ?? fallbackAssignedUserId;
    if (!assignedUserId || assignedUserId <= 0) {
      throw new Error(t('activityManagement.assignedUserRequired'));
    }
    const endDateTime = toIsoDateTime(data.endDateTime);
    if (!endDateTime) {
      throw new Error(t('activityManagement.endDateRequired'));
    }
    return {
      subject: data.subject,
      description: data.description,
      activityTypeId,
      potentialCustomerId: data.potentialCustomerId || undefined,
      erpCustomerCode: data.erpCustomerCode || undefined,
      status: data.status ?? ActivityStatus.Scheduled,
      priority: data.priority ?? ActivityPriority.Medium,
      contactId: data.contactId || undefined,
      assignedUserId,
      startDateTime: toIsoDateTime(data.startDateTime) || new Date().toISOString(),
      endDateTime,
      isAllDay: data.isAllDay,
      reminders: (data.reminders || []).map((reminder) => ({
        offsetMinutes: reminder.offsetMinutes,
        channel: (reminder.channel ?? ReminderChannel.InApp) as ReminderChannelType,
      })),
    };
  };

  const handleFormSubmit = async (data: ActivityFormSchema): Promise<void> => {
    if (editingActivity) {
      await updateActivity.mutateAsync({
        id: editingActivity.id,
        data: buildUpdatePayload(data, editingActivity.assignedUserId),
      });
    } else {
      await createActivity.mutateAsync(
        buildCreateActivityPayload(data, { assignedUserIdFallback: user?.id })
      );
    }
    setFormOpen(false);
    setEditingActivity(null);
  };

  const COLUMN_TO_API: Record<string, string> = {
    id: 'Id',
    subject: 'Subject',
    activityType: 'ActivityTypeId',
    status: 'Status',
    priority: 'Priority',
    potentialCustomer: 'PotentialCustomerId',
    contact: 'ContactId',
    assignedUser: 'AssignedUserId',
    startDateTime: 'StartDateTime',
  };

  const API_TO_COLUMN: Record<string, string> = Object.fromEntries(
    Object.entries(COLUMN_TO_API).map(([k, v]) => [v, k])
  );

  const sortByDisplayKey = API_TO_COLUMN[sortBy] ?? sortBy;

  const handleSortChange = (newSortBy: string, newSortDirection: 'asc' | 'desc'): void => {
    setSortBy(COLUMN_TO_API[newSortBy] ?? newSortBy);
    setSortDirection(newSortDirection);
    setPageNumber(1);
  };

  const columns = useMemo<DataTableGridColumn<string>[]>(
    () =>
      tableColumns.map((c) => ({
        key: c.key as string,
        label: c.label,
        cellClassName: c.className,
      })),
    [tableColumns]
  );

  return (
    <div className="w-full space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-2">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white transition-colors">
            {t('activityManagement.title')}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium transition-colors mt-1">
            {t('activityManagement.description')}
          </p>
        </div>
        <Button
          onClick={handleAddClick}
          className="px-6 py-2 bg-linear-to-r from-pink-600 to-orange-600 rounded-xl text-white text-sm font-bold shadow-lg shadow-pink-500/20 hover:scale-105 transition-transform border-0 hover:text-white h-11"
        >
          <Plus size={18} className="mr-2" />
          {t('activityManagement.create')}
        </Button>
      </div>

      <Card className="bg-white/70 dark:bg-[#1a1025]/60 backdrop-blur-xl border border-white/60 dark:border-white/5 shadow-sm">
        <CardHeader className="space-y-4">
          <CardTitle>{t('activityManagement.table.title', { defaultValue: t('table.title') })}</CardTitle>
          <DataTableActionBar
            pageKey={PAGE_KEY}
            userId={user?.id}
            columns={baseColumns}
            visibleColumns={visibleColumns}
            columnOrder={columnOrder}
            onVisibleColumnsChange={setVisibleColumns}
            onColumnOrderChange={setColumnOrder}
            exportFileName="activities"
            exportColumns={exportColumns}
            exportRows={exportRows}
            filterColumns={filterColumns}
            defaultFilterColumn="Subject"
            draftFilterRows={draftFilterRows}
            onDraftFilterRowsChange={setDraftFilterRows}
            onApplyFilters={() => {
              setAppliedAdvancedFilters(rowsToBackendFilters(draftFilterRows as ActivityFilterRow[]));
              setPageNumber(1);
            }}
            onClearFilters={() => {
              setDraftFilterRows([]);
              setAppliedAdvancedFilters([]);
              setPageNumber(1);
            }}
            translationNamespace="activity-management"
            appliedFilterCount={appliedFilterCount}
            leftSlot={
              <>
                <Input
                  placeholder={t('common.search')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="h-9 w-[200px]"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleRefresh()}
                  disabled={isRefreshDisabled || activitiesLoading}
                >
                  {activitiesLoading || isRefreshing ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <RefreshCw className="h-4 w-4 mr-2" />
                  )}
                  {t('common.refresh')}
                </Button>
              </>
            }
          />
        </CardHeader>
        <CardContent>
          <ActivityTable
            columns={columns}
            visibleColumnKeys={orderedVisibleColumns}
            rows={activities}
            rowKey={(r) => r.id}
            sortBy={sortByDisplayKey}
            sortDirection={sortDirection}
            onSort={(k) => {
              const apiKey = COLUMN_TO_API[k] ?? k;
              if (sortBy === apiKey) handleSortChange(k, sortDirection === 'asc' ? 'desc' : 'asc');
              else handleSortChange(k, 'asc');
            }}
            renderSortIcon={(k) => {
              const apiKey = COLUMN_TO_API[k] ?? k;
              if (sortBy !== apiKey) return <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground/70" />;
              return sortDirection === 'asc' ? (
                <ArrowUp className="h-3.5 w-3.5 text-foreground" />
              ) : (
                <ArrowDown className="h-3.5 w-3.5 text-foreground" />
              );
            }}
            isLoading={activitiesLoading}
            loadingText={t('common.loading')}
            errorText={t('common.error', { defaultValue: 'Hata oluştu' })}
            emptyText={t('common.noData')}
            minTableWidthClassName="min-w-[1100px]"
            showActionsColumn
            actionsHeaderLabel={t('common.actions')}
            onEdit={handleEdit}
            userId={user?.id}
            rowClassName={(row) => {
              const status = row.status;
              const isCompleted = status === 1 || status === 'Completed';
              const isCancelled = status === 2 || status === 'Cancelled' || status === 'Canceled';
              return isCompleted || isCancelled
                ? 'bg-slate-50/50 dark:bg-white/5 opacity-60 grayscale'
                : 'group';
            }}
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
            disablePaginationButtons={activitiesLoading}
          />
        </CardContent>
      </Card>

      <ActivityForm
        open={formOpen}
        onOpenChange={setFormOpen}
        onSubmit={handleFormSubmit}
        activity={editingActivity}
        isLoading={createActivity.isPending || updateActivity.isPending}
      />
    </div>
  );
}

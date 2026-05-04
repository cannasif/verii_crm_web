import { lazy, Suspense, type ReactElement, type ReactNode, useState, useEffect, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { useUIStore } from '@/stores/ui-store';
import { useAuthStore } from '@/stores/auth-store';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  Calendar,
  User,
  Building2,
  Briefcase,
  List,
  Mail,
  CreditCard,
  Truck,
  MessageSquareText,
  Shapes,
} from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { DataTableGrid, type DataTableActionBarProps, type DataTableGridColumn } from '@/components/shared';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { loadColumnPreferences, saveColumnPreferences } from '@/lib/column-preferences';
import {
  MANAGEMENT_DATA_GRID_CLASSNAME,
  MANAGEMENT_LIST_CARD_CLASSNAME,
  MANAGEMENT_LIST_CARD_CONTENT_CLASSNAME,
  MANAGEMENT_LIST_CARD_HEADER_CLASSNAME,
  MANAGEMENT_LIST_CARD_TITLE_CLASSNAME,
  MANAGEMENT_LIST_TABLE_SHELL_CLASSNAME,
} from '@/lib/management-list-layout';
import { fetchAllPagedData } from '@/lib/fetch-all-paged-data';
import type { PagedFilter } from '@/types/api';
import { getActivityColumns } from './activity-columns';
import { ActivityForm } from './ActivityForm';
import { activityApi } from '../api/activity-api';
import { useCreateActivity } from '../hooks/useCreateActivity';
import { useDeleteActivity } from '../hooks/useDeleteActivity';
import { useUpdateActivity } from '../hooks/useUpdateActivity';
import { useActivities } from '../hooks/useActivities';
import { buildCreateActivityPayload } from '../utils/build-create-payload';
import { toUpdateActivityDto } from '../utils/to-update-activity-dto';
import { rowsToBackendFilters } from '../types/activity-filter.types';
import type { ActivityFilterRow } from '../types/activity-filter.types';
import { ActivityPriority, ActivityStatus, ReminderChannel, type ActivityDto, type ActivityFormSchema, type ReminderChannel as ReminderChannelType } from '../types/activity-types';
import { ACTIVITY_QUERY_KEYS } from '../utils/query-keys';
import type { FilterRow } from '@/lib/advanced-filter-types';
import { ActivityStatusBadge } from './ActivityStatusBadge';
import { ActivityPriorityBadge } from './ActivityPriorityBadge';
import { Alert02Icon } from 'hugeicons-react';
import { useCrudPermissions } from '@/features/access-control/hooks/useCrudPermissions';
const GoogleCustomerMailDialog = lazy(() =>
  import('@/features/google-integration/components/GoogleCustomerMailDialog').then((module) => ({ default: module.GoogleCustomerMailDialog }))
);
const OutlookCustomerMailDialog = lazy(() =>
  import('@/features/outlook-integration/components/OutlookCustomerMailDialog').then((module) => ({ default: module.OutlookCustomerMailDialog }))
);

const PAGE_KEY = 'activity-management';
const PAGE_SIZE_OPTIONS = [10, 20, 50] as const;
const AM_NS = 'activity-management' as const;

function toActivityTypeId(value: string): number | undefined {
  const num = Number(value);
  return Number.isInteger(num) && !Number.isNaN(num) ? num : undefined;
}

function toIsoDateTime(value: string | null | undefined): string | undefined {
  if (!value) return undefined;
  const localDateTimeMatch = value.match(/^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})(?::(\d{2}))?$/);
  if (localDateTimeMatch) {
    return `${localDateTimeMatch[1]}T${localDateTimeMatch[2]}:${localDateTimeMatch[3] ?? '00'}`;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
}

function toCurrentLocalDateTime(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
}

export function ActivityManagementPage(): ReactElement {
  const { t } = useTranslation(['activity-management', 'common']);
  const { canCreate, canUpdate, canDelete } = useCrudPermissions('activity.activity-management.view');
  const { user } = useAuthStore();
  const { setPageTitle } = useUIStore();
  const [searchParams, setSearchParams] = useSearchParams();

  const [formOpen, setFormOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState<ActivityDto | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [mailDialogOpen, setMailDialogOpen] = useState(false);
  const [outlookMailDialogOpen, setOutlookMailDialogOpen] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState<ActivityDto | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [sortBy, setSortBy] = useState('Id');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResetKey, setSearchResetKey] = useState(0);
  const [draftFilterRows, setDraftFilterRows] = useState<FilterRow[]>([]);
  const [draftFilterLogic, setDraftFilterLogic] = useState<'and' | 'or'>('and');
  const [appliedAdvancedFilters, setAppliedAdvancedFilters] = useState<PagedFilter[]>([]);
  const [appliedFilterLogic, setAppliedFilterLogic] = useState<'and' | 'or'>('and');

  const queryClient = useQueryClient();
  const createActivity = useCreateActivity();
  const deleteActivity = useDeleteActivity();
  const updateActivity = useUpdateActivity();

  const tableColumns = useMemo(() => getActivityColumns(t), [t]);
  const defaultColumnKeys = useMemo(() => tableColumns.map((c) => c.key as string), [tableColumns]);
  const [columnOrder, setColumnOrder] = useState<string[]>(() => defaultColumnKeys);
  const [visibleColumns, setVisibleColumns] = useState<string[]>(() => defaultColumnKeys);

  useEffect(() => {
    setPageTitle(t('title'));
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

  const { data: activitiesResponse, isLoading: activitiesLoading, isFetching: activitiesFetching } = useActivities({
    pageNumber,
    pageSize,
    search: searchTerm || undefined,
    sortBy,
    sortDirection,
    filters: appliedAdvancedFilters,
    filterLogic: appliedFilterLogic,
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

  const getExportData = useCallback(async (): Promise<{ columns: { key: string; label: string }[]; rows: Record<string, unknown>[] }> => {
    const list = await fetchAllPagedData({
      fetchPage: (exportPageNumber, exportPageSize) =>
        activityApi.getList({
          pageNumber: exportPageNumber,
          pageSize: exportPageSize,
          search: searchTerm || undefined,
          sortBy,
          sortDirection,
          filters: appliedAdvancedFilters,
          filterLogic: appliedFilterLogic,
        }),
    });
    return {
      columns: exportColumns,
      rows: list.map((a) => {
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
    };
  }, [exportColumns, orderedVisibleColumns, searchTerm, sortBy, sortDirection, appliedAdvancedFilters, appliedFilterLogic]);

  const appliedFilterCount = useMemo(
    () => draftFilterRows.filter((r) => r.value.trim()).length,
    [draftFilterRows]
  );

  useEffect(() => {
    setPageNumber(1);
  }, [searchTerm, appliedAdvancedFilters, appliedFilterLogic]);

  const handleAddClick = (): void => {
    if (!canCreate) return;
    setEditingActivity(null);
    setFormOpen(true);
  };

  const handleRefresh = async (): Promise<void> => {
    await queryClient.invalidateQueries({ queryKey: [ACTIVITY_QUERY_KEYS.LIST] });
  };

  const handleGridRefresh = async (): Promise<void> => {
    setSearchTerm('');
    setSearchResetKey((value) => value + 1);
    setDraftFilterRows([]);
    setDraftFilterLogic('and');
    setAppliedAdvancedFilters([]);
    setAppliedFilterLogic('and');
    setPageNumber(1);
    await handleRefresh();
  };

  const handleEdit = (activity: ActivityDto): void => {
    if (!canUpdate) return;
    setEditingActivity(activity);
    setFormOpen(true);
  };

  const handleDeleteClick = (activity: ActivityDto): void => {
    if (!canDelete) return;
    setSelectedActivity(activity);
    setDeleteDialogOpen(true);
  };

  const handleMailClick = (activity: ActivityDto): void => {
    setSelectedActivity(activity);
    setMailDialogOpen(true);
  };

  const handleOutlookMailClick = (activity: ActivityDto): void => {
    setSelectedActivity(activity);
    setOutlookMailDialogOpen(true);
  };

  const handleDeleteConfirm = async (): Promise<void> => {
    if (!selectedActivity) return;
    await deleteActivity.mutateAsync(selectedActivity.id);
    setDeleteDialogOpen(false);
    setSelectedActivity(null);
  };

  const handleStatusChange = async (activity: ActivityDto, newStatus: ActivityStatus): Promise<void> => {
    if (!canUpdate) return;
    await updateActivity.mutateAsync({
      id: activity.id,
      data: toUpdateActivityDto(activity, { status: newStatus }),
    });
  };

  const buildUpdatePayload = (data: ActivityFormSchema, fallbackAssignedUserId?: number) => {
    const activityTypeId =
      (typeof data.activityTypeId === 'number' && data.activityTypeId > 0 ? data.activityTypeId : undefined) ??
      toActivityTypeId(data.activityType);
    if (activityTypeId === undefined) {
      throw new Error(t('activityTypeRequired', { ns: AM_NS }));
    }
    const assignedUserId = data.assignedUserId ?? fallbackAssignedUserId;
    if (!assignedUserId || assignedUserId <= 0) {
      throw new Error(t('assignedUserRequired', { ns: AM_NS }));
    }
    const endDateTime = toIsoDateTime(data.endDateTime);
    if (!endDateTime) {
      throw new Error(t('endDateRequired', { ns: AM_NS }));
    }
    return {
      subject: data.subject,
      description: data.description,
      activityTypeId,
      paymentTypeId: data.paymentTypeId ?? undefined,
      activityMeetingTypeId: data.activityMeetingTypeId ?? undefined,
      activityTopicPurposeId: data.activityTopicPurposeId ?? undefined,
      activityShippingId: data.activityShippingId ?? undefined,
      potentialCustomerId: data.potentialCustomerId || undefined,
      erpCustomerCode: data.erpCustomerCode || undefined,
      status: data.status ?? ActivityStatus.Scheduled,
      priority: data.priority ?? ActivityPriority.Medium,
      contactId: data.contactId || undefined,
      assignedUserId,
      startDateTime: toIsoDateTime(data.startDateTime) || toCurrentLocalDateTime(),
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
    paymentTypeName: 'PaymentTypeId',
    activityMeetingTypeName: 'ActivityMeetingTypeId',
    activityTopicPurposeName: 'ActivityTopicPurposeId',
    activityShippingName: 'ActivityShippingId',
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

  const renderCell = (activity: ActivityDto, key: string): ReactNode => {
    const value = activity[key as keyof ActivityDto];

    if (key === 'status') return <ActivityStatusBadge status={activity.status} />;
    if (key === 'priority') return <ActivityPriorityBadge priority={activity.priority} />;
    if (key === 'startDateTime') {
      const dateValue =
        typeof value === 'string' || typeof value === 'number' || value instanceof Date ? value : null;
      return (
        <div className="flex items-center gap-2 text-xs">
          <Calendar size={14} className="text-pink-500/50" />
          {dateValue ? new Date(dateValue).toLocaleDateString() : '-'}
        </div>
      );
    }
    if (key === 'potentialCustomer') {
      return activity.potentialCustomer ? (
        <div className="flex items-start gap-2">
          <Building2 size={14} className="text-slate-400 mt-0.5 shrink-0" />
          <span className="truncate max-w-[150px]" title={activity.potentialCustomer.name}>
            {activity.potentialCustomer.name}
          </span>
        </div>
      ) : '-';
    }
    if (key === 'contact') {
      const contactName =
        activity.contact?.fullName || `${activity.contact?.firstName ?? ''} ${activity.contact?.lastName ?? ''}`.trim();
      return activity.contact ? (
        <div className="flex items-start gap-2">
          <Briefcase size={14} className="text-slate-400 mt-0.5 shrink-0" />
          <span className="truncate max-w-[150px]" title={contactName}>
            {contactName}
          </span>
        </div>
      ) : '-';
    }
    if (key === 'assignedUser') {
      return activity.assignedUser ? (
        <div className="flex items-center gap-2 text-xs">
          <User size={14} className="text-indigo-500/50" />
          {activity.assignedUser.fullName || activity.assignedUser.userName}
        </div>
      ) : '-';
    }
    if (key === 'activityType') {
      const display =
        value != null && typeof value === 'object' && 'name' in value
          ? (value as { name: string }).name
          : String(value ?? '');
      return (
        <div className="flex items-center gap-2">
          <List size={14} className="text-pink-500" />
          {display}
        </div>
      );
    }
    if (key === 'paymentTypeName') {
      return (
        <div className="flex items-center gap-2 text-xs">
          <CreditCard size={14} className="text-emerald-500/70" />
          <span>{activity.paymentTypeName || '-'}</span>
        </div>
      );
    }
    if (key === 'activityMeetingTypeName') {
      return (
        <div className="flex items-center gap-2 text-xs">
          <MessageSquareText size={14} className="text-sky-500/70" />
          <span>{activity.activityMeetingTypeName || '-'}</span>
        </div>
      );
    }
    if (key === 'activityTopicPurposeName') {
      return (
        <div className="flex items-center gap-2 text-xs">
          <Shapes size={14} className="text-violet-500/70" />
          <span>{activity.activityTopicPurposeName || '-'}</span>
        </div>
      );
    }
    if (key === 'activityShippingName') {
      return (
        <div className="flex items-center gap-2 text-xs">
          <Truck size={14} className="text-amber-500/70" />
          <span>{activity.activityShippingName || '-'}</span>
        </div>
      );
    }
    return String(value ?? '-');
  };

  const renderActionsCell = (activity: ActivityDto): ReactElement => {
    const isCompleted = activity.status === ActivityStatus.Completed || activity.status === 'Completed';
    const isCancelled =
      activity.status === ActivityStatus.Cancelled ||
      activity.status === 'Cancelled' ||
      activity.status === 'Canceled';

    return (
      <div className="flex justify-end gap-1 opacity-100 transition-opacity">
        {canUpdate && !isCompleted && !isCancelled && (
          <>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-green-600 hover:bg-green-50 dark:text-green-400"
              onClick={() => void handleStatusChange(activity, ActivityStatus.Completed)}
              title={t('complete', { defaultValue: 'Tamamla' })}
            >
              <CheckCircle2 size={16} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-orange-600 hover:bg-orange-50 dark:text-orange-400"
              onClick={() => void handleStatusChange(activity, ActivityStatus.Cancelled)}
              title={t('cancel', { defaultValue: 'İptal Et' })}
            >
              <XCircle size={16} />
            </Button>
            <div className="w-px h-4 bg-slate-200 dark:bg-white/10 mx-1 self-center" />
          </>
        )}
        {canUpdate ? (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-blue-600 hover:bg-blue-50 dark:text-blue-400"
            onClick={() => handleEdit(activity)}
          >
            <Edit2 size={16} />
          </Button>
        ) : null}
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-indigo-600 hover:bg-indigo-50 dark:text-indigo-400"
          onClick={() => handleMailClick(activity)}
          title={t('google-integration:mailDialog.openButton', { defaultValue: 'Mail' })}
        >
          <Mail size={16} />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-sky-600 hover:bg-sky-50 dark:text-sky-400"
          onClick={() => handleOutlookMailClick(activity)}
          title={t('outlook-integration:mailDialog.openButton', { defaultValue: 'Outlook Mail' })}
        >
          <Mail size={16} />
        </Button>
        {canDelete ? (
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-red-600 hover:bg-red-50 dark:text-red-400"
            onClick={() => handleDeleteClick(activity)}
          >
            <Trash2 size={16} />
          </Button>
        ) : null}
      </div>
    );
  };

  return (
    <div className="w-full space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-2">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white transition-colors">
            {t('title')}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium transition-colors mt-1">
            {t('description')}
          </p>
        </div>
        {canCreate ? (
          <Button
            onClick={handleAddClick}
            className="px-6 py-2 bg-linear-to-r from-pink-600 to-orange-600 rounded-xl text-white text-sm font-bold shadow-lg shadow-pink-500/20 hover:scale-105 transition-transform border-0 hover:text-white h-11 opacity-90 grayscale-[0] dark:opacity-100 dark:grayscale-0"
          >
            <Plus size={18} className="mr-2" />
            {t('create')}
          </Button>
        ) : null}
      </div>

      <Card className={MANAGEMENT_LIST_CARD_CLASSNAME}>
        <CardHeader className={MANAGEMENT_LIST_CARD_HEADER_CLASSNAME}>
          <CardTitle className={MANAGEMENT_LIST_CARD_TITLE_CLASSNAME}>
            {t('table.title', { defaultValue: t('table.title') })}
          </CardTitle>
        </CardHeader>
        <CardContent className={MANAGEMENT_LIST_CARD_CONTENT_CLASSNAME}>
          <div className={MANAGEMENT_LIST_TABLE_SHELL_CLASSNAME}>
            <div className={MANAGEMENT_DATA_GRID_CLASSNAME}>
              <DataTableGrid<ActivityDto, string>
                actionBar={{
                  pageKey: PAGE_KEY,
                  userId: user?.id,
                  columns: baseColumns,
                  visibleColumns,
                  columnOrder,
                  onVisibleColumnsChange: setVisibleColumns,
                  onColumnOrderChange: (newVisibleOrder) => {
                    setColumnOrder((currentOrder) => {
                      const hiddenCols = currentOrder.filter((k) => !newVisibleOrder.includes(k));
                      const finalOrder = [...newVisibleOrder, ...hiddenCols];
                      saveColumnPreferences(PAGE_KEY, user?.id, { visibleKeys: visibleColumns, order: finalOrder });
                      return finalOrder;
                    });
                  },
                  exportFileName: 'activities',
                  exportColumns,
                  exportRows,
                  getExportData,
                  filterColumns,
                  defaultFilterColumn: 'Subject',
                  draftFilterRows,
                  onDraftFilterRowsChange: setDraftFilterRows,
                  filterLogic: draftFilterLogic,
                  onFilterLogicChange: setDraftFilterLogic,
                  onApplyFilters: () => {
                    setAppliedAdvancedFilters(rowsToBackendFilters(draftFilterRows as ActivityFilterRow[]));
                    setAppliedFilterLogic(draftFilterLogic);
                    setPageNumber(1);
                  },
                  onClearFilters: () => {
                    setDraftFilterRows([]);
                    setDraftFilterLogic('and');
                    setAppliedAdvancedFilters([]);
                    setAppliedFilterLogic('and');
                    setPageNumber(1);
                  },
                  translationNamespace: 'activity-management',
                  appliedFilterCount,
                  search: {
                    onSearchChange: setSearchTerm,
                    placeholder: t('search', { ns: 'common' }),
                    minLength: 1,
                    resetKey: searchResetKey,
                  },
                  refresh: {
                    onRefresh: () => {
                      void handleGridRefresh();
                    },
                    isLoading: activitiesLoading,
                    cooldownSeconds: 60,
                    label: t('refresh', { ns: 'common' }),
                  },
                } satisfies DataTableActionBarProps}
                columns={columns}
                visibleColumnKeys={orderedVisibleColumns}
                rows={activities}
                rowKey={(r) => r.id}
                renderCell={renderCell}
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
                isLoading={activitiesLoading || activitiesFetching}
                loadingText={t('loading', { ns: 'common' })}
                errorText={t('error', { ns: 'common', defaultValue: 'Hata oluştu' })}
                emptyText={t('noData', { ns: 'common' })}
                minTableWidthClassName="min-w-[1100px]"
                showActionsColumn
                actionsHeaderLabel={t('actions', { ns: 'common' })}
                renderActionsCell={renderActionsCell}
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
                previousLabel={t('previous', { ns: 'common' })}
                nextLabel={t('next', { ns: 'common' })}
                paginationInfoText={t('common.table.showing', {
                  from: startRow,
                  to: endRow,
                  total: totalCount,
                })}
                disablePaginationButtons={activitiesLoading}
                centerColumnHeaders
                onColumnOrderChange={(newVisibleOrder) => {
                  setColumnOrder((currentOrder) => {
                    const hiddenCols = currentOrder.filter((k) => !newVisibleOrder.includes(k));
                    const finalOrder = [...newVisibleOrder, ...hiddenCols];
                    saveColumnPreferences(PAGE_KEY, user?.id, { visibleKeys: visibleColumns, order: finalOrder });
                    return finalOrder;
                  });
                }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={canDelete && deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="max-w-sm bg-white dark:bg-[#0f0a18] border border-slate-200 dark:border-white/10 rounded-xl p-0 overflow-hidden">
          <DialogHeader className="px-6 py-5 border-b border-slate-100 dark:border-white/10">
            <DialogTitle className="text-base font-semibold text-slate-900 dark:text-white flex items-center gap-2">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400">
                <Alert02Icon size={18} />
              </span>
              {t('deleteActivity')}
            </DialogTitle>
            <DialogDescription className="text-slate-500 dark:text-slate-400 text-sm mt-2">
              {t('deleteConfirmation')}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="px-6 py-4 border-t border-slate-100 dark:border-white/10 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)} className="h-9 px-4 rounded-lg text-sm">
              {t('cancel', { ns: 'common' })}
            </Button>
            <Button
              variant="destructive"
              onClick={() => void handleDeleteConfirm()}
              disabled={deleteActivity.isPending}
              className="h-9 px-4 rounded-lg text-sm"
            >
              {deleteActivity.isPending
                ? t('deleting', { ns: 'common' })
                : t('delete.action', { ns: 'common' })}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Suspense fallback={null}>
        {mailDialogOpen && selectedActivity ? (
          <GoogleCustomerMailDialog
            open={mailDialogOpen}
            onOpenChange={setMailDialogOpen}
            moduleKey="activity"
            recordId={selectedActivity.id}
            customerId={selectedActivity.potentialCustomerId}
            contactId={selectedActivity.contactId}
            customerName={selectedActivity.potentialCustomer?.name}
            contactName={selectedActivity.contact?.fullName}
            customerCode={selectedActivity.erpCustomerCode}
            contextTitle={selectedActivity.subject}
            recordOwnerName={selectedActivity.assignedUser?.fullName}
          />
        ) : null}
        {outlookMailDialogOpen && selectedActivity ? (
          <OutlookCustomerMailDialog
            open={outlookMailDialogOpen}
            onOpenChange={setOutlookMailDialogOpen}
            moduleKey="activity"
            recordId={selectedActivity.id}
            customerId={selectedActivity.potentialCustomerId}
            contactId={selectedActivity.contactId}
            customerName={selectedActivity.potentialCustomer?.name}
            contactName={selectedActivity.contact?.fullName}
            customerCode={selectedActivity.erpCustomerCode}
            contextTitle={selectedActivity.subject}
            recordOwnerName={selectedActivity.assignedUser?.fullName}
          />
        ) : null}
      </Suspense>

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

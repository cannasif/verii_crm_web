import { type ReactElement, useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { useUIStore } from '@/stores/ui-store';
import { Plus, Search, RefreshCw, X, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/auth-store';
import type { PagedFilter } from '@/types/api';
import { ActivityTable } from './ActivityTable';
import { ActivityForm } from './ActivityForm';
import { ActivityAdvancedFilter } from './ActivityAdvancedFilter';
import { useCreateActivity } from '../hooks/useCreateActivity';
import { useUpdateActivity } from '../hooks/useUpdateActivity';
import { useActivities } from '../hooks/useActivities';
import { buildCreateActivityPayload } from '../utils/build-create-payload';
import { rowsToBackendFilters } from '../types/activity-filter.types';
import { ActivityPriority, ActivityStatus, ReminderChannel, type ActivityDto, type ActivityFormSchema, type ReminderChannel as ReminderChannelType } from '../types/activity-types';
import type { ActivityFilterRow } from '../types/activity-filter.types';
import { ACTIVITY_QUERY_KEYS } from '../utils/query-keys';

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
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const { setPageTitle } = useUIStore();
  const [searchParams, setSearchParams] = useSearchParams();
  const [formOpen, setFormOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState<ActivityDto | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [pageSize] = useState(20);
  const [sortBy, setSortBy] = useState('Id');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [searchTerm, setSearchTerm] = useState('');
  const [draftFilterRows, setDraftFilterRows] = useState<ActivityFilterRow[]>([]);
  const [appliedAdvancedFilters, setAppliedAdvancedFilters] = useState<PagedFilter[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshCooldownUntil, setRefreshCooldownUntil] = useState<number>(0);
  const [filterPopoverOpen, setFilterPopoverOpen] = useState(false);

  const simpleFilters = useMemo(
    () => buildSimpleFilters(searchTerm),
    [searchTerm]
  );
  const apiFilters = useMemo<PagedFilter[]>(
    () => [...simpleFilters, ...appliedAdvancedFilters],
    [simpleFilters, appliedAdvancedFilters]
  );

  const queryClient = useQueryClient();
  const createActivity = useCreateActivity();
  const updateActivity = useUpdateActivity();

  const { data: activitiesResponse, isLoading: activitiesLoading } = useActivities({
    pageNumber,
    pageSize,
    sortBy,
    sortDirection,
    filters: apiFilters,
  });

  const activities = activitiesResponse?.data || [];
  const totalCount = activitiesResponse?.totalCount || 0;

  useEffect(() => {
    setPageTitle(t('activityManagement.title'));
    return () => {
      setPageTitle(null);
    };
  }, [t, setPageTitle]);

  useEffect(() => {
    if (searchParams.get('new') === 'true') {
      setFormOpen(true);
      setEditingActivity(null);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    setPageNumber(1);
  }, [searchTerm]);

  const handleAddClick = (): void => {
    setEditingActivity(null);
    setFormOpen(true);
  };

  const clearSearch = (): void => {
    setSearchTerm('');
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

  const handleAdvancedSearch = (): void => {
    setAppliedAdvancedFilters(rowsToBackendFilters(draftFilterRows));
    setPageNumber(1);
  };

  const handleAdvancedClear = (): void => {
    setDraftFilterRows([]);
    setAppliedAdvancedFilters([]);
    setPageNumber(1);
  };

  const handleEdit = (activity: ActivityDto): void => {
    setEditingActivity(activity);
    setFormOpen(true);
  };

  const buildUpdatePayload = (data: ActivityFormSchema, fallbackAssignedUserId?: number) => {
    const activityTypeId = toActivityTypeId(data.activityType);
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

  const handleSortChange = (newSortBy: string, newSortDirection: 'asc' | 'desc'): void => {
    setSortBy(newSortBy);
    setSortDirection(newSortDirection);
    setPageNumber(1);
  };

  return (
    <div className="w-full space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 pt-2">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white transition-colors">
            {t('activityManagement.title')}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium transition-colors">
            {t('activityManagement.description')}
          </p>
        </div>

        <Button
          onClick={handleAddClick}
          className="px-6 py-2 bg-linear-to-r from-pink-600 to-orange-600 rounded-lg text-white text-sm font-bold shadow-lg shadow-pink-500/20 hover:scale-105 transition-transform border-0 hover:text-white"
        >
          <Plus size={18} className="mr-2" />
          {t('activityManagement.create')}
        </Button>
      </div>

      <div className="bg-white/70 dark:bg-[#1a1025]/60 backdrop-blur-xl border border-white/60 dark:border-white/5 shadow-sm rounded-2xl p-6 transition-all duration-300">
        <div className="flex flex-col gap-4 mb-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="relative group flex-1 min-w-0 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-pink-500 transition-colors" />
              <Input
                placeholder={t('common.search')}
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                className="pl-10 h-10 bg-white/50 dark:bg-card/50 border-slate-200 dark:border-white/10 focus:border-pink-500/50 focus:ring-pink-500/20 rounded-xl transition-all"
              />
              {searchTerm && (
                <button
                  onClick={clearSearch}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-100 dark:hover:bg-white/10 rounded-full transition-colors"
                >
                  <X size={14} className="text-slate-400" />
                </button>
              )}
            </div>
            <div
              className={`h-10 w-10 flex items-center justify-center rounded-xl shrink-0 transition-all ${
                isRefreshDisabled
                  ? 'cursor-not-allowed opacity-50 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10'
                  : 'cursor-pointer bg-white/50 dark:bg-card/50 border border-slate-200 dark:border-white/10 hover:border-pink-500/30 hover:bg-pink-50/50 dark:hover:bg-pink-500/10 group'
              }`}
              onClick={handleRefresh}
              role="button"
              aria-disabled={isRefreshDisabled}
              tabIndex={isRefreshDisabled ? -1 : 0}
            >
              <RefreshCw
                size={18}
                className={`text-slate-500 dark:text-slate-400 transition-colors ${isRefreshing ? 'animate-spin' : ''} ${!isRefreshDisabled ? 'group-hover:text-pink-600 dark:group-hover:text-pink-400' : ''}`}
              />
            </div>
          </div>
        </div>
        <ActivityTable
          userId={user?.id}
          toolbarSlot={
            <Popover open={filterPopoverOpen} onOpenChange={setFilterPopoverOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant={appliedAdvancedFilters.length > 0 ? 'default' : 'outline'}
                  size="sm"
                  className={`h-9 border-dashed border-slate-300 dark:border-white/20 text-xs sm:text-sm ${
                    appliedAdvancedFilters.length > 0
                      ? 'bg-pink-500/20 text-pink-700 dark:text-pink-300 border-pink-500/30 hover:bg-pink-500/30'
                      : 'bg-transparent hover:bg-slate-50 dark:hover:bg-white/5'
                  }`}
                >
                  <Filter className="mr-2 h-4 w-4" />
                  {t('activityManagement.advancedFilter.filterButton')}
                  {appliedAdvancedFilters.length > 0 && (
                    <span className="ml-2 h-2 w-2 rounded-full bg-pink-500" />
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-[420px] max-w-[calc(100vw-2rem)] p-0 bg-white/95 dark:bg-[#1a1025]/95 backdrop-blur-xl border border-slate-200 dark:border-white/10 shadow-xl rounded-xl z-50">
                <ActivityAdvancedFilter
                  embedded
                  draftRows={draftFilterRows}
                  onDraftRowsChange={setDraftFilterRows}
                  onSearch={() => {
                    handleAdvancedSearch();
                    setFilterPopoverOpen(false);
                  }}
                  onClear={() => {
                    handleAdvancedClear();
                    setFilterPopoverOpen(false);
                  }}
                />
              </PopoverContent>
            </Popover>
          }
          activities={activities}
          isLoading={activitiesLoading}
          onEdit={handleEdit}
          pageNumber={pageNumber}
          pageSize={pageSize}
          totalCount={totalCount}
          sortBy={sortBy}
          sortDirection={sortDirection}
          onPageChange={setPageNumber}
          onSortChange={handleSortChange}
        />
      </div>

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

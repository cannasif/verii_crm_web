import { type ReactElement, useState, useMemo, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { VoiceSearchCombobox } from '@/components/shared/VoiceSearchCombobox';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useUpdateActivity } from '@/features/activity-management/hooks/useUpdateActivity';
import { useDeleteActivity } from '@/features/activity-management/hooks/useDeleteActivity';
import { useCreateActivity } from '@/features/activity-management/hooks/useCreateActivity';
import { ActivityStatusBadge } from '@/features/activity-management/components/ActivityStatusBadge';
import { ActivityPriorityBadge } from '@/features/activity-management/components/ActivityPriorityBadge';
import { ActivityForm } from '@/features/activity-management/components/ActivityForm';
import { buildCreateActivityPayload } from '@/features/activity-management/utils/build-create-payload';
import { buildUpdateActivityPayload } from '@/features/activity-management/utils/build-update-payload';
import { toUpdateActivityDto } from '@/features/activity-management/utils/to-update-activity-dto';
import type { ActivityDto } from '@/features/activity-management/types/activity-types';
import type { ActivityFormSchema } from '@/features/activity-management/types/activity-types';
import { ActivityStatus, ActivityPriority } from '@/features/activity-management/types/activity-types';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useUserOptionsInfinite } from '@/components/shared/dropdown/useDropdownEntityInfinite';
import { useUserOptions } from '@/features/user-discount-limit-management/hooks/useUserOptions';
import { useAuthStore } from '@/stores/auth-store';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { activityApi } from '@/features/activity-management/api/activity-api';
// Modern İkon Seti
import { 
  Plus, 
  Trash2, 
  Calendar as CalendarIcon, 
  ListTodo, 
  LayoutGrid, 
  ChevronLeft, 
  ChevronRight, 
  User, 
  Play, 
  PauseCircle, 
  CheckCircle2, 
  CalendarDays,
  Sparkles,
  Clock,
  Target,
  Search,
  RefreshCw,
  AlertTriangle,
  GripVertical,
} from 'lucide-react';

const EMPTY_ACTIVITIES: ActivityDto[] = [];

interface SortableActivityItemProps {
  activity: ActivityDto;
  onEdit: (activity: ActivityDto) => void;
  formatTimeRange: (activity: ActivityDto) => string;
  getAssignedUserName: (id?: number) => string;
  statusBadge: (activity: ActivityDto) => ReactElement;
  priorityBadge: (activity: ActivityDto) => ReactElement;
}

function SortableActivityItem({
  activity,
  onEdit,
  formatTimeRange,
  getAssignedUserName,
  statusBadge,
  priorityBadge,
}: SortableActivityItemProps): ReactElement {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: activity.id,
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.45 : 1,
    zIndex: isDragging ? 50 : undefined,
  };

  return (
    <div ref={setNodeRef} style={style} className="flex items-stretch gap-2">
      <button
        {...attributes}
        {...listeners}
        type="button"
        className="flex cursor-grab items-center rounded-xl px-1 text-slate-300 hover:text-slate-500 dark:text-white/20 dark:hover:text-white/50 active:cursor-grabbing"
      >
        <GripVertical size={16} />
      </button>
      <button
        type="button"
        onClick={() => onEdit(activity)}
        className="flex-1 rounded-2xl border border-slate-200 bg-slate-50/80 p-4 text-left transition hover:border-pink-300 hover:bg-white dark:border-white/10 dark:bg-white/5 dark:hover:border-pink-500/50 dark:hover:bg-white/10"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
                {activity.subject}
              </span>
              {statusBadge(activity)}
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <span>{formatTimeRange(activity)}</span>
              <span>•</span>
              <span>{getAssignedUserName(activity.assignedUserId)}</span>
            </div>
            {activity.description ? (
              <p className="line-clamp-2 text-xs text-slate-600 dark:text-slate-300">
                {activity.description}
              </p>
            ) : null}
          </div>
          {priorityBadge(activity)}
        </div>
      </button>
    </div>
  );
}

export function DailyTasksPage(): ReactElement {
  const { t, i18n } = useTranslation(['daily-tasks', 'activity-management', 'common']);
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState('tasks');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [assignedUserFilter, setAssignedUserFilter] = useState<number | undefined>(undefined);
  const [formOpen, setFormOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState<ActivityDto | null>(null);
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [calendarViewMode, setCalendarViewMode] = useState<'weekly' | 'monthly'>('monthly');
  const [calendarWeekStart, setCalendarWeekStart] = useState<Date>(() => {
    const d = new Date();
    const day = d.getDay();
    const diff = d.getDate() - (day === 0 ? 6 : day - 1);
    const mon = new Date(d.setDate(diff));
    mon.setHours(0, 0, 0, 0);
    return mon;
  });
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [slotStart, setSlotStart] = useState<string | null>(null);
  const [slotEnd, setSlotEnd] = useState<string | null>(null);
  const [calendarFocusDate, setCalendarFocusDate] = useState<string>(() => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  });
  const [calendarFocusHour, setCalendarFocusHour] = useState<number | null>(null);
  const [greeting, setGreeting] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [activityPendingDelete, setActivityPendingDelete] = useState<ActivityDto | null>(null);
  const [calendarInspectState, setCalendarInspectState] = useState<{
    title: string;
    description?: string;
    activities: ActivityDto[];
  } | null>(null);
  const [agendaSheetOpen, setAgendaSheetOpen] = useState(false);
  const [sheetActivities, setSheetActivities] = useState<ActivityDto[]>([]);
  const [dragConfirm, setDragConfirm] = useState<{
    activity: ActivityDto;
    oldStart: string;
    oldEnd: string;
    newStart: string;
    newEnd: string;
  } | null>(null);
  const contentSectionRef = useRef<HTMLDivElement | null>(null);

  const [userFilterSearchTerm, setUserFilterSearchTerm] = useState('');
  const hasShownContentOnce = useRef(false);
  const debouncedSearchTerm = useDebouncedValue(searchTerm, 450);
  const { data: userOptions = [] } = useUserOptions();
  const userDropdown = useUserOptionsInfinite(userFilterSearchTerm, true);
  const userFilterOptions = [
    { value: 'all', label: t('dailyTasks.allEmployees') },
    ...userDropdown.options,
  ];

  // Dinamik Selamlama
  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting(t('dailyTasks.morning'));
    else if (hour < 18) setGreeting(t('dailyTasks.afternoon'));
    else setGreeting(t('dailyTasks.evening'));
  }, [t]);

  useEffect(() => {
    if (user?.id && assignedUserFilter === undefined) {
      setAssignedUserFilter(user.id);
    }
  }, [user, assignedUserFilter]);

  const dndSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const formatDateKey = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // --- Date Helpers ---
  const getWeekDateRange = (): { startDate: string; endDate: string } => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const diff = today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
    const monday = new Date(today.setDate(diff));
    monday.setHours(0, 0, 0, 0);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);
    return { startDate: formatDateKey(monday), endDate: formatDateKey(sunday) };
  };

  const getCalendarDateRange = (): { startDate: string; endDate: string } => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - startDate.getDay());
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 41);
    return { startDate: formatDateKey(startDate), endDate: formatDateKey(endDate) };
  };

  const getWeeklyDateRange = (): { startDate: string; endDate: string } => {
    const start = new Date(calendarWeekStart);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    end.setHours(23, 59, 59, 999);
    return { startDate: formatDateKey(start), endDate: formatDateKey(end) };
  };

  const weekDateRange = getWeekDateRange();
  const calendarDateRange = getCalendarDateRange();
  const weeklyDateRange = getWeeklyDateRange();

  // --- Filters ---
  const calendarRange = activeTab === 'calendar' && calendarViewMode === 'weekly' ? weeklyDateRange : calendarDateRange;
  const apiDateRange = activeTab === 'list' ? weekDateRange : activeTab === 'calendar' ? calendarRange : weekDateRange;
  const filters: Array<{ column: string; operator: string; value: string }> = [
    statusFilter !== 'all' ? { column: 'Status', operator: 'eq', value: statusFilter } : undefined,
    assignedUserFilter ? { column: 'AssignedUserId', operator: 'eq', value: assignedUserFilter.toString() } : undefined,
    (activeTab === 'tasks' || activeTab === 'list') ? { column: 'StartDateTime', operator: 'gte', value: apiDateRange.startDate } : undefined,
    (activeTab === 'tasks' || activeTab === 'list') ? { column: 'StartDateTime', operator: 'lte', value: apiDateRange.endDate } : undefined,
    activeTab === 'calendar' ? { column: 'StartDateTime', operator: 'gte', value: calendarRange.startDate } : undefined,
    activeTab === 'calendar' ? { column: 'StartDateTime', operator: 'lte', value: calendarRange.endDate } : undefined,
  ].filter((f): f is { column: string; operator: string; value: string } => f !== undefined);

  const { data, isLoading, isFetching, error, refetch, dataUpdatedAt } = useQuery({
    queryKey: [
      'daily-tasks',
      'activities',
      activeTab,
      calendarViewMode,
      calendarMonth.getFullYear(),
      calendarMonth.getMonth(),
      calendarWeekStart.toISOString(),
      statusFilter,
      assignedUserFilter ?? 'all',
      debouncedSearchTerm,
      apiDateRange.startDate,
      apiDateRange.endDate,
      calendarRange.startDate,
      calendarRange.endDate,
    ],
    queryFn: () =>
      activityApi.getAllList({
        pageNumber: 1,
        pageSize: 250,
        sortBy: 'StartDateTime',
        sortDirection: 'asc',
        search: debouncedSearchTerm.trim() || undefined,
        filters: filters.length > 0 ? filters : undefined,
      }),
    staleTime: 60 * 1000,
  });

  const updateActivity = useUpdateActivity();
  const deleteActivity = useDeleteActivity();
  const createActivity = useCreateActivity();

  const activities = useMemo<ActivityDto[]>(
    () =>
      (data?.data ?? EMPTY_ACTIVITIES).map((activity) => ({
        ...activity,
        activityDate: activity.activityDate ?? activity.startDateTime,
        isCompleted:
          activity.isCompleted ??
          Number(activity.status) === ActivityStatus.Completed,
      })),
    [data?.data]
  );

  const filteredActivities = useMemo(() => {
    let filtered = activities;
    if (statusFilter !== 'all') filtered = filtered.filter((activity) => String(activity.status) === statusFilter);
    if (assignedUserFilter) filtered = filtered.filter((activity) => activity.assignedUserId === assignedUserFilter);
    
    if (activeTab === 'tasks') {
      filtered = filtered.filter((activity) => {
        if (!activity.activityDate) return false;
        const activityDate = new Date(activity.activityDate);
        return activityDate >= new Date(weekDateRange.startDate) && activityDate <= new Date(weekDateRange.endDate);
      });
    }
    if (activeTab === 'list') {
      filtered = filtered.filter((activity) => {
        if (!activity.activityDate) return false;
        const activityDate = new Date(activity.activityDate);
        return activityDate >= new Date(weekDateRange.startDate) && activityDate <= new Date(weekDateRange.endDate);
      });
    }
    if (activeTab === 'calendar') {
      const calRange = calendarViewMode === 'weekly' ? weeklyDateRange : calendarDateRange;
      filtered = filtered.filter((activity) => {
        if (!activity.activityDate) return false;
        const activityDate = new Date(activity.activityDate);
        return activityDate >= new Date(calRange.startDate) && activityDate <= new Date(calRange.endDate);
      });
    }
    return filtered;
  }, [activities, statusFilter, assignedUserFilter, activeTab, weekDateRange, calendarDateRange, calendarViewMode, weeklyDateRange]);

  const getAssignedUserName = (userId?: number) =>
    userOptions.find((option) => option.id === userId)?.fullName || t('dailyTasks.unassigned');

  const enterpriseMetrics = useMemo(() => {
    const now = new Date();
    const isSameDay = (value?: string) => {
      if (!value) return false;
      const date = new Date(value);
      return (
        date.getFullYear() === now.getFullYear() &&
        date.getMonth() === now.getMonth() &&
        date.getDate() === now.getDate()
      );
    };

    const activeItems = filteredActivities.filter((activity) => Number(activity.status) !== ActivityStatus.Completed);
    const completedItems = filteredActivities.filter((activity) => Number(activity.status) === ActivityStatus.Completed);
    const overdueItems = activeItems.filter((activity) => {
      const dueDate = activity.endDateTime ?? activity.startDateTime ?? activity.activityDate;
      if (!dueDate) return false;
      return new Date(dueDate) < now;
    });
    const dueTodayItems = activeItems.filter((activity) =>
      isSameDay(activity.endDateTime ?? activity.startDateTime ?? activity.activityDate)
    );
    const highPriorityItems = activeItems.filter((activity) => Number(activity.priority) === 2);
    const upcomingItems = activeItems
      .filter((activity) => {
        const dueDate = activity.startDateTime ?? activity.activityDate;
        if (!dueDate) return false;
        return new Date(dueDate) >= now;
      })
      .sort(
        (left, right) =>
          new Date(left.startDateTime ?? left.activityDate ?? left.createdDate).getTime() -
          new Date(right.startDateTime ?? right.activityDate ?? right.createdDate).getTime()
      )
      .slice(0, 5);

    const workload = Object.entries(
      activeItems.reduce<Record<string, number>>((accumulator, activity) => {
        const userName = getAssignedUserName(activity.assignedUserId);
        accumulator[userName] = (accumulator[userName] ?? 0) + 1;
        return accumulator;
      }, {})
    )
      .map(([name, count]) => ({ name, count }))
      .sort((left, right) => right.count - left.count)
      .slice(0, 5);

    return {
      activeCount: activeItems.length,
      completedCount: completedItems.length,
      overdueItems,
      dueTodayCount: dueTodayItems.length,
      highPriorityCount: highPriorityItems.length,
      completionRate:
        filteredActivities.length > 0
          ? Math.round((completedItems.length / filteredActivities.length) * 100)
          : 0,
      upcomingItems,
      workload,
    };
  }, [filteredActivities]);

  // --- Handlers ---
  const handleToggleComplete = async (activity: ActivityDto) => {
    await updateActivity.mutateAsync({
      id: activity.id,
      data: toUpdateActivityDto(activity, {
        status: activity.isCompleted ? ActivityStatus.Scheduled : ActivityStatus.Completed,
      }),
    });
    void refetch();
  };
  const handleDelete = async () => {
    if (!activityPendingDelete) return;
    await deleteActivity.mutateAsync(activityPendingDelete.id);
    setActivityPendingDelete(null);
    void refetch();
  };
  const handleNewTask = () => {
    setEditingActivity(null);
    setSelectedDate(null);
    setSlotStart(null);
    setSlotEnd(null);
    setFormOpen(true);
  };
  const handleEdit = (activity: ActivityDto) => {
    setEditingActivity(activity);
    setSelectedDate(null);
    setSlotStart(null);
    setSlotEnd(null);
    setFormOpen(true);
  };

  const handleFormSubmit = async (data: ActivityFormSchema) => {
    if (editingActivity) {
      await updateActivity.mutateAsync({
        id: editingActivity.id,
        data: buildUpdateActivityPayload(data, editingActivity.assignedUserId),
      });
    } else {
      await createActivity.mutateAsync(
        buildCreateActivityPayload(data, { assignedUserIdFallback: user?.id })
      );
    }
    setFormOpen(false);
    setEditingActivity(null);
    void refetch();
  };
  const handleStartTask = async (activity: ActivityDto) => { await updateActivity.mutateAsync({ id: activity.id, data: toUpdateActivityDto(activity, { status: ActivityStatus.Scheduled }) }); void refetch(); };
  const handleCompleteTask = async (activity: ActivityDto) => { await updateActivity.mutateAsync({ id: activity.id, data: toUpdateActivityDto(activity, { status: ActivityStatus.Completed }) }); void refetch(); };
  const handlePutOnHold = async (activity: ActivityDto) => { await updateActivity.mutateAsync({ id: activity.id, data: toUpdateActivityDto(activity, { status: ActivityStatus.Cancelled }) }); void refetch(); };
  const handlePreviousMonth = () => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1));
  const handleNextMonth = () => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1));
  const handleToday = () => setCalendarMonth(new Date());
  const handlePreviousWeek = () => {
    const next = new Date(calendarWeekStart);
    next.setDate(next.getDate() - 7);
    setCalendarWeekStart(next);
  };
  const handleNextWeek = () => {
    const next = new Date(calendarWeekStart);
    next.setDate(next.getDate() + 7);
    setCalendarWeekStart(next);
  };
  const handleThisWeek = () => {
    const d = new Date();
    const day = d.getDay();
    const diff = d.getDate() - (day === 0 ? 6 : day - 1);
    const mon = new Date(d);
    mon.setDate(diff);
    mon.setHours(0, 0, 0, 0);
    setCalendarWeekStart(mon);
  };

  const handleReviewOpenTasks = () => {
    setActiveTab('list');
    setStatusFilter(String(ActivityStatus.Scheduled));
    window.requestAnimationFrame(() => {
      contentSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

  const formatSlotStart = (day: Date, hour: number): string => {
    const y = day.getFullYear();
    const m = String(day.getMonth() + 1).padStart(2, '0');
    const d = String(day.getDate()).padStart(2, '0');
    const h = String(hour).padStart(2, '0');
    return `${y}-${m}-${d}T${h}:00`;
  };
  const formatSlotEnd = (day: Date, hour: number): string => {
    if (hour === 23) {
      const nextDay = new Date(day);
      nextDay.setDate(nextDay.getDate() + 1);
      return formatSlotStart(nextDay, 0);
    }
    const h = String(hour + 1).padStart(2, '0');
    const y = day.getFullYear();
    const m = String(day.getMonth() + 1).padStart(2, '0');
    const dayStr = String(day.getDate()).padStart(2, '0');
    return `${y}-${m}-${dayStr}T${h}:00`;
  };

  const getWeekDays = (): Date[] => {
    const days: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(calendarWeekStart);
      d.setDate(calendarWeekStart.getDate() + i);
      d.setHours(0, 0, 0, 0);
      days.push(d);
    }
    return days;
  };

  const getActivitiesForSlot = (day: Date, hour: number): ActivityDto[] => {
    const slotStartMs = new Date(day.getFullYear(), day.getMonth(), day.getDate(), hour, 0, 0, 0).getTime();
    const slotEndMs = new Date(day.getFullYear(), day.getMonth(), day.getDate(), hour + 1, 0, 0, 0).getTime();
    return filteredActivities.filter((activity) => {
      if (!activity.startDateTime) return false;
      const start = new Date(activity.startDateTime).getTime();
      const end = activity.endDateTime ? new Date(activity.endDateTime).getTime() : start;
      return start < slotEndMs && end > slotStartMs;
    });
  };

  const formatActivityTimeRange = (activity: ActivityDto): string => {
    if (!activity.startDateTime) return t('dailyTasks.noTime');

    const start = new Date(activity.startDateTime);
    const startLabel = start.toLocaleTimeString(i18n.language, {
      hour: '2-digit',
      minute: '2-digit',
    });

    if (!activity.endDateTime) {
      return startLabel;
    }

    const end = new Date(activity.endDateTime);
    const endLabel = end.toLocaleTimeString(i18n.language, {
      hour: '2-digit',
      minute: '2-digit',
    });

    return `${startLabel} - ${endLabel}`;
  };

  const openCalendarInspect = (title: string, activitiesToInspect: ActivityDto[], description?: string) => {
    setCalendarInspectState({
      title,
      description,
      activities: activitiesToInspect,
    });
  };

  const getActivityTypeDisplay = (activityType: ActivityDto['activityType']): string => {
    if (activityType == null) return '';
    return typeof activityType === 'object' && 'name' in activityType ? activityType.name : String(activityType);
  };

  const getCategoryColor = (activityType: string): string => {
    switch (activityType) {
      case 'Call': return 'border-blue-500 text-blue-600 bg-blue-50 dark:bg-blue-900/20 dark:text-blue-300';
      case 'Meeting': return 'border-purple-500 text-purple-600 bg-purple-50 dark:bg-purple-900/20 dark:text-purple-300';
      case 'Email': return 'border-yellow-500 text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20 dark:text-yellow-300';
      case 'Task': return 'border-indigo-500 text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 dark:text-indigo-300';
      default: return 'border-slate-500 text-slate-600 bg-slate-50 dark:bg-slate-800 dark:text-slate-300';
    }
  };

  const getActivitiesByDate = (): Record<string, ActivityDto[]> => {
    const grouped: Record<string, ActivityDto[]> = {};
    filteredActivities.forEach((activity) => {
      const dateKey = activity.activityDate ? formatDateKey(new Date(activity.activityDate)) : 'no-date';
      if (!grouped[dateKey]) grouped[dateKey] = [];
      grouped[dateKey].push(activity);
    });
    return grouped;
  };

  const getCalendarDays = () => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - startDate.getDay());
    const days = [];
    const activitiesByDate = getActivitiesByDate();
    for (let i = 0; i < 42; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      const dateKey = formatDateKey(date);
      days.push({ date, activities: activitiesByDate[dateKey] || [] });
    }
    return days;
  };

  const handleCalendarCellSelect = (date: Date, hour?: number) => {
    const dateKey = formatDateKey(date);
    setCalendarFocusDate(dateKey);
    setCalendarFocusHour(typeof hour === 'number' ? hour : null);

    const dayActivities = filteredActivities
      .filter((activity) => {
        if (!activity.activityDate) return false;
        return formatDateKey(new Date(activity.activityDate)) === dateKey;
      })
      .sort(
        (a, b) =>
          new Date(a.startDateTime ?? a.activityDate ?? a.createdDate).getTime() -
          new Date(b.startDateTime ?? b.activityDate ?? b.createdDate).getTime()
      );

    setSheetActivities(dayActivities);
    setAgendaSheetOpen(true);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = sheetActivities.findIndex((a) => a.id === active.id);
    const newIndex = sheetActivities.findIndex((a) => a.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const movedActivity = sheetActivities[oldIndex];
    const targetActivity = sheetActivities[newIndex];

    const oldStart = movedActivity.startDateTime;
    const oldEnd = movedActivity.endDateTime ?? movedActivity.startDateTime;
    const newStart = targetActivity.startDateTime;
    const newEnd = targetActivity.endDateTime ?? targetActivity.startDateTime;

    setSheetActivities(arrayMove(sheetActivities, oldIndex, newIndex));
    setDragConfirm({ activity: movedActivity, oldStart, oldEnd, newStart, newEnd });
  };

  const handleConfirmReschedule = () => {
    if (!dragConfirm) return;
    const { activity, newStart, newEnd } = dragConfirm;

    const durationMs =
      activity.endDateTime
        ? new Date(activity.endDateTime).getTime() - new Date(activity.startDateTime).getTime()
        : 3600000;

    const newStartDate = new Date(newStart);
    const newEndDate = newEnd !== newStart ? new Date(newEnd) : new Date(newStartDate.getTime() + durationMs);

    updateActivity.mutate({
      id: activity.id,
      data: {
        subject: activity.subject,
        description: activity.description,
        activityTypeId: activity.activityTypeId,
        startDateTime: newStartDate.toISOString(),
        endDateTime: newEndDate.toISOString(),
        isAllDay: activity.isAllDay,
        status: activity.status as ActivityStatus | number,
        priority: activity.priority as ActivityPriority | number,
        assignedUserId: activity.assignedUserId,
        paymentTypeId: activity.paymentTypeId ?? null,
        activityMeetingTypeId: activity.activityMeetingTypeId ?? null,
        activityTopicPurposeId: activity.activityTopicPurposeId ?? null,
        activityShippingId: activity.activityShippingId ?? null,
        contactId: activity.contactId,
        potentialCustomerId: activity.potentialCustomerId,
        erpCustomerCode: activity.erpCustomerCode,
        reminders: activity.reminders ?? [],
      },
    });

    setDragConfirm(null);
    setSheetActivities([]);
  };

  const handleCreateFromCalendar = (date: Date, hour?: number) => {
    const dateString = formatDateKey(date);
    setCalendarFocusDate(dateString);
    setCalendarFocusHour(typeof hour === 'number' ? hour : null);
    setSelectedDate(dateString);
    if (typeof hour === 'number') {
      setSlotStart(formatSlotStart(date, hour));
      setSlotEnd(formatSlotEnd(date, hour));
    } else {
      setSlotStart(`${dateString}T09:00`);
      setSlotEnd(`${dateString}T10:00`);
    }
    setFormOpen(true);
  };

  const calendarSummary = useMemo(() => {
    const visibleActivities = filteredActivities;
    const completed = visibleActivities.filter((activity) => Number(activity.status) === ActivityStatus.Completed).length;
    const groupedByDay = visibleActivities.reduce<Record<string, number>>((accumulator, activity) => {
      const key = activity.activityDate ? formatDateKey(new Date(activity.activityDate)) : 'no-date';
      accumulator[key] = (accumulator[key] ?? 0) + 1;
      return accumulator;
    }, {});

    const busiestEntry = Object.entries(groupedByDay).sort((left, right) => right[1] - left[1])[0];
    const busiestDayLabel =
      busiestEntry && busiestEntry[0] !== 'no-date'
        ? new Date(busiestEntry[0]).toLocaleDateString(i18n.language, {
            day: 'numeric',
            month: 'short',
          })
        : t('dailyTasks.noTasks');

    return {
      visibleCount: visibleActivities.length,
      completedCount: completed,
      scheduledCount: visibleActivities.length - completed,
      busiestDayLabel,
      busiestDayCount: busiestEntry?.[1] ?? 0,
    };
  }, [filteredActivities, i18n.language, t]);

  const focusedCalendarDateLabel = useMemo(() => {
    const date = new Date(calendarFocusDate);
    const baseLabel = date.toLocaleDateString(i18n.language, {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });

    if (calendarViewMode === 'weekly' && calendarFocusHour !== null) {
      return `${baseLabel} • ${String(calendarFocusHour).padStart(2, '0')}:00`;
    }

    return baseLabel;
  }, [calendarFocusDate, calendarFocusHour, calendarViewMode, i18n.language]);

  const filterButtonStyle = (isActive: boolean) => `
    h-8 text-xs font-medium transition-all rounded-lg shrink-0
    ${isActive 
      ? 'bg-linear-to-r from-pink-600 to-orange-600 text-white shadow-lg shadow-pink-500/20 border-transparent' 
      : 'bg-white/50 dark:bg-white/5 border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300'}
  `;

  const getUserDisplayName = (): string => {
    if (!user) return '';
    return user.name || user.email || 'Kullanıcı';
  };

  const formatLastUpdated = (): string => {
    if (!dataUpdatedAt) {
      return t('dailyTasks.notUpdatedYet', { defaultValue: 'Henüz güncellenmedi' });
    }

    return new Date(dataUpdatedAt).toLocaleString(i18n.language, {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const backgroundBlobs = (
    <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
      <div className="absolute top-0 left-1/4 w-[200px] md:w-[500px] h-[200px] md:h-[500px] bg-purple-500/10 dark:bg-purple-900/20 rounded-full blur-[60px] md:blur-[100px] animate-pulse" />
      <div className="absolute bottom-0 right-1/4 w-[200px] md:w-[400px] h-[200px] md:h-[400px] bg-pink-500/10 dark:bg-pink-900/20 rounded-full blur-[50px] md:blur-[80px] animate-pulse" style={{ animationDelay: '2s' }} />
    </div>
  );

  if (data) hasShownContentOnce.current = true;
  const isInitialLoad = isLoading && !hasShownContentOnce.current;

  if (isInitialLoad) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="flex flex-col items-center gap-4">
           <div className="relative">
             <div className="h-12 w-12 md:h-16 md:w-16 animate-spin rounded-full border-b-4 border-pink-500" />
             <div className="absolute inset-0 h-12 w-12 md:h-16 md:w-16 animate-ping rounded-full border-pink-500 opacity-20" />
           </div>
           <div className="text-xs md:text-sm font-medium text-slate-500 animate-pulse">
             {t('dailyTasks.loading')}
           </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6 md:space-y-8 relative pb-20 overflow-x-hidden">
      {backgroundBlobs}
      
      {/* 1. HERO SECTION: Responsive Layout */}
      <div className="relative overflow-hidden rounded-2xl md:rounded-3xl bg-linear-to-br from-indigo-900 via-purple-900 to-slate-900 p-6 md:p-8 shadow-2xl ring-1 ring-white/10">
        <div className="absolute inset-0 opacity-20 brightness-100 contrast-150 bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.14)_1px,transparent_0)] bg-size-[8px_8px]"></div>
        <div className="absolute -right-20 -top-20 h-40 w-40 md:h-64 md:w-64 rounded-full bg-pink-500/30 blur-3xl"></div>
        
        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="space-y-2 w-full lg:w-auto">
            <div className="flex items-center gap-2 text-pink-300 font-medium text-xs md:text-sm uppercase tracking-wider">
              <Sparkles size={14} className="md:w-4 md:h-4" />
              <span>{t('dailyTasks.dashboard')}</span>
            </div>
            <h1 className="text-2xl md:text-4xl font-bold text-white leading-tight">
              {greeting}, <br className="md:hidden" /> 
              <span className="text-transparent bg-clip-text bg-linear-to-r from-pink-400 to-orange-400">
                {getUserDisplayName()}
              </span>
            </h1>
            <p className="text-slate-300 text-sm md:text-base max-w-lg">
              {t('dailyTasks.summary')}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full lg:w-auto mt-2 lg:mt-0">
             <div className="flex items-center justify-between w-full sm:w-auto sm:flex-col sm:items-end sm:mr-4 sm:text-right bg-white/5 sm:bg-transparent p-3 sm:p-0 rounded-xl">
                <span className="text-sm sm:text-xs text-slate-300 sm:text-slate-400 uppercase tracking-wide">{t('dailyTasks.totalTasks')}</span>
                <span className="text-xl sm:text-2xl font-bold text-white">{filteredActivities.length}</span>
             </div>
             <Button 
              onClick={handleNewTask}
              className="w-full sm:w-auto h-12 px-6 bg-white text-purple-900 hover:bg-slate-100 font-bold rounded-xl shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 border-0"
            >
              <Plus size={20} className="mr-2 text-pink-600" />
              {t('dailyTasks.newTask')}
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
        {[
          {
            label: t('dailyTasks.activePipeline', { defaultValue: 'Açık iş yükü' }),
            value: enterpriseMetrics.activeCount,
            tone: 'from-sky-500/20 to-blue-500/10 border-sky-400/20',
          },
          {
            label: t('dailyTasks.completedRange', { defaultValue: 'Tamamlanan' }),
            value: enterpriseMetrics.completedCount,
            tone: 'from-emerald-500/20 to-green-500/10 border-emerald-400/20',
          },
          {
            label: t('dailyTasks.overdue', { defaultValue: 'Geciken işler' }),
            value: enterpriseMetrics.overdueItems.length,
            tone: 'from-rose-500/20 to-red-500/10 border-rose-400/20',
          },
          {
            label: t('dailyTasks.dueToday', { defaultValue: 'Bugün aksiyon bekleyen' }),
            value: enterpriseMetrics.dueTodayCount,
            tone: 'from-amber-500/20 to-orange-500/10 border-amber-400/20',
          },
          {
            label: t('dailyTasks.completionRate', { defaultValue: 'Tamamlanma oranı' }),
            value: `%${enterpriseMetrics.completionRate}`,
            tone: 'from-fuchsia-500/20 to-pink-500/10 border-fuchsia-400/20',
          },
        ].map((card) => (
          <div
            key={card.label}
            className={`rounded-2xl border bg-linear-to-br ${card.tone} p-4 shadow-sm backdrop-blur-xl`}
          >
            <div className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
              {card.label}
            </div>
            <div className="mt-3 text-3xl font-bold text-slate-900 dark:text-white">
              {card.value}
            </div>
          </div>
        ))}
      </div>

      {enterpriseMetrics.overdueItems.length > 0 ? (
        <div className="rounded-2xl border border-rose-300/30 bg-rose-50/80 px-4 py-3 text-sm text-rose-900 shadow-sm backdrop-blur-xl dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-100">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-rose-500" />
              <div>
                <div className="font-semibold">
                  {t('dailyTasks.overdueWarningTitle', {
                    defaultValue: 'Takip gerektiren gecikmiş aktiviteler var',
                  })}
                </div>
                <div className="text-rose-700 dark:text-rose-200">
                  {t('dailyTasks.overdueWarningDescription', {
                    defaultValue: '{{count}} aktivite plan tarihini geçti. Önceliklendirme önerilir.',
                    count: enterpriseMetrics.overdueItems.length,
                  })}
                </div>
              </div>
            </div>
            <Button
              variant="outline"
              className="border-rose-300 bg-white/70 text-rose-700 hover:bg-rose-100 dark:border-rose-400/20 dark:bg-transparent dark:text-rose-100 dark:hover:bg-rose-500/10"
              onClick={handleReviewOpenTasks}
            >
              {t('dailyTasks.reviewOpenTasks', { defaultValue: 'Açık işleri incele' })}
            </Button>
          </div>
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.3fr_0.7fr]">
        <div className="rounded-3xl border border-white/20 bg-white/70 p-5 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-[#130c1f]/70">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                {t('dailyTasks.focusQueue', { defaultValue: 'Öncelikli gündem' })}
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {t('dailyTasks.focusQueueDescription', {
                  defaultValue: 'Yaklaşan ve riskli işleri tek bakışta yönet.',
                })}
              </p>
            </div>
            <Button
              variant="outline"
              className="rounded-xl"
              onClick={() => void refetch()}
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
              {t('dailyTasks.refresh', { defaultValue: 'Yenile' })}
            </Button>
          </div>

          <div className="space-y-3">
            {(enterpriseMetrics.overdueItems.slice(0, 3).concat(enterpriseMetrics.upcomingItems)).slice(0, 5).map((activity) => (
              <button
                key={`${activity.id}-${activity.startDateTime}`}
                type="button"
                onClick={() => handleEdit(activity)}
                className="flex w-full items-start justify-between gap-3 rounded-2xl border border-slate-200/80 bg-white/80 p-4 text-left transition hover:-translate-y-0.5 hover:border-pink-300 hover:shadow-md dark:border-white/10 dark:bg-white/5 dark:hover:border-pink-500/40"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                      {activity.subject}
                    </span>
                    <ActivityStatusBadge status={activity.status} />
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                    <span>{formatActivityTimeRange(activity)}</span>
                    <span>•</span>
                    <span>{getAssignedUserName(activity.assignedUserId)}</span>
                  </div>
                </div>
                <ActivityPriorityBadge priority={activity.priority} />
              </button>
            ))}
            {enterpriseMetrics.overdueItems.length === 0 && enterpriseMetrics.upcomingItems.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-500 dark:border-white/10 dark:text-slate-400">
                {t('dailyTasks.focusQueueEmpty', {
                  defaultValue: 'Takip bekleyen kritik iş bulunmuyor.',
                })}
              </div>
            ) : null}
          </div>
        </div>

        <div className="rounded-3xl border border-white/20 bg-white/70 p-5 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-[#130c1f]/70">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              {t('dailyTasks.workloadTitle', { defaultValue: 'İş yükü dağılımı' })}
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {t('dailyTasks.workloadDescription', {
                defaultValue: 'Açık aktivitelerin kullanıcı bazlı yoğunluğu.',
              })}
            </p>
          </div>

          <div className="space-y-4">
            {enterpriseMetrics.workload.map((item) => {
              const percentage =
                enterpriseMetrics.activeCount > 0
                  ? Math.max(8, Math.round((item.count / enterpriseMetrics.activeCount) * 100))
                  : 0;

              return (
                <div key={item.name} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="truncate font-medium text-slate-700 dark:text-slate-200">
                      {item.name}
                    </span>
                    <span className="text-slate-500 dark:text-slate-400">{item.count}</span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-200 dark:bg-white/10">
                    <div
                      className="h-2 rounded-full bg-linear-to-r from-pink-500 to-orange-500"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
            {enterpriseMetrics.workload.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-500 dark:border-white/10 dark:text-slate-400">
                {t('dailyTasks.workloadEmpty', {
                  defaultValue: 'Dağıtılacak açık iş bulunmuyor.',
                })}
              </div>
            ) : null}
          </div>

          <div className="mt-6 rounded-2xl bg-slate-100/70 p-4 text-xs text-slate-500 dark:bg-white/5 dark:text-slate-400">
            <span className="font-semibold text-slate-700 dark:text-slate-200">
              {t('dailyTasks.lastUpdated', { defaultValue: 'Son güncelleme' })}:
            </span>{' '}
            {formatLastUpdated()}
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        
        {/* 2. KONTROL PANELİ: Responsive Layout */}
        <div className="sticky top-2 z-30 bg-white/80 dark:bg-[#0c0516]/80 backdrop-blur-xl border border-white/20 dark:border-white/10 shadow-lg rounded-2xl p-3 md:p-4 transition-all duration-300">
            <div className="flex flex-col xl:flex-row gap-4 justify-between items-center">
                
                {/* Sol: Tablar (Mobilde Grid) */}
                <TabsList className="bg-slate-100 dark:bg-white/5 p-1 rounded-xl h-auto w-full xl:w-auto grid grid-cols-3 xl:flex gap-1">
                    <TabsTrigger value="tasks" className="rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-[#2d1b4e] data-[state=active]:text-pink-600 dark:data-[state=active]:text-pink-400 data-[state=active]:shadow-md py-2 px-2 md:px-4 text-[10px] md:text-xs font-medium transition-all duration-300">
                        <LayoutGrid size={14} className="mr-1 md:mr-2 md:w-4 md:h-4" />
                        <span className="truncate">{t('dailyTasks.weeklyTasks')}</span>
                    </TabsTrigger>
                    <TabsTrigger value="list" className="rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-[#2d1b4e] data-[state=active]:text-pink-600 dark:data-[state=active]:text-pink-400 data-[state=active]:shadow-md py-2 px-2 md:px-4 text-[10px] md:text-xs font-medium transition-all duration-300">
                        <ListTodo size={14} className="mr-1 md:mr-2 md:w-4 md:h-4" />
                        <span className="truncate">{t('dailyTasks.dailyList')}</span>
                    </TabsTrigger>
                    <TabsTrigger value="calendar" className="rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-[#2d1b4e] data-[state=active]:text-pink-600 dark:data-[state=active]:text-pink-400 data-[state=active]:shadow-md py-2 px-2 md:px-4 text-[10px] md:text-xs font-medium transition-all duration-300">
                        <CalendarIcon size={14} className="mr-1 md:mr-2 md:w-4 md:h-4" />
                        <span className="truncate">{t('dailyTasks.calendar')}</span>
                    </TabsTrigger>
                </TabsList>

                {/* Sağ: Filtreler (Mobilde Stack) */}
                <div className="flex flex-col sm:flex-row w-full xl:w-auto gap-3">
                    <div className="relative w-full sm:w-[240px]">
                      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <Input
                        value={searchTerm}
                        onChange={(event) => setSearchTerm(event.target.value)}
                        placeholder={t('dailyTasks.searchPlaceholder')}
                        className="h-10 rounded-xl border-slate-200 dark:border-white/10 bg-white/50 dark:bg-white/5 pl-9 pr-10 focus-visible:ring-pink-500"
                      />
                      {isFetching ? (
                        <RefreshCw className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-pink-500" />
                      ) : null}
                    </div>
                    
                    {/* Status Pill Group (Scrollable on mobile) */}
                    <div className="flex items-center p-1 bg-slate-100/50 dark:bg-white/5 rounded-xl border border-slate-200/50 dark:border-white/5 w-full sm:w-auto overflow-x-auto no-scrollbar">
                        <div className="flex gap-1 min-w-max">
                            <Button variant="ghost" size="sm" onClick={() => setStatusFilter('all')} className={filterButtonStyle(statusFilter === 'all')}>
                                {t('dailyTasks.all')}
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => setStatusFilter(String(ActivityStatus.Scheduled))} className={filterButtonStyle(statusFilter === String(ActivityStatus.Scheduled))}>
                                <Clock size={12} className="mr-1" /> {t('dailyTasks.pending')}
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => setStatusFilter(String(ActivityStatus.Cancelled))} className={filterButtonStyle(statusFilter === String(ActivityStatus.Cancelled))}>
                                <PauseCircle size={12} className="mr-1" /> {t('statusCanceled', { ns: 'activity-management' })}
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => setStatusFilter(String(ActivityStatus.Completed))} className={filterButtonStyle(statusFilter === String(ActivityStatus.Completed))}>
                                <CheckCircle2 size={12} className="mr-1" /> {t('dailyTasks.completed')}
                            </Button>
                        </div>
                    </div>

                    {/* Personel Seçimi */}
                    <div className="flex items-center gap-2 w-full sm:w-[160px]">
                      <User size={14} className="shrink-0 text-pink-500" />
                      <VoiceSearchCombobox
                        options={userFilterOptions}
                        value={assignedUserFilter?.toString() || 'all'}
                        onSelect={(v) => setAssignedUserFilter(v === 'all' || !v ? undefined : parseInt(v, 10))}
                        onDebouncedSearchChange={setUserFilterSearchTerm}
                        onFetchNextPage={userDropdown.fetchNextPage}
                        hasNextPage={userDropdown.hasNextPage}
                        isLoading={userDropdown.isLoading}
                        isFetchingNextPage={userDropdown.isFetchingNextPage}
                        placeholder={t('dailyTasks.allEmployees')}
                        className="h-10 rounded-xl border-slate-200 dark:border-white/10 bg-white/50 dark:bg-white/5 focus:ring-pink-500 flex-1 min-w-0"
                      />
                    </div>
                </div>
            </div>
        </div>

        {/* 3. İÇERİK ALANI */}
        <div ref={contentSectionRef} className="mt-6 md:mt-8 animate-in fade-in slide-in-from-bottom-8 duration-700 relative">
            {error ? (
              <div className="mb-6 flex flex-col items-center justify-center gap-4 rounded-2xl border border-red-200 bg-red-50/80 p-8 text-center dark:border-red-500/20 dark:bg-red-500/10">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-100 text-red-600 dark:bg-red-500/15 dark:text-red-300">
                  <AlertTriangle size={28} />
                </div>
                <div className="space-y-1">
                  <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                    {t('dailyTasks.loadErrorTitle')}
                  </h2>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    {t('dailyTasks.loadErrorDescription')}
                  </p>
                </div>
                <Button onClick={() => void refetch()} className="rounded-xl">
                  <RefreshCw size={16} className="mr-2" />
                  {t('dailyTasks.retry')}
                </Button>
              </div>
            ) : null}
            {isFetching && (
              <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/60 dark:bg-[#0c0516]/60 backdrop-blur-sm rounded-2xl min-h-[200px]">
                <div className="flex flex-col items-center gap-3">
                  <div className="h-10 w-10 animate-spin rounded-full border-2 border-pink-500 border-t-transparent" />
                  <span className="text-sm font-medium text-slate-600 dark:text-slate-400">{t('dailyTasks.loading')}</span>
                </div>
              </div>
            )}
            {/* --- KART GÖRÜNÜMÜ --- */}
            <TabsContent value="tasks" className="mt-0">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4 md:gap-6">
                {filteredActivities.length === 0 ? (
                <div className="col-span-full flex flex-col items-center justify-center py-20 bg-white/30 dark:bg-white/5 rounded-3xl border border-dashed border-slate-300 dark:border-white/10 mx-auto w-full max-w-lg text-center p-6">
                    <div className="bg-slate-100 dark:bg-white/10 p-4 rounded-full mb-4">
                        <Target size={40} className="text-slate-400" />
                    </div>
                    <p className="text-lg font-medium text-slate-600 dark:text-slate-300">{t('dailyTasks.noTasks')}</p>
                    <p className="text-sm text-slate-400">{t('dailyTasks.relax')}</p>
                </div>
                ) : (
                filteredActivities.map((activity) => (
                    <div
                    key={activity.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => handleEdit(activity)}
                    onKeyDown={(e) => e.key === 'Enter' && handleEdit(activity)}
                    className="group relative bg-white/80 dark:bg-[#150d22]/80 backdrop-blur-md border border-white/50 dark:border-white/5 rounded-2xl p-4 md:p-5 shadow-sm hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 flex flex-col gap-3 md:gap-4 overflow-hidden cursor-pointer"
                    >
                        {/* Sol Kenar Öncelik Çizgisi */}
                        <div className={`absolute left-0 top-0 bottom-0 w-1 ${activity.priority === 'High' ? 'bg-red-500' : activity.priority === 'Medium' ? 'bg-orange-500' : 'bg-blue-500'}`} />

                        {/* Kart Başlık */}
                        <div className="flex items-start justify-between pl-2">
                            <div className="flex flex-col overflow-hidden">
                                <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-1 flex items-center gap-1">
                                    {activity.activityType && <span className={`w-1.5 h-1.5 rounded-full ${activity.priority === 'High' ? 'bg-red-500' : 'bg-blue-500'}`}></span>}
                                    {getActivityTypeDisplay(activity.activityType)}
                                </span>
                                <h3 className={`font-bold text-base md:text-lg leading-tight truncate transition-colors ${activity.isCompleted ? 'text-slate-400 line-through' : 'text-slate-800 dark:text-slate-100 group-hover:text-pink-600 dark:group-hover:text-pink-400'}`}>
                                    {activity.subject}
                                </h3>
                            </div>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActivityPendingDelete(activity);
                                }}
                            >
                                <Trash2 size={16} />
                            </Button>
                        </div>

                        {/* Açıklama */}
                        {activity.description && (
                            <div className="pl-2 relative">
                                <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 line-clamp-2 min-h-[2.5em]">
                                    {activity.description}
                                </p>
                            </div>
                        )}

                        {/* Bilgi Hapları */}
                        <div className="pl-2 flex flex-wrap gap-2">
                            <ActivityPriorityBadge priority={activity.priority} />
                            {activity.activityType && (() => {
                                const display = getActivityTypeDisplay(activity.activityType);
                                return display ? (
                                  <div className={`px-2 py-0.5 rounded-md text-[10px] font-semibold border border-current ${getCategoryColor(display)}`}>
                                    {t(`activityManagement.activityType${display}`, display)}
                                  </div>
                                ) : null;
                            })()}
                        </div>

                        {/* Alt Bilgi ve Aksiyonlar */}
                        <div className="mt-auto pt-3 md:pt-4 pl-2 border-t border-slate-100 dark:border-white/5 flex items-center justify-between">
                            <div className="flex items-center gap-2 text-xs text-slate-400">
                                <div className="w-5 h-5 md:w-6 md:h-6 rounded-full bg-slate-200 dark:bg-white/10 flex items-center justify-center text-slate-500">
                                    <User size={10} className="md:w-3 md:h-3" />
                                </div>
                                <div className="flex flex-col">
                                    <span className="font-medium text-slate-600 dark:text-slate-300 text-[10px]">{getAssignedUserName(activity.assignedUserId).split(' ')[0]}</span>
                                    <span className="text-[9px]">{activity.activityDate ? new Date(activity.activityDate).toLocaleDateString(i18n.language, {day:'numeric', month:'short'}) : '-'}</span>
                                </div>
                            </div>

                            {/* Hızlı Aksiyonlar */}
                            <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                                {Number(activity.status) === ActivityStatus.Scheduled && (
                                    <Button size="sm" className="h-7 w-7 md:h-8 md:w-8 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 hover:bg-blue-600 hover:text-white p-0 transition-colors shadow-none" onClick={() => handleStartTask(activity)}>
                                        <Play size={12} className="md:w-3.5 md:h-3.5" fill="currentColor" />
                                    </Button>
                                )}
                                {Number(activity.status) === ActivityStatus.Scheduled && (
                                    <Button size="sm" className="h-7 w-7 md:h-8 md:w-8 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-600 hover:bg-amber-600 hover:text-white p-0 transition-colors shadow-none" onClick={() => handlePutOnHold(activity)}>
                                        <PauseCircle size={14} className="md:w-4 md:h-4" />
                                    </Button>
                                )}
                                <Button size="sm" variant={activity.isCompleted ? "default" : "outline"} className={`h-7 w-7 md:h-8 md:w-8 rounded-full p-0 transition-colors ${activity.isCompleted ? 'bg-green-500 text-white' : 'border-slate-200 text-slate-400 hover:text-green-600 hover:border-green-600'}`} onClick={() => handleCompleteTask(activity)}>
                                    <CheckCircle2 size={14} className="md:w-4 md:h-4" />
                                </Button>
                            </div>
                        </div>
                    </div>
                ))
                )}
            </div>
            </TabsContent>

            {/* --- LİSTE GÖRÜNÜMÜ --- */}
            <TabsContent value="list" className="mt-0">
                <div className="bg-white/70 dark:bg-[#1a1025]/60 backdrop-blur-xl border border-white/60 dark:border-white/5 shadow-sm rounded-2xl overflow-hidden">
                    {filteredActivities.length === 0 ? (
                        <div className="py-20 text-center text-slate-400">{t('dailyTasks.noTasks')}</div>
                    ) : (
                        <div className="divide-y divide-slate-100 dark:divide-white/5">
                            {filteredActivities.map((activity) => (
                                <div
                                    key={activity.id}
                                    role="button"
                                    tabIndex={0}
                                    onClick={() => handleEdit(activity)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleEdit(activity)}
                                    className="group flex flex-col md:flex-row items-start md:items-center gap-3 md:gap-4 p-4 hover:bg-slate-50/80 dark:hover:bg-white/5 transition-colors cursor-pointer"
                                >
                                    <div className="flex items-start gap-3 w-full md:w-auto">
                                        <div onClick={(e) => e.stopPropagation()}>
                                            <Checkbox
                                                checked={activity.isCompleted}
                                                onCheckedChange={() => handleToggleComplete(activity)}
                                                className="mt-1 md:mt-0 h-5 w-5 border-2 rounded-md data-[state=checked]:bg-green-500 data-[state=checked]:border-green-500"
                                            />
                                        </div>
                                        <div className="flex-1 md:hidden">
                                            <span className={`font-semibold text-sm line-clamp-1 ${activity.isCompleted ? 'line-through text-slate-400' : 'text-slate-800 dark:text-slate-200'}`}>
                                                {activity.subject}
                                            </span>
                                        </div>
                                    </div>
                                    
                                    <div className="flex-1 min-w-0 pl-8 md:pl-0 w-full">
                                        <div className="hidden md:flex items-center gap-3">
                                            <span className={`font-semibold text-sm truncate ${activity.isCompleted ? 'line-through text-slate-400' : 'text-slate-800 dark:text-slate-200'}`}>
                                                {activity.subject}
                                            </span>
                                            <ActivityPriorityBadge priority={activity.priority} />
                                            <ActivityStatusBadge status={activity.status} />
                                        </div>
                                        <div className="flex flex-wrap items-center gap-2 md:gap-4 mt-1 text-xs text-slate-500 dark:text-slate-400">
                                            <span className="flex items-center gap-1"><CalendarDays size={12} className="text-pink-500" /> {activity.activityDate ? new Date(activity.activityDate).toLocaleDateString(i18n.language) : '-'}</span>
                                            <span className="flex items-center gap-1"><User size={12} className="text-blue-500" /> {getAssignedUserName(activity.assignedUserId)}</span>
                                            <div className="md:hidden flex gap-2">
                                                <ActivityStatusBadge status={activity.status} />
                                            </div>
                                            {activity.description && <span className="hidden md:inline truncate max-w-md opacity-70 border-l pl-2 border-slate-300 dark:border-white/10">{activity.description}</span>}
                                        </div>
                                    </div>
                                    <div className="flex justify-end w-full md:w-auto pl-8 md:pl-0 mt-2 md:mt-0" onClick={(e) => e.stopPropagation()}>
                                        <Button variant="ghost" size="sm" className="h-8 w-8 text-slate-400 hover:text-red-500" onClick={() => setActivityPendingDelete(activity)}>
                                            <Trash2 size={16} />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </TabsContent>

            {/* --- TAKVİM GÖRÜNÜMÜ (Haftalık saatlik / Aylık) --- */}
            <TabsContent value="calendar" className="mt-0">
                <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
                    {[
                      {
                        label: t('dailyTasks.calendarVisibleItems', { defaultValue: 'Takvimde görünen' }),
                        value: calendarSummary.visibleCount,
                      },
                      {
                        label: t('dailyTasks.calendarScheduledItems', { defaultValue: 'Planlı kayıt' }),
                        value: calendarSummary.scheduledCount,
                      },
                      {
                        label: t('dailyTasks.calendarCompletedItems', { defaultValue: 'Tamamlanan kayıt' }),
                        value: calendarSummary.completedCount,
                      },
                      {
                        label: t('dailyTasks.calendarBusiestDay', { defaultValue: 'En yoğun gün' }),
                        value: calendarSummary.busiestDayCount > 0
                          ? `${calendarSummary.busiestDayLabel} • ${calendarSummary.busiestDayCount}`
                          : '-',
                      },
                    ].map((item, index) => (
                      <div
                        key={`calendar-summary-${index}`}
                        className="rounded-2xl border border-white/50 bg-white/65 p-4 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-[#140d20]/65"
                      >
                        <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                          {item.label}
                        </div>
                        <div className="mt-3 text-2xl font-semibold text-slate-900 dark:text-white">
                          {item.value}
                        </div>
                      </div>
                    ))}
                  </div>

                <div className="grid grid-cols-1 gap-4">
                <div className="bg-white/70 dark:bg-[#1a1025]/60 backdrop-blur-xl border border-white/60 dark:border-white/5 shadow-sm rounded-2xl p-4 md:p-6 overflow-hidden">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                        <div className="flex items-center gap-2 bg-slate-100 dark:bg-white/5 rounded-lg p-1">
                            <Button
                              variant={calendarViewMode === 'weekly' ? 'secondary' : 'ghost'}
                              size="sm"
                              onClick={() => setCalendarViewMode('weekly')}
                              className="rounded-md text-xs font-medium"
                            >
                              {t('dailyTasks.weekly')}
                            </Button>
                            <Button
                              variant={calendarViewMode === 'monthly' ? 'secondary' : 'ghost'}
                              size="sm"
                              onClick={() => setCalendarViewMode('monthly')}
                              className="rounded-md text-xs font-medium"
                            >
                              {t('dailyTasks.monthly')}
                            </Button>
                        </div>
                        <div className="flex items-center gap-1 md:gap-2 bg-slate-100 dark:bg-white/5 rounded-lg p-1">
                          {calendarViewMode === 'weekly' ? (
                            <>
                              <Button variant="ghost" size="icon" onClick={handlePreviousWeek} className="h-8 w-8 rounded-md hover:bg-white dark:hover:bg-white/10 shadow-sm"><ChevronLeft size={16} /></Button>
                              <Button variant="ghost" size="sm" onClick={handleThisWeek} className="h-8 text-xs font-semibold px-2 md:px-3 hover:bg-white dark:hover:bg-white/10 shadow-sm">{t('dailyTasks.thisWeek')}</Button>
                              <Button variant="ghost" size="icon" onClick={handleNextWeek} className="h-8 w-8 rounded-md hover:bg-white dark:hover:bg-white/10 shadow-sm"><ChevronRight size={16} /></Button>
                            </>
                          ) : (
                            <>
                              <Button variant="ghost" size="icon" onClick={handlePreviousMonth} className="h-8 w-8 rounded-md hover:bg-white dark:hover:bg-white/10 shadow-sm"><ChevronLeft size={16} /></Button>
                              <Button variant="ghost" size="sm" onClick={handleToday} className="h-8 text-xs font-semibold px-2 md:px-3 hover:bg-white dark:hover:bg-white/10 shadow-sm">{t('dailyTasks.today')}</Button>
                              <Button variant="ghost" size="icon" onClick={handleNextMonth} className="h-8 w-8 rounded-md hover:bg-white dark:hover:bg-white/10 shadow-sm"><ChevronRight size={16} /></Button>
                            </>
                          )}
                        </div>
                        <h2 className="text-base md:text-xl font-bold text-transparent bg-clip-text bg-linear-to-r from-slate-900 to-slate-600 dark:from-white dark:to-slate-400">
                          {calendarViewMode === 'weekly'
                            ? `${calendarWeekStart.toLocaleDateString(i18n.language, { day: 'numeric', month: 'short' })} – ${new Date(calendarWeekStart.getTime() + 6 * 24 * 60 * 60 * 1000).toLocaleDateString(i18n.language, { day: 'numeric', month: 'short', year: 'numeric' })}`
                            : calendarMonth.toLocaleDateString(i18n.language, { month: 'long', year: 'numeric' })}
                        </h2>
                    </div>

                    <div className="mb-5 flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200/70 bg-slate-50/80 px-4 py-3 text-xs text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
                      <span className="inline-flex items-center gap-2 font-semibold text-slate-700 dark:text-slate-200">
                        <span className="h-2 w-2 rounded-full bg-indigo-500" />
                        {t('dailyTasks.calendarLegendPlanned', { defaultValue: 'Planlı / aktif' })}
                      </span>
                      <span className="inline-flex items-center gap-2 font-semibold text-slate-700 dark:text-slate-200">
                        <span className="h-2 w-2 rounded-full bg-green-500" />
                        {t('dailyTasks.calendarLegendCompleted', { defaultValue: 'Tamamlanan' })}
                      </span>
                      <span className="inline-flex items-center gap-2 font-semibold text-slate-700 dark:text-slate-200">
                        <span className="h-2 w-2 rounded-full bg-pink-500" />
                        {t('dailyTasks.calendarLegendSelected', { defaultValue: 'Seçili odak alanı' })}
                      </span>
                    </div>

                    {calendarViewMode === 'weekly' ? (
                      <div className="overflow-x-auto pb-2">
                        <div className="min-w-[600px]">
                          <div className="grid grid-cols-8 gap-px bg-slate-200 dark:bg-white/10 rounded-xl overflow-hidden">
                            <div className="sticky left-0 z-20 bg-slate-100 dark:bg-[#140d20] p-2 text-xs font-bold text-slate-500 dark:text-slate-400" />
                            {getWeekDays().map((day) => (
                              <div key={day.toISOString()} className="sticky top-0 z-10 bg-slate-100 dark:bg-[#140d20] p-2 text-center text-xs font-bold text-slate-600 dark:text-slate-300">
                                {day.toLocaleDateString(i18n.language, { weekday: 'short' })}
                                <span className="block text-slate-500 dark:text-slate-400">{day.getDate()}</span>
                              </div>
                            ))}
                            {Array.from({ length: 24 }, (_, hour) => (
                              <div key={hour} className="contents">
                                <div className="sticky left-0 z-10 bg-slate-50 dark:bg-[#120b1b] p-1.5 text-[10px] font-medium text-slate-500 dark:text-slate-400 text-right pr-2">
                                  {String(hour).padStart(2, '0')}:00
                                </div>
                                {getWeekDays().map((day) => {
                                  const slotActivities = getActivitiesForSlot(day, hour);
                                  const isToday = day.toDateString() === new Date().toDateString();
                                  const isSelectedSlot =
                                    calendarFocusDate === formatDateKey(day) && calendarFocusHour === hour;
                                  return (
                                    <div
                                      key={`${day.toISOString()}-${hour}`}
                                      onClick={() => handleCalendarCellSelect(day, hour)}
                                      onDoubleClick={() => handleCreateFromCalendar(day, hour)}
                                      className={`
                                        min-h-[44px] md:min-h-[52px] p-1 cursor-pointer border hover:border-pink-500/50 hover:bg-pink-50/50 dark:hover:bg-pink-500/10 transition-all
                                        ${isSelectedSlot ? 'border-pink-500/70 bg-pink-50/70 dark:bg-pink-500/15 shadow-inner' : 'border-transparent'}
                                        ${isToday ? 'bg-pink-50/30 dark:bg-pink-500/5' : 'bg-white/60 dark:bg-white/5'}
                                      `}
                                    >
                                      <div className="space-y-0.5 overflow-hidden">
                                        {slotActivities.slice(0, 2).map((activity) => (
                                          <div
                                            key={activity.id}
                                            role="button"
                                            tabIndex={0}
                                            className={`text-[9px] px-1 py-0.5 rounded truncate border font-medium cursor-pointer
                                              ${activity.isCompleted ? 'bg-green-100/80 dark:bg-green-900/30 text-green-700 dark:text-green-400 line-through' : 'bg-indigo-100/80 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border-indigo-200/50'}`}
                                            title={activity.subject}
                                            onClick={(e) => { e.stopPropagation(); handleEdit(activity); }}
                                          >
                                            {activity.subject}
                                          </div>
                                        ))}
                                        {slotActivities.length > 2 && (
                                          <button
                                            type="button"
                                            className="pl-1 text-[8px] font-semibold text-pink-500 hover:text-pink-400"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              openCalendarInspect(
                                                `${day.toLocaleDateString(i18n.language, { weekday: 'long', day: 'numeric', month: 'long' })} ${String(hour).padStart(2, '0')}:00`,
                                                slotActivities,
                                                t('dailyTasks.slotActivitiesDescription')
                                              );
                                            }}
                                          >
                                            +{slotActivities.length - 2} {t('dailyTasks.more')}
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="overflow-x-auto pb-2">
                        <div className="min-w-[520px] sm:min-w-[600px]">
                          <div className="grid grid-cols-7 gap-2 md:gap-4">
                            {[t('dailyTasks.days.mon'), t('dailyTasks.days.tue'), t('dailyTasks.days.wed'), t('dailyTasks.days.thu'), t('dailyTasks.days.fri'), t('dailyTasks.days.sat'), t('dailyTasks.days.sun')].map((day, dayIndex) => (
                              <div key={`calendar-weekday-${dayIndex}`} className="text-center text-xs font-bold text-slate-400 uppercase tracking-widest pb-4 border-b border-slate-100 dark:border-white/5">
                                {day}
                              </div>
                            ))}
                            {getCalendarDays().map((dayData, index) => {
                              const isCurrentMonth = dayData.date.getMonth() === calendarMonth.getMonth();
                              const isToday = dayData.date.toDateString() === new Date().toDateString();
                              const isSelectedDay = calendarFocusDate === formatDateKey(dayData.date);
                              return (
                                <div
                                  key={index}
                                  onClick={() => handleCalendarCellSelect(dayData.date)}
                                  onDoubleClick={() => handleCreateFromCalendar(dayData.date)}
                                  className={`
                                    min-h-[80px] md:min-h-[120px] rounded-xl md:rounded-2xl p-2 md:p-3 cursor-pointer transition-all duration-200 border group
                                    ${!isCurrentMonth ? 'opacity-30 bg-transparent border-transparent' : 'bg-white/40 dark:bg-white/5 border-slate-100 dark:border-white/10 hover:border-pink-500/50 hover:bg-white/80 dark:hover:bg-white/10 hover:shadow-lg hover:-translate-y-1'}
                                    ${isToday ? 'ring-2 ring-pink-500 ring-offset-2 dark:ring-offset-[#1a1025] bg-pink-50/50 dark:bg-pink-500/10' : ''}
                                    ${isSelectedDay ? 'border-pink-500/60 bg-pink-50/70 dark:bg-pink-500/15 shadow-lg' : ''}
                                  `}
                                >
                                  <div className="flex justify-between items-start mb-2">
                                    <div className={`text-xs md:text-sm font-bold w-6 h-6 md:w-7 md:h-7 flex items-center justify-center rounded-full ${isToday ? 'bg-pink-600 text-white shadow-lg shadow-pink-500/30' : 'text-slate-600 dark:text-slate-400 group-hover:bg-slate-200 dark:group-hover:bg-white/20'}`}>
                                      {dayData.date.getDate()}
                                    </div>
                                    <Plus size={14} className="opacity-0 group-hover:opacity-100 text-slate-400 transition-opacity hidden md:block" />
                                  </div>
                                  <div className="space-y-1 md:space-y-1.5 overflow-hidden">
                                    {dayData.activities.slice(0, 3).map((activity) => (
                                      <div
                                        key={activity.id}
                                        role="button"
                                        tabIndex={0}
                                        className={`text-[9px] md:text-[10px] px-1 md:px-2 py-0.5 md:py-1 rounded-md truncate flex items-center gap-1 border font-medium transition-all cursor-pointer
                                          ${activity.isCompleted 
                                            ? 'bg-green-50/50 text-green-700 border-green-200/50 line-through opacity-70' 
                                            : 'bg-indigo-50/80 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border-indigo-100 dark:border-indigo-500/20 hover:scale-105'}`}
                                        title={activity.subject}
                                        onClick={(e) => { e.stopPropagation(); handleEdit(activity); }}
                                      >
                                        <div className={`w-1 h-1 md:w-1.5 md:h-1.5 rounded-full shrink-0 ${activity.priority === 'High' ? 'bg-red-500' : activity.isCompleted ? 'bg-green-500' : 'bg-indigo-500'}`} />
                                        <span className="truncate">{activity.subject}</span>
                                      </div>
                                    ))}
                                    {dayData.activities.length > 3 && (
                                      <button
                                        type="button"
                                        className="pl-1 text-[9px] font-semibold text-pink-500 hover:text-pink-400 md:text-[10px]"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          openCalendarInspect(
                                            dayData.date.toLocaleDateString(i18n.language, {
                                              weekday: 'long',
                                              day: 'numeric',
                                              month: 'long',
                                              year: 'numeric',
                                            }),
                                            dayData.activities,
                                            t('dailyTasks.dayActivitiesDescription')
                                          );
                                        }}
                                      >
                                        +{dayData.activities.length - 3} {t('dailyTasks.more')}
                                      </button>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    )}
                </div>

                </div>
                </div>
            </TabsContent>
        </div>
      </Tabs>

      <Sheet open={agendaSheetOpen} onOpenChange={(open) => { setAgendaSheetOpen(open); if (!open) setSheetActivities([]); }}>
        <SheetContent
          side="right"
          className="flex w-full flex-col gap-0 border-l border-white/10 bg-white/95 p-0 backdrop-blur-2xl dark:bg-[#140d20]/95 sm:max-w-lg"
        >
          <SheetHeader className="border-b border-slate-100 px-6 py-5 dark:border-white/10">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                  {t('dailyTasks.calendarAgenda', { defaultValue: 'Gün ajandası' })}
                </div>
                <SheetTitle className="mt-1 text-xl font-bold text-slate-900 dark:text-white">
                  {focusedCalendarDateLabel}
                </SheetTitle>
                <SheetDescription className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  {sheetActivities.length > 0
                    ? t('dailyTasks.agendaSheetDragHint', {
                        defaultValue: 'Aktiviteleri sürükleyerek zamanlarını değiştirebilirsiniz.',
                      })
                    : t('dailyTasks.calendarAgendaEmpty', {
                        defaultValue: 'Seçili alanda aktivite bulunmuyor.',
                      })}
                </SheetDescription>
              </div>
              <Button
                size="sm"
                onClick={() => {
                  setAgendaSheetOpen(false);
                  handleCreateFromCalendar(
                    new Date(calendarFocusDate),
                    calendarViewMode === 'weekly' ? (calendarFocusHour ?? 9) : undefined
                  );
                }}
                className="mt-1 shrink-0 rounded-xl"
              >
                <Plus className="mr-1.5 h-4 w-4" />
                {t('dailyTasks.newTask')}
              </Button>
            </div>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-6 py-4">
            {sheetActivities.length > 0 ? (
              <DndContext
                sensors={dndSensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={sheetActivities.map((a) => a.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-3">
                    {sheetActivities.map((activity) => (
                      <SortableActivityItem
                        key={activity.id}
                        activity={activity}
                        onEdit={(a) => {
                          setAgendaSheetOpen(false);
                          handleEdit(a);
                        }}
                        formatTimeRange={formatActivityTimeRange}
                        getAssignedUserName={getAssignedUserName}
                        statusBadge={(a) => <ActivityStatusBadge status={a.status} />}
                        priorityBadge={(a) => <ActivityPriorityBadge priority={a.priority} />}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-4 py-16 text-center">
                <div className="rounded-2xl border border-dashed border-slate-200 p-8 dark:border-white/10">
                  <CalendarDays className="mx-auto mb-3 h-10 w-10 text-slate-300 dark:text-white/20" />
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    {t('dailyTasks.calendarAgendaEmpty', {
                      defaultValue: 'Seçili alanda aktivite bulunmuyor. Yeni kayıt oluşturabilirsiniz.',
                    })}
                  </p>
                </div>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      <AlertDialog open={dragConfirm !== null} onOpenChange={(open) => { if (!open) setDragConfirm(null); }}>
        <AlertDialogContent className="border-white/10 bg-white/95 backdrop-blur-2xl dark:bg-[#140d20]">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t('dailyTasks.rescheduleTitle', { defaultValue: 'Aktiviteyi yeniden zamanla' })}
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3 text-sm text-slate-500 dark:text-slate-400">
                <p>
                  <span className="font-semibold text-slate-900 dark:text-white">
                    {dragConfirm?.activity.subject}
                  </span>{' '}
                  {t('dailyTasks.rescheduleQuestion', { defaultValue: 'aktivitesini yeni zaman dilimine taşımak istiyor musunuz?' })}
                </p>
                <div className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 p-3 dark:border-white/10 dark:bg-white/5">
                  <div className="flex-1 text-center">
                    <div className="text-[11px] uppercase tracking-wider text-slate-400 dark:text-slate-500">
                      {t('dailyTasks.rescheduleFrom', { defaultValue: 'Mevcut zaman' })}
                    </div>
                    <div className="mt-0.5 font-semibold text-slate-700 dark:text-slate-200">
                      {dragConfirm?.oldStart
                        ? new Date(dragConfirm.oldStart).toLocaleTimeString(i18n.language, {
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : '—'}
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" />
                  <div className="flex-1 text-center">
                    <div className="text-[11px] uppercase tracking-wider text-slate-400 dark:text-slate-500">
                      {t('dailyTasks.rescheduleTo', { defaultValue: 'Yeni zaman' })}
                    </div>
                    <div className="mt-0.5 font-semibold text-pink-600 dark:text-pink-400">
                      {dragConfirm?.newStart
                        ? new Date(dragConfirm.newStart).toLocaleTimeString(i18n.language, {
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : '—'}
                    </div>
                  </div>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => { setDragConfirm(null); setSheetActivities([]); }}>
              {t('dailyTasks.cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmReschedule}
              className="bg-pink-600 text-white hover:bg-pink-700 dark:bg-pink-500"
            >
              {t('dailyTasks.rescheduleConfirm', { defaultValue: 'Güncelle' })}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ActivityForm
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) {
            setEditingActivity(null);
            setSelectedDate(null);
            setSlotStart(null);
            setSlotEnd(null);
          }
        }}
        onSubmit={handleFormSubmit}
        activity={editingActivity}
        isLoading={createActivity.isPending || updateActivity.isPending}
        initialDate={editingActivity ? null : (slotStart ? null : selectedDate)}
        initialStartDateTime={editingActivity ? undefined : (slotStart ?? undefined)}
        initialEndDateTime={editingActivity ? undefined : (slotEnd ?? undefined)}
      />
      <AlertDialog
        open={activityPendingDelete !== null}
        onOpenChange={(open) => {
          if (!open) {
            setActivityPendingDelete(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('dailyTasks.deleteConfirmTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('dailyTasks.deleteConfirmDescription', {
                subject: activityPendingDelete?.subject ?? '',
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('dailyTasks.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => void handleDelete()}
              className="bg-red-600 text-white hover:bg-red-700 dark:bg-red-500 dark:text-white"
            >
              {t('dailyTasks.confirmDelete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <Dialog
        open={calendarInspectState !== null}
        onOpenChange={(open) => {
          if (!open) {
            setCalendarInspectState(null);
          }
        }}
      >
        <DialogContent className="max-w-2xl border-white/10 bg-white/95 dark:bg-[#140d20]">
          <DialogHeader>
            <DialogTitle>{calendarInspectState?.title}</DialogTitle>
            <DialogDescription>
              {calendarInspectState?.description ?? t('dailyTasks.calendarInspectDescription')}
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[60vh] space-y-3 overflow-y-auto pr-1">
            {calendarInspectState?.activities.map((activity) => (
              <button
                key={activity.id}
                type="button"
                onClick={() => {
                  setCalendarInspectState(null);
                  handleEdit(activity);
                }}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50/80 p-4 text-left transition hover:border-pink-300 hover:bg-white dark:border-white/10 dark:bg-white/5 dark:hover:border-pink-500/50 dark:hover:bg-white/10"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
                        {activity.subject}
                      </span>
                      <ActivityStatusBadge status={activity.status} />
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                      <span>{formatActivityTimeRange(activity)}</span>
                      <span>•</span>
                      <span>{getAssignedUserName(activity.assignedUserId)}</span>
                    </div>
                    {activity.description ? (
                      <p className="line-clamp-2 text-xs text-slate-600 dark:text-slate-300">
                        {activity.description}
                      </p>
                    ) : null}
                  </div>
                  <ActivityPriorityBadge priority={activity.priority} />
                </div>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

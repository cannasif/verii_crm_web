import { useEffect, useMemo, useState, type ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
  addDays,
  addMonths,
  addWeeks,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isBefore,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
  subMonths,
  subWeeks,
} from 'date-fns';
import {
  Building2,
  CalendarDays,
  CalendarRange,
  ChartNoAxesCombined,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  Clock3,
  LayoutGrid,
  Images,
  ExternalLink,
  Eye,
  List,
  Loader2,
  MapPin,
  MousePointerClick,
  Pencil,
  Plus,
  RotateCw,
  Search,
  Sparkles,
  Tag,
  Trash2,
  UserRound,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ImageWithLoading } from '@/components/shared/ImageWithLoading';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth-store';
import { useDashboardActivitiesCalendar } from '@/features/activity-management/hooks/useMyActivitiesCalendar';
import { useCreateActivity } from '@/features/activity-management/hooks/useCreateActivity';
import { useDeleteActivity } from '@/features/activity-management/hooks/useDeleteActivity';
import { useMyPermissionsQuery } from '@/features/access-control/hooks/useMyPermissionsQuery';
import { useCrudPermissions } from '@/features/access-control/hooks/useCrudPermissions';
import { buildCreateActivityPayload } from '@/features/activity-management/utils/build-create-payload';
import { occursOnCalendarDay } from '@/features/activity-management/utils/activity-calendar-range';
import { ActivityForm } from '@/features/activity-management/components/ActivityForm';
import { activityImageApi } from '@/features/activity-image-management/api/activity-image-api';
import { useActivityImages } from '@/features/activity-image-management/hooks/useActivityImages';
import { useCustomerImagesQuery } from '@/features/customer-360/hooks/useCustomer360';
import { getImageUrl } from '@/lib/image-url';
import { matchesSearchTerm } from '@/lib/search';
import {
  ActivityPriority,
  ActivityStatus,
  type ActivityCalendarItemDto,
  type ActivityFormSchema,
} from '@/features/activity-management/types/activity-types';

type CalendarView = 'month' | 'week' | 'agenda';

const MONTH_CALENDAR_DAY_PREVIEW_LIMIT = 2;
const WEEK_CALENDAR_DAY_PREVIEW_LIMIT = 3;

type ActivityCreateSelection = {
  date: string | null;
  assignedUserId: number | null;
};

function numericValue(value: number | string): number {
  if (typeof value === 'number') return value;
  const parsed = Number(value);
  if (!Number.isNaN(parsed)) return parsed;
  const normalized = value.toLowerCase();
  if (normalized === 'completed') return ActivityStatus.Completed;
  if (normalized === 'cancelled') return ActivityStatus.Cancelled;
  if (normalized === 'high') return ActivityPriority.High;
  if (normalized === 'medium') return ActivityPriority.Medium;
  return ActivityStatus.Scheduled;
}

function customerName(activity: ActivityCalendarItemDto): string | undefined {
  return activity.potentialCustomerName
    || activity.contactName
    || undefined;
}

function assigneeName(activity: ActivityCalendarItemDto): string {
  return activity.assignedUserName?.trim()
    || activity.assignedUserLoginName?.trim()
    || activity.assignedUsername?.trim()
    || `#${activity.assignedUserId}`;
}

function eventTone(activity: ActivityCalendarItemDto): string {
  const status = numericValue(activity.status);
  if (status === ActivityStatus.Completed) return 'border-l-emerald-400 bg-emerald-50/80 text-emerald-800 dark:border-l-emerald-400/60 dark:bg-emerald-500/10 dark:text-emerald-200';
  if (status === ActivityStatus.Cancelled) return 'border-l-slate-300 bg-slate-100/80 text-slate-500 line-through dark:border-l-white/15 dark:bg-white/5 dark:text-slate-400';
  if (isBefore(new Date(activity.endDateTime || activity.startDateTime), new Date())) return 'border-l-rose-400 bg-rose-50/80 text-rose-800 dark:border-l-rose-400/60 dark:bg-rose-500/10 dark:text-rose-200';
  if (numericValue(activity.priority) === ActivityPriority.High) return 'border-l-amber-400 bg-amber-50/80 text-amber-900 dark:border-l-amber-400/60 dark:bg-amber-500/10 dark:text-amber-200';
  return 'border-l-blue-400 bg-blue-50/80 text-blue-800 dark:border-l-blue-400/60 dark:bg-blue-500/10 dark:text-blue-200';
}

type EventStatusKind = 'completed' | 'cancelled' | 'overdue' | 'high' | 'scheduled';

function eventStatusKind(activity: ActivityCalendarItemDto): EventStatusKind {
  const status = numericValue(activity.status);
  if (status === ActivityStatus.Completed) return 'completed';
  if (status === ActivityStatus.Cancelled) return 'cancelled';
  if (isBefore(new Date(activity.endDateTime || activity.startDateTime), new Date())) return 'overdue';
  if (numericValue(activity.priority) === ActivityPriority.High) return 'high';
  return 'scheduled';
}

const STATUS_BADGE_CLASSES: Record<EventStatusKind, string> = {
  completed: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
  cancelled: 'bg-slate-200 text-slate-600 dark:bg-white/10 dark:text-slate-400',
  overdue: 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300',
  high: 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300',
  scheduled: 'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300',
};

const STATUS_DOT_CLASSES: Record<EventStatusKind, string> = {
  completed: 'bg-emerald-500',
  cancelled: 'bg-slate-400',
  overdue: 'bg-rose-500',
  high: 'bg-amber-500',
  scheduled: 'bg-blue-500',
};

function statusLabel(activity: ActivityCalendarItemDto, t: (key: string) => string): string {
  const kind = eventStatusKind(activity);
  if (kind === 'completed') return t('calendar.status.completed');
  if (kind === 'cancelled') return t('calendar.status.cancelled');
  if (kind === 'overdue') return t('calendar.status.overdue');
  return t('calendar.status.scheduled');
}

interface ActivityChipProps {
  activity: ActivityCalendarItemDto;
  compact?: boolean;
  /** Only shown when the calendar is not already filtered down to a single assignee. */
  showAssignee?: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  canOpenCustomer: boolean;
  canOpenCustomer360: boolean;
  onSelect: (activity: ActivityCalendarItemDto) => void;
  onEdit: (activity: ActivityCalendarItemDto) => void;
  onDelete: (activity: ActivityCalendarItemDto) => void;
  onOpenCustomer: (activity: ActivityCalendarItemDto) => void;
  onOpenCustomer360: (activity: ActivityCalendarItemDto) => void;
}

function ActivityChip({
  activity,
  compact = false,
  showAssignee = false,
  canUpdate,
  canDelete,
  canOpenCustomer,
  canOpenCustomer360,
  onSelect,
  onEdit,
  onDelete,
  onOpenCustomer,
  onOpenCustomer360,
}: ActivityChipProps): ReactElement {
  const { t, i18n } = useTranslation('dashboard');
  const locale = i18n.language || 'tr-TR';
  const time = activity.isAllDay ? '' : format(new Date(activity.startDateTime), 'HH:mm');
  const customer = customerName(activity);
  const statusKind = eventStatusKind(activity);
  const hasCustomer = Boolean(activity.potentialCustomerId && activity.potentialCustomerId > 0);
  const [hoverOpen, setHoverOpen] = useState(false);
  const [suppressHover, setSuppressHover] = useState(false);

  return (
    <ContextMenu
      onOpenChange={(open) => {
        if (open) {
          setSuppressHover(true);
          setHoverOpen(false);
        }
      }}
    >
      <ContextMenuTrigger asChild>
        <div
          className="w-full"
          onContextMenu={(event) => {
            event.stopPropagation();
            event.nativeEvent.stopImmediatePropagation();
          }}
          onPointerEnter={() => setSuppressHover(false)}
        >
          <HoverCard
            open={suppressHover ? false : hoverOpen}
            onOpenChange={(open) => {
              if (!suppressHover) setHoverOpen(open);
            }}
            openDelay={250}
            closeDelay={80}
          >
            <HoverCardTrigger asChild>
              <button
                type="button"
                data-testid="activity-calendar-event"
                onClick={() => onSelect(activity)}
                className={cn(
                  'w-full rounded-md border-l-4 text-left shadow-xs transition hover:-translate-y-px hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                  compact ? 'h-5 px-1.5 py-0.5' : 'px-2.5 py-1.5',
                  eventTone(activity),
                )}
              >
                <span className="flex min-w-0 items-center gap-1.5">
                  {time && <span className={cn('shrink-0 font-black tabular-nums opacity-70', compact ? 'text-[9px] leading-none' : 'text-[10px]')}>{time}</span>}
                  <span className={cn('truncate font-bold', compact ? 'text-[10px] leading-none' : 'text-[11px]')}>{activity.subject}</span>
                </span>
                {showAssignee && !compact && (
                  <span className="mt-0.5 flex min-w-0 items-center gap-1 text-[10px] opacity-70">
                    <UserRound size={9} className="shrink-0" />
                    <span className="truncate font-semibold">{assigneeName(activity)}</span>
                  </span>
                )}
              </button>
            </HoverCardTrigger>
      <HoverCardContent side="right" align="start" className="pointer-events-none">
        <div className="flex items-start gap-2.5 border-b border-slate-100 p-3.5 dark:border-white/5">
          <span className={cn('mt-1.5 h-2 w-2 shrink-0 rounded-full', STATUS_DOT_CLASSES[statusKind])} aria-hidden />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-black leading-snug text-slate-900 dark:text-white">{activity.subject}</p>
            {activity.activityTypeName && (
              <p className="mt-0.5 flex items-center gap-1 text-[11px] font-medium text-slate-400 dark:text-slate-500">
                <Tag size={11} />{activity.activityTypeName}
              </p>
            )}
          </div>
          <span className={cn('shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold', STATUS_BADGE_CLASSES[statusKind])}>
            {statusLabel(activity, t)}
          </span>
        </div>

        <div className="space-y-2 p-3.5">
          <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
            <Clock3 size={13} className="shrink-0 text-primary" />
            <span className="font-semibold">{formatActivityRange(activity, locale)}</span>
          </div>
          {customer && (
            <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
              <UserRound size={13} className="shrink-0 text-primary" />
              <span className="truncate font-semibold">{customer}</span>
            </div>
          )}
          {activity.assignedUserId > 0 && (
            <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
              <UserRound size={13} className="shrink-0 text-primary" />
              <span className="truncate font-semibold">{assigneeName(activity)}</span>
            </div>
          )}
          {activity.erpCustomerCode && (
            <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
              <MapPin size={13} className="shrink-0 text-primary" />
              <span className="truncate font-semibold">{activity.erpCustomerCode}</span>
            </div>
          )}
          {activity.description && (
            <p className="line-clamp-2 rounded-lg bg-slate-50 px-2.5 py-2 text-[11px] leading-relaxed text-slate-500 dark:bg-white/5 dark:text-slate-400">
              {activity.description}
            </p>
          )}
        </div>

        <div className="flex items-center gap-1.5 border-t border-slate-100 px-3.5 py-2 text-[10px] font-semibold text-slate-400 dark:border-white/5 dark:text-slate-500">
          <MousePointerClick size={11} />
          {t('calendar.detail.clickHint')}
        </div>
            </HoverCardContent>
          </HoverCard>
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent className="w-64">
        <ContextMenuLabel className="truncate text-xs font-bold text-slate-500 dark:text-slate-400">
          {activity.subject}
        </ContextMenuLabel>
        <ContextMenuSeparator />
        <ContextMenuItem data-testid="activity-calendar-open-detail" onSelect={() => onSelect(activity)} className="gap-2">
          <Eye size={15} className="text-primary" />
          {t('contextActions.viewDetails')}
        </ContextMenuItem>
        {canUpdate && (
          <ContextMenuItem data-testid="activity-calendar-edit" onSelect={() => onEdit(activity)} className="gap-2">
            <Pencil size={15} className="text-blue-500" />
            {t('contextActions.edit')}
          </ContextMenuItem>
        )}
        {hasCustomer && (canOpenCustomer || canOpenCustomer360) && <ContextMenuSeparator />}
        {hasCustomer && canOpenCustomer && (
          <ContextMenuItem data-testid="activity-calendar-customer-info" onSelect={() => onOpenCustomer(activity)} className="gap-2">
            <Building2 size={15} className="text-indigo-500" />
            {t('contextActions.customerInfo')}
          </ContextMenuItem>
        )}
        {hasCustomer && canOpenCustomer360 && (
          <ContextMenuItem data-testid="activity-calendar-customer-360" onSelect={() => onOpenCustomer360(activity)} className="gap-2">
            <ChartNoAxesCombined size={15} className="text-emerald-500" />
            {t('contextActions.customer360')}
          </ContextMenuItem>
        )}
        {canDelete && <ContextMenuSeparator />}
        {canDelete && (
          <ContextMenuItem data-testid="activity-calendar-delete" onSelect={() => onDelete(activity)} className="gap-2 text-rose-600 focus:text-rose-600">
            <Trash2 size={15} />
            {t('contextActions.delete')}
          </ContextMenuItem>
        )}
      </ContextMenuContent>
    </ContextMenu>
  );
}

interface CalendarDayContextMenuProps {
  day: Date;
  itemCount: number;
  locale: string;
  canCreate: boolean;
  createLabel: string;
  showActivitiesLabel: string;
  openActivitiesLabel: string;
  onCreate: () => void;
  onShowActivities: () => void;
  onOpenActivities: () => void;
  children: ReactElement;
}

function CalendarDayContextMenu({
  day,
  itemCount,
  locale,
  canCreate,
  createLabel,
  showActivitiesLabel,
  openActivitiesLabel,
  onCreate,
  onShowActivities,
  onOpenActivities,
  children,
}: CalendarDayContextMenuProps): ReactElement {
  const dateLabel = new Intl.DateTimeFormat(locale, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(day);

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      <ContextMenuContent className="w-64">
        <ContextMenuLabel className="truncate capitalize text-xs font-bold text-slate-500 dark:text-slate-400">
          {dateLabel}
        </ContextMenuLabel>
        <ContextMenuSeparator />
        {canCreate && (
          <ContextMenuItem data-testid="activity-calendar-create" onSelect={onCreate} className="gap-2">
            <Plus size={15} className="text-primary" />
            {createLabel}
          </ContextMenuItem>
        )}
        {itemCount > 0 && (
          <ContextMenuItem data-testid="activity-calendar-show-day" onSelect={onShowActivities} className="gap-2">
            <List size={15} className="text-blue-500" />
            {showActivitiesLabel}
          </ContextMenuItem>
        )}
        {(canCreate || itemCount > 0) && <ContextMenuSeparator />}
        <ContextMenuItem data-testid="activity-calendar-open-management" onSelect={onOpenActivities} className="gap-2">
          <ExternalLink size={15} className="text-slate-500" />
          {openActivitiesLabel}
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}

export function MyActivitiesCalendar(): ReactElement {
  const { t, i18n } = useTranslation(['dashboard', 'common']);
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const { canCreate, canUpdate, canDelete } = useCrudPermissions('activity.activity-management.view');
  const { canView: canViewCustomer } = useCrudPermissions('customers.customer-management.view');
  const { canView: canViewCustomer360 } = useCrudPermissions('customer360.overview.view');
  const {
    data: permissions,
    isLoading: permissionsLoading,
    isError: permissionsQueryFailed,
    error: permissionsQueryError,
    refetch: refetchPermissions,
  } = useMyPermissionsQuery();
  const isSystemAdmin = permissions?.isSystemAdmin === true;
  const permissionsReady = permissions !== null;
  const [view, setView] = useState<CalendarView>('week');
  const [cursor, setCursor] = useState(() => new Date());
  const [selected, setSelected] = useState<ActivityCalendarItemDto | null>(null);
  const [deleteItem, setDeleteItem] = useState<ActivityCalendarItemDto | null>(null);
  const [dayPopover, setDayPopover] = useState<{ day: Date; items: ActivityCalendarItemDto[] } | null>(null);
  const [detailTab, setDetailTab] = useState('details');
  const [selectedAssigneeId, setSelectedAssigneeId] = useState<number | 'all'>('all');
  const [assigneePickerOpen, setAssigneePickerOpen] = useState(false);
  const [assigneeFilterTerm, setAssigneeFilterTerm] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [createSelection, setCreateSelection] = useState<ActivityCreateSelection | null>(null);
  const createActivity = useCreateActivity();
  const deleteActivity = useDeleteActivity();
  const activityImagesQuery = useActivityImages(
    selected?.id,
    selected !== null && detailTab === 'activityImages',
  );
  const customerImagesQuery = useCustomerImagesQuery(
    selected?.potentialCustomerId ?? 0,
    selected !== null && detailTab === 'customerImages',
  );

  useEffect(() => {
    setDetailTab('details');
  }, [selected?.id]);

  const weekStartsOn = 1 as const;
  const visibleRange = useMemo(() => {
    if (view === 'week') {
      const start = startOfWeek(cursor, { weekStartsOn });
      return { start, end: addDays(endOfWeek(cursor, { weekStartsOn }), 1) };
    }
    const monthStart = startOfMonth(cursor);
    return {
      start: startOfWeek(monthStart, { weekStartsOn }),
      end: addDays(endOfWeek(endOfMonth(cursor), { weekStartsOn }), 1),
    };
  }, [cursor, view]);

  const queryStart = format(visibleRange.start, "yyyy-MM-dd'T'00:00:00");
  const queryEnd = format(visibleRange.end, "yyyy-MM-dd'T'00:00:00");
  const {
    data: calendarActivities = [],
    isLoading: calendarLoading,
    isFetching,
    isError: calendarQueryFailed,
    error: calendarQueryError,
    refetch,
  } = useDashboardActivitiesCalendar(queryStart, queryEnd, isSystemAdmin, permissionsReady);
  const isLoading = permissionsLoading || (!permissionsReady && !permissionsQueryFailed) || calendarLoading;
  const isError = permissionsQueryFailed || calendarQueryFailed;
  const error = permissionsQueryFailed ? permissionsQueryError : calendarQueryError;

  const assignees = useMemo(() => {
    const byId = new Map<number, { id: number; name: string; count: number }>();
    calendarActivities.forEach((activity) => {
      const current = byId.get(activity.assignedUserId);
      if (current) {
        current.count += 1;
      } else {
        byId.set(activity.assignedUserId, {
          id: activity.assignedUserId,
          name: assigneeName(activity),
          count: 1,
        });
      }
    });
    return [...byId.values()].sort((left, right) => left.name.localeCompare(right.name, i18n.language));
  }, [calendarActivities, i18n.language]);

  useEffect(() => {
    if (!isSystemAdmin || (selectedAssigneeId !== 'all' && !assignees.some((item) => item.id === selectedAssigneeId))) {
      setSelectedAssigneeId('all');
    }
  }, [assignees, isSystemAdmin, selectedAssigneeId]);

  const selectedAssigneeLabel = selectedAssigneeId === 'all'
    ? t('calendar.assignees.all')
    : assignees.find((item) => item.id === selectedAssigneeId)?.name ?? t('calendar.assignees.all');

  const assigneeOptions = useMemo(
    () => [{ id: 'all' as const, name: t('calendar.assignees.all'), count: calendarActivities.length }, ...assignees],
    [assignees, calendarActivities.length, t],
  );
  const visibleAssigneeOptions = useMemo(
    () => assigneeFilterTerm.trim()
      ? assigneeOptions.filter((assignee) => matchesSearchTerm(assigneeFilterTerm, [assignee.name]))
      : assigneeOptions,
    [assigneeOptions, assigneeFilterTerm],
  );
  const showAssigneeOnChips = isSystemAdmin && selectedAssigneeId === 'all';

  const activities = useMemo(
    () => isSystemAdmin && selectedAssigneeId !== 'all'
      ? calendarActivities.filter((activity) => activity.assignedUserId === selectedAssigneeId)
      : calendarActivities,
    [calendarActivities, isSystemAdmin, selectedAssigneeId],
  );

  const days = useMemo(
    () => eachDayOfInterval({ start: visibleRange.start, end: addDays(visibleRange.end, -1) }),
    [visibleRange],
  );
  const activitiesByDay = useMemo(() => {
    const map = new Map<string, ActivityCalendarItemDto[]>();
    days.forEach((day) => {
      map.set(day.toISOString(), activities.filter((activity) => occursOnCalendarDay(activity, day)));
    });
    return map;
  }, [days, activities]);
  const locale = i18n.language || 'tr-TR';
  const title = new Intl.DateTimeFormat(locale, view === 'week'
    ? { day: 'numeric', month: 'long', year: 'numeric' }
    : { month: 'long', year: 'numeric' }).format(cursor);
  const scheduled = activities.filter((item) => numericValue(item.status) === ActivityStatus.Scheduled).length;
  const completed = activities.filter((item) => numericValue(item.status) === ActivityStatus.Completed).length;
  const overdue = activities.filter((item) => numericValue(item.status) === ActivityStatus.Scheduled
    && isBefore(new Date(item.endDateTime || item.startDateTime), new Date())).length;
  const summaryCards: Array<{
    label: string;
    value: number;
    icon: LucideIcon;
    tone: string;
  }> = [
    { label: t('calendar.summary.total'), value: activities.length, icon: CalendarDays, tone: 'blue' },
    { label: t('calendar.summary.scheduled'), value: scheduled, icon: Clock3, tone: 'amber' },
    { label: t('calendar.summary.completed'), value: completed, icon: CheckCircle2, tone: 'emerald' },
    { label: t('calendar.summary.overdue'), value: overdue, icon: CircleAlert, tone: 'rose' },
  ];
  const summaryToneClasses: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-300',
    amber: 'bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300',
    emerald: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-300',
    rose: 'bg-rose-50 text-rose-600 dark:bg-rose-500/15 dark:text-rose-300',
  };
  const viewIcons: Record<CalendarView, LucideIcon> = { month: LayoutGrid, week: CalendarRange, agenda: List };

  const openCreateActivity = (day?: Date): void => {
    if (!canCreate) return;
    setCreateSelection({
      date: day ? format(day, 'yyyy-MM-dd') : null,
      assignedUserId: selectedAssigneeId === 'all' ? user?.id ?? null : selectedAssigneeId,
    });
    setFormOpen(true);
  };

  const handleFormOpenChange = (open: boolean): void => {
    setFormOpen(open);
    if (!open) setCreateSelection(null);
  };
  const handleCreateActivity = async (
    data: ActivityFormSchema,
    pendingImages?: { file: File; description: string }[],
  ): Promise<void> => {
    const createdActivity = await createActivity.mutateAsync(
      buildCreateActivityPayload(data, { assignedUserIdFallback: user?.id }),
    );
    if (createdActivity && pendingImages && pendingImages.length > 0) {
      await activityImageApi.upload(createdActivity.id, {
        files: pendingImages.map((image) => image.file),
        resimAciklamalar: pendingImages.some((image) => image.description) ? pendingImages.map((image) => image.description) : undefined,
      });
    }
    setFormOpen(false);
    setCreateSelection(null);
    void refetch();
  };

  const move = (direction: -1 | 1) => {
    setCursor((current) => view === 'week'
      ? (direction < 0 ? subWeeks(current, 1) : addWeeks(current, 1))
      : (direction < 0 ? subMonths(current, 1) : addMonths(current, 1)));
  };

  const openActivityEditor = (activity: ActivityCalendarItemDto): void => {
    navigate(`/activity-management?activityId=${activity.id}`);
  };

  const openCustomer = (activity: ActivityCalendarItemDto): void => {
    if (!activity.potentialCustomerId) return;
    navigate(`/customer-management?customerId=${activity.potentialCustomerId}`);
  };

  const openCustomer360 = (activity: ActivityCalendarItemDto): void => {
    if (!activity.potentialCustomerId) return;
    navigate(`/customer-360/${activity.potentialCustomerId}`);
  };

  const requestDelete = (activity: ActivityCalendarItemDto): void => {
    setSelected(null);
    setDayPopover(null);
    setDeleteItem(activity);
  };

  const confirmDelete = async (): Promise<void> => {
    if (!deleteItem) return;
    await deleteActivity.mutateAsync(deleteItem.id);
    setDeleteItem(null);
    await refetch();
  };

  const renderActivityChip = (
    activity: ActivityCalendarItemDto,
    options?: { compact?: boolean; onSelect?: (selectedActivity: ActivityCalendarItemDto) => void },
  ): ReactElement => (
    <ActivityChip
      key={activity.id}
      activity={activity}
      compact={options?.compact}
      showAssignee={showAssigneeOnChips}
      canUpdate={canUpdate}
      canDelete={canDelete}
      canOpenCustomer={canViewCustomer}
      canOpenCustomer360={canViewCustomer360}
      onSelect={options?.onSelect ?? setSelected}
      onEdit={openActivityEditor}
      onDelete={requestDelete}
      onOpenCustomer={openCustomer}
      onOpenCustomer360={openCustomer360}
    />
  );

  return (
    <section
      data-testid="activity-calendar-context-boundary"
      onContextMenu={(event) => event.preventDefault()}
      className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-[#130d1b]"
    >
      <div className="relative overflow-hidden border-b border-slate-200 px-4 py-3 dark:border-white/10 md:px-5">
        <div className="pointer-events-none absolute -right-16 -top-24 h-52 w-52 rounded-full bg-[image:var(--crm-brand-gradient)] opacity-[0.07] blur-2xl" aria-hidden />
        <div className="relative flex flex-wrap items-center gap-x-3 gap-y-2">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[image:var(--crm-brand-gradient)] text-white shadow-sm shadow-primary/25">
              <CalendarDays size={18} />
            </div>
            <h2
              className="flex items-center gap-1.5 whitespace-nowrap text-base font-black text-slate-900 dark:text-white"
              title={t(isSystemAdmin ? 'calendar.descriptionAdmin' : 'calendar.description')}
            >
              {t('calendar.title')}
              <Sparkles size={13} className="text-amber-400" />
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {summaryCards.map(({ label, value, icon: Icon, tone }) => (
              <span
                key={label}
                title={label}
                className={cn('flex items-center gap-1.5 rounded-lg px-2 py-1', summaryToneClasses[tone])}
              >
                <Icon size={13} className="shrink-0" />
                <span className="text-sm font-black leading-none tabular-nums">{value}</span>
                <span className="hidden whitespace-nowrap text-[11px] font-bold leading-none lg:inline">{label}</span>
              </span>
            ))}
          </div>

          <div className="ms-auto flex items-center gap-2">
            <div className="flex rounded-lg border border-slate-200 bg-slate-50 p-0.5 dark:border-white/10 dark:bg-white/5">
              {(['month', 'week', 'agenda'] as const).map((item) => {
                const ViewIcon = viewIcons[item];
                return (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setView(item)}
                    title={t(`calendar.views.${item}`)}
                    className={cn('flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-bold transition', view === item ? 'bg-[image:var(--crm-brand-gradient)] text-white shadow-sm shadow-primary/20' : 'text-slate-600 hover:bg-white dark:text-slate-300 dark:hover:bg-white/10')}
                  >
                    <ViewIcon size={14} />
                    <span className="hidden sm:inline">{t(`calendar.views.${item}`)}</span>
                  </button>
                );
              })}
            </div>
            {canCreate && (
              <Button size="sm" className="h-8 bg-[image:var(--crm-brand-gradient)] px-3 text-white shadow-sm shadow-primary/20 transition-all hover:scale-[1.02] hover:shadow-md hover:shadow-primary/30" onClick={() => openCreateActivity()}>
                <Plus size={15} className="sm:mr-1.5" />
                <span className="hidden sm:inline">{t('calendar.newActivity')}</span>
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-2 gap-y-2 border-b border-slate-200 bg-slate-50/60 px-4 py-2 dark:border-white/10 dark:bg-white/[0.02] md:px-5">
        <Button variant="outline" size="icon" className="h-8 w-8 rounded-lg" onClick={() => move(-1)} aria-label={t('calendar.previous')}><ChevronLeft size={16} /></Button>
        <Button variant="outline" size="sm" className="h-8 rounded-lg px-2.5 text-xs font-bold" onClick={() => setCursor(new Date())}>{t('calendar.today')}</Button>
        <Button variant="outline" size="icon" className="h-8 w-8 rounded-lg" onClick={() => move(1)} aria-label={t('calendar.next')}><ChevronRight size={16} /></Button>
        <h3 className="ml-1 whitespace-nowrap capitalize text-sm font-black text-slate-900 dark:text-white md:text-base">{title}</h3>

        {isSystemAdmin && (
          <Popover
            open={assigneePickerOpen}
            onOpenChange={(open) => {
              setAssigneePickerOpen(open);
              if (!open) setAssigneeFilterTerm('');
            }}
          >
            <PopoverTrigger asChild>
              <button
                type="button"
                className={cn(
                  'flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-bold transition',
                  selectedAssigneeId === 'all'
                    ? 'border-slate-200 bg-white text-slate-700 hover:border-primary/40 dark:border-white/10 dark:bg-white/5 dark:text-slate-200'
                    : 'border-primary bg-primary/10 text-primary',
                )}
                title={t('calendar.assignees.description')}
              >
                <Users size={14} className="shrink-0" />
                <span className="max-w-32 truncate">{selectedAssigneeLabel}</span>
                <span className="rounded-full bg-slate-100 px-1.5 text-[10px] font-black tabular-nums text-slate-600 dark:bg-white/10 dark:text-slate-300">
                  {activities.length}
                </span>
                <ChevronDown size={13} className={cn('shrink-0 transition-transform', assigneePickerOpen && 'rotate-180')} />
              </button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-64 overflow-hidden rounded-xl p-0">
              <div className="border-b border-slate-100 px-3 py-2 dark:border-white/5">
                <p className="text-xs font-black text-slate-900 dark:text-white">{t('calendar.assignees.title')}</p>
              </div>
              <div className="border-b border-slate-100 px-2.5 py-2 dark:border-white/5">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" aria-hidden />
                  <input
                    type="text"
                    value={assigneeFilterTerm}
                    onChange={(event) => setAssigneeFilterTerm(event.target.value)}
                    placeholder={t('calendar.assignees.searchPlaceholder')}
                    className="h-8 w-full rounded-lg border border-slate-200 bg-white pl-8 pr-2.5 text-xs text-slate-700 outline-none transition-colors placeholder:text-slate-400 focus:border-primary/60 focus:ring-2 focus:ring-primary/10 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:placeholder:text-slate-500"
                  />
                </div>
              </div>
              <div className="max-h-72 overflow-y-auto p-1.5">
                {visibleAssigneeOptions.length === 0 && (
                  <p className="px-2 py-3 text-center text-xs font-medium text-slate-400 dark:text-slate-500">{t('calendar.assignees.noMatch')}</p>
                )}
                {visibleAssigneeOptions.map((assignee) => {
                  const isActive = selectedAssigneeId === assignee.id;
                  return (
                    <button
                      key={assignee.id}
                      type="button"
                      onClick={() => {
                        setSelectedAssigneeId(assignee.id);
                        setAssigneePickerOpen(false);
                      }}
                      className={cn(
                        'flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left transition',
                        isActive ? 'bg-primary/10 text-primary' : 'text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-white/5',
                      )}
                    >
                      <span className={cn(
                        'flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[9px] font-black uppercase',
                        assignee.id === 'all'
                          ? 'bg-[image:var(--crm-brand-gradient)] text-white'
                          : 'bg-slate-200 text-slate-700 dark:bg-white/10 dark:text-slate-200',
                      )}>
                        {assignee.id === 'all'
                          ? t('calendar.assignees.allShort')
                          : assignee.name.split(/\s+/).slice(0, 2).map((part) => part.charAt(0)).join('') || '#'}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-xs font-bold">{assignee.name}</span>
                      <span className="shrink-0 rounded-full bg-slate-100 px-1.5 text-[10px] font-black tabular-nums text-slate-600 dark:bg-white/10 dark:text-slate-300">
                        {assignee.count}
                      </span>
                      {isActive ? <Check size={13} className="shrink-0" /> : null}
                    </button>
                  );
                })}
              </div>
            </PopoverContent>
          </Popover>
        )}

        <Button variant="ghost" size="sm" className="ms-auto h-8 px-2.5 text-xs" disabled={isFetching} onClick={() => void refetch()}>
          <RotateCw size={14} className={cn('sm:mr-1.5', isFetching && 'animate-spin')} />
          <span className="hidden sm:inline">{t('refresh')}</span>
        </Button>
      </div>

      {isLoading ? (
        <div className="flex min-h-96 items-center justify-center gap-2 text-slate-500"><Loader2 className="animate-spin" />{t('loading')}</div>
      ) : isError ? (
        <div className="flex min-h-80 flex-col items-center justify-center gap-3 p-6 text-center">
          <CircleAlert className="text-rose-500" size={32} />
          <p className="font-semibold text-slate-700 dark:text-slate-200">{t('calendar.loadError')}</p>
          {error instanceof Error && error.message ? (
            <p className="max-w-2xl text-xs font-semibold text-slate-500 dark:text-slate-400">{error.message}</p>
          ) : null}
          <Button onClick={() => void (permissionsQueryFailed ? refetchPermissions() : refetch())}>{t('refresh')}</Button>
        </div>
      ) : view === 'agenda' ? (
        <div className="h-[calc(100vh-410px)] min-h-[380px] overflow-y-auto p-4 md:p-5">
          {days.map((day) => {
            const items = activitiesByDay.get(day.toISOString()) ?? [];
            if (items.length === 0) return null;
            return (
              <CalendarDayContextMenu
                key={day.toISOString()}
                day={day}
                itemCount={items.length}
                locale={locale}
                canCreate={canCreate}
                createLabel={t('calendar.newActivity')}
                showActivitiesLabel={t('calendar.showDayActivities', { count: items.length })}
                openActivitiesLabel={t('calendar.openActivities')}
                onCreate={() => openCreateActivity(day)}
                onShowActivities={() => setDayPopover({ day, items })}
                onOpenActivities={() => navigate('/activity-management')}
              >
                <div
                  data-testid="activity-calendar-agenda-day"
                  data-calendar-date={format(day, 'yyyy-MM-dd')}
                  className="mb-5 grid gap-3 md:grid-cols-[180px_1fr]"
                >
                  <div className="flex items-center gap-2 md:flex-col md:items-start md:gap-1">
                    <div className="font-black text-slate-900 dark:text-white">{new Intl.DateTimeFormat(locale, { weekday: 'long', day: 'numeric', month: 'long' }).format(day)}</div>
                    {isToday(day) && <span className="rounded-full bg-[image:var(--crm-brand-gradient)] px-2 py-0.5 text-[10px] font-black text-white">{t('calendar.today')}</span>}
                  </div>
                  <div className="space-y-2 border-l-2 border-dashed border-slate-200 pl-3 dark:border-white/10 md:pl-4">
                    {items.map((activity) => renderActivityChip(activity))}
                  </div>
                </div>
              </CalendarDayContextMenu>
            );
          })}
          {activities.length === 0 && <EmptyCalendar label={t('calendar.empty')} />}
        </div>
      ) : (
        <div className={cn(
          'overflow-x-auto overflow-y-clip',
          view === 'week' && 'h-[calc(100vh-410px)] min-h-[380px]',
        )}>
          <div
            className={cn('min-w-[900px] grid grid-cols-7', view === 'week' ? 'h-full' : 'h-auto')}
            style={{
              gridTemplateRows: view === 'month'
                ? `auto repeat(${Math.max(1, days.length / 7)}, 104px)`
                : 'auto minmax(320px, 1fr)',
            }}
          >
            {days.slice(0, 7).map((day) => (
              <div key={`header-${day.getDay()}`} className={cn('border-b border-r border-slate-200 bg-slate-50 px-2 py-2.5 text-center text-[11px] font-black uppercase tracking-wider text-slate-500 last:border-r-0 dark:border-white/10 dark:bg-white/5', (day.getDay() === 0 || day.getDay() === 6) && 'text-[var(--crm-brand-text)]')}>
                {new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(day)}
              </div>
            ))}
            {days.map((day) => {
              const items = activitiesByDay.get(day.toISOString()) ?? [];
              const isWeekend = day.getDay() === 0 || day.getDay() === 6;
              const visibleLimit = view === 'month'
                ? MONTH_CALENDAR_DAY_PREVIEW_LIMIT
                : WEEK_CALENDAR_DAY_PREVIEW_LIMIT;
              const openDayPopover = (): void => {
                if (items.length === 0) return;
                setDayPopover({ day, items });
              };
              return (
                <CalendarDayContextMenu
                  key={day.toISOString()}
                  day={day}
                  itemCount={items.length}
                  locale={locale}
                  canCreate={canCreate}
                  createLabel={t('calendar.newActivity')}
                  showActivitiesLabel={t('calendar.showDayActivities', { count: items.length })}
                  openActivitiesLabel={t('calendar.openActivities')}
                  onCreate={() => openCreateActivity(day)}
                  onShowActivities={openDayPopover}
                  onOpenActivities={() => navigate('/activity-management')}
                >
                  <div
                    data-testid="activity-calendar-day"
                    data-calendar-date={format(day, 'yyyy-MM-dd')}
                    data-activity-count={items.length}
                    className={cn(
                      'flex min-h-0 flex-col overflow-clip border-b border-r border-slate-200 last:border-r-0 dark:border-white/10',
                      view === 'month' ? 'p-1.5' : 'p-2',
                      !isSameMonth(day, cursor) && view === 'month' && 'bg-slate-50/70 dark:bg-white/[0.02]',
                      isWeekend && (isSameMonth(day, cursor) || view === 'week') && 'bg-slate-50/40 dark:bg-white/[0.015]',
                    )}
                  >
                    <div className={cn('flex items-center justify-between', view === 'month' ? 'mb-1' : 'mb-2')}>
                      <span className={cn(
                        'flex items-center justify-center rounded-full font-black transition',
                        view === 'month' ? 'h-5 w-5 text-[10px]' : 'h-7 w-7 text-xs',
                        isToday(day) ? 'bg-[image:var(--crm-brand-gradient)] text-white shadow-sm shadow-primary/30' : isSameMonth(day, cursor) || view === 'week' ? 'text-slate-800 dark:text-slate-100' : 'text-slate-400',
                      )}>
                        {format(day, 'd')}
                      </span>
                      {items.length > 0 && <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-black text-slate-500 dark:bg-white/10 dark:text-slate-400">{items.length}</span>}
                    </div>
                    <div className={cn('min-h-0 overflow-clip', view === 'month' ? 'space-y-1' : 'space-y-1.5')}>
                      {items.slice(0, visibleLimit).map((activity) => renderActivityChip(activity, { compact: view === 'month' }))}
                      {items.length > visibleLimit && (
                        <button
                          type="button"
                          data-testid="activity-calendar-more"
                          title={t('calendar.more')}
                          className="block h-5 w-full rounded-md px-1 py-0.5 text-left text-[10px] font-bold leading-none text-primary hover:bg-primary/5 hover:underline"
                          onClick={openDayPopover}
                        >
                          +{items.length - visibleLimit} {t('calendar.more')}
                        </button>
                      )}
                    </div>
                  </div>
                </CalendarDayContextMenu>
              );
            })}
          </div>
        </div>
      )}

      <Dialog open={selected !== null} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle className="pr-8 text-xl">{selected.subject}</DialogTitle>
                <DialogDescription>{selected.activityTypeName || t('calendar.activity')}</DialogDescription>
              </DialogHeader>

              <Tabs value={detailTab} onValueChange={setDetailTab} className="min-w-0">
                <TabsList className="grid h-auto w-full grid-cols-2 gap-1 sm:grid-cols-3">
                  <TabsTrigger value="details">{t('calendar.media.tabs.details')}</TabsTrigger>
                  <TabsTrigger value="activityImages">{t('calendar.media.tabs.activityImages')}</TabsTrigger>
                  {selected.potentialCustomerId && selected.potentialCustomerId > 0 && (
                    <TabsTrigger value="customerImages">{t('calendar.media.tabs.customerImages')}</TabsTrigger>
                  )}
                </TabsList>

                <TabsContent value="details" className="mt-4 space-y-3">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Detail icon={Clock3} label={t('calendar.detail.date')} value={formatActivityRange(selected, locale)} />
                    <Detail icon={CheckCircle2} label={t('calendar.detail.status')} value={statusLabel(selected, t)} />
                    <Detail icon={UserRound} label={t('calendar.detail.assignee')} value={assigneeName(selected)} />
                    {customerName(selected) && <Detail icon={UserRound} label={t('calendar.detail.customer')} value={customerName(selected)!} />}
                    {selected.erpCustomerCode && <Detail icon={MapPin} label={t('calendar.detail.customerCode')} value={selected.erpCustomerCode} />}
                  </div>
                  {selected.description && (
                    <div className="rounded-xl bg-slate-50 p-4 text-sm leading-6 text-slate-700 dark:bg-white/5 dark:text-slate-200">
                      <div className="mb-1 text-[10px] font-black uppercase tracking-wider text-slate-400">{t('calendar.detail.description')}</div>
                      {selected.description}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="activityImages" className="mt-4">
                  <DashboardImageGallery
                    items={(activityImagesQuery.data ?? []).map((image) => ({
                      id: image.id,
                      src: getImageUrl(image.resimUrl),
                      description: image.resimAciklama,
                    }))}
                    isLoading={activityImagesQuery.isLoading || (activityImagesQuery.isFetching && (activityImagesQuery.data?.length ?? 0) === 0)}
                    isRefreshing={activityImagesQuery.isFetching && (activityImagesQuery.data?.length ?? 0) > 0}
                    isError={activityImagesQuery.isError}
                    onRetry={() => void activityImagesQuery.refetch()}
                    retryLabel={t('retry', { ns: 'common' })}
                    emptyText={t('calendar.media.emptyActivityImages')}
                    errorText={t('calendar.media.loadError')}
                    openLabel={t('calendar.media.openImage')}
                  />
                </TabsContent>

                {selected.potentialCustomerId && selected.potentialCustomerId > 0 && (
                  <TabsContent value="customerImages" className="mt-4">
                    <DashboardImageGallery
                      items={(customerImagesQuery.data ?? []).map((image) => ({
                        id: image.id,
                        src: getImageUrl(image.imageUrl),
                        description: image.imageDescription ?? undefined,
                      }))}
                      isLoading={customerImagesQuery.isLoading || (customerImagesQuery.isFetching && (customerImagesQuery.data?.length ?? 0) === 0)}
                      isRefreshing={customerImagesQuery.isFetching && (customerImagesQuery.data?.length ?? 0) > 0}
                      isError={customerImagesQuery.isError}
                      onRetry={() => void customerImagesQuery.refetch()}
                      retryLabel={t('retry', { ns: 'common' })}
                      emptyText={t('calendar.media.emptyCustomerImages')}
                      errorText={t('calendar.media.loadError')}
                      openLabel={t('calendar.media.openImage')}
                    />
                  </TabsContent>
                )}
              </Tabs>

              <div className="flex justify-end">
                <Button onClick={() => navigate('/activity-management')}>{t('calendar.openActivities')}</Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={deleteItem !== null} onOpenChange={(open) => !deleteActivity.isPending && !open && setDeleteItem(null)}>
        <DialogContent data-testid="activity-calendar-delete-dialog" className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('contextActions.deleteActivityTitle')}</DialogTitle>
            <DialogDescription>
              {t('contextActions.deleteActivityDescription', { subject: deleteItem?.subject ?? '' })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" disabled={deleteActivity.isPending} onClick={() => setDeleteItem(null)}>
              {t('cancel', { ns: 'common' })}
            </Button>
            <Button type="button" variant="destructive" disabled={deleteActivity.isPending} onClick={() => void confirmDelete()}>
              {deleteActivity.isPending ? t('deleting', { ns: 'common' }) : t('contextActions.delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ActivityForm
        open={formOpen}
        onOpenChange={handleFormOpenChange}
        onSubmit={handleCreateActivity}
        isLoading={createActivity.isPending}
        initialDate={createSelection?.date}
        initialAssignedUserId={createSelection?.assignedUserId}
      />

      <Dialog open={dayPopover !== null} onOpenChange={(open) => !open && setDayPopover(null)}>
        <DialogContent data-testid="activity-calendar-day-dialog" className="max-h-[80vh] overflow-hidden p-0 sm:max-w-md">
          {dayPopover && (
            <>
              <DialogHeader className="border-b border-slate-200 p-4 text-left dark:border-white/10">
                <DialogTitle className="capitalize">
                  {new Intl.DateTimeFormat(locale, { weekday: 'long', day: 'numeric', month: 'long' }).format(dayPopover.day)}
                </DialogTitle>
                <DialogDescription>{t('calendar.title')} · {dayPopover.items.length}</DialogDescription>
              </DialogHeader>
              <div className="max-h-[60vh] space-y-1.5 overflow-y-auto p-3">
                {dayPopover.items.map((activity) => renderActivityChip(activity, {
                  onSelect: (picked) => {
                    setSelected(picked);
                    setDayPopover(null);
                  },
                }))}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}

function formatActivityRange(activity: ActivityCalendarItemDto, locale: string): string {
  const formatter = new Intl.DateTimeFormat(locale, activity.isAllDay ? { dateStyle: 'long' } : { dateStyle: 'medium', timeStyle: 'short' });
  const start = formatter.format(new Date(activity.startDateTime));
  if (!activity.endDateTime || activity.isAllDay) return start;
  return `${start} – ${new Intl.DateTimeFormat(locale, { timeStyle: 'short' }).format(new Date(activity.endDateTime))}`;
}

function EmptyCalendar({ label }: { label: string }): ReactElement {
  return (
    <div className="flex min-h-64 flex-col items-center justify-center gap-3 text-slate-400">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 dark:bg-white/5">
        <List size={26} />
      </div>
      <span className="font-semibold">{label}</span>
    </div>
  );
}

function Detail({ icon: Icon, label, value }: { icon: typeof Clock3; label: string; value: string }): ReactElement {
  return <div className="flex items-start gap-3 rounded-xl border border-slate-200 p-3 dark:border-white/10"><Icon size={17} className="mt-0.5 shrink-0 text-primary" /><div><div className="text-[10px] font-black uppercase tracking-wider text-slate-400">{label}</div><div className="mt-0.5 text-sm font-bold text-slate-800 dark:text-slate-100">{value}</div></div></div>;
}

interface DashboardImageGalleryProps {
  items: Array<{ id: number; src: string | null; description?: string }>;
  isLoading: boolean;
  isRefreshing: boolean;
  isError: boolean;
  onRetry: () => void;
  retryLabel: string;
  emptyText: string;
  errorText: string;
  openLabel: string;
}

function DashboardImageGallery({ items, isLoading, isRefreshing, isError, onRetry, retryLabel, emptyText, errorText, openLabel }: DashboardImageGalleryProps): ReactElement {
  if (isLoading) {
    return <div className="flex min-h-48 items-center justify-center"><Loader2 className="animate-spin text-primary" size={24} /></div>;
  }

  if (isError) {
    return (
      <div className="flex min-h-48 flex-col items-center justify-center gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-center text-sm font-semibold text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300">
        <span>{errorText}</span>
        <Button type="button" size="sm" variant="outline" onClick={onRetry}>
          <RotateCw className="mr-2 h-4 w-4" />
          {retryLabel}
        </Button>
      </div>
    );
  }

  const visibleItems = items.filter((item) => Boolean(item.src));
  if (visibleItems.length === 0) {
    return (
      <div className="flex min-h-48 flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-slate-200 text-center text-sm text-slate-500 dark:border-white/10 dark:text-slate-400">
        <Images size={28} className="text-slate-300 dark:text-slate-600" />
        <span>{emptyText}</span>
      </div>
    );
  }

  return (
    <div className="relative grid grid-cols-2 gap-3 sm:grid-cols-3">
      {isRefreshing ? (
        <div className="absolute right-2 top-2 z-20 flex h-8 w-8 items-center justify-center rounded-full bg-white/90 shadow-sm dark:bg-zinc-900/90" aria-label={retryLabel}>
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
        </div>
      ) : null}
      {visibleItems.map((item) => (
        <a
          key={item.id}
          href={item.src ?? undefined}
          target="_blank"
          rel="noreferrer"
          className="group overflow-hidden rounded-xl border border-slate-200 bg-slate-50 transition hover:-translate-y-0.5 hover:shadow-md dark:border-white/10 dark:bg-white/5"
          aria-label={openLabel}
        >
          <div className="aspect-square overflow-hidden bg-slate-100 dark:bg-white/5">
            <ImageWithLoading
              src={item.src}
              alt={item.description || openLabel}
              loading="lazy"
              containerClassName="h-full w-full"
              className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
            />
          </div>
          <div className="flex items-center justify-between gap-2 px-3 py-2">
            <span className="truncate text-xs font-semibold text-slate-600 dark:text-slate-300">{item.description || openLabel}</span>
            <ExternalLink size={13} className="shrink-0 text-primary" />
          </div>
        </a>
      ))}
    </div>
  );
}

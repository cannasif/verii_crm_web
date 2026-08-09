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
  startOfDay,
  startOfMonth,
  startOfWeek,
  subMonths,
  subWeeks,
} from 'date-fns';
import {
  CalendarDays,
  CalendarRange,
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
  List,
  Loader2,
  MapPin,
  MousePointerClick,
  Plus,
  RotateCw,
  Search,
  Sparkles,
  Tag,
  UserRound,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth-store';
import { useDashboardActivitiesCalendar } from '@/features/activity-management/hooks/useMyActivitiesCalendar';
import { useCreateActivity } from '@/features/activity-management/hooks/useCreateActivity';
import { useMyPermissionsQuery } from '@/features/access-control/hooks/useMyPermissionsQuery';
import { buildCreateActivityPayload } from '@/features/activity-management/utils/build-create-payload';
import { ActivityForm } from '@/features/activity-management/components/ActivityForm';
import { activityImageApi } from '@/features/activity-image-management/api/activity-image-api';
import { useActivityImages } from '@/features/activity-image-management/hooks/useActivityImages';
import { useCustomerImagesQuery } from '@/features/customer-360/hooks/useCustomer360';
import { getImageUrl } from '@/lib/image-url';
import { matchesSearchTerm } from '@/lib/search';
import {
  ActivityPriority,
  ActivityStatus,
  type ActivityDto,
  type ActivityFormSchema,
} from '@/features/activity-management/types/activity-types';

type CalendarView = 'month' | 'week' | 'agenda';

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

function customerName(activity: ActivityDto): string | undefined {
  return activity.potentialCustomerName
    || activity.potentialCustomer?.name
    || activity.contact?.fullName
    || [activity.contact?.firstName, activity.contact?.lastName].filter(Boolean).join(' ')
    || undefined;
}

function assigneeName(activity: ActivityDto): string {
  return activity.assignedUser?.fullName?.trim()
    || activity.assignedUser?.username
    || activity.assignedUser?.userName
    || `#${activity.assignedUserId}`;
}

function occursOnDay(activity: ActivityDto, day: Date): boolean {
  const dayStart = startOfDay(day);
  const nextDay = addDays(dayStart, 1);
  const activityStart = new Date(activity.startDateTime);
  const activityEnd = new Date(activity.endDateTime || activity.startDateTime);
  return activityStart < nextDay && activityEnd >= dayStart;
}

function eventTone(activity: ActivityDto): string {
  const status = numericValue(activity.status);
  if (status === ActivityStatus.Completed) return 'border-l-emerald-400 bg-emerald-50/80 text-emerald-800 dark:border-l-emerald-400/60 dark:bg-emerald-500/10 dark:text-emerald-200';
  if (status === ActivityStatus.Cancelled) return 'border-l-slate-300 bg-slate-100/80 text-slate-500 line-through dark:border-l-white/15 dark:bg-white/5 dark:text-slate-400';
  if (isBefore(new Date(activity.endDateTime || activity.startDateTime), new Date())) return 'border-l-rose-400 bg-rose-50/80 text-rose-800 dark:border-l-rose-400/60 dark:bg-rose-500/10 dark:text-rose-200';
  if (numericValue(activity.priority) === ActivityPriority.High) return 'border-l-amber-400 bg-amber-50/80 text-amber-900 dark:border-l-amber-400/60 dark:bg-amber-500/10 dark:text-amber-200';
  return 'border-l-blue-400 bg-blue-50/80 text-blue-800 dark:border-l-blue-400/60 dark:bg-blue-500/10 dark:text-blue-200';
}

type EventStatusKind = 'completed' | 'cancelled' | 'overdue' | 'high' | 'scheduled';

function eventStatusKind(activity: ActivityDto): EventStatusKind {
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

function statusLabel(activity: ActivityDto, t: (key: string) => string): string {
  const kind = eventStatusKind(activity);
  if (kind === 'completed') return t('calendar.status.completed');
  if (kind === 'cancelled') return t('calendar.status.cancelled');
  if (kind === 'overdue') return t('calendar.status.overdue');
  return t('calendar.status.scheduled');
}

interface ActivityChipProps {
  activity: ActivityDto;
  compact?: boolean;
  /** Only shown when the calendar is not already filtered down to a single assignee. */
  showAssignee?: boolean;
  onSelect: (activity: ActivityDto) => void;
}

function ActivityChip({ activity, compact = false, showAssignee = false, onSelect }: ActivityChipProps): ReactElement {
  const { t, i18n } = useTranslation('dashboard');
  const locale = i18n.language || 'tr-TR';
  const time = activity.isAllDay ? '' : format(new Date(activity.startDateTime), 'HH:mm');
  const customer = customerName(activity);
  const statusKind = eventStatusKind(activity);

  return (
    <HoverCard openDelay={250} closeDelay={80}>
      <HoverCardTrigger asChild>
        <button
          type="button"
          onClick={() => onSelect(activity)}
          className={cn(
            'w-full rounded-md border-l-4 text-left shadow-xs transition hover:-translate-y-px hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
            compact ? 'px-2 py-1' : 'px-2.5 py-1.5',
            eventTone(activity),
          )}
        >
          <span className="flex min-w-0 items-center gap-1.5">
            {time && <span className="shrink-0 text-[10px] font-black tabular-nums opacity-70">{time}</span>}
            <span className="truncate text-[11px] font-bold">{activity.subject}</span>
          </span>
          {showAssignee && !compact && (
            <span className="mt-0.5 flex min-w-0 items-center gap-1 text-[10px] opacity-70">
              <UserRound size={9} className="shrink-0" />
              <span className="truncate font-semibold">{assigneeName(activity)}</span>
            </span>
          )}
        </button>
      </HoverCardTrigger>
      <HoverCardContent side="right" align="start">
        <div className="flex items-start gap-2.5 border-b border-slate-100 p-3.5 dark:border-white/5">
          <span className={cn('mt-1.5 h-2 w-2 shrink-0 rounded-full', STATUS_DOT_CLASSES[statusKind])} aria-hidden />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-black leading-snug text-slate-900 dark:text-white">{activity.subject}</p>
            {activity.activityType?.name && (
              <p className="mt-0.5 flex items-center gap-1 text-[11px] font-medium text-slate-400 dark:text-slate-500">
                <Tag size={11} />{activity.activityType.name}
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
  );
}

export function MyActivitiesCalendar(): ReactElement {
  const { t, i18n } = useTranslation('dashboard');
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const {
    data: permissions,
    isLoading: permissionsLoading,
    isError: permissionsError,
  } = useMyPermissionsQuery();
  const isSystemAdmin = permissions?.isSystemAdmin === true;
  const permissionsReady = permissions !== null || permissionsError;
  const [view, setView] = useState<CalendarView>('week');
  const [cursor, setCursor] = useState(() => new Date());
  const [selected, setSelected] = useState<ActivityDto | null>(null);
  const [detailTab, setDetailTab] = useState('details');
  const [selectedAssigneeId, setSelectedAssigneeId] = useState<number | 'all'>('all');
  const [assigneePickerOpen, setAssigneePickerOpen] = useState(false);
  const [assigneeFilterTerm, setAssigneeFilterTerm] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const createActivity = useCreateActivity();
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
    isError,
    refetch,
  } = useDashboardActivitiesCalendar(queryStart, queryEnd, isSystemAdmin, permissionsReady);
  const isLoading = permissionsLoading || !permissionsReady || calendarLoading;

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
    const map = new Map<string, ActivityDto[]>();
    days.forEach((day) => {
      map.set(day.toISOString(), activities.filter((activity) => occursOnDay(activity, day)));
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
    void refetch();
  };

  const move = (direction: -1 | 1) => {
    setCursor((current) => view === 'week'
      ? (direction < 0 ? subWeeks(current, 1) : addWeeks(current, 1))
      : (direction < 0 ? subMonths(current, 1) : addMonths(current, 1)));
  };

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-[#130d1b]">
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
            <Button size="sm" className="h-8 bg-[image:var(--crm-brand-gradient)] px-3 text-white shadow-sm shadow-primary/20 transition-all hover:scale-[1.02] hover:shadow-md hover:shadow-primary/30" onClick={() => setFormOpen(true)}>
              <Plus size={15} className="sm:mr-1.5" />
              <span className="hidden sm:inline">{t('calendar.newActivity')}</span>
            </Button>
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
        <div className="flex min-h-80 flex-col items-center justify-center gap-3 p-6 text-center"><CircleAlert className="text-rose-500" size={32} /><p className="font-semibold text-slate-700 dark:text-slate-200">{t('calendar.loadError')}</p><Button onClick={() => void refetch()}>{t('refresh')}</Button></div>
      ) : view === 'agenda' ? (
        <div className="h-[calc(100vh-410px)] min-h-[380px] overflow-y-auto p-4 md:p-5">
          {days.map((day) => {
            const items = activitiesByDay.get(day.toISOString()) ?? [];
            if (items.length === 0) return null;
            return (
              <div key={day.toISOString()} className="mb-5 grid gap-3 md:grid-cols-[180px_1fr]">
                <div className="flex items-center gap-2 md:flex-col md:items-start md:gap-1">
                  <div className="font-black text-slate-900 dark:text-white">{new Intl.DateTimeFormat(locale, { weekday: 'long', day: 'numeric', month: 'long' }).format(day)}</div>
                  {isToday(day) && <span className="rounded-full bg-[image:var(--crm-brand-gradient)] px-2 py-0.5 text-[10px] font-black text-white">{t('calendar.today')}</span>}
                </div>
                <div className="space-y-2 border-l-2 border-dashed border-slate-200 pl-3 dark:border-white/10 md:pl-4">
                  {items.map((activity) => <ActivityChip key={activity.id} activity={activity} showAssignee={showAssigneeOnChips} onSelect={setSelected} />)}
                </div>
              </div>
            );
          })}
          {activities.length === 0 && <EmptyCalendar label={t('calendar.empty')} />}
        </div>
      ) : (
        <div className="h-[calc(100vh-410px)] min-h-[380px] overflow-auto">
          <div
            className="min-w-[900px] grid h-full grid-cols-7"
            style={{ gridTemplateRows: `auto repeat(${Math.max(1, days.length / 7)}, minmax(${view === 'week' ? '160px' : '70px'}, 1fr))` }}
          >
            {days.slice(0, 7).map((day) => (
              <div key={`header-${day.getDay()}`} className={cn('border-b border-r border-slate-200 bg-slate-50 px-2 py-2.5 text-center text-[11px] font-black uppercase tracking-wider text-slate-500 last:border-r-0 dark:border-white/10 dark:bg-white/5', (day.getDay() === 0 || day.getDay() === 6) && 'text-[var(--crm-brand-text)]')}>
                {new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(day)}
              </div>
            ))}
            {days.map((day) => {
              const items = activitiesByDay.get(day.toISOString()) ?? [];
              const isWeekend = day.getDay() === 0 || day.getDay() === 6;
              const visibleLimit = view === 'week' ? 12 : 3;
              return (
                <div
                  key={day.toISOString()}
                  className={cn(
                    'flex flex-col overflow-y-auto border-b border-r border-slate-200 p-2 last:border-r-0 dark:border-white/10',
                    !isSameMonth(day, cursor) && view === 'month' && 'bg-slate-50/70 dark:bg-white/[0.02]',
                    isWeekend && (isSameMonth(day, cursor) || view === 'week') && 'bg-slate-50/40 dark:bg-white/[0.015]',
                  )}
                >
                  <div className="mb-2 flex items-center justify-between">
                    <span className={cn(
                      'flex h-7 w-7 items-center justify-center rounded-full text-xs font-black transition',
                      isToday(day) ? 'bg-[image:var(--crm-brand-gradient)] text-white shadow-sm shadow-primary/30' : isSameMonth(day, cursor) || view === 'week' ? 'text-slate-800 dark:text-slate-100' : 'text-slate-400',
                    )}>
                      {format(day, 'd')}
                    </span>
                    {items.length > 0 && <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-black text-slate-500 dark:bg-white/10 dark:text-slate-400">{items.length}</span>}
                  </div>
                  <div className="space-y-1.5">
                    {items.slice(0, visibleLimit).map((activity) => <ActivityChip key={activity.id} compact={view === 'month'} showAssignee={showAssigneeOnChips} activity={activity} onSelect={setSelected} />)}
                    {items.length > visibleLimit && (
                      <button type="button" className="w-full rounded-md py-0.5 text-left text-[10px] font-bold text-primary hover:underline" onClick={() => { setCursor(day); setView('agenda'); }}>
                        +{items.length - visibleLimit} {t('calendar.more')}
                      </button>
                    )}
                  </div>
                </div>
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
                <DialogDescription>{selected.activityType?.name || t('calendar.activity')}</DialogDescription>
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
                    isLoading={activityImagesQuery.isLoading}
                    isError={activityImagesQuery.isError}
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
                      isLoading={customerImagesQuery.isLoading}
                      isError={customerImagesQuery.isError}
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

      <ActivityForm
        open={formOpen}
        onOpenChange={setFormOpen}
        onSubmit={handleCreateActivity}
        isLoading={createActivity.isPending}
      />
    </section>
  );
}

function formatActivityRange(activity: ActivityDto, locale: string): string {
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
  isError: boolean;
  emptyText: string;
  errorText: string;
  openLabel: string;
}

function DashboardImageGallery({ items, isLoading, isError, emptyText, errorText, openLabel }: DashboardImageGalleryProps): ReactElement {
  if (isLoading) {
    return <div className="flex min-h-48 items-center justify-center"><Loader2 className="animate-spin text-primary" size={24} /></div>;
  }

  if (isError) {
    return <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300">{errorText}</div>;
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
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
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
            <img src={item.src ?? undefined} alt={item.description || openLabel} loading="lazy" className="h-full w-full object-cover transition duration-300 group-hover:scale-105" />
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

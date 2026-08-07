import { useEffect, useMemo, useRef, useState, type ReactElement } from 'react';
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
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  Clock3,
  LayoutGrid,
  List,
  Loader2,
  MapPin,
  MousePointerClick,
  Plus,
  RotateCw,
  Sparkles,
  Tag,
  UserRound,
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
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth-store';
import { useDashboardActivitiesCalendar } from '@/features/activity-management/hooks/useMyActivitiesCalendar';
import { useCreateActivity } from '@/features/activity-management/hooks/useCreateActivity';
import { useMyPermissionsQuery } from '@/features/access-control/hooks/useMyPermissionsQuery';
import { buildCreateActivityPayload } from '@/features/activity-management/utils/build-create-payload';
import { ActivityForm } from '@/features/activity-management/components/ActivityForm';
import { activityImageApi } from '@/features/activity-image-management/api/activity-image-api';
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
  onSelect: (activity: ActivityDto) => void;
}

function ActivityChip({ activity, compact = false, onSelect }: ActivityChipProps): ReactElement {
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
            'w-full rounded-lg border-l-4 px-2.5 py-1.5 text-left shadow-xs transition hover:-translate-y-px hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
            eventTone(activity),
          )}
        >
          <span className="flex min-w-0 items-center gap-1.5">
            {time && <span className="shrink-0 text-[10px] font-black tabular-nums opacity-70">{time}</span>}
            <span className="truncate text-[11px] font-bold">{activity.subject}</span>
          </span>
          {!compact && customer && <span className="mt-0.5 block truncate text-[10px] opacity-70">{customer}</span>}
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
  const [selectedAssigneeId, setSelectedAssigneeId] = useState<number | 'all'>('all');
  const [formOpen, setFormOpen] = useState(false);
  const assigneeRailRef = useRef<HTMLDivElement>(null);
  const createActivity = useCreateActivity();

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
      <div className="relative overflow-hidden border-b border-slate-200 p-4 dark:border-white/10 md:p-5">
        <div className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-[image:var(--crm-brand-gradient)] opacity-[0.07] blur-2xl" aria-hidden />
        <div className="relative flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[image:var(--crm-brand-gradient)] text-white shadow-md shadow-primary/25">
              <CalendarDays size={21} />
            </div>
            <div>
              <h2 className="flex items-center gap-1.5 text-lg font-black text-slate-900 dark:text-white">
                {t('calendar.title')}
                <Sparkles size={14} className="text-amber-400" />
              </h2>
              <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">
                {t(isSystemAdmin ? 'calendar.descriptionAdmin' : 'calendar.description')}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex rounded-xl border border-slate-200 bg-slate-50 p-1 dark:border-white/10 dark:bg-white/5">
              {(['month', 'week', 'agenda'] as const).map((item) => {
                const ViewIcon = viewIcons[item];
                return (
                  <button key={item} type="button" onClick={() => setView(item)} className={cn('flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold transition', view === item ? 'bg-[image:var(--crm-brand-gradient)] text-white shadow-sm shadow-primary/20' : 'text-slate-600 hover:bg-white dark:text-slate-300 dark:hover:bg-white/10')}>
                    <ViewIcon size={14} />{t(`calendar.views.${item}`)}
                  </button>
                );
              })}
            </div>
            <Button size="sm" className="bg-[image:var(--crm-brand-gradient)] text-white shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/30 hover:scale-[1.02] transition-all" onClick={() => setFormOpen(true)}>
              <Plus size={15} className="mr-1.5" />{t('calendar.newActivity')}
            </Button>
          </div>
        </div>

        <div className="relative mt-4 grid grid-cols-2 gap-2.5 lg:grid-cols-4">
          {summaryCards.map(({ label, value, icon: Icon, tone }) => (
            <div key={label} className="group flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50/70 p-3 transition hover:-translate-y-0.5 hover:shadow-md dark:border-white/10 dark:bg-white/5">
              <div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition group-hover:scale-105', summaryToneClasses[tone])}>
                <Icon size={17} />
              </div>
              <div className="min-w-0"><div className="text-xl font-black tabular-nums text-slate-900 dark:text-white">{value}</div><div className="truncate text-[11px] font-semibold text-slate-500">{label}</div></div>
            </div>
          ))}
        </div>
      </div>

      {isSystemAdmin && (
        <div className="border-b border-slate-200 bg-white px-4 py-3 dark:border-white/10 dark:bg-[#130d1b] md:px-5">
          <div className="mb-2 flex items-center justify-between gap-3">
            <div>
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-200">
                {t('calendar.assignees.title')}
              </h3>
              <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                {t('calendar.assignees.description')}
              </p>
            </div>
            <div className="flex shrink-0 gap-1">
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-8 w-8 rounded-lg"
                aria-label={t('calendar.assignees.previous')}
                onClick={() => assigneeRailRef.current?.scrollBy({ left: -320, behavior: 'smooth' })}
              >
                <ChevronLeft size={15} />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-8 w-8 rounded-lg"
                aria-label={t('calendar.assignees.next')}
                onClick={() => assigneeRailRef.current?.scrollBy({ left: 320, behavior: 'smooth' })}
              >
                <ChevronRight size={15} />
              </Button>
            </div>
          </div>
          <div ref={assigneeRailRef} className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:thin]">
            <button
              type="button"
              onClick={() => setSelectedAssigneeId('all')}
              className={cn(
                'flex shrink-0 items-center gap-2 rounded-xl border px-3 py-2 text-left transition',
                selectedAssigneeId === 'all'
                  ? 'border-primary bg-primary/10 text-primary shadow-sm'
                  : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-primary/40 dark:border-white/10 dark:bg-white/5 dark:text-slate-200',
              )}
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[image:var(--crm-brand-gradient)] text-[10px] font-black text-white">
                {t('calendar.assignees.allShort')}
              </span>
              <span className="whitespace-nowrap text-xs font-black">{t('calendar.assignees.all')}</span>
              <span className="rounded-full bg-white/80 px-1.5 py-0.5 text-[10px] font-black tabular-nums text-slate-600 dark:bg-black/20 dark:text-slate-300">
                {calendarActivities.length}
              </span>
            </button>
            {assignees.map((assignee) => (
              <button
                key={assignee.id}
                type="button"
                onClick={() => setSelectedAssigneeId(assignee.id)}
                className={cn(
                  'flex shrink-0 items-center gap-2 rounded-xl border px-3 py-2 text-left transition',
                  selectedAssigneeId === assignee.id
                    ? 'border-primary bg-primary/10 text-primary shadow-sm'
                    : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-primary/40 dark:border-white/10 dark:bg-white/5 dark:text-slate-200',
                )}
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-200 text-[10px] font-black uppercase text-slate-700 dark:bg-white/10 dark:text-slate-200">
                  {assignee.name.split(/\s+/).slice(0, 2).map((part) => part.charAt(0)).join('') || '#'}
                </span>
                <span className="max-w-44 truncate whitespace-nowrap text-xs font-black">{assignee.name}</span>
                <span className="rounded-full bg-white/80 px-1.5 py-0.5 text-[10px] font-black tabular-nums text-slate-600 dark:bg-black/20 dark:text-slate-300">
                  {assignee.count}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-50/60 px-4 py-3 dark:border-white/10 dark:bg-white/[0.02] md:px-5">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" className="rounded-lg" onClick={() => move(-1)} aria-label={t('calendar.previous')}><ChevronLeft size={17} /></Button>
          <Button variant="outline" size="sm" className="rounded-lg font-bold" onClick={() => setCursor(new Date())}>{t('calendar.today')}</Button>
          <Button variant="outline" size="icon" className="rounded-lg" onClick={() => move(1)} aria-label={t('calendar.next')}><ChevronRight size={17} /></Button>
          <h3 className="ml-1.5 capitalize text-base font-black text-slate-900 dark:text-white md:text-lg">{title}</h3>
        </div>
        <Button variant="ghost" size="sm" disabled={isFetching} onClick={() => void refetch()}>
          <RotateCw size={15} className={cn('mr-1.5', isFetching && 'animate-spin')} />{t('refresh')}
        </Button>
      </div>

      {isLoading ? (
        <div className="flex min-h-96 items-center justify-center gap-2 text-slate-500"><Loader2 className="animate-spin" />{t('loading')}</div>
      ) : isError ? (
        <div className="flex min-h-80 flex-col items-center justify-center gap-3 p-6 text-center"><CircleAlert className="text-rose-500" size={32} /><p className="font-semibold text-slate-700 dark:text-slate-200">{t('calendar.loadError')}</p><Button onClick={() => void refetch()}>{t('refresh')}</Button></div>
      ) : view === 'agenda' ? (
        <div className="max-h-[620px] overflow-y-auto p-4 md:p-5">
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
                  {items.map((activity) => <ActivityChip key={activity.id} activity={activity} onSelect={setSelected} />)}
                </div>
              </div>
            );
          })}
          {activities.length === 0 && <EmptyCalendar label={t('calendar.empty')} />}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <div className="min-w-[900px] grid grid-cols-7">
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
                    'min-h-32 border-b border-r border-slate-200 p-2 last:border-r-0 dark:border-white/10',
                    view === 'week' && 'min-h-[520px]',
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
                    {items.slice(0, visibleLimit).map((activity) => <ActivityChip key={activity.id} compact={view === 'month'} activity={activity} onSelect={setSelected} />)}
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
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
          {selected && <><DialogHeader><DialogTitle className="pr-8 text-xl">{selected.subject}</DialogTitle><DialogDescription>{selected.activityType?.name || t('calendar.activity')}</DialogDescription></DialogHeader><div className="grid gap-3 py-2 sm:grid-cols-2"><Detail icon={Clock3} label={t('calendar.detail.date')} value={formatActivityRange(selected, locale)} /><Detail icon={CheckCircle2} label={t('calendar.detail.status')} value={statusLabel(selected, t)} /><Detail icon={UserRound} label={t('calendar.detail.assignee')} value={assigneeName(selected)} />{customerName(selected) && <Detail icon={UserRound} label={t('calendar.detail.customer')} value={customerName(selected)!} />}{selected.erpCustomerCode && <Detail icon={MapPin} label={t('calendar.detail.customerCode')} value={selected.erpCustomerCode} />}</div>{selected.description && <div className="rounded-xl bg-slate-50 p-4 text-sm leading-6 text-slate-700 dark:bg-white/5 dark:text-slate-200"><div className="mb-1 text-[10px] font-black uppercase tracking-wider text-slate-400">{t('calendar.detail.description')}</div>{selected.description}</div>}<div className="mt-2 flex justify-end"><Button onClick={() => navigate('/activity-management')}>{t('calendar.openActivities')}</Button></div></>}
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

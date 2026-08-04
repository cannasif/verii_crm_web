import { useMemo, useState, type ReactElement } from 'react';
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
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  Clock3,
  List,
  Loader2,
  MapPin,
  Plus,
  RotateCw,
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
import { cn } from '@/lib/utils';
import { useMyActivitiesCalendar } from '@/features/activity-management/hooks/useMyActivitiesCalendar';
import {
  ActivityPriority,
  ActivityStatus,
  type ActivityDto,
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

function occursOnDay(activity: ActivityDto, day: Date): boolean {
  const dayStart = startOfDay(day);
  const nextDay = addDays(dayStart, 1);
  const activityStart = new Date(activity.startDateTime);
  const activityEnd = new Date(activity.endDateTime || activity.startDateTime);
  return activityStart < nextDay && activityEnd >= dayStart;
}

function eventTone(activity: ActivityDto): string {
  const status = numericValue(activity.status);
  if (status === ActivityStatus.Completed) return 'border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/15 dark:text-emerald-200';
  if (status === ActivityStatus.Cancelled) return 'border-slate-300 bg-slate-100 text-slate-500 line-through dark:border-white/10 dark:bg-white/5 dark:text-slate-400';
  if (isBefore(new Date(activity.endDateTime || activity.startDateTime), new Date())) return 'border-rose-300 bg-rose-50 text-rose-800 dark:border-rose-500/30 dark:bg-rose-500/15 dark:text-rose-200';
  if (numericValue(activity.priority) === ActivityPriority.High) return 'border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/15 dark:text-amber-200';
  return 'border-blue-300 bg-blue-50 text-blue-800 dark:border-blue-500/30 dark:bg-blue-500/15 dark:text-blue-200';
}

interface ActivityChipProps {
  activity: ActivityDto;
  compact?: boolean;
  onSelect: (activity: ActivityDto) => void;
}

function ActivityChip({ activity, compact = false, onSelect }: ActivityChipProps): ReactElement {
  const time = activity.isAllDay ? '' : format(new Date(activity.startDateTime), 'HH:mm');
  const customer = customerName(activity);
  return (
    <button
      type="button"
      onClick={() => onSelect(activity)}
      title={[time, activity.subject, customer].filter(Boolean).join(' · ')}
      className={cn(
        'w-full rounded-md border px-2 py-1 text-left transition hover:-translate-y-px hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
        eventTone(activity),
      )}
    >
      <span className="flex min-w-0 items-center gap-1.5">
        {time && <span className="shrink-0 text-[10px] font-bold opacity-75">{time}</span>}
        <span className="truncate text-[11px] font-bold">{activity.subject}</span>
      </span>
      {!compact && customer && <span className="mt-0.5 block truncate text-[10px] opacity-75">{customer}</span>}
    </button>
  );
}

export function MyActivitiesCalendar(): ReactElement {
  const { t, i18n } = useTranslation('dashboard');
  const navigate = useNavigate();
  const [view, setView] = useState<CalendarView>('month');
  const [cursor, setCursor] = useState(() => new Date());
  const [selected, setSelected] = useState<ActivityDto | null>(null);

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
  const { data: activities = [], isLoading, isFetching, isError, refetch } = useMyActivitiesCalendar(queryStart, queryEnd);

  const days = useMemo(
    () => eachDayOfInterval({ start: visibleRange.start, end: addDays(visibleRange.end, -1) }),
    [visibleRange],
  );
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
    { label: t('calendar.summary.total'), value: activities.length, icon: CalendarDays, tone: 'text-blue-600' },
    { label: t('calendar.summary.scheduled'), value: scheduled, icon: Clock3, tone: 'text-amber-600' },
    { label: t('calendar.summary.completed'), value: completed, icon: CheckCircle2, tone: 'text-emerald-600' },
    { label: t('calendar.summary.overdue'), value: overdue, icon: CircleAlert, tone: 'text-rose-600' },
  ];

  const move = (direction: -1 | 1) => {
    setCursor((current) => view === 'week'
      ? (direction < 0 ? subWeeks(current, 1) : addWeeks(current, 1))
      : (direction < 0 ? subMonths(current, 1) : addMonths(current, 1)));
  };

  const statusLabel = (activity: ActivityDto): string => {
    const status = numericValue(activity.status);
    if (status === ActivityStatus.Completed) return t('calendar.status.completed');
    if (status === ActivityStatus.Cancelled) return t('calendar.status.cancelled');
    if (isBefore(new Date(activity.endDateTime || activity.startDateTime), new Date())) return t('calendar.status.overdue');
    return t('calendar.status.scheduled');
  };

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-[#130d1b]">
      <div className="border-b border-slate-200 p-4 dark:border-white/10 md:p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900 dark:text-white">
              <CalendarDays className="text-primary" size={20} />
              {t('calendar.title')}
            </h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{t('calendar.description')}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex rounded-xl border border-slate-200 bg-slate-50 p-1 dark:border-white/10 dark:bg-white/5">
              {(['month', 'week', 'agenda'] as const).map((item) => (
                <button key={item} type="button" onClick={() => setView(item)} className={cn('rounded-lg px-3 py-2 text-xs font-bold transition', view === item ? 'bg-primary text-white shadow-sm' : 'text-slate-600 hover:bg-white dark:text-slate-300 dark:hover:bg-white/10')}>
                  {t(`calendar.views.${item}`)}
                </button>
              ))}
            </div>
            <Button variant="outline" size="sm" onClick={() => navigate('/activity-management')}>
              <Plus size={15} className="mr-1.5" />{t('calendar.newActivity')}
            </Button>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 lg:grid-cols-4">
          {summaryCards.map(({ label, value, icon: Icon, tone }) => (
            <div key={label} className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50/70 p-3 dark:border-white/10 dark:bg-white/5">
              <Icon size={18} className={tone} />
              <div><div className="text-lg font-black text-slate-900 dark:text-white">{value}</div><div className="text-[11px] font-semibold text-slate-500">{label}</div></div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-3 dark:border-white/10 md:px-5">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => move(-1)} aria-label={t('calendar.previous')}><ChevronLeft size={17} /></Button>
          <Button variant="outline" size="sm" onClick={() => setCursor(new Date())}>{t('calendar.today')}</Button>
          <Button variant="outline" size="icon" onClick={() => move(1)} aria-label={t('calendar.next')}><ChevronRight size={17} /></Button>
          <h3 className="ml-1 capitalize text-base font-black text-slate-900 dark:text-white md:text-lg">{title}</h3>
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
            const items = activities.filter((activity) => occursOnDay(activity, day));
            if (items.length === 0) return null;
            return <div key={day.toISOString()} className="mb-5 grid gap-3 md:grid-cols-[180px_1fr]"><div><div className="font-black text-slate-900 dark:text-white">{new Intl.DateTimeFormat(locale, { weekday: 'long', day: 'numeric', month: 'long' }).format(day)}</div>{isToday(day) && <span className="text-xs font-bold text-primary">{t('calendar.today')}</span>}</div><div className="space-y-2">{items.map((activity) => <ActivityChip key={activity.id} activity={activity} onSelect={setSelected} />)}</div></div>;
          })}
          {activities.length === 0 && <EmptyCalendar label={t('calendar.empty')} />}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <div className={cn('min-w-[900px]', view === 'week' ? 'grid grid-cols-7' : 'grid grid-cols-7')}>
            {days.slice(0, 7).map((day) => <div key={`header-${day.getDay()}`} className="border-b border-r border-slate-200 bg-slate-50 px-2 py-2 text-center text-[11px] font-black uppercase tracking-wider text-slate-500 last:border-r-0 dark:border-white/10 dark:bg-white/5">{new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(day)}</div>)}
            {days.map((day) => {
              const items = activities.filter((activity) => occursOnDay(activity, day));
              return <div key={day.toISOString()} className={cn('min-h-32 border-b border-r border-slate-200 p-2 last:border-r-0 dark:border-white/10', view === 'week' && 'min-h-[520px]', !isSameMonth(day, cursor) && view === 'month' && 'bg-slate-50/70 dark:bg-white/[0.02]')}><div className="mb-2 flex items-center justify-between"><span className={cn('flex h-7 w-7 items-center justify-center rounded-full text-xs font-black', isToday(day) ? 'bg-primary text-white' : isSameMonth(day, cursor) || view === 'week' ? 'text-slate-800 dark:text-slate-100' : 'text-slate-400')}>{format(day, 'd')}</span>{items.length > 0 && <span className="text-[10px] font-bold text-slate-400">{items.length}</span>}</div><div className="space-y-1.5">{items.slice(0, view === 'week' ? 12 : 3).map((activity) => <ActivityChip key={activity.id} compact={view === 'month'} activity={activity} onSelect={setSelected} />)}{items.length > (view === 'week' ? 12 : 3) && <button type="button" className="w-full text-left text-[10px] font-bold text-primary" onClick={() => { setCursor(day); setView('agenda'); }}>+{items.length - (view === 'week' ? 12 : 3)} {t('calendar.more')}</button>}</div></div>;
            })}
          </div>
        </div>
      )}

      <Dialog open={selected !== null} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
          {selected && <><DialogHeader><DialogTitle className="pr-8 text-xl">{selected.subject}</DialogTitle><DialogDescription>{selected.activityType?.name || t('calendar.activity')}</DialogDescription></DialogHeader><div className="grid gap-3 py-2 sm:grid-cols-2"><Detail icon={Clock3} label={t('calendar.detail.date')} value={formatActivityRange(selected, locale)} /><Detail icon={CheckCircle2} label={t('calendar.detail.status')} value={statusLabel(selected)} />{customerName(selected) && <Detail icon={UserRound} label={t('calendar.detail.customer')} value={customerName(selected)!} />}{selected.erpCustomerCode && <Detail icon={MapPin} label={t('calendar.detail.customerCode')} value={selected.erpCustomerCode} />}</div>{selected.description && <div className="rounded-xl bg-slate-50 p-4 text-sm leading-6 text-slate-700 dark:bg-white/5 dark:text-slate-200"><div className="mb-1 text-[10px] font-black uppercase tracking-wider text-slate-400">{t('calendar.detail.description')}</div>{selected.description}</div>}<div className="mt-2 flex justify-end"><Button onClick={() => navigate('/activity-management')}>{t('calendar.openActivities')}</Button></div></>}
        </DialogContent>
      </Dialog>
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
  return <div className="flex min-h-64 flex-col items-center justify-center gap-2 text-slate-400"><List size={32} /><span className="font-semibold">{label}</span></div>;
}

function Detail({ icon: Icon, label, value }: { icon: typeof Clock3; label: string; value: string }): ReactElement {
  return <div className="flex items-start gap-3 rounded-xl border border-slate-200 p-3 dark:border-white/10"><Icon size={17} className="mt-0.5 shrink-0 text-primary" /><div><div className="text-[10px] font-black uppercase tracking-wider text-slate-400">{label}</div><div className="mt-0.5 text-sm font-bold text-slate-800 dark:text-slate-100">{value}</div></div></div>;
}

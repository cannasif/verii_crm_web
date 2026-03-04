import { type ReactElement, useState, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useActivities } from '@/features/activity-management/hooks/useActivities';
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
import { ActivityStatus } from '@/features/activity-management/types/activity-types';
import { Checkbox } from '@/components/ui/checkbox';
import { useUserOptions } from '@/features/user-discount-limit-management/hooks/useUserOptions';
import { useAuthStore } from '@/stores/auth-store';
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
  } from 'lucide-react';

const EMPTY_ACTIVITIES: ActivityDto[] = [];

export function DailyTasksPage(): ReactElement {
  const { t, i18n } = useTranslation();
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
  const [greeting, setGreeting] = useState('');

  const { data: userOptions = [] } = useUserOptions();

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
    return { startDate: monday.toISOString().split('T')[0], endDate: sunday.toISOString().split('T')[0] };
  };

  const getCalendarDateRange = (): { startDate: string; endDate: string } => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - startDate.getDay());
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 41);
    return { startDate: startDate.toISOString().split('T')[0], endDate: endDate.toISOString().split('T')[0] };
  };

  const getWeeklyDateRange = (): { startDate: string; endDate: string } => {
    const start = new Date(calendarWeekStart);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    end.setHours(23, 59, 59, 999);
    return { startDate: start.toISOString().split('T')[0], endDate: end.toISOString().split('T')[0] };
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

  const { data, isLoading, refetch } = useActivities({
    pageNumber: 1,
    pageSize: 1000,
    sortBy: 'StartDateTime',
    sortDirection: 'asc',
    filters: filters.length > 0 ? filters : undefined,
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
          Number(activity.status) === ActivityStatus.Scheduled,
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
  const handleDelete = async (id: number) => { await deleteActivity.mutateAsync(id); void refetch(); };
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
  const getAssignedUserName = (userId?: number) => userOptions.find((u) => u.id === userId)?.fullName || t('dailyTasks.unassigned');
  
  const getActivitiesByDate = (): Record<string, ActivityDto[]> => {
    const grouped: Record<string, ActivityDto[]> = {};
    filteredActivities.forEach((activity) => {
      const dateKey = activity.activityDate ? new Date(activity.activityDate).toISOString().split('T')[0] : 'no-date';
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
      const dateKey = date.toISOString().split('T')[0];
      days.push({ date, activities: activitiesByDate[dateKey] || [] });
    }
    return days;
  };

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

  const backgroundBlobs = (
    <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
      <div className="absolute top-0 left-1/4 w-[200px] md:w-[500px] h-[200px] md:h-[500px] bg-purple-500/10 dark:bg-purple-900/20 rounded-full blur-[60px] md:blur-[100px] animate-pulse" />
      <div className="absolute bottom-0 right-1/4 w-[200px] md:w-[400px] h-[200px] md:h-[400px] bg-pink-500/10 dark:bg-pink-900/20 rounded-full blur-[50px] md:blur-[80px] animate-pulse" style={{ animationDelay: '2s' }} />
    </div>
  );

  if (isLoading) {
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
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150"></div>
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
                                <PauseCircle size={12} className="mr-1" /> {t('activityManagement.statusCanceled')}
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => setStatusFilter(String(ActivityStatus.Completed))} className={filterButtonStyle(statusFilter === String(ActivityStatus.Completed))}>
                                <CheckCircle2 size={12} className="mr-1" /> {t('dailyTasks.completed')}
                            </Button>
                        </div>
                    </div>

                    {/* Personel Seçimi */}
                    <Select
                        value={assignedUserFilter?.toString() || 'all'}
                        onValueChange={(value) => setAssignedUserFilter(value === 'all' ? undefined : parseInt(value))}
                    >
                        <SelectTrigger className="w-full sm:w-[160px] h-10 rounded-xl border-slate-200 dark:border-white/10 bg-white/50 dark:bg-white/5 focus:ring-pink-500">
                            <div className="flex items-center text-xs">
                                <User size={14} className="mr-2 text-pink-500" />
                                <SelectValue placeholder={t('dailyTasks.allEmployees')} />
                            </div>
                        </SelectTrigger>
                        <SelectContent className="rounded-xl border-slate-200 dark:border-white/10">
                            <SelectItem value="all">{t('dailyTasks.allEmployees')}</SelectItem>
                            {userOptions.map((u) => (
                                <SelectItem key={u.id} value={u.id.toString()}>{u.fullName}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>
        </div>

        {/* 3. İÇERİK ALANI */}
        <div className="mt-6 md:mt-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
            
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
                                onClick={(e) => { e.stopPropagation(); handleDelete(activity.id); }}
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
                                        <Button variant="ghost" size="sm" className="h-8 w-8 text-slate-400 hover:text-red-500" onClick={() => handleDelete(activity.id)}>
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

                    {calendarViewMode === 'weekly' ? (
                      <div className="overflow-x-auto pb-2">
                        <div className="min-w-[600px]">
                          <div className="grid grid-cols-8 gap-px bg-slate-200 dark:bg-white/10 rounded-xl overflow-hidden">
                            <div className="bg-slate-100 dark:bg-white/5 p-2 text-xs font-bold text-slate-500 dark:text-slate-400" />
                            {getWeekDays().map((day) => (
                              <div key={day.toISOString()} className="bg-slate-100 dark:bg-white/5 p-2 text-center text-xs font-bold text-slate-600 dark:text-slate-300">
                                {day.toLocaleDateString(i18n.language, { weekday: 'short' })}
                                <span className="block text-slate-500 dark:text-slate-400">{day.getDate()}</span>
                              </div>
                            ))}
                            {Array.from({ length: 24 }, (_, hour) => (
                              <div key={hour} className="contents">
                                <div className="bg-slate-50 dark:bg-white/5 p-1.5 text-[10px] font-medium text-slate-500 dark:text-slate-400 text-right pr-2">
                                  {String(hour).padStart(2, '0')}:00
                                </div>
                                {getWeekDays().map((day) => {
                                  const slotActivities = getActivitiesForSlot(day, hour);
                                  const isToday = day.toDateString() === new Date().toDateString();
                                  return (
                                    <div
                                      key={`${day.toISOString()}-${hour}`}
                                      onClick={() => {
                                        setSlotStart(formatSlotStart(day, hour));
                                        setSlotEnd(formatSlotEnd(day, hour));
                                        setSelectedDate(null);
                                        setFormOpen(true);
                                      }}
                                      className={`
                                        min-h-[44px] md:min-h-[52px] p-1 cursor-pointer border border-transparent hover:border-pink-500/50 hover:bg-pink-50/50 dark:hover:bg-pink-500/10 transition-all
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
                                          <div className="text-[8px] text-slate-400 pl-1">+{slotActivities.length - 2}</div>
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
                            {[t('dailyTasks.days.mon'), t('dailyTasks.days.tue'), t('dailyTasks.days.wed'), t('dailyTasks.days.thu'), t('dailyTasks.days.fri'), t('dailyTasks.days.sat'), t('dailyTasks.days.sun')].map((day) => (
                              <div key={day} className="text-center text-xs font-bold text-slate-400 uppercase tracking-widest pb-4 border-b border-slate-100 dark:border-white/5">
                                {day}
                              </div>
                            ))}
                            {getCalendarDays().map((dayData, index) => {
                              const isCurrentMonth = dayData.date.getMonth() === calendarMonth.getMonth();
                              const isToday = dayData.date.toDateString() === new Date().toDateString();
                              return (
                                <div
                                  key={index}
                                  onClick={() => {
                                    const dateString = dayData.date.toISOString().split('T')[0];
                                    setSelectedDate(dateString);
                                    setSlotStart(`${dateString}T09:00`);
                                    setSlotEnd(`${dateString}T10:00`);
                                    setFormOpen(true);
                                  }}
                                  className={`
                                    min-h-[80px] md:min-h-[120px] rounded-xl md:rounded-2xl p-2 md:p-3 cursor-pointer transition-all duration-200 border group
                                    ${!isCurrentMonth ? 'opacity-30 bg-transparent border-transparent' : 'bg-white/40 dark:bg-white/5 border-slate-100 dark:border-white/10 hover:border-pink-500/50 hover:bg-white/80 dark:hover:bg-white/10 hover:shadow-lg hover:-translate-y-1'}
                                    ${isToday ? 'ring-2 ring-pink-500 ring-offset-2 dark:ring-offset-[#1a1025] bg-pink-50/50 dark:bg-pink-500/10' : ''}
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
                                      <div className="text-[9px] md:text-[10px] font-semibold text-slate-400 pl-1">
                                        +{dayData.activities.length - 3} {t('dailyTasks.more')}
                                      </div>
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
            </TabsContent>
        </div>
      </Tabs>

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
    </div>
  );
}

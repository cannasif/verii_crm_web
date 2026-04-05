import { type ReactElement, type ReactNode, useEffect, useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useUIStore } from '@/stores/ui-store';
import { useDashboardQuery } from '../hooks/useDashboardQuery';
import i18n from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/stores/auth-store';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  ArrowDownRight,
  ArrowUpRight,
  Clock,
  FileText,
  Package,
  ShoppingCart,
  TrendingUp,
  Users,
  Wallet,
  Zap,
  MoreHorizontal,
  CalendarDays,
  Activity,
  RefreshCcw,
  BarChart3,
  UserPlus,
  FilePlus,
  ShoppingBag,
  PlusCircle,
  CalendarPlus
} from 'lucide-react';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type CardWrapperProps = {
  children: ReactNode;
  className?: string;
  noPadding?: boolean;
  onClick?: () => void;
  interactive?: boolean;
  /** Daha belirgin border + hover’da pembe çerçeve ve ring (hızlı erişim kartları) */
  prominentHover?: boolean;
};

function CardWrapper({
  children,
  className = '',
  noPadding = false,
  onClick,
  interactive = false,
  prominentHover = false,
}: CardWrapperProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "bg-stone-50/90 dark:bg-[#120c18] border border-slate-300/70 dark:border-white/5 rounded-xl shadow-sm shadow-slate-900/[0.04] ring-1 ring-slate-200/55 dark:shadow-none dark:ring-0",
        "flex flex-col relative overflow-hidden",
        interactive && !prominentHover && [
            "cursor-pointer transition-all duration-300 ease-out",
            "hover:shadow-md hover:shadow-slate-900/[0.06] hover:-translate-y-0.5 dark:hover:shadow-lg dark:hover:shadow-pink-500/10",
            "hover:border-pink-400/35 dark:hover:border-pink-500/30",
            "active:scale-[0.98]",
        ],
        interactive && prominentHover && [
            "cursor-pointer transition-all duration-300 ease-out",
            "border-2 border-slate-300/80 dark:border-white/14 ring-2 ring-slate-200/70 dark:ring-white/10",
            "hover:-translate-y-0.5 hover:shadow-md hover:shadow-pink-500/15 dark:hover:shadow-lg dark:hover:shadow-pink-500/20",
            "hover:border-pink-500 hover:ring-2 hover:ring-pink-400/45 dark:hover:border-pink-400 dark:hover:ring-pink-500/35",
            "active:scale-[0.98]",
        ],
        noPadding ? 'p-0' : 'p-5 md:p-6',
        className
      )}
    >
      <div className="relative z-10 h-full w-full">
        {children}
      </div>
    </div>
  );
}

export function DashboardPage(): ReactElement {
  const { t } = useTranslation('dashboard');
  const navigate = useNavigate();
  const { setPageTitle } = useUIStore();
  const { user } = useAuthStore();
  
  const { data, isLoading, refetch, isRefetching } = useDashboardQuery(); 
  
  const [timeOfDay, setTimeOfDay] = useState<'morning' | 'afternoon' | 'evening'>('morning');
  const [chartMenuOpen, setChartMenuOpen] = useState(false);
  const chartMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (chartMenuRef.current && !chartMenuRef.current.contains(event.target as Node)) {
        setChartMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setTimeOfDay('morning');
    else if (hour < 18) setTimeOfDay('afternoon');
    else setTimeOfDay('evening');
  }, []);

  useEffect(() => {
    setPageTitle(t('title'));
    return () => {
      setPageTitle(null);
    };
  }, [t, setPageTitle]);

  const getUserDisplayName = (): string => {
    if (!user) return t('user');
    return user.name || user.email || t('user');
  };

  const displayName = getUserDisplayName();
  const firstName = displayName.trim().split(' ')[0];

  const formatCurrency = (amount: number | undefined | null): string => {
    const val = amount || 0;
    return new Intl.NumberFormat(i18n.language, {
      style: 'currency',
      currency: 'TRY',
      minimumFractionDigits: 2,
    }).format(val);
  };

  const formatDate = (): string => {
    const now = new Date();
    return now.toLocaleDateString(i18n.language, { day: 'numeric', month: 'long', year: 'numeric', weekday: 'long' });
  };

  const handleRefresh = async () => {
    const toastId = toast.loading(t('refreshing'));
    try {
        await refetch();
        toast.success(t('refreshed'), { id: toastId });
    } catch {
        toast.error(t('refreshError'), { id: toastId });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-dvh w-full">
        <div className="flex flex-col items-center gap-4">
            <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-pink-600" />
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{t('loading')}</p>
        </div>
      </div>
    );
  }

  const kpis = data?.kpis;
  const activities = Array.isArray(data?.activities) ? data.activities : [];

  const stats = [
    {
      l: t('stats.totalRevenue'),
      v: formatCurrency(kpis?.monthlyRevenue),
      c: kpis?.monthlyRevenueChange ? `${kpis.monthlyRevenueChange}%` : '0%',
      p: (kpis?.monthlyRevenueChange ?? 0) >= 0 ? 1 : 0,
      i: Wallet,
      color: 'text-sky-900 dark:text-sky-200',
      bg: 'bg-sky-200/95 dark:bg-sky-500/25',
      card: 'border-2 border-sky-400/70 bg-gradient-to-br from-white to-sky-100 shadow-md shadow-sky-900/[0.07] ring-2 ring-sky-200/80 dark:from-sky-950/90 dark:to-sky-900/55 dark:border-sky-500/55 dark:ring-sky-500/35 dark:shadow-lg dark:shadow-sky-950/50',
    },
    {
      l: t('stats.activeOpportunities'),
      v: kpis?.activeAgreements ? String(kpis.activeAgreements) : '0',
      c: kpis?.activeAgreementsChange ? `${kpis.activeAgreementsChange}%` : '0%',
      p: (kpis?.activeAgreementsChange ?? 0) >= 0 ? 1 : 0,
      i: Users,
      color: 'text-violet-900 dark:text-violet-200',
      bg: 'bg-violet-200/95 dark:bg-violet-500/25',
      card: 'border-2 border-violet-400/70 bg-gradient-to-br from-white to-violet-100 shadow-md shadow-violet-900/[0.07] ring-2 ring-violet-200/80 dark:from-violet-950/90 dark:to-violet-900/55 dark:border-violet-500/55 dark:ring-violet-500/35 dark:shadow-lg dark:shadow-violet-950/50',
    },
    {
      l: t('stats.newLeads'),
      v: kpis && 'newLeads' in kpis ? String(kpis.newLeads) : '0',
      c: '0%',
      p: 1,
      i: Users,
      color: 'text-rose-900 dark:text-rose-200',
      bg: 'bg-rose-200/95 dark:bg-rose-500/25',
      card: 'border-2 border-rose-400/70 bg-gradient-to-br from-white to-rose-100 shadow-md shadow-rose-900/[0.07] ring-2 ring-rose-200/80 dark:from-rose-950/90 dark:to-pink-950/60 dark:border-pink-500/55 dark:ring-pink-500/35 dark:shadow-lg dark:shadow-rose-950/50',
    },
    {
      l: t('stats.pendingOrders'),
      v: kpis && 'pendingOrders' in kpis ? String(kpis.pendingOrders) : '0',
      c: '0%',
      p: 0,
      i: ShoppingCart,
      color: 'text-amber-900 dark:text-amber-200',
      bg: 'bg-amber-200/95 dark:bg-amber-500/25',
      card: 'border-2 border-amber-400/70 bg-gradient-to-br from-white to-amber-100 shadow-md shadow-amber-900/[0.07] ring-2 ring-amber-200/80 dark:from-amber-950/90 dark:to-orange-950/55 dark:border-amber-500/55 dark:ring-amber-500/35 dark:shadow-lg dark:shadow-amber-950/50',
    },
  ];

  const monthKeys = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

  const deals = activities.slice(0, 5).map((activity) => {
    const title = typeof activity.title === 'string' ? activity.title : '';
    const description = typeof activity.description === 'string' ? activity.description : '';
    const type = typeof activity.type === 'string' ? activity.type : '';
    const timeAgo = typeof activity.timeAgo === 'string' ? activity.timeAgo : '';
    const createdAt = typeof activity.createdAt === 'string' ? activity.createdAt : '';
    const amount = typeof activity.amount === 'number' ? activity.amount : null;
    return {
      c: title || description || t('unnamedActivity'),
      a: amount !== null ? formatCurrency(amount) : '',
      s: t(`activityType.${type}`) || type || t('activityType.general'),
      d: timeAgo || (createdAt ? new Date(createdAt).toLocaleDateString(i18n.language) : t('noDate')),
    };
  });

  const hasChartData = false; 
  const chartData = Array(12).fill(0);

  return (
    <div className="flex flex-col gap-6 p-1 md:p-4 overflow-x-hidden w-full pb-10">
      
      <div className="flex-none flex flex-col md:flex-row md:items-center justify-between gap-4 px-1">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-800 dark:text-white mb-1 flex flex-wrap items-center gap-2">
            <span>{t(`greeting.${timeOfDay}`)},</span>
            <span className="text-transparent bg-clip-text bg-linear-to-r from-pink-600 to-orange-500">
              <span className="md:hidden">{firstName}</span>
              <span className="hidden md:inline">{displayName}</span>
            </span>
          </h1>
          <p className="text-slate-600 dark:text-slate-400 text-sm font-medium flex items-center gap-2">
            <CalendarDays size={15} />
            {formatDate()}
          </p>
        </div>
        
        <div className="flex items-center gap-3">
            <Button 
                variant="outline"
                onClick={handleRefresh}
                disabled={isRefetching}
                className={cn(
                  "flex-1 md:flex-none bg-stone-50/90 dark:bg-[#120c18] border-slate-300/70 dark:border-white/10 text-slate-700 dark:text-slate-200 h-10 shadow-sm shadow-slate-900/[0.03] min-w-[100px] transition-all duration-300",
                  "hover:bg-stone-100 dark:hover:bg-pink-500/10 hover:border-slate-400/50 dark:hover:border-pink-500/30 hover:text-pink-600 dark:hover:text-pink-400",
                  "group"
                )}
            >
                <RefreshCcw size={16} className={cn("mr-2 transition-colors group-hover:text-pink-600 dark:group-hover:text-pink-400", isRefetching && "animate-spin")} />
                {isRefetching ? t('refreshing') : t('refresh')}
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                    className="flex-1 md:flex-none bg-linear-to-r from-pink-600 to-orange-600 text-white border-0 shadow-md shadow-pink-600/20 hover:shadow-lg hover:shadow-pink-600/30 hover:scale-[1.02] transition-all h-10 px-6"
                >
                    <Zap size={16} className="mr-2" />
                    {t('quickAction')}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64 bg-stone-50/95 dark:bg-[#120c18] border border-slate-300/70 dark:border-white/10 shadow-xl shadow-slate-900/8 rounded-xl p-1.5 pt-[env(safe-area-inset-top)]">
                
                <DropdownMenuLabel className="text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase tracking-wider px-2 py-1.5 opacity-70">
                  {t('sidebar.customers')}
                </DropdownMenuLabel>
                
                <DropdownMenuItem 
                  onClick={() => navigate('/customer-management')} 
                  className="group cursor-pointer rounded-lg py-2.5 px-2 mb-1 transition-all duration-200 hover:bg-stone-200/60 dark:hover:bg-pink-500/10 focus:bg-stone-200/60 dark:focus:bg-pink-500/10 outline-none"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-1.5 rounded-md bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400 group-focus:text-pink-600 dark:group-focus:text-pink-400 transition-colors">
                        <UserPlus size={16} />
                    </div>
                    <span className="text-slate-700 dark:text-slate-200 font-medium text-sm">
                        {t('sidebar.customerManagement')}
                    </span>
                  </div>
                </DropdownMenuItem>

                <DropdownMenuSeparator className="bg-slate-100 dark:bg-white/5 my-1" />

                <DropdownMenuLabel className="text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase tracking-wider px-2 py-1.5 opacity-70">
                  {t('sidebar.salesManagement')}
                </DropdownMenuLabel>

                <DropdownMenuItem 
                  onClick={() => navigate('/demands/create')} 
                  className="group cursor-pointer rounded-lg py-2.5 px-2 mb-1 transition-all duration-200 hover:bg-stone-200/60 dark:hover:bg-pink-500/10 focus:bg-stone-200/60 dark:focus:bg-pink-500/10 outline-none"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-1.5 rounded-md bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400 group-focus:text-pink-600 dark:group-focus:text-pink-400 transition-colors">
                        <PlusCircle size={16} />
                    </div>
                    <span className="text-slate-700 dark:text-slate-200 font-medium text-sm">
                        {t('sidebar.demandCreateWizard')}
                    </span>
                  </div>
                </DropdownMenuItem>
                
                <DropdownMenuItem 
                  onClick={() => navigate('/quotations/create')} 
                  className="group cursor-pointer rounded-lg py-2.5 px-2 mb-1 transition-all duration-200 hover:bg-stone-200/60 dark:hover:bg-pink-500/10 focus:bg-stone-200/60 dark:focus:bg-pink-500/10 outline-none"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-1.5 rounded-md bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400 group-focus:text-pink-600 dark:group-focus:text-pink-400 transition-colors">
                        <FilePlus size={16} />
                    </div>
                    <span className="text-slate-700 dark:text-slate-200 font-medium text-sm">
                        {t('sidebar.quotationCreateWizard')}
                    </span>
                  </div>
                </DropdownMenuItem>
                
                <DropdownMenuItem 
                  onClick={() => navigate('/orders/create')} 
                  className="group cursor-pointer rounded-lg py-2.5 px-2 transition-all duration-200 hover:bg-stone-200/60 dark:hover:bg-pink-500/10 focus:bg-stone-200/60 dark:focus:bg-pink-500/10 outline-none"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-1.5 rounded-md bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400 group-focus:text-pink-600 dark:group-focus:text-pink-400 transition-colors">
                        <ShoppingBag size={16} />
                    </div>
                    <span className="text-slate-700 dark:text-slate-200 font-medium text-sm">
                        {t('sidebar.orderCreateWizard')}
                    </span>
                  </div>
                </DropdownMenuItem>

                <DropdownMenuSeparator className="bg-slate-100 dark:bg-white/5 my-1" />

                <DropdownMenuLabel className="text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase tracking-wider px-2 py-1.5 opacity-70">
                  {t('sidebar.activities')}
                </DropdownMenuLabel>

                <DropdownMenuItem 
                  onClick={() => navigate('/activity-management')} 
                  className="group cursor-pointer rounded-lg py-2.5 px-2 transition-all duration-200 hover:bg-stone-200/60 dark:hover:bg-pink-500/10 focus:bg-stone-200/60 dark:focus:bg-pink-500/10 outline-none"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-1.5 rounded-md bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400 group-focus:text-pink-600 dark:group-focus:text-pink-400 transition-colors">
                        <CalendarPlus size={16} />
                    </div>
                    <span className="text-slate-700 dark:text-slate-200 font-medium text-sm">
                        {t('sidebar.activityManagement')}
                    </span>
                  </div>
                </DropdownMenuItem>

              </DropdownMenuContent>
            </DropdownMenu>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5 shrink-0">
        {stats.map((s, i) => (
          <CardWrapper 
            key={i} 
            interactive={false} 
            className={cn('min-h-[160px] md:min-h-[180px]', s.card)}
          >
            <div className="flex flex-col justify-between h-full">
              <div className="flex justify-between items-start">
                <div className={`p-3 rounded-xl ${s.bg} ${s.color}`}>
                  <s.i size={22} />
                </div>
                {s.c !== '0%' && (
                  <span className={`flex items-center gap-1 text-[10px] md:text-[11px] font-bold px-2 py-1 rounded-full border ${s.p ? 'bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20' : 'bg-red-50 text-red-600 border-red-100 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20'}`}>
                    {s.p ? <ArrowUpRight size={10} strokeWidth={3} /> : <ArrowDownRight size={10} strokeWidth={3} />}
                    {s.c}
                  </span>
                )}
              </div>
              
              <div>
                <h3 className="text-slate-600 dark:text-slate-400 text-xs md:text-sm font-medium uppercase tracking-wide">{s.l}</h3>
                <p 
                  className="text-2xl md:text-3xl font-bold text-slate-800 dark:text-white mt-1.5 md:mt-2 truncate font-sans" 
                  title={s.v}
                >
                  {s.v}
                </p>
              </div>
            </div>
          </CardWrapper>
        ))}
      </div>

      <div className="grid grid-cols-12 gap-5 md:gap-6 min-h-[400px]">
        
        <CardWrapper className="col-span-12 lg:col-span-8 p-0 overflow-hidden min-h-[350px] md:min-h-[400px] border-2 border-slate-400/55 dark:border-white/18 ring-2 ring-slate-300/55 dark:ring-white/12 shadow-md shadow-slate-900/[0.06] dark:shadow-black/40">
            <div className="p-5 md:p-6 border-b border-slate-300/50 dark:border-white/5 flex justify-between items-center bg-stone-50/90 dark:bg-[#120c18] shrink-0">
                <div>
                    <h3 className="text-base md:text-lg font-bold flex items-center gap-2 text-slate-800 dark:text-white">
                        <TrendingUp size={18} className="text-pink-600 dark:text-pink-500" />
                        {t('salesAnalysis')}
                    </h3>
                    <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 mt-1 ml-6.5">{t('targetVsActual')}</p>
                </div>
                
                <div className="relative" ref={chartMenuRef}>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-slate-600 dark:hover:text-white" onClick={() => setChartMenuOpen(!chartMenuOpen)}>
                        <MoreHorizontal size={18} />
                    </Button>
                    {chartMenuOpen && (
                        <div className="absolute right-0 top-full mt-2 w-48 bg-stone-50/95 dark:bg-[#1a1025] border border-slate-300/70 dark:border-white/10 rounded-lg shadow-xl shadow-slate-900/8 z-50 py-1">
                            <button onClick={() => { refetch(); setChartMenuOpen(false); }} className="w-full text-left px-4 py-2.5 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/5 flex items-center gap-2">
                                <RefreshCcw size={14} /> {t('refresh')}
                            </button>
                        </div>
                    )}
                </div>
            </div>
            
            <div className="relative flex-1 w-full bg-stone-50/70 dark:bg-[#120c18] min-h-[280px] flex flex-col">
                {!hasChartData ? (
                    <div className="flex-1 w-full flex flex-col items-center justify-center gap-4 p-8">
                            <div className="bg-slate-100/80 dark:bg-white/5 p-5 rounded-full border border-slate-300/40 dark:border-white/5">
                                <BarChart3 size={32} className="text-slate-300 dark:text-slate-500" />
                            </div>
                            <p className="text-sm font-medium text-slate-500 dark:text-slate-400 text-center">{t('noSalesData')}</p>
                    </div>
                ) : (
                    <div className="w-full h-full px-4 md:px-8 pb-6 pt-8 flex items-end justify-between gap-2 md:gap-4 overflow-x-auto">
                        {monthKeys.map((key, i) => {
                            const height = hasChartData ? chartData[i] : 0; 
                            return (
                                <div key={i} className="flex-1 min-w-[30px] flex flex-col items-center gap-3 h-full justify-end group">
                                    <div className="w-full h-full flex items-end justify-center relative bg-slate-50 dark:bg-white/5 rounded-t-lg transition-colors group-hover:bg-slate-100 dark:group-hover:bg-white/10">
                                        <div
                                            style={{ height: `${height}%` }} 
                                            className="w-full mx-0.5 md:mx-1 bg-gradient-to-t from-pink-600 to-orange-400 opacity-90 rounded-t-md shadow-[0_0_14px_rgba(219,39,119,0.22)]"
                                        />
                                    </div>
                                    <span className="text-[10px] font-semibold text-slate-400 uppercase">
                                        {t(`monthsShort.${key}`).substring(0, 3)}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </CardWrapper>

        <CardWrapper className="col-span-12 lg:col-span-4 p-0 overflow-hidden min-h-[350px] md:min-h-[400px] border-2 border-slate-400/55 dark:border-white/18 ring-2 ring-slate-300/55 dark:ring-white/12 shadow-md shadow-slate-900/[0.06] dark:shadow-black/40">
            <div className="p-5 md:p-6 border-b border-slate-300/50 dark:border-white/5 flex justify-between items-center bg-stone-50/90 dark:bg-[#120c18] shrink-0">
                <h3 className="text-base md:text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                    <Activity size={18} className="text-slate-500 dark:text-orange-400" />
                    {t('latestActivities')}
                </h3>
                <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => navigate('/activity-management')} 
                    className="text-xs font-medium text-slate-600 hover:text-pink-600 hover:bg-stone-200/70 dark:text-pink-400 dark:hover:text-pink-300 dark:hover:bg-pink-500/10 px-3 py-1 h-auto"
                >
                    {t('viewAll')}
                </Button>
            </div>
            
            <div className="flex-1 w-full bg-stone-50/70 dark:bg-[#120c18] h-[340px] overflow-y-auto flex flex-col touch-pan-y">
                {deals.length > 0 ? (
                    <div className="p-3 md:p-4 space-y-1 md:space-y-2">
                        {deals.map((d, i) => (
                            <div key={i} className="flex items-center justify-between p-3 md:p-4 rounded-xl hover:bg-slate-100/80 dark:hover:bg-white/5 transition-colors border border-transparent hover:border-slate-300/40 dark:hover:border-white/5 cursor-default group">
                                <div className="flex items-center gap-3 md:gap-4 min-w-0">
                                    <div
                                      className={cn(
                                        'w-9 h-9 md:w-10 md:h-10 shrink-0 rounded-full flex items-center justify-center text-[10px] md:text-xs font-bold border-2 transition-transform group-hover:scale-105 bg-slate-100 border-slate-300/50 text-slate-600',
                                        i % 2 === 0
                                          ? 'dark:bg-pink-500/10 dark:border-pink-500/20 dark:text-pink-400'
                                          : 'dark:bg-orange-500/10 dark:border-orange-500/20 dark:text-orange-400'
                                      )}
                                    >
                                            {d.c ? d.c.substring(0, 2).toUpperCase() : '??'}
                                    </div>
                                    <div className="min-w-0">
                                        <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate pr-2">{d.c}</h4>
                                        <p className="text-xs text-slate-500 mt-0.5 truncate">{d.s}</p>
                                    </div>
                                </div>
                                <div className="text-right shrink-0">
                                    <p className="text-sm font-bold text-slate-800 dark:text-white">{d.a || '-'}</p>
                                    <span className="text-[10px] text-slate-400 block mt-0.5">{d.d}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="flex-1 w-full flex flex-col items-center justify-center gap-6">
                        <div className="bg-slate-100/80 dark:bg-white/5 p-6 rounded-full border border-slate-300/35 dark:border-transparent">
                            <Package size={32} className="opacity-40" />
                        </div>
                        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{t('noActivities')}</p>
                    </div>
                )}
            </div>
        </CardWrapper>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 shrink-0">
        {[
            { 
              t: t('quickStats.pendingTasks'), 
              d: t('quickStats.checkTasks'), 
              i: Clock, 
              c: 'text-slate-600 dark:text-orange-400', 
              bg: 'bg-slate-100 dark:bg-orange-500/10',
              link: '/daily-tasks'
            },
            { 
              t: t('quickStats.openQuotations'), 
              d: t('quickStats.reviewQuotations'), 
              i: FileText, 
              c: 'text-slate-600 dark:text-pink-400', 
              bg: 'bg-slate-100 dark:bg-pink-500/10',
              link: '/quotations'
            },
            { 
              t: t('quickStats.criticalStock'), 
              d: t('quickStats.stockStatus'), 
              i: Package, 
              c: 'text-slate-600 dark:text-purple-400', 
              bg: 'bg-slate-100 dark:bg-purple-500/10',
              link: '/stocks'
            },
        ].map((x, k) => (
            <CardWrapper 
                key={k} 
                onClick={() => navigate(x.link)}
                interactive={true}
                prominentHover
                className="min-h-[120px] md:min-h-[140px]"
            >
                <div className="flex items-center gap-5 md:gap-8 h-full px-1">
                    <div className={`w-14 h-14 md:w-16 md:h-16 rounded-2xl flex items-center justify-center ${x.bg} ${x.c} shrink-0 transition-transform group-hover:scale-105`}>
                        <x.i 
                          strokeWidth={1.5} 
                          className="w-6 h-6 md:w-7 md:h-7" 
                        />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-slate-800 dark:text-white font-bold text-base md:text-lg truncate">{x.t}</h4>
                      <p className="text-slate-500 dark:text-slate-400 text-xs md:text-sm mt-0.5 md:mt-1 line-clamp-1 md:line-clamp-none">{x.d}</p>
                    </div>
                </div>
            </CardWrapper>
        ))}
      </div>

    </div>
  );
}
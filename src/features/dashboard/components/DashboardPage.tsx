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
};

function CardWrapper({ children, className = '', noPadding = false, onClick, interactive = false }: CardWrapperProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "bg-white dark:bg-[#120c18] border border-slate-200 dark:border-white/5 rounded-xl shadow-sm",
        "flex flex-col relative overflow-hidden",
        interactive && [
            "cursor-pointer transition-all duration-300 ease-out",
            "hover:shadow-lg hover:shadow-pink-500/10 hover:-translate-y-0.5",
            "hover:border-pink-500/30 dark:hover:border-pink-500/30",
            "active:scale-[0.99]",
        ],
        noPadding ? 'p-0' : 'p-6',
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
      <div className="flex items-center justify-center h-screen">
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
      color: 'text-blue-600 dark:text-blue-400',
      bg: 'bg-blue-50 dark:bg-blue-500/20',
    },
    {
      l: t('stats.activeOpportunities'),
      v: kpis?.activeAgreements ? String(kpis.activeAgreements) : '0',
      c: kpis?.activeAgreementsChange ? `${kpis.activeAgreementsChange}%` : '0%',
      p: (kpis?.activeAgreementsChange ?? 0) >= 0 ? 1 : 0,
      i: Users,
      color: 'text-violet-600 dark:text-violet-400',
      bg: 'bg-violet-50 dark:bg-violet-500/20',
    },
    {
      l: t('stats.newLeads'),
      v: kpis && 'newLeads' in kpis ? String(kpis.newLeads) : '0', 
      c: '0%', 
      p: 1,
      i: Users,
      color: 'text-pink-600 dark:text-pink-400',
      bg: 'bg-pink-50 dark:bg-pink-500/20',
    },
    {
      l: t('stats.pendingOrders'),
      v: kpis && 'pendingOrders' in kpis ? String(kpis.pendingOrders) : '0',
      c: '0%', 
      p: 0,
      i: ShoppingCart,
      color: 'text-orange-600 dark:text-orange-400',
      bg: 'bg-orange-50 dark:bg-orange-500/20',
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
    <div className="flex flex-col h-full gap-6 p-4 md:p-8 overflow-x-hidden overflow-y-auto w-full">
      
      <div className="flex-none flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white mb-1 flex items-center gap-2">
            <span>{t(`greeting.${timeOfDay}`)},</span>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-600 to-orange-500">
              <span className="md:hidden">{firstName}</span>
              <span className="hidden md:inline">{displayName}</span>
            </span>
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium flex items-center gap-2">
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
                  "bg-white dark:bg-[#120c18] border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-200 h-10 shadow-sm min-w-[100px] transition-all duration-300",
                  "hover:bg-pink-50 dark:hover:bg-pink-500/10 hover:border-pink-200 dark:hover:border-pink-500/30 hover:text-pink-600 dark:hover:text-pink-400",
                  "group"
                )}
            >
                <RefreshCcw size={16} className={cn("mr-2 transition-colors group-hover:text-pink-600 dark:group-hover:text-pink-400", isRefetching && "animate-spin")} />
                {isRefetching ? t('refreshing') : t('refresh')}
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                    className="bg-gradient-to-r from-pink-600 to-orange-600 text-white border-0 shadow-lg shadow-pink-500/20 hover:shadow-pink-500/40 hover:scale-[1.02] transition-all h-10 px-6"
                >
                    <Zap size={16} className="mr-2" />
                    {t('quickAction')}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64 bg-white dark:bg-[#120c18] border border-slate-200 dark:border-white/10 shadow-xl rounded-xl p-1.5">
                
                <DropdownMenuLabel className="text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase tracking-wider px-2 py-1.5 opacity-70">
                  {t('sidebar.customers')}
                </DropdownMenuLabel>
                
                <DropdownMenuItem 
                  onClick={() => navigate('/customer-management')} 
                  className="group cursor-pointer rounded-lg py-2.5 px-2 mb-1 transition-all duration-200 hover:bg-pink-50 dark:hover:bg-pink-500/10 focus:bg-pink-50 dark:focus:bg-pink-500/10 outline-none"
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
                  className="group cursor-pointer rounded-lg py-2.5 px-2 mb-1 transition-all duration-200 hover:bg-pink-50 dark:hover:bg-pink-500/10 focus:bg-pink-50 dark:focus:bg-pink-500/10 outline-none"
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
                  className="group cursor-pointer rounded-lg py-2.5 px-2 mb-1 transition-all duration-200 focus:bg-pink-50 dark:focus:bg-pink-500/10 outline-none"
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
                  className="group cursor-pointer rounded-lg py-2.5 px-2 transition-all duration-200 focus:bg-pink-50 dark:focus:bg-pink-500/10 outline-none"
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
                  className="group cursor-pointer rounded-lg py-2.5 px-2 transition-all duration-200 focus:bg-pink-50 dark:focus:bg-pink-500/10 outline-none"
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

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 shrink-0">
        {stats.map((s, i) => (
          <CardWrapper 
            key={i} 
            interactive={false} 
            className="min-h-[180px]"
          >
            <div className="flex flex-col justify-between h-full">
              <div className="flex justify-between items-start">
                <div className={`p-3.5 rounded-xl ${s.bg} ${s.color}`}>
                  <s.i size={24} />
                </div>
                {s.c !== '0%' && (
                  <span className={`flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full border ${s.p ? 'bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20' : 'bg-red-50 text-red-600 border-red-100 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20'}`}>
                    {s.p ? <ArrowUpRight size={12} strokeWidth={3} /> : <ArrowDownRight size={12} strokeWidth={3} />}
                    {s.c}
                  </span>
                )}
              </div>
              
              <div>
                <h3 className="text-slate-500 dark:text-slate-400 text-sm font-medium uppercase tracking-wide">{s.l}</h3>
                <p 
                  className="text-3xl font-bold text-slate-900 dark:text-white mt-2 truncate font-sans" 
                  title={s.v}
                >
                  {s.v}
                </p>
              </div>
            </div>
          </CardWrapper>
        ))}
      </div>

      <div className="grid grid-cols-12 gap-6 min-h-[400px]">
        
        <CardWrapper className="col-span-12 lg:col-span-8 p-0 overflow-hidden min-h-[400px]">
            <div className="p-6 border-b border-slate-100 dark:border-white/5 flex justify-between items-center bg-white dark:bg-[#120c18] shrink-0">
                <div>
                    <h3 className="text-lg font-bold flex items-center gap-2 text-slate-800 dark:text-white">
                        <TrendingUp size={20} className="text-pink-500" />
                        {t('salesAnalysis')}
                    </h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 ml-7">{t('targetVsActual')}</p>
                </div>
                
                <div className="relative" ref={chartMenuRef}>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-slate-600 dark:hover:text-white" onClick={() => setChartMenuOpen(!chartMenuOpen)}>
                        <MoreHorizontal size={18} />
                    </Button>
                    {chartMenuOpen && (
                        <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-[#1a1025] border border-slate-200 dark:border-white/10 rounded-lg shadow-xl z-50 py-1">
                            <button onClick={() => { refetch(); setChartMenuOpen(false); }} className="w-full text-left px-4 py-2.5 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-white/5 flex items-center gap-2">
                                <RefreshCcw size={14} /> {t('refresh')}
                            </button>
                        </div>
                    )}
                </div>
            </div>
            
            <div className="relative flex-1 w-full bg-white dark:bg-[#120c18] h-[340px] flex flex-col">
                {!hasChartData ? (
                    <div className="flex-1 w-full flex flex-col items-center justify-center gap-4">
                            <div className="bg-slate-50 dark:bg-white/5 p-5 rounded-full border border-slate-100 dark:border-white/5">
                                <BarChart3 size={36} className="text-slate-300 dark:text-slate-500" />
                            </div>
                            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{t('noSalesData')}</p>
                    </div>
                ) : (
                    <div className="w-full h-full px-8 pb-6 pt-8 flex items-end justify-between gap-4">
                        {monthKeys.map((key, i) => {
                            const height = hasChartData ? chartData[i] : 0; 
                            return (
                                <div key={i} className="flex-1 flex flex-col items-center gap-3 h-full justify-end group">
                                    <div className="w-full h-full flex items-end justify-center relative bg-slate-50 dark:bg-white/5 rounded-t-lg transition-colors group-hover:bg-slate-100 dark:group-hover:bg-white/10">
                                        <div
                                            style={{ height: `${height}%` }} 
                                            className="w-full mx-1 bg-gradient-to-t from-pink-600 to-orange-400 opacity-90 rounded-t-md shadow-[0_0_15px_rgba(236,72,153,0.3)]"
                                        />
                                    </div>
                                    <span className="text-xs font-semibold text-slate-400 uppercase">
                                        {t(`monthsShort.${key}`).substring(0, 3)}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </CardWrapper>

        <CardWrapper className="col-span-12 lg:col-span-4 p-0 overflow-hidden min-h-[400px]">
            <div className="p-6 border-b border-slate-100 dark:border-white/5 flex justify-between items-center bg-white dark:bg-[#120c18] shrink-0">
                <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                    <Activity size={20} className="text-orange-500" />
                    {t('latestActivities')}
                </h3>
                <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => navigate('/activity-management')} 
                    className="text-xs font-medium text-pink-600 hover:text-pink-700 hover:bg-pink-50 dark:hover:bg-pink-500/10 px-3 py-1 h-auto"
                >
                    {t('viewAll')}
                </Button>
            </div>
            
            <div className="flex-1 w-full bg-white dark:bg-[#120c18] h-[340px] overflow-y-auto flex flex-col">
                {deals.length > 0 ? (
                    <div className="p-4 space-y-2">
                        {deals.map((d, i) => (
                            <div key={i} className="flex items-center justify-between p-4 rounded-xl hover:bg-slate-50 dark:hover:bg-white/5 transition-colors border border-transparent hover:border-slate-100 dark:hover:border-white/5 cursor-default group">
                                <div className="flex items-center gap-4">
                                    <div className={`w-10 h-10 shrink-0 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-transform group-hover:scale-105 ${
                                        i % 2 === 0
                                            ? 'bg-pink-50 border-pink-100 text-pink-600 dark:bg-pink-500/10 dark:border-pink-500/20 dark:text-pink-400'
                                            : 'bg-orange-50 border-orange-100 text-orange-600 dark:bg-orange-500/10 dark:border-orange-500/20 dark:text-orange-400'
                                    }`}>
                                            {d.c ? d.c.substring(0, 2).toUpperCase() : '??'}
                                    </div>
                                    <div className="min-w-0">
                                        <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[150px]">{d.c}</h4>
                                        <p className="text-xs text-slate-500 mt-0.5 truncate">{d.s}</p>
                                    </div>
                                </div>
                                <div className="text-right shrink-0">
                                    <p className="text-sm font-bold text-slate-900 dark:text-white">{d.a || '-'}</p>
                                    <span className="text-[10px] text-slate-400 block mt-0.5">{d.d}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="flex-1 w-full flex flex-col items-center justify-center gap-6">
                        <div className="bg-slate-50 dark:bg-white/5 p-6 rounded-full">
                            <Package size={32} className="opacity-40" />
                        </div>
                        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{t('noActivities')}</p>
                    </div>
                )}
            </div>
        </CardWrapper>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 shrink-0">
        {[
            { 
              t: t('quickStats.pendingTasks'), 
              d: t('quickStats.checkTasks'), 
              i: Clock, 
              c: 'text-orange-600 dark:text-orange-400', 
              bg: 'bg-orange-50 dark:bg-orange-500/10',
              link: '/daily-tasks'
            },
            { 
              t: t('quickStats.openQuotations'), 
              d: t('quickStats.reviewQuotations'), 
              i: FileText, 
              c: 'text-pink-600 dark:text-pink-400', 
              bg: 'bg-pink-50 dark:bg-pink-500/10',
              link: '/quotations'
            },
            { 
              t: t('quickStats.criticalStock'), 
              d: t('quickStats.stockStatus'), 
              i: Package, 
              c: 'text-purple-600 dark:text-purple-400', 
              bg: 'bg-purple-50 dark:bg-purple-500/10',
              link: '/stocks'
            },
        ].map((x, k) => (
            <CardWrapper 
                key={k} 
                onClick={() => navigate(x.link)}
                interactive={true}
                className="min-h-[140px]"
            >
                <div className="flex items-center gap-8 h-full px-2">
                    <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${x.bg} ${x.c} shrink-0 transition-transform group-hover:scale-105`}>
                        <x.i size={28} strokeWidth={1.5} />
                    </div>
                    <div>
                      <h4 className="text-slate-900 dark:text-white font-bold text-lg">{x.t}</h4>
                      <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">{x.d}</p>
                    </div>
                </div>
            </CardWrapper>
        ))}
      </div>

    </div>
  );
}

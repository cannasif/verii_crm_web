import { type ReactElement, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useUIStore } from '@/stores/ui-store';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/stores/auth-store';
import { formatSystemDate } from '@/lib/system-settings';
import { clearPerfMarks, perfMark, perfMeasureOnNextPaint } from '@/lib/perf-metrics';
import { AssignedReportsDashboardSection } from '@/features/report-builder/components/AssignedReportsDashboardSection';
import {
  Zap,
  CalendarDays,
  UserPlus,
  FilePlus,
  ShoppingBag,
  PlusCircle,
  CalendarPlus,
} from 'lucide-react';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function DashboardPage(): ReactElement {
  const { t } = useTranslation('dashboard');
  const navigate = useNavigate();
  const { setPageTitle } = useUIStore();
  const { user } = useAuthStore();

  const [timeOfDay, setTimeOfDay] = useState<'morning' | 'afternoon' | 'evening'>('morning');

  useEffect(() => {
    const startMark = 'dashboard:mount:start';
    clearPerfMarks(startMark, 'dashboard:mount_to_paint', 'dashboard:mount_to_paint:end');
    perfMark(startMark);
    perfMeasureOnNextPaint('dashboard:mount_to_paint', startMark);
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

  const formatDate = (): string => {
    return formatSystemDate(new Date());
  };

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

      <AssignedReportsDashboardSection />

    </div>
  );
}

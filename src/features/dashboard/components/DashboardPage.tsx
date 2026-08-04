import { type ReactElement, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useUIStore } from '@/stores/ui-store';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/stores/auth-store';
import { formatSystemDate } from '@/lib/system-settings';
import { clearPerfMarks, perfMark, perfMeasureOnNextPaint } from '@/lib/perf-metrics';
import { AssignedReportsDashboardSection } from '@/features/report-builder/components/AssignedReportsDashboardSection';
import { MyActivitiesCalendar } from './MyActivitiesCalendar';
import {
  Zap,
  CalendarDays,
  UserPlus,
  FilePlus,
  ShoppingBag,
  PlusCircle,
  CalendarPlus,
  Pencil,
  Eye,
  Database,
  BarChart3,
} from 'lucide-react';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from '@/lib/utils';
import { CRM_MENU_ITEM_INTERACTIVE_CLASS } from '@/lib/menu-interactive-styles';
import type { LucideIcon } from 'lucide-react';

type QuickActionTone = 'blue' | 'amber' | 'violet';

const QUICK_ACTION_ICON_TONE: Record<QuickActionTone, string> = {
  blue: 'bg-blue-50 text-blue-600 dark:bg-blue-500/15 dark:text-blue-300',
  amber: 'bg-amber-50 text-amber-600 dark:bg-amber-500/15 dark:text-amber-300',
  violet: 'bg-violet-50 text-violet-600 dark:bg-violet-500/15 dark:text-violet-300',
};

const QUICK_ACTION_DOT_TONE: Record<QuickActionTone, string> = {
  blue: 'bg-blue-400',
  amber: 'bg-amber-400',
  violet: 'bg-violet-400',
};

function QuickActionSectionLabel({ tone, children }: { tone: QuickActionTone; children: ReactElement | string }) {
  return (
    <DropdownMenuLabel className="flex items-center gap-1.5 px-2 py-1.5 text-[10px] font-black uppercase tracking-wider text-slate-400 opacity-90 dark:text-slate-500">
      <span className={cn('h-1.5 w-1.5 rounded-full', QUICK_ACTION_DOT_TONE[tone])} />
      {children}
    </DropdownMenuLabel>
  );
}

function QuickActionItem({ icon: Icon, tone, label, description, onClick }: {
  icon: LucideIcon;
  tone: QuickActionTone;
  label: string;
  description?: string;
  onClick: () => void;
}) {
  return (
    <DropdownMenuItem onClick={onClick} className={cn(CRM_MENU_ITEM_INTERACTIVE_CLASS, 'group mb-0.5 rounded-xl p-2.5 last:mb-0')}>
      <div className="flex items-center gap-3">
        <div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-transform duration-200 group-hover:scale-110 group-focus:scale-110', QUICK_ACTION_ICON_TONE[tone])}>
          <Icon size={16} />
        </div>
        <div className="min-w-0">
          <div className="text-sm font-bold text-slate-800 transition-colors dark:text-slate-100 group-focus:text-[var(--crm-brand-primary)] group-data-[highlighted]:text-[var(--crm-brand-primary)]">
            {label}
          </div>
          {description && <div className="truncate text-[11px] font-medium text-slate-400 dark:text-slate-500">{description}</div>}
        </div>
      </div>
    </DropdownMenuItem>
  );
}

export function DashboardPage(): ReactElement {
  const { t } = useTranslation('dashboard');
  const navigate = useNavigate();
  const { setPageTitle } = useUIStore();
  const { user } = useAuthStore();

  const [timeOfDay, setTimeOfDay] = useState<'morning' | 'afternoon' | 'evening'>('morning');
  const [dashboardMode, setDashboardMode] = useState<'view' | 'edit'>('view');
  const [activeTab, setActiveTab] = useState<'reports' | 'calendar'>('calendar');
  const tCommon = useTranslation('common').t;

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
            <span className="text-transparent bg-clip-text bg-linear-to-r from-primary to-orange-500">
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
          {activeTab === 'reports' && <Button
            type="button"
            variant="outline"
            onClick={() => setDashboardMode((current) => (current === 'view' ? 'edit' : 'view'))}
            className="hidden md:inline-flex h-10 px-4 font-semibold border-slate-300/70 dark:border-white/15 hover:bg-slate-100 dark:hover:bg-white/5"
          >
            {dashboardMode === 'view' ? (
              <>
                <Pencil size={16} className="mr-2" />
                {tCommon('common.reportBuilder.dashboardTabEdit')}
              </>
            ) : (
              <>
                <Eye size={16} className="mr-2" />
                {tCommon('common.reportBuilder.dashboardTabView')}
              </>
            )}
          </Button>}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                className="flex-1 md:flex-none bg-[image:var(--crm-brand-gradient)] text-white border-0 shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/30 hover:scale-[1.02] transition-all h-10 px-6 font-bold opacity-90 grayscale-[0] dark:opacity-100 dark:grayscale-0"
              >
                <Zap size={16} className="mr-2" />
                {t('quickAction')}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className={cn(
                'w-80 overflow-hidden rounded-2xl border border-slate-300/70 bg-stone-50/95 p-1.5 pt-[env(safe-area-inset-top)] shadow-xl shadow-slate-900/10 dark:border-white/10 dark:bg-[#120c18]',
                'data-[state=open]:duration-300 data-[state=open]:ease-[cubic-bezier(0.16,1,0.3,1)]',
                'data-[state=closed]:duration-150 data-[state=closed]:ease-in',
                'data-[state=open]:zoom-in-90 data-[state=open]:slide-in-from-top-3',
              )}
            >
              <div className="pointer-events-none -mx-1.5 -mt-1.5 mb-1.5 h-1 bg-[image:var(--crm-brand-gradient)]" aria-hidden />

              <QuickActionSectionLabel tone="blue">{t('sidebar.customers')}</QuickActionSectionLabel>
              <QuickActionItem
                icon={UserPlus}
                tone="blue"
                label={t('sidebar.customerManagement')}
                description={t('quickActionMenu.customerManagement')}
                onClick={() => navigate('/customer-management')}
              />

              <DropdownMenuSeparator className="my-1.5 bg-slate-100 dark:bg-white/5" />

              <QuickActionSectionLabel tone="amber">{t('sidebar.salesManagement')}</QuickActionSectionLabel>
              <QuickActionItem
                icon={PlusCircle}
                tone="amber"
                label={t('sidebar.demandCreateWizard')}
                description={t('quickActionMenu.demandCreateWizard')}
                onClick={() => navigate('/demands/create')}
              />
              <QuickActionItem
                icon={FilePlus}
                tone="amber"
                label={t('sidebar.quotationCreateWizard')}
                description={t('quickActionMenu.quotationCreateWizard')}
                onClick={() => navigate('/quotations/create')}
              />
              <QuickActionItem
                icon={ShoppingBag}
                tone="amber"
                label={t('sidebar.orderCreateWizard')}
                description={t('quickActionMenu.orderCreateWizard')}
                onClick={() => navigate('/orders/create')}
              />
              <QuickActionItem
                icon={Database}
                tone="amber"
                label={t('sidebar.erpOrderList')}
                description={t('quickActionMenu.erpOrderList')}
                onClick={() => navigate('/orders/erp')}
              />

              <DropdownMenuSeparator className="my-1.5 bg-slate-100 dark:bg-white/5" />

              <QuickActionSectionLabel tone="violet">{t('sidebar.activities')}</QuickActionSectionLabel>
              <QuickActionItem
                icon={CalendarPlus}
                tone="violet"
                label={t('sidebar.activityManagement')}
                description={t('quickActionMenu.activityManagement')}
                onClick={() => navigate('/activity-management')}
              />
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="flex w-full max-w-xl rounded-xl border border-slate-200 bg-white p-1 shadow-sm dark:border-white/10 dark:bg-[#130d1b]" role="tablist" aria-label={t('tabs.label')}>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'calendar'}
          onClick={() => setActiveTab('calendar')}
          className={cn('flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition', activeTab === 'calendar' ? 'bg-[image:var(--crm-brand-gradient)] text-white shadow-sm shadow-primary/20' : 'text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-white/5')}
        >
          <CalendarDays size={15} />{t('tabs.calendar')}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'reports'}
          onClick={() => setActiveTab('reports')}
          className={cn('flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition', activeTab === 'reports' ? 'bg-[image:var(--crm-brand-gradient)] text-white shadow-sm shadow-primary/20' : 'text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-white/5')}
        >
          <BarChart3 size={15} />{t('tabs.reports')}
        </button>
      </div>

      {activeTab === 'reports'
        ? <AssignedReportsDashboardSection mode={dashboardMode} onModeChange={setDashboardMode} />
        : <MyActivitiesCalendar />}

    </div>
  );
}

import { type ReactElement } from 'react';
import {
  ChartNoAxesCombined,
  CircleGauge,
  Landmark,
  type LucideIcon,
  TrendingUp,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

export type Salesmen360TabKey = 'overview' | 'performance' | 'analytics' | 'erpMovements';

interface ReportTabDefinition {
  value: Salesmen360TabKey;
  label: string;
  description: string;
  icon: LucideIcon;
  visible: boolean;
}

export function SalesmenReportTabs({
  isTeamView,
  showErpMovements,
}: {
  isTeamView: boolean;
  showErpMovements: boolean;
}): ReactElement {
  const { t } = useTranslation();
  const tabs: ReportTabDefinition[] = [
    {
      value: 'overview',
      label: t('salesman360.tabs.overview'),
      description: t('salesman360.tabs.overviewDescription', {
        defaultValue: 'Priorities and quick outcomes',
      }),
      icon: CircleGauge,
      visible: true,
    },
    {
      value: 'performance',
      label: t('salesman360.performance.title'),
      description: isTeamView
        ? t('salesman360.tabs.teamPerformanceDescription', {
            defaultValue: 'Salesperson comparison',
          })
        : t('salesman360.tabs.performanceDescription', {
            defaultValue: 'Funnel, conversion and activity',
          }),
      icon: ChartNoAxesCombined,
      visible: true,
    },
    {
      value: 'analytics',
      label: t('salesman360.tabs.analytics'),
      description: t('salesman360.tabs.analyticsDescription', {
        defaultValue: 'Amounts, distribution and trends',
      }),
      icon: TrendingUp,
      visible: !isTeamView,
    },
    {
      value: 'erpMovements',
      label: t('salesman360.tabs.erpMovements'),
      description: t('salesman360.tabs.erpMovementsDescription', {
        defaultValue: 'ERP records and movement detail',
      }),
      icon: Landmark,
      visible: showErpMovements,
    },
  ];

  return (
    <div className="overflow-x-auto pb-1">
      <TabsList
        className={cn(
          'grid h-auto gap-2 rounded-2xl border border-slate-200 bg-white/75 p-2 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/3',
          isTeamView ? 'min-w-[360px] grid-cols-2' : 'min-w-[680px] grid-cols-4'
        )}
      >
        {tabs.map((tab) => {
          const Icon = tab.icon;

          return (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              disabled={!tab.visible}
              className={cn(
                'group h-auto min-h-16 justify-start rounded-xl px-3 py-2.5 text-left',
                'data-[state=active]:border-primary/20 data-[state=active]:bg-primary/7 data-[state=active]:text-primary data-[state=active]:shadow-sm',
                !tab.visible && 'hidden'
              )}
            >
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-500 transition-colors group-data-[state=active]:border-primary/20 group-data-[state=active]:bg-primary/10 group-data-[state=active]:text-primary dark:border-white/10 dark:bg-white/5">
                <Icon className="size-4.5" />
              </span>
              <span className="min-w-0">
                <span className="block truncate text-[13px] font-black">{tab.label}</span>
                <span className="mt-0.5 block truncate text-[10px] font-semibold text-slate-400 group-data-[state=active]:text-primary/70">
                  {tab.description}
                </span>
              </span>
            </TabsTrigger>
          );
        })}
      </TabsList>
    </div>
  );
}

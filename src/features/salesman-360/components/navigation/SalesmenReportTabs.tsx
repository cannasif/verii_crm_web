import { type ReactElement } from 'react';
import {
  Activity,
  Boxes,
  ChartNoAxesCombined,
  ClipboardList,
  ContactRound,
  FileCheck2,
  Gauge,
  ShoppingCart,
  TableProperties,
  type LucideIcon,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { TabsList, TabsTrigger } from '@/components/ui/tabs';

export type Salesmen360TabKey =
  | 'overview'
  | 'sales'
  | 'demand'
  | 'quotation'
  | 'order'
  | 'activity'
  | 'customer'
  | 'stock'
  | 'movement';

interface ReportTabDefinition {
  value: Salesmen360TabKey;
  label: string;
  icon: LucideIcon;
}

export function SalesmenReportTabs(): ReactElement {
  const { t } = useTranslation();
  const tabs: ReportTabDefinition[] = [
    {
      value: 'overview',
      label: t('salesman360.reportTabs.overview', { defaultValue: 'Genel bakış' }),
      icon: Gauge,
    },
    {
      value: 'sales',
      label: t('salesman360.reportTabs.sales', {
        defaultValue: 'Satış performansı',
      }),
      icon: ChartNoAxesCombined,
    },
    {
      value: 'demand',
      label: t('salesman360.reportTabs.demand', {
        defaultValue: 'Talep performansı',
      }),
      icon: ClipboardList,
    },
    {
      value: 'quotation',
      label: t('salesman360.reportTabs.quotation', {
        defaultValue: 'Teklif performansı',
      }),
      icon: FileCheck2,
    },
    {
      value: 'order',
      label: t('salesman360.reportTabs.order', {
        defaultValue: 'Sipariş performansı',
      }),
      icon: ShoppingCart,
    },
    {
      value: 'activity',
      label: t('salesman360.reportTabs.activity', {
        defaultValue: 'Aktivite performansı',
      }),
      icon: Activity,
    },
    {
      value: 'customer',
      label: t('salesman360.reportTabs.customer', { defaultValue: 'Cari analizi' }),
      icon: ContactRound,
    },
    {
      value: 'stock',
      label: t('salesman360.reportTabs.stock', { defaultValue: 'Stok analizi' }),
      icon: Boxes,
    },
    {
      value: 'movement',
      label: t('salesman360.reportTabs.movement', { defaultValue: 'Hareket pivotu' }),
      icon: TableProperties,
    },
  ];

  return (
    <div className="sticky top-0 z-20 overflow-x-auto border-y border-slate-200/80 bg-white/90 py-2 backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/90">
      <TabsList className="flex h-auto min-w-max gap-2 rounded-2xl border border-slate-200 bg-white/80 p-1.5 shadow-sm dark:border-white/10 dark:bg-white/3">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              className="group h-11 min-w-40 justify-start gap-2 rounded-xl px-3 text-xs font-black data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md"
            >
              <Icon className="size-4 shrink-0" aria-hidden />
              <span className="truncate">{tab.label}</span>
            </TabsTrigger>
          );
        })}
      </TabsList>
    </div>
  );
}

import { type ReactElement, useEffect, useState } from 'react';
import {
  Activity,
  Boxes,
  ChartNoAxesCombined,
  ClipboardList,
  ContactRound,
  FileCheck2,
  Gauge,
  Eye,
  EyeOff,
  Pin,
  PinOff,
  ShoppingCart,
  TableProperties,
  Target,
  type LucideIcon,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/stores/auth-store';
import { cn } from '@/lib/utils';

export type Salesmen360TabKey =
  | 'overview'
  | 'sales'
  | 'demand'
  | 'quotation'
  | 'order'
  | 'activity'
  | 'customer'
  | 'stock'
  | 'movement'
  | 'planning';

export type Salesmen360PerformanceSection = Exclude<Salesmen360TabKey, 'planning'>;

interface ReportTabDefinition {
  value: Salesmen360TabKey;
  label: string;
  icon: LucideIcon;
}

export function SalesmenReportTabs({ showPlanning = false }: { showPlanning?: boolean }): ReactElement {
  const { t } = useTranslation();
  const userId = useAuthStore((state) => state.user?.id ?? 0);
  const storageKey = `salesmen360:report-tabs:v1:${userId || 'anonymous'}`;
  const [preferences, setPreferences] = useState(() => {
    try {
      const stored = JSON.parse(window.localStorage.getItem(storageKey) ?? 'null') as { pinned?: boolean; visible?: boolean } | null;
      return { pinned: stored?.pinned ?? true, visible: stored?.visible ?? true };
    } catch {
      return { pinned: true, visible: true };
    }
  });

  useEffect(() => {
    window.localStorage.setItem(storageKey, JSON.stringify(preferences));
  }, [preferences, storageKey]);
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
    ...(showPlanning ? [{
      value: 'planning' as const,
      label: t('salesman360.reportTabs.planning', { defaultValue: 'Hedef ve tahmin' }),
      icon: Target,
    }] : []),
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
    <div className={cn('z-20 flex items-center gap-2 border-y border-slate-200/80 bg-white/90 py-2 backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/90', preferences.pinned && 'sticky top-0')}>
      {preferences.visible ? <div className="min-w-0 flex-1 overflow-x-auto">
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
      </div> : <div className="flex-1 px-2 text-xs font-bold text-slate-400">Rapor sekmeleri gizlendi</div>}
      <div className="mr-2 flex shrink-0 items-center gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-sm dark:border-white/10 dark:bg-white/5">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={cn('size-8 rounded-lg', preferences.pinned && 'bg-primary/10 text-primary')}
          title={preferences.pinned ? 'Sekme çubuğunun sabitliğini kaldır' : 'Sekme çubuğunu üste sabitle'}
          aria-label={preferences.pinned ? 'Sekme çubuğunun sabitliğini kaldır' : 'Sekme çubuğunu üste sabitle'}
          onClick={() => setPreferences((current) => ({ ...current, pinned: !current.pinned }))}
        >
          {preferences.pinned ? <Pin className="size-4" /> : <PinOff className="size-4" />}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-8 rounded-lg"
          title={preferences.visible ? 'Rapor sekmelerini gizle' : 'Rapor sekmelerini göster'}
          aria-label={preferences.visible ? 'Rapor sekmelerini gizle' : 'Rapor sekmelerini göster'}
          onClick={() => setPreferences((current) => ({ ...current, visible: !current.visible }))}
        >
          {preferences.visible ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
        </Button>
      </div>
    </div>
  );
}

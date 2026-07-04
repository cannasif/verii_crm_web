import { type ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { Layers, CheckCircle2, Zap } from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import type { CustomerTypeStats as CustomerTypeStatsData } from '../hooks/useCustomerTypeStats';

const CUSTOMER_TYPE_NS = 'customer-type-management' as const;

interface CustomerTypeStatsProps {
  stats?: CustomerTypeStatsData;
  isLoading?: boolean;
}

export function CustomerTypeStats({ stats, isLoading = false }: CustomerTypeStatsProps): ReactElement {
  const { t } = useTranslation([CUSTOMER_TYPE_NS, 'common']);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="border-slate-300/80 bg-stone-50/95 shadow-sm ring-1 ring-slate-200/60 dark:border-white/5 dark:bg-[#1a1025]/40 dark:ring-0">
            <CardHeader>
              <CardTitle className="text-sm font-medium text-slate-400">
                {t('loading', { ns: CUSTOMER_TYPE_NS })}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-8 w-20 animate-pulse rounded bg-slate-200 dark:bg-white/10" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!stats) {
    return <></>;
  }

  const cardStyle = `
    bg-stone-50/95 dark:bg-[#1a1025]/40
    border border-slate-300/80 dark:border-white/5
    shadow-sm ring-1 ring-slate-200/60 dark:ring-0
    hover:border-slate-400/70 hover:shadow-md dark:hover:border-primary/30
    hover:bg-stone-100/90 dark:hover:bg-[#1a1025]/80
    backdrop-blur-md
    transition-all duration-300
    group relative overflow-hidden
  `;

  const glowStyle =
    'absolute inset-0 bg-linear-to-r from-accent/0 to-amber-50/0 dark:from-primary/0 dark:to-amber-500/0 group-hover:from-accent/50 group-hover:to-amber-50/50 dark:group-hover:from-primary/5 dark:group-hover:to-amber-500/5 transition-all duration-500 pointer-events-none';

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      <Card className={cardStyle}>
        <div className={glowStyle} />
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
          <CardTitle className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            {t('stats.totalCustomerTypes', { ns: CUSTOMER_TYPE_NS })}
          </CardTitle>
          <div className="p-2 bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400 rounded-lg shadow-sm border border-blue-100 dark:border-blue-500/20">
            <Layers size={18} />
          </div>
        </CardHeader>
        <CardContent className="relative z-10">
          <div className="text-3xl font-bold text-slate-800 dark:text-white">{stats.totalCustomerTypes}</div>
        </CardContent>
      </Card>

      <Card className={cardStyle}>
        <div className={glowStyle} />
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
          <CardTitle className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            {t('stats.activeCustomerTypes', { ns: CUSTOMER_TYPE_NS })}
          </CardTitle>
          <div className="p-2 bg-green-50 text-green-600 dark:bg-green-500/10 dark:text-green-400 rounded-lg shadow-sm border border-green-100 dark:border-green-500/20">
            <CheckCircle2 size={18} />
          </div>
        </CardHeader>
        <CardContent className="relative z-10">
          <div className="text-3xl font-bold text-slate-800 dark:text-white">{stats.activeCustomerTypes}</div>
        </CardContent>
      </Card>

      <Card className={cardStyle}>
        <div className={glowStyle} />
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
          <CardTitle className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            {t('stats.newThisMonth', { ns: CUSTOMER_TYPE_NS })}
          </CardTitle>
          <div className="p-2 bg-orange-50 text-orange-600 dark:bg-orange-500/10 dark:text-orange-400 rounded-lg shadow-sm border border-orange-100 dark:border-orange-500/20">
            <Zap size={18} />
          </div>
        </CardHeader>
        <CardContent className="relative z-10">
          <div className="text-3xl font-bold text-slate-800 dark:text-white">{stats.newThisMonth}</div>
        </CardContent>
      </Card>
    </div>
  );
}

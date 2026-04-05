import { type ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { useCustomerStats } from '../hooks/useCustomerStats';
import { Users, CheckCircle2, Zap } from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

const CRM_NS = 'customer-management' as const;

export function CustomerStats(): ReactElement {
  const { t } = useTranslation(['customer-management', 'common']);
  const { data: stats, isLoading } = useCustomerStats();

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="border-slate-300/80 bg-stone-50/95 shadow-sm ring-1 ring-slate-200/60 dark:border-white/5 dark:bg-[#1a1025]/40 dark:ring-0">
            <CardHeader>
              <CardTitle className="text-sm font-medium text-slate-400">
                {t('customerManagement.loading', { ns: CRM_NS })}
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

  // HİBRİT KART STİLİ (MAGIC IS HERE)
  const cardStyle = `
    bg-stone-50/95 dark:bg-[#1a1025]/40
    border border-slate-300/80 dark:border-white/5
    shadow-sm ring-1 ring-slate-200/60 dark:ring-0
    hover:border-slate-400/70 hover:shadow-md dark:hover:border-pink-500/30
    hover:bg-stone-100/90 dark:hover:bg-[#1a1025]/80
    backdrop-blur-md
    transition-all duration-300
    group relative overflow-hidden
  `;
  
  const glowStyle = "absolute inset-0 bg-linear-to-r from-pink-50/0 to-orange-50/0 dark:from-pink-500/0 dark:to-orange-500/0 group-hover:from-pink-50/50 group-hover:to-orange-50/50 dark:group-hover:from-pink-500/5 dark:group-hover:to-orange-500/5 transition-all duration-500 pointer-events-none";

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      
      {/* Kart 1: Toplam Müşteri */}
      <Card className={cardStyle}>
        <div className={glowStyle} />
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
          <CardTitle className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            {t('customerManagement.stats.totalCustomers', { ns: CRM_NS })}
          </CardTitle>
          <div className="p-2 bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400 rounded-lg shadow-sm border border-blue-100 dark:border-blue-500/20">
             <Users size={18} />
          </div>
        </CardHeader>
        <CardContent className="relative z-10">
          <div className="text-3xl font-bold text-slate-800 dark:text-white">{stats.totalCustomers}</div>
        </CardContent>
      </Card>

      {/* Kart 2: Onaylı Müşteri */}
      <Card className={cardStyle}>
        <div className={glowStyle} />
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
          <CardTitle className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            {t('customerManagement.stats.approvedCustomers', { ns: CRM_NS })}
          </CardTitle>
          <div className="p-2 bg-green-50 text-green-600 dark:bg-green-500/10 dark:text-green-400 rounded-lg shadow-sm border border-green-100 dark:border-green-500/20">
             <CheckCircle2 size={18} />
          </div>
        </CardHeader>
        <CardContent className="relative z-10">
          <div className="text-3xl font-bold text-slate-800 dark:text-white">{stats.approvedCustomers}</div>
        </CardContent>
      </Card>

      {/* Kart 3: Bu Ay Yeni */}
      <Card className={cardStyle}>
        <div className={glowStyle} />
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
          <CardTitle className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            {t('customerManagement.stats.newThisMonth', { ns: CRM_NS })}
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
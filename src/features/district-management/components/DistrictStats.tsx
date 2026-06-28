import { type ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { MapPin, Activity, Calendar } from 'lucide-react';
import { useDistrictStats } from '../hooks/useDistrictStats';

export function DistrictStats(): ReactElement {
  const { t } = useTranslation();
  const { data: statsData, isLoading } = useDistrictStats();

  const cardStyle = `
    bg-white/40 dark:bg-white/[0.02] 
    border 
    shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.1)] 
    backdrop-blur-xl 
    group relative overflow-hidden transition-all duration-300
    hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] dark:hover:shadow-[0_8px_30px_rgb(0,0,0,0.2)] 
    hover:-translate-y-1
  `;

  const glowStyle = "absolute inset-0 bg-linear-to-r from-rose-50/0 to-amber-50/0 dark:from-rose-500/0 dark:to-amber-500/0 group-hover:from-rose-50/50 group-hover:to-amber-50/50 dark:group-hover:from-rose-500/5 dark:group-hover:to-amber-500/5 transition-all duration-500 pointer-events-none";

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Card key={i} className={`${cardStyle} border-slate-200/60 dark:border-white/10`}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
              <div className="h-4 w-24 animate-pulse rounded bg-slate-200 dark:bg-white/10" />
              <div className="h-8 w-8 animate-pulse rounded bg-slate-200 dark:bg-white/10" />
            </CardHeader>
            <CardContent className="relative z-10">
              <div className="h-8 w-16 animate-pulse rounded bg-slate-200 dark:bg-white/10" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const stats = [
    {
      title: t('districtManagement.stats.totalDistricts'),
      value: statsData?.totalDistricts ?? '-',
      icon: MapPin,
      iconContainerClass: 'bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400 border-rose-100 dark:border-rose-500/20',
      borderColor: 'border-rose-400/50 dark:border-rose-500/30',
    },
    {
      title: t('districtManagement.stats.activeDistricts'),
      value: statsData?.activeDistricts ?? '-',
      icon: Activity,
      iconContainerClass: 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400 border-amber-100 dark:border-amber-500/20',
      borderColor: 'border-amber-400/50 dark:border-amber-500/30',
    },
    {
      title: t('districtManagement.stats.newThisMonth'),
      value: statsData?.newThisMonth ?? '-',
      icon: Calendar,
      iconContainerClass: 'bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400 border-blue-100 dark:border-blue-500/20',
      borderColor: 'border-blue-400/50 dark:border-blue-500/30',
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
      {stats.map((stat, index) => (
        <Card key={index} className={`${cardStyle} ${stat.borderColor}`}>
          <div className={glowStyle} />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
            <CardTitle className="text-sm font-bold tracking-wider text-muted-foreground uppercase">
              {stat.title}
            </CardTitle>
            <div className={`p-2 rounded-lg border ${stat.iconContainerClass}`}>
              <stat.icon className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="text-2xl font-extrabold text-zinc-900 dark:text-white">
              {stat.value}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

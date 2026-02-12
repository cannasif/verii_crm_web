import { type ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { useActivityTypeStats } from '../hooks/useActivityTypeStats';
import { ListTodo, CheckCircle2, CalendarDays } from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

export function ActivityTypeStats(): ReactElement {
  const { t } = useTranslation();
  const { data: stats, isLoading } = useActivityTypeStats();

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="bg-white/50 dark:bg-[#1a1025]/40 border border-slate-200 dark:border-white/5 shadow-sm">
            <CardHeader>
              <CardTitle className="text-sm font-medium text-slate-400">
                {t('activityType.loading')}
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
    bg-white/60 dark:bg-[#1a1025]/40 
    hover:bg-white/90 dark:hover:bg-[#1a1025]/80
    border border-white/60 dark:border-white/5 
    shadow-sm hover:shadow-md 
    backdrop-blur-md 
    transition-all duration-300 
    hover:border-pink-500/30 
    group relative overflow-hidden
  `;
  
  const glowStyle = "absolute inset-0 bg-gradient-to-r from-pink-50/0 to-orange-50/0 dark:from-pink-500/0 dark:to-orange-500/0 group-hover:from-pink-50/50 group-hover:to-orange-50/50 dark:group-hover:from-pink-500/5 dark:group-hover:to-orange-500/5 transition-all duration-500 pointer-events-none";

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      
      <Card className={cardStyle}>
        <div className={glowStyle} />
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
          <CardTitle className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            {t('activityType.stats.totalActivityTypes')}
          </CardTitle>
          <div className="p-2 bg-violet-50 text-violet-600 dark:bg-violet-500/10 dark:text-violet-400 rounded-lg shadow-sm border border-violet-100 dark:border-violet-500/20">
             <ListTodo size={18} />
          </div>
        </CardHeader>
        <CardContent className="relative z-10">
          <div className="text-3xl font-bold text-slate-800 dark:text-white">{stats.totalActivityTypes}</div>
        </CardContent>
      </Card>

      {/* Kart 2: Aktif Aktivite Tipi (Yeşil Tema) */}
      <Card className={cardStyle}>
        <div className={glowStyle} />
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
          <CardTitle className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            {t('activityType.stats.activeActivityTypes')}
          </CardTitle>
          <div className="p-2 bg-green-50 text-green-600 dark:bg-green-500/10 dark:text-green-400 rounded-lg shadow-sm border border-green-100 dark:border-green-500/20">
             <CheckCircle2 size={18} />
          </div>
        </CardHeader>
        <CardContent className="relative z-10">
          <div className="text-3xl font-bold text-slate-800 dark:text-white">{stats.activeActivityTypes}</div>
        </CardContent>
      </Card>

      <Card className={cardStyle}>
        <div className={glowStyle} />
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
          <CardTitle className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            {t('activityType.stats.newThisMonth')}
          </CardTitle>
          <div className="p-2 bg-orange-50 text-orange-600 dark:bg-orange-500/10 dark:text-orange-400 rounded-lg shadow-sm border border-orange-100 dark:border-orange-500/20">
             <CalendarDays size={18} />
          </div>
        </CardHeader>
        <CardContent className="relative z-10">
          <div className="text-3xl font-bold text-slate-800 dark:text-white">{stats.newThisMonth}</div>
        </CardContent>
      </Card>
    </div>
  );
}
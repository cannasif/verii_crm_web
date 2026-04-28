import { type ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { useUserStats } from '../hooks/useUserStats';
import { Users, UserCheck, Calendar, CheckCircle2 } from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

export function UserStats(): ReactElement {
  const { t } = useTranslation();
  const { data: stats, isLoading } = useUserStats();

  const cardStyle = `
    bg-stone-50/95 dark:bg-[#1E1627]
    border border-slate-300/80 dark:border-white/20
    shadow-sm ring-1 ring-slate-200/60 dark:ring-0
    hover:shadow-md
    backdrop-blur-md
    transition-all duration-300
    group relative overflow-hidden
  `;

  const glowStyle = "absolute inset-0 bg-linear-to-r from-pink-50/0 to-orange-50/0 dark:from-pink-500/0 dark:to-orange-500/0  transition-all duration-500 pointer-events-none";

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className={cardStyle}>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t('userManagement.stats.loading')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-8 w-20 animate-pulse rounded bg-muted" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!stats) {
    return <></>;
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card className={cardStyle}>
        <div className={glowStyle} />
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
          <CardTitle className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            {t('userManagement.stats.totalUsers')}
          </CardTitle>
          <div className="p-2 bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400 rounded-lg shadow-sm border border-blue-100 dark:border-blue-500/20">
            <Users size={18} />
          </div>
        </CardHeader>
        <CardContent className="relative z-10">
          <div className="text-3xl font-bold text-slate-800 dark:text-white">{stats.totalUsers}</div>
        </CardContent>
      </Card>

      <Card className={cardStyle}>
        <div className={glowStyle} />
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
          <CardTitle className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            {t('userManagement.stats.activeUsers')}
          </CardTitle>
          <div className="p-2 bg-green-50 text-green-600 dark:bg-green-500/10 dark:text-green-400 rounded-lg shadow-sm border border-green-100 dark:border-green-500/20">
            <UserCheck size={18} />
          </div>
        </CardHeader>
        <CardContent className="relative z-10">
          <div className="text-3xl font-bold text-slate-800 dark:text-white">{stats.activeUsers}</div>
        </CardContent>
      </Card>

      <Card className={cardStyle}>
        <div className={glowStyle} />
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
          <CardTitle className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            {t('userManagement.stats.newThisMonth')}
          </CardTitle>
          <div className="p-2 bg-orange-50 text-orange-600 dark:bg-orange-500/10 dark:text-orange-400 rounded-lg shadow-sm border border-orange-100 dark:border-orange-500/20">
            <Calendar size={18} />
          </div>
        </CardHeader>
        <CardContent className="relative z-10">
          <div className="text-3xl font-bold text-slate-800 dark:text-white">{stats.newThisMonth}</div>
        </CardContent>
      </Card>

      <Card className={cardStyle}>
        <div className={glowStyle} />
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
          <CardTitle className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            {t('userManagement.stats.confirmedUsers')}
          </CardTitle>
          <div className="p-2 bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400 rounded-lg shadow-sm border border-emerald-100 dark:border-emerald-500/20">
            <CheckCircle2 size={18} />
          </div>
        </CardHeader>
        <CardContent className="relative z-10">
          <div className="text-3xl font-bold text-slate-800 dark:text-white">{stats.confirmedUsers}</div>
        </CardContent>
      </Card>
    </div>
  );
}

import type { ReactElement } from 'react';
import { BarChart3, Target, TrendingUp } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { useMyPermissionsQuery } from '@/features/access-control/hooks/useMyPermissionsQuery';
import { canAccessPath } from '@/features/access-control/utils/hasPermission';

const ITEMS = [
  { href: '/sales-planning', labelKey: 'sidebar.salesPlans', icon: Target, end: true },
  { href: '/sales-planning/performance', labelKey: 'sidebar.salesPlanPerformance', icon: BarChart3, end: false },
  { href: '/sales-planning/forecast', labelKey: 'sidebar.salesForecast', icon: TrendingUp, end: false },
] as const;

export function SalesPlanningWorkspaceNav(): ReactElement | null {
  const { t } = useTranslation('common');
  const { data: permissions, isLoading } = useMyPermissionsQuery();
  const visibleItems = isLoading
    ? ITEMS.slice(0, 2)
    : ITEMS.filter((item) => canAccessPath(permissions, item.href));

  if (visibleItems.length < 2) return null;

  return (
    <nav
      aria-label={t('sidebar.salesPlanning')}
      className="grid overflow-hidden rounded-lg border bg-background sm:inline-flex"
    >
      {visibleItems.map((item) => (
        <NavLink
          key={item.href}
          to={item.href}
          end={item.end}
          className={({ isActive }) => cn(
            'flex min-h-11 items-center justify-center gap-2 border-b px-4 text-sm font-semibold transition-colors last:border-b-0 sm:border-b-0 sm:border-r sm:last:border-r-0',
            isActive
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:bg-muted/70 hover:text-foreground',
          )}
        >
          <item.icon className="size-4" />
          {t(item.labelKey)}
        </NavLink>
      ))}
    </nav>
  );
}

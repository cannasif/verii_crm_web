import { type ReactElement } from 'react';
import { TabsContent } from '@/components/ui/tabs';
import type { Salesmen360PerformanceDto, Salesmen360PeriodParams } from '../../types/salesmen360.types';
import { SalesmenPerformanceDashboard } from '../SalesmenPerformanceDashboard';
import type { Salesmen360TabKey } from '../navigation/SalesmenReportTabs';

export function SalesmenPerformanceTab({
  userId,
  userIds,
  performance,
  isLoading,
  isError,
  onRetry,
  locale,
  currency,
  periodParams,
  section,
}: {
  userId: number;
  userIds?: number[];
  performance?: Salesmen360PerformanceDto;
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
  locale: string;
  currency?: string;
  periodParams: Salesmen360PeriodParams;
  section: Salesmen360TabKey;
}): ReactElement {
  return (
    <TabsContent value={section} className="outline-none">
      <SalesmenPerformanceDashboard
        userId={userId}
        userIds={userIds}
        data={performance}
        isLoading={isLoading}
        isError={isError}
        onRetry={onRetry}
        locale={locale}
        currency={currency}
        periodParams={periodParams}
        section={section}
      />
    </TabsContent>
  );
}

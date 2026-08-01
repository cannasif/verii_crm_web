import { type ReactElement } from 'react';
import { TabsContent } from '@/components/ui/tabs';
import type { Salesmen360PerformanceDto, Salesmen360PeriodParams } from '../../types/salesmen360.types';
import { SalesmenPerformanceDashboard } from '../SalesmenPerformanceDashboard';

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
}): ReactElement {
  return (
    <TabsContent value="sales" className="outline-none">
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
      />
    </TabsContent>
  );
}

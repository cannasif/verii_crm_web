import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import type { SalesTargetMetric } from '@/features/sales-planning';
import { salesForecastApi } from '../api/sales-forecast.api';
import type { UpsertSalesForecastOverrideDto } from '../types/sales-forecast.types';

export const salesForecastQueryKeys = {
  all: ['sales-forecast'] as const,
  detail: (planId: number | null, month: number, targetMetric: SalesTargetMetric) =>
    ['sales-forecast', planId ?? 0, month, targetMetric] as const,
};

export function useSalesForecastQuery(
  planId: number | null,
  month: number,
  targetMetric: SalesTargetMetric,
) {
  return useQuery({
    queryKey: salesForecastQueryKeys.detail(planId, month, targetMetric),
    queryFn: ({ signal }) => salesForecastApi.get(planId!, month, targetMetric, signal),
    enabled: planId != null && planId > 0 && month >= 1 && month <= 12,
    staleTime: 60_000,
  });
}

export function useUpsertSalesForecastOverrideMutation() {
  const queryClient = useQueryClient();
  const { t } = useTranslation('sales-forecast');
  return useMutation({
    mutationFn: ({
      planId,
      quotationId,
      payload,
    }: {
      planId: number;
      quotationId: number;
      payload: UpsertSalesForecastOverrideDto;
    }) => salesForecastApi.upsertOverride(planId, quotationId, payload),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: ['sales-forecast', variables.planId] });
      toast.success(t('messages.overrideSaved'));
    },
    onError: (error: Error) => toast.error(error.message || t('messages.overrideSaveFailed')),
  });
}

export function useDeleteSalesForecastOverrideMutation() {
  const queryClient = useQueryClient();
  const { t } = useTranslation('sales-forecast');
  return useMutation({
    mutationFn: ({
      planId,
      quotationId,
      rowVersion,
    }: {
      planId: number;
      quotationId: number;
      rowVersion: string;
    }) => salesForecastApi.deleteOverride(planId, quotationId, rowVersion),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: ['sales-forecast', variables.planId] });
      toast.success(t('messages.overrideDeleted'));
    },
    onError: (error: Error) => toast.error(error.message || t('messages.overrideDeleteFailed')),
  });
}

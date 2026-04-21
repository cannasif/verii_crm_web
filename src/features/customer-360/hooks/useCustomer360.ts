import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import {
  executeCustomer360RecommendedAction,
  getCustomerImages,
  getCustomer360Cohort,
  getCustomer360Overview,
  getCustomer360AnalyticsSummary,
  getCustomer360AnalyticsCharts,
  getCustomer360QuickQuotations,
  getCustomer360ErpMovements,
  getCustomer360ErpBalance,
} from '../api/customer360.api';
import type {
  Customer360QuickQuotationDto,
  ExecuteRecommendedActionDto,
  Customer360ErpMovementDto,
  Customer360ErpBalanceDto,
} from '../types/customer360.types';

const OVERVIEW_STALE_MS = 30_000;
const SUMMARY_STALE_MS = 30_000;
const CHARTS_STALE_MS = 45_000;
const COHORT_STALE_MS = 300_000;
const IMAGES_STALE_MS = 60_000;
const QUICK_QUOTATIONS_STALE_MS = 30_000;
const ERP_MOVEMENTS_STALE_MS = 30_000;
const ERP_BALANCE_STALE_MS = 30_000;

export function useCustomer360OverviewQuery(id: number, currency?: string) {
  return useQuery({
    queryKey: ['customer360', 'overview', id, currency ?? 'ALL'],
    queryFn: ({ signal }) => getCustomer360Overview({ id, currency, signal }),
    staleTime: OVERVIEW_STALE_MS,
    enabled: id > 0,
  });
}

export function useCustomer360AnalyticsSummaryQuery(id: number, currency?: string, enabled = true) {
  return useQuery({
    queryKey: ['customer360', 'summary', id, currency ?? 'ALL'],
    queryFn: ({ signal }) => getCustomer360AnalyticsSummary({ id, currency, signal }),
    staleTime: SUMMARY_STALE_MS,
    enabled: id > 0 && enabled,
  });
}

export function useCustomer360AnalyticsChartsQuery(id: number, months?: number, currency?: string, enabled = true) {
  return useQuery({
    queryKey: ['customer360', 'charts', id, months ?? 12, currency ?? 'ALL'],
    queryFn: ({ signal }) =>
      getCustomer360AnalyticsCharts({ id, months: months ?? 12, currency, signal }),
    staleTime: CHARTS_STALE_MS,
    enabled: id > 0 && enabled,
  });
}

export function useCustomer360CohortQuery(id: number, months = 12) {
  return useQuery({
    queryKey: ['customer360', 'cohort', id, months],
    queryFn: ({ signal }) => getCustomer360Cohort({ id, months, signal }),
    staleTime: COHORT_STALE_MS,
    enabled: id > 0,
  });
}

export function useCustomerImagesQuery(id: number) {
  return useQuery({
    queryKey: ['customer360', 'images', id],
    queryFn: ({ signal }) => getCustomerImages({ id, signal }),
    staleTime: IMAGES_STALE_MS,
    enabled: id > 0,
  });
}

export function useCustomer360QuickQuotationsQuery(id: number) {
  return useQuery<Customer360QuickQuotationDto[], Error>({
    queryKey: ['customer360', 'quick-quotations', id],
    queryFn: ({ signal }) => getCustomer360QuickQuotations({ id, signal }),
    staleTime: QUICK_QUOTATIONS_STALE_MS,
    enabled: id > 0,
  });
}

export function useCustomer360ErpMovementsQuery(id: number) {
  return useQuery<Customer360ErpMovementDto[], Error>({
    queryKey: ['customer360', 'erp-movements', id],
    queryFn: ({ signal }) => getCustomer360ErpMovements({ id, signal }),
    staleTime: ERP_MOVEMENTS_STALE_MS,
    enabled: id > 0,
  });
}

export function useCustomer360ErpBalanceQuery(id: number) {
  return useQuery<Customer360ErpBalanceDto, Error>({
    queryKey: ['customer360', 'erp-balance', id],
    queryFn: ({ signal }) => getCustomer360ErpBalance({ id, signal }),
    staleTime: ERP_BALANCE_STALE_MS,
    enabled: id > 0,
  });
}

export function useExecuteCustomer360ActionMutation(id: number) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: ExecuteRecommendedActionDto) =>
      executeCustomer360RecommendedAction({ id, payload }),
    onSuccess: () => {
      toast.success(t('common.actionExecuted'));
      queryClient.invalidateQueries({ queryKey: ['customer360', 'overview', id] });
      queryClient.invalidateQueries({ queryKey: ['customer360', 'cohort', id] });
    },
    onError: (error: Error) => {
      toast.error(error.message || t('common.actionExecutionFailed'));
    },
  });
}

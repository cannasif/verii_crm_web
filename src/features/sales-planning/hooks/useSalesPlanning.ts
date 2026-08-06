import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { salesPlanningApi } from '../api/sales-planning.api';
import type {
  CreateSalesPlanDto,
  SalesPlanStatus,
  SalesPlanTransitionDto,
  UpdateSalesPlanDto,
} from '../types/sales-planning.types';

export const salesPlanningQueryKeys = {
  all: ['sales-planning'] as const,
  list: (year?: number, status?: SalesPlanStatus) => ['sales-planning', 'list', year ?? 'all', status ?? 'all'] as const,
  detail: (id: number | null) => ['sales-planning', 'detail', id ?? 0] as const,
  attainment: (id: number | null, periodStart: string) => ['sales-planning', 'attainment', id ?? 0, periodStart] as const,
  targetUsers: ['sales-planning', 'target-users'] as const,
};

export function useSalesPlansQuery(year?: number, status?: SalesPlanStatus) {
  return useQuery({
    queryKey: salesPlanningQueryKeys.list(year, status),
    queryFn: () => salesPlanningApi.getAll({ year, status }),
    staleTime: 30_000,
  });
}

export function useSalesPlanDetailQuery(id: number | null, enabled = true) {
  return useQuery({
    queryKey: salesPlanningQueryKeys.detail(id),
    queryFn: ({ signal }) => salesPlanningApi.getById(id!, signal),
    enabled: enabled && id != null && id > 0,
    staleTime: 15_000,
  });
}

export function useSalesPlanAttainmentQuery(id: number | null, periodStart: string, enabled = true) {
  return useQuery({
    queryKey: salesPlanningQueryKeys.attainment(id, periodStart),
    queryFn: ({ signal }) => salesPlanningApi.getAttainment(id!, periodStart, signal),
    enabled: enabled && id != null && id > 0 && /^\d{4}-\d{2}-\d{2}$/.test(periodStart),
    staleTime: 60_000,
  });
}

export function useSalesPlanTargetUsersQuery(enabled = true) {
  return useQuery({
    queryKey: salesPlanningQueryKeys.targetUsers,
    queryFn: ({ signal }) => salesPlanningApi.getTargetUsers(signal),
    enabled,
    staleTime: 60_000,
  });
}

export function useCreateSalesPlanMutation() {
  const queryClient = useQueryClient();
  const { t } = useTranslation('sales-planning');
  return useMutation({
    mutationFn: (payload: CreateSalesPlanDto) => salesPlanningApi.create(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: salesPlanningQueryKeys.all });
      toast.success(t('messages.created'));
    },
    onError: (error: Error) => toast.error(error.message || t('messages.createFailed')),
  });
}

export function useUpdateSalesPlanMutation() {
  const queryClient = useQueryClient();
  const { t } = useTranslation('sales-planning');
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: UpdateSalesPlanDto }) => salesPlanningApi.update(id, payload),
    onSuccess: (plan) => {
      void queryClient.invalidateQueries({ queryKey: salesPlanningQueryKeys.all });
      queryClient.setQueryData(salesPlanningQueryKeys.detail(plan.id), plan);
      toast.success(t('messages.updated'));
    },
    onError: (error: Error) => toast.error(error.message || t('messages.updateFailed')),
  });
}

export function useDeleteSalesPlanMutation() {
  const queryClient = useQueryClient();
  const { t } = useTranslation('sales-planning');
  return useMutation({
    mutationFn: ({ id, rowVersion }: { id: number; rowVersion: string }) => salesPlanningApi.delete(id, rowVersion),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: salesPlanningQueryKeys.all });
      toast.success(t('messages.deleted'));
    },
    onError: (error: Error) => toast.error(error.message || t('messages.deleteFailed')),
  });
}

export function useTransitionSalesPlanMutation() {
  const queryClient = useQueryClient();
  const { t } = useTranslation('sales-planning');
  return useMutation({
    mutationFn: ({
      id,
      action,
      payload,
    }: {
      id: number;
      action: 'submit' | 'approve' | 'lock';
      payload: SalesPlanTransitionDto;
    }) => salesPlanningApi.transition(id, action, payload),
    onSuccess: (plan) => {
      void queryClient.invalidateQueries({ queryKey: salesPlanningQueryKeys.all });
      queryClient.setQueryData(salesPlanningQueryKeys.detail(plan.id), plan);
      toast.success(t('messages.statusUpdated'));
    },
    onError: (error: Error) => toast.error(error.message || t('messages.statusFailed')),
  });
}

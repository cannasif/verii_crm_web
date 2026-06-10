import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import type { ApiResponse } from '@/types/api';
import { demandApi } from '../api/demand-api';
import { queryKeys } from '../utils/query-keys';

export const useCancelDemandByCustomer = (): UseMutationResult<ApiResponse<boolean>, Error, { id: number; reason?: string | null }, unknown> => {
  const queryClient = useQueryClient();
  const { t } = useTranslation(['demand', 'common']);

  return useMutation({
    mutationFn: ({ id, reason }) => demandApi.cancelByCustomer(id, reason),
    onSuccess: async (_data, variables) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.demands() }),
        queryClient.invalidateQueries({ queryKey: queryKeys.demand(variables.id) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.canEdit(variables.id) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.approvalStatus(variables.id) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.approvalFlowReport(variables.id) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.waitingApprovals() }),
      ]);
      toast.success(t('customerCancel.success', { defaultValue: 'Talep müşteri tarafından iptal edildi.' }));
    },
    onError: (error: Error) => {
      toast.error(error.message || t('customerCancel.error', { defaultValue: 'Talep iptal edilemedi.' }));
    },
  });
};

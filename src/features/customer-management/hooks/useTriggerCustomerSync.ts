import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { customerApi } from '../api/customer-api';
import { CUSTOMER_MANAGEMENT_QUERY_KEYS, queryKeys } from '../utils/query-keys';

export const useTriggerCustomerSync = () => {
  const { t } = useTranslation(['customer-management', 'common']);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => customerApi.triggerSync(),
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({
        queryKey: [CUSTOMER_MANAGEMENT_QUERY_KEYS.LIST],
        exact: false,
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.stats() });

      toast.success(
        t('messages.syncQueued', {
          defaultValue: `Müşteri sync kuyruğa alındı. Job: ${result.jobId}`,
          jobId: result.jobId,
        })
      );
    },
    onError: (error: Error) => {
      toast.error(
        error.message ||
          t('messages.syncError', {
            defaultValue: 'Müşteri sync tetiklenemedi',
          })
      );
    },
  });
};

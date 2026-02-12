import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { paymentTypeApi } from '../api/payment-type-api';
import { PAYMENT_TYPE_MANAGEMENT_QUERY_KEYS } from '../utils/query-keys';

export const useDeletePaymentType = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number): Promise<void> => {
      await paymentTypeApi.delete(id);
    },
    onSuccess: async () => {
      await queryClient.refetchQueries({ 
        queryKey: [PAYMENT_TYPE_MANAGEMENT_QUERY_KEYS.LIST],
        exact: false,
      });
      toast.success(t('paymentTypeManagement.deleteSuccess'));
    },
    onError: (error: Error) => {
      toast.error(error.message || t('paymentTypeManagement.deleteError'));
    },
  });
};

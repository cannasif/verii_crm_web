import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { paymentTypeApi } from '../api/payment-type-api';
import { queryKeys, PAYMENT_TYPE_MANAGEMENT_QUERY_KEYS } from '../utils/query-keys';
import type { UpdatePaymentTypeDto, PaymentTypeDto } from '../types/payment-type-types';

export const useUpdatePaymentType = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: UpdatePaymentTypeDto }): Promise<PaymentTypeDto> => {
      const result = await paymentTypeApi.update(id, data);
      return result;
    },
    onSuccess: async (updatedPaymentType: PaymentTypeDto) => {
      await queryClient.refetchQueries({ 
        queryKey: [PAYMENT_TYPE_MANAGEMENT_QUERY_KEYS.LIST],
        exact: false,
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.detail(updatedPaymentType.id) });
      toast.success(t('paymentTypeManagement.updateSuccess'));
    },
    onError: (error: Error) => {
      toast.error(error.message || t('paymentTypeManagement.updateError'));
    },
  });
};

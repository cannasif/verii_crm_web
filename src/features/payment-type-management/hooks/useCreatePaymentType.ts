import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { paymentTypeApi } from '../api/payment-type-api';
import { PAYMENT_TYPE_MANAGEMENT_QUERY_KEYS } from '../utils/query-keys';
import type { CreatePaymentTypeDto, PaymentTypeDto } from '../types/payment-type-types';

export const useCreatePaymentType = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreatePaymentTypeDto): Promise<PaymentTypeDto> => {
      const result = await paymentTypeApi.create(data);
      return result;
    },
    onSuccess: async () => {
      await queryClient.refetchQueries({ 
        queryKey: [PAYMENT_TYPE_MANAGEMENT_QUERY_KEYS.LIST],
        exact: false,
      });
      toast.success(t('paymentTypeManagement.createSuccess'));
    },
    onError: (error: Error) => {
      toast.error(error.message || t('paymentTypeManagement.createError'));
    },
  });
};

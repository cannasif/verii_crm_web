import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import type { ApiResponse } from '@/types/api';
import { quotationApi } from '../api/quotation-api';
import { queryKeys } from '../utils/query-keys';

export const useConvertQuotationToOrder = (): UseMutationResult<ApiResponse<number>, Error, number, unknown> => {
  const queryClient = useQueryClient();
  const { t } = useTranslation(['quotation', 'common']);

  return useMutation({
    mutationFn: (quotationId: number) => quotationApi.convertToOrder(quotationId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.quotations() });
      toast.success(t('list.convertToOrderSuccess', { defaultValue: 'Teklif siparişe aktarıldı.' }));
    },
    onError: (error: Error) => {
      toast.error(error.message || t('list.convertToOrderError', { defaultValue: 'Teklif siparişe aktarılamadı.' }));
    },
  });
};

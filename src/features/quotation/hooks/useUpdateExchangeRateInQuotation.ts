import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import type { ApiResponse } from '@/types/api';
import { quotationApi } from '../api/quotation-api';
import { queryKeys } from '../utils/query-keys';
import type { QuotationExchangeRateGetDto } from '../types/quotation-types';

export const useUpdateExchangeRateInQuotation = (
  quotationId: number
): UseMutationResult<ApiResponse<boolean>, Error, QuotationExchangeRateGetDto[], unknown> => {
  const queryClient = useQueryClient();
  const { t } = useTranslation(['quotation', 'common']);

  return useMutation({
    mutationFn: (dtos: QuotationExchangeRateGetDto[]) =>
      quotationApi.updateExchangeRateInQuotation(dtos),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.quotationExchangeRates(quotationId) });
      toast.success(t('exchangeRates.updateSuccess'));
    },
    onError: (error: Error) => {
      toast.error(error.message ?? t('exchangeRates.updateError'));
    },
  });
};

import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { quotationApi } from '../api/quotation-api';
import { queryKeys } from '../utils/query-keys';
import type { CreateQuotationLineDto, QuotationLineGetDto } from '../types/quotation-types';

export const useCreateQuotationLines = (
  quotationId: number
): UseMutationResult<QuotationLineGetDto[], Error, CreateQuotationLineDto[], unknown> => {
  const queryClient = useQueryClient();
  const { t } = useTranslation(['quotation', 'common']);

  return useMutation({
    mutationFn: (dtos: CreateQuotationLineDto[]) => quotationApi.createQuotationLines(dtos),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.quotationLines(quotationId) });
      toast.success(t('quotation.lines.createSuccess'));
    },
    onError: (error: Error) => {
      toast.error(error.message ?? t('quotation.lines.createError'));
    },
  });
};

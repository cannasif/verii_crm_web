import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { quotationApi } from '../api/quotation-api';
import { queryKeys } from '../utils/query-keys';
import type { QuotationLineGetDto } from '../types/quotation-types';

export const useUpdateQuotationLines = (
  quotationId: number
): UseMutationResult<QuotationLineGetDto[], Error, QuotationLineGetDto[], unknown> => {
  const queryClient = useQueryClient();
  const { t } = useTranslation(['quotation', 'common']);

  return useMutation({
    mutationFn: (dtos: QuotationLineGetDto[]) => quotationApi.updateQuotationLines(dtos),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.quotationLines(quotationId) });
      toast.success(t('lines.updateSuccess'));
    },
    onError: (error: Error) => {
      toast.error(error.message ?? t('lines.updateError'));
    },
  });
};

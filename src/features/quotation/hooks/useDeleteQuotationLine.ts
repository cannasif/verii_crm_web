import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { quotationApi } from '../api/quotation-api';
import { queryKeys } from '../utils/query-keys';
import type { QuotationLineGetDto } from '../types/quotation-types';

export const useDeleteQuotationLine = (
  quotationId: number
): UseMutationResult<void, Error, number, unknown> => {
  const queryClient = useQueryClient();
  const { t } = useTranslation(['quotation', 'common']);

  return useMutation({
    mutationFn: (id: number) => quotationApi.deleteQuotationLine(id),
    onSuccess: (_data, deletedLineId) => {
      queryClient.setQueryData<QuotationLineGetDto[]>(
        queryKeys.quotationLines(quotationId),
        (current) => current?.filter((line) => line.id !== deletedLineId) ?? [],
      );
      toast.success(t('lines.deleteSuccess'));
    },
    onError: (error: Error) => {
      toast.error(error.message ?? t('lines.deleteError'));
    },
  });
};

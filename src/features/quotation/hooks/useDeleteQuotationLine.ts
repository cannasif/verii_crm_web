import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { quotationApi } from '../api/quotation-api';
import { queryKeys } from '../utils/query-keys';

export const useDeleteQuotationLine = (
  quotationId: number
): UseMutationResult<void, Error, number, unknown> => {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: (id: number) => quotationApi.deleteQuotationLine(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.quotationLines(quotationId) });
      toast.success(t('quotation.lines.deleteSuccess'));
    },
    onError: (error: Error) => {
      toast.error(error.message ?? t('quotation.lines.deleteError'));
    },
  });
};

import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import type { ApiResponse } from '@/types/api';
import { quotationApi } from '../api/quotation-api';
import { queryKeys } from '../utils/query-keys';
import type { QuotationBulkCreateDto, QuotationGetDto } from '../types/quotation-types';

export const useUpdateQuotationBulk = (): UseMutationResult<ApiResponse<QuotationGetDto>, Error, { id: number; data: QuotationBulkCreateDto }, unknown> => {
  const queryClient = useQueryClient();
  const { t } = useTranslation(['quotation', 'common']);

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: QuotationBulkCreateDto }) => quotationApi.updateBulk(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.quotations() });
      toast.success(t('update.success'));
    },
    onError: (error: Error) => {
      toast.error(error.message || t('update.error'));
    },
  });
};

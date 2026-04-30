import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import type { ApiResponse } from '@/types/api';
import { quotationApi } from '../api/quotation-api';
import { queryKeys } from '../utils/query-keys';
import type { QuotationGetDto } from '../types/quotation-types';

export const useCreateRevisionOfQuotation = (): UseMutationResult<ApiResponse<QuotationGetDto>, Error, number, unknown> => {
  const queryClient = useQueryClient();
  const { t } = useTranslation(['quotation', 'common']);

  return useMutation({
    mutationFn: (quotationId: number) => quotationApi.createRevisionOfQuotation(quotationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.quotations() });
      toast.success(t('revision.success'));
    },
    onError: (error: Error) => {
      toast.error(error.message || t('revision.error'));
    },
  });
};

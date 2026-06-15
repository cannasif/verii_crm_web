import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import type { ApiResponse } from '@/types/api';
import { quotationApi } from '../api/quotation-api';
import { queryKeys } from '../utils/query-keys';
import type { QuotationErpCleanupRecreateDto, QuotationGetDto } from '../types/quotation-types';

interface CleanupQuotationErpVariables {
  quotationId: number;
  data: QuotationErpCleanupRecreateDto;
}

export const useCleanupQuotationErpAndCreateCopy = (): UseMutationResult<
  ApiResponse<QuotationGetDto>,
  Error,
  CleanupQuotationErpVariables,
  unknown
> => {
  const queryClient = useQueryClient();
  const { t } = useTranslation(['quotation', 'common']);

  return useMutation({
    mutationFn: ({ quotationId, data }) => quotationApi.cleanupErpAndCreateCopy(quotationId, data),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.quotations() });
      toast.success(t('list.erpCleanupSuccess', { defaultValue: 'ERP kaydı temizlendi ve yeni teklif kopyası oluşturuldu.' }));
    },
    onError: (error: Error) => {
      toast.error(error.message || t('list.erpCleanupError', { defaultValue: 'ERP kaydı temizlenemedi.' }));
    },
  });
};

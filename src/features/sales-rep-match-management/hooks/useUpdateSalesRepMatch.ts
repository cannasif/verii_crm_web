import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { salesRepMatchApi } from '../api/sales-rep-match-api';
import type { SalesRepMatchGetDto, SalesRepMatchUpdateDto } from '../types/sales-rep-match-types';
import { SALES_REP_MATCH_QUERY_KEYS } from '../utils/query-keys';

interface UpdateSalesRepMatchVariables {
  id: number;
  data: SalesRepMatchUpdateDto;
}

export const useUpdateSalesRepMatch = (): UseMutationResult<
  SalesRepMatchGetDto,
  Error,
  UpdateSalesRepMatchVariables
> => {
  const { t } = useTranslation('sales-rep-match-management');
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }) => salesRepMatchApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [SALES_REP_MATCH_QUERY_KEYS.LIST], exact: false });
      toast.success(t('messages.updateSuccess', { defaultValue: 'Satış temsilcisi eşleşmesi güncellendi.' }));
    },
    onError: (error: Error) => {
      toast.error(error.message || t('messages.updateError', { defaultValue: 'Satış temsilcisi eşleşmesi güncellenemedi.' }));
    },
  });
};

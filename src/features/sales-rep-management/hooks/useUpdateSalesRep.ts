import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { salesRepApi } from '../api/sales-rep-api';
import type { SalesRepGetDto, SalesRepUpdateDto } from '../types/sales-rep-types';
import { SALES_REP_QUERY_KEYS } from '../utils/query-keys';

interface UpdateSalesRepVariables {
  id: number;
  data: SalesRepUpdateDto;
}

export const useUpdateSalesRep = (): UseMutationResult<
  SalesRepGetDto,
  Error,
  UpdateSalesRepVariables
> => {
  const { t } = useTranslation('sales-rep-management');
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: UpdateSalesRepVariables) => salesRepApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [SALES_REP_QUERY_KEYS.LIST], exact: false });
      toast.success(t('messages.updateSuccess'));
    },
    onError: (error: Error) => {
      toast.error(error.message || t('messages.updateError'));
    },
  });
};

import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { salesRepApi } from '../api/sales-rep-api';
import type { SalesRepCreateDto, SalesRepGetDto } from '../types/sales-rep-types';
import { SALES_REP_QUERY_KEYS } from '../utils/query-keys';

export const useCreateSalesRep = (): UseMutationResult<SalesRepGetDto, Error, SalesRepCreateDto> => {
  const { t } = useTranslation('sales-rep-management');
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: SalesRepCreateDto) => salesRepApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [SALES_REP_QUERY_KEYS.LIST], exact: false });
      toast.success(t('messages.createSuccess'));
    },
    onError: (error: Error) => {
      toast.error(error.message || t('messages.createError'));
    },
  });
};

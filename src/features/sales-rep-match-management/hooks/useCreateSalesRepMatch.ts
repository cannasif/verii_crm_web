import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { salesRepMatchApi } from '../api/sales-rep-match-api';
import type { SalesRepMatchCreateDto, SalesRepMatchGetDto } from '../types/sales-rep-match-types';
import { SALES_REP_MATCH_QUERY_KEYS } from '../utils/query-keys';

export const useCreateSalesRepMatch = (): UseMutationResult<
  SalesRepMatchGetDto,
  Error,
  SalesRepMatchCreateDto
> => {
  const { t } = useTranslation('sales-rep-match-management');
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: SalesRepMatchCreateDto) => salesRepMatchApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [SALES_REP_MATCH_QUERY_KEYS.LIST], exact: false });
      toast.success(t('messages.createSuccess'));
    },
    onError: (error: Error) => {
      toast.error(error.message || t('messages.createError'));
    },
  });
};

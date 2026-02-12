import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { salesTypeApi } from '../api/sales-type-api';
import { SALES_TYPE_QUERY_KEYS } from '../utils/query-keys';
import type { SalesTypeUpdateDto, SalesTypeGetDto } from '../types/sales-type-types';

interface UpdateSalesTypeVariables {
  id: number;
  data: SalesTypeUpdateDto;
}

export const useUpdateSalesType = (): UseMutationResult<
  SalesTypeGetDto,
  Error,
  UpdateSalesTypeVariables
> => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: UpdateSalesTypeVariables) => salesTypeApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [SALES_TYPE_QUERY_KEYS.LIST], exact: false });
      toast.success(t('salesTypeManagement.messages.updateSuccess'));
    },
    onError: (error: Error) => {
      toast.error(error.message || t('salesTypeManagement.messages.updateError'));
    },
  });
};

import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { salesTypeApi } from '../api/sales-type-api';
import { SALES_TYPE_QUERY_KEYS } from '../utils/query-keys';
import type { SalesTypeCreateDto, SalesTypeGetDto } from '../types/sales-type-types';

export const useCreateSalesType = (): UseMutationResult<
  SalesTypeGetDto,
  Error,
  SalesTypeCreateDto
> => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: SalesTypeCreateDto) => salesTypeApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [SALES_TYPE_QUERY_KEYS.LIST], exact: false });
      toast.success(t('salesTypeManagement.messages.createSuccess', 'Satış tipi başarıyla oluşturuldu'));
    },
    onError: (error: Error) => {
      toast.error(error.message || t('salesTypeManagement.messages.createError', 'Satış tipi oluşturulamadı'));
    },
  });
};

import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { userDiscountLimitApi } from '../api/user-discount-limit-api';
import { queryKeys, USER_DISCOUNT_LIMIT_QUERY_KEYS } from '../utils/query-keys';
import type { UpdateUserDiscountLimitDto, UserDiscountLimitDto } from '../types/user-discount-limit-types';

export const useUpdateUserDiscountLimit = (): UseMutationResult<UserDiscountLimitDto, Error, { id: number; data: UpdateUserDiscountLimitDto }> => {
  const { t } = useTranslation('user-discount-limit-management');
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: UpdateUserDiscountLimitDto }): Promise<UserDiscountLimitDto> => {
      const result = await userDiscountLimitApi.update(id, data);
      return result;
    },
    onSuccess: async (updatedUserDiscountLimit: UserDiscountLimitDto) => {
      await queryClient.refetchQueries({ 
        queryKey: [USER_DISCOUNT_LIMIT_QUERY_KEYS.LIST],
        exact: false,
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.detail(updatedUserDiscountLimit.id) });
      toast.success(t('updateSuccess'));
    },
    onError: (error: Error) => {
      toast.error(error.message || t('updateError'));
    },
  });
};

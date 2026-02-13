import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { userDiscountLimitApi } from '../api/user-discount-limit-api';
import { USER_DISCOUNT_LIMIT_QUERY_KEYS } from '../utils/query-keys';
import type { CreateUserDiscountLimitDto, UserDiscountLimitDto } from '../types/user-discount-limit-types';

export const useCreateUserDiscountLimit = (): UseMutationResult<UserDiscountLimitDto, Error, CreateUserDiscountLimitDto> => {
  const { t } = useTranslation('user-discount-limit-management');
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateUserDiscountLimitDto): Promise<UserDiscountLimitDto> => {
      const result = await userDiscountLimitApi.create(data);
      return result;
    },
    onSuccess: async () => {
      await queryClient.refetchQueries({ 
        queryKey: [USER_DISCOUNT_LIMIT_QUERY_KEYS.LIST],
        exact: false,
      });
      toast.success(t('createSuccess'));
    },
    onError: (error: Error) => {
      toast.error(error.message || t('createError'));
    },
  });
};

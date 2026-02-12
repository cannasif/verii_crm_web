import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { userDiscountLimitApi } from '../api/user-discount-limit-api';
import { USER_DISCOUNT_LIMIT_QUERY_KEYS } from '../utils/query-keys';

export const useDeleteUserDiscountLimit = (): UseMutationResult<void, Error, number> => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number): Promise<void> => {
      await userDiscountLimitApi.delete(id);
    },
    onSuccess: async () => {
      await queryClient.refetchQueries({ 
        queryKey: [USER_DISCOUNT_LIMIT_QUERY_KEYS.LIST],
        exact: false,
      });
      toast.success(t('userDiscountLimitManagement.deleteSuccess'));
    },
    onError: (error: Error) => {
      toast.error(error.message || t('userDiscountLimitManagement.deleteError'));
    },
  });
};

import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { userDetailApi } from '../api/user-detail-api';
import { queryKeys, USER_DETAIL_QUERY_KEYS } from '../utils/query-keys';
import type { UpdateUserDetailDto, UserDetailDto } from '../types/user-detail-types';

export const useUpdateUserDetail = (): UseMutationResult<UserDetailDto, Error, { id: number; data: UpdateUserDetailDto }> => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: UpdateUserDetailDto }): Promise<UserDetailDto> => {
      const result = await userDetailApi.update(id, data);
      return result;
    },
    onSuccess: async (updatedUserDetail: UserDetailDto) => {
      await queryClient.refetchQueries({ 
        queryKey: [USER_DETAIL_QUERY_KEYS.LIST],
        exact: false,
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.detail(updatedUserDetail.id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.byUserId(updatedUserDetail.userId) });
      toast.success(t('userDetailManagement.updateSuccess'));
    },
    onError: (error: Error) => {
      toast.error(error.message || t('userDetailManagement.updateError'));
    },
  });
};

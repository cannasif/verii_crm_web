import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { userDetailApi } from '../api/user-detail-api';
import { USER_DETAIL_QUERY_KEYS, queryKeys } from '../utils/query-keys';
import type { CreateUserDetailDto, UserDetailDto } from '../types/user-detail-types';

export const useCreateUserDetail = (): UseMutationResult<UserDetailDto, Error, CreateUserDetailDto> => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateUserDetailDto): Promise<UserDetailDto> => {
      const result = await userDetailApi.create(data);
      return result;
    },
    onSuccess: async (newUserDetail: UserDetailDto) => {
      await queryClient.refetchQueries({ 
        queryKey: [USER_DETAIL_QUERY_KEYS.LIST],
        exact: false,
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.byUserId(newUserDetail.userId) });
      toast.success(t('userDetailManagement.createSuccess'));
    },
    onError: (error: Error) => {
      toast.error(error.message || t('userDetailManagement.createError'));
    },
  });
};

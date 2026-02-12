import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { userApi } from '../api/user-api';
import { queryKeys } from '../utils/query-keys';
import type { CreateUserDto, UserDto } from '../types/user-types';

export const useCreateUser = (): UseMutationResult<UserDto, Error, CreateUserDto> => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateUserDto) => userApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.all() });
      queryClient.invalidateQueries({ queryKey: queryKeys.stats() });
      toast.success(t('userManagement.messages.createSuccess'));
    },
    onError: (error: Error) => {
      toast.error(error.message || t('userManagement.messages.createError'));
    },
  });
};

import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { userApi } from '../api/user-api';
import { queryKeys } from '../utils/query-keys';
import type { UpdateUserDto, UserDto } from '../types/user-types';

export const useUpdateUser = (): UseMutationResult<UserDto, Error, { id: number; data: UpdateUserDto }> => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateUserDto }) =>
      userApi.update(id, data),
    onSuccess: (updatedUser: UserDto) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.all() });
      queryClient.invalidateQueries({ queryKey: queryKeys.detail(updatedUser.id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.stats() });
      queryClient.invalidateQueries({ queryKey: ['users', updatedUser.id, 'permission-groups'] });
      toast.success(t('userManagement.messages.updateSuccess'));
    },
    onError: (error: Error) => {
      toast.error(error.message || t('userManagement.messages.updateError'));
    },
  });
};

import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { userDetailApi } from '../api/user-detail-api';
import { queryKeys } from '../utils/query-keys';
import type { UserDetailDto } from '../types/user-detail-types';

export const useUploadProfilePicture = (): UseMutationResult<UserDetailDto, Error, { userId: number; file: File }> => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, file }: { userId: number; file: File }): Promise<UserDetailDto> => {
      const result = await userDetailApi.uploadProfilePicture(userId, file);
      return result;
    },
    onSuccess: async (updatedUserDetail: UserDetailDto) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.byUserId(updatedUserDetail.userId) });
      toast.success(t('userDetailManagement.uploadProfilePictureSuccess'));
    },
    onError: (error: Error) => {
      toast.error(error.message || t('userDetailManagement.uploadProfilePictureError'));
    },
  });
};

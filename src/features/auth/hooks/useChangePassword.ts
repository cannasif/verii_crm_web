import { useMutation } from '@tanstack/react-query';
import { authApi } from '../api/auth-api';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import type { ChangePasswordRequest } from '../types/auth';
import { useAuthStore } from '@/stores/auth-store';
import { getUserFromToken } from '@/utils/jwt';

export const useChangePassword = () => {
  const { t } = useTranslation(['auth', 'common']);

  return useMutation({
    mutationFn: async (data: ChangePasswordRequest): Promise<void> => {
      const response = await authApi.changePassword({
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      });

      if (!response.success) {
        throw new Error(response.message || response.exceptionMessage || t('auth.changePassword.error'));
      }

      const newToken = response.data;
      if (!newToken) {
        throw new Error(t('auth.changePassword.error'));
      }

      const shouldUseLocalStorage = !!localStorage.getItem('access_token');
      localStorage.removeItem('access_token');
      sessionStorage.removeItem('access_token');

      if (shouldUseLocalStorage) {
        localStorage.setItem('access_token', newToken);
      } else {
        sessionStorage.setItem('access_token', newToken);
      }

      const decodedUser = getUserFromToken(newToken);
      useAuthStore.setState((state) => ({
        user: decodedUser ?? state.user,
        token: newToken,
      }));
    },
    onSuccess: () => {
      toast.success(t('auth.changePassword.success'));
    },
    onError: (error: Error) => {
      toast.error(error.message || t('auth.changePassword.error'));
    },
  });
};

import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { authApi } from '../api/auth-api';
import { useTranslation } from 'react-i18next';

export const useResetPassword = () => {
  const navigate = useNavigate();
  const { t } = useTranslation(['auth', 'common']);

  return useMutation({
    mutationFn: (data: { token: string; newPassword: string }) =>
      authApi.resetPassword(data),
    onSuccess: (response) => {
      if (response.success) {
        toast.success(t('auth.resetPassword.successRedirect'));
        setTimeout(() => {
          navigate('/auth/login', { replace: true });
        }, 2000);
      } else {
        const errorMessage = response.message || response.exceptionMessage || t('auth.resetPassword.failed');
        toast.error(errorMessage);
      }
    },
    onError: (error: Error) => {
      console.error('Reset password error:', error);
      const errorMessage = error.message || t('auth.resetPassword.error');
      toast.error(errorMessage);
    },
  });
};

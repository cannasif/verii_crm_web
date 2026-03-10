import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { authApi } from '../api/auth-api';
import { useAuthStore } from '@/stores/auth-store';
import { getUserFromToken } from '@/utils/jwt';
import type { LoginRequest, Branch } from '../types/auth';
import { ACCESS_CONTROL_QUERY_KEYS } from '@/features/access-control/utils/query-keys';

export const useLogin = (branches?: Branch[]) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const setAuth = useAuthStore((state) => state.setAuth);

  return useMutation({
    mutationFn: (data: LoginRequest) => authApi.login(data),
    onSuccess: async (response, variables) => {
      if (response.success && response.data) {
        const user = getUserFromToken(response.data.token);

        if (user) {
          const selectedBranch = branches?.find((b) => b.id === variables.branchId) || null;
          const token = response.data.token;
          const refreshToken = response.data.refreshToken;
          const rememberMe = variables.rememberMe;

          setAuth(user, token, selectedBranch, rememberMe, refreshToken);
          await queryClient.invalidateQueries({ queryKey: ACCESS_CONTROL_QUERY_KEYS.ME_PERMISSIONS_BASE });
          await queryClient.refetchQueries({
            queryKey: ACCESS_CONTROL_QUERY_KEYS.ME_PERMISSIONS(user.id),
            type: 'active',
          });

          setTimeout(() => {
            navigate('/', { replace: true });
          }, 0);
        } else {
          toast.error(t('auth.login.loginError'));
        }
      } else {
        const errorMessage = response.message || response.exceptionMessage || t('auth.login.loginError');
        toast.error(errorMessage);
      }
    },
    onError: (error: Error) => {
      const errorMessage = error.message || t('auth.login.loginError');
      toast.error(errorMessage);
    },
  });
};

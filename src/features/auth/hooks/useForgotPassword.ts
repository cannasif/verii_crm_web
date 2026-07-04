import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { authApi } from '../api/auth-api';

export const useForgotPassword = () => {
  return useMutation({
    mutationFn: (email: string) => authApi.requestPasswordReset(email),
    onSuccess: (response) => {
      if (response.success) {
        const message = response.message || 'Şifre sıfırlama linki e-posta adresinize gönderildi. Lütfen e-postanızı kontrol edin.';
        toast.success(message, {
          style: {
            background: '#140a1e', // Sayfanın koyu mor teması
            borderColor: 'rgba(236, 72, 153, 0.2)', // Pembe border (sayfa aksanı)
            color: '#fff',
            backdropFilter: 'blur(10px)'
          },
          className: 'text-white border-primary/20 shadow-xl shadow-primary/10'
        });
      } else {
        const errorMessage = response.message || 'Bu e-posta adresi sistemde kayıtlı değil.';
        toast.error(errorMessage, {
          style: {
            background: '#140a1e',
            borderColor: 'rgba(239, 68, 68, 0.2)',
            color: '#fff',
            backdropFilter: 'blur(10px)'
          },
          className: 'text-white border-red-500/20 shadow-xl shadow-red-500/10'
        });
      }
    },
    onError: (error: Error) => {
      console.error('Forgot password error:', error);
      const errorMessage = 'Bu e-posta adresi sistemde kayıtlı değil.';
      toast.error(errorMessage, {
        style: {
          background: '#140a1e',
          borderColor: 'rgba(239, 68, 68, 0.2)',
          color: '#fff',
          backdropFilter: 'blur(10px)'
        },
        className: 'text-white border-red-500/20 shadow-xl shadow-red-500/10'
      });
    },
  });
};

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { resetPasswordSchema, type ResetPasswordRequest } from '../types/auth';
import { useResetPassword } from '../hooks/useResetPassword';
import type React from 'react';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { LanguageSwitcher } from '@/components/shared/LanguageSwitcher';
import { LockKeyIcon, ViewIcon, ViewOffIcon } from 'hugeicons-react';
import loginImage from '../../../../public/veriicrmlogo.png';

export function ResetPasswordPage(): React.JSX.Element {
  const { t } = useTranslation('auth');
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const { mutate: resetPassword, isPending } = useResetPassword();
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isConfirmPasswordVisible, setIsConfirmPasswordVisible] = useState(false);

  const form = useForm<ResetPasswordRequest>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      token: token || '',
      newPassword: '',
      confirmPassword: '',
    },
  });

  useEffect(() => {
    if (!token) {
      toast.error(t('auth.resetPassword.invalidToken'));
      setTimeout(() => {
        navigate('/auth/login', { replace: true });
      }, 2000);
      return;
    }
    form.setValue('token', token);
  }, [token, form, navigate, t]);

  const onSubmit = (data: ResetPasswordRequest): void => {
    if (!token) {
      toast.error(t('auth.resetPassword.tokenNotFound'));
      return;
    }
    resetPassword({
      token: data.token,
      newPassword: data.newPassword,
    });
  };

  return (
    <div className="relative w-full h-screen overflow-hidden bg-[#0f0518] text-white font-['Outfit']">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&display=swap');
      `}</style>

      <div className="fixed inset-0 z-0 bg-[radial-gradient(circle_at_50%_50%,#1a0b2e_0%,#000000_100%)]" />

      <div className="relative z-10 w-full h-full flex flex-col items-center px-4 py-8 overflow-y-auto">
        <div className="absolute top-6 right-6 z-20">
          <LanguageSwitcher />
        </div>
        <div className="w-full max-w-md p-10 rounded-3xl bg-[#140a1e]/70 backdrop-blur-xl border border-white/10 shadow-[0_20px_40px_rgba(0,0,0,0.4),_inset_0_0_20px_rgba(255,255,255,0.07)] animate-[fadeIn_0.8s_ease-out] my-auto">
          <div className="text-center mb-8">
            <img
              src={loginImage}
              alt="Logo"
              className="inline-flex items-center justify-center w-80 h-50 object-contain p-2"
            />
            <p className="text-slate-400 text-xs uppercase tracking-[0.15em] mt-2 font-medium">
              {t('auth.resetPassword.title')}
            </p>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              <FormField
                control={form.control}
                name="newPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <div className="relative group">
                        <LockKeyIcon
                          className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-orange-400"
                          size={18}
                        />
                        <Input
                          {...field}
                          type={isPasswordVisible ? 'text' : 'password'}
                          placeholder={t('auth.resetPassword.newPasswordPlaceholder')}
                          className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-6 pl-12 pr-10 text-sm text-white placeholder-slate-500 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-pink-500 focus:bg-black/50"
                        />
                        <button
                          type="button"
                          onClick={() => setIsPasswordVisible((v) => !v)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                        >
                          {isPasswordVisible ? (
                            <ViewOffIcon size={20} />
                          ) : (
                            <ViewIcon size={20} />
                          )}
                        </button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <div className="relative group">
                        <LockKeyIcon
                          className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-orange-400"
                          size={18}
                        />
                        <Input
                          {...field}
                          type={isConfirmPasswordVisible ? 'text' : 'password'}
                          placeholder={t('auth.resetPassword.confirmPasswordPlaceholder')}
                          className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-6 pl-12 pr-10 text-sm text-white placeholder-slate-500 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-pink-500 focus:bg-black/50"
                        />
                        <button
                          type="button"
                          onClick={() => setIsConfirmPasswordVisible((v) => !v)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                        >
                          {isConfirmPasswordVisible ? (
                            <ViewOffIcon size={20} />
                          ) : (
                            <ViewIcon size={20} />
                          )}
                        </button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <button
                type="submit"
                disabled={isPending || !token}
                className="w-full py-4 rounded-xl bg-linear-to-r from-pink-600 via-orange-500 to-yellow-500 hover:from-pink-500 hover:via-orange-400 hover:to-yellow-400 text-white font-bold text-sm mt-6 shadow-lg shadow-orange-900/20 tracking-wide uppercase transition-all transform hover:-translate-y-0.5 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {isPending ? t('auth.resetPassword.processing') : t('auth.resetPassword.submitButton')}
              </button>
            </form>
          </Form>
        </div>
      </div>
    </div>
  );
}

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { forgotPasswordSchema, type ForgotPasswordRequest } from '../types/auth';
import { useForgotPassword } from '../hooks/useForgotPassword';
import type React from 'react';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Mail02Icon } from 'hugeicons-react';
import { LanguageSwitcher } from '@/components/shared/LanguageSwitcher';
import loginImage from '../../../../public/veriicrmlogo.png';

export function ForgotPasswordPage(): React.JSX.Element {
  const { t } = useTranslation('auth');
  const navigate = useNavigate();
  const { mutate: requestPasswordReset, isPending } = useForgotPassword();

  const form = useForm<ForgotPasswordRequest>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: '',
    },
  });

  const onSubmit = (data: ForgotPasswordRequest): void => {
    requestPasswordReset(data.email);
  };

  return (
    <div className="relative w-full h-screen overflow-hidden bg-[#0f0518] text-white font-['Plus_Jakarta_Sans']">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700&display=swap');
      `}</style>

      <div className="fixed inset-0 z-0 bg-[radial-gradient(circle_at_50%_50%,#1a0b2e_0%,#000000_100%)]" />

      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 animate-[fadeIn_1s_ease-out]">
        <LanguageSwitcher variant="icon" />
      </div>

      <div className="relative z-10 w-full h-full flex flex-col items-center px-4 py-8 overflow-y-auto">
        <div className="w-full max-w-md p-10 rounded-3xl bg-[#140a1e]/70 backdrop-blur-xl border border-white/10 shadow-[0_20px_40px_rgba(0,0,0,0.4),inset_0_0_20px_rgba(255,255,255,0.07)] animate-[fadeIn_0.8s_ease-out] my-auto">
          <div className="text-center mb-8">
            <img
              src={loginImage}
              alt={t('auth.forgotPassword.logoAlt')}
              className="inline-flex items-center justify-center w-80 h-50 object-contain p-2"
            />
            <p className="text-slate-400 text-xs uppercase tracking-[0.15em] mt-2 font-medium">
              {t('auth.forgotPassword.title')}
            </p>
          </div>

          <div className="mb-6">
            <p className="text-slate-300 text-sm text-center">
              {t('auth.forgotPassword.description')}
            </p>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <div className="relative group">
                        <Mail02Icon
                          className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-orange-400"
                          size={18}
                        />
                        <Input
                          {...field}
                          type="email"
                          placeholder={t('auth.forgotPassword.emailPlaceholder')}
                          className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-6 pl-12 pr-10 text-sm text-white placeholder-slate-500 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-pink-500 focus:bg-black/50"
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <button
                type="submit"
                disabled={isPending}
                className="w-full py-4 rounded-xl bg-linear-to-r from-pink-600 via-orange-500 to-yellow-500 hover:from-pink-500 hover:via-orange-400 hover:to-yellow-400 text-white font-bold text-sm mt-6 shadow-lg shadow-orange-900/20 tracking-wide uppercase transition-all transform hover:-translate-y-0.5 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {isPending ? t('auth.forgotPassword.processing') : t('auth.forgotPassword.submitButton')}
              </button>

              <button
                type="button"
                onClick={() => navigate('/auth/login')}
                className="w-full py-3 rounded-xl bg-black/30 border border-white/10 text-white text-sm hover:bg-black/50 transition-all"
              >
                {t('auth.forgotPassword.backToLogin')}
              </button>
            </form>
          </Form>
        </div>
      </div>
    </div>
  );
}

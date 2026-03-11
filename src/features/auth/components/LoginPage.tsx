import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation, Trans } from 'react-i18next';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { toast } from 'sonner';
import { loginRequestSchema } from '../types/auth';
import type { z } from 'zod';
import { useLogin } from '../hooks/useLogin';
import { useBranches } from '../hooks/useBranches';
import { useAuthStore } from '@/stores/auth-store';
import { isTokenValid } from '@/utils/jwt';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { LanguageSwitcher } from '@/components/shared/LanguageSwitcher';
import { AuthBackground } from './AuthBackground';

import loginImage from '../../../../public/veriicrmlogo.png';

import { 
  Location01Icon, 
  Mail02Icon, 
  LockKeyIcon, 
  ViewIcon, 
  ViewOffIcon, 
  Call02Icon,   
  Globe02Icon,      
  WhatsappIcon,
  TelegramIcon,
  InstagramIcon,
  NewTwitterIcon,
  EnergyEllipseIcon, 
  UnavailableIcon,
  Alert02Icon 
} from 'hugeicons-react';

export function LoginPage(): React.JSX.Element {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: branches } = useBranches();
  const { mutate: login, isPending } = useLogin(branches);
  const { logout } = useAuthStore();
  
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [capsLockActive, setCapsLockActive] = useState(false);
  
  const [showAnimation, setShowAnimation] = useState(true);

  const form = useForm<z.input<typeof loginRequestSchema>>({
    resolver: zodResolver(loginRequestSchema),
    defaultValues: {
      email: '',
      password: '',
      branchId: '',
      rememberMe: true,
    },
  });

  useEffect(() => {
    if (searchParams.get('sessionExpired') === 'true') {
      logout();
      toast.warning(t('auth.login.sessionExpired'));
      setSearchParams({}, { replace: true });
      return;
    }

    const storedToken = localStorage.getItem('access_token') || sessionStorage.getItem('access_token');
    if (storedToken && isTokenValid(storedToken)) {
      navigate('/', { replace: true });
    }
  }, [searchParams, setSearchParams, t, navigate, logout]);

  const onSubmit = (data: z.output<typeof loginRequestSchema>): void => {
    login({ ...data });
  };

  const onInvalidSubmit = (): void => {
    toast.error(t('auth.login.loginError'), {
      description: t('auth.validation.requiredFieldsNotFilled'),
    });
  };

  return (
    <div className="relative w-full min-h-dvh h-[100dvh] overflow-hidden bg-[#0f0518] text-white font-['Plus_Jakarta_Sans']">
      
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700&display=swap');
        input { color-scheme: dark; }
        input:-webkit-autofill,
        input:-webkit-autofill:hover, 
        input:-webkit-autofill:focus, 
        input:-webkit-autofill:active {
            -webkit-box-shadow: 0 0 0 30px #140a1e inset !important;
            -webkit-text-fill-color: white !important;
            transition: background-color 5000s ease-in-out 0s;
            caret-color: white;
            color-scheme: dark;
        }
      `}</style>

      <div 
        className={`absolute inset-0 z-0 transition-opacity duration-1000 ease-in-out ${showAnimation ? 'opacity-0' : 'opacity-100'}`}
      >
        <div className="absolute top-[-10%] right-[-10%] w-[60vw] h-[60vw] bg-pink-900/15 blur-[120px] rounded-full mix-blend-screen" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[60vw] h-[60vw] bg-orange-900/10 blur-[120px] rounded-full mix-blend-screen" />
        <div className="absolute inset-0 bg-linear-to-b from-transparent via-[#0f0518]/60 to-[#0f0518]" />
      </div>

      <AuthBackground isActive={showAnimation} />

      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 animate-[fadeIn_1s_ease-out]">
        
        <LanguageSwitcher variant="icon" />

        <button
          onClick={() => setShowAnimation(!showAnimation)}
          className={`
            flex items-center justify-center w-12 h-12 rounded-full 
            border transition-all duration-300 backdrop-blur-xl shadow-lg shadow-black/40
            hover:scale-110 active:scale-95
            ${showAnimation 
              ? 'bg-pink-500/20 border-pink-500/50 text-pink-400 shadow-[0_0_20px_rgba(236,72,153,0.4)] hover:bg-pink-500/30' 
              : 'bg-zinc-900/80 border-white/20 text-slate-200 hover:text-pink-400 hover:bg-zinc-800 hover:border-pink-500/30 hover:shadow-[0_0_15px_rgba(236,72,153,0.3)]'}
          `}
          title={showAnimation ? t('auth.login.animationOff') : t('auth.login.animationOn')}
        >
          {showAnimation ? (
            <EnergyEllipseIcon size={20} />
          ) : (
            <UnavailableIcon size={20} />
          )}
        </button>

      </div>

      <div className="relative z-10 w-full h-full flex flex-col justify-between items-center px-4 py-8 overflow-y-auto">

        <div className="w-full max-w-md p-8 md:p-10 rounded-3xl bg-[#140a1e]/70 backdrop-blur-xl border border-white/10 shadow-[0_20px_40px_rgba(0,0,0,0.4),inset_0_0_20px_rgba(255,255,255,0.07)] animate-[fadeIn_0.8s_ease-out] mt-10 md:mt-auto mb-auto">
          <div className="text-center mb-8">
            <img
              src={loginImage}
              alt="Logo"
              className="inline-flex items-center justify-center w-80 h-50 object-contain p-2"
            />
            <p className="text-slate-400 text-xs uppercase tracking-[0.15em] mt-2 font-medium">
              {t('auth.login.title')}
            </p>
          </div>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit, onInvalidSubmit)} className="space-y-5" noValidate>
              
              <FormField
                control={form.control}
                name="branchId"
                render={({ field, fieldState }) => (
                  <FormItem>
                    <FormControl>
                     <div className="relative group">
                      <Location01Icon 
                        className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors duration-300 ${fieldState.invalid ? 'text-red-500' : 'text-slate-400 group-focus-within:text-orange-400'}`} 
                        size={18} 
                      />
                      <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger 
                          className={`w-full h-auto bg-black/10 rounded-xl px-4 py-6 pl-12 text-base md:text-sm text-white focus:ring-0 focus:ring-offset-0 transition-all duration-300 
                          /* İçerideki span'i kes ve sola daya, sağdaki boşluğu ikon için koru */
                          [&>span]:truncate [&>span]:text-left [&>span]:pr-4
                            ${fieldState.invalid 
                              ? 'border-red-500/80 focus:border-red-500 hover:border-red-500 bg-red-950/10' 
                              : 'border border-white/10 focus:border-pink-500 focus:bg-black/30'
                            }`}
                        >
                          <SelectValue placeholder={t('auth.login.branchPlaceholder')} />
                        </SelectTrigger>

                        <SelectContent className="bg-black/90 backdrop-blur-xl border border-white/10 text-white max-w-[var(--radix-select-trigger-width)]">
                          {branches?.map((branch) => (
                            
                            <SelectItem 
                              key={branch.id} 
                              value={branch.id} 
                              className="focus:bg-pink-500/20 focus:text-white cursor-pointer truncate"
                            >
                              {branch.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                          </div>
                    </FormControl>
                    <FormMessage className="text-red-500 text-xs font-medium pl-1 mt-1" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field, fieldState }) => (
                  <FormItem>
                    <FormControl>
                      <div className="relative group">
                        <Mail02Icon 
                          className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors duration-300 ${fieldState.invalid ? 'text-red-500' : 'text-slate-400 group-focus-within:text-orange-400'}`} 
                          size={18} 
                        />
                        <Input
                              {...field}
                              type="email"
                              autoComplete="username" 
                              placeholder={t('auth.login.emailPlaceholder')}
                              className={`w-full bg-black/30 rounded-xl px-4 py-6 pl-12 pr-10 text-base md:text-sm text-white placeholder-slate-500 focus-visible:ring-0 focus-visible:ring-offset-0 transition-all duration-300
                                ${fieldState.invalid 
                                  ? 'border-red-500/80 focus-visible:border-red-500 bg-red-950/10 text-red-100 placeholder-red-300/50' 
                                  : 'border border-white/10 focus-visible:border-pink-500 focus:bg-black/50'
                                }`}
                            />
                      </div>
                    </FormControl>
                    <FormMessage className="text-red-500 text-xs font-medium pl-1 mt-1" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field, fieldState }) => (
                  <FormItem>
                    <FormControl>
                      <div className="relative group">
                        <LockKeyIcon 
                          className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors duration-300 ${fieldState.invalid ? 'text-red-500' : 'text-slate-400 group-focus-within:text-orange-400'}`} 
                          size={18} 
                        />
                        <Input
                              {...field}
                              type={isPasswordVisible ? 'text' : 'password'}
                              autoComplete="current-password" 
                              placeholder={t('auth.login.passwordPlaceholder')}
                              className={`w-full bg-black/30 rounded-xl px-4 py-6 pl-12 pr-10 text-base md:text-sm text-white placeholder-slate-500 focus-visible:ring-0 focus-visible:ring-offset-0 transition-all duration-300
                                ${fieldState.invalid 
                                  ? 'border-red-500/80 focus-visible:border-red-500 bg-red-950/10 text-red-100 placeholder-red-300/50' 
                                  : 'border border-white/10 focus-visible:border-pink-500 focus:bg-black/50'
                                }`}
                              onKeyDown={(e) => setCapsLockActive(e.getModifierState('CapsLock'))}
                              onKeyUp={(e) => setCapsLockActive(e.getModifierState('CapsLock'))}
                        />
                        <button
                          type="button"
                          onClick={() => setIsPasswordVisible(v => !v)}
                          className={`absolute right-4 top-1/2 -translate-y-1/2 transition-colors hover:text-white ${fieldState.invalid ? 'text-red-400' : 'text-slate-400'}`}
                        >
                          {isPasswordVisible ? <ViewOffIcon size={20} /> : <ViewIcon size={20} />}
                        </button>
                      </div>
                    </FormControl>
        
                    <div className="min-h-[20px] mt-1 pl-1">
                      {fieldState.error ? (
                   
                        <FormMessage className="text-red-500 text-xs font-medium animate-in slide-in-from-top-1" />
                      ) : capsLockActive ? (
                        <div className="flex items-center gap-2 text-orange-400 text-xs font-medium animate-in slide-in-from-top-1 bg-orange-400/10 px-3 py-1.5 rounded-lg border border-orange-400/20 w-fit mt-2">
                          <Alert02Icon size={14} />
                          {t('auth.login.capsLockOn')}
                        </div>
                      ) : null}
                    </div>

                  </FormItem>
                )}
              />
            
              <div className="flex items-center justify-between text-xs text-slate-400 mt-2 px-1">
                <FormField
                  control={form.control}
                  name="rememberMe"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <label className="flex items-center gap-2 cursor-pointer hover:text-pink-400 transition">
                          <input
                            type="checkbox"
                            checked={field.value}
                            onChange={field.onChange}
                            className="accent-pink-500 rounded bg-slate-800 border-none w-3.5 h-3.5"
                          />
                          {t('auth.login.rememberMe')}
                        </label>
                      </FormControl>
                    </FormItem>
                  )}
                />
                <Link to="/auth/forgot-password" className="hover:text-orange-400 transition">{t('auth.login.forgotPassword')}</Link>
              </div>

              <button
                type="submit"
                disabled={isPending}
                className="w-full py-4 rounded-xl bg-linear-to-r from-pink-600 via-orange-500 to-yellow-500 hover:from-pink-500 hover:via-orange-400 hover:to-yellow-400 text-white font-bold text-sm mt-6 shadow-lg shadow-orange-900/20 tracking-wide uppercase transition-all transform hover:-translate-y-0.5 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {isPending ? t('auth.login.processing') : t('auth.login.submitButton')}
              </button>
            </form>
          </Form>
        </div>

        <div className="w-full max-w-4xl z-20 mt-8 flex flex-col items-center gap-6 pb-6">
          <p className="text-slate-400 text-sm font-light tracking-[0.2em] uppercase opacity-80 text-center">
            <Trans
              i18nKey="auth.login.slogan"
              components={{ 1: <span className="text-transparent bg-clip-text bg-linear-to-r from-pink-400 to-yellow-400 font-bold border-b border-pink-500/20 pb-0.5" /> }}
            />
          </p>
          
           <div className="flex flex-wrap items-center justify-center gap-4 px-4">
            <a href="tel:+905070123018" className="flex items-center justify-center w-12 h-12 rounded-full bg-zinc-900/60 border border-white/10 text-slate-200 hover:text-lime-400 hover:bg-zinc-800 hover:border-lime-500/30 hover:shadow-[0_0_15px_rgba(132,204,22,0.3)] hover:scale-110 transition-all duration-300 group shadow-lg">
              <Call02Icon size={20} />
            </a>

            <a href="https://v3rii.com" target="_blank" rel="noreferrer" className="flex items-center justify-center w-12 h-12 rounded-full bg-zinc-900/60 border border-white/10 text-slate-200 hover:text-pink-400 hover:bg-zinc-800 hover:border-pink-500/30 hover:shadow-[0_0_15px_rgba(244,114,182,0.3)] hover:scale-110 transition-all duration-300 group shadow-lg">
              <Globe02Icon size={20} />
            </a>

            <a href="mailto:info@v3rii.com" className="flex items-center justify-center w-12 h-12 rounded-full bg-zinc-900/60 border border-white/10 text-slate-200 hover:text-orange-400 hover:bg-zinc-800 hover:border-orange-500/30 hover:shadow-[0_0_15px_rgba(251,146,60,0.3)] hover:scale-110 transition-all duration-300 group shadow-lg">
              <Mail02Icon size={20} />
            </a>

            <a href="https://wa.me/905070123018" target="_blank" rel="noreferrer" className="flex items-center justify-center w-12 h-12 rounded-full bg-zinc-900/60 border border-white/10 text-slate-200 hover:text-emerald-400 hover:bg-zinc-800 hover:border-emerald-500/30 hover:shadow-[0_0_15px_rgba(52,211,153,0.3)] hover:scale-110 transition-all duration-300 group shadow-lg">
              <WhatsappIcon size={20} />
            </a>

           <button 
              type="button"
              onClick={() => toast.info(t('auth.login.comingSoon', 'Çok yakında!'))} 
              className="flex items-center justify-center w-12 h-12 rounded-full bg-zinc-900/60 border border-white/10 text-slate-200 hover:text-sky-400 hover:bg-zinc-800 hover:border-sky-500/30 hover:shadow-[0_0_15px_rgba(56,189,248,0.3)] hover:scale-110 transition-all duration-300 group shadow-lg"
            >
              <TelegramIcon size={20} />
            </button>

            <button 
              type="button"
              onClick={() => toast.info(t('auth.login.comingSoon', 'Çok yakında!'))} 
              className="flex items-center justify-center w-12 h-12 rounded-full bg-zinc-900/60 border border-white/10 text-slate-200 hover:text-fuchsia-400 hover:bg-zinc-800 hover:border-fuchsia-500/30 hover:shadow-[0_0_15px_rgba(232,121,249,0.3)] hover:scale-110 transition-all duration-300 group shadow-lg"
            >
              <InstagramIcon size={20} />
            </button>

            <button 
              type="button"
              onClick={() => toast.info(t('auth.login.comingSoon', 'Çok yakında!'))} 
              className="flex items-center justify-center w-12 h-12 rounded-full bg-zinc-900/60 border border-white/10 text-slate-200 hover:text-white hover:bg-zinc-800 hover:border-white/30 hover:shadow-[0_0_15px_rgba(255,255,255,0.3)] hover:scale-110 transition-all duration-300 group shadow-lg"
            >
              <NewTwitterIcon size={20} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

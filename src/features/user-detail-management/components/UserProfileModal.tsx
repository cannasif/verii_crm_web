import { type ReactElement, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { loadLanguage } from '@/lib/i18n';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from '@/components/ui/select';
import {
  Mail02Icon,
  Moon02Icon,
  LanguageSquareIcon,
  UserIcon,
  ArrowRight01Icon,
  Logout02Icon,
  Sun01Icon,
  ShieldEnergyIcon,
  Cancel01Icon
} from 'hugeicons-react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { useTheme } from '@/components/theme-provider';
import { useAuthStore } from '@/stores/auth-store';
import { useUserDetailByUserId } from '@/features/user-detail-management/hooks/useUserDetailByUserId';
import { getImageUrl } from '@/features/user-detail-management/utils/image-url';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';

interface UserProfileModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOpenProfileDetails: () => void;
}

const languages = [
  { code: 'tr', name: 'Türkçe', flag: '🇹🇷', short: 'TR' },
  { code: 'en', name: 'English', flag: '🇬🇧', short: 'EN' },
  { code: 'de', name: 'Deutsch', flag: '🇩🇪', short: 'DE' },
  { code: 'fr', name: 'Français', flag: '🇫🇷', short: 'FR' },
  { code: 'it', name: 'Italiano', flag: '🇮🇹', short: 'IT' },
  { code: 'es', name: 'Español', flag: '🇪🇸', short: 'ES' },
  { code: 'ar', name: 'العربية', flag: '🇸🇦', short: 'AR' },
];

export function UserProfileModal({
  open,
  onOpenChange,
  onOpenProfileDetails
}: UserProfileModalProps): ReactElement {
  const { t, i18n } = useTranslation();
  const { theme, setTheme } = useTheme();
  const { user, logout, branch } = useAuthStore();
  const navigate = useNavigate();
  const { data: userDetail } = useUserDetailByUserId(user?.id || 0, open);

  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const checkIsDark = () => {
      const isDarkMode = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
      setIsDark(isDarkMode);
    };
    checkIsDark();
  }, [theme, open]);

  const normalizedLang = i18n.language?.toLowerCase() === 'sa' ? 'ar' : i18n.language?.toLowerCase().split('-')[0] ?? 'tr';
  const currentLanguage = languages.find((lang) => lang.code === normalizedLang) || languages[0];
  const [isChangingLanguage, setIsChangingLanguage] = useState(false);

  const displayName = user?.name || user?.email || t('dashboard.user');
  const displayInitials = user?.name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'U';

  const handleLogout = () => {
    logout();
    onOpenChange(false);
    navigate('/auth/login', { replace: true });
  };

  const handleLanguageChange = async (value: string): Promise<void> => {
    const target = value.toLowerCase() === 'sa' ? 'ar' : value.toLowerCase();
    if (target === normalizedLang) return;
    setIsChangingLanguage(true);
    try {
      await loadLanguage(target);
      await i18n.changeLanguage(target);
      if (typeof window !== 'undefined') window.localStorage.setItem('i18nextLng', target);
    } finally {
      setIsChangingLanguage(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn(
        "p-0 gap-0 border-none shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col w-[95vw] md:max-w-4xl lg:max-w-[1100px] max-h-[92dvh] md:max-h-[620px] rounded-[2rem] md:rounded-[2.5rem] transition-all duration-500 [&>button:last-of-type]:hidden",
        "bg-white text-slate-900 dark:bg-[#120c18] dark:text-white"
      )}>
        <DialogPrimitive.Close className={cn(
          "absolute right-4 top-4 md:right-6 md:top-6 z-50 rounded-2xl p-2.5 transition-all duration-200",
          "active:scale-90",
          "bg-slate-100 text-slate-400 hover:bg-red-600 hover:text-white dark:bg-white/5 dark:text-white/40 dark:hover:bg-red-600 dark:hover:text-white"
        )}>
          <Cancel01Icon size={20} strokeWidth={2.5} />
          <span className="sr-only">{t('common.close')}</span>
        </DialogPrimitive.Close>

        <DialogTitle className="sr-only">{t('sidebar.settings')}</DialogTitle>

        <div className="flex flex-col md:flex-row w-full h-full overflow-y-auto md:overflow-hidden">
          <div className={cn(
            "w-full md:w-[320px] lg:w-[380px] rounded-[1.5rem] md:rounded-[2rem] flex flex-col items-center justify-center md:justify-start md:pt-16 p-6 md:p-10 border-b md:border-b-0 md:border-r shrink-0 relative overflow-hidden transition-all duration-500",
            "bg-slate-50/80 border-slate-100 dark:bg-linear-to-b dark:from-[#1a1025] dark:to-[#120c18] dark:border-white/5"
          )}>
            <div className="absolute top-[-20%] left-[-20%] w-64 h-64 bg-pink-500/10 rounded-full blur-[80px]" />

            <div className="relative group mb-4 md:mb-6 mt-4 md:mt-0">
              <div className={cn(
                "w-20 h-20 sm:w-24 sm:h-24 md:w-36 md:h-36 lg:w-40 lg:h-40 rounded-[1.5rem] md:rounded-[2rem] overflow-hidden border-4 rotate-2 transition-transform group-hover:rotate-0 duration-500 p-1 shadow-2xl",
                "border-white bg-white dark:border-white/10 dark:bg-white/5"
              )}>
                {userDetail?.profilePictureUrl ? (
                  <img
                    src={getImageUrl(userDetail.profilePictureUrl) || ''}
                    alt={displayName}
                    className="w-full h-full rounded-[1.3rem] md:rounded-[1.8rem] object-cover"
                  />
                ) : (
                  <div className="w-full h-full rounded-[1.3rem] md:rounded-[1.8rem] bg-linear-to-br from-pink-500 via-purple-600 to-orange-500 flex items-center justify-center">
                    <span className="text-2xl sm:text-3xl md:text-5xl lg:text-6xl font-black text-white drop-shadow-lg">
                      {displayInitials}
                    </span>
                  </div>
                )}
              </div>
              <div className="absolute -bottom-1 -right-1 w-6 h-6 md:w-9 md:h-9 bg-emerald-500 rounded-2xl border-4 border-white dark:border-[#120c18] flex items-center justify-center shadow-lg">
                <ShieldEnergyIcon size={14} className="text-white md:hidden" />
                <ShieldEnergyIcon size={16} className="text-white hidden md:block" />
              </div>
            </div>

            <div className="text-center z-10 space-y-1">
              <h2 className="text-lg md:text-2xl lg:text-3xl font-black tracking-tight truncate max-w-[250px] md:max-w-[320px]">{displayName}</h2>
              <Badge variant="outline" className={cn(
                "rounded-full font-bold py-1 px-4 md:px-5 text-[10px] md:text-xs",
                "border-pink-200 bg-pink-50 text-pink-600 dark:border-pink-500/30 dark:bg-pink-500/5 dark:text-pink-400"
              )}>
                {branch?.name || 'Administrator'}
              </Badge>
            </div>

            <div className="mt-4 md:mt-8 space-y-3 z-10 px-2 md:px-8">
              <div className={cn("flex items-center gap-3 md:gap-4 p-2.5 md:p-3 rounded-2xl transition-all", "bg-white shadow-sm dark:bg-white/5 dark:shadow-none")}>
                <Mail02Icon size={16} className="text-pink-500 shrink-0" />
                <span className="text-xs font-semibold truncate opacity-70">{user?.email}</span>
              </div>
            </div>
          </div>

          <div className="flex-1 p-5 md:p-10 lg:p-6 flex flex-col min-h-0 relative">
            <div className="flex items-center gap-3 mb-2 md:mb-6 shrink-0 pb-3 md:pb- border-b border-dashed border-slate-200 dark:border-white/10">
              <div className="w-1.5 h-5 md:h-8 bg-linear-to-b from-pink-500 to-purple-600 rounded-full" />
              <h3 className="text-lg md:text-4xl lg:text-3x1 font-black tracking-tight uppercase">{t('sidebar.settings')}</h3>
            </div>

            <div className={cn(
              "flex flex-col gap-3 md:gap-4 flex-none md:flex-1 pr-1",
              "md:overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none']"
            )}>
              <button
                className={cn(
                  "group w-full p-2 md:p-3 lg:p-4 flex items-center justify-between border rounded-[1.5rem] md:rounded-[2rem] transition-all duration-300",
                  "border-slate-100 bg-slate-50/50 hover:bg-white hover:shadow-xl hover:border-pink-200 dark:border-white/5 dark:bg-white/5 dark:hover:bg-white/[0.08] dark:hover:border-pink-500/30"
                )}
                onClick={onOpenProfileDetails}
              >
                <div className="flex items-center gap-3 md:gap-4">
                  <div className={cn("p-2.5 md:p-4 rounded-2xl shadow-lg", "bg-purple-100 text-purple-600 dark:bg-purple-500/20 dark:text-purple-400")}>
                    <UserIcon size={18} className="md:w-6 md:h-6" />
                  </div>
                  <div className="text-left">
                    <p className="font-bold text-sm md:text-base lg:text-lg">{t('profile.title')}</p>
                    <p className="text-[10px] md:text-xs opacity-50 hidden sm:block">{t('customerManagement.form.editDescription')}</p>
                  </div>
                </div>
                <ArrowRight01Icon size={16} className="opacity-30 group-hover:translate-x-1 transition-transform md:w-[18px]" />
              </button>

              <div className={cn(
                "group w-full p-2 md:p-3 lg:p-4 flex items-center justify-between border rounded-[1.5rem] md:rounded-[2rem] transition-all",
                "border-slate-100 bg-slate-50/50 dark:border-white/5 dark:bg-white/5"
              )}>
                <div className="flex items-center gap-3 md:gap-4 flex-1">
                  <div className={cn("p-2.5 md:p-4 rounded-2xl shadow-lg", "bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400")}>
                    <LanguageSquareIcon size={18} className="md:w-6 md:h-6" />
                  </div>
                  <div className="text-left">
                    <p className="font-bold text-sm md:text-base lg:text-lg">{t('language_choice')}</p>
                  </div>
                </div>
                <Select value={currentLanguage.code} onValueChange={handleLanguageChange} disabled={isChangingLanguage}>
                  <SelectTrigger className={cn(
                    "w-16 md:w-24 lg:w-28 h-9 md:h-10 shadow-none focus:ring-0 font-black text-xs md:text-sm transition-all",
                    "bg-slate-100 border border-slate-200 hover:bg-slate-200 text-slate-700 dark:bg-white/10 dark:border-none dark:hover:bg-white/20 dark:text-white"
                  )}>
                    <span>{currentLanguage.short}</span>
                  </SelectTrigger>
                  <SelectContent className={cn(
                    "rounded-2xl border shadow-2xl",
                    "bg-white border-slate-200 text-slate-900 dark:bg-[#1a1025] dark:border-white/10 dark:text-white"
                  )}>
                    {languages.map((l) => (
                      <SelectItem
                        key={l.code}
                        value={l.code}
                        className={cn(
                          "rounded-xl my-1 transition-colors focus:bg-pink-600 focus:text-white cursor-pointer",
                          "hover:bg-slate-100 dark:hover:bg-white/5"
                        )}
                      >
                        <span className="flex items-center gap-2">
                          <span>{l.flag}</span>
                          <span className="font-medium">{l.name}</span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className={cn(
                "group w-full p-2 md:p-3 lg:p-4 flex items-center justify-between border rounded-[1.5rem] md:rounded-[2rem] transition-all",
                "border-slate-100 bg-slate-50/50 dark:border-white/5 dark:bg-white/5"
              )}>
                <div className="flex items-center gap-3 md:gap-4">
                  <div className={cn("p-2.5 md:p-4 rounded-2xl shadow-lg", "bg-orange-100 text-orange-600 dark:bg-orange-500/20 dark:text-orange-400")}>
                    {isDark ? <Moon02Icon size={18} className="md:w-6 md:h-6" /> : <Sun01Icon size={18} className="md:w-6 md:h-6" />}
                  </div>
                  <div className="text-left">
                    <p className="font-bold text-sm md:text-base lg:text-lg">{t('appearance')}</p>
                  </div>
                </div>
                <Switch
                  checked={isDark}
                  onCheckedChange={() => setTheme(isDark ? 'light' : 'dark')}
                  className="data-[state=checked]:bg-pink-600 scale-75 md:scale-100"
                />
              </div>
            </div>

            <div className="mt-4 md:mt-6 pt-4 md:pt-6 border-t border-dashed border-slate-200 dark:border-white/10 shrink-0 pb-1 md:pb-0">
              <Button
                className="w-full h-11 md:h-14 lg:h-15 rounded-[1.2rem] md:rounded-[1.3rem] text-white font-black text-sm md:text-lg lg:text-xl bg-linear-to-r from-pink-600 to-orange-600 hover:scale-[1.01] active:scale-[0.98] transition-all shadow-[0_10px_20px_-10px_rgba(219,39,119,0.5)]
                opacity-90 grayscale-[0] 
                dark:opacity-100 dark:grayscale-0
                "
                onClick={handleLogout}
              >
                <Logout02Icon size={18} className="mr-3 md:w-5 md:h-5" />
                {t('logout')}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

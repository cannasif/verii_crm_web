import { type ReactElement, useState, useEffect, useCallback } from 'react';
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
import { Check, Palette } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { TooltipProvider } from '@/components/ui/tooltip';
import { useTheme } from '@/components/theme-provider';
import {
  darkBrandThemes,
  getBrandThemeAppearance,
  lightBrandThemes,
  type BrandThemeDefinition,
} from '@/lib/brand-themes';
import { useAuthStore } from '@/stores/auth-store';
import { useUserDetailByUserId } from '@/features/user-detail-management/hooks/useUserDetailByUserId';
import { getImageUrl } from '@/features/user-detail-management/utils/image-url';
import { cn } from '@/lib/utils';
import { CRM_SELECT_MENU_ITEM_CLASS } from '@/lib/menu-interactive-styles';
import { useNavigate } from 'react-router-dom';
import { DOCUMENT_DIALOG_CLOSE_BUTTON_BASE_CLASS } from '@/lib/document-line-dialog-styles';

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

const SETTINGS_SWITCH_CLASS = 'scale-75 md:scale-100 shrink-0';

const SETTINGS_PANEL_ITEM_CLASS = cn(
  'border rounded-[1.5rem] md:rounded-[2rem] transition-all duration-200',
  'border-slate-200 bg-white shadow-sm',
  'dark:border-white/10 dark:bg-white/5 dark:shadow-none',
);

const SETTINGS_PROFILE_BUTTON_CLASS = cn(
  'group w-full cursor-pointer p-2 md:p-3 lg:p-4 flex items-center justify-between',
  'rounded-[1.5rem] border transition-colors duration-200 md:rounded-[2rem]',
  'border-slate-200 bg-white shadow-sm',
  'dark:border-white/10 dark:bg-white/5 dark:shadow-none',
  'hover:!border-[var(--crm-brand-primary)] hover:bg-[var(--crm-brand-soft)] hover:shadow-[0_8px_22px_-14px_var(--crm-brand-shadow)]',
  'dark:hover:!border-[var(--crm-brand-primary)] dark:hover:bg-[var(--crm-brand-soft)]',
);

const SETTINGS_ROW_CLASS = cn(
  SETTINGS_PANEL_ITEM_CLASS,
  'group w-full p-2 md:p-3 lg:p-4 flex items-center justify-between',
);

export function UserProfileModal({
  open,
  onOpenChange,
  onOpenProfileDetails
}: UserProfileModalProps): ReactElement {
  const { t, i18n } = useTranslation();
  const {
    theme,
    brandTheme,
    isBrandThemeListEnabled,
    v3riiAppearanceRevision,
    setTheme,
    setBrandTheme,
    setBrandThemeListEnabled,
    toggleV3riiAppearanceOverride,
  } = useTheme();
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

  const handleLogout = (): void => {
    logout();
    onOpenChange(false);
    navigate('/auth/login', { replace: true });
  };

  const resolveThemeAppearanceLabel = useCallback((item: BrandThemeDefinition): string => {
    void v3riiAppearanceRevision;
    const appearance = item.id === 'v3rii' ? getBrandThemeAppearance('v3rii') : item.appearance;
    return appearance === 'dark' ? t('theme.dark') : t('theme.light');
  }, [t, v3riiAppearanceRevision]);

  const handleThemeBadgeDoubleClick = useCallback((
    event: React.MouseEvent<HTMLSpanElement>,
    item: BrandThemeDefinition,
  ): void => {
    if (item.id !== 'v3rii') {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    toggleV3riiAppearanceOverride();
  }, [toggleV3riiAppearanceOverride]);

  const renderThemeCard = (item: BrandThemeDefinition): ReactElement => {
    const isSelected = item.id === brandTheme;
    return (
      <button
        key={item.id}
        type="button"
        onClick={() => setBrandTheme(item.id)}
        className={cn(
          'flex h-[4.75rem] w-full min-h-[4.75rem] items-center gap-2.5 rounded-xl border p-2.5 text-left transition-colors md:h-[5rem] md:gap-3 md:p-3',
          'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50 dark:border-white/10 dark:bg-transparent dark:hover:bg-white/5',
          isSelected && 'border-[var(--crm-brand-primary)] bg-[var(--crm-brand-soft)]',
        )}
      >
        <span className="flex h-9 w-11 shrink-0 overflow-hidden rounded-xl border border-white/40 shadow-sm md:w-12">
          {item.swatches.map((color) => (
            <span key={color} className="h-full flex-1" style={{ backgroundColor: color }} />
          ))}
        </span>
        <span className="flex min-h-0 min-w-0 flex-1 flex-col justify-center">
          <span className="flex min-w-0 items-center gap-1.5">
            <span className="min-w-0 flex-1 truncate text-xs font-black md:text-sm">{item.label}</span>
            <span
              onDoubleClick={(event) => handleThemeBadgeDoubleClick(event, item)}
              className="shrink-0 rounded-md border border-[var(--crm-app-border)] px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-[var(--crm-app-text-muted)] md:text-[10px]"
            >
              {resolveThemeAppearanceLabel(item)}
            </span>
          </span>
          <span className="mt-0.5 line-clamp-2 text-[10px] leading-snug font-medium text-[var(--crm-app-text-muted)] md:text-[11px]">
            {item.description}
          </span>
        </span>
        <span className={cn(
          'flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-[var(--crm-brand-primary)] bg-[var(--crm-brand-primary)] text-white transition-opacity',
          isSelected ? 'opacity-100' : 'opacity-0',
        )}>
          <Check size={14} strokeWidth={3} />
        </span>
      </button>
    );
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
      <TooltipProvider delayDuration={200}>
      <DialogContent className={cn(
        "p-0 gap-0 border-none shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col w-[95vw] md:max-w-4xl lg:max-w-[1100px] h-[min(94dvh,760px)] md:h-[760px] md:max-h-[760px] rounded-[2rem] md:rounded-[2.5rem] [&>button:last-of-type]:hidden",
        "bg-[var(--crm-app-panel)] text-slate-900 dark:text-white"
      )}>
        <DialogPrimitive.Close className={cn(
          "absolute right-4 top-4 md:right-6 md:top-6 z-50 h-10 w-10 rounded-full p-0",
          "active:scale-90",
          DOCUMENT_DIALOG_CLOSE_BUTTON_BASE_CLASS
        )}>
          <Cancel01Icon size={20} strokeWidth={2.5} />
          <span className="sr-only">{t('common.close')}</span>
        </DialogPrimitive.Close>

        <DialogTitle className="sr-only">{t('sidebar.settings')}</DialogTitle>

        <div className="flex flex-col md:flex-row w-full h-full overflow-y-auto md:overflow-hidden">
          <div className={cn(
            "w-full md:w-[280px] lg:w-[340px] rounded-[1.5rem] md:rounded-[2rem] flex flex-col items-center justify-center md:justify-start md:pt-16 p-6 md:p-10 border-b md:border-b-0 md:border-r shrink-0 relative overflow-hidden transition-all duration-500",
            "bg-slate-50/80 border-slate-100 dark:border-white/5 dark:bg-[linear-gradient(180deg,var(--crm-app-panel-strong)_0%,var(--crm-app-panel)_100%)]"
          )}>
            <div className="absolute left-[-20%] top-[-20%] h-64 w-64 rounded-full bg-[var(--crm-brand-soft)] blur-[80px]" />

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
                  <div className="flex h-full w-full items-center justify-center rounded-[1.3rem] bg-[image:var(--crm-brand-gradient)] md:rounded-[1.8rem]">
                    <span className="text-2xl sm:text-3xl md:text-5xl lg:text-6xl font-black text-white drop-shadow-lg">
                      {displayInitials}
                    </span>
                  </div>
                )}
              </div>
              <div className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-2xl border-4 border-white bg-emerald-500 shadow-lg md:h-9 md:w-9 dark:border-[var(--crm-app-panel)]">
                <ShieldEnergyIcon size={14} className="text-white md:hidden" />
                <ShieldEnergyIcon size={16} className="text-white hidden md:block" />
              </div>
            </div>

            <div className="text-center z-10 space-y-1">
              <h2 className="text-lg md:text-2xl lg:text-3xl font-black tracking-tight truncate max-w-[250px] md:max-w-[320px]">{displayName}</h2>
              <Badge variant="outline" className={cn(
                "rounded-full font-bold py-1 px-4 md:px-5 text-[10px] md:text-xs",
                "border-[var(--crm-brand-ring)] bg-[var(--crm-brand-soft)] text-[var(--crm-brand-primary)]"
              )}>
                {branch?.name || 'Administrator'}
              </Badge>
            </div>

            <div className="mt-4 md:mt-8 space-y-3 z-10 px-2 md:px-8">
              <div className={cn("flex items-center gap-3 md:gap-4 p-2.5 md:p-3 rounded-2xl transition-all", "bg-white shadow-sm dark:bg-white/5 dark:shadow-none")}>
                <Mail02Icon size={16} className="shrink-0 text-[var(--crm-brand-primary)]" />
                <span className="text-xs font-semibold truncate opacity-70">{user?.email}</span>
              </div>
            </div>
          </div>

          <div className="flex-1 p-5 md:p-10 lg:p-6 flex flex-col min-h-0 relative">
            <div className="flex items-center gap-3 mb-1 md:mb-2 shrink-0 pb-2 md:pb-2.5 border-b border-dashed border-slate-200 dark:border-white/10">
              <div className="h-5 w-1.5 rounded-full bg-[image:var(--crm-brand-gradient)] md:h-8" />
              <h3 className="text-lg md:text-4xl lg:text-3x1 font-black tracking-tight uppercase">{t('sidebar.settings')}</h3>
            </div>

            <div className={cn(
              "flex flex-col gap-2 md:gap-2.5 flex-1 min-h-0 pr-1",
              "overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none']"
            )}>
              <button
                className={SETTINGS_PROFILE_BUTTON_CLASS}
                onClick={onOpenProfileDetails}
              >
                <div className="flex items-center gap-3 md:gap-4">
                  <div className={cn("p-2.5 md:p-4 rounded-2xl shadow-lg", "bg-accent text-primary dark:bg-accent/20 dark:text-primary")}>
                    <UserIcon size={18} className="md:w-6 md:h-6" />
                  </div>
                  <div className="text-left">
                    <p className="font-bold text-sm md:text-base lg:text-lg">{t('profile.title')}</p>
                    <p className="text-[10px] md:text-xs opacity-50 hidden sm:block">{t('profile.editDescription')}</p>
                  </div>
                </div>
                <ArrowRight01Icon size={16} className="opacity-40 transition-all group-hover:translate-x-1 group-hover:text-[var(--crm-brand-primary)] group-hover:opacity-100 md:w-[18px]" />
              </button>

              <div className={cn(SETTINGS_ROW_CLASS)}>
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
                          CRM_SELECT_MENU_ITEM_CLASS,
                          currentLanguage.code === l.code
                            ? "bg-[var(--crm-brand-soft)] text-[var(--crm-brand-primary)] font-bold"
                            : undefined
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

              <div className="flex flex-col gap-2 md:gap-2.5">
                <div className={SETTINGS_ROW_CLASS}>
                  <div className="flex items-center gap-3 md:gap-4">
                    <div className={cn("p-2.5 md:p-4 rounded-2xl shadow-lg", "bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400")}>
                      {isDark ? <Moon02Icon size={18} className="md:w-6 md:h-6" /> : <Sun01Icon size={18} className="md:w-6 md:h-6" />}
                    </div>
                    <div className="text-left min-w-0">
                      <p className="font-bold text-sm md:text-base lg:text-lg">{t('appearance')}</p>
                      <p className="mt-0.5 text-[10px] font-semibold leading-relaxed text-[var(--crm-app-text-muted)] md:text-xs">
                        {isBrandThemeListEnabled
                          ? t('appearanceLockedByBrandTheme')
                          : isDark
                            ? t('theme.dark')
                            : t('theme.light')}
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={isDark}
                    onCheckedChange={(checked) => setTheme(checked ? 'dark' : 'light')}
                    disabled={isBrandThemeListEnabled}
                    className={cn(
                      SETTINGS_SWITCH_CLASS,
                      isBrandThemeListEnabled && 'cursor-not-allowed opacity-50',
                    )}
                  />
                </div>

                <div className={SETTINGS_ROW_CLASS}>
                  <div className="flex items-center gap-3 md:gap-4 flex-1 min-w-0">
                    <div className={cn("p-2.5 md:p-4 rounded-2xl shadow-lg", "bg-[var(--crm-brand-soft)] text-[var(--crm-brand-primary)]")}>
                      <Palette size={18} className="md:h-6 md:w-6" />
                    </div>
                    <div className="text-left min-w-0">
                      <p className="font-bold text-sm md:text-base lg:text-lg">{t('useCustomThemes')}</p>
                      <p className="mt-0.5 line-clamp-2 text-[10px] font-semibold text-[var(--crm-app-text-muted)] md:text-xs">
                        {isBrandThemeListEnabled ? t('useCustomThemesOnHint') : t('useCustomThemesOffHint')}
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={isBrandThemeListEnabled}
                    onCheckedChange={setBrandThemeListEnabled}
                    className={SETTINGS_SWITCH_CLASS}
                  />
                </div>

                {isBrandThemeListEnabled && (
                  <div className={cn(SETTINGS_PANEL_ITEM_CLASS, 'p-2 md:p-3')}>
                    <p className="mb-2 px-1 text-[10px] font-black uppercase tracking-[0.14em] text-[var(--crm-app-text-muted)] md:text-xs">
                      {t('customThemeSelection')}
                    </p>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
                      <div className="flex min-w-0 flex-col gap-2">
                        <p className="px-1 text-[10px] font-black uppercase tracking-[0.12em] text-[var(--crm-app-text-muted)] md:text-[11px]">
                          {t('customThemeDarkColumn')}
                        </p>
                        <div className="flex flex-col gap-2">
                          {darkBrandThemes.map((item) => renderThemeCard(item))}
                        </div>
                      </div>
                      <div className="flex min-w-0 flex-col gap-2">
                        <p className="px-1 text-[10px] font-black uppercase tracking-[0.12em] text-[var(--crm-app-text-muted)] md:text-[11px]">
                          {t('customThemeLightColumn')}
                        </p>
                        <div className="flex flex-col gap-2">
                          {lightBrandThemes.map((item) => renderThemeCard(item))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-4 md:mt-6 pt-4 md:pt-6 border-t border-dashed border-slate-200 dark:border-white/10 shrink-0 pb-1 md:pb-0">
              <Button
                className="h-11 w-full rounded-[1.2rem] bg-[image:var(--crm-brand-gradient)] text-sm font-black text-white shadow-[0_10px_20px_-10px_var(--crm-brand-shadow)] transition-all hover:scale-[1.01] active:scale-[0.98] md:h-14 md:rounded-[1.3rem] md:text-lg lg:h-15 lg:text-xl
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
      </TooltipProvider>
    </Dialog>
  );
}

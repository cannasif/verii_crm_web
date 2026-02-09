import { type ReactElement, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { loadLanguage } from '@/lib/i18n';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from '@/components/ui/select';
import { 
  Mail, 
  Moon, 
  Globe, 
  Bell, 
  User, 
  ChevronRight,
  LogOut,
  Briefcase,
  Building2,
} from 'lucide-react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { useTheme } from '@/components/theme-provider';
import { useAuthStore } from '@/stores/auth-store';
import { useUserDetailByUserId } from '@/features/user-detail-management/hooks/useUserDetailByUserId';
import { getImageUrl } from '@/features/user-detail-management/utils/image-url';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

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
  const { i18n } = useTranslation();
  const { theme, setTheme } = useTheme();
  const { user, logout, branch } = useAuthStore();
  const navigate = useNavigate();
  const { data: userDetail } = useUserDetailByUserId(user?.id || 0);

  const normalizedLang = i18n.language?.toLowerCase() === 'sa' ? 'ar' : i18n.language?.toLowerCase().split('-')[0] ?? 'tr';
  const currentLanguage = languages.find((lang) => lang.code === normalizedLang) || languages[0];
  const [isChangingLanguage, setIsChangingLanguage] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = window.localStorage.getItem('notificationsEnabled');
      return saved !== null ? JSON.parse(saved) : true;
    }
    return true;
  });

  const displayName = user?.name || user?.email || 'Kullanıcı';
  const displayInitials = user?.name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'MK';

  const handleLogout = () => {
    logout();
    onOpenChange(false);
    navigate('/login');
  };

  const darkMode = theme === 'dark';

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  const toggleNotifications = (enabled: boolean) => {
    setNotificationsEnabled(enabled);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('notificationsEnabled', JSON.stringify(enabled));
    }
    toast.success(`Sistem bildirimleri ${enabled ? 'açıldı' : 'kapatıldı'}`);
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
        "p-0 gap-0 border-none shadow-2xl overflow-hidden flex flex-col w-[calc(100vw-1.5rem)] max-w-[calc(100vw-1.5rem)] sm:max-w-[1000px] max-h-[90dvh] sm:max-h-[90vh] min-h-0 rounded-xl sm:rounded-2xl md:flex-row",
        darkMode ? "bg-[#1a1025] text-white" : "bg-white text-slate-900"
      )}>
        <DialogTitle className="sr-only">Kullanıcı Ayarları</DialogTitle>

        <div className={cn(
          "w-full md:w-72 lg:w-80 p-4 sm:p-6 md:p-6 lg:p-8 flex flex-col items-center border-b md:border-b-0 md:border-r shrink-0 relative md:h-full",
          darkMode ? "bg-[#150a1f]/60 border-white/10" : "bg-slate-50 border-slate-100"
        )}>
          <div className="relative mb-4 sm:mb-6">
            <div className={cn(
              "w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28 lg:w-32 lg:h-32 rounded-full overflow-hidden border-2 md:border-4 p-0.5 md:p-1 shadow-xl md:shadow-2xl",
              darkMode ? "border-white/10 bg-white/5" : "border-white bg-white"
            )}>
              {userDetail?.profilePictureUrl ? (
                <img
                  src={getImageUrl(userDetail.profilePictureUrl) || ''}
                  alt={displayName}
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                <div className="w-full h-full rounded-full bg-linear-to-br from-pink-500 to-orange-500 flex items-center justify-center">
                  <span className="text-2xl sm:text-3xl md:text-4xl font-bold text-white">
                    {displayInitials}
                  </span>
                </div>
              )}
            </div>
            <div className="absolute bottom-0.5 right-0.5 sm:bottom-2 sm:right-2 w-3 h-3 sm:w-5 sm:h-5 bg-emerald-500 rounded-full border-2 md:border-4 border-[#150a1f] shadow-sm" />
          </div>

          <h2 className="text-base sm:text-lg md:text-xl font-bold text-center mb-0.5 sm:mb-1 truncate w-full px-2">{displayName}</h2>
          <p className={cn("text-xs sm:text-sm text-center mb-4 sm:mb-6 md:mb-8 truncate w-full px-2", darkMode ? "text-slate-400" : "text-slate-500")}>
            {user?.email}
          </p>

          <div className="w-full space-y-2 sm:space-y-4">
            <div className="flex items-center gap-2 sm:gap-3 text-xs sm:text-sm min-w-0">
              <div className={cn("p-1.5 sm:p-2 rounded-lg shrink-0", darkMode ? "bg-white/5 text-slate-400" : "bg-white text-slate-500 shadow-sm")}>
                <Mail size={14} className="sm:w-4 sm:h-4" />
              </div>
              <span className={cn("truncate", darkMode ? "text-slate-300" : "text-slate-600")}>{user?.email}</span>
            </div>
            <div className="flex items-center gap-2 sm:gap-3 text-xs sm:text-sm min-w-0">
              <div className={cn("p-1.5 sm:p-2 rounded-lg shrink-0", darkMode ? "bg-white/5 text-slate-400" : "bg-white text-slate-500 shadow-sm")}>
                <Building2 size={14} className="sm:w-4 sm:h-4" />
              </div>
              <span className={cn("truncate", darkMode ? "text-slate-300" : "text-slate-600")}>{branch?.name || 'Merkez Ofis'}</span>
            </div>
            <div className="flex items-center gap-2 sm:gap-3 text-xs sm:text-sm min-w-0">
              <div className={cn("p-1.5 sm:p-2 rounded-lg shrink-0", darkMode ? "bg-white/5 text-slate-400" : "bg-white text-slate-500 shadow-sm")}>
                <Briefcase size={14} className="sm:w-4 sm:h-4" />
              </div>
              <span className={cn("truncate", darkMode ? "text-slate-300" : "text-slate-600")}>Yönetim</span>
            </div>
          </div>
        </div>

        <div className="flex-1 p-4 sm:p-6 flex flex-col min-h-0 overflow-y-auto">
          <div className="flex items-center justify-between gap-2 mb-4 sm:mb-6 shrink-0">
            <h3 className="text-lg sm:text-xl md:text-2xl font-bold truncate min-w-0">Hesap Ayarları</h3>
            <Badge variant="secondary" className="px-2 py-1 text-xs font-normal shrink-0">v3.2.0</Badge>
          </div>

          <div className="flex flex-col gap-3 sm:gap-4 flex-1 min-h-0">
            <Button
              variant="outline"
              className={cn(
                "w-full min-h-[56px] sm:min-h-[64px] px-4 sm:px-6 justify-between border rounded-xl sm:rounded-2xl group hover:bg-accent/50",
                darkMode ? "border-white/10 bg-white/5" : "border-slate-200 bg-white"
              )}
              onClick={onOpenProfileDetails}
            >
              <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
                <div className={cn("p-2 sm:p-3 rounded-lg sm:rounded-xl shrink-0", darkMode ? "bg-purple-500/20 text-purple-400" : "bg-purple-50 text-purple-600")}>
                  <User size={20} className="sm:w-6 sm:h-6" />
                </div>
                <div className="text-left min-w-0">
                  <div className="text-sm sm:text-base font-semibold truncate">Profil Bilgileri</div>
                  <div className={cn("text-xs sm:text-sm font-normal mt-0.5 truncate", darkMode ? "text-slate-400" : "text-slate-500")}>
                    Kişisel bilgilerinizi düzenleyin
                  </div>
                </div>
              </div>
              <ChevronRight size={18} className={cn("shrink-0 transition-transform group-hover:translate-x-1", darkMode ? "text-slate-500" : "text-slate-400")} />
            </Button>

            <Select value={currentLanguage.code} onValueChange={handleLanguageChange} disabled={isChangingLanguage}>
              <SelectTrigger className={cn(
                "w-full min-h-[56px] sm:min-h-[64px] px-4 sm:px-6 border rounded-xl sm:rounded-2xl hover:bg-accent/50 [&>span]:w-full [&>span]:flex [&>span]:items-center [&>span]:justify-between",
                darkMode ? "border-white/10 bg-white/5" : "border-slate-200 bg-white"
              )}>
                <div className="flex-1 flex items-center gap-3 sm:gap-4 min-w-0">
                  <div className={cn("p-2 sm:p-3 rounded-lg sm:rounded-xl shrink-0", darkMode ? "bg-blue-500/20 text-blue-400" : "bg-blue-50 text-blue-600")}>
                    <Globe size={20} className="sm:w-6 sm:h-6" />
                  </div>
                  <div className="text-left min-w-0">
                    <div className="text-sm sm:text-base font-semibold truncate">Dil Seçeneği</div>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant="secondary" className="px-2 sm:px-3 py-0.5 sm:py-1 rounded-md text-xs sm:text-sm">{currentLanguage.short}</Badge>
                </div>
              </SelectTrigger>
              <SelectContent>
                {languages.map((language) => (
                  <SelectItem key={language.code} value={language.code}>
                    <div className="flex items-center gap-2">
                      <span>{language.flag}</span>
                      <span>{language.name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className={cn(
              "w-full min-h-[56px] sm:min-h-[64px] px-4 sm:px-6 flex items-center justify-between gap-3 border rounded-xl sm:rounded-2xl",
              darkMode ? "border-white/10 bg-white/5" : "border-slate-200 bg-white"
            )}>
              <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
                <div className={cn("p-2 sm:p-3 rounded-lg sm:rounded-xl shrink-0", darkMode ? "bg-orange-500/20 text-orange-400" : "bg-orange-50 text-orange-600")}>
                  <Moon size={20} className="sm:w-6 sm:h-6" />
                </div>
                <div className="text-left min-w-0">
                  <div className="text-sm sm:text-base font-semibold truncate">Görünüm Modu</div>
                </div>
              </div>
              <Switch checked={darkMode} onCheckedChange={toggleTheme} className="shrink-0" />
            </div>

            <div className={cn(
              "w-full min-h-[56px] sm:min-h-[64px] px-4 sm:px-6 flex items-center justify-between gap-3 border rounded-xl sm:rounded-2xl",
              darkMode ? "border-white/10 bg-white/5" : "border-slate-200 bg-white"
            )}>
              <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
                <div className={cn("p-2 sm:p-3 rounded-lg sm:rounded-xl shrink-0", darkMode ? "bg-emerald-500/20 text-emerald-400" : "bg-emerald-50 text-emerald-600")}>
                  <Bell size={20} className="sm:w-6 sm:h-6" />
                </div>
                <div className="text-left min-w-0">
                  <div className="text-sm sm:text-base font-semibold truncate">Sistem Bildirimleri</div>
                </div>
              </div>
              <Switch checked={notificationsEnabled} onCheckedChange={toggleNotifications} className="shrink-0" />
            </div>
          </div>

          <div className="mt-4 sm:mt-6 pt-4 sm:pt-6 border-t border-border shrink-0">
            <Button
              className="w-full h-10 sm:h-12 rounded-xl text-white font-semibold text-sm sm:text-base bg-linear-to-r from-pink-600 to-orange-500 hover:from-pink-700 hover:to-orange-600 shadow-lg shadow-pink-900/20"
              onClick={handleLogout}
            >
              <LogOut size={16} className="mr-2 shrink-0 sm:w-[18px] sm:h-[18px]" />
              Çıkış Yap
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

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
        "p-0 gap-0 border-none shadow-2xl overflow-hidden flex flex-col md:flex-row w-full sm:max-w-[1000px] !max-w-[1000px] h-[600px] rounded-2xl",
        darkMode ? "bg-[#1a1025] text-white" : "bg-white text-slate-900"
      )}>
        <DialogTitle className="sr-only">Kullanıcı Ayarları</DialogTitle>

        <div className={cn(
          "w-80 p-8 flex flex-col items-center border-r shrink-0 relative h-full",
          darkMode ? "bg-[#150a1f]/60 border-white/10" : "bg-slate-50 border-slate-100"
        )}>
          <div className="relative mb-6">
            <div className={cn(
              "w-32 h-32 rounded-full overflow-hidden border-4 p-1 shadow-2xl",
              darkMode ? "border-white/10 bg-white/5" : "border-white bg-white"
            )}>
              {userDetail?.profilePictureUrl ? (
                <img
                  src={getImageUrl(userDetail.profilePictureUrl) || ''}
                  alt={displayName}
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                <div className="w-full h-full rounded-full bg-gradient-to-br from-pink-500 to-orange-500 flex items-center justify-center">
                  <span className="text-4xl font-bold text-white">
                    {displayInitials}
                  </span>
                </div>
              )}
            </div>
            <div className="absolute bottom-2 right-2 w-5 h-5 bg-emerald-500 rounded-full border-4 border-[#150a1f] shadow-sm" />
          </div>

          <h2 className="text-xl font-bold text-center mb-1 truncate w-full px-2">{displayName}</h2>
          <p className={cn("text-sm text-center mb-8 truncate w-full px-2", darkMode ? "text-slate-400" : "text-slate-500")}>
            {user?.email}
          </p>

          <div className="w-full space-y-4">
            <div className="flex items-center gap-3 text-sm">
              <div className={cn("p-2 rounded-lg", darkMode ? "bg-white/5 text-slate-400" : "bg-white text-slate-500 shadow-sm")}>
                <Mail size={16} />
              </div>
              <span className={cn("truncate", darkMode ? "text-slate-300" : "text-slate-600")}>{user?.email}</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <div className={cn("p-2 rounded-lg", darkMode ? "bg-white/5 text-slate-400" : "bg-white text-slate-500 shadow-sm")}>
                <Building2 size={16} />
              </div>
              <span className={cn("truncate", darkMode ? "text-slate-300" : "text-slate-600")}>{branch?.name || 'Merkez Ofis'}</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <div className={cn("p-2 rounded-lg", darkMode ? "bg-white/5 text-slate-400" : "bg-white text-slate-500 shadow-sm")}>
                <Briefcase size={16} />
              </div>
              <span className={cn("truncate", darkMode ? "text-slate-300" : "text-slate-600")}>Yönetim</span>
            </div>
          </div>
        </div>

        <div className="flex-1 p-6 flex flex-col h-full min-w-0 overflow-hidden">
          <div className="flex items-center justify-between mb-6 shrink-0 mr-8">
            <h3 className="text-2xl font-bold">Hesap Ayarları</h3>
            <Badge variant="secondary" className="px-2 py-1 text-xs font-normal">v3.2.0</Badge>
          </div>

          <div className="flex flex-col gap-4 flex-1 overflow-hidden min-h-0">
            <Button
              variant="outline"
              className={cn(
                "w-full flex-1 px-6 justify-between border rounded-2xl group hover:bg-accent/50",
                darkMode ? "border-white/10 bg-white/5" : "border-slate-200 bg-white"
              )}
              onClick={onOpenProfileDetails}
            >
              <div className="flex items-center gap-4">
                <div className={cn("p-3 rounded-xl", darkMode ? "bg-purple-500/20 text-purple-400" : "bg-purple-50 text-purple-600")}>
                  <User size={24} />
                </div>
                <div className="text-left">
                  <div className="text-base font-semibold">Profil Bilgileri</div>
                  <div className={cn("text-sm font-normal mt-0.5", darkMode ? "text-slate-400" : "text-slate-500")}>
                    Kişisel bilgilerinizi düzenleyin
                  </div>
                </div>
              </div>
              <ChevronRight size={20} className={cn("transition-transform group-hover:translate-x-1", darkMode ? "text-slate-500" : "text-slate-400")} />
            </Button>

            <Select value={currentLanguage.code} onValueChange={handleLanguageChange} disabled={isChangingLanguage}>
              <SelectTrigger className={cn(
                "w-full flex-1 px-6 border rounded-2xl hover:bg-accent/50 [&>span]:w-full [&>span]:flex [&>span]:items-center [&>span]:justify-between",
                darkMode ? "border-white/10 bg-white/5" : "border-slate-200 bg-white"
              )}>
                <div className="flex-1 flex items-center gap-4">
                  <div className={cn("p-3 rounded-xl", darkMode ? "bg-blue-500/20 text-blue-400" : "bg-blue-50 text-blue-600")}>
                    <Globe size={24} />
                  </div>
                  <div className="text-left">
                    <div className="text-base font-semibold">Dil Seçeneği</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="px-3 py-1 rounded-md text-sm">{currentLanguage.short}</Badge>
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
              "w-full flex-1 px-6 flex items-center justify-between border rounded-2xl",
              darkMode ? "border-white/10 bg-white/5" : "border-slate-200 bg-white"
            )}>
              <div className="flex items-center gap-4">
                <div className={cn("p-3 rounded-xl", darkMode ? "bg-orange-500/20 text-orange-400" : "bg-orange-50 text-orange-600")}>
                  <Moon size={24} />
                </div>
                <div className="text-left">
                  <div className="text-base font-semibold">Görünüm Modu</div>
                </div>
              </div>
              <Switch checked={darkMode} onCheckedChange={toggleTheme} />
            </div>

            <div className={cn(
              "w-full flex-1 px-6 flex items-center justify-between border rounded-2xl",
              darkMode ? "border-white/10 bg-white/5" : "border-slate-200 bg-white"
            )}>
              <div className="flex items-center gap-4">
                <div className={cn("p-3 rounded-xl", darkMode ? "bg-emerald-500/20 text-emerald-400" : "bg-emerald-50 text-emerald-600")}>
                  <Bell size={24} />
                </div>
                <div className="text-left">
                  <div className="text-base font-semibold">Sistem Bildirimleri</div>
                </div>
              </div>
              <Switch checked={notificationsEnabled} onCheckedChange={toggleNotifications} />
            </div>
          </div>

          <div className="mt-6 pt-6 border-t border-border shrink-0">
            <Button
              className="w-full h-12 rounded-xl text-white font-semibold bg-gradient-to-r from-pink-600 to-orange-500 hover:from-pink-700 hover:to-orange-600 shadow-lg shadow-pink-900/20"
              onClick={handleLogout}
            >
              <LogOut size={18} className="mr-2" />
              Çıkış Yap
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

import { type ReactElement, useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
// 1. useLocation'ı ekledik
import { useNavigate, useLocation } from 'react-router-dom'; 
import { Menu08Icon, SearchList01Icon, Cancel01Icon, Mic01Icon } from 'hugeicons-react'
import { useAuthStore } from '@/stores/auth-store';
import { useUIStore } from '@/stores/ui-store';
import { NotificationIcon } from '@/features/notification/components/NotificationIcon';
import { UserProfileModal } from '@/features/user-detail-management/components/UserProfileModal';
import { useUserDetailByUserId } from '@/features/user-detail-management/hooks/useUserDetailByUserId';
import { getImageUrl } from '@/features/user-detail-management/utils/image-url';
import { cn } from '@/lib/utils';
import { useVoiceSearch } from '@/hooks/useVoiceSearch';

export function Navbar(): ReactElement {
  const { t } = useTranslation();
  const navigate = useNavigate();
  // 2. Mevcut rotayı takip etmek için location'ı aldık
  const location = useLocation(); 
  const searchInputRef = useRef<HTMLInputElement>(null);

  const { user } = useAuthStore();
  const { toggleSidebar, searchQuery, setSearchQuery, setSidebarOpen } = useUIStore();
  const [userProfileModalOpen, setUserProfileModalOpen] = useState(false);
  const { data: userDetail } = useUserDetailByUserId(user?.id || 0);

  const { isListening, isSupported, startListening } = useVoiceSearch({
    onResult: (text) => {
      setSearchQuery(text);
      if (text.trim().length > 0) {
        setSidebarOpen(true);
      }
    },
  });

  // 3. KRİTİK NOKTA: Sayfa değiştiği an aramayı temizleyen efekt
  useEffect(() => {
    // Kullanıcı bir menüye tıkladığında ve sayfa değiştiğinde aramayı sıfırla
    setSearchQuery('');
  }, [location.pathname, setSearchQuery]);

  const displayName = user?.name || user?.email || 'Kullanıcı';
  const displayInitials = user?.name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'MK';

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const val = e.target.value;
    setSearchQuery(val);
    if (val.trim().length > 0) {
      setSidebarOpen(true);
    }
  };

  return (
    <>
      <header className={cn(
        "min-h-20 h-auto pt-[env(safe-area-inset-top)] px-4 sm:px-8 flex items-center justify-between border-b transition-all sticky top-0 z-40 backdrop-blur-xl border-slate-200 dark:border-white/5",
        "bg-white/80 dark:bg-[#0c0516]/80"
      )}>
        <div className="flex items-center gap-2 sm:gap-4 shrink-0 h-20">
            <button 
                onClick={toggleSidebar} 
                className="p-2 shrink-0 rounded-xl text-slate-500 dark:text-slate-400 hover:text-pink-500 hover:bg-pink-500/10 dark:hover:text-pink-400 dark:hover:bg-pink-500/20 hover:shadow-[0_0_15px_rgba(236,72,153,0.2)] transition-all duration-300 focus:outline-none"
              >
                <Menu08Icon size={24} />
            </button>

          <div className="relative hidden md:block w-full max-md group">
            <div className="absolute inset-0 bg-linear-to-r from-pink-500/20 to-purple-500/20 rounded-2xl blur-xl opacity-0 group-focus-within:opacity-100 transition-opacity duration-500" />
            <div className="relative flex items-center">
              <SearchList01Icon className="absolute left-4 text-slate-400 w-5 h-5 group-focus-within:text-pink-500 transition-colors duration-300" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery} 
                onChange={handleSearch} 
                placeholder={t('navbar.search_placeholder')}
                className={cn(
                  "w-full py-3 pl-12 pr-24 text-base md:text-sm font-medium transition-all duration-300 outline-none rounded-2xl border",
                  "bg-slate-100/50 border-slate-200 text-slate-900 placeholder:text-slate-500 focus:bg-white focus:border-pink-500/30",
                  "dark:bg-white/5 dark:border-white/10 dark:text-white dark:placeholder:text-slate-500 dark:focus:bg-[#150a25]",
                  "focus:ring-4 focus:ring-pink-500/10 focus:shadow-[0_0_20px_rgba(236,72,153,0.15)]"
                )}
              />
              <div className="absolute right-3 flex items-center gap-2">
                {isSupported && (
                  <button
                    onClick={(e) => { e.preventDefault(); startListening(); }}
                    className={cn(
                      "p-2 rounded-xl transition-all duration-300",
                      isListening 
                        ? "text-pink-500 bg-pink-500/10 animate-pulse shadow-[0_0_15px_rgba(236,72,153,0.3)]" 
                        : "text-slate-400 hover:text-pink-500 hover:bg-slate-100 dark:hover:bg-white/10"
                    )}
                    title={t('common.voiceSearchTitle')}
                  >
                    <Mic01Icon size={18} />
                  </button>
                )}

                {searchQuery && (
                  <button 
                    onClick={() => setSearchQuery('')}
                    className="p-1 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-white/20 transition-colors"
                  >
                    <Cancel01Icon size={14} />
                  </button>
                )}
              </div>
            </div>
          </div>

          {isSupported && (
            <button 
              onClick={(e) => { e.preventDefault(); startListening(); }}
              className={cn(
                "p-2 md:hidden rounded-xl transition-all duration-300 relative",
                isListening 
                  ? "text-pink-500 bg-pink-500/10 animate-pulse shadow-[0_0_15px_rgba(236,72,153,0.3)]" 
                  : "text-slate-500 dark:text-slate-400 hover:text-pink-500 hover:bg-pink-500/10"
              )}
            >
              <Mic01Icon size={24} />
              {isListening && (
                <span className="absolute top-1 right-1 w-2 h-2 bg-pink-500 rounded-full animate-ping" />
              )}
            </button>
          )}
        </div>
        
        <div className="flex items-center justify-end shrink-0 gap-3 sm:gap-8 h-20">
          <div className="flex items-center gap-3 sm:gap-8 shrink-0">
            <div className="relative w-9 h-9 sm:w-10 sm:h-10 rounded-full hover:bg-slate-100 dark:hover:bg-white/5 transition-colors cursor-pointer text-slate-500 hover:text-pink-500 dark:text-slate-400 dark:hover:text-pink-400 flex items-center justify-center group shrink-0">
                <NotificationIcon />
            </div>
          </div>

          {user && <div className="hidden xs:block h-6 w-px bg-slate-200 dark:bg-white/10 shrink-0" />}

          {user && (
            <div onClick={() => setUserProfileModalOpen(true)} className="flex items-center gap-2 sm:gap-3 cursor-pointer group shrink-0">
              <div className="text-right hidden lg:block">
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 group-hover:text-pink-500 transition-colors truncate max-w-[150px]">
                  {displayName}
                </p>
                <p className="text-[10px] text-slate-400 uppercase tracking-wider font-medium">
                  {t('roles.admin')}
                </p>
              </div>
              <div className="relative shrink-0">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full p-[2px] bg-linear-to-tr from-pink-500 via-orange-500 to-yellow-500 group-hover:shadow-[0_0_20px_rgba(236,72,153,0.5)] transition-all duration-300">
                  <div className="w-full h-full rounded-full bg-white dark:bg-[#0c0516] flex items-center justify-center overflow-hidden border-2 border-white dark:border-[#0c0516]">
                    {userDetail?.profilePictureUrl ? (
                      <img src={getImageUrl(userDetail.profilePictureUrl) || ''} alt={displayName} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-xs font-bold text-orange-500">{displayInitials}</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </header>

      <UserProfileModal 
        open={userProfileModalOpen} 
        onOpenChange={setUserProfileModalOpen}
        onOpenProfileDetails={() => {
          setUserProfileModalOpen(false);
          navigate('/profile');
        }}
      />
    </>
  );
}
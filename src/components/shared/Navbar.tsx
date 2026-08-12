import { type ReactElement, useState, useEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useLocation } from 'react-router-dom';
import { SidebarLeft01Icon, SearchList01Icon, Cancel01Icon, Mic01Icon } from 'hugeicons-react'
import { useAuthStore } from '@/stores/auth-store';
import { useUIStore } from '@/stores/ui-store';
import { NotificationIcon } from '@/features/notification/components/NotificationIcon';
import { UserProfileModal } from '@/features/user-detail-management/components/UserProfileModal';
import { useAppShellStore } from '@/stores/app-shell-store';
import { getImageUrl } from '@/features/user-detail-management/utils/image-url';
import { cn } from '@/lib/utils';
import { useVoiceSearch } from '@/hooks/useVoiceSearch';
import { useTheme } from '@/components/theme-provider';
import { matchesSearchTerm } from '@/lib/search';
import type { NavItem } from './nav-items';
import { ProfileImageWithFallback } from './ProfileImageWithFallback';

interface NavbarProps {
  navItems?: NavItem[];
}

interface SearchDestination {
  title: string;
  href: string;
  group?: string;
}

function flattenDestinations(items: NavItem[], group?: string): SearchDestination[] {
  return items.flatMap((item) => {
    const currentGroup = group ?? item.title;
    const current = item.href ? [{ title: item.title, href: item.href, group }] : [];
    const children = item.children?.length
      ? flattenDestinations(item.children, currentGroup)
      : [];
    return [...current, ...children];
  });
}

export function Navbar({ navItems = [] }: NavbarProps): ReactElement {
  const { t } = useTranslation();
  const { skin } = useTheme();
  const isPremium = skin === 'premium';
  const navigate = useNavigate();
  const location = useLocation();
  const searchInputRef = useRef<HTMLInputElement>(null);

  const { user } = useAuthStore();
  const toggleSidebar = useUIStore((state) => state.toggleSidebar);
  const searchQuery = useUIStore((state) => state.searchQuery);
  const setSearchQuery = useUIStore((state) => state.setSearchQuery);
  const setSidebarOpen = useUIStore((state) => state.setSidebarOpen);
  const isSidebarOpen = useUIStore((state) => state.isSidebarOpen);
  const [userProfileModalOpen, setUserProfileModalOpen] = useState(false);
  const userDetail = useAppShellStore((state) =>
    user?.id ? state.userSummaries[String(user.id)]?.data ?? null : null
  );
  const appShellStatus = useAppShellStore((state) => state.bootstrapStatus);
  const premiumSearchResults = useMemo(() => {
    if (!isPremium || !searchQuery.trim()) return [];
    return flattenDestinations(navItems)
      .filter((item) => matchesSearchTerm(searchQuery, [item.title, item.group]))
      .slice(0, 8);
  }, [isPremium, navItems, searchQuery]);

  const { isListening, isSupported, startListening } = useVoiceSearch({
    onResult: (text) => {
      setSearchQuery(text);
      if (!isPremium && text.trim().length > 0) {
        setSidebarOpen(true);
      }
    },
  });

  useEffect(() => {
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
    if (!isPremium && val.trim().length > 0) {
      setSidebarOpen(true);
    }
  };

  return (
    <>
      <header className={cn(
        "app-navbar-panel",
        "min-h-20 h-auto pt-[env(safe-area-inset-top)] px-4 sm:px-8 flex items-center justify-between border-b transition-colors sticky top-0 z-40",
        "border-[var(--crm-app-border)] bg-[var(--crm-app-panel)]"
      )}>
        <div className="flex items-center gap-2 sm:gap-4 shrink-0 h-20">
          {isPremium ? (
            <button
              type="button"
              onClick={() => navigate('/')}
              className="crm-premium-navbar-logo-button"
              aria-label={t('sidebar.home')}
            >
              <img src="/veriicrmlogo-sm.png" alt="V3RII CRM" className="crm-premium-navbar-logo" />
            </button>
          ) : (
            <button
              type="button"
              onClick={toggleSidebar}
              aria-pressed={isSidebarOpen}
              aria-label={t(isSidebarOpen ? 'collapseNav' : 'expandNav')}
              className="p-2 shrink-0 rounded-xl text-slate-500 dark:text-slate-400 hover:text-[var(--crm-brand-primary)] hover:bg-[var(--crm-brand-soft)] hover:shadow-[0_0_15px_var(--crm-brand-shadow)] transition-all duration-300 focus:outline-none"
            >
              <SidebarLeft01Icon size={24} />
            </button>
          )}

          <div className={cn(
            "relative hidden md:block w-full max-md group",
            isPremium && "crm-premium-navbar-search",
          )}>
            <div className="relative flex items-center">
              <SearchList01Icon className="absolute left-4 text-slate-400 w-5 h-5 group-focus-within:text-[var(--crm-brand-primary)] transition-colors duration-300" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={handleSearch}
                placeholder={t('navbar.search_placeholder')}
                className={cn(
                  "w-full py-3 pl-12 pr-24 text-base md:text-sm font-medium transition-all duration-300 outline-none rounded-2xl border",
                  "bg-slate-100/50 border-slate-200 text-slate-900 placeholder:text-slate-500 focus:bg-white focus:border-[var(--crm-brand-ring)]",
                  "dark:bg-white/5 dark:border-white/10 dark:text-white dark:placeholder:text-slate-500 dark:focus:bg-[var(--crm-app-panel-strong)]",
                  "focus:ring-4 focus:ring-[var(--crm-brand-ring)] focus:shadow-[0_0_20px_var(--crm-brand-shadow)]",
                  isPremium && "crm-premium-navbar-search__input",
                )}
              />
              <div className="absolute right-3 flex items-center gap-2">
                {isSupported && (
                  <button
                    type="button"
                    aria-label={t('common.voiceSearchTitle')}
                    onClick={(e) => { e.preventDefault(); startListening(); }}
                    className={cn(
                      "p-2 rounded-xl transition-all duration-300",
                      isListening
                        ? "text-[var(--crm-brand-primary)] bg-[var(--crm-brand-soft)] animate-pulse shadow-[0_0_15px_var(--crm-brand-shadow)]"
                        : "text-slate-400 hover:text-[var(--crm-brand-primary)] hover:bg-slate-100 dark:hover:bg-white/10"
                    )}
                    title={t('common.voiceSearchTitle')}
                  >
                    <Mic01Icon size={18} />
                  </button>
                )}

                {searchQuery && (
                  <button
                    type="button"
                    aria-label={t('common.clear')}
                    onClick={() => setSearchQuery('')}
                    className="p-1 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-white/20 transition-colors"
                  >
                    <Cancel01Icon size={14} />
                  </button>
                )}
              </div>
            </div>
            {isPremium && searchQuery.trim() && (
              <div className="crm-premium-navbar-search__results">
                {premiumSearchResults.length > 0 ? (
                  premiumSearchResults.map((item) => (
                    <button
                      key={item.href}
                      type="button"
                      className="crm-premium-navbar-search__result"
                      onClick={() => {
                        setSearchQuery('');
                        navigate(item.href);
                      }}
                    >
                      <span>{item.title}</span>
                      {item.group && <small>{item.group}</small>}
                    </button>
                  ))
                ) : (
                  <p className="crm-premium-navbar-search__empty">{t('shell.noNavigationResult')}</p>
                )}
              </div>
            )}
          </div>

          {isSupported && (
            <button
              type="button"
              aria-label={t('common.voiceSearchTitle')}
              onClick={(e) => { e.preventDefault(); startListening(); }}
              className={cn(
                "p-2 md:hidden rounded-xl transition-all duration-300 relative",
                isListening
                  ? "text-[var(--crm-brand-primary)] bg-[var(--crm-brand-soft)] animate-pulse shadow-[0_0_15px_var(--crm-brand-shadow)]"
                  : "text-slate-500 dark:text-slate-400 hover:text-[var(--crm-brand-primary)] hover:bg-[var(--crm-brand-soft)]"
              )}
            >
              <Mic01Icon size={24} />
              {isListening && (
                <span className="absolute top-1 right-1 w-2 h-2 bg-[var(--crm-brand-primary)] rounded-full animate-ping" />
              )}
            </button>
          )}
        </div>

        <div className="flex items-center justify-end shrink-0 gap-3 sm:gap-8 h-20">
          <div className="flex items-center gap-3 sm:gap-8 shrink-0">
            <div className="relative w-9 h-9 sm:w-10 sm:h-10 rounded-full hover:bg-[var(--crm-brand-soft)] transition-colors cursor-pointer text-slate-500 hover:text-[var(--crm-brand-primary)] dark:text-slate-400 flex items-center justify-center group shrink-0">
              <NotificationIcon />
            </div>
          </div>

          {user && <div className="hidden xs:block h-6 w-px bg-slate-200 dark:bg-white/10 shrink-0" />}

          {user && (
            <div onClick={() => setUserProfileModalOpen(true)} className="flex items-center gap-2 sm:gap-3 cursor-pointer group shrink-0">
              <div className="text-right hidden lg:block">
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 group-hover:text-[var(--crm-brand-primary)] transition-colors truncate max-w-[150px]">
                  {displayName}
                </p>
                <p className="text-[10px] text-slate-600 uppercase tracking-wider font-medium dark:text-slate-300">
                  {t('roles.admin')}
                </p>
              </div>
              <div className="relative shrink-0">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full p-[2px] bg-[image:var(--crm-brand-gradient)] group-hover:shadow-[0_0_20px_var(--crm-brand-shadow)] transition-all duration-300">
                  <div className="w-full h-full rounded-full bg-white dark:bg-[var(--crm-app-background)] flex items-center justify-center overflow-hidden border-2 border-white dark:border-[var(--crm-app-background)]">
                    <ProfileImageWithFallback
                      src={getImageUrl(userDetail?.profilePictureUrl) || null}
                      alt={displayName}
                      className="h-full w-full object-cover"
                      isLoading={appShellStatus === 'loading' && !userDetail}
                      fallback={<span className="text-xs font-bold text-[var(--crm-brand-primary)]">{displayInitials}</span>}
                    />
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

import { type ReactElement, useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useUIStore } from '@/stores/ui-store';
import { cn } from '@/lib/utils';
import { ChevronDown, ChevronRight, X } from 'lucide-react';

const SIDEBAR_EASE = 'ease-[cubic-bezier(0.4,0,0.2,1)]';
const SIDEBAR_TRANSITION = `duration-[260ms] ${SIDEBAR_EASE}`;
const SIDEBAR_LABEL_TRANSITION = cn(
  'min-w-0 overflow-hidden transition-[opacity,max-width,width] duration-[200ms] ease-[cubic-bezier(0.4,0,0.2,1)]',
  'motion-reduce:transition-none'
);
const LOGO_URL = '/v3logo-sm.png';
const VERII_LOGO_URL = '/veriicrmlogo-sm.png';

const areSetsEqual = (left: Set<string>, right: Set<string>): boolean => {
  if (left.size !== right.size) return false;
  for (const value of left) {
    if (!right.has(value)) return false;
  }
  return true;
};

interface NavItem {
  title: string;
  href?: string;
  icon?: ReactElement;
  children?: NavItem[];
  defaultExpanded?: boolean;
}
interface SidebarProps {
  items: NavItem[];
}

const normalizeText = (text: string): string => {
  return text
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ı/g, 'i')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '');
};

function SubMenuComponent({ item, pathname, searchQuery }: { item: NavItem; pathname: string; searchQuery: string }): ReactElement {
  const { setSearchQuery, setSidebarOpen } = useUIStore();
  
  const hasActiveChild = item.children?.some(child => child.href === pathname) || false;
  
  const hasMatchingChild = useMemo(() => {
    if (!searchQuery.trim()) return false;
    const normalizedQuery = normalizeText(searchQuery);
    return item.children?.some(child => normalizeText(child.title).includes(normalizedQuery));
  }, [item.children, searchQuery]);

  const [isOpen, setIsOpen] = useState(hasActiveChild);

  useEffect(() => {
    if (searchQuery.trim()) {
      if (hasMatchingChild) setIsOpen(true);
    } else {
      setIsOpen(hasActiveChild);
    }
  }, [hasMatchingChild, hasActiveChild, searchQuery]);

  return (
    <div className="mt-1">
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className={cn(
          "flex items-center justify-between w-full px-3 py-2 rounded-lg transition-colors text-sm group select-none relative",
          isOpen || hasActiveChild
            ? "text-slate-900 dark:text-white font-medium" 
            : "text-slate-500 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/5"
        )}
      >
        <span className="whitespace-normal leading-tight crm-text-start wrap-break-word crm-pe-2">{item.title}</span>
        <span className="opacity-70 shrink-0">
          {isOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        </span>
      </button>

      {isOpen && (
        <div className="crm-ms-2 mt-1 space-y-1 crm-border-start border-slate-200 dark:border-white/10 crm-ps-2">
          {item.children?.map((child) => {
             const isSubLinkActive = pathname === child.href;
             return (
               <Link
                 key={child.href || child.title}
                 to={child.href || '#'}
                 className={cn(
                   "flex items-center justify-between px-3 py-2 rounded-lg transition-colors text-xs w-full relative",
                   isSubLinkActive
                     ? 'bg-slate-100 text-slate-900 font-medium dark:bg-white/10 dark:text-white'
                     : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/5'
                 )}
                 onClick={() => {
                   
                   if (window.innerWidth < 1024) {
                     setSearchQuery('');
                     setSidebarOpen(false);
                   }
                 }}
               >
                 <span className="whitespace-normal leading-tight crm-text-start wrap-break-word">{child.title}</span>
                 {isSubLinkActive && <span className="w-2 h-2 rounded-full bg-[var(--crm-brand-primary)] shrink-0 crm-ms-2" />}
               </Link>
             );
          })}
        </div>
      )}
    </div>
  );
}

function NavItemComponent({
  item,
  searchQuery,
  expandedItemKeys,
  onToggle,
  isManualClick,
}: {
  item: NavItem;
  searchQuery: string;
  expandedItemKeys: Set<string>;
  onToggle: (key: string | null) => void;
  isManualClick: boolean;
}): ReactElement {
  const location = useLocation();
  const { isSidebarOpen, setSidebarOpen, setSearchQuery } = useUIStore();
  
  const checkIsActive = (navItem: NavItem): boolean => {
    if (navItem.href === location.pathname) return true;
    if (navItem.children) return navItem.children.some(checkIsActive);
    return false;
  };

  const hasChildren = item.children && item.children.length > 0;
  const isAnyChildActive = hasChildren && checkIsActive(item);
  const isActive = item.href ? location.pathname === item.href : false;
  
  const itemKey = item.href || item.title;
  const isExpanded = expandedItemKeys.has(itemKey);
  const onToggleRef = useRef(onToggle);
  onToggleRef.current = onToggle;

  const matchesSearch = useMemo(() => {
    const query = searchQuery.trim();
    if (!query) return true;
    const normalizedQuery = normalizeText(query);
    const checkMatch = (nav: NavItem): boolean => {
       const normalizedTitle = normalizeText(nav.title);
       if (normalizedTitle.includes(normalizedQuery)) return true;
       return nav.children ? nav.children.some(checkMatch) : false;
    };
    return checkMatch(item);
  }, [item, searchQuery]);

  useEffect(() => {
    if (searchQuery.trim() !== "") {
      const normalizedQuery = normalizeText(searchQuery);
      const hasMatchingChild = item.children?.some(child => {
        const checkRecursive = (nav: NavItem): boolean => {
          if (normalizeText(nav.title).includes(normalizedQuery)) return true;
          return nav.children ? nav.children.some(checkRecursive) : false;
        };
        return checkRecursive(child);
      });

      if (hasMatchingChild && !isExpanded) {
        onToggleRef.current(itemKey);
      }
    }
  }, [searchQuery, item.children, itemKey, isExpanded]);

  useEffect(() => {
    if (isAnyChildActive && hasChildren && !isExpanded && !isManualClick && !searchQuery.trim()) {
      onToggleRef.current(itemKey);
    }
  }, [isAnyChildActive, hasChildren, itemKey, isExpanded, isManualClick, searchQuery]);

  if (!matchesSearch) return <></>;

  const handleOpenAndExpand = (e: React.MouseEvent | React.KeyboardEvent) => {
    if (!isSidebarOpen) {
      e.preventDefault();
      e.stopPropagation();
      setSidebarOpen(true);
      setTimeout(() => {
        onToggleRef.current(itemKey);
      }, 80);
    }
  };

  if (hasChildren) {
    const visualActive = isAnyChildActive; 
    return (
      <div className="mb-1">
        <button 
            type="button"
            className={cn(
                "relative flex w-full items-center gap-3 rounded-xl px-3 py-2 transition-colors cursor-pointer select-none crm-text-start group",
                visualActive ? 'bg-[var(--crm-brand-soft)]' : 'hover:bg-slate-100 dark:hover:bg-white/5',
                !isSidebarOpen && "justify-center px-0 gap-0",
                SIDEBAR_TRANSITION
            )}
            onClick={(e) => {
                if (!isSidebarOpen) {
                  handleOpenAndExpand(e);
                } else {
                  onToggleRef.current(itemKey);
                }
            }}
        >
          {item.icon && (
            <div className={cn(
                "w-9 h-9 rounded-lg flex items-center justify-center shrink-0 transition-colors duration-200",
                visualActive ? 'bg-[var(--crm-brand-soft)] text-[var(--crm-brand-primary)]' : 'bg-white border border-slate-200 text-slate-500 dark:bg-slate-800 dark:border-none dark:text-slate-400'
            )}>
              {item.icon}
            </div>
          )}
          <span
            aria-hidden={!isSidebarOpen}
            className={cn(
              SIDEBAR_LABEL_TRANSITION,
              "flex-1 min-w-0 text-sm font-medium leading-tight crm-text-start crm-pe-2 whitespace-nowrap text-ellipsis",
              visualActive ? 'text-[var(--crm-brand-primary)] font-semibold' : 'text-slate-600 dark:text-slate-300',
              isSidebarOpen ? 'opacity-100 max-w-[12rem]' : 'opacity-0 max-w-0 w-0 pointer-events-none'
            )}
          >
            {item.title}
          </span>
          <div
            aria-hidden={!isSidebarOpen}
            className={cn(
              SIDEBAR_LABEL_TRANSITION,
              "text-slate-400 dark:text-slate-500 shrink-0",
              isSidebarOpen ? 'opacity-100 w-4' : 'opacity-0 w-0 pointer-events-none'
            )}
          >
            {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </div>
        </button>

        {isExpanded && isSidebarOpen && (
          <div className="crm-ms-12 mt-2 space-y-1 crm-border-start border-slate-200 dark:border-white/10 crm-ps-2">
            {item.children?.map((child) => (
              child.children && child.children.length > 0 
                ? <SubMenuComponent key={child.title} item={child} pathname={location.pathname} searchQuery={searchQuery} />
                : <Link
                    key={child.href}
                    to={child.href || '#'}
                    className={cn(
                      "flex items-center justify-between px-3 py-2 rounded-lg transition-colors text-sm w-full relative",
                      location.pathname === child.href ? 'bg-[var(--crm-brand-soft)] text-[var(--crm-brand-primary)] font-semibold' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/5'
                    )}
                    onClick={() => { 
                 
                      if (window.innerWidth < 1024) {
                        setSearchQuery('');
                        setSidebarOpen(false); 
                      }
                    }}
                  >
                    <span className="whitespace-normal leading-tight crm-text-start wrap-break-word">{child.title}</span>
                    {location.pathname === child.href && <span className="w-2 h-2 rounded-full bg-[var(--crm-brand-primary)] shrink-0 crm-ms-2" />}
                  </Link>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="mb-1">
        <Link 
          to={item.href || '#'} 
          className={cn(
            "relative flex items-center gap-3 rounded-xl px-3 py-2 transition-all group",
            isActive ? 'bg-[var(--crm-brand-soft)]' : 'hover:bg-slate-100 dark:hover:bg-white/5',
            !isSidebarOpen && "justify-center px-0 gap-0",
            SIDEBAR_TRANSITION
          )}
          onClick={(e) => {
           
            if (window.innerWidth < 1024) {
              setSearchQuery('');
              setSidebarOpen(false);
            }
            if (!isSidebarOpen) handleOpenAndExpand(e);
          }}
        >
            {item.icon && (
                <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center shrink-0 transition-colors duration-200", isActive ? 'bg-[var(--crm-brand-soft)] text-[var(--crm-brand-primary)]' : 'bg-white border border-slate-200 text-slate-500 dark:bg-slate-800 dark:border-none dark:text-slate-400')}>
                    {item.icon}
                </div>
            )}
            <span
              aria-hidden={!isSidebarOpen}
              className={cn(
                SIDEBAR_LABEL_TRANSITION,
                "flex-1 min-w-0 text-sm font-medium leading-tight crm-text-start crm-pe-2 whitespace-nowrap text-ellipsis",
                isActive ? 'text-[var(--crm-brand-primary)] font-semibold' : 'text-slate-600 dark:text-slate-300',
                isSidebarOpen ? 'opacity-100 max-w-[12rem]' : 'opacity-0 max-w-0 w-0 pointer-events-none'
              )}
            >
              {item.title}
            </span>
            <div
              aria-hidden
              className={cn(
                SIDEBAR_LABEL_TRANSITION,
                "shrink-0 pointer-events-none",
                isSidebarOpen ? 'w-4 opacity-0' : 'w-0 opacity-0'
              )}
            />
            <div
              className={cn(
                "app-sidebar-active-marker absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-r-full bg-[image:var(--crm-brand-gradient)] transition-opacity duration-200",
                isActive && isSidebarOpen ? 'opacity-100' : 'opacity-0'
              )}
            />
        </Link>
    </div>
  );
}

export function Sidebar({ items }: SidebarProps): ReactElement {

  const { isSidebarOpen, setSidebarOpen, searchQuery, setSearchQuery } = useUIStore();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogoDoubleClick = (): void => {
    navigate('/');
  };


  useEffect(() => {
    if (!isSidebarOpen) {
      setSearchQuery('');
    }
  }, [isSidebarOpen, setSearchQuery]);
  
  const getDefaultKeys = useCallback((): Set<string> => {
    const keys = new Set<string>();

    const visit = (navItems: NavItem[]): boolean => {
      let branchHasActive = false;

      for (const item of navItems) {
        const itemKey = item.href || item.title;
        const isDirectMatch = item.href === location.pathname;
        const childHasActive = item.children ? visit(item.children) : false;

        if (isDirectMatch || childHasActive) {
          branchHasActive = true;
          if (item.children && item.children.length > 0) {
            keys.add(itemKey);
          }
        }
      }

      return branchHasActive;
    };

    visit(items);
    return keys;
  }, [items, location.pathname]);

  const [expandedItemKeys, setExpandedItemKeys] = useState<Set<string>>(new Set());
  const [isManualClick, setIsManualClick] = useState(false);

  useEffect(() => {
    if (window.innerWidth < 1024) setSidebarOpen(false);
  }, [setSidebarOpen]);

  useEffect(() => {
    if (!searchQuery.trim()) {
      const defaultKeys = getDefaultKeys();
      setExpandedItemKeys((prev) => (areSetsEqual(prev, defaultKeys) ? prev : defaultKeys));
      setIsManualClick(false);
    }
  }, [searchQuery, getDefaultKeys]);

  useEffect(() => {
    if (isSidebarOpen && !searchQuery.trim()) {
      setExpandedItemKeys((prev) => {
        const next = new Set([...getDefaultKeys(), ...prev]);
        return areSetsEqual(prev, next) ? prev : next;
      });
    }
  }, [isSidebarOpen, getDefaultKeys, searchQuery]);

  const handleToggle = useCallback((key: string | null): void => {
    if (!key) return;
    setIsManualClick(true);
    setExpandedItemKeys(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }, []);

  return (
    <>
      <div
        className={cn(
          'fixed inset-0 z-40 bg-black/50 lg:hidden transition-opacity duration-[260ms]',
          SIDEBAR_EASE,
          isSidebarOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        )}
        onClick={() => setSidebarOpen(false)}
      />
      
      <aside className={cn(
        'app-sidebar-panel fixed lg:sticky top-0 min-h-dvh h-[100dvh] z-50 flex flex-col shrink-0 overflow-hidden will-change-[width,transform]',
        'bg-[color-mix(in_srgb,var(--crm-app-panel)_82%,transparent)] backdrop-blur-xl',
        'border-r border-[var(--crm-app-border)]',
        'shadow-[2px_0_12px_-4px_rgba(15,23,42,0.08)] dark:shadow-[2px_0_16px_-4px_rgba(0,0,0,0.45)]',
        'pb-[env(safe-area-inset-bottom)]',
        'transition-[width,transform] duration-[260ms] motion-reduce:transition-none',
        SIDEBAR_EASE,
        isSidebarOpen ? "w-72 translate-x-0" : "w-72 -translate-x-full lg:w-20 lg:translate-x-0"
      )}
        data-sidebar-open={isSidebarOpen ? 'true' : 'false'}
      >
        
        <div className={cn(
          "h-24 flex items-center justify-center border-b border-slate-200 dark:border-white/5 shrink-0 relative overflow-hidden",
          "pt-[env(safe-area-inset-top)] transition-[padding] duration-[260ms]",
          SIDEBAR_EASE,
          isSidebarOpen ? "px-4" : "px-0"
        )}>
          <div
            className={cn(
              "absolute inset-0 flex items-center justify-between px-4 transition-opacity duration-[260ms]",
              SIDEBAR_EASE,
              isSidebarOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
            )}
          >
            <div className="w-8 lg:hidden" />
            <button
              type="button"
              onDoubleClick={handleLogoDoubleClick}
              className="flex justify-center flex-1 cursor-pointer select-none rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-[var(--crm-brand-ring)]"
            >
              <img src={VERII_LOGO_URL} alt="Logo" className="h-32 object-contain pointer-events-none" />
            </button>
            <button onClick={() => setSidebarOpen(false)} className="lg:hidden p-2 text-slate-500 hover:text-red-500 rounded-lg">
              <X size={24} />
            </button>
            <div className="w-8 hidden lg:block" />
          </div>
          <button
            type="button"
            onDoubleClick={handleLogoDoubleClick}
            className={cn(
              "absolute inset-0 flex items-center justify-center p-1 cursor-pointer select-none rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-[var(--crm-brand-ring)] transition-opacity duration-[260ms]",
              SIDEBAR_EASE,
              isSidebarOpen ? "opacity-0 pointer-events-none" : "opacity-100 pointer-events-auto"
            )}
          >
            <img src={LOGO_URL} alt="V3" className="w-full h-full object-contain scale-150 pointer-events-none" />
          </button>
        </div>

        <nav className={cn(
          "flex-1 min-h-0 pt-6 pb-6 px-3 space-y-2 overscroll-contain touch-pan-y",
          isSidebarOpen ? "overflow-y-auto custom-scrollbar" : "overflow-hidden"
        )}>
          {items.map((item, idx) => (
            <NavItemComponent key={item.href || item.title || idx} item={item} searchQuery={searchQuery} expandedItemKeys={expandedItemKeys} onToggle={handleToggle} isManualClick={isManualClick} />
          ))}
        </nav>
      </aside>
    </>
  );
}

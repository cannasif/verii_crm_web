import { type ReactElement, useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useUIStore } from '@/stores/ui-store';
import { cn } from '@/lib/utils';
import { ChevronDown, ChevronRight, X } from 'lucide-react';

const LOGO_URL = '/v3logo.png';
const VERII_LOGO_URL = '/veriicrmlogo.png';

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
        <span className="whitespace-normal leading-tight text-left wrap-break-word pr-2">{item.title}</span>
        <span className="opacity-70 shrink-0">
          {isOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        </span>
      </button>

      {isOpen && (
        <div className="ml-2 mt-1 space-y-1 border-l border-slate-200 dark:border-white/10 pl-2">
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
                   if (window.innerWidth < 1024) useUIStore.getState().setSidebarOpen(false);
                 }}
               >
                 <span className="whitespace-normal leading-tight text-left wrap-break-word">{child.title}</span>
                 {isSubLinkActive && <span className="w-2 h-2 rounded-full bg-purple-600 dark:bg-pink-500 shrink-0 ml-2" />}
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
  const { isSidebarOpen, setSidebarOpen } = useUIStore();
  
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
      }, 50);
    }
  };

  if (hasChildren) {
    const visualActive = isAnyChildActive; 
    return (
      <div className="mb-1">
        <button 
            type="button"
            className={cn(
                "relative flex w-full items-center gap-3 rounded-xl px-3 py-2 transition-colors cursor-pointer select-none text-left group",
                visualActive ? 'bg-purple-50 dark:bg-white/5' : 'hover:bg-slate-100 dark:hover:bg-white/5',
                !isSidebarOpen && "justify-center px-0"
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
                "w-9 h-9 rounded-lg flex items-center justify-center transition-colors shrink-0",
                visualActive ? 'bg-purple-100 text-purple-700 dark:bg-pink-500/20 dark:text-pink-400' : 'bg-white border border-slate-200 text-slate-500 dark:bg-slate-800 dark:border-none dark:text-slate-400'
            )}>
              {item.icon}
            </div>
          )}
          {isSidebarOpen && (
             <span className={cn(
               "flex-1 text-sm font-medium transition-colors whitespace-normal leading-tight text-left wrap-break-word pr-2",
               visualActive ? 'text-purple-900 font-semibold dark:text-white' : 'text-slate-600 dark:text-slate-300'
             )}>{item.title}</span>
          )}
          {isSidebarOpen && (
            <div className="text-slate-400 dark:text-slate-500 shrink-0">
                {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </div>
          )}
        </button>

        {isExpanded && isSidebarOpen && (
          <div className="ml-12 mt-2 space-y-1 border-l border-slate-200 dark:border-white/10 pl-2">
            {item.children?.map((child) => (
              child.children && child.children.length > 0 
                ? <SubMenuComponent key={child.title} item={child} pathname={location.pathname} searchQuery={searchQuery} />
                : <Link
                    key={child.href}
                    to={child.href || '#'}
                    className={cn(
                      "flex items-center justify-between px-3 py-2 rounded-lg transition-colors text-sm w-full relative",
                      location.pathname === child.href ? 'bg-purple-50 text-purple-700 font-semibold dark:bg-white/10 dark:text-white' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/5'
                    )}
                    onClick={() => { if (window.innerWidth < 1024) useUIStore.getState().setSidebarOpen(false); }}
                  >
                    <span className="whitespace-normal leading-tight text-left wrap-break-word">{child.title}</span>
                    {location.pathname === child.href && <span className="w-2 h-2 rounded-full bg-purple-600 dark:bg-pink-500 shrink-0 ml-2" />}
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
          className={cn("relative flex items-center gap-3 rounded-xl px-3 py-2 transition-colors group", isActive ? 'bg-purple-50 dark:bg-white/5' : 'hover:bg-slate-100 dark:hover:bg-white/5', !isSidebarOpen && "justify-center px-0")}
          onClick={(e) => {
            if (!isSidebarOpen) handleOpenAndExpand(e);
            else if (window.innerWidth < 1024) setSidebarOpen(false);
          }}
        >
            {item.icon && (
                <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center transition-colors shrink-0", isActive ? 'bg-purple-100 text-purple-700 dark:bg-pink-500/20 dark:text-pink-400' : 'bg-white border border-slate-200 text-slate-500 dark:bg-slate-800 dark:border-none dark:text-slate-400')}>
                    {item.icon}
                </div>
            )}
            {isSidebarOpen && <span className={cn("text-sm font-medium transition-colors whitespace-normal leading-tight text-left wrap-break-word pr-2", isActive ? 'text-purple-900 font-semibold dark:text-white' : 'text-slate-600 dark:text-slate-300')}>{item.title}</span>}
            {isActive && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-r-full bg-linear-to-b from-purple-500 to-pink-500" />}
        </Link>
    </div>
  );
}

export function Sidebar({ items }: SidebarProps): ReactElement {
  const { isSidebarOpen, setSidebarOpen, searchQuery } = useUIStore();
  const location = useLocation();
  
  const getDefaultKeys = useCallback(() => {
    const keys = new Set<string>();
    const findActive = (navItems: NavItem[]) => {
      navItems.forEach(item => {
        if (item.href === location.pathname || (item.children?.some(c => c.href === location.pathname))) {
          keys.add(item.href || item.title);
        }
        if (item.children) findActive(item.children);
      });
    };
    findActive(items);
    return keys;
  }, [items, location.pathname]);

  const [expandedItemKeys, setExpandedItemKeys] = useState<Set<string>>(new Set());
  const [isManualClick, setIsManualClick] = useState(false);

  useEffect(() => {
    if (window.innerWidth < 1024) setSidebarOpen(false);
  }, [setSidebarOpen]);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setExpandedItemKeys(getDefaultKeys());
      setIsManualClick(false);
    }
  }, [searchQuery, getDefaultKeys]);

  useEffect(() => {
    if (!isSidebarOpen) {
      setExpandedItemKeys(new Set());
    } else {
      setExpandedItemKeys(prev => prev.size > 0 ? prev : getDefaultKeys());
    }
  }, [isSidebarOpen, getDefaultKeys]);

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
      {isSidebarOpen && <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => useUIStore.getState().setSidebarOpen(false)} />}
      <aside className={cn('fixed lg:sticky top-0 h-screen z-50 flex flex-col transition-all duration-300 ease-in-out shrink-0 overflow-hidden shadow-2xl bg-white border-r border-slate-200 dark:bg-[#130822]/90 dark:border-white/5 dark:backdrop-blur-2xl', isSidebarOpen ? "w-72 translate-x-0" : "w-72 -translate-x-full lg:w-20 lg:translate-x-0")}>
        <div className={cn("h-24 flex items-center justify-center border-b border-slate-100 dark:border-white/5 shrink-0 relative", isSidebarOpen ? "px-4" : "px-0")}>
          {isSidebarOpen ? (
            <div className="w-full flex items-center justify-between">
              <div className="w-8 lg:hidden" />
              <div className="flex justify-center flex-1"><img src={VERII_LOGO_URL} alt="Logo" className="h-35 object-contain" /></div>
              <button onClick={() => useUIStore.getState().setSidebarOpen(false)} className="lg:hidden p-2 text-slate-500 hover:text-red-500 rounded-lg"><X size={24} /></button>
              <div className="w-8 hidden lg:block" />
            </div>
          ) : (
            <div className="w-full h-full flex items-center justify-center p-1"><img src={LOGO_URL} alt="V3" className="w-full h-full object-contain scale-150" /></div>
          )}
        </div>
        <nav className="flex-1 min-h-0 pt-12 pb-6 px-3 space-y-2 overflow-y-auto custom-scrollbar">
          {items.map((item, idx) => (
            <NavItemComponent key={item.href || item.title || idx} item={item} searchQuery={searchQuery} expandedItemKeys={expandedItemKeys} onToggle={handleToggle} isManualClick={isManualClick} />
          ))}
        </nav>
      </aside>
    </>
  );
}
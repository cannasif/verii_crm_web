import {
  type CSSProperties,
  type ReactElement,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { NavItem } from './nav-items';

interface PremiumTopNavProps {
  items: NavItem[];
}

const COLLAPSE_STORAGE_KEY = 'crm:premiumTopNav:collapsed';

function readStoredCollapsed(): boolean {
  try {
    return localStorage.getItem(COLLAPSE_STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

function itemContainsPath(item: NavItem, pathname: string): boolean {
  if (item.href && (pathname === item.href || pathname.startsWith(`${item.href}/`))) {
    return true;
  }
  return item.children?.some((child) => itemContainsPath(child, pathname)) ?? false;
}

function getItemKey(item: NavItem, index: number): string {
  return item.href ?? item.title ?? String(index);
}

function collectCollapsibleKeys(item: NavItem, depth: number, trail: string): string[] {
  const keys: string[] = [];
  const key = `${trail}/${getItemKey(item, depth)}`;
  if (depth > 1 && item.children?.length) {
    keys.push(key);
  }
  item.children?.forEach((child, index) => {
    keys.push(...collectCollapsibleKeys(child, depth + 1, `${key}-${index}`));
  });
  return keys;
}

export function PremiumTopNav({ items }: PremiumTopNavProps): ReactElement {
  const { t, i18n } = useTranslation('common');
  const location = useLocation();
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(() => new Set());
  const [gliderStyle, setGliderStyle] = useState<CSSProperties | null>(null);
  const [collapsed, setCollapsed] = useState<boolean>(readStoredCollapsed);
  const tabRefs = useRef<(HTMLElement | null)[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const navRef = useRef<HTMLElement>(null);

  const activeIndex = useMemo(
    () => items.findIndex((item) => itemContainsPath(item, location.pathname)),
    [items, location.pathname],
  );
  const highlightIndex = openIndex ?? (activeIndex >= 0 ? activeIndex : null);

  const updateGlider = useCallback((): void => {
    if (highlightIndex === null) {
      setGliderStyle(null);
      return;
    }
    const tab = tabRefs.current[highlightIndex];
    const container = containerRef.current;
    if (!tab || !container) {
      setGliderStyle(null);
      return;
    }
    const tabRect = tab.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    setGliderStyle({
      transform: `translateX(${tabRect.left - containerRect.left + container.scrollLeft}px)`,
      width: `${tabRect.width}px`,
    });
  }, [highlightIndex]);

  useLayoutEffect(() => {
    updateGlider();
  }, [updateGlider, items, i18n.resolvedLanguage, collapsed]);

  useEffect(() => {
    window.addEventListener('resize', updateGlider);
    return () => window.removeEventListener('resize', updateGlider);
  }, [updateGlider]);

  useEffect(() => {
    try {
      localStorage.setItem(COLLAPSE_STORAGE_KEY, collapsed ? '1' : '0');
    } catch {
      // ignore storage errors (private mode, quota, etc.)
    }
  }, [collapsed]);

  useEffect(() => {
    setOpenIndex(null);
  }, [location.pathname]);

  useEffect(() => {
    if (openIndex === null) {
      setExpandedGroups(new Set());
      return;
    }
    const openItem = items[openIndex];
    if (!openItem?.children?.length) {
      setExpandedGroups(new Set());
      return;
    }
    const defaults = new Set<string>();
    openItem.children.forEach((child, index) => {
      collectCollapsibleKeys(child, 1, `root-${index}`).forEach((key) => defaults.add(key));
    });
    setExpandedGroups(defaults);
  }, [openIndex, items]);

  useEffect(() => {
    if (openIndex === null) return;

    const handlePointerDown = (event: MouseEvent): void => {
      if (navRef.current && !navRef.current.contains(event.target as Node)) {
        setOpenIndex(null);
      }
    };
    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') setOpenIndex(null);
    };
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [openIndex]);

  const toggleGroup = (key: string): void => {
    setExpandedGroups((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const renderLeaf = (item: NavItem, depth: number): ReactElement => {
    const isActive = Boolean(
      item.href && (location.pathname === item.href || location.pathname.startsWith(`${item.href}/`)),
    );
    return (
      <Link
        key={item.href}
        to={item.href ?? '#'}
        className={cn(
          'crm-premium-nav__link',
          depth > 1 && 'crm-premium-nav__link--nested',
          isActive && 'crm-premium-nav__link--active',
        )}
        onClick={() => setOpenIndex(null)}
      >
        {item.title}
      </Link>
    );
  };

  const renderGroupContent = (item: NavItem, depth: number, trail: string): ReactElement => {
    const groupKey = `${trail}/${getItemKey(item, depth)}`;
    const isCollapsible = depth > 1 && Boolean(item.children?.length);
    const isExpanded = !isCollapsible || expandedGroups.has(groupKey);
    const isCurrent = itemContainsPath(item, location.pathname);
    const titleClassName = cn(
      'crm-premium-nav__group-title',
      depth === 1 && 'crm-premium-nav__group-title--column',
      depth > 1 && 'crm-premium-nav__group-title--nested',
      isCurrent && 'crm-premium-nav__group-title--current',
    );

    return (
      <div
        key={groupKey}
        className={cn(
          'crm-premium-nav__group',
          depth === 1 && 'crm-premium-nav__group--column',
          depth > 1 && 'crm-premium-nav__group--nested',
          isCollapsible && 'crm-premium-nav__group--collapsible',
          isCollapsible && !isExpanded && 'crm-premium-nav__group--collapsed',
          isCurrent && 'crm-premium-nav__group--current',
        )}
      >
        {isCollapsible ? (
          <button
            type="button"
            className={cn(titleClassName, 'crm-premium-nav__group-title--toggle')}
            aria-expanded={isExpanded}
            onClick={() => toggleGroup(groupKey)}
          >
            <span className="crm-premium-nav__group-title-label">{item.title}</span>
            <ChevronDown
              className={cn(
                'crm-premium-nav__group-chevron',
                isExpanded && 'crm-premium-nav__group-chevron--open',
              )}
              strokeWidth={2}
              aria-hidden
            />
          </button>
        ) : (
          <p className={titleClassName}>{item.title}</p>
        )}
        {isExpanded ? (
          <div className="crm-premium-nav__group-body">
            {item.href ? renderLeaf(item, depth) : null}
            {item.children?.map((child, childIndex) =>
              child.children?.length
                ? renderGroupContent(child, depth + 1, `${groupKey}-${childIndex}`)
                : child.href
                  ? renderLeaf(child, depth)
                  : null,
            )}
          </div>
        ) : null}
      </div>
    );
  };

  const openItem = openIndex !== null ? items[openIndex] : null;

  return (
    <nav ref={navRef} className={cn('crm-premium-nav', collapsed && 'crm-premium-nav--collapsed')} aria-label={t('shell.mainNavigation')}>
      <div className="crm-premium-nav__collapsible" aria-hidden={collapsed}>
        <div ref={containerRef} className="crm-premium-nav__tabs" inert={collapsed}>
          {gliderStyle ? <span className="crm-premium-nav__glider" style={gliderStyle} aria-hidden /> : null}
          {items.map((item, index) => {
            const isActive = index === activeIndex;
            const isOpen = index === openIndex;

            if (!item.children?.length && item.href) {
              return (
                <Link
                  key={getItemKey(item, index)}
                  ref={(element) => {
                    tabRefs.current[index] = element;
                  }}
                  to={item.href}
                  className={cn('crm-premium-nav__tab', isActive && 'crm-premium-nav__tab--active')}
                  onClick={() => setOpenIndex(null)}
                >
                  {item.icon ? <span className="crm-premium-nav__tab-icon">{item.icon}</span> : null}
                  <span className="crm-premium-nav__tab-label">{item.title}</span>
                </Link>
              );
            }

            return (
              <button
                key={getItemKey(item, index)}
                ref={(element) => {
                  tabRefs.current[index] = element;
                }}
                type="button"
                aria-expanded={isOpen}
                className={cn(
                  'crm-premium-nav__tab',
                  isActive && 'crm-premium-nav__tab--active',
                  isOpen && 'crm-premium-nav__tab--open',
                )}
                onClick={() => setOpenIndex((current) => (current === index ? null : index))}
              >
                {item.icon ? <span className="crm-premium-nav__tab-icon">{item.icon}</span> : null}
                <span className="crm-premium-nav__tab-label">{item.title}</span>
                <ChevronDown
                  className={cn(
                    'crm-premium-nav__tab-chevron',
                    isOpen && 'crm-premium-nav__tab-chevron--open',
                  )}
                  strokeWidth={2.25}
                  aria-hidden
                />
              </button>
            );
          })}
        </div>
      </div>

      <button
        type="button"
        className="crm-premium-nav__reveal"
        onClick={() => setCollapsed((current) => !current)}
        aria-expanded={!collapsed}
        aria-label={collapsed ? t('shell.expandNav') : t('shell.collapseNav')}
        title={collapsed ? t('shell.expandNav') : t('shell.collapseNav')}
      >
        <ChevronDown
          className={cn('crm-premium-nav__reveal-icon', !collapsed && 'crm-premium-nav__reveal-icon--open')}
          size={14}
          strokeWidth={2.5}
          aria-hidden
        />
      </button>

      {openItem?.children?.length ? (
        <div className="crm-premium-nav__panel" role="menu">
          <div className="crm-premium-nav__panel-scroll">
            <div className="crm-premium-nav__panel-grid">
              {openItem.children.map((child, childIndex) =>
                child.children?.length
                  ? renderGroupContent(child, 1, `root-${childIndex}`)
                  : child.href
                    ? (
                        <div key={getItemKey(child, childIndex)} className="crm-premium-nav__group">
                          <div className="crm-premium-nav__group-body">{renderLeaf(child, 1)}</div>
                        </div>
                      )
                    : null,
              )}
            </div>
          </div>
        </div>
      ) : null}
    </nav>
  );
}

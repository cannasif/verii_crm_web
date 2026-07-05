import { type ReactElement, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Filter, FileDown, MoreVertical, RefreshCw, Search, X, Columns3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { useToolbarActionOverflow, type ToolbarOverflowLayoutRefs } from '@/hooks/useToolbarActionOverflow';
import {
  getToolbarSearchMaxWidthClass,
  isToolbarRefreshIconMode,
  isToolbarSearchIconMode,
  TOOLBAR_SEARCH_ICON_COMPACT_LEVEL,
  TOOLBAR_TABS_COMPACT_LEVEL,
  useToolbarCompactMode,
  type ToolbarCompactLevel,
} from '@/hooks/useToolbarCompactMode';
import { AdvancedFilter } from './AdvancedFilter';
import { ColumnPreferencesPanel, type ColumnDef } from './ColumnPreferencesPopover';
import { GridExportMenu, GridExportMenuItems } from './GridExportMenu';
import type { FilterColumnConfig, FilterRow } from '@/lib/advanced-filter-types';
import type { GridExportColumn } from '@/lib/grid-export';
import { cn } from '@/lib/utils';

export interface DataTableSearchConfig {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  onSearchChange?: (value: string) => void;
  placeholder?: string;
  className?: string;
  wrapperClassName?: string;
  debounceMs?: number;
  minLength?: number;
  resetKey?: string | number;
}

export interface DataTableRefreshConfig {
  onRefresh: () => void;
  isLoading?: boolean;
  disabled?: boolean;
  cooldownSeconds?: number;
  label?: string;
}

export interface DataTableLeftSlotContext {
  compactLevel: ToolbarCompactLevel;
  isMobile: boolean;
}

export interface DataTableActionBarProps {
  pageKey: string;
  userId?: number;
  columns: ColumnDef[];
  visibleColumns: string[];
  columnOrder: string[];
  onVisibleColumnsChange: (visible: string[]) => void;
  onColumnOrderChange: (order: string[]) => void;
  exportFileName: string;
  exportColumns: GridExportColumn[];
  exportRows: Record<string, unknown>[];
  getExportData?: () => Promise<{ columns: GridExportColumn[]; rows: Record<string, unknown>[] }>;
  filterColumns: readonly FilterColumnConfig[];
  defaultFilterColumn: string;
  draftFilterRows: FilterRow[];
  onDraftFilterRowsChange: (rows: FilterRow[]) => void;
  filterLogic?: 'and' | 'or';
  onFilterLogicChange?: (value: 'and' | 'or') => void;
  onApplyFilters: () => void;
  onClearFilters: () => void;
  translationNamespace?: string;
  appliedFilterCount?: number;
  searchValue?: string;
  searchPlaceholder?: string;
  onSearchChange?: (value: string) => void;
  searchClassName?: string;
  search?: DataTableSearchConfig;
  refresh?: DataTableRefreshConfig;
  searchDebounceMs?: number;
  leftSlot?: React.ReactNode | ((context: DataTableLeftSlotContext) => React.ReactNode);
  additionalFilterActions?: React.ReactNode;
  compactSearchOnMobile?: boolean;
  mobileMoreOptionsSlot?: React.ReactNode;
}

type ToolbarActionKey = 'filter' | 'columns' | 'additional' | 'export';

export function DataTableActionBar({
  pageKey,
  userId,
  columns,
  visibleColumns,
  columnOrder,
  onVisibleColumnsChange,
  onColumnOrderChange,
  exportFileName,
  exportColumns,
  exportRows,
  getExportData,
  filterColumns,
  defaultFilterColumn,
  draftFilterRows,
  onDraftFilterRowsChange,
  filterLogic,
  onFilterLogicChange,
  onApplyFilters,
  onClearFilters,
  translationNamespace = 'common',
  appliedFilterCount = 0,
  searchValue,
  searchPlaceholder,
  onSearchChange,
  searchClassName = 'h-9 w-[200px]',
  search,
  refresh,
  searchDebounceMs = 700,
  leftSlot,
  additionalFilterActions,
  compactSearchOnMobile = false,
  mobileMoreOptionsSlot,
}: DataTableActionBarProps): ReactElement {
  const { t } = useTranslation([translationNamespace, 'common']);
  const MISSING_TRANSLATION = 'Çeviri eksik';
  const resolveAdvancedFilterTitle = (): string => {
    const featureTitle = t('advancedFilter.title', { ns: translationNamespace });
    if (featureTitle && featureTitle !== MISSING_TRANSLATION && featureTitle !== 'advancedFilter.title') return featureTitle;
    return t('advancedFilter.title', { ns: 'common' });
  };
  const [showFilters, setShowFilters] = useState(false);
  const [columnsOpen, setColumnsOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [desktopOverflowOpen, setDesktopOverflowOpen] = useState(false);
  const [isDesktopCompactSearchOpen, setIsDesktopCompactSearchOpen] = useState(false);
  const [internalSearchValue, setInternalSearchValue] = useState(search?.defaultValue ?? '');
  const [legacyDisplayValue, setLegacyDisplayValue] = useState(searchValue ?? '');
  const [isMobileSearchActive, setIsMobileSearchActive] = useState(() => {
    return compactSearchOnMobile && Boolean(searchValue || search?.defaultValue || search?.value);
  });
  const [refreshCooldownUntil, setRefreshCooldownUntil] = useState<number | null>(null);
  const [refreshNow, setRefreshNow] = useState(() => Date.now());
  const lastEmittedLegacyRef = useRef(searchValue ?? '');
  const toolbarRowRef = useRef<HTMLDivElement>(null);
  const leftSlotRef = useRef<HTMLDivElement>(null);
  const leftSlotFullMeasureRef = useRef<HTMLDivElement>(null);
  const leftSlotCompactMeasureRef = useRef<HTMLDivElement>(null);
  const leftPinnedMiddleRef = useRef<HTMLDivElement>(null);
  const rightPinnedRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);
  const searchFullMeasureRef = useRef<HTMLDivElement>(null);
  const refreshFullMeasureRef = useRef<HTMLDivElement>(null);

  const isSearchControlled = search?.value !== undefined;
  const useLegacySearch = Boolean(onSearchChange && !search);
  const legacyDebounceMs = searchDebounceMs;

  const debouncedLegacyValue = useDebouncedValue(legacyDisplayValue, legacyDebounceMs);

  useEffect(() => {
    if (!useLegacySearch) return;
    if (debouncedLegacyValue === lastEmittedLegacyRef.current) return;
    lastEmittedLegacyRef.current = debouncedLegacyValue;
    onSearchChange?.(debouncedLegacyValue);
  }, [debouncedLegacyValue, useLegacySearch, onSearchChange]);

  useEffect(() => {
    if (!useLegacySearch) return;
    if (searchValue === '') {
      setLegacyDisplayValue('');
      lastEmittedLegacyRef.current = '';
      return;
    }
    if (searchValue === lastEmittedLegacyRef.current) {
      setLegacyDisplayValue(searchValue);
    }
  }, [searchValue, useLegacySearch]);

  useEffect(() => {
    if (!search?.resetKey || isSearchControlled) return;
    setInternalSearchValue(search.defaultValue ?? '');
  }, [search?.resetKey, search?.defaultValue, isSearchControlled]);

  useEffect(() => {
    if (!refreshCooldownUntil) return;
    if (refreshCooldownUntil <= Date.now()) {
      setRefreshCooldownUntil(null);
      return;
    }

    const interval = window.setInterval(() => {
      setRefreshNow(Date.now());
    }, 1000);

    return () => window.clearInterval(interval);
  }, [refreshCooldownUntil]);

  const currentSearchValue = search
    ? (isSearchControlled ? (search.value ?? '') : internalSearchValue)
    : legacyDisplayValue;
  const debouncedSearchConfigValue = useDebouncedValue(currentSearchValue, search?.debounceMs ?? 700);
  const debouncedSearchValue = search ? debouncedSearchConfigValue : debouncedLegacyValue;
  const normalizedSearchValue = useMemo(() => {
    const trimmed = debouncedSearchValue.trim();
    if (!trimmed) return '';

    const minLength = Math.max(search?.minLength ?? 0, 0);
    return trimmed.length < minLength ? '' : trimmed;
  }, [debouncedSearchValue, search?.minLength]);

  const searchOnSearchChangeRef = useRef(search?.onSearchChange);
  searchOnSearchChangeRef.current = search?.onSearchChange;
  useEffect(() => {
    if (!searchOnSearchChangeRef.current) return;
    searchOnSearchChangeRef.current(normalizedSearchValue);
  }, [normalizedSearchValue]);

  const handleSearchInputChange = (value: string): void => {
    if (search) {
      if (!isSearchControlled) {
        setInternalSearchValue(value);
      }
      search.onValueChange?.(value);
      return;
    }
    setLegacyDisplayValue(value);
  };

  const resolvedSearchPlaceholderProp = search?.placeholder ?? searchPlaceholder;
  const resolvedSearchPlaceholder = resolvedSearchPlaceholderProp === MISSING_TRANSLATION
    ? t('search', { ns: 'common' })
    : resolvedSearchPlaceholderProp ?? t('search', { ns: 'common' });
  const resolvedSearchClassName = search?.className ?? searchClassName;
  const shouldRenderSearch = Boolean(search || onSearchChange);
  const refreshCooldownSeconds = Math.max(refresh?.cooldownSeconds ?? 60, 0);
  const refreshRemainingSeconds = refreshCooldownUntil == null
    ? 0
    : Math.max(0, Math.ceil((refreshCooldownUntil - refreshNow) / 1000));
  const isRefreshDisabled = Boolean(refresh?.disabled || refresh?.isLoading || refreshRemainingSeconds > 0);
  const refreshLabel = refresh?.label && refresh.label === MISSING_TRANSLATION ? t('refresh', { ns: 'common' }) : refresh?.label ?? t('refresh', { ns: 'common' });

  const handleRefresh = (): void => {
    if (!refresh || isRefreshDisabled) return;
    refresh.onRefresh();
    if (refreshCooldownSeconds > 0) {
      setRefreshCooldownUntil(Date.now() + refreshCooldownSeconds * 1000);
      setRefreshNow(Date.now());
    }
  };

  const handleFilterOpenChange = (next: boolean): void => {
    setShowFilters(next);
    if (next) {
      setColumnsOpen(false);
    }
  };

  const handleColumnsOpenChange = (next: boolean): void => {
    setColumnsOpen(next);
    if (next) {
      setShowFilters(false);
    }
  };

  const filterButtonClassName = cn(
    'h-9 border-dashed border-slate-300 dark:border-white/20 text-xs sm:text-sm',
    showFilters || appliedFilterCount > 0
      ? 'bg-primary/20 text-primary border-primary/30 hover:bg-primary/30'
      : 'bg-transparent hover:bg-slate-50 dark:hover:bg-white/5'
  );

  const columnsButtonClassName = cn(
    'h-9 border-dashed border-slate-300 dark:border-white/20 text-xs sm:text-sm',
    columnsOpen
      ? 'bg-primary/20 text-primary border-primary/30 hover:bg-primary/30'
      : 'bg-transparent hover:bg-slate-50 dark:hover:bg-white/5'
  );

  const hasAdditionalActions = Boolean(additionalFilterActions);

  const overflowStableWidthContext = useMemo(
    () => ({
      toolbarRef: toolbarRowRef,
      searchFullMeasureRef,
      refreshFullMeasureRef,
      leftSlotRef,
      leftSlotFullMeasureRef: typeof leftSlot === 'function' ? leftSlotFullMeasureRef : undefined,
      hasSearch: shouldRenderSearch,
      hasRefresh: Boolean(refresh),
      useFullLeftSlotMeasure: typeof leftSlot === 'function',
    }),
    [refresh, shouldRenderSearch, leftSlot]
  );

  const overflowLayoutRefs = useMemo(
    (): ToolbarOverflowLayoutRefs => ({
      toolbarRef: toolbarRowRef,
      leftPinnedMiddleRef,
    }),
    []
  );

  const { overflowMode, isMobile, hasDesktopOverflow } = useToolbarActionOverflow(
    hasAdditionalActions,
    `${appliedFilterCount}-${showFilters}-${columnsOpen}-${hasAdditionalActions}`,
    overflowStableWidthContext,
    overflowLayoutRefs,
    containerRef,
    measureRef
  );

  const isCoreInline = overflowMode === 'all-inline';

  const isActionInline = (actionKey: ToolbarActionKey): boolean => {
    if (isMobile) return false;
    if (actionKey === 'additional') {
      return overflowMode === 'all-inline' || overflowMode === 'core-in-menu';
    }
    return isCoreInline;
  };

  const isActionOverflowed = (actionKey: ToolbarActionKey): boolean => !isActionInline(actionKey);

  const hasCompactibleTabs = typeof leftSlot === 'function';
  const isRightSectionFullyCollapsed = overflowMode === 'all-in-menu' || (overflowMode === 'core-in-menu' && !hasAdditionalActions);

  const { compactLevel } = useToolbarCompactMode({
    enabled: !isMobile && isRightSectionFullyCollapsed,
    hasSearch: shouldRenderSearch,
    hasRefresh: Boolean(refresh),
    hasCompactibleTabs,
    remeasureKey: `${isRightSectionFullyCollapsed}-${overflowMode}-${refreshRemainingSeconds}-${hasCompactibleTabs}`,
    toolbarRef: toolbarRowRef,
    leftSlotRef,
    leftSlotFullMeasureRef: hasCompactibleTabs ? leftSlotFullMeasureRef : undefined,
    leftSlotCompactMeasureRef: hasCompactibleTabs ? leftSlotCompactMeasureRef : undefined,
    rightPinnedRef,
    searchFullMeasureRef,
    refreshFullMeasureRef,
  });

  const useDesktopSearchIcon = !isMobile && isToolbarSearchIconMode(compactLevel);
  const useDesktopCompactRefresh = !isMobile && isToolbarRefreshIconMode(compactLevel);
  const desktopSearchMaxWidthClass = !isMobile && isRightSectionFullyCollapsed
    ? getToolbarSearchMaxWidthClass(compactLevel)
    : 'sm:max-w-xs';
  const resolvedLeftSlot = typeof leftSlot === 'function' ? leftSlot({ compactLevel, isMobile }) : leftSlot;

  useEffect(() => {
    if (compactLevel < TOOLBAR_SEARCH_ICON_COMPACT_LEVEL) {
      setIsDesktopCompactSearchOpen(false);
    }
  }, [compactLevel]);

  const renderFilterTriggerButton = (): ReactElement => (
    <Button
      variant={showFilters || appliedFilterCount > 0 ? 'default' : 'outline'}
      size="sm"
      className={filterButtonClassName}
    >
      <Filter className="crm-me-2 h-4 w-4" />
      {t('filters', { ns: 'common' })}
      {appliedFilterCount > 0 && (
        <span className="crm-ms-2 inline-flex min-w-5 items-center justify-center rounded-full bg-white/20 px-1.5 py-0.5 text-[10px] font-semibold leading-none">
          {appliedFilterCount}
        </span>
      )}
    </Button>
  );

  const renderColumnsTriggerButton = (): ReactElement => (
    <Button
      variant={columnsOpen ? 'default' : 'outline'}
      size="sm"
      className={columnsButtonClassName}
    >
      <Columns3 className="crm-me-2 h-4 w-4" />
      {t('common.editColumns')}
    </Button>
  );

  const renderFilterOverflowMenuItem = (onClose: () => void): ReactElement => (
    <DropdownMenuItem
      className="cursor-pointer"
      onSelect={(event) => {
        event.preventDefault();
        onClose();
        setTimeout(() => setShowFilters(true), 150);
      }}
    >
      <Filter className="crm-me-2 h-4 w-4" />
      {t('filters', { ns: 'common' })}
      {appliedFilterCount > 0 ? (
        <span className="crm-ms-auto inline-flex min-w-5 items-center justify-center rounded-full bg-primary/20 px-1.5 py-0.5 text-[10px] font-semibold leading-none text-primary">
          {appliedFilterCount}
        </span>
      ) : null}
    </DropdownMenuItem>
  );

  const renderColumnsOverflowMenuItem = (onClose: () => void): ReactElement => (
    <DropdownMenuItem
      className="cursor-pointer"
      onSelect={(event) => {
        event.preventDefault();
        onClose();
        setTimeout(() => setColumnsOpen(true), 150);
      }}
    >
      <Columns3 className="crm-me-2 h-4 w-4" />
      {t('common.editColumns')}
    </DropdownMenuItem>
  );

  const renderExportOverflowSubmenu = (onClose: () => void): ReactElement => (
    <DropdownMenuSub>
      <DropdownMenuSubTrigger className="cursor-pointer">
        <FileDown className="crm-me-2 h-4 w-4" />
        {t('export', { ns: 'common', defaultValue: 'Çıktı Al' })}
      </DropdownMenuSubTrigger>
      <DropdownMenuSubContent>
        <GridExportMenuItems
          fileName={exportFileName}
          columns={exportColumns}
          rows={exportRows}
          getExportData={getExportData}
          translationNamespace={translationNamespace}
          onActionComplete={onClose}
        />
      </DropdownMenuSubContent>
    </DropdownMenuSub>
  );

  const renderDesktopOverflowMenuItems = (onClose: () => void): ReactElement => (
    <>
      {isActionOverflowed('additional') && additionalFilterActions ? (
        <div className="px-2 py-1.5" onPointerDown={(event) => event.stopPropagation()}>
          {additionalFilterActions}
        </div>
      ) : null}
      {!isCoreInline ? renderFilterOverflowMenuItem(onClose) : null}
      {!isCoreInline ? renderColumnsOverflowMenuItem(onClose) : null}
      {!isCoreInline ? renderExportOverflowSubmenu(onClose) : null}
    </>
  );

  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-center lg:justify-between">
      <div ref={toolbarRowRef} className="relative flex w-full min-w-0 items-center gap-2">
        <div className="pointer-events-none invisible absolute h-0 overflow-hidden" aria-hidden>
          {shouldRenderSearch ? (
            <div ref={searchFullMeasureRef} className="inline-flex">
              <Input
                readOnly
                tabIndex={-1}
                aria-hidden
                placeholder={resolvedSearchPlaceholder}
                className={cn(
                  resolvedSearchClassName,
                  'w-full border-slate-300 bg-white text-sm crm-ps-9 shadow-sm dark:border-white/15 dark:bg-transparent dark:shadow-none'
                )}
              />
            </div>
          ) : null}
          {refresh ? (
            <div ref={refreshFullMeasureRef} className="inline-flex">
              <Button
                variant="outline"
                size="sm"
                tabIndex={-1}
                aria-hidden
                className="shrink-0 border-slate-300 bg-white shadow-sm dark:border-white/15 dark:bg-transparent dark:shadow-none"
              >
                <RefreshCw className="h-4 w-4 crm-me-2" />
                <span>{refreshRemainingSeconds > 0 ? `${refreshLabel} (${refreshRemainingSeconds}s)` : refreshLabel}</span>
              </Button>
            </div>
          ) : null}
          {hasCompactibleTabs ? (
            <>
              <div ref={leftSlotFullMeasureRef} className="inline-flex">
                {leftSlot({ compactLevel: 0, isMobile: false })}
              </div>
              <div ref={leftSlotCompactMeasureRef} className="inline-flex">
                {leftSlot({ compactLevel: TOOLBAR_TABS_COMPACT_LEVEL, isMobile: false })}
              </div>
            </>
          ) : null}
        </div>

        {compactSearchOnMobile && shouldRenderSearch && !isMobileSearchActive && (
          <Button
            variant="outline"
            size="icon"
            className="sm:hidden shrink-0 h-9 w-9 border-slate-300 bg-white shadow-sm dark:border-white/15 dark:bg-transparent"
            onClick={() => setIsMobileSearchActive(true)}
            aria-label={resolvedSearchPlaceholder}
          >
            <Search className="h-4 w-4" />
          </Button>
        )}

        {useDesktopSearchIcon && !isDesktopCompactSearchOpen ? (
          <Button
            variant="outline"
            size="icon"
            className="hidden shrink-0 h-9 w-9 border-slate-300 bg-white shadow-sm dark:border-white/15 dark:bg-transparent sm:inline-flex"
            onClick={() => setIsDesktopCompactSearchOpen(true)}
            aria-label={resolvedSearchPlaceholder}
          >
            <Search className="h-4 w-4" />
          </Button>
        ) : null}

        {shouldRenderSearch && (!useDesktopSearchIcon || isDesktopCompactSearchOpen) ? (
          <div
            className={cn(
              'group/search relative min-w-0',
              desktopSearchMaxWidthClass,
              compactSearchOnMobile
                ? (isMobileSearchActive ? 'flex-1 flex' : 'hidden sm:flex flex-1')
                : useDesktopSearchIcon
                  ? (isDesktopCompactSearchOpen ? 'hidden min-w-0 flex-1 sm:flex' : 'hidden sm:flex flex-1')
                  : 'flex flex-1',
              search?.wrapperClassName
            )}
          >
            <Search
              className="pointer-events-none absolute crm-start-2-5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 transition-colors group-focus-within/search:text-primary dark:text-slate-500 dark:group-focus-within/search:text-primary"
              aria-hidden
            />
            <Input
              placeholder={resolvedSearchPlaceholder}
              value={currentSearchValue}
              onChange={(event) => handleSearchInputChange(event.target.value)}
              className={cn(
                resolvedSearchClassName,
                'w-full border-slate-300 bg-white text-sm crm-ps-9 shadow-sm transition-all dark:border-white/15 dark:bg-transparent dark:shadow-none',
                (compactSearchOnMobile && isMobileSearchActive) || (useDesktopSearchIcon && isDesktopCompactSearchOpen) ? 'crm-pe-8' : undefined,
                'focus:border-primary focus:ring-[3px] focus:ring-primary/20',
                'focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-primary/20',
                'dark:focus:border-primary/60 dark:focus:ring-primary/10',
                'dark:focus-visible:border-primary/60 dark:focus-visible:ring-primary/10'
              )}
            />
            {compactSearchOnMobile && isMobileSearchActive ? (
              <Button
                variant="ghost"
                size="icon"
                className="absolute crm-end-0 top-0 h-full w-8 px-0 hover:bg-transparent sm:hidden"
                onClick={() => {
                  handleSearchInputChange('');
                  setIsMobileSearchActive(false);
                }}
              >
                <X className="h-4 w-4 text-slate-400" />
              </Button>
            ) : null}
            {useDesktopSearchIcon && isDesktopCompactSearchOpen ? (
              <Button
                variant="ghost"
                size="icon"
                className="absolute crm-end-0 top-0 hidden h-full w-8 px-0 hover:bg-transparent sm:inline-flex"
                onClick={() => setIsDesktopCompactSearchOpen(false)}
                aria-label={t('common.close')}
              >
                <X className="h-4 w-4 text-slate-400" />
              </Button>
            ) : null}
          </div>
        ) : null}

        <div
          ref={leftPinnedMiddleRef}
          className={cn('flex shrink-0 items-center gap-2', compactSearchOnMobile && isMobileSearchActive ? 'hidden sm:flex' : 'flex')}
        >
          {refresh ? (
            <Button
              variant="outline"
              size={useDesktopCompactRefresh ? 'icon' : 'sm'}
              className={cn(
                'shrink-0 border-slate-300 bg-white shadow-sm hover:bg-stone-50 dark:border-white/15 dark:bg-transparent dark:shadow-none',
                compactSearchOnMobile && !useDesktopCompactRefresh && 'max-sm:h-9 max-sm:w-9 max-sm:px-0',
                useDesktopCompactRefresh && 'hidden h-9 w-9 px-0 sm:inline-flex'
              )}
              onClick={handleRefresh}
              disabled={isRefreshDisabled}
              aria-label={refreshLabel}
            >
              <RefreshCw className={cn(
                'h-4 w-4',
                !useDesktopCompactRefresh && (compactSearchOnMobile ? 'max-sm:[margin-inline-end:0] crm-me-2' : 'crm-me-2'),
                refresh?.isLoading && 'animate-spin'
              )} />
              {!useDesktopCompactRefresh ? (
                <span className={cn(compactSearchOnMobile && 'hidden sm:inline')}>
                  {refreshRemainingSeconds > 0 ? `${refreshLabel} (${refreshRemainingSeconds}s)` : refreshLabel}
                </span>
              ) : null}
            </Button>
          ) : null}
          {resolvedLeftSlot ? (
            <div ref={leftSlotRef} className="flex shrink-0 items-center">
              {resolvedLeftSlot}
            </div>
          ) : null}
        </div>

        <div
          ref={containerRef}
          className="relative flex min-w-0 flex-1 items-center justify-end overflow-hidden"
        >
          <div
            ref={measureRef}
            className="pointer-events-none invisible absolute flex items-center gap-2 whitespace-nowrap"
            aria-hidden
          >
            {additionalFilterActions ? (
              <div className="shrink-0">{additionalFilterActions}</div>
            ) : null}
            <div className="flex shrink-0 items-center gap-2">
              <div className="shrink-0">{renderFilterTriggerButton()}</div>
              <div className="shrink-0">{renderColumnsTriggerButton()}</div>
              <div className="shrink-0">
                <GridExportMenu
                  fileName={exportFileName}
                  columns={exportColumns}
                  rows={exportRows}
                  getExportData={getExportData}
                  translationNamespace={translationNamespace}
                />
              </div>
            </div>
          </div>

          <div ref={rightPinnedRef} className="flex min-w-0 max-w-full shrink-0 items-center justify-end gap-2 overflow-hidden">
            {isActionInline('additional') && additionalFilterActions ? (
              <div className="shrink-0">{additionalFilterActions}</div>
            ) : null}

            <Popover open={showFilters} onOpenChange={handleFilterOpenChange}>
              {isActionInline('filter') ? (
                <PopoverTrigger asChild>
                  {renderFilterTriggerButton()}
                </PopoverTrigger>
              ) : (
                <PopoverTrigger asChild>
                  <span className="pointer-events-none absolute bottom-0 crm-end-0 h-px w-px overflow-hidden opacity-0" tabIndex={-1} aria-hidden />
                </PopoverTrigger>
              )}
              <PopoverContent side="bottom" align="end" className="w-[560px] max-w-[95vw] p-0 rounded-2xl overflow-hidden">
                <div className="flex items-center justify-between p-3 border-b border-white/5">
                  <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                    {resolveAdvancedFilterTitle()}
                  </h3>
                  <button
                    type="button"
                    onClick={() => setShowFilters(false)}
                    className="text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
                    aria-label={t('common.close')}
                  >
                    <X size={16} />
                  </button>
                </div>
                <div className="p-3 overflow-y-auto max-h-[420px]">
                  <AdvancedFilter
                    columns={filterColumns}
                    defaultColumn={defaultFilterColumn}
                    draftRows={draftFilterRows}
                    onDraftRowsChange={onDraftFilterRowsChange}
                    filterLogic={filterLogic}
                    onFilterLogicChange={onFilterLogicChange}
                    onSearch={() => {
                      onApplyFilters();
                      setShowFilters(false);
                    }}
                    onClear={onClearFilters}
                    translationNamespace={translationNamespace}
                    embedded
                  />
                </div>
              </PopoverContent>
            </Popover>

            <Popover open={columnsOpen} onOpenChange={handleColumnsOpenChange}>
              {isActionInline('columns') ? (
                <PopoverTrigger asChild>
                  {renderColumnsTriggerButton()}
                </PopoverTrigger>
              ) : (
                <PopoverTrigger asChild>
                  <span className="pointer-events-none absolute bottom-0 crm-end-0 h-px w-px overflow-hidden opacity-0" tabIndex={-1} aria-hidden />
                </PopoverTrigger>
              )}
              <PopoverContent align="end" className="w-72 p-0 bg-white/95 dark:bg-[#1a1025]/95 backdrop-blur-xl border border-slate-200 dark:border-white/10 shadow-xl rounded-xl z-50">
                <ColumnPreferencesPanel
                  pageKey={pageKey}
                  userId={userId}
                  columns={columns}
                  visibleColumns={visibleColumns}
                  columnOrder={columnOrder}
                  onVisibleColumnsChange={onVisibleColumnsChange}
                  onColumnOrderChange={onColumnOrderChange}
                />
              </PopoverContent>
            </Popover>

            {isActionInline('export') ? (
              <GridExportMenu
                fileName={exportFileName}
                columns={exportColumns}
                rows={exportRows}
                getExportData={getExportData}
                translationNamespace={translationNamespace}
              />
            ) : null}

            {hasDesktopOverflow ? (
              <DropdownMenu open={desktopOverflowOpen} onOpenChange={setDesktopOverflowOpen}>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-9 w-9 shrink-0 border-slate-300 bg-white shadow-sm dark:border-white/15 dark:bg-transparent"
                    aria-label={t('moreActions', { ns: 'common', defaultValue: 'Diğer işlemler' })}
                  >
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52" onCloseAutoFocus={(event) => event.preventDefault()}>
                  {renderDesktopOverflowMenuItems(() => setDesktopOverflowOpen(false))}
                </DropdownMenuContent>
              </DropdownMenu>
            ) : null}

            <DropdownMenu open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-9 w-9 shrink-0 border-slate-300 bg-white shadow-sm dark:border-white/15 dark:bg-transparent sm:hidden"
                  aria-label={t('moreActions', { ns: 'common', defaultValue: 'Diğer işlemler' })}
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52" onCloseAutoFocus={(event) => event.preventDefault()}>
                {mobileMoreOptionsSlot}
                {additionalFilterActions ? (
                  <div className="px-2 py-1.5 sm:hidden" onPointerDown={(event) => event.stopPropagation()}>
                    {additionalFilterActions}
                  </div>
                ) : null}
                {renderFilterOverflowMenuItem(() => setMobileMenuOpen(false))}
                {renderColumnsOverflowMenuItem(() => setMobileMenuOpen(false))}
                {renderExportOverflowSubmenu(() => setMobileMenuOpen(false))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </div>
  );
}

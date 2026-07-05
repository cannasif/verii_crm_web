import { useLayoutEffect, useState, type RefObject } from 'react';

const MOBILE_MAX_WIDTH = 639;
const TOOLBAR_GAP = 8;
const SEARCH_FULL_MAX_WIDTH = 320;
const SEARCH_SHRINK_WIDTHS = [260, 200, 140] as const;
const SEARCH_ICON_WIDTH = 36;
const REFRESH_ICON_WIDTH = 36;
const EXPAND_HYSTERESIS = 20;

export const TOOLBAR_SEARCH_ICON_COMPACT_LEVEL = 4;
export const TOOLBAR_REFRESH_ICON_COMPACT_LEVEL = 5;
export const TOOLBAR_TABS_COMPACT_LEVEL = 6;

export type ToolbarCompactLevel = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export interface UseToolbarCompactModeOptions {
  enabled: boolean;
  hasSearch: boolean;
  hasRefresh: boolean;
  hasCompactibleTabs: boolean;
  remeasureKey?: unknown;
  toolbarRef: RefObject<HTMLElement | null>;
  leftSlotRef: RefObject<HTMLElement | null>;
  leftSlotFullMeasureRef?: RefObject<HTMLElement | null>;
  leftSlotCompactMeasureRef?: RefObject<HTMLElement | null>;
  rightPinnedRef: RefObject<HTMLElement | null>;
  searchFullMeasureRef: RefObject<HTMLElement | null>;
  refreshFullMeasureRef: RefObject<HTMLElement | null>;
}

export interface UseToolbarCompactModeResult {
  compactLevel: ToolbarCompactLevel;
}

function sumSegmentWidths(widths: number[]): number {
  const activeWidths = widths.filter((width) => width > 0);
  if (activeWidths.length === 0) return 0;
  return activeWidths.reduce((total, width) => total + width, 0) + (activeWidths.length - 1) * TOOLBAR_GAP;
}

function resolveSearchWidth(
  level: ToolbarCompactLevel,
  hasSearch: boolean,
  searchFullWidth: number
): number {
  if (!hasSearch) return 0;
  if (level >= TOOLBAR_SEARCH_ICON_COMPACT_LEVEL) return SEARCH_ICON_WIDTH;
  if (level >= 3) return SEARCH_SHRINK_WIDTHS[2];
  if (level >= 2) return SEARCH_SHRINK_WIDTHS[1];
  if (level >= 1) return SEARCH_SHRINK_WIDTHS[0];
  return Math.min(searchFullWidth, SEARCH_FULL_MAX_WIDTH);
}

function resolveRefreshWidth(
  level: ToolbarCompactLevel,
  hasRefresh: boolean,
  refreshFullWidth: number
): number {
  if (!hasRefresh) return 0;
  if (level >= TOOLBAR_REFRESH_ICON_COMPACT_LEVEL) return REFRESH_ICON_WIDTH;
  return refreshFullWidth;
}

function resolveLeftSlotWidth(
  level: ToolbarCompactLevel,
  hasCompactibleTabs: boolean,
  leftSlotRef: RefObject<HTMLElement | null>,
  leftSlotFullMeasureRef?: RefObject<HTMLElement | null>,
  leftSlotCompactMeasureRef?: RefObject<HTMLElement | null>
): number {
  if (!hasCompactibleTabs || level < TOOLBAR_TABS_COMPACT_LEVEL) {
    return leftSlotFullMeasureRef?.current?.offsetWidth ?? leftSlotRef.current?.offsetWidth ?? 0;
  }

  return leftSlotCompactMeasureRef?.current?.offsetWidth
    ?? leftSlotFullMeasureRef?.current?.offsetWidth
    ?? leftSlotRef.current?.offsetWidth
    ?? 0;
}

function resolveMaxCompactLevel(
  hasSearch: boolean,
  hasRefresh: boolean,
  hasCompactibleTabs: boolean
): ToolbarCompactLevel {
  if (hasCompactibleTabs) return TOOLBAR_TABS_COMPACT_LEVEL;
  if (hasRefresh) return TOOLBAR_REFRESH_ICON_COMPACT_LEVEL;
  if (hasSearch) return TOOLBAR_SEARCH_ICON_COMPACT_LEVEL;
  return 0;
}

export function getToolbarSearchMaxWidthClass(level: ToolbarCompactLevel): string {
  if (level >= 3) return 'sm:max-w-[140px]';
  if (level >= 2) return 'sm:max-w-[200px]';
  if (level >= 1) return 'sm:max-w-[260px]';
  return 'sm:max-w-xs';
}

export function isToolbarSearchIconMode(level: ToolbarCompactLevel): boolean {
  return level >= TOOLBAR_SEARCH_ICON_COMPACT_LEVEL;
}

export function isToolbarRefreshIconMode(level: ToolbarCompactLevel): boolean {
  return level >= TOOLBAR_REFRESH_ICON_COMPACT_LEVEL;
}

export function isToolbarTabsCompactMode(level: ToolbarCompactLevel): boolean {
  return level >= TOOLBAR_TABS_COMPACT_LEVEL;
}

export function useToolbarCompactMode({
  enabled,
  hasSearch,
  hasRefresh,
  hasCompactibleTabs,
  remeasureKey,
  toolbarRef,
  leftSlotRef,
  leftSlotFullMeasureRef,
  leftSlotCompactMeasureRef,
  rightPinnedRef,
  searchFullMeasureRef,
  refreshFullMeasureRef,
}: UseToolbarCompactModeOptions): UseToolbarCompactModeResult {
  const [compactLevel, setCompactLevel] = useState<ToolbarCompactLevel>(0);

  useLayoutEffect(() => {
    const toolbar = toolbarRef.current;
    const rightPinned = rightPinnedRef.current;
    if (!toolbar || !rightPinned) return;

    const compute = (): void => {
      const mobile = window.matchMedia(`(max-width: ${MOBILE_MAX_WIDTH}px)`).matches;

      if (mobile) {
        setCompactLevel(0);
        return;
      }

      if (!enabled) {
        setCompactLevel(0);
        return;
      }

      const toolbarWidth = toolbar.clientWidth;
      const searchFullWidth = searchFullMeasureRef.current?.offsetWidth ?? 0;
      const refreshFullWidth = refreshFullMeasureRef.current?.offsetWidth ?? 0;
      const maxLevel = resolveMaxCompactLevel(hasSearch, hasRefresh, hasCompactibleTabs);
      const rightWidth = rightPinned.offsetWidth;

      const requiredWidth = (level: ToolbarCompactLevel): number => {
        const searchWidth = resolveSearchWidth(level, hasSearch, searchFullWidth);
        const refreshWidth = resolveRefreshWidth(level, hasRefresh, refreshFullWidth);
        const leftSlotWidth = resolveLeftSlotWidth(
          level,
          hasCompactibleTabs,
          leftSlotRef,
          leftSlotFullMeasureRef,
          leftSlotCompactMeasureRef
        );
        const leftPinnedWidth = sumSegmentWidths([refreshWidth, leftSlotWidth]);
        return sumSegmentWidths([searchWidth, leftPinnedWidth, rightWidth]);
      };

      const resolveNextLevel = (current: ToolbarCompactLevel): ToolbarCompactLevel => {
        for (let level = 0; level <= maxLevel; level += 1) {
          const targetLevel = level as ToolbarCompactLevel;
          const expandGuard = current > targetLevel ? EXPAND_HYSTERESIS : 0;
          if (requiredWidth(targetLevel) + expandGuard <= toolbarWidth) {
            return targetLevel;
          }
        }

        return maxLevel;
      };

      setCompactLevel((current) => resolveNextLevel(current));
    };

    compute();

    const resizeObserver = new ResizeObserver(() => {
      compute();
    });

    const observedElements = [
      toolbar,
      rightPinned,
      leftSlotRef.current,
      leftSlotFullMeasureRef?.current,
      leftSlotCompactMeasureRef?.current,
      searchFullMeasureRef.current,
      refreshFullMeasureRef.current,
    ].filter((element): element is HTMLElement => element instanceof HTMLElement);

    observedElements.forEach((element) => {
      resizeObserver.observe(element);
    });

    const mediaQuery = window.matchMedia(`(max-width: ${MOBILE_MAX_WIDTH}px)`);
    const onMediaChange = (): void => {
      compute();
    };
    mediaQuery.addEventListener('change', onMediaChange);

    return () => {
      resizeObserver.disconnect();
      mediaQuery.removeEventListener('change', onMediaChange);
    };
  }, [
    enabled,
    hasCompactibleTabs,
    hasRefresh,
    hasSearch,
    leftSlotCompactMeasureRef,
    leftSlotFullMeasureRef,
    leftSlotRef,
    refreshFullMeasureRef,
    remeasureKey,
    rightPinnedRef,
    searchFullMeasureRef,
    toolbarRef,
  ]);

  return {
    compactLevel,
  };
}

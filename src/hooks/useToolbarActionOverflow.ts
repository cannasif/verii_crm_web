import { useLayoutEffect, useRef, useState, type RefObject } from 'react';

const MOBILE_MAX_WIDTH = 639;
const OVERFLOW_BUTTON_WIDTH = 36;
const ACTION_GAP = 8;
const TOOLBAR_GAP = 8;
const OVERFLOW_COLLAPSE_BUFFER = 12;
const OVERFLOW_TOOLBAR_EXPAND_HYSTERESIS = 48;

export type ToolbarOverflowMode = 'all-inline' | 'core-in-menu' | 'all-in-menu';

export interface ToolbarOverflowStableWidthContext {
  toolbarRef: RefObject<HTMLElement | null>;
  searchFullMeasureRef: RefObject<HTMLElement | null>;
  refreshFullMeasureRef: RefObject<HTMLElement | null>;
  leftSlotRef: RefObject<HTMLElement | null>;
  leftSlotFullMeasureRef?: RefObject<HTMLElement | null>;
  hasSearch: boolean;
  hasRefresh: boolean;
  useFullLeftSlotMeasure: boolean;
}

export interface ToolbarOverflowLayoutRefs {
  toolbarRef: RefObject<HTMLElement | null>;
  leftPinnedMiddleRef: RefObject<HTMLElement | null>;
}

export interface UseToolbarActionOverflowResult {
  containerRef: RefObject<HTMLDivElement | null>;
  measureRef: RefObject<HTMLDivElement | null>;
  overflowMode: ToolbarOverflowMode;
  isMobile: boolean;
  hasDesktopOverflow: boolean;
}

function sumSegmentWidths(widths: number[]): number {
  const activeWidths = widths.filter((width) => width > 0);
  if (activeWidths.length === 0) return 0;
  return activeWidths.reduce((total, width) => total + width, 0) + (activeWidths.length - 1) * TOOLBAR_GAP;
}

function computeRightSectionAvailable(
  context: ToolbarOverflowStableWidthContext,
  layoutRefs: ToolbarOverflowLayoutRefs
): number | null {
  const toolbar = context.toolbarRef.current;
  const leftPinnedMiddle = layoutRefs.leftPinnedMiddleRef.current;
  if (!toolbar || !leftPinnedMiddle) return null;

  const toolbarRect = toolbar.getBoundingClientRect();
  const middleRect = leftPinnedMiddle.getBoundingClientRect();
  const layoutAvailable = Math.max(0, toolbarRect.right - middleRect.right - TOOLBAR_GAP);

  const toolbarWidth = toolbar.clientWidth;
  const searchWidth = context.hasSearch ? (context.searchFullMeasureRef.current?.offsetWidth ?? 0) : 0;
  const refreshWidth = context.hasRefresh ? (context.refreshFullMeasureRef.current?.offsetWidth ?? 0) : 0;
  const leftSlotWidth = context.useFullLeftSlotMeasure
    ? (context.leftSlotFullMeasureRef?.current?.offsetWidth
      ?? context.leftSlotRef.current?.offsetWidth
      ?? 0)
    : (context.leftSlotRef.current?.offsetWidth ?? 0);

  const leadingParts: number[] = [];
  if (searchWidth > 0) leadingParts.push(searchWidth);
  if (refreshWidth > 0) leadingParts.push(refreshWidth);
  if (leftSlotWidth > 0) leadingParts.push(leftSlotWidth);

  const stableAvailable = leadingParts.length === 0
    ? toolbarWidth
    : Math.max(0, toolbarWidth - sumSegmentWidths(leadingParts) - TOOLBAR_GAP);

  return Math.min(layoutAvailable, stableAvailable);
}

function computeCoreInMenuWidth(additionalWidth: number, hasAdditionalActions: boolean): number {
  if (!hasAdditionalActions) return OVERFLOW_BUTTON_WIDTH;
  return additionalWidth + ACTION_GAP + OVERFLOW_BUTTON_WIDTH;
}

function collapseToMenuMode(
  additionalWidth: number,
  hasAdditionalActions: boolean,
  rightSectionAvailable: number
): ToolbarOverflowMode {
  const coreInMenuWidth = computeCoreInMenuWidth(additionalWidth, hasAdditionalActions);
  if (coreInMenuWidth + OVERFLOW_COLLAPSE_BUFFER <= rightSectionAvailable) {
    return 'core-in-menu';
  }

  return 'all-in-menu';
}

export function useToolbarActionOverflow(
  hasAdditionalActions: boolean,
  remeasureKey: unknown | undefined,
  stableWidthContext: ToolbarOverflowStableWidthContext | undefined,
  layoutRefs: ToolbarOverflowLayoutRefs | undefined,
  containerRef: RefObject<HTMLDivElement | null>,
  measureRef: RefObject<HTMLDivElement | null>
): UseToolbarActionOverflowResult {
  const [overflowMode, setOverflowMode] = useState<ToolbarOverflowMode>('all-inline');
  const [isMobile, setIsMobile] = useState(false);
  const collapsedAtToolbarWidthRef = useRef<number | null>(null);

  useLayoutEffect(() => {
    const container = containerRef.current;
    const measureRow = measureRef.current;
    if (!container || !measureRow) return;

    const compute = (): void => {
      const mobile = window.matchMedia(`(max-width: ${MOBILE_MAX_WIDTH}px)`).matches;
      setIsMobile(mobile);

      if (mobile) {
        collapsedAtToolbarWidthRef.current = null;
        setOverflowMode('all-in-menu');
        return;
      }

      if (!stableWidthContext || !layoutRefs) {
        return;
      }

      const toolbar = stableWidthContext.toolbarRef.current;
      if (!toolbar) return;

      const childElements = Array.from(measureRow.children) as HTMLElement[];
      const additionalElement = hasAdditionalActions ? childElements[0] : null;
      const coreElement = childElements[hasAdditionalActions ? 1 : 0];
      const coreWidth = coreElement?.offsetWidth ?? 0;
      const additionalWidth = additionalElement?.offsetWidth ?? 0;

      const rightSectionAvailable = computeRightSectionAvailable(stableWidthContext, layoutRefs);
      if (rightSectionAvailable == null || rightSectionAvailable <= 0 || coreWidth <= 0) {
        setOverflowMode('all-inline');
        return;
      }

      const allInlineWidth = hasAdditionalActions
        ? additionalWidth + ACTION_GAP + coreWidth
        : coreWidth;
      const coreInMenuWidth = computeCoreInMenuWidth(additionalWidth, hasAdditionalActions);

      const toolbarWidth = toolbar.clientWidth;

      setOverflowMode((current) => {
        if (current !== 'all-inline') {
          const collapsedAt = collapsedAtToolbarWidthRef.current;
          const toolbarGrewEnough = collapsedAt == null
            || toolbarWidth >= collapsedAt + OVERFLOW_TOOLBAR_EXPAND_HYSTERESIS;
          const inlineFits = allInlineWidth + OVERFLOW_COLLAPSE_BUFFER <= rightSectionAvailable;

          if (toolbarGrewEnough && inlineFits) {
            collapsedAtToolbarWidthRef.current = null;
            return 'all-inline';
          }

          if (current === 'core-in-menu' && coreInMenuWidth + OVERFLOW_COLLAPSE_BUFFER > rightSectionAvailable) {
            collapsedAtToolbarWidthRef.current = toolbarWidth;
            return 'all-in-menu';
          }

          if (current === 'all-in-menu' && coreInMenuWidth + OVERFLOW_COLLAPSE_BUFFER <= rightSectionAvailable) {
            return 'core-in-menu';
          }

          return current;
        }

        const shouldCollapse = allInlineWidth + OVERFLOW_COLLAPSE_BUFFER > rightSectionAvailable;
        if (shouldCollapse) {
          collapsedAtToolbarWidthRef.current = toolbarWidth;
          return collapseToMenuMode(additionalWidth, hasAdditionalActions, rightSectionAvailable);
        }

        collapsedAtToolbarWidthRef.current = null;
        return 'all-inline';
      });
    };

    compute();

    const resizeObserver = new ResizeObserver(() => {
      compute();
    });
    resizeObserver.observe(container);
    resizeObserver.observe(measureRow);

    const observedElements = [
      stableWidthContext?.toolbarRef.current,
      stableWidthContext?.searchFullMeasureRef.current,
      stableWidthContext?.refreshFullMeasureRef.current,
      stableWidthContext?.leftSlotRef.current,
      stableWidthContext?.leftSlotFullMeasureRef?.current,
      layoutRefs?.toolbarRef.current,
      layoutRefs?.leftPinnedMiddleRef.current,
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
  }, [containerRef, hasAdditionalActions, layoutRefs, measureRef, remeasureKey, stableWidthContext]);

  const hasDesktopOverflow = !isMobile && overflowMode !== 'all-inline';

  return {
    containerRef,
    measureRef,
    overflowMode,
    isMobile,
    hasDesktopOverflow,
  };
}

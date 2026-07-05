import { useLayoutEffect, useRef, useState, type RefObject } from 'react';

const AI_ICON_SLOT_WIDTH = 44;
const TOOLBAR_ROW_GAP = 8;
const COLLAPSE_BUFFER = 8;
const EXPAND_HYSTERESIS = 32;

export interface UseAiAssistantComposerToolbarOverflowResult {
  toolbarRowRef: RefObject<HTMLDivElement | null>;
  toolbarMeasureRef: RefObject<HTMLDivElement | null>;
  isCollapsedToMenu: boolean;
}

export function useAiAssistantComposerToolbarOverflow(): UseAiAssistantComposerToolbarOverflowResult {
  const toolbarRowRef = useRef<HTMLDivElement | null>(null);
  const toolbarMeasureRef = useRef<HTMLDivElement | null>(null);
  const [isCollapsedToMenu, setIsCollapsedToMenu] = useState(false);

  useLayoutEffect(() => {
    const row = toolbarRowRef.current;
    const measure = toolbarMeasureRef.current;
    if (!row || !measure) {
      return;
    }

    const evaluate = (): void => {
      const availableWidth = row.clientWidth - AI_ICON_SLOT_WIDTH - TOOLBAR_ROW_GAP;
      const neededWidth = measure.scrollWidth;

      setIsCollapsedToMenu((current) => {
        if (current) {
          return neededWidth > availableWidth - EXPAND_HYSTERESIS;
        }

        return neededWidth > availableWidth - COLLAPSE_BUFFER;
      });
    };

    evaluate();

    const observer = new ResizeObserver(evaluate);
    observer.observe(row);
    observer.observe(measure);

    return () => {
      observer.disconnect();
    };
  }, []);

  return {
    toolbarRowRef,
    toolbarMeasureRef,
    isCollapsedToMenu,
  };
}

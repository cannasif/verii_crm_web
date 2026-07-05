import { useCallback, useEffect, useState } from 'react';
import {
  readWidgetContentBounds,
  type WidgetContentBounds,
} from '../lib/ai-assistant-widget-placement';

export function useAiAssistantWidgetBounds(): WidgetContentBounds {
  const [bounds, setBounds] = useState<WidgetContentBounds>(() => readWidgetContentBounds());

  const refreshBounds = useCallback((): void => {
    setBounds(readWidgetContentBounds());
  }, []);

  useEffect(() => {
    refreshBounds();

    const sidebarElement = document.querySelector('.app-sidebar-panel');
    const resizeObserver =
      typeof ResizeObserver !== 'undefined' && sidebarElement
        ? new ResizeObserver(() => {
            refreshBounds();
          })
        : null;

    resizeObserver?.observe(sidebarElement as Element);

    const mutationObserver =
      sidebarElement && typeof MutationObserver !== 'undefined'
        ? new MutationObserver(() => {
            refreshBounds();
          })
        : null;

    if (sidebarElement) {
      mutationObserver?.observe(sidebarElement, {
        attributes: true,
        attributeFilter: ['data-sidebar-open', 'class'],
      });
    }

    window.addEventListener('resize', refreshBounds);

    return () => {
      resizeObserver?.disconnect();
      mutationObserver?.disconnect();
      window.removeEventListener('resize', refreshBounds);
    };
  }, [refreshBounds]);

  return bounds;
}

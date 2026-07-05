import { type RefObject, useLayoutEffect } from 'react';
import { applyAiAssistantMessagesViewportClip } from '../lib/ai-assistant-messages-viewport-clip';

export function useAiAssistantMessagesViewportClip(
  messagesClipRef: RefObject<HTMLDivElement | null>,
  composerRef: RefObject<HTMLDivElement | null>,
  recalculateToken: string,
): void {
  useLayoutEffect(() => {
    const messagesElement = messagesClipRef.current;
    const composerElement = composerRef.current;
    if (!messagesElement || !composerElement) {
      return;
    }

    const updateMessagesViewportClip = (): void => {
      applyAiAssistantMessagesViewportClip(messagesElement, composerElement);
    };

    updateMessagesViewportClip();

    const mainElement = document.querySelector('main');
    mainElement?.addEventListener('scroll', updateMessagesViewportClip, { passive: true });
    window.addEventListener('resize', updateMessagesViewportClip);

    const resizeObserver = new ResizeObserver(updateMessagesViewportClip);
    resizeObserver.observe(composerElement);
    resizeObserver.observe(messagesElement);

    return () => {
      mainElement?.removeEventListener('scroll', updateMessagesViewportClip);
      window.removeEventListener('resize', updateMessagesViewportClip);
      resizeObserver.disconnect();
      messagesElement.style.removeProperty('clip-path');
    };
  }, [composerRef, messagesClipRef, recalculateToken]);
}

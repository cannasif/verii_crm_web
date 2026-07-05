import { type RefObject, useEffect, useLayoutEffect, useState } from 'react';
import { calculateAiAssistantChatPageScrollReserve } from '../lib/ai-assistant-chat-page-boundary';

export function useAiAssistantChatPageBoundary(
  composerRef: RefObject<HTMLDivElement | null>,
  inputBoxRef: RefObject<HTMLDivElement | null>,
  recalculateToken: string,
): number {
  const [chatPageScrollReserve, setChatPageScrollReserve] = useState(180);

  useLayoutEffect(() => {
    const composerElement = composerRef.current;
    if (!composerElement) {
      return;
    }

    const updateChatPageScrollReserve = (): void => {
      const composerHeight = composerElement.offsetHeight;
      const inputHeight = inputBoxRef.current?.offsetHeight ?? 88;

      setChatPageScrollReserve(
        calculateAiAssistantChatPageScrollReserve(composerHeight, inputHeight),
      );
    };

    updateChatPageScrollReserve();

    window.addEventListener('resize', updateChatPageScrollReserve);

    const resizeObserver = new ResizeObserver(updateChatPageScrollReserve);
    resizeObserver.observe(composerElement);
    if (inputBoxRef.current) {
      resizeObserver.observe(inputBoxRef.current);
    }

    return () => {
      window.removeEventListener('resize', updateChatPageScrollReserve);
      resizeObserver.disconnect();
    };
  }, [composerRef, inputBoxRef, recalculateToken]);

  useEffect(() => {
    const mainElement = document.querySelector('main');
    if (!mainElement) {
      return;
    }

    const previousScrollPaddingBottom = mainElement.style.scrollPaddingBottom;
    mainElement.style.scrollPaddingBottom = `${chatPageScrollReserve}px`;

    return () => {
      mainElement.style.scrollPaddingBottom = previousScrollPaddingBottom;
    };
  }, [chatPageScrollReserve]);

  return chatPageScrollReserve;
}

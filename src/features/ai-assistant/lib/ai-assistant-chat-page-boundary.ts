export const AI_ASSISTANT_CHAT_SCROLL_INPUT_VISIBLE_RATIO = 0.5;

export const AI_ASSISTANT_CHAT_PAGE_SCROLL_MIN_RESERVE_PX = 96;

export function calculateAiAssistantChatPageScrollReserve(
  composerHeight: number,
  inputHeight: number,
): number {
  const hiddenInputPortion = inputHeight * AI_ASSISTANT_CHAT_SCROLL_INPUT_VISIBLE_RATIO;

  return Math.max(
    composerHeight - hiddenInputPortion,
    AI_ASSISTANT_CHAT_PAGE_SCROLL_MIN_RESERVE_PX,
  );
}

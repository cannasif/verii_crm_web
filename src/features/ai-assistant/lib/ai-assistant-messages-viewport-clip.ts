export function applyAiAssistantMessagesViewportClip(
  messagesElement: HTMLElement,
  composerElement: HTMLElement,
): void {
  const messagesRect = messagesElement.getBoundingClientRect();
  const composerTop = composerElement.getBoundingClientRect().top;
  const clipBottom = messagesRect.bottom - composerTop;

  if (clipBottom <= 0) {
    messagesElement.style.removeProperty('clip-path');
    return;
  }

  messagesElement.style.clipPath = `inset(0px 0px ${clipBottom}px 0px)`;
}

export type AiAssistantErrorContext = {
  id: string;
  message: string;
  errorCode?: string | null;
  httpStatusCode?: number | null;
  currentPath?: string | null;
  requestMethod?: string | null;
  requestUrl?: string | null;
  capturedAt: string;
};

const AI_ASSISTANT_ERROR_EVENT = 'crm-ai-assistant-error-context';

let latestErrorContext: AiAssistantErrorContext | null = null;

export function getLatestAiAssistantErrorContext(): AiAssistantErrorContext | null {
  return latestErrorContext;
}

export function publishAiAssistantErrorContext(
  context: Omit<AiAssistantErrorContext, 'id' | 'capturedAt'>
): AiAssistantErrorContext {
  const nextContext: AiAssistantErrorContext = {
    ...context,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    capturedAt: new Date().toISOString(),
  };

  latestErrorContext = nextContext;
  window.dispatchEvent(new CustomEvent(AI_ASSISTANT_ERROR_EVENT, { detail: nextContext }));

  return nextContext;
}

export function subscribeAiAssistantErrorContext(
  listener: (context: AiAssistantErrorContext) => void
): () => void {
  const handleErrorContext = (event: Event): void => {
    const customEvent = event as CustomEvent<AiAssistantErrorContext>;
    if (customEvent.detail) {
      listener(customEvent.detail);
    }
  };

  window.addEventListener(AI_ASSISTANT_ERROR_EVENT, handleErrorContext);
  return () => window.removeEventListener(AI_ASSISTANT_ERROR_EVENT, handleErrorContext);
}

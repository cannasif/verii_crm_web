import type { AiAssistantActionItemDto, AiAssistantSourceDto } from '../types/ai-assistant.types';

export type AiAssistantChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
  actionItems?: AiAssistantActionItemDto[];
  sources?: AiAssistantSourceDto[];
};

type AiAssistantChatUser = {
  id?: number;
  email?: string | null;
};

const chatHistoryPrefix = 'crm-ai-assistant-chat';
const chatHistoryLimit = 60;

export function createAiAssistantChatHistoryKey(user?: AiAssistantChatUser | null): string {
  const userKey = user?.id ? `user-${user.id}` : user?.email?.trim().toLowerCase() || 'anonymous';
  return `${chatHistoryPrefix}:${userKey}`;
}

export function readAiAssistantChatHistory(key: string): AiAssistantChatMessage[] {
  if (typeof window === 'undefined') return [];

  try {
    const rawValue = window.localStorage.getItem(key);
    if (!rawValue) return [];

    const parsedValue = JSON.parse(rawValue);
    if (!Array.isArray(parsedValue)) return [];

    return parsedValue
      .filter((message): message is AiAssistantChatMessage => {
        return Boolean(
          message &&
            typeof message.id === 'string' &&
            (message.role === 'user' || message.role === 'assistant') &&
            typeof message.content === 'string'
        );
      })
      .slice(-chatHistoryLimit);
  } catch {
    return [];
  }
}

export function writeAiAssistantChatHistory(key: string, messages: AiAssistantChatMessage[]): void {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.setItem(key, JSON.stringify(messages.slice(-chatHistoryLimit)));
  } catch {
    // Chat history is a UX helper; storage failures should never break CRM usage.
  }
}

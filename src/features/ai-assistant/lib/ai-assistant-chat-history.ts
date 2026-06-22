import type { AiAssistantActionItemDto, AiAssistantSourceDto } from '../types/ai-assistant.types';

export type AiAssistantChatAttachment = {
  fileName: string;
  contentType: string;
  size: number;
};

export type AiAssistantChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
  attachments?: AiAssistantChatAttachment[];
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
      .map((message) => ({
        ...message,
        attachments: Array.isArray(message.attachments)
          ? message.attachments
              .filter((attachment): attachment is AiAssistantChatAttachment =>
                Boolean(
                  attachment &&
                    typeof attachment.fileName === 'string' &&
                    typeof attachment.contentType === 'string' &&
                    typeof attachment.size === 'number'
                )
              )
              .map((attachment) => ({
                fileName: attachment.fileName,
                contentType: attachment.contentType,
                size: attachment.size,
              }))
          : undefined,
      }))
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

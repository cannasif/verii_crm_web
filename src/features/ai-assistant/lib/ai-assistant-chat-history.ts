import type {
  AiAssistantActionItemDto,
  AiAssistantResponseContextDto,
  AiAssistantSourceDto,
  AiAssistantToolActionDto,
} from '../types/ai-assistant.types';

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
  toolActions?: AiAssistantToolActionDto[];
  sources?: AiAssistantSourceDto[];
  context?: AiAssistantResponseContextDto | null;
  intent?: string;
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
        intent: typeof message.intent === 'string' ? message.intent : undefined,
        context: isAiAssistantResponseContext(message.context) ? message.context : undefined,
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

function isAiAssistantResponseContext(value: unknown): value is AiAssistantResponseContextDto {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const context = value as Partial<AiAssistantResponseContextDto>;
  return typeof context.hasPageFilters === 'boolean'
    && typeof context.hasErrorContext === 'boolean'
    && typeof context.attachmentCount === 'number';
}

export function writeAiAssistantChatHistory(key: string, messages: AiAssistantChatMessage[]): void {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.setItem(key, JSON.stringify(messages.slice(-chatHistoryLimit)));
  } catch {
    // Chat history is a UX helper; storage failures should never break CRM usage.
  }
}

export function createAiAssistantActionItemsFromToolActions(
  toolActions?: AiAssistantToolActionDto[] | null
): AiAssistantActionItemDto[] {
  if (!toolActions?.length) return [];

  return toolActions.map((action) => ({
    toolActionId: action.id,
    toolName: action.toolName,
    title: action.title,
    description: action.description ?? '',
    severity: ['Executed', 'DraftCreated', 'Navigated'].includes(action.status) ? 'success' : 'info',
    actionLabel: action.actionLabel,
    actionUrl: action.actionUrl,
    confirmationRequired: action.confirmationRequired,
  }));
}

export function createAiAssistantChatMessagesFromServer(
  messages: Array<{
    id: number;
    role: string;
    content: string;
    createdDate: string;
    intent?: string | null;
    context?: AiAssistantResponseContextDto | null;
    toolActions?: AiAssistantToolActionDto[] | null;
  }>
): AiAssistantChatMessage[] {
  return messages
    .filter((message) => message.role === 'user' || message.role === 'assistant')
    .map((message) => ({
      id: `server-${message.id}`,
      role: message.role as 'user' | 'assistant',
      content: message.content,
      createdAt: message.createdDate,
      intent: message.intent ?? undefined,
      context: isAiAssistantResponseContext(message.context) ? message.context : undefined,
      toolActions: message.toolActions ?? undefined,
      actionItems: createAiAssistantActionItemsFromToolActions(message.toolActions),
    }))
    .slice(-chatHistoryLimit);
}

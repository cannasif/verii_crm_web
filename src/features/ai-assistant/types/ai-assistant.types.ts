export interface AiAssistantGreetingDto {
  userId: number;
  firstName: string;
  lastName: string;
  fullName: string;
}

export interface AiAssistantDocumentMetricDto {
  totalCount: number;
  draftCount: number;
  waitingCount: number;
  approvedCount: number;
  rejectedCount: number;
  customerCancelledCount: number;
  erpIntegratedCount: number;
  totalAmount: number;
  grandTotalAmount: number;
  approvalSuccessRate: number;
  erpIntegrationRate: number;
}

export interface AiAssistantActivityMetricDto {
  totalCount: number;
  scheduledCount: number;
  completedCount: number;
  cancelledCount: number;
  completionRate: number;
}

export interface AiAssistantSummaryDto {
  startDate: string | null;
  endDate: string | null;
  demands: AiAssistantDocumentMetricDto;
  quotations: AiAssistantDocumentMetricDto;
  orders: AiAssistantDocumentMetricDto;
  activities: AiAssistantActivityMetricDto;
  suggestedQuestions: string[];
}

export interface AiAssistantAskRequestDto {
  sessionKey?: string | null;
  question: string;
  startDate?: string | null;
  endDate?: string | null;
  currentPath?: string | null;
  routeTitle?: string | null;
  entityType?: string | null;
  entityId?: number | null;
  customerId?: number | null;
  pageFiltersJson?: string | null;
  errorMessage?: string | null;
  errorCode?: string | null;
  httpStatusCode?: number | null;
  preferredLanguage?: AiAssistantLanguagePreference | null;
  attachments?: AiAssistantAttachmentDto[];
}

export type AiAssistantLanguagePreference = 'auto' | 'tr' | 'en';

export interface AiAssistantAttachmentDto {
  fileName: string;
  contentType: string;
  size: number;
  base64Content?: string | null;
}

export interface AiAssistantActionItemDto {
  toolActionId?: number | null;
  toolName?: string | null;
  title: string;
  description: string;
  severity: 'danger' | 'warning' | 'success' | 'info' | string;
  actionLabel?: string | null;
  actionUrl?: string | null;
  confirmationRequired?: boolean;
  autoOpen?: boolean;
}

export interface AiAssistantToolActionDto {
  id: number;
  toolName: string;
  title: string;
  description?: string | null;
  status: string;
  actionLabel?: string | null;
  actionUrl?: string | null;
  confirmationRequired: boolean;
}

export interface AiAssistantSourceDto {
  label: string;
  description: string;
  module?: string | null;
  period?: string | null;
}

export interface AiAssistantResponseContextDto {
  currentPath?: string | null;
  routeTitle?: string | null;
  module?: string | null;
  entityType?: string | null;
  entityId?: number | null;
  customerId?: number | null;
  hasPageFilters: boolean;
  hasErrorContext: boolean;
  attachmentCount: number;
}

export interface AiAssistantAnswerDto {
  sessionId?: number | null;
  sessionKey?: string | null;
  question: string;
  intent: string;
  responseLanguage?: 'tr' | 'en' | string;
  answer: string;
  context?: AiAssistantResponseContextDto | null;
  summary: AiAssistantSummaryDto | null;
  actionItems: AiAssistantActionItemDto[];
  toolActions?: AiAssistantToolActionDto[];
  sources: AiAssistantSourceDto[];
  suggestedQuestions: string[];
}

export interface AiAssistantActionConfirmationDto {
  actionId: number;
  toolName: string;
  status: string;
  actionUrl?: string | null;
  referenceNo?: string | null;
  resultMessage?: string | null;
  payloadJson?: string | null;
  confirmedAt?: string | null;
  executedAt?: string | null;
}

export interface AiAssistantConversationMessageDto {
  id: number;
  role: 'user' | 'assistant' | string;
  content: string;
  intent?: string | null;
  context?: AiAssistantResponseContextDto | null;
  createdDate: string;
  latencyMs?: number | null;
  toolActions: AiAssistantToolActionDto[];
}

export interface AiAssistantConversationHistoryDto {
  sessionId: number;
  sessionKey: string;
  status: string;
  currentPath?: string | null;
  routeTitle?: string | null;
  entityType?: string | null;
  entityId?: number | null;
  customerId?: number | null;
  lastIntent?: string | null;
  lastMessageAt: string;
  messages: AiAssistantConversationMessageDto[];
}

export interface AiAssistantIntentMetricDto {
  intent: string;
  count: number;
}

export interface AiAssistantRecentFailureDto {
  sessionId: number;
  sessionKey: string;
  currentPath?: string | null;
  routeTitle?: string | null;
  lastIntent?: string | null;
  lastMessageAt: string;
}

export interface AiAssistantAnalyticsDto {
  startDate: string;
  endDate: string;
  totalSessions: number;
  completedSessions: number;
  failedSessions: number;
  abandonedSessions: number;
  totalMessages: number;
  userMessages: number;
  assistantMessages: number;
  averageLatencyMs: number;
  proposedToolActions: number;
  confirmedToolActions: number;
  executedToolActions: number;
  toolConfirmationRate: number;
  topIntents: AiAssistantIntentMetricDto[];
  failedIntents: AiAssistantIntentMetricDto[];
  recentFailures: AiAssistantRecentFailureDto[];
}

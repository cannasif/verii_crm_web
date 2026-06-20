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
  question: string;
  startDate?: string | null;
  endDate?: string | null;
  currentPath?: string | null;
  errorMessage?: string | null;
  errorCode?: string | null;
  httpStatusCode?: number | null;
}

export interface AiAssistantAnswerDto {
  question: string;
  intent: string;
  answer: string;
  summary: AiAssistantSummaryDto | null;
  suggestedQuestions: string[];
}

import type { ApiResponse, PagedResponse } from '@/types/api';

export interface OutlookStatusDto {
  isConnected: boolean;
  isOAuthConfigured: boolean;
  outlookEmail?: string | null;
  scopes?: string | null;
  expiresAt?: string | null;
}

export interface OutlookAuthorizeUrlDto {
  url: string;
}

export interface OutlookIntegrationLogDto {
  id: number;
  userId: number;
  operation: string;
  isSuccess: boolean;
  severity?: string | null;
  provider: string;
  message?: string | null;
  errorCode?: string | null;
  activityId?: string | null;
  providerEventId?: string | null;
  createdDate: string;
}

export interface SendOutlookMailDto {
  customerId: number;
  contactId?: number;
  to?: string;
  cc?: string;
  bcc?: string;
  subject: string;
  body: string;
  isHtml: boolean;
  templateKey?: string;
  templateName?: string;
  templateVersion?: string;
}

export interface OutlookMailSendResultDto {
  logId?: number | null;
  isSuccess: boolean;
  messageId?: string | null;
  conversationId?: string | null;
  sentAt?: string | null;
}

export interface OutlookCustomerMailLogDto {
  id: number;
  customerId: number;
  customerName?: string | null;
  contactId?: number | null;
  contactName?: string | null;
  sentByUserId: number;
  sentByUserName?: string | null;
  provider: string;
  senderEmail?: string | null;
  toEmails: string;
  ccEmails?: string | null;
  bccEmails?: string | null;
  subject: string;
  body?: string | null;
  bodyPreview?: string | null;
  isHtml: boolean;
  templateKey?: string | null;
  templateName?: string | null;
  templateVersion?: string | null;
  isSuccess: boolean;
  errorCode?: string | null;
  errorMessage?: string | null;
  outlookMessageId?: string | null;
  outlookConversationId?: string | null;
  sentAt?: string | null;
  createdDate: string;
}

export type OutlookStatusResponse = ApiResponse<OutlookStatusDto>;
export type OutlookAuthorizeUrlResponse = ApiResponse<OutlookAuthorizeUrlDto>;
export type OutlookIntegrationLogsResponse = ApiResponse<PagedResponse<OutlookIntegrationLogDto>>;
export type OutlookCustomerMailSendResponse = ApiResponse<OutlookMailSendResultDto>;
export type OutlookCustomerMailLogsResponse = ApiResponse<PagedResponse<OutlookCustomerMailLogDto>>;

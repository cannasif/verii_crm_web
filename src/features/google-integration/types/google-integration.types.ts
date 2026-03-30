import type { ApiResponse, PagedResponse } from '@/types/api';

export interface GoogleStatusDto {
  isConnected: boolean;
  isOAuthConfigured: boolean;
  googleEmail?: string | null;
  scopes?: string | null;
  expiresAt?: string | null;
}

export interface GoogleAuthorizeUrlDto {
  url: string;
}

export interface GoogleTestEventDto {
  eventId: string;
}

export interface SendGoogleCustomerMailDto {
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
  moduleKey?: 'activity' | 'demand' | 'quotation' | 'order';
  recordId?: number;
  recordNo?: string;
  revisionNo?: string;
  customerCode?: string;
  totalAmountDisplay?: string;
  validUntil?: string;
  recordOwnerName?: string;
  contextTitle?: string;
  createActivityLog?: boolean;
  attachments?: GoogleCustomerMailAttachmentDto[];
}

export interface GoogleCustomerMailAttachmentDto {
  fileName: string;
  contentType?: string | null;
  base64Content: string;
}

export interface GoogleCustomerMailSendResultDto {
  logId: number;
  isSuccess: boolean;
  googleMessageId?: string | null;
  googleThreadId?: string | null;
  sentAt?: string | null;
  activityId?: number | null;
}

export interface GoogleCustomerMailLogDto {
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
  googleMessageId?: string | null;
  googleThreadId?: string | null;
  sentAt?: string | null;
  createdDate: string;
}

export interface GoogleIntegrationLogDto {
  id: number;
  tenantId: string;
  userId?: number | null;
  operation: string;
  isSuccess: boolean;
  severity: string;
  provider: string;
  message?: string | null;
  errorCode?: string | null;
  activityId?: number | null;
  googleCalendarEventId?: string | null;
  metadataJson?: string | null;
  createdDate: string;
}

export interface TenantGoogleOAuthSettingsDto {
  tenantId: string;
  clientId: string;
  clientSecretMasked: string;
  redirectUri: string;
  scopes: string;
  isEnabled: boolean;
  isConfigured: boolean;
  updatedAt?: string | null;
}

export interface UpdateTenantGoogleOAuthSettingsDto {
  clientId: string;
  clientSecretPlain?: string;
  redirectUri?: string;
  scopes?: string;
  isEnabled: boolean;
}

export type GoogleStatusResponse = ApiResponse<GoogleStatusDto>;
export type GoogleAuthorizeUrlResponse = ApiResponse<GoogleAuthorizeUrlDto>;
export type GoogleTestEventResponse = ApiResponse<GoogleTestEventDto>;
export type TenantGoogleOAuthSettingsResponse = ApiResponse<TenantGoogleOAuthSettingsDto>;
export type GoogleIntegrationLogsResponse = ApiResponse<PagedResponse<GoogleIntegrationLogDto>>;
export type GoogleCustomerMailSendResponse = ApiResponse<GoogleCustomerMailSendResultDto>;
export type GoogleCustomerMailLogsResponse = ApiResponse<PagedResponse<GoogleCustomerMailLogDto>>;

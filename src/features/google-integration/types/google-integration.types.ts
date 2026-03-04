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

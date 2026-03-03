import type { ApiResponse } from '@/types/api';

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

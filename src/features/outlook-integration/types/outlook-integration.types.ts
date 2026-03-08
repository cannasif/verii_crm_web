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

export type OutlookStatusResponse = ApiResponse<OutlookStatusDto>;
export type OutlookAuthorizeUrlResponse = ApiResponse<OutlookAuthorizeUrlDto>;
export type OutlookIntegrationLogsResponse = ApiResponse<PagedResponse<OutlookIntegrationLogDto>>;

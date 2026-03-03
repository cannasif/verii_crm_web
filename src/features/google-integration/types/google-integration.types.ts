import type { ApiResponse } from '@/types/api';

export interface GoogleStatusDto {
  isConnected: boolean;
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

export type GoogleStatusResponse = ApiResponse<GoogleStatusDto>;
export type GoogleAuthorizeUrlResponse = ApiResponse<GoogleAuthorizeUrlDto>;
export type GoogleTestEventResponse = ApiResponse<GoogleTestEventDto>;

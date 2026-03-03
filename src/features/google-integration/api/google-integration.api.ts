import { api } from '@/lib/axios';
import type { ApiResponse } from '@/types/api';
import type {
  GoogleAuthorizeUrlDto,
  GoogleStatusDto,
  TenantGoogleOAuthSettingsDto,
  GoogleTestEventDto,
  UpdateTenantGoogleOAuthSettingsDto,
} from '../types/google-integration.types';

const GOOGLE_INTEGRATION_BASE = '/api/integrations/google';
const GOOGLE_TENANT_ADMIN_BASE = '/api/admin/tenants/google-oauth/settings';

function getErrorMessage(response: ApiResponse<unknown>, fallback: string): string {
  if (response.message?.trim()) return response.message;
  if (response.errors?.length) return response.errors.join(' ');
  return fallback;
}

export const googleIntegrationApi = {
  getStatus: async (): Promise<GoogleStatusDto> => {
    const response = await api.get<ApiResponse<GoogleStatusDto>>(`${GOOGLE_INTEGRATION_BASE}/status`);
    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(getErrorMessage(response, 'Google integration status could not be loaded.'));
  },

  getAuthorizeUrl: async (): Promise<GoogleAuthorizeUrlDto> => {
    const response = await api.get<ApiResponse<GoogleAuthorizeUrlDto>>(`${GOOGLE_INTEGRATION_BASE}/authorize-url`);
    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(getErrorMessage(response, 'Google authorize URL could not be created.'));
  },

  disconnect: async (): Promise<void> => {
    const response = await api.post<ApiResponse<unknown>>(`${GOOGLE_INTEGRATION_BASE}/disconnect`);
    if (!response.success) {
      throw new Error(getErrorMessage(response, 'Google integration could not be disconnected.'));
    }
  },

  createTestEvent: async (): Promise<GoogleTestEventDto> => {
    const response = await api.post<ApiResponse<GoogleTestEventDto>>(`${GOOGLE_INTEGRATION_BASE}/test-event`);
    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(getErrorMessage(response, 'Google test event could not be created.'));
  },

  getTenantOAuthSettings: async (): Promise<TenantGoogleOAuthSettingsDto> => {
    const response = await api.get<ApiResponse<TenantGoogleOAuthSettingsDto>>(GOOGLE_TENANT_ADMIN_BASE);
    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(getErrorMessage(response, 'Google OAuth settings could not be loaded.'));
  },

  updateTenantOAuthSettings: async (
    payload: UpdateTenantGoogleOAuthSettingsDto
  ): Promise<TenantGoogleOAuthSettingsDto> => {
    const response = await api.put<ApiResponse<TenantGoogleOAuthSettingsDto>>(GOOGLE_TENANT_ADMIN_BASE, payload);
    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(getErrorMessage(response, 'Google OAuth settings could not be updated.'));
  },
};

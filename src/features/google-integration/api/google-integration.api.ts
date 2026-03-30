import { api } from '@/lib/axios';
import type { ApiResponse, PagedParams, PagedResponse } from '@/types/api';
import type {
  GoogleAuthorizeUrlDto,
  GoogleStatusDto,
  TenantGoogleOAuthSettingsDto,
  GoogleTestEventDto,
  UpdateTenantGoogleOAuthSettingsDto,
  GoogleIntegrationLogDto,
  GoogleCustomerMailLogDto,
  GoogleCustomerMailSendResultDto,
  SendGoogleCustomerMailDto,
} from '../types/google-integration.types';

const GOOGLE_INTEGRATION_BASE = '/api/integrations/google';
const GOOGLE_TENANT_ADMIN_BASE = '/api/admin/tenants/google-oauth/settings';
const GOOGLE_CUSTOMER_MAIL_BASE = '/api/customer-mail/google';

function getErrorMessage(response: ApiResponse<unknown>, fallback: string): string {
  if (response.message?.trim()) return response.message;
  if (response.exceptionMessage?.trim()) return response.exceptionMessage;
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

  getLogs: async (
    query: Omit<PagedParams, 'filters'> & { filters?: PagedParams['filters'] | Record<string, unknown>; errorsOnly?: boolean } = {}
  ): Promise<PagedResponse<GoogleIntegrationLogDto>> => {
    const queryParams = new URLSearchParams();
    if (query.pageNumber && query.pageNumber > 0) {
      queryParams.set('pageNumber', String(query.pageNumber));
    }
    if (query.pageSize && query.pageSize > 0) {
      queryParams.set('pageSize', String(query.pageSize));
    }
    if (query.errorsOnly) {
      queryParams.set('errorsOnly', 'true');
    }
    if (query.sortBy) {
      queryParams.set('sortBy', query.sortBy);
    }
    if (query.sortDirection) {
      queryParams.set('sortDirection', query.sortDirection);
    }
    if (Array.isArray(query.filters) && query.filters.length > 0) {
      queryParams.set('filters', JSON.stringify(query.filters));
      queryParams.set('filterLogic', query.filterLogic ?? 'and');
    } else if (query.filters && Object.keys(query.filters).length > 0) {
      queryParams.set('filters', JSON.stringify(query.filters));
      queryParams.set('filterLogic', query.filterLogic ?? 'and');
    }

    const suffix = queryParams.toString();
    const endpoint = `${GOOGLE_INTEGRATION_BASE}/logs${suffix ? `?${suffix}` : ''}`;
    const response = await api.get<ApiResponse<PagedResponse<GoogleIntegrationLogDto>>>(endpoint);
    if (response.success && response.data) {
      const pagedData = response.data as PagedResponse<GoogleIntegrationLogDto> & {
        items?: GoogleIntegrationLogDto[];
      };

      if (pagedData.items && !pagedData.data) {
        return {
          ...pagedData,
          data: pagedData.items,
        };
      }

      return pagedData;
    }

    throw new Error(getErrorMessage(response, 'Google integration logs could not be loaded.'));
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

  sendCustomerMail: async (payload: SendGoogleCustomerMailDto): Promise<GoogleCustomerMailSendResultDto> => {
    const response = await api.post<ApiResponse<GoogleCustomerMailSendResultDto>>(
      `${GOOGLE_CUSTOMER_MAIL_BASE}/send`,
      payload
    );

    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(getErrorMessage(response, 'Mail could not be sent via Google.'));
  },

  getCustomerMailLogs: async (
    query: Omit<PagedParams, 'filters'> & {
      filters?: PagedParams['filters'] | Record<string, unknown>;
      customerId?: number;
      errorsOnly?: boolean;
    } = {}
  ): Promise<PagedResponse<GoogleCustomerMailLogDto>> => {
    const queryParams = new URLSearchParams();
    if (query.pageNumber && query.pageNumber > 0) {
      queryParams.set('pageNumber', String(query.pageNumber));
    }
    if (query.pageSize && query.pageSize > 0) {
      queryParams.set('pageSize', String(query.pageSize));
    }
    if (query.customerId && query.customerId > 0) {
      queryParams.set('customerId', String(query.customerId));
    }
    if (query.errorsOnly) {
      queryParams.set('errorsOnly', 'true');
    }
    if (query.sortBy) {
      queryParams.set('sortBy', query.sortBy);
    }
    if (query.sortDirection) {
      queryParams.set('sortDirection', query.sortDirection);
    }
    if (Array.isArray(query.filters) && query.filters.length > 0) {
      queryParams.set('filters', JSON.stringify(query.filters));
      queryParams.set('filterLogic', query.filterLogic ?? 'and');
    } else if (query.filters && Object.keys(query.filters).length > 0) {
      queryParams.set('filters', JSON.stringify(query.filters));
      queryParams.set('filterLogic', query.filterLogic ?? 'and');
    }

    const suffix = queryParams.toString();
    const endpoint = `${GOOGLE_CUSTOMER_MAIL_BASE}/logs${suffix ? `?${suffix}` : ''}`;
    const response = await api.get<ApiResponse<PagedResponse<GoogleCustomerMailLogDto>>>(endpoint);

    if (response.success && response.data) {
      const pagedData = response.data as PagedResponse<GoogleCustomerMailLogDto> & {
        items?: GoogleCustomerMailLogDto[];
      };
      if (pagedData.items && !pagedData.data) {
        return {
          ...pagedData,
          data: pagedData.items,
        };
      }
      return pagedData;
    }

    throw new Error(getErrorMessage(response, 'Customer mail logs could not be loaded.'));
  },
};

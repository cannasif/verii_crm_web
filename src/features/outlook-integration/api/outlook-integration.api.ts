import { api } from '@/lib/axios';
import type { ApiResponse, PagedParams, PagedResponse } from '@/types/api';
import type {
  OutlookAuthorizeUrlDto,
  OutlookCustomerMailLogDto,
  OutlookIntegrationLogDto,
  OutlookMailSendResultDto,
  OutlookStatusDto,
  SendOutlookMailDto,
} from '../types/outlook-integration.types';

const OUTLOOK_INTEGRATION_BASE = '/api/integrations/outlook';
const OUTLOOK_CUSTOMER_MAIL_BASE = '/api/customer-mail/outlook';

function getErrorMessage(response: ApiResponse<unknown>, fallback: string): string {
  if (response.message?.trim()) return response.message;
  if (response.errors?.length) return response.errors.join(' ');
  return fallback;
}

export const outlookIntegrationApi = {
  getStatus: async (): Promise<OutlookStatusDto> => {
    const response = await api.get<ApiResponse<OutlookStatusDto>>(`${OUTLOOK_INTEGRATION_BASE}/status`);
    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(getErrorMessage(response, 'Outlook integration status could not be loaded.'));
  },

  getAuthorizeUrl: async (): Promise<OutlookAuthorizeUrlDto> => {
    const response = await api.get<ApiResponse<OutlookAuthorizeUrlDto>>(`${OUTLOOK_INTEGRATION_BASE}/authorize-url`);
    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(getErrorMessage(response, 'Outlook authorize URL could not be created.'));
  },

  disconnect: async (): Promise<void> => {
    const response = await api.post<ApiResponse<unknown>>(`${OUTLOOK_INTEGRATION_BASE}/disconnect`);
    if (!response.success) {
      throw new Error(getErrorMessage(response, 'Outlook integration could not be disconnected.'));
    }
  },

  getLogs: async (
    query: Omit<PagedParams, 'filters'> & { filters?: PagedParams['filters'] | Record<string, unknown>; errorsOnly?: boolean } = {}
  ): Promise<PagedResponse<OutlookIntegrationLogDto>> => {
    const response = await api.post<ApiResponse<PagedResponse<OutlookIntegrationLogDto>>>(
      `${OUTLOOK_INTEGRATION_BASE}/logs/query`,
      {
        pageNumber: query.pageNumber ?? 1,
        pageSize: query.pageSize ?? 10,
        search: query.search ?? '',
        sortBy: query.sortBy ?? 'Id',
        sortDirection: query.sortDirection ?? 'desc',
        filterLogic: query.filterLogic ?? 'and',
        filters: query.filters ?? [],
        errorsOnly: query.errorsOnly ?? false,
      }
    );
    if (response.success && response.data) {
      const pagedData = response.data as PagedResponse<OutlookIntegrationLogDto> & {
        items?: OutlookIntegrationLogDto[];
      };

      if (pagedData.items && !pagedData.data) {
        return {
          ...pagedData,
          data: pagedData.items,
        };
      }

      return pagedData;
    }

    throw new Error(getErrorMessage(response, 'Outlook integration logs could not be loaded.'));
  },

  sendCustomerMail: async (payload: SendOutlookMailDto): Promise<OutlookMailSendResultDto> => {
    const response = await api.post<ApiResponse<OutlookMailSendResultDto>>(`${OUTLOOK_CUSTOMER_MAIL_BASE}/send`, payload);
    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(getErrorMessage(response, 'Mail could not be sent via Outlook.'));
  },

  getCustomerMailLogs: async (
    query: Omit<PagedParams, 'filters'> & {
      filters?: PagedParams['filters'] | Record<string, unknown>;
      customerId?: number;
      errorsOnly?: boolean;
    } = {}
  ): Promise<PagedResponse<OutlookCustomerMailLogDto>> => {
    const response = await api.post<ApiResponse<PagedResponse<OutlookCustomerMailLogDto>>>(
      `${OUTLOOK_CUSTOMER_MAIL_BASE}/logs/query`,
      {
        pageNumber: query.pageNumber ?? 1,
        pageSize: query.pageSize ?? 10,
        search: query.search ?? '',
        sortBy: query.sortBy ?? 'Id',
        sortDirection: query.sortDirection ?? 'desc',
        filterLogic: query.filterLogic ?? 'and',
        filters: query.filters ?? [],
        customerId: query.customerId ?? undefined,
        errorsOnly: query.errorsOnly ?? false,
      }
    );
    if (response.success && response.data) {
      const pagedData = response.data as PagedResponse<OutlookCustomerMailLogDto> & {
        items?: OutlookCustomerMailLogDto[];
      };

      if (pagedData.items && !pagedData.data) {
        return {
          ...pagedData,
          data: pagedData.items,
        };
      }

      return pagedData;
    }

    throw new Error(getErrorMessage(response, 'Outlook customer mail logs could not be loaded.'));
  },
};

import { api } from '@/lib/axios';
import type { ApiResponse, PagedParams, PagedResponse } from '@/types/api';
import type {
  OutlookAuthorizeUrlDto,
  OutlookStatusDto,
  OutlookIntegrationLogDto,
} from '../types/outlook-integration.types';

const OUTLOOK_INTEGRATION_BASE = '/api/integrations/outlook';

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
    const endpoint = `${OUTLOOK_INTEGRATION_BASE}/logs${suffix ? `?${suffix}` : ''}`;
    const response = await api.get<ApiResponse<PagedResponse<OutlookIntegrationLogDto>>>(endpoint);
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
};

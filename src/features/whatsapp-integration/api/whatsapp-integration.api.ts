import { api } from '@/lib/axios';
import type { ApiResponse, PagedParams, PagedResponse } from '@/types/api';
import type {
  UpdateWhatsappIntegrationSettingsDto,
  WhatsappIntegrationLogDto,
  WhatsappIntegrationStatusDto,
  WhatsappSendMessageResultDto,
  WhatsappTestMessageDto,
} from '../types/whatsapp-integration.types';

const WHATSAPP_INTEGRATION_BASE = '/api/integrations/whatsapp';

function getErrorMessage(response: ApiResponse<unknown>, fallback: string): string {
  if (response.message?.trim()) return response.message;
  if (response.exceptionMessage?.trim()) return response.exceptionMessage;
  if (response.errors?.length) return response.errors.join(' ');
  return fallback;
}

function normalizePaged<T>(response: PagedResponse<T> & { items?: T[] }): PagedResponse<T> {
  if (response.items && !response.data) {
    return {
      ...response,
      data: response.items,
    };
  }

  return response;
}

export const whatsappIntegrationApi = {
  getStatus: async (): Promise<WhatsappIntegrationStatusDto> => {
    const response = await api.get<ApiResponse<WhatsappIntegrationStatusDto>>(`${WHATSAPP_INTEGRATION_BASE}/status`);
    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(getErrorMessage(response, 'WhatsApp integration status could not be loaded.'));
  },

  updateSettings: async (
    payload: UpdateWhatsappIntegrationSettingsDto
  ): Promise<WhatsappIntegrationStatusDto> => {
    const response = await api.put<ApiResponse<WhatsappIntegrationStatusDto>>(
      `${WHATSAPP_INTEGRATION_BASE}/settings`,
      payload
    );

    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(getErrorMessage(response, 'WhatsApp integration settings could not be updated.'));
  },

  sendTestMessage: async (payload: WhatsappTestMessageDto): Promise<WhatsappSendMessageResultDto> => {
    const response = await api.post<ApiResponse<WhatsappSendMessageResultDto>>(
      `${WHATSAPP_INTEGRATION_BASE}/test-message`,
      payload
    );

    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(getErrorMessage(response, 'WhatsApp test message could not be sent.'));
  },

  getLogs: async (
    query: Omit<PagedParams, 'filters'> & {
      filters?: PagedParams['filters'] | Record<string, unknown>;
      errorsOnly?: boolean;
      direction?: string;
    } = {}
  ): Promise<PagedResponse<WhatsappIntegrationLogDto>> => {
    const queryParams = new URLSearchParams();
    if (query.pageNumber && query.pageNumber > 0) queryParams.set('pageNumber', String(query.pageNumber));
    if (query.pageSize && query.pageSize > 0) queryParams.set('pageSize', String(query.pageSize));
    if (query.search?.trim()) queryParams.set('search', query.search.trim());
    if (query.errorsOnly) queryParams.set('errorsOnly', 'true');
    if (query.direction?.trim()) queryParams.set('direction', query.direction.trim());
    if (query.sortBy) queryParams.set('sortBy', query.sortBy);
    if (query.sortDirection) queryParams.set('sortDirection', query.sortDirection);
    if (Array.isArray(query.filters) && query.filters.length > 0) {
      queryParams.set('filters', JSON.stringify(query.filters));
      queryParams.set('filterLogic', query.filterLogic ?? 'and');
    } else if (query.filters && Object.keys(query.filters).length > 0) {
      queryParams.set('filters', JSON.stringify(query.filters));
      queryParams.set('filterLogic', query.filterLogic ?? 'and');
    }

    const suffix = queryParams.toString();
    const response = await api.get<ApiResponse<PagedResponse<WhatsappIntegrationLogDto> & { items?: WhatsappIntegrationLogDto[] }>>(
      `${WHATSAPP_INTEGRATION_BASE}/logs${suffix ? `?${suffix}` : ''}`
    );

    if (response.success && response.data) {
      return normalizePaged(response.data);
    }

    throw new Error(getErrorMessage(response, 'WhatsApp integration logs could not be loaded.'));
  },
};

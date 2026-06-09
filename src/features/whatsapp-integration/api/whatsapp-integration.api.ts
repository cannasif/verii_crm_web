import { api } from '@/lib/axios';
import type { ApiResponse, PagedParams, PagedResponse } from '@/types/api';
import type {
  UpdateWhatsappIntegrationSettingsDto,
  WhatsappIntegrationLogDto,
  WhatsappQuoteDraftDto,
  WhatsappQuoteDraftActionResultDto,
  WhatsappQuoteDraftConvertRequestDto,
  WhatsappQuoteDraftSendRequestDto,
  WhatsappIntegrationStatusDto,
  WhatsappSendMessageResultDto,
  WhatsappTestMessageDto,
  WhatsappQuotationSendRequestDto,
  WhatsappQuotationSendResultDto,
  WhatsappDocumentSendRequestDto,
  WhatsappDocumentSendResultDto,
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
    const response = await api.post<ApiResponse<PagedResponse<WhatsappIntegrationLogDto> & { items?: WhatsappIntegrationLogDto[] }>>(
      `${WHATSAPP_INTEGRATION_BASE}/logs/query`,
      {
        pageNumber: query.pageNumber ?? 1,
        pageSize: query.pageSize ?? 10,
        search: query.search ?? '',
        sortBy: query.sortBy ?? 'Id',
        sortDirection: query.sortDirection ?? 'desc',
        filterLogic: query.filterLogic ?? 'and',
        filters: query.filters ?? [],
        errorsOnly: query.errorsOnly ?? false,
        direction: query.direction ?? undefined,
      }
    );

    if (response.success && response.data) {
      return normalizePaged(response.data);
    }

    throw new Error(getErrorMessage(response, 'WhatsApp integration logs could not be loaded.'));
  },

  getQuoteDrafts: async (
    query: Omit<PagedParams, 'filters'> & {
      filters?: PagedParams['filters'] | Record<string, unknown>;
    } = {}
  ): Promise<PagedResponse<WhatsappQuoteDraftDto>> => {
    const response = await api.post<ApiResponse<PagedResponse<WhatsappQuoteDraftDto> & { items?: WhatsappQuoteDraftDto[] }>>(
      `${WHATSAPP_INTEGRATION_BASE}/quote-drafts/query`,
      {
        pageNumber: query.pageNumber ?? 1,
        pageSize: query.pageSize ?? 10,
        search: query.search ?? '',
        sortBy: query.sortBy ?? 'Id',
        sortDirection: query.sortDirection ?? 'desc',
        filterLogic: query.filterLogic ?? 'and',
        filters: query.filters ?? [],
      }
    );

    if (response.success && response.data) {
      return normalizePaged(response.data);
    }

    throw new Error(getErrorMessage(response, 'WhatsApp quote drafts could not be loaded.'));
  },

  convertQuoteDraft: async (
    draftId: number,
    payload: WhatsappQuoteDraftConvertRequestDto
  ): Promise<WhatsappQuoteDraftActionResultDto> => {
    const response = await api.post<ApiResponse<WhatsappQuoteDraftActionResultDto>>(
      `${WHATSAPP_INTEGRATION_BASE}/quote-drafts/${draftId}/convert`,
      payload
    );

    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(getErrorMessage(response, 'WhatsApp quote draft could not be converted.'));
  },

  sendQuoteDraft: async (
    draftId: number,
    payload: WhatsappQuoteDraftSendRequestDto
  ): Promise<WhatsappQuoteDraftActionResultDto> => {
    const response = await api.post<ApiResponse<WhatsappQuoteDraftActionResultDto>>(
      `${WHATSAPP_INTEGRATION_BASE}/quote-drafts/${draftId}/send`,
      payload
    );

    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(getErrorMessage(response, 'WhatsApp quote draft could not be sent.'));
  },

  sendQuotation: async (
    quotationId: number,
    payload: WhatsappQuotationSendRequestDto
  ): Promise<WhatsappQuotationSendResultDto> => {
    const response = await api.post<ApiResponse<WhatsappQuotationSendResultDto>>(
      `${WHATSAPP_INTEGRATION_BASE}/quotations/${quotationId}/send`,
      payload
    );

    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(getErrorMessage(response, 'Quotation could not be sent through WhatsApp.'));
  },

  sendDocument: async (payload: WhatsappDocumentSendRequestDto): Promise<WhatsappDocumentSendResultDto> => {
    const response = await api.post<ApiResponse<WhatsappDocumentSendResultDto>>(
      `${WHATSAPP_INTEGRATION_BASE}/send-document`,
      payload
    );

    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(getErrorMessage(response, 'Document could not be sent through WhatsApp.'));
  },
};

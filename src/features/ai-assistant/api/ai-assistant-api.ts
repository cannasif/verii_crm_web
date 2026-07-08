import { api } from '@/lib/axios';
import i18n from '@/lib/i18n';
import type { ApiResponse } from '@/types/api';
import type {
  AiAssistantActionConfirmationDto,
  AiAssistantAnalyticsDto,
  AiAssistantAnswerDto,
  AiAssistantAskRequestDto,
  AiAssistantConversationHistoryDto,
  AiAssistantGreetingDto,
} from '../types/ai-assistant.types';

export const aiAssistantApi = {
  getGreeting: async (): Promise<AiAssistantGreetingDto> => {
    const response = await api.get<ApiResponse<AiAssistantGreetingDto>>('/api/AiAssistant/greeting');
    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(
      response.message ||
        i18n.t('apiErrors.greeting', {
          ns: 'ai-assistant',
          defaultValue: 'AI asistan karşılama bilgisi alınamadı.',
        })
    );
  },

  getAnalytics: async (params?: {
    startDate?: string | null;
    endDate?: string | null;
  }): Promise<AiAssistantAnalyticsDto> => {
    const response = await api.get<ApiResponse<AiAssistantAnalyticsDto>>('/api/AiAssistant/analytics', {
      params,
    });
    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(
      response.message ||
        i18n.t('apiErrors.analytics', {
          ns: 'ai-assistant',
          defaultValue: 'AI asistan metrikleri alınamadı.',
        })
    );
  },

  getConversationHistory: async (sessionKey: string): Promise<AiAssistantConversationHistoryDto> => {
    const response = await api.get<ApiResponse<AiAssistantConversationHistoryDto>>(
      `/api/AiAssistant/conversations/${encodeURIComponent(sessionKey)}`
    );
    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(
      response.message ||
        i18n.t('apiErrors.history', {
          ns: 'ai-assistant',
          defaultValue: 'AI sohbet geçmişi alınamadı.',
        })
    );
  },

  ask: async (request: AiAssistantAskRequestDto): Promise<AiAssistantAnswerDto> => {
    const response = await api.post<ApiResponse<AiAssistantAnswerDto>>('/api/AiAssistant/ask', request);
    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(
      response.message ||
        i18n.t('apiErrors.answer', {
          ns: 'ai-assistant',
          defaultValue: 'AI asistan yanıtı alınamadı.',
      })
    );
  },

  confirmAction: async (actionId: number): Promise<AiAssistantActionConfirmationDto> => {
    const response = await api.post<ApiResponse<AiAssistantActionConfirmationDto>>('/api/AiAssistant/actions/confirm', {
      actionId,
    });
    if (response.success && response.data) {
      return response.data;
    }

    throw new Error(
      response.message ||
        i18n.t('apiErrors.action', {
          ns: 'ai-assistant',
          defaultValue: 'AI aksiyonu onaylanamadı.',
        })
    );
  },

  downloadCustomerDossierPdf: async (customerId: number): Promise<Blob> => {
    const blob = await api.get<Blob>(`/api/AiAssistant/customer-dossier/${customerId}/pdf`, {
      responseType: 'blob',
    });

    if (!(blob instanceof Blob)) {
      throw new Error(
        i18n.t('apiErrors.customerDossierPdf', {
          ns: 'ai-assistant',
          defaultValue: 'Müşteri dosyası PDF indirilemedi.',
        })
      );
    }

    return blob;
  },

  downloadSalesRepDossierPdf: async (userId: number): Promise<Blob> => {
    const blob = await api.get<Blob>(`/api/AiAssistant/sales-rep-dossier/${userId}/pdf`, {
      responseType: 'blob',
    });

    if (!(blob instanceof Blob)) {
      throw new Error(
        i18n.t('apiErrors.salesRepDossierPdf', {
          ns: 'ai-assistant',
          defaultValue: 'Satış temsilcisi dosyası PDF indirilemedi.',
        })
      );
    }

    return blob;
  },
};

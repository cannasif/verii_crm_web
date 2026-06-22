import { api } from '@/lib/axios';
import i18n from '@/lib/i18n';
import type { ApiResponse } from '@/types/api';
import type {
  AiAssistantAnswerDto,
  AiAssistantAskRequestDto,
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
};

import { useQuery } from '@tanstack/react-query';
import { aiAssistantApi } from '../api/ai-assistant-api';
import type { AiAssistantGreetingDto } from '../types/ai-assistant.types';

export const AI_ASSISTANT_QUERY_KEYS = {
  greeting: ['ai-assistant', 'greeting'] as const,
};

export function useAiAssistantGreetingQuery(): ReturnType<typeof useQuery<AiAssistantGreetingDto>> {
  return useQuery({
    queryKey: AI_ASSISTANT_QUERY_KEYS.greeting,
    queryFn: aiAssistantApi.getGreeting,
    staleTime: 5 * 60 * 1000,
  });
}

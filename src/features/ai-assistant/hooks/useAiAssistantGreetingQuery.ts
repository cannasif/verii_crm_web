import { useQuery } from '@tanstack/react-query';
import { aiAssistantApi } from '../api/ai-assistant-api';
import type { AiAssistantAnalyticsDto, AiAssistantCapabilitiesDto, AiAssistantConversationHistoryDto, AiAssistantConversationListItemDto, AiAssistantGreetingDto } from '../types/ai-assistant.types';

export const AI_ASSISTANT_QUERY_KEYS = {
  greeting: ['ai-assistant', 'greeting'] as const,
  capabilities: ['ai-assistant', 'capabilities'] as const,
  analytics: ['ai-assistant', 'analytics'] as const,
  conversation: (sessionKey: string) => ['ai-assistant', 'conversation', sessionKey] as const,
  conversations: (branchKey: string) => ['ai-assistant', 'conversations', branchKey] as const,
};

export function useAiAssistantCapabilitiesQuery(): ReturnType<typeof useQuery<AiAssistantCapabilitiesDto>> {
  return useQuery({
    queryKey: AI_ASSISTANT_QUERY_KEYS.capabilities,
    queryFn: aiAssistantApi.getCapabilities,
    staleTime: 15 * 60 * 1000,
  });
}

export function useAiAssistantGreetingQuery(): ReturnType<typeof useQuery<AiAssistantGreetingDto>> {
  return useQuery({
    queryKey: AI_ASSISTANT_QUERY_KEYS.greeting,
    queryFn: aiAssistantApi.getGreeting,
    staleTime: 5 * 60 * 1000,
  });
}

export function useAiAssistantConversationsQuery(
  branchKey: string
): ReturnType<typeof useQuery<AiAssistantConversationListItemDto[]>> {
  return useQuery({
    queryKey: AI_ASSISTANT_QUERY_KEYS.conversations(branchKey),
    queryFn: () => aiAssistantApi.getConversations(false, 30),
    staleTime: 10 * 1000,
    refetchOnWindowFocus: false,
  });
}

export function useAiAssistantAnalyticsQuery(): ReturnType<typeof useQuery<AiAssistantAnalyticsDto>> {
  return useQuery({
    queryKey: AI_ASSISTANT_QUERY_KEYS.analytics,
    queryFn: () => aiAssistantApi.getAnalytics(),
    staleTime: 60 * 1000,
  });
}

export function useAiAssistantConversationHistoryQuery(
  sessionKey: string,
  enabled: boolean
): ReturnType<typeof useQuery<AiAssistantConversationHistoryDto>> {
  return useQuery({
    queryKey: AI_ASSISTANT_QUERY_KEYS.conversation(sessionKey),
    queryFn: () => aiAssistantApi.getConversationHistory(sessionKey),
    enabled: enabled && Boolean(sessionKey),
    retry: false,
    refetchOnMount: 'always',
    refetchOnWindowFocus: false,
    staleTime: 10 * 1000,
  });
}

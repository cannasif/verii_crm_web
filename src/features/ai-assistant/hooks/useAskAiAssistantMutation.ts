import { useMutation, useQueryClient } from '@tanstack/react-query';
import { aiAssistantApi } from '../api/ai-assistant-api';
import type { AiAssistantAskRequestDto } from '../types/ai-assistant.types';

export function useAskAiAssistantMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: AiAssistantAskRequestDto) => aiAssistantApi.ask(request),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['ai-assistant', 'conversations'] }),
  });
}

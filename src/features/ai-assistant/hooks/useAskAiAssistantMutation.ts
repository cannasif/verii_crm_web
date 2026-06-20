import { useMutation } from '@tanstack/react-query';
import { aiAssistantApi } from '../api/ai-assistant-api';
import type { AiAssistantAskRequestDto } from '../types/ai-assistant.types';

export function useAskAiAssistantMutation() {
  return useMutation({
    mutationFn: (request: AiAssistantAskRequestDto) => aiAssistantApi.ask(request),
  });
}

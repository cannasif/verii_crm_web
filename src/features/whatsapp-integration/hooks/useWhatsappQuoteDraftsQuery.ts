import { useQuery } from '@tanstack/react-query';
import type { PagedParams } from '@/types/api';
import { whatsappIntegrationApi } from '../api/whatsapp-integration.api';

export const WHATSAPP_QUOTE_DRAFTS_QUERY_KEY = ['whatsapp-integration', 'quote-drafts'] as const;

type WhatsappQuoteDraftsParams = Omit<PagedParams, 'filters'> & {
  filters?: PagedParams['filters'] | Record<string, unknown>;
};

export function useWhatsappQuoteDraftsQuery(params: WhatsappQuoteDraftsParams) {
  return useQuery({
    queryKey: [...WHATSAPP_QUOTE_DRAFTS_QUERY_KEY, params],
    queryFn: () => whatsappIntegrationApi.getQuoteDrafts(params),
    staleTime: 15 * 1000,
  });
}

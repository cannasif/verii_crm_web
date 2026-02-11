import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { quotationApi } from '../api/quotation-api';
import { queryKeys } from '../utils/query-keys';
import type { QuotationNotesGetDto } from '../types/quotation-types';

export const useQuotationNotes = (quotationId: number): UseQueryResult<QuotationNotesGetDto | null, Error> => {
  return useQuery({
    queryKey: queryKeys.quotationNotes(quotationId),
    queryFn: () => quotationApi.getQuotationNotesByQuotationId(quotationId),
    enabled: !!quotationId && quotationId > 0,
    staleTime: 2 * 60 * 1000,
  });
};

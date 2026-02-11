import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';
import type { ApiResponse } from '@/types/api';
import { quotationApi } from '../api/quotation-api';
import { queryKeys } from '../utils/query-keys';
import type { UpdateQuotationNotesListDto } from '../types/quotation-types';

export const useUpdateQuotationNotesList = (quotationId: number): UseMutationResult<ApiResponse<unknown>, Error, UpdateQuotationNotesListDto, unknown> => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: UpdateQuotationNotesListDto) =>
      quotationApi.updateNotesListByQuotationId(quotationId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.quotationNotes(quotationId) });
    },
  });
};

import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';
import type { ApiResponse } from '@/types/api';
import { orderApi } from '../api/order-api';
import { queryKeys } from '../utils/query-keys';
import type { UpdateOrderNotesListDto } from '../types/order-types';

export const useUpdateOrderNotesList = (orderId: number): UseMutationResult<ApiResponse<unknown>, Error, UpdateOrderNotesListDto, unknown> => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: UpdateOrderNotesListDto) =>
      orderApi.updateNotesListByOrderId(orderId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.orderNotes(orderId) });
    },
  });
};

import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { orderApi } from '../api/order-api';
import { queryKeys } from '../utils/query-keys';
import type { OrderNotesGetDto } from '../types/order-types';

export const useOrderNotes = (orderId: number): UseQueryResult<OrderNotesGetDto | null, Error> => {
  return useQuery({
    queryKey: queryKeys.orderNotes(orderId),
    queryFn: () => orderApi.getOrderNotesByOrderId(orderId),
    enabled: !!orderId && orderId > 0,
    staleTime: 2 * 60 * 1000,
  });
};

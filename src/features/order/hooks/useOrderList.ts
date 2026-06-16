import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import type { PagedResponse } from '@/types/api';
import {
  fetchPagedDocumentList,
  type DocumentListQueryParams,
} from '@/features/approval/utils/fetch-paged-document-list';
import { orderApi } from '../api/order-api';
import { queryKeys } from '../utils/query-keys';
import type { OrderGetDto } from '../types/order-types';

export const useOrderList = (
  params: DocumentListQueryParams
): UseQueryResult<PagedResponse<OrderGetDto>, Error> => {
  return useQuery({
    queryKey: queryKeys.orders(params),
    queryFn: () =>
      fetchPagedDocumentList<OrderGetDto>(params, (queryParams) => orderApi.getList(queryParams)),
    staleTime: 2 * 60 * 1000,
    refetchOnMount: 'always',
  });
};

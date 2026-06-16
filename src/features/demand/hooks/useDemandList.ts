import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import type { PagedResponse } from '@/types/api';
import {
  fetchPagedDocumentList,
  type DocumentListQueryParams,
} from '@/features/approval/utils/fetch-paged-document-list';
import { demandApi } from '../api/demand-api';
import { queryKeys } from '../utils/query-keys';
import type { DemandGetDto } from '../types/demand-types';

export const useDemandList = (
  params: DocumentListQueryParams
): UseQueryResult<PagedResponse<DemandGetDto>, Error> => {
  return useQuery({
    queryKey: queryKeys.demands(params),
    queryFn: () =>
      fetchPagedDocumentList<DemandGetDto>(params, (queryParams) => demandApi.getList(queryParams)),
    staleTime: 2 * 60 * 1000,
    refetchOnMount: 'always',
  });
};

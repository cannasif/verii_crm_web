import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import type { PagedResponse } from '@/types/api';
import {
  fetchPagedDocumentList,
  type DocumentListQueryParams,
} from '@/features/approval/utils/fetch-paged-document-list';
import { quotationApi } from '../api/quotation-api';
import { queryKeys } from '../utils/query-keys';
import type { QuotationGetDto } from '../types/quotation-types';

export const useQuotationList = (
  params: DocumentListQueryParams
): UseQueryResult<PagedResponse<QuotationGetDto>, Error> => {
  return useQuery({
    queryKey: queryKeys.quotations(params),
    queryFn: () =>
      fetchPagedDocumentList<QuotationGetDto>(
        params,
        (queryParams) => quotationApi.getList(queryParams)
      ),
    staleTime: 2 * 60 * 1000,
    refetchOnMount: 'always',
  });
};

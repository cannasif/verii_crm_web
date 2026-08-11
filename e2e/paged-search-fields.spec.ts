import { expect, test } from '@playwright/test';
import { fetchPagedDocumentList } from '../src/features/approval/utils/fetch-paged-document-list';
import { appendPagedQueryParams } from '../src/utils/query-params';
import type { PagedParams } from '../src/types/api';

test('document lists forward selected search fields to every paged request', async () => {
  const requests: PagedParams[] = [];

  await fetchPagedDocumentList(
    {
      pageNumber: 2,
      pageSize: 10,
      search: 'ASD202658',
      searchFields: ['Id', 'PotentialCustomer.CustomerName'],
      sortBy: 'Id',
      sortDirection: 'desc',
    },
    async (params) => {
      requests.push(params);
      return {
        data: [],
        totalCount: 0,
        pageNumber: params.pageNumber ?? 1,
        pageSize: params.pageSize ?? 10,
        totalPages: 1,
        hasPreviousPage: false,
        hasNextPage: false,
      };
    },
  );

  expect(requests).toHaveLength(1);
  expect(requests[0]).toMatchObject({
    pageNumber: 2,
    pageSize: 10,
    search: 'ASD202658',
    searchFields: ['Id', 'PotentialCustomer.CustomerName'],
    sortBy: 'Id',
    sortDirection: 'desc',
  });
});

test('URL paged requests send only normalized and unique fields for active searches', () => {
  const query = appendPagedQueryParams(new URLSearchParams(), {
    pageNumber: 1,
    pageSize: 10,
    search: '  ASD202658  ',
    searchFields: [' Id ', 'OrderNo', 'OrderNo', ''],
  });

  expect(query.get('search')).toBe('ASD202658');
  expect(query.getAll('searchFields')).toEqual(['Id', 'OrderNo']);
});

test('URL paged requests omit field selection when there is no search term', () => {
  const query = appendPagedQueryParams(new URLSearchParams(), {
    pageNumber: 1,
    pageSize: 10,
    search: '   ',
    searchFields: ['Id', 'OrderNo'],
  });

  expect(query.has('search')).toBe(false);
  expect(query.has('searchFields')).toBe(false);
});

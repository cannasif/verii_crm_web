import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { activityApi } from '@/features/activity-management/api/activity-api';
import type { ActivityDto } from '@/features/activity-management/types/activity-types';
import type { PagedFilter, PagedResponse } from '@/types/api';
import { fetchAllPagedData } from '@/lib/fetch-all-paged-data';
import {
  activityBelongsToCustomer,
  buildCustomerActivityFilters,
  didServerIgnoreActivityCustomerFilter,
} from '../utils/activity-customer-scope';

function sortByStartDesc(rows: ActivityDto[]): ActivityDto[] {
  return [...rows].sort(
    (a, b) => new Date(b.startDateTime).getTime() - new Date(a.startDateTime).getTime()
  );
}

function paginateActivities(
  rows: ActivityDto[],
  pageNumber: number,
  pageSize: number
): PagedResponse<ActivityDto> {
  const totalCount = rows.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const safePage = Math.min(Math.max(pageNumber, 1), totalPages);
  const start = (safePage - 1) * pageSize;
  const data = rows.slice(start, start + pageSize);

  return {
    data,
    totalCount,
    pageNumber: safePage,
    pageSize,
    totalPages,
    hasPreviousPage: safePage > 1,
    hasNextPage: safePage < totalPages,
  };
}

async function fetchActivitiesClientSide(params: {
  customerId: number;
  customerCode?: string | null;
  customerName?: string | null;
  activityFilters: PagedFilter[];
  pageNumber: number;
  pageSize: number;
}): Promise<PagedResponse<ActivityDto>> {
  const { customerId, customerCode, customerName, activityFilters, pageNumber, pageSize } = params;

  const fetchPage = async (page: number, size: number) => {
    try {
      return await activityApi.getList({
        pageNumber: page,
        pageSize: size,
        sortBy: 'StartDateTime',
        sortDirection: 'desc',
        filters: activityFilters.length > 0 ? activityFilters : undefined,
      });
    } catch {
      return activityApi.getList({
        pageNumber: page,
        pageSize: size,
        sortBy: 'StartDateTime',
        sortDirection: 'desc',
      });
    }
  };

  const all = await fetchAllPagedData({ fetchPage, pageSize: 250 });
  const matched = sortByStartDesc(
    all.filter((row) => activityBelongsToCustomer(row, customerId, customerCode, customerName))
  );

  return paginateActivities(matched, pageNumber, pageSize);
}

export function useCustomerActivities(params: {
  customerId: number;
  customerCode?: string | null;
  customerName?: string | null;
  pageNumber: number;
  pageSize: number;
}) {
  const { customerId, customerCode, customerName, pageNumber, pageSize } = params;

  const activityFilters = useMemo(
    () => buildCustomerActivityFilters(customerId, customerCode, customerName),
    [customerCode, customerId, customerName]
  );

  return useQuery({
    queryKey: [
      'customer360',
      'activities',
      customerId,
      customerCode ?? '',
      customerName ?? '',
      pageNumber,
      pageSize,
      activityFilters,
    ],
    queryFn: async (): Promise<PagedResponse<ActivityDto>> => {
      if (activityFilters.length > 0) {
        try {
          const response = await activityApi.getList({
            pageNumber,
            pageSize,
            sortBy: 'StartDateTime',
            sortDirection: 'desc',
            filters: activityFilters,
          });
          const raw = response.data ?? [];

          if (didServerIgnoreActivityCustomerFilter(raw, customerId, customerCode, customerName)) {
            return fetchActivitiesClientSide({
              customerId,
              customerCode,
              customerName,
              activityFilters,
              pageNumber,
              pageSize,
            });
          }

          const data = raw.filter((row) =>
            activityBelongsToCustomer(row, customerId, customerCode, customerName)
          );

          return { ...response, data };
        } catch {
          // Activity/query filtre hatası — istemci eşlemesine düş
        }
      }

      return fetchActivitiesClientSide({
        customerId,
        customerCode,
        customerName,
        activityFilters,
        pageNumber,
        pageSize,
      });
    },
    staleTime: 5 * 60 * 1000,
    enabled: customerId > 0,
  });
}

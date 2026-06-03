import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { activityApi } from '@/features/activity-management/api/activity-api';
import type { ActivityDto } from '@/features/activity-management/types/activity-types';
import type { PagedResponse } from '@/types/api';
import { fetchAllPagedData } from '@/lib/fetch-all-paged-data';
import { buildCustomerDocumentFilters } from '../utils/customer-document-filters';

function sortByStartDesc(rows: ActivityDto[]): ActivityDto[] {
  return [...rows].sort(
    (a, b) => new Date(b.startDateTime).getTime() - new Date(a.startDateTime).getTime()
  );
}

function activityBelongsToCustomer(
  activity: ActivityDto,
  customerId: number,
  customerCode?: string | null,
  customerName?: string | null
): boolean {
  if (customerId > 0 && activity.potentialCustomerId === customerId) {
    return true;
  }
  const code = customerCode?.trim();
  if (code) {
    if (activity.erpCustomerCode?.trim() === code) return true;
    if (activity.potentialCustomer?.customerCode?.trim() === code) return true;
  }
  const name = customerName?.trim();
  if (name) {
    const linkedName = activity.potentialCustomer?.name?.trim();
    if (linkedName && linkedName.localeCompare(name, undefined, { sensitivity: 'accent' }) === 0) {
      return true;
    }
  }
  return false;
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
  documentFilters: ReturnType<typeof buildCustomerDocumentFilters>;
  pageNumber: number;
  pageSize: number;
}): Promise<PagedResponse<ActivityDto>> {
  const { customerId, customerCode, customerName, documentFilters, pageNumber, pageSize } = params;

  const fetchPage = async (page: number, size: number) => {
    try {
      return await activityApi.getList({
        pageNumber: page,
        pageSize: size,
        sortBy: 'StartDateTime',
        sortDirection: 'desc',
        filters: documentFilters.length > 0 ? documentFilters : undefined,
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

  const documentFilters = useMemo(
    () => buildCustomerDocumentFilters(customerCode, customerName),
    [customerCode, customerName]
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
      documentFilters,
    ],
    queryFn: async (): Promise<PagedResponse<ActivityDto>> => {
      // Teklif/sipariş ile aynı sunucu filtresi (ErpCustomerCode veya PotentialCustomerName)
      if (documentFilters.length > 0) {
        try {
          return await activityApi.getList({
            pageNumber,
            pageSize,
            sortBy: 'StartDateTime',
            sortDirection: 'desc',
            filters: documentFilters,
          });
        } catch {
          // Activity/query bu kolonları desteklemiyorsa aşağıdaki istemci eşlemesine düş
        }
      }

      return fetchActivitiesClientSide({
        customerId,
        customerCode,
        customerName,
        documentFilters,
        pageNumber,
        pageSize,
      });
    },
    staleTime: 5 * 60 * 1000,
    enabled: customerId > 0,
  });
}

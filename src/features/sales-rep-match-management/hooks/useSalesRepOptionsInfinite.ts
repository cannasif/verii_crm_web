import { useMemo } from 'react';
import { useDropdownInfiniteSearch } from '@/hooks/useDropdownInfiniteSearch';
import type { ComboboxOption } from '@/components/shared/VoiceSearchCombobox';
import { DROPDOWN_MIN_CHARS, DROPDOWN_PAGE_SIZE } from '@/components/shared/dropdown/constants';
import { salesRepApi } from '@/features/sales-rep-management/api/sales-rep-api';
import type { SalesRepGetDto } from '@/features/sales-rep-management/types/sales-rep-types';

export function useSalesRepOptionsInfinite(searchTerm: string, enabled = true) {
  const result = useDropdownInfiniteSearch<SalesRepGetDto>({
    entityKey: 'salesRepCodes',
    searchTerm,
    enabled,
    minChars: DROPDOWN_MIN_CHARS,
    pageSize: DROPDOWN_PAGE_SIZE,
    sortBy: 'salesRepCode',
    sortDirection: 'asc',
    buildFilters: () => undefined,
    fetchPage: ({ pageNumber, pageSize, search, sortBy, sortDirection, signal }) =>
      salesRepApi.getList({
        pageNumber,
        pageSize,
        search,
        sortBy,
        sortDirection,
        filters: undefined,
        filterLogic: undefined,
        signal,
      } as never),
  });

  const options = useMemo<ComboboxOption[]>(
    () =>
      result.items.map((item) => ({
        value: item.id.toString(),
        label: item.name?.trim() ? `${item.salesRepCode} - ${item.name}` : item.salesRepCode,
      })),
    [result.items]
  );

  return { ...result, options };
}

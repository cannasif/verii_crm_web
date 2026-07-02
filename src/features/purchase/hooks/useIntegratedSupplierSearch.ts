import { useMemo } from 'react';
import { useDropdownInfiniteSearch } from '@/hooks/useDropdownInfiniteSearch';
import { customerApi } from '@/features/customer-management/api/customer-api';
import type { CustomerDto } from '@/features/customer-management/types/customer-types';
import type { ComboboxOption } from '@/components/shared/VoiceSearchCombobox';

const SUPPLIER_PAGE_SIZE = 30;
const SUPPLIER_MIN_CHARS = 2;

export interface IntegratedSupplierOption {
  id: number;
  customerCode: string;
  name: string;
  email?: string | null;
}

function toIntegratedSupplier(item: CustomerDto): IntegratedSupplierOption | null {
  const customerCode = item.customerCode?.trim();
  if (!customerCode || !(item.isERPIntegrated || item.isIntegrated)) {
    return null;
  }

  return {
    id: item.id,
    customerCode,
    name: item.name,
    email: item.email,
  };
}

function toComboboxOption(item: IntegratedSupplierOption): ComboboxOption {
  return {
    value: item.id.toString(),
    label: `${item.customerCode} - ${item.name}`,
  };
}

export function useIntegratedSupplierSearch(searchTerm: string, enabled = true) {
  const result = useDropdownInfiniteSearch<CustomerDto>({
    entityKey: 'purchase-integrated-suppliers',
    searchTerm,
    enabled,
    minChars: SUPPLIER_MIN_CHARS,
    pageSize: SUPPLIER_PAGE_SIZE,
    sortBy: 'Name',
    sortDirection: 'asc',
    filterLogic: 'and',
    buildFilters: () => [
      { column: 'IsERPIntegrated', operator: 'Equals', value: 'true' },
    ],
    fetchPage: ({ signal: _signal, filters, ...params }) =>
      customerApi.getList({
        ...params,
        filters: Array.isArray(filters) ? filters : [],
      }),
  });

  const suppliers = useMemo(
    () => result.items.map(toIntegratedSupplier).filter((item): item is IntegratedSupplierOption => item !== null),
    [result.items]
  );

  const options = useMemo(() => suppliers.map(toComboboxOption), [suppliers]);

  return {
    ...result,
    suppliers,
    options,
    minChars: SUPPLIER_MIN_CHARS,
  };
}

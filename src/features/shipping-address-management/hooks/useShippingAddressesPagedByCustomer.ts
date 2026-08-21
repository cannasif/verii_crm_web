import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { DROPDOWN_MIN_CHARS, DROPDOWN_PAGE_SIZE } from '@/components/shared/dropdown/constants';
import { dropdownApi } from '@/components/shared/dropdown/dropdown-api';
import { useDropdownInfiniteSearch } from '@/hooks/useDropdownInfiniteSearch';
import { shippingAddressApi } from '../api/shipping-address-api';
import type { ShippingAddressDto } from '../types/shipping-address-types';
import { queryKeys } from '../utils/query-keys';

const SHIPPING_ADDRESS_SEARCH_FIELDS = [
  'Name',
  'ErpShippingCode',
  'Address',
  'ContactPerson',
  'City.Name',
  'District.Name',
] as const;

export function useShippingAddressesPagedByCustomer(
  customerId?: number,
  searchTerm = '',
  selectedAddressId?: number | null,
) {
  const normalizedCustomerId = customerId && customerId > 0 ? customerId : 0;
  const normalizedSelectedAddressId = selectedAddressId && selectedAddressId > 0
    ? selectedAddressId
    : 0;

  const pageQuery = useDropdownInfiniteSearch<ShippingAddressDto>({
    entityKey: ['shippingAddresses', normalizedCustomerId],
    searchTerm,
    enabled: normalizedCustomerId > 0,
    minChars: DROPDOWN_MIN_CHARS,
    pageSize: DROPDOWN_PAGE_SIZE,
    searchFields: SHIPPING_ADDRESS_SEARCH_FIELDS,
    // Sayfalar arasında satır atlama/tekrar oluşmaması için benzersiz ve kararlı sıralama.
    sortBy: 'Id',
    sortDirection: 'asc',
    filterLogic: 'and',
    buildFilters: () => [
      { column: 'CustomerId', operator: 'eq', value: normalizedCustomerId.toString() },
      { column: 'IsActive', operator: 'eq', value: 'true' },
    ],
    fetchPage: dropdownApi.getShippingAddressPage,
  });

  // Düzenleme ekranında seçili adres ilk sayfada olmayabilir. Yalnızca o tek kaydı
  // ayrıca getirerek seçimi koruruz; müşteri listesinin tamamını hiçbir zaman çekmeyiz.
  const selectedAddressQuery = useQuery({
    queryKey: queryKeys.detail(normalizedSelectedAddressId),
    queryFn: ({ signal }) => shippingAddressApi.getById(normalizedSelectedAddressId, signal),
    enabled: normalizedCustomerId > 0 && normalizedSelectedAddressId > 0,
    staleTime: 5 * 60 * 1000,
  });

  const items = useMemo(() => {
    const selectedAddress = selectedAddressQuery.data;
    if (
      !selectedAddress ||
      selectedAddress.customerId !== normalizedCustomerId ||
      pageQuery.items.some((address) => address.id === selectedAddress.id)
    ) {
      return pageQuery.items;
    }

    return [selectedAddress, ...pageQuery.items];
  }, [normalizedCustomerId, pageQuery.items, selectedAddressQuery.data]);

  return {
    ...pageQuery,
    items,
    isLoading:
      pageQuery.isLoading ||
      (normalizedSelectedAddressId > 0 && selectedAddressQuery.isLoading),
  };
}

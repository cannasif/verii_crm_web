import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { ComboboxOption } from '@/components/shared/VoiceSearchCombobox';
import { DROPDOWN_PAGE_SIZE } from '@/components/shared/dropdown/constants';
import { useDropdownInfiniteSearch } from '@/hooks/useDropdownInfiniteSearch';
import { erpCommonApi } from '../erp-common-api';
import type { SpecialCodeDto } from '../erp-types';

function toComboboxOptions(items: SpecialCodeDto[]): ComboboxOption[] {
  return items.map((item) => ({
    value: item.ozelKod,
    label: item.displayName || (item.aciklama ? `${item.ozelKod} - ${item.aciklama}` : item.ozelKod),
  }));
}

export function useSpecialCodesInfinite(tableType: 1 | 2, searchTerm: string, enabled = true) {
  const result = useDropdownInfiniteSearch<SpecialCodeDto>({
    entityKey: `erpSpecialCodes:${tableType}`,
    searchTerm,
    enabled,
    minChars: 0,
    pageSize: DROPDOWN_PAGE_SIZE,
    buildFilters: (term) =>
      term ? [{ column: 'search', operator: 'contains', value: term }] : undefined,
    fetchPage: (params) => erpCommonApi.getSpecialCodesPage({ ...params, tableType }),
  });

  const options = useMemo(() => toComboboxOptions(result.items), [result.items]);

  return {
    ...result,
    options,
  };
}

export function useSpecialCodeExists(tableType: 1 | 2, specialCode?: string | null, enabled = true) {
  const normalizedSpecialCode = String(specialCode ?? '').trim().toUpperCase();

  return useQuery({
    queryKey: ['erpSpecialCodeExists', tableType, normalizedSpecialCode],
    enabled: enabled && normalizedSpecialCode.length > 0,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const items = await erpCommonApi.getSpecialCodes(tableType, normalizedSpecialCode);

      return items.some(
        (item) => String(item.ozelKod ?? '').trim().toUpperCase() === normalizedSpecialCode
      );
    },
  });
}

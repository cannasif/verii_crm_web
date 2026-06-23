import { useMemo } from 'react';
import { DROPDOWN_PAGE_SIZE } from '@/components/shared/dropdown/constants';
import type { ComboboxOption } from '@/components/shared/VoiceSearchCombobox';
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

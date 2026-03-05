import { useMemo } from 'react';
import { useDropdownInfiniteSearch } from '@/hooks/useDropdownInfiniteSearch';
import { erpCommonApi } from '../erp-common-api';
import type { ProjeDto } from '../erp-types';
import { DROPDOWN_MIN_CHARS, DROPDOWN_PAGE_SIZE } from '@/components/shared/dropdown/constants';
import type { ComboboxOption } from '@/components/shared/VoiceSearchCombobox';

function toComboboxOptions(items: ProjeDto[]): ComboboxOption[] {
  return items.map((p) => ({
    value: p.projeKod,
    label: p.projeAciklama ? `${p.projeKod} - ${p.projeAciklama}` : p.projeKod,
  }));
}

export function useErpProjectCodesInfinite(searchTerm: string, enabled = true) {
  const result = useDropdownInfiniteSearch<ProjeDto>({
    entityKey: 'erpProjectCodes',
    searchTerm,
    enabled,
    minChars: DROPDOWN_MIN_CHARS,
    pageSize: DROPDOWN_PAGE_SIZE,
    buildFilters: (term) =>
      term ? [{ column: 'search', operator: 'contains', value: term }] : undefined,
    fetchPage: erpCommonApi.getProjectCodesPage,
  });

  const options = useMemo(() => toComboboxOptions(result.items), [result.items]);

  return {
    ...result,
    options,
  };
}

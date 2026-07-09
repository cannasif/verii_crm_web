import { useMemo } from 'react';
import { useDropdownInfiniteSearch } from '@/hooks/useDropdownInfiniteSearch';
import { DROPDOWN_MIN_CHARS, DROPDOWN_PAGE_SIZE } from '@/components/shared/dropdown/constants';
import type { ComboboxOption } from '@/components/shared/VoiceSearchCombobox';
import { windoDefinitionApi } from '../api/windo-definition-api';
import type { WindoDefinitionGetDto } from '../types/windo-definition-types';

function toComboboxOptions(items: WindoDefinitionGetDto[]): ComboboxOption[] {
  return items.map((item) => ({
    value: String(item.id),
    label: item.name,
  }));
}

function filterByProfilDefinition(
  items: WindoDefinitionGetDto[],
  profilDefinitionId?: number | null,
  preserveOptionId?: number | null
): WindoDefinitionGetDto[] {
  if (!profilDefinitionId) {
    return items;
  }

  return items.filter(
    (item) =>
      item.profilDefinitionId === profilDefinitionId ||
      item.id === preserveOptionId
  );
}

function useWindoDefinitionInfinite(
  entityKey: string,
  searchTerm: string,
  fetchPage: (params: {
    pageNumber: number;
    pageSize: number;
    search?: string;
    sortBy?: string;
    sortDirection?: string;
  }) => ReturnType<typeof windoDefinitionApi.getProfilPagedList>,
  enabled = true
) {
  const result = useDropdownInfiniteSearch<WindoDefinitionGetDto>({
    entityKey: ['windo-definition', entityKey],
    searchTerm,
    enabled,
    minChars: DROPDOWN_MIN_CHARS,
    pageSize: DROPDOWN_PAGE_SIZE,
    sortBy: 'Name',
    sortDirection: 'asc',
    buildFilters: () => undefined,
    fetchPage: ({ pageNumber, pageSize, search, sortBy, sortDirection }) =>
      fetchPage({
        pageNumber,
        pageSize,
        search,
        sortBy,
        sortDirection,
      }),
  });

  const options = useMemo(() => toComboboxOptions(result.items), [result.items]);

  return {
    ...result,
    options,
  };
}

export function useWindoProfilOptionsInfinite(searchTerm: string, enabled = true) {
  return useWindoDefinitionInfinite(
    'profil',
    searchTerm,
    windoDefinitionApi.getProfilPagedList,
    enabled
  );
}

export function useWindoDemirOptionsInfinite(
  searchTerm: string,
  profilDefinitionId?: number | null,
  preserveOptionId?: number | null,
  enabled = true
) {
  const result = useWindoDefinitionInfinite(
    'demir',
    searchTerm,
    windoDefinitionApi.getDemirPagedList,
    enabled
  );

  const options = useMemo(
    () => toComboboxOptions(filterByProfilDefinition(result.items, profilDefinitionId, preserveOptionId)),
    [preserveOptionId, profilDefinitionId, result.items]
  );

  return {
    ...result,
    options,
  };
}

export function useWindoVidaOptionsInfinite(
  searchTerm: string,
  profilDefinitionId?: number | null,
  preserveOptionId?: number | null,
  enabled = true
) {
  const result = useWindoDefinitionInfinite(
    'vida',
    searchTerm,
    windoDefinitionApi.getVidaPagedList,
    enabled
  );

  const options = useMemo(
    () => toComboboxOptions(filterByProfilDefinition(result.items, profilDefinitionId, preserveOptionId)),
    [preserveOptionId, profilDefinitionId, result.items]
  );

  return {
    ...result,
    options,
  };
}

export function useWindoBaskiOptionsInfinite(searchTerm: string, enabled = true) {
  return useWindoDefinitionInfinite(
    'baski',
    searchTerm,
    windoDefinitionApi.getBaskiPagedList,
    enabled
  );
}

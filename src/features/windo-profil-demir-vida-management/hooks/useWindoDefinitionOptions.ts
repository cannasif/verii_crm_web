import { useMemo } from 'react';
import { useQueries } from '@tanstack/react-query';
import { windoDefinitionApi } from '../api/windo-definition-api';
import type { WindoDefinitionGetDto, WindoDefinitionOption } from '../types/windo-definition-types';

function toOptions(items: WindoDefinitionGetDto[]): WindoDefinitionOption[] {
  return items.map((item) => ({
    id: item.id,
    name: item.name,
    profilDefinitionId: item.profilDefinitionId ?? null,
    profilDefinitionName: item.profilDefinitionName ?? null,
  }));
}

function toOptionMap(items: WindoDefinitionOption[]): Record<number, string> {
  return items.reduce<Record<number, string>>((acc, item) => {
    acc[item.id] = item.name;
    return acc;
  }, {});
}

function filterChildOptions(
  items: WindoDefinitionOption[],
  selectedProfilDefinitionId?: number | null,
  preserveOptionId?: number | null
): WindoDefinitionOption[] {
  if (!selectedProfilDefinitionId) {
    return items;
  }

  return items.filter(
    (item) =>
      item.profilDefinitionId === selectedProfilDefinitionId ||
      item.id === preserveOptionId
  );
}

export function useWindoDefinitionOptions(
  selectedProfilDefinitionId?: number | null,
  preserveSelection?: { demirDefinitionId?: number | null; vidaDefinitionId?: number | null }
) {
  const [profilQuery, demirQuery, vidaQuery] = useQueries({
    queries: [
      { queryKey: ['windo-definition', 'profil'], queryFn: windoDefinitionApi.getProfilList },
      { queryKey: ['windo-definition', 'demir'], queryFn: windoDefinitionApi.getDemirList },
      { queryKey: ['windo-definition', 'vida'], queryFn: windoDefinitionApi.getVidaList },
    ],
  });

  const profilOptions = useMemo(() => toOptions(profilQuery.data ?? []), [profilQuery.data]);
  const allDemirOptions = useMemo(() => toOptions(demirQuery.data ?? []), [demirQuery.data]);
  const allVidaOptions = useMemo(() => toOptions(vidaQuery.data ?? []), [vidaQuery.data]);
  const demirOptions = useMemo(
    () => filterChildOptions(allDemirOptions, selectedProfilDefinitionId, preserveSelection?.demirDefinitionId),
    [allDemirOptions, preserveSelection?.demirDefinitionId, selectedProfilDefinitionId]
  );
  const vidaOptions = useMemo(
    () => filterChildOptions(allVidaOptions, selectedProfilDefinitionId, preserveSelection?.vidaDefinitionId),
    [allVidaOptions, preserveSelection?.vidaDefinitionId, selectedProfilDefinitionId]
  );

  return {
    profilOptions,
    allDemirOptions,
    allVidaOptions,
    demirOptions,
    vidaOptions,
    profilMap: toOptionMap(profilOptions),
    demirMap: toOptionMap(allDemirOptions),
    vidaMap: toOptionMap(allVidaOptions),
    isLoading: profilQuery.isLoading || demirQuery.isLoading || vidaQuery.isLoading,
  };
}

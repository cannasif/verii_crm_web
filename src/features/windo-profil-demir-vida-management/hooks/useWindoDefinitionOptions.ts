import { useMemo } from 'react';
import { useQueries } from '@tanstack/react-query';
import { windoDefinitionApi } from '../api/windo-definition-api';
import type { WindoDefinitionGetDto, WindoDefinitionOption } from '../types/windo-definition-types';

function toOptions(items: WindoDefinitionGetDto[]): WindoDefinitionOption[] {
  return items.map((item) => ({ id: item.id, name: item.name }));
}

function toOptionMap(items: WindoDefinitionOption[]): Record<number, string> {
  return items.reduce<Record<number, string>>((acc, item) => {
    acc[item.id] = item.name;
    return acc;
  }, {});
}

export function useWindoDefinitionOptions() {
  const [profilQuery, demirQuery, vidaQuery] = useQueries({
    queries: [
      { queryKey: ['windo-definition', 'profil'], queryFn: windoDefinitionApi.getProfilList },
      { queryKey: ['windo-definition', 'demir'], queryFn: windoDefinitionApi.getDemirList },
      { queryKey: ['windo-definition', 'vida'], queryFn: windoDefinitionApi.getVidaList },
    ],
  });

  const profilOptions = useMemo(() => toOptions(profilQuery.data ?? []), [profilQuery.data]);
  const demirOptions = useMemo(() => toOptions(demirQuery.data ?? []), [demirQuery.data]);
  const vidaOptions = useMemo(() => toOptions(vidaQuery.data ?? []), [vidaQuery.data]);

  return {
    profilOptions,
    demirOptions,
    vidaOptions,
    profilMap: toOptionMap(profilOptions),
    demirMap: toOptionMap(demirOptions),
    vidaMap: toOptionMap(vidaOptions),
    isLoading: profilQuery.isLoading || demirQuery.isLoading || vidaQuery.isLoading,
  };
}

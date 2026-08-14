import { useQuery } from '@tanstack/react-query';
import type { SalesMapCountriesGeoJson } from '../types/sales-map-geo';
import { dashboardQueryKeys } from '../utils/query-keys';

async function loadSalesMapCountries(): Promise<SalesMapCountriesGeoJson> {
  const module = await import('../assets/ne_110m_admin_0_countries.json');
  return module.default as SalesMapCountriesGeoJson;
}

export function useSalesMapCountries(enabled = true) {
  return useQuery({
    queryKey: dashboardQueryKeys.salesMapCountries(),
    queryFn: () => loadSalesMapCountries(),
    staleTime: 1000 * 60 * 60 * 24,
    enabled,
  });
}

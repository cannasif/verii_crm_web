import { useQuery } from '@tanstack/react-query';
import type { SalesMapCountriesGeoJson } from '../types/sales-map-geo';
import { dashboardQueryKeys } from '../utils/query-keys';

async function loadSalesMapProvinces(): Promise<SalesMapCountriesGeoJson> {
  const module = await import('../assets/tr_provinces.json');
  return module.default as SalesMapCountriesGeoJson;
}

export function useSalesMapProvinces(enabled = true) {
  return useQuery({
    queryKey: dashboardQueryKeys.salesMapProvinces(),
    queryFn: () => loadSalesMapProvinces(),
    staleTime: 1000 * 60 * 60 * 24,
    enabled,
  });
}

import { useQuery } from '@tanstack/react-query';
import type { SalesMapCountriesGeoJson } from '../types/sales-map-geo';
import { dashboardQueryKeys } from '../utils/query-keys';

async function loadSalesMapCountries(signal?: AbortSignal): Promise<SalesMapCountriesGeoJson> {
  const response = await fetch('/assets/maps/ne_110m_admin_0_countries.geojson', { signal });
  if (!response.ok) {
    throw new Error('Sales map countries could not be loaded.');
  }
  return response.json() as Promise<SalesMapCountriesGeoJson>;
}

export function useSalesMapCountries(enabled = true) {
  return useQuery({
    queryKey: dashboardQueryKeys.salesMapCountries(),
    queryFn: ({ signal }) => loadSalesMapCountries(signal),
    staleTime: 1000 * 60 * 60 * 24,
    enabled,
  });
}

import { useQuery } from '@tanstack/react-query';
import { categoryDefinitionsApi } from '../api/category-definitions-api';

export const useCatalogFavorites = (
  catalogId?: number | null,
  params?: { pageNumber?: number; pageSize?: number; search?: string }
) =>
  useQuery({
    queryKey: [
      'category-definitions',
      'favorites',
      catalogId ?? null,
      params?.pageNumber ?? 1,
      params?.pageSize ?? 20,
      params?.search ?? '',
    ],
    queryFn: () => categoryDefinitionsApi.getCatalogFavorites(catalogId!, params),
    enabled: Boolean(catalogId),
    staleTime: 60 * 1000,
  });

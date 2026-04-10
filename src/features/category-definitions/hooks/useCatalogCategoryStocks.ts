import { useQuery } from '@tanstack/react-query';
import { categoryDefinitionsApi } from '../api/category-definitions-api';

export const useCatalogCategoryStocks = (
  catalogId?: number | null,
  catalogCategoryId?: number | null,
  params?: { pageNumber?: number; pageSize?: number; search?: string }
) =>
  useQuery({
    queryKey: [
      'category-definitions',
      'stocks',
      catalogId ?? null,
      catalogCategoryId ?? null,
      params?.pageNumber ?? 1,
      params?.pageSize ?? 20,
      params?.search ?? '',
    ],
    queryFn: () => categoryDefinitionsApi.getCatalogCategoryStocks(catalogId!, catalogCategoryId!, params),
    enabled: Boolean(catalogId && catalogCategoryId),
    staleTime: 60 * 1000,
  });

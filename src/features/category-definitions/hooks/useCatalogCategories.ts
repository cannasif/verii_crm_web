import { useQuery } from '@tanstack/react-query';
import { categoryDefinitionsApi } from '../api/category-definitions-api';

export const useCatalogCategories = (catalogId?: number | null, parentCatalogCategoryId?: number | null) =>
  useQuery({
    queryKey: ['category-definitions', 'categories', catalogId ?? null, parentCatalogCategoryId ?? null],
    queryFn: () => categoryDefinitionsApi.getCatalogCategories(catalogId!, parentCatalogCategoryId),
    enabled: Boolean(catalogId),
    staleTime: 5 * 60 * 1000,
  });

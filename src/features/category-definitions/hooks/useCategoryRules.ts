import { useQuery } from '@tanstack/react-query';
import { categoryDefinitionsApi } from '../api/category-definitions-api';

export const useCategoryRules = (
  catalogId?: number | null,
  catalogCategoryId?: number | null
) =>
  useQuery({
    queryKey: ['category-definitions', 'rules', catalogId ?? null, catalogCategoryId ?? null],
    queryFn: () => categoryDefinitionsApi.getCategoryRules(catalogId!, catalogCategoryId!),
    enabled: Boolean(catalogId && catalogCategoryId),
    staleTime: 60 * 1000,
  });

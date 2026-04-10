import { useQuery } from '@tanstack/react-query';
import { categoryDefinitionsApi } from '../api/category-definitions-api';

export const useCatalogs = () =>
  useQuery({
    queryKey: ['category-definitions', 'catalogs'],
    queryFn: () => categoryDefinitionsApi.getCatalogs(),
    staleTime: 5 * 60 * 1000,
  });

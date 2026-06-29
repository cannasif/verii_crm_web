import { useQuery } from '@tanstack/react-query';
import { countryApi } from '../api/country-api';
import type { CountryDto } from '../types/country-types';

export const useCountryOptions = (): ReturnType<typeof useQuery<CountryDto[]>> => {
  return useQuery({
    queryKey: ['countryOptions'],
    queryFn: async (): Promise<CountryDto[]> => {
      const response = await countryApi.getList({
        pageNumber: 1,
        pageSize: 1000,
        sortBy: 'Name',
        sortDirection: 'asc',
      });
      return response.data || [];
    },
    staleTime: 5 * 60 * 1000,
  });
};

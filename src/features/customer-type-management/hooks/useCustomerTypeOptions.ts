import { useQuery } from '@tanstack/react-query';
import { customerTypeApi } from '../api/customer-type-api';
import { queryKeys } from '../utils/query-keys';
import type { CustomerTypeDto } from '../types/customer-type-types';

export const useCustomerTypeOptions = () => {
  return useQuery({
    queryKey: queryKeys.options(),
    queryFn: async (): Promise<CustomerTypeDto[]> => {
      const response = await customerTypeApi.getList({
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

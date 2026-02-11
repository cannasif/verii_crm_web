import { useQuery } from '@tanstack/react-query';
import { erpCommonApi } from '../erp-common-api';
import type { ProjeDto } from '../erp-types';

export const useErpProjects = () => {
  return useQuery<ProjeDto[]>({
    queryKey: ['erpProjectCodes'],
    queryFn: () => erpCommonApi.getProjectCodes(),
    staleTime: 5 * 60 * 1000,
  });
};

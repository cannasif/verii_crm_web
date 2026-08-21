import { useQuery } from '@tanstack/react-query';
import { permissionDefinitionApi } from '../api/permissionDefinitionApi';
import { ACCESS_CONTROL_QUERY_KEYS } from '../utils/query-keys';
import type { PagedRequest } from '../types/access-control.types';

const STALE_TIME_MS = 30_000;

export const usePermissionDefinitionsQuery = (params: PagedRequest) =>
  useQuery({
    queryKey: ACCESS_CONTROL_QUERY_KEYS.PERMISSION_DEFINITIONS(params),
    queryFn: ({ signal }) => permissionDefinitionApi.getList(params, signal),
    staleTime: STALE_TIME_MS,
  });

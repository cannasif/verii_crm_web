import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { powerbiRlsApi } from '../api/powerbiRls.api';
import { userAuthorityApi } from '../api/userAuthority.api';
import { powerbiRlsQueryKeys, userAuthorityQueryKeys } from '../utils/query-keys';
import { normalizeQueryParams } from '@/utils/query-params';
import type { PagedParams } from '@/types/api';
import type {
  PowerBIReportRoleMapping,
  CreatePowerBIReportRoleMappingDto,
  UpdatePowerBIReportRoleMappingDto,
} from '../types/powerbiRls.types';

const STALE_LIST = 30 * 1000;
const STALE_DETAIL = 60 * 1000;

export function usePowerbiRlsList(params: PagedParams) {
  return useQuery({
    queryKey: powerbiRlsQueryKeys.list(normalizeQueryParams(params)),
    queryFn: () => powerbiRlsApi.getList(params),
    staleTime: STALE_LIST,
  });
}

export function usePowerbiRlsDetail(id: number | null) {
  return useQuery({
    queryKey: powerbiRlsQueryKeys.detail(id ?? 0),
    queryFn: () => powerbiRlsApi.getById(id!),
    enabled: id != null && id > 0,
    staleTime: STALE_DETAIL,
  });
}

export function useUserAuthorityList(params: PagedParams) {
  return useQuery({
    queryKey: userAuthorityQueryKeys.list(params),
    queryFn: () => userAuthorityApi.getList(params),
    staleTime: STALE_LIST,
  });
}

export function useCreatePowerbiRls() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreatePowerBIReportRoleMappingDto): Promise<PowerBIReportRoleMapping> =>
      powerbiRlsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: powerbiRlsQueryKeys.all });
      toast.success(t('powerbiRls.successCreate'));
    },
    onError: (error: Error) => {
      toast.error(error.message ?? t('powerbiRls.error'));
    },
  });
}

export function useUpdatePowerbiRls() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: number;
      data: UpdatePowerBIReportRoleMappingDto;
    }): Promise<PowerBIReportRoleMapping> => powerbiRlsApi.update(id, data),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: powerbiRlsQueryKeys.all });
      queryClient.invalidateQueries({ queryKey: powerbiRlsQueryKeys.detail(updated.id) });
      toast.success(t('powerbiRls.successUpdate'));
    },
    onError: (error: Error) => {
      toast.error(error.message ?? t('powerbiRls.error'));
    },
  });
}

export function useDeletePowerbiRls() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number): Promise<void> => powerbiRlsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: powerbiRlsQueryKeys.all });
      toast.success(t('powerbiRls.successDelete'));
    },
    onError: (error: Error) => {
      toast.error(error.message ?? t('powerbiRls.error'));
    },
  });
}

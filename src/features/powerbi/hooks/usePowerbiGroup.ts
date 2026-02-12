import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { powerbiGroupApi } from '../api/powerbiGroup.api';
import { powerbiQueryKeys } from '../utils/query-keys';
import { normalizeQueryParams } from '@/utils/query-params';
import type { PagedParams, PagedFilter } from '@/types/api';
import type {
  PowerBIGroupGetDto,
  CreatePowerBIGroupDto,
  UpdatePowerBIGroupDto,
} from '../types/powerbiGroup.types';

const STALE_LIST = 30 * 1000;
const STALE_DETAIL = 60 * 1000;

export function usePowerbiGroupList(
  params: PagedParams & { filters?: PagedFilter[] | Record<string, unknown> }
) {
  return useQuery({
    queryKey: powerbiQueryKeys.groups.list(normalizeQueryParams(params)),
    queryFn: () => powerbiGroupApi.getList(params),
    staleTime: STALE_LIST,
  });
}

export function usePowerbiGroupDetail(id: number | null) {
  return useQuery({
    queryKey: powerbiQueryKeys.groups.detail(id ?? 0),
    queryFn: () => powerbiGroupApi.getById(id!),
    enabled: id != null && id > 0,
    staleTime: STALE_DETAIL,
  });
}

export function useCreatePowerbiGroup() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreatePowerBIGroupDto): Promise<PowerBIGroupGetDto> =>
      powerbiGroupApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: powerbiQueryKeys.groups.all });
      toast.success(t('powerbi.group.createSuccess'));
    },
    onError: (error: Error) => {
      toast.error(error.message ?? t('powerbi.group.createError'));
    },
  });
}

export function useUpdatePowerbiGroup() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: { id: number; data: UpdatePowerBIGroupDto }): Promise<PowerBIGroupGetDto> =>
      powerbiGroupApi.update(id, data),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: powerbiQueryKeys.groups.all });
      queryClient.invalidateQueries({ queryKey: powerbiQueryKeys.groups.detail(updated.id) });
      toast.success(t('powerbi.group.updateSuccess'));
    },
    onError: (error: Error) => {
      toast.error(error.message ?? t('powerbi.group.updateError'));
    },
  });
}

export function useDeletePowerbiGroup() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number): Promise<void> => powerbiGroupApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: powerbiQueryKeys.groups.all });
      toast.success(t('powerbi.group.deleteSuccess'));
    },
    onError: (error: Error) => {
      toast.error(error.message ?? t('powerbi.group.deleteError'));
    },
  });
}

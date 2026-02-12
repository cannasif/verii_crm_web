import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { userPowerbiGroupApi } from '../api/userPowerbiGroup.api';
import { powerbiQueryKeys } from '../utils/query-keys';
import { normalizeQueryParams } from '@/utils/query-params';
import type { PagedParams, PagedFilter } from '@/types/api';
import type {
  UserPowerBIGroupGetDto,
  CreateUserPowerBIGroupDto,
  UpdateUserPowerBIGroupDto,
} from '../types/userPowerbiGroup.types';

const STALE_LIST = 30 * 1000;
const STALE_DETAIL = 60 * 1000;

export function useUserPowerbiGroupList(
  params: PagedParams & { filters?: PagedFilter[] | Record<string, unknown> }
) {
  return useQuery({
    queryKey: powerbiQueryKeys.userGroups.list(normalizeQueryParams(params)),
    queryFn: () => userPowerbiGroupApi.getList(params),
    staleTime: STALE_LIST,
  });
}

export function useUserPowerbiGroupDetail(id: number | null) {
  return useQuery({
    queryKey: powerbiQueryKeys.userGroups.detail(id ?? 0),
    queryFn: () => userPowerbiGroupApi.getById(id!),
    enabled: id != null && id > 0,
    staleTime: STALE_DETAIL,
  });
}

export function useCreateUserPowerbiGroup() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateUserPowerBIGroupDto): Promise<UserPowerBIGroupGetDto> =>
      userPowerbiGroupApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: powerbiQueryKeys.userGroups.all });
      toast.success(t('powerbi.userGroup.createSuccess'));
    },
    onError: (error: Error) => {
      toast.error(error.message ?? t('powerbi.userGroup.createError'));
    },
  });
}

export function useUpdateUserPowerbiGroup() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: { id: number; data: UpdateUserPowerBIGroupDto }): Promise<UserPowerBIGroupGetDto> =>
      userPowerbiGroupApi.update(id, data),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: powerbiQueryKeys.userGroups.all });
      queryClient.invalidateQueries({ queryKey: powerbiQueryKeys.userGroups.detail(updated.id) });
      toast.success(t('powerbi.userGroup.updateSuccess'));
    },
    onError: (error: Error) => {
      toast.error(error.message ?? t('powerbi.userGroup.updateError'));
    },
  });
}

export function useDeleteUserPowerbiGroup() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number): Promise<void> => userPowerbiGroupApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: powerbiQueryKeys.userGroups.all });
      toast.success(t('powerbi.userGroup.deleteSuccess'));
    },
    onError: (error: Error) => {
      toast.error(error.message ?? t('powerbi.userGroup.deleteError'));
    },
  });
}

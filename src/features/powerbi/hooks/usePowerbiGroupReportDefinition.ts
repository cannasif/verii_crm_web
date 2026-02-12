import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { powerbiGroupReportDefinitionApi } from '../api/powerbiGroupReportDefinition.api';
import { powerbiQueryKeys } from '../utils/query-keys';
import { normalizeQueryParams } from '@/utils/query-params';
import type { PagedParams, PagedFilter } from '@/types/api';
import type {
  PowerBIGroupReportDefinitionGetDto,
  CreatePowerBIGroupReportDefinitionDto,
  UpdatePowerBIGroupReportDefinitionDto,
} from '../types/powerbiGroupReportDefinition.types';

const STALE_LIST = 30 * 1000;
const STALE_DETAIL = 60 * 1000;

export function usePowerbiGroupReportDefinitionList(
  params: PagedParams & { filters?: PagedFilter[] | Record<string, unknown> }
) {
  return useQuery({
    queryKey: powerbiQueryKeys.groupReportDefinitions.list(normalizeQueryParams(params)),
    queryFn: () => powerbiGroupReportDefinitionApi.getList(params),
    staleTime: STALE_LIST,
  });
}

export function usePowerbiGroupReportDefinitionDetail(id: number | null) {
  return useQuery({
    queryKey: powerbiQueryKeys.groupReportDefinitions.detail(id ?? 0),
    queryFn: () => powerbiGroupReportDefinitionApi.getById(id!),
    enabled: id != null && id > 0,
    staleTime: STALE_DETAIL,
  });
}

export function useCreatePowerbiGroupReportDefinition() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (
      data: CreatePowerBIGroupReportDefinitionDto
    ): Promise<PowerBIGroupReportDefinitionGetDto> =>
      powerbiGroupReportDefinitionApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: powerbiQueryKeys.groupReportDefinitions.all });
      toast.success(t('powerbi.groupReportDefinition.createSuccess'));
    },
    onError: (error: Error) => {
      toast.error(
        error.message ?? t('powerbi.groupReportDefinition.createError')
      );
    },
  });
}

export function useUpdatePowerbiGroupReportDefinition() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: number;
      data: UpdatePowerBIGroupReportDefinitionDto;
    }): Promise<PowerBIGroupReportDefinitionGetDto> =>
      powerbiGroupReportDefinitionApi.update(id, data),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: powerbiQueryKeys.groupReportDefinitions.all });
      queryClient.invalidateQueries({
        queryKey: powerbiQueryKeys.groupReportDefinitions.detail(updated.id),
      });
      toast.success(t('powerbi.groupReportDefinition.updateSuccess'));
    },
    onError: (error: Error) => {
      toast.error(
        error.message ?? t('powerbi.groupReportDefinition.updateError')
      );
    },
  });
}

export function useDeletePowerbiGroupReportDefinition() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number): Promise<void> => powerbiGroupReportDefinitionApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: powerbiQueryKeys.groupReportDefinitions.all });
      toast.success(t('powerbi.groupReportDefinition.deleteSuccess'));
    },
    onError: (error: Error) => {
      toast.error(
        error.message ?? t('powerbi.groupReportDefinition.deleteError')
      );
    },
  });
}

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { powerbiReportDefinitionApi } from '../api/powerbiReportDefinition.api';
import { powerbiQueryKeys } from '../utils/query-keys';
import { normalizeQueryParams } from '@/utils/query-params';
import type { PagedParams, PagedFilter } from '@/types/api';
import type {
  PowerBIReportDefinitionGetDto,
  CreatePowerBIReportDefinitionDto,
  UpdatePowerBIReportDefinitionDto,
} from '../types/powerbiReportDefinition.types';
const STALE_LIST = 30 * 1000;
const STALE_DETAIL = 60 * 1000;

export function usePowerbiReportDefinitionList(
  params: PagedParams & { filters?: PagedFilter[] | Record<string, unknown> }
) {
  return useQuery({
    queryKey: powerbiQueryKeys.reportDefinitions.list(normalizeQueryParams(params)),
    queryFn: () => powerbiReportDefinitionApi.getList(params),
    staleTime: STALE_LIST,
  });
}

export function usePowerbiReportDefinitionDetail(id: number | null) {
  return useQuery({
    queryKey: powerbiQueryKeys.reportDefinitions.detail(id ?? 0),
    queryFn: () => powerbiReportDefinitionApi.getById(id!),
    enabled: id != null && id > 0,
    staleTime: STALE_DETAIL,
  });
}

export function useCreatePowerbiReportDefinition() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreatePowerBIReportDefinitionDto): Promise<PowerBIReportDefinitionGetDto> =>
      powerbiReportDefinitionApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: powerbiQueryKeys.reportDefinitions.all });
      toast.success(t('powerbi.reportDefinition.createSuccess'));
    },
    onError: (error: Error) => {
      toast.error(error.message ?? t('powerbi.reportDefinition.createError'));
    },
  });
}

export function useUpdatePowerbiReportDefinition() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: number;
      data: UpdatePowerBIReportDefinitionDto;
    }): Promise<PowerBIReportDefinitionGetDto> => powerbiReportDefinitionApi.update(id, data),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: powerbiQueryKeys.reportDefinitions.all });
      queryClient.invalidateQueries({
        queryKey: powerbiQueryKeys.reportDefinitions.detail(updated.id),
      });
      toast.success(t('powerbi.reportDefinition.updateSuccess'));
    },
    onError: (error: Error) => {
      toast.error(error.message ?? t('powerbi.reportDefinition.updateError'));
    },
  });
}

export function useDeletePowerbiReportDefinition() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number): Promise<void> => powerbiReportDefinitionApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: powerbiQueryKeys.reportDefinitions.all });
      toast.success(t('powerbi.reportDefinition.deleteSuccess'));
    },
    onError: (error: Error) => {
      toast.error(error.message ?? t('powerbi.reportDefinition.deleteError'));
    },
  });
}

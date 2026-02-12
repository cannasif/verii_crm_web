import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { powerbiConfigurationApi } from '../api/powerbiConfiguration.api';
import type {
  PowerBIConfigurationGetDto,
  CreatePowerBIConfigurationDto,
  UpdatePowerBIConfigurationDto,
} from '../types/powerbiConfiguration.types';

const CONFIGURATION_QUERY_KEY = ['powerbi', 'configuration'] as const;
const STALE_TIME_MS = 60 * 1000;

export function usePowerbiConfiguration() {
  return useQuery({
    queryKey: CONFIGURATION_QUERY_KEY,
    queryFn: () => powerbiConfigurationApi.get(),
    staleTime: STALE_TIME_MS,
  });
}

export function useCreatePowerbiConfiguration() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreatePowerBIConfigurationDto): Promise<PowerBIConfigurationGetDto> =>
      powerbiConfigurationApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CONFIGURATION_QUERY_KEY });
      toast.success(t('powerbiConfiguration.createSuccess'));
    },
    onError: (error: Error) => {
      toast.error(error.message ?? t('powerbiConfiguration.createError'));
    },
  });
}

export function useUpdatePowerbiConfiguration() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: number;
      data: UpdatePowerBIConfigurationDto;
    }): Promise<PowerBIConfigurationGetDto> =>
      powerbiConfigurationApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CONFIGURATION_QUERY_KEY });
      toast.success(t('powerbiConfiguration.updateSuccess'));
    },
    onError: (error: Error) => {
      toast.error(error.message ?? t('powerbiConfiguration.updateError'));
    },
  });
}

export function useDeletePowerbiConfiguration() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number): Promise<void> => powerbiConfigurationApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CONFIGURATION_QUERY_KEY });
      toast.success(t('powerbiConfiguration.deleteSuccess'));
    },
    onError: (error: Error) => {
      toast.error(error.message ?? t('powerbiConfiguration.deleteError'));
    },
  });
}

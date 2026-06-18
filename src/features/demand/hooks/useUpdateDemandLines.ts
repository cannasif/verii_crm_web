import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { demandApi } from '../api/demand-api';
import { queryKeys } from '../utils/query-keys';
import type { DemandLineGetDto } from '../types/demand-types';

export const useUpdateDemandLines = (
  demandId: number
): UseMutationResult<DemandLineGetDto[], Error, DemandLineGetDto[], unknown> => {
  const queryClient = useQueryClient();
  const { t } = useTranslation(['demand', 'common']);

  return useMutation({
    mutationFn: (dtos: DemandLineGetDto[]) => demandApi.updateDemandLines(dtos),
    onSuccess: (updated) => {
      queryClient.setQueryData<DemandLineGetDto[]>(
        queryKeys.demandLines(demandId),
        (current) => {
          const existing = current ?? [];
          const updatedIds = new Set(
            updated.map((line) => line.id).filter((id): id is number => Number.isFinite(id) && id > 0),
          );
          const withoutUpdated = existing.filter((line) => !updatedIds.has(line.id));
          return [...withoutUpdated, ...updated];
        },
      );
      toast.success(t('lines.updateSuccess'));
    },
    onError: (error: Error) => {
      toast.error(error.message ?? t('lines.updateError'));
    },
  });
};

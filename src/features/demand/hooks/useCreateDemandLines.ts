import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { demandApi } from '../api/demand-api';
import { queryKeys } from '../utils/query-keys';
import type { CreateDemandLineDto, DemandLineGetDto } from '../types/demand-types';

export const useCreateDemandLines = (
  demandId: number
): UseMutationResult<DemandLineGetDto[], Error, CreateDemandLineDto[], unknown> => {
  const queryClient = useQueryClient();
  const { t } = useTranslation(['demand', 'common']);

  return useMutation({
    mutationFn: (dtos: CreateDemandLineDto[]) => demandApi.createDemandLines(dtos),
    onSuccess: (created) => {
      queryClient.setQueryData<DemandLineGetDto[]>(
        queryKeys.demandLines(demandId),
        (current) => {
          const existing = current ?? [];
          const createdIds = new Set(
            created.map((line) => line.id).filter((id): id is number => Number.isFinite(id) && id > 0)
          );
          const withoutReplaced = existing.filter((line) => !createdIds.has(line.id));
          return [...withoutReplaced, ...created];
        },
      );
      toast.success(t('lines.createSuccess'));
    },
    onError: (error: Error) => {
      toast.error(error.message ?? t('lines.createError'));
    },
  });
};

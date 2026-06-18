import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { demandApi } from '../api/demand-api';
import { queryKeys } from '../utils/query-keys';
import type { DemandLineGetDto } from '../types/demand-types';

export const useDeleteDemandLine = (
  demandId: number
): UseMutationResult<void, Error, number, unknown> => {
  const queryClient = useQueryClient();
  const { t } = useTranslation(['demand', 'common']);

  return useMutation({
    mutationFn: (id: number) => demandApi.deleteDemandLine(id),
    onSuccess: (_data, deletedLineId) => {
      queryClient.setQueryData<DemandLineGetDto[]>(
        queryKeys.demandLines(demandId),
        (current) => current?.filter((line) => line.id !== deletedLineId) ?? [],
      );
      toast.success(t('lines.deleteSuccess'));
    },
    onError: (error: Error) => {
      toast.error(error.message ?? t('lines.deleteError'));
    },
  });
};

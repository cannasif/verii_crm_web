import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { demandApi } from '../api/demand-api';
import { queryKeys } from '../utils/query-keys';

export const useDeleteDemandLine = (
  demandId: number
): UseMutationResult<void, Error, number, unknown> => {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: (id: number) => demandApi.deleteDemandLine(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.demandLines(demandId) });
      toast.success(t('demand.lines.deleteSuccess'));
    },
    onError: (error: Error) => {
      toast.error(error.message ?? t('demand.lines.deleteError'));
    },
  });
};

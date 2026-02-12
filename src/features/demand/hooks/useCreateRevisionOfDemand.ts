import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import type { ApiResponse } from '@/types/api';
import { demandApi } from '../api/demand-api';
import { queryKeys } from '../utils/query-keys';
import type { DemandGetDto } from '../types/demand-types';

export const useCreateRevisionOfDemand = (): UseMutationResult<ApiResponse<DemandGetDto>, Error, number, unknown> => {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: (demandId: number) => demandApi.createRevisionOfDemand(demandId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.demands() });
      toast.success(t('demand.revision.success'));
    },
    onError: (error: Error) => {
      toast.error(error.message || t('demand.revision.error'));
    },
  });
};

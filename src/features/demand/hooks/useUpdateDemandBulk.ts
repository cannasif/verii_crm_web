import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import type { ApiResponse } from '@/types/api';
import { demandApi } from '../api/demand-api';
import { queryKeys } from '../utils/query-keys';
import type { DemandBulkCreateDto, DemandGetDto } from '../types/demand-types';

export const useUpdateDemandBulk = (): UseMutationResult<ApiResponse<DemandGetDto>, Error, { id: number; data: DemandBulkCreateDto }, unknown> => {
  const queryClient = useQueryClient();
  const { t } = useTranslation(['demand', 'common']);

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: DemandBulkCreateDto }) => demandApi.updateBulk(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.demands() });
      toast.success(t('demand.update.success'));
    },
    onError: (error: Error) => {
      toast.error(error.message || t('demand.update.error'));
    },
  });
};

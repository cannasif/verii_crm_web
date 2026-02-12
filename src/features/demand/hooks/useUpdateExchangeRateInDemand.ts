import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import type { ApiResponse } from '@/types/api';
import { demandApi } from '../api/demand-api';
import { queryKeys } from '../utils/query-keys';
import type { DemandExchangeRateGetDto } from '../types/demand-types';

export const useUpdateExchangeRateInDemand = (
  demandId: number
): UseMutationResult<ApiResponse<boolean>, Error, DemandExchangeRateGetDto[], unknown> => {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: (dtos: DemandExchangeRateGetDto[]) =>
      demandApi.updateExchangeRateInDemand(dtos),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.demandExchangeRates(demandId) });
      toast.success(t('demand.exchangeRates.updateSuccess'));
    },
    onError: (error: Error) => {
      toast.error(error.message ?? t('demand.exchangeRates.updateError'));
    },
  });
};

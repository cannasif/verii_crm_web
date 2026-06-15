import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import type { ApiResponse } from '@/types/api';
import { demandApi } from '../api/demand-api';
import { queryKeys } from '../utils/query-keys';
import type { DemandErpCleanupRecreateDto, DemandGetDto } from '../types/demand-types';

interface CleanupDemandErpVariables {
  demandId: number;
  data: DemandErpCleanupRecreateDto;
}

export const useCleanupDemandErpAndCreateCopy = (): UseMutationResult<
  ApiResponse<DemandGetDto>,
  Error,
  CleanupDemandErpVariables,
  unknown
> => {
  const queryClient = useQueryClient();
  const { t } = useTranslation(['demand', 'common']);

  return useMutation({
    mutationFn: ({ demandId, data }) => demandApi.cleanupErpAndCreateCopy(demandId, data),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.demands() });
      toast.success(t('list.erpCleanupSuccess', { defaultValue: 'ERP kaydı temizlendi ve yeni talep kopyası oluşturuldu.' }));
    },
    onError: (error: Error) => {
      toast.error(error.message || t('list.erpCleanupError', { defaultValue: 'ERP kaydı temizlenemedi.' }));
    },
  });
};

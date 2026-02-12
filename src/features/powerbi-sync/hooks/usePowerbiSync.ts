import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { powerbiSyncApi } from '../api/powerbiSync.api';
import { powerbiQueryKeys } from '@/features/powerbi/utils/query-keys';

export function usePowerbiReportSyncMutation() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (workspaceId?: string | null) => powerbiSyncApi.sync(workspaceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: powerbiQueryKeys.reportDefinitions.all });
      toast.success(t('powerbiSync.success'));
    },
    onError: (error: Error) => {
      toast.error(error.message ?? t('powerbiSync.error'));
    },
  });
}

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { activityApi } from '../api/activity-api';
import { ACTIVITY_QUERY_KEYS } from '../utils/query-keys';

export const useDeleteActivity = () => {
  const { t } = useTranslation(['activity-management', 'common']);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number): Promise<void> => {
      await activityApi.delete(id);
    },
    onSuccess: async () => {
      await queryClient.refetchQueries({ 
        queryKey: [ACTIVITY_QUERY_KEYS.LIST],
        exact: false,
      });
      toast.success(t('deleteSuccess'));
    },
    onError: (error: Error) => {
      toast.error(error.message || t('deleteError'));
    },
  });
};

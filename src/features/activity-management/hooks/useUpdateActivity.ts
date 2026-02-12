import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { activityApi } from '../api/activity-api';
import { queryKeys, ACTIVITY_QUERY_KEYS } from '../utils/query-keys';
import type { UpdateActivityDto, ActivityDto } from '../types/activity-types';

export const useUpdateActivity = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: UpdateActivityDto }): Promise<ActivityDto> => {
      const result = await activityApi.update(id, data);
      return result;
    },
    onSuccess: async (updatedActivity: ActivityDto) => {
      await queryClient.refetchQueries({ 
        queryKey: [ACTIVITY_QUERY_KEYS.LIST],
        exact: false,
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.detail(updatedActivity.id) });
      toast.success(t('activityManagement.updateSuccess'));
    },
    onError: (error: Error) => {
      toast.error(error.message || t('activityManagement.updateError'));
    },
  });
};

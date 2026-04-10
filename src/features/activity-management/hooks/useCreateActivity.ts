import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { activityApi } from '../api/activity-api';
import { ACTIVITY_QUERY_KEYS } from '../utils/query-keys';
import type { CreateActivityDto, ActivityDto } from '../types/activity-types';

export const useCreateActivity = () => {
  const { t } = useTranslation(['activity-management', 'common']);
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateActivityDto): Promise<ActivityDto> => {
      const result = await activityApi.create(data);
      return result;
    },
    onSuccess: async () => {
      await queryClient.refetchQueries({ 
        queryKey: [ACTIVITY_QUERY_KEYS.LIST],
        exact: false,
      });
      await queryClient.invalidateQueries({
        queryKey: ['customer360'],
        exact: false,
      });
      toast.success(t('activityManagement.createSuccess'));
    },
    onError: (error: Error) => {
      toast.error(error.message || t('activityManagement.createError'));
    },
  });
};

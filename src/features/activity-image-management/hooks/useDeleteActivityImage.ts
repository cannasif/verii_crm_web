import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { activityImageApi } from '../api/activity-image-api';
import { activityImageKeys } from '../utils/query-keys';
import { ACTIVITY_QUERY_KEYS } from '@/features/activity-management/utils/query-keys';
import type { ActivityImageDto } from '../types/activity-image-types';

export function useDeleteActivityImage(activityId: number) {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: (id: number) => activityImageApi.delete(id),
    onSuccess: async (_, deletedImageId) => {
      queryClient.setQueryData<ActivityImageDto[]>(
        activityImageKeys.byActivity(activityId),
        (current = []) => current.filter((image) => image.id !== deletedImageId),
      );
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: activityImageKeys.byActivity(activityId) }),
        queryClient.invalidateQueries({ queryKey: [ACTIVITY_QUERY_KEYS.LIST], exact: false }),
      ]);
      toast.success(t('activity-image:deleteSuccess'));
    },
    onError: (error: Error) => {
      toast.error(t('activity-image:deleteError'), {
        description: error.message,
      });
    },
  });
}

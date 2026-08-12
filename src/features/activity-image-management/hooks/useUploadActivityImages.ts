import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { activityImageApi } from '../api/activity-image-api';
import { activityImageKeys } from '../utils/query-keys';
import { ACTIVITY_QUERY_KEYS } from '@/features/activity-management/utils/query-keys';
import type { ActivityImageDto, UploadActivityImagesPayload } from '../types/activity-image-types';

export function useUploadActivityImages(activityId: number) {
  const queryClient = useQueryClient();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: (payload: UploadActivityImagesPayload) => activityImageApi.upload(activityId, payload),
    onSuccess: async (data) => {
      queryClient.setQueryData<ActivityImageDto[]>(
        activityImageKeys.byActivity(activityId),
        (current = []) => {
          const uploadedIds = new Set(data.map((image) => image.id));
          return [...current.filter((image) => !uploadedIds.has(image.id)), ...data];
        },
      );
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: activityImageKeys.byActivity(activityId) }),
        queryClient.invalidateQueries({ queryKey: [ACTIVITY_QUERY_KEYS.LIST], exact: false }),
      ]);
      const count = data.length;
      toast.success(
        t('activity-image:uploadSuccess', { count })
      );
    },
    onError: (error: Error) => {
      toast.error(t('activity-image:uploadError'), {
        description: error.message,
      });
    },
  });
}

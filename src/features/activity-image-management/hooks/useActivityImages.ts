import { useQuery } from '@tanstack/react-query';
import { activityImageApi } from '../api/activity-image-api';
import { activityImageKeys } from '../utils/query-keys';

export function useActivityImages(activityId: number | undefined) {
  return useQuery({
    queryKey: activityImageKeys.byActivity(activityId!),
    queryFn: () => activityImageApi.getByActivityId(activityId!),
    enabled: !!activityId && activityId > 0,
    staleTime: 30 * 1000,
  });
}

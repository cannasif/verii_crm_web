import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { notificationApi } from '../api/notification-api';

interface UseUnreadCountOptions {
  enabled?: boolean;
}

export function useUnreadCount(options?: UseUnreadCountOptions): UseQueryResult<number, Error> {
  return useQuery({
    queryKey: ['notification', 'unread-count'],
    queryFn: async (): Promise<number> => {
      try {
        return await notificationApi.getUnreadCount();
      } catch {
        return 0;
      }
    },
    enabled: options?.enabled ?? true,
    refetchInterval: 60000,
    staleTime: 60000,
    retry: 1,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    placeholderData: (previousData) => previousData,
  });
}

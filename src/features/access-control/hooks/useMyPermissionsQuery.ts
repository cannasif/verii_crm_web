import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/auth-store';
import { authAccessApi } from '../api/authAccessApi';
import { ACCESS_CONTROL_QUERY_KEYS } from '../utils/query-keys';
import {
  PERMISSIONS_CACHE_TTL_MS,
  getPermissionCacheEntry,
  usePermissionsStore,
} from '@/stores/permissions-store';

export const useMyPermissionsQuery = () => {
  const userId = useAuthStore((s) => s.user?.id ?? null);
  const token = useAuthStore((s) => s.token);
  const setPermissions = usePermissionsStore((state) => state.setPermissions);
  const cacheEntry = getPermissionCacheEntry(userId);

  return useQuery({
    queryKey: ACCESS_CONTROL_QUERY_KEYS.ME_PERMISSIONS(userId),
    queryFn: async () => {
      const data = await authAccessApi.getMyPermissions();
      if (userId) {
        setPermissions(userId, data);
      }
      return data;
    },
    enabled: !!token && !!userId,
    initialData: cacheEntry?.data,
    initialDataUpdatedAt: cacheEntry?.lastFetchedAt,
    staleTime: PERMISSIONS_CACHE_TTL_MS,
    gcTime: PERMISSIONS_CACHE_TTL_MS * 2,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    retry: 1,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
  });
};

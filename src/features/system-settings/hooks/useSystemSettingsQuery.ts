import { useQuery } from '@tanstack/react-query';
import { systemSettingsApi } from '../api/systemSettingsApi';
import {
  SYSTEM_SETTINGS_CACHE_TTL_MS,
  getSystemSettingsCacheEntry,
  useSystemSettingsStore,
} from '@/stores/system-settings-store';

const SYSTEM_SETTINGS_QUERY_KEY = ['system-settings'] as const;

export function useSystemSettingsQuery() {
  const cacheEntry = getSystemSettingsCacheEntry();
  const setSettings = useSystemSettingsStore((state) => state.setSettings);

  return useQuery({
    queryKey: SYSTEM_SETTINGS_QUERY_KEY,
    queryFn: async () => {
      const data = await systemSettingsApi.get();
      setSettings(data);
      return data;
    },
    initialData: cacheEntry.hasLoadedFromApi ? cacheEntry.settings : undefined,
    initialDataUpdatedAt: cacheEntry.lastFetchedAt ?? undefined,
    staleTime: SYSTEM_SETTINGS_CACHE_TTL_MS,
    gcTime: SYSTEM_SETTINGS_CACHE_TTL_MS * 2,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });
}

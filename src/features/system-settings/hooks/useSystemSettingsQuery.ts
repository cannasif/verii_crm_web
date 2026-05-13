import { useQuery } from '@tanstack/react-query';
import { systemSettingsApi } from '../api/systemSettingsApi';
import {
  SYSTEM_SETTINGS_CACHE_TTL_MS,
  normalizeSystemSettings,
  useSystemSettingsStore,
} from '@/stores/system-settings-store';

const SYSTEM_SETTINGS_QUERY_KEY = ['system-settings'] as const;

export function useSystemSettingsQuery() {
  const setSettings = useSystemSettingsStore((state) => state.setSettings);

  return useQuery({
    queryKey: SYSTEM_SETTINGS_QUERY_KEY,
    queryFn: async () => {
      const data = await systemSettingsApi.get();
      const normalizedData = normalizeSystemSettings(data);
      setSettings(normalizedData);
      return normalizedData;
    },
    staleTime: 0,
    gcTime: SYSTEM_SETTINGS_CACHE_TTL_MS * 2,
    refetchOnMount: 'always',
    refetchOnWindowFocus: false,
  });
}

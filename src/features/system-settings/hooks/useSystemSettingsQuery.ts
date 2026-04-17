import { useQuery } from '@tanstack/react-query';
import { systemSettingsApi } from '../api/systemSettingsApi';

const SYSTEM_SETTINGS_QUERY_KEY = ['system-settings'] as const;

export function useSystemSettingsQuery() {
  return useQuery({
    queryKey: SYSTEM_SETTINGS_QUERY_KEY,
    queryFn: () => systemSettingsApi.get(),
    staleTime: 60 * 1000,
  });
}

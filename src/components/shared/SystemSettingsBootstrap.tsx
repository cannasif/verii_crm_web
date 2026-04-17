import { type ReactElement, useEffect } from 'react';
import { useAuthStore } from '@/stores/auth-store';
import {
  SYSTEM_SETTINGS_CACHE_TTL_MS,
  getSystemSettingsCacheEntry,
  useSystemSettingsStore,
} from '@/stores/system-settings-store';
import { applySystemLanguageIfNeeded } from '@/lib/system-settings';
import { isFresh } from '@/lib/cache-ttl';
import { authAccessApi } from '@/features/access-control/api/authAccessApi';
import {
  PERMISSIONS_CACHE_TTL_MS,
  getPermissionCacheEntry,
  usePermissionsStore,
} from '@/stores/permissions-store';

export function SystemSettingsBootstrap(): ReactElement | null {
  const token = useAuthStore((state) => state.token);
  const userId = useAuthStore((state) => state.user?.id ?? null);
  const setSettings = useSystemSettingsStore((state) => state.setSettings);
  const setPermissions = usePermissionsStore((state) => state.setPermissions);

  useEffect(() => {
    let cancelled = false;

    async function bootstrapSettings(): Promise<void> {
      if (!token || !userId) return;

      const cacheEntry = getSystemSettingsCacheEntry();
      const permissionCacheEntry = getPermissionCacheEntry(userId);
      if (cacheEntry.hasLoadedFromApi) {
        await applySystemLanguageIfNeeded();
      }

      const hasFreshSettings = cacheEntry.hasLoadedFromApi && isFresh(cacheEntry.lastFetchedAt, SYSTEM_SETTINGS_CACHE_TTL_MS);
      const hasFreshPermissions = isFresh(permissionCacheEntry?.lastFetchedAt, PERMISSIONS_CACHE_TTL_MS);

      if (hasFreshSettings && hasFreshPermissions) {
        return;
      }

      try {
        const bootstrap = await authAccessApi.getBootstrap();
        if (cancelled) return;
        setSettings(bootstrap.systemSettings);
        setPermissions(bootstrap.permissions.userId, bootstrap.permissions);
        await applySystemLanguageIfNeeded();
      } catch {
        // System settings bootstrap should not block app rendering.
      }
    }

    void bootstrapSettings();

    return () => {
      cancelled = true;
    };
  }, [setPermissions, setSettings, token, userId]);

  return null;
}

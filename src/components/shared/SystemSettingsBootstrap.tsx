import { type ReactElement, useEffect } from 'react';
import { useAuthStore } from '@/stores/auth-store';
import { useSystemSettingsStore } from '@/stores/system-settings-store';
import { systemSettingsApi } from '@/features/system-settings/api/systemSettingsApi';
import { applySystemLanguageIfNeeded } from '@/lib/system-settings';

export function SystemSettingsBootstrap(): ReactElement | null {
  const token = useAuthStore((state) => state.token);
  const setSettings = useSystemSettingsStore((state) => state.setSettings);

  useEffect(() => {
    let cancelled = false;

    async function bootstrapSettings(): Promise<void> {
      if (!token) return;

      try {
        const settings = await systemSettingsApi.get();
        if (cancelled) return;
        setSettings(settings);
        await applySystemLanguageIfNeeded();
      } catch {
        // System settings bootstrap should not block app rendering.
      }
    }

    void bootstrapSettings();

    return () => {
      cancelled = true;
    };
  }, [setSettings, token]);

  return null;
}

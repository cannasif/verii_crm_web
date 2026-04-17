import { type ReactElement, useEffect } from 'react';
import { useAuthStore } from '@/stores/auth-store';
import { useAppShellStore } from '@/stores/app-shell-store';

export function SystemSettingsBootstrap(): ReactElement | null {
  const token = useAuthStore((state) => state.token);
  const userId = useAuthStore((state) => state.user?.id ?? null);
  const bootstrapAppShell = useAppShellStore((state) => state.bootstrapAppShell);

  useEffect(() => {
    let cancelled = false;

    async function bootstrapSettings(): Promise<void> {
      if (!token || !userId) return;

      try {
        await bootstrapAppShell({ token, userId });
        if (cancelled) return;
      } catch {
        // App shell bootstrap should not block app rendering.
      }
    }

    void bootstrapSettings();

    return () => {
      cancelled = true;
    };
  }, [bootstrapAppShell, token, userId]);

  return null;
}

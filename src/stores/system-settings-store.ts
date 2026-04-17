import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { SystemSettingsDto } from '@/features/system-settings';

const DEFAULT_SYSTEM_SETTINGS: SystemSettingsDto = {
  defaultLanguage: 'tr',
  defaultCurrencyCode: 'TRY',
  defaultTimeZone: 'Europe/Istanbul',
  dateFormat: 'dd.MM.yyyy',
  timeFormat: 'HH:mm',
  numberFormat: 'tr-TR',
  decimalPlaces: 2,
};

interface SystemSettingsState {
  settings: SystemSettingsDto;
  hasLoadedFromApi: boolean;
  setSettings: (settings: SystemSettingsDto) => void;
}

export const useSystemSettingsStore = create<SystemSettingsState>()(
  persist(
    (set) => ({
      settings: DEFAULT_SYSTEM_SETTINGS,
      hasLoadedFromApi: false,
      setSettings: (settings) => set({ settings, hasLoadedFromApi: true }),
    }),
    {
      name: 'system-settings-storage',
      partialize: (state) => ({
        settings: state.settings,
        hasLoadedFromApi: state.hasLoadedFromApi,
      }),
    }
  )
);

export function getDefaultSystemSettings(): SystemSettingsDto {
  return DEFAULT_SYSTEM_SETTINGS;
}

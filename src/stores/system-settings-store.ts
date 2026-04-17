import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { SystemSettingsDto } from '@/features/system-settings';

export const SYSTEM_SETTINGS_CACHE_TTL_MS = 60 * 60 * 1000;
const SUPPORTED_DATE_FORMATS = new Set(['dd.MM.yyyy', 'yyyy-MM-dd', 'MM/dd/yyyy']);
const SUPPORTED_TIME_FORMATS = new Set(['HH:mm', 'HH:mm:ss', 'hh:mm a']);
const SUPPORTED_NUMBER_FORMATS = new Set(['tr-TR', 'en-US', 'de-DE']);

const DEFAULT_SYSTEM_SETTINGS: SystemSettingsDto = {
  defaultLanguage: 'tr',
  defaultCurrencyCode: 'TRY',
  defaultTimeZone: 'Europe/Istanbul',
  dateFormat: 'dd.MM.yyyy',
  timeFormat: 'HH:mm',
  numberFormat: 'tr-TR',
  decimalPlaces: 2,
  restrictCustomersBySalesRepMatch: false,
};

function pickSupportedString(
  value: string | undefined,
  fallback: string,
  supportedValues?: Set<string>
): string {
  const normalizedValue = value?.trim();
  if (!normalizedValue) return fallback;
  if (supportedValues && !supportedValues.has(normalizedValue)) return fallback;
  return normalizedValue;
}

export function normalizeSystemSettings(
  settings?: Partial<SystemSettingsDto> | null
): SystemSettingsDto {
  return {
    defaultLanguage: pickSupportedString(settings?.defaultLanguage, DEFAULT_SYSTEM_SETTINGS.defaultLanguage),
    defaultCurrencyCode: pickSupportedString(settings?.defaultCurrencyCode, DEFAULT_SYSTEM_SETTINGS.defaultCurrencyCode),
    defaultTimeZone: pickSupportedString(settings?.defaultTimeZone, DEFAULT_SYSTEM_SETTINGS.defaultTimeZone),
    dateFormat: pickSupportedString(
      settings?.dateFormat,
      DEFAULT_SYSTEM_SETTINGS.dateFormat,
      SUPPORTED_DATE_FORMATS
    ),
    timeFormat: pickSupportedString(
      settings?.timeFormat,
      DEFAULT_SYSTEM_SETTINGS.timeFormat,
      SUPPORTED_TIME_FORMATS
    ),
    numberFormat: pickSupportedString(
      settings?.numberFormat,
      DEFAULT_SYSTEM_SETTINGS.numberFormat,
      SUPPORTED_NUMBER_FORMATS
    ),
    decimalPlaces:
      typeof settings?.decimalPlaces === 'number' && Number.isInteger(settings.decimalPlaces)
        ? Math.min(6, Math.max(0, settings.decimalPlaces))
        : DEFAULT_SYSTEM_SETTINGS.decimalPlaces,
    restrictCustomersBySalesRepMatch: Boolean(settings?.restrictCustomersBySalesRepMatch),
    updatedAt: settings?.updatedAt,
  };
}

interface SystemSettingsState {
  settings: SystemSettingsDto;
  hasLoadedFromApi: boolean;
  lastFetchedAt: number | null;
  setSettings: (settings: SystemSettingsDto, fetchedAt?: number) => void;
}

export const useSystemSettingsStore = create<SystemSettingsState>()(
  persist(
    (set) => ({
      settings: DEFAULT_SYSTEM_SETTINGS,
      hasLoadedFromApi: false,
      lastFetchedAt: null,
      setSettings: (settings, fetchedAt = Date.now()) =>
        set({
          settings: normalizeSystemSettings(settings),
          hasLoadedFromApi: true,
          lastFetchedAt: fetchedAt,
        }),
    }),
    {
      name: 'system-settings-storage',
      partialize: (state) => ({
        settings: state.settings,
        hasLoadedFromApi: state.hasLoadedFromApi,
        lastFetchedAt: state.lastFetchedAt,
      }),
    }
  )
);

export function getDefaultSystemSettings(): SystemSettingsDto {
  return normalizeSystemSettings(DEFAULT_SYSTEM_SETTINGS);
}

export function getSystemSettingsCacheEntry(): { settings: SystemSettingsDto; hasLoadedFromApi: boolean; lastFetchedAt: number | null } {
  const state = useSystemSettingsStore.getState();
  return {
    settings: normalizeSystemSettings(state.settings),
    hasLoadedFromApi: state.hasLoadedFromApi,
    lastFetchedAt: state.lastFetchedAt,
  };
}

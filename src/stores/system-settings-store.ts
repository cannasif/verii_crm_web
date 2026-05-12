import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { SystemSettingsDto } from '@/features/system-settings';

export const SYSTEM_SETTINGS_CACHE_TTL_MS = 60 * 60 * 1000;
const SUPPORTED_NUMBER_FORMATS = new Set(['tr-TR', 'en-US', 'de-DE']);
const SUPPORTED_DEMAND_ACTIONS = new Set([1, 2, 3, 4, 5]);
const SUPPORTED_QUOTATION_ACTIONS = new Set([1, 2, 3, 4, 5, 6]);
const SUPPORTED_ORDER_ACTIONS = new Set([1, 2, 3, 4]);

const DEFAULT_SYSTEM_SETTINGS: SystemSettingsDto = {
  numberFormat: 'tr-TR',
  decimalPlaces: 2,
  restrictCustomersBySalesRepMatch: false,
  demandApprovalCompletionAction: 1,
  quotationApprovalCompletionAction: 1,
  orderApprovalCompletionAction: 1,
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
    demandApprovalCompletionAction: normalizeActionValue(settings?.demandApprovalCompletionAction, SUPPORTED_DEMAND_ACTIONS),
    quotationApprovalCompletionAction: normalizeActionValue(settings?.quotationApprovalCompletionAction, SUPPORTED_QUOTATION_ACTIONS),
    orderApprovalCompletionAction: normalizeActionValue(settings?.orderApprovalCompletionAction, SUPPORTED_ORDER_ACTIONS),
    updatedAt: settings?.updatedAt,
  };
}

function normalizeActionValue(value: number | undefined, supportedValues: Set<number>): number {
  return typeof value === 'number' && Number.isInteger(value) && supportedValues.has(value)
    ? value
    : 1;
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

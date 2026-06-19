import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { SystemSettingsDto } from '@/features/system-settings';

export const SYSTEM_SETTINGS_CACHE_TTL_MS = 60 * 1000;
const SUPPORTED_NUMBER_FORMATS = new Set(['tr-TR', 'en-US', 'de-DE']);
const SUPPORTED_DEMAND_ACTIONS = new Set([1, 2, 3, 4, 5]);
const SUPPORTED_QUOTATION_ACTIONS = new Set([1, 2, 3, 4, 5, 6]);
const SUPPORTED_ORDER_ACTIONS = new Set([1, 2, 3, 4]);
const DEMAND_ACTION_NAMES: Record<string, number> = {
  NoAction: 1,
  CreateNetsisDemand: 2,
  CreateQuotation: 3,
  CreateNetsisDemandRecord: 4,
  CreateNetsisDemandAndQuotation: 5,
};
const QUOTATION_ACTION_NAMES: Record<string, number> = {
  NoAction: 1,
  CreateNetsisQuotation: 2,
  CreateOrder: 3,
  CreateNetsisOrder: 4,
  CreateNetsisQuotationAndOrder: 5,
  CreateOrderAndNetsisOrder: 6,
};
const ORDER_ACTION_NAMES: Record<string, number> = {
  NoAction: 1,
  CreateNetsisOrder: 2,
  CreateNetsisSalesInvoice: 3,
  CreateNetsisOrderAndSalesInvoice: 4,
};

const DEFAULT_SYSTEM_SETTINGS: SystemSettingsDto = {
  numberFormat: 'tr-TR',
  decimalPlaces: 2,
  restrictCustomersBySalesRepMatch: false,
  hideDemandVatRate: false,
  hideQuotationVatRate: false,
  hideOrderVatRate: false,
  readonlyDemandVatRate: false,
  readonlyQuotationVatRate: false,
  readonlyOrderVatRate: false,
  catalogGroupCodeLabel: null,
  catalogCode1Label: null,
  catalogCode2Label: null,
  catalogCode3Label: null,
  catalogCode4Label: null,
  catalogCode5Label: null,
  customerCodeRuleEnabled: false,
  customerCodeMask: null,
  customerCodeExample: null,
  customerCodeErrorMessage: null,
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
    hideDemandVatRate: Boolean(settings?.hideDemandVatRate),
    hideQuotationVatRate: Boolean(settings?.hideQuotationVatRate),
    hideOrderVatRate: Boolean(settings?.hideOrderVatRate),
    readonlyDemandVatRate: Boolean(settings?.readonlyDemandVatRate),
    readonlyQuotationVatRate: Boolean(settings?.readonlyQuotationVatRate),
    readonlyOrderVatRate: Boolean(settings?.readonlyOrderVatRate),
    catalogGroupCodeLabel: pickOptionalLabel(settings?.catalogGroupCodeLabel),
    catalogCode1Label: pickOptionalLabel(settings?.catalogCode1Label),
    catalogCode2Label: pickOptionalLabel(settings?.catalogCode2Label),
    catalogCode3Label: pickOptionalLabel(settings?.catalogCode3Label),
    catalogCode4Label: pickOptionalLabel(settings?.catalogCode4Label),
    catalogCode5Label: pickOptionalLabel(settings?.catalogCode5Label),
    customerCodeRuleEnabled: Boolean(settings?.customerCodeRuleEnabled),
    customerCodeMask: pickOptionalLabel(settings?.customerCodeMask),
    customerCodeExample: pickOptionalLabel(settings?.customerCodeExample),
    customerCodeErrorMessage: pickOptionalString(settings?.customerCodeErrorMessage, 250),
    demandApprovalCompletionAction: normalizeActionValue(
      settings?.demandApprovalCompletionAction,
      SUPPORTED_DEMAND_ACTIONS,
      DEMAND_ACTION_NAMES
    ),
    quotationApprovalCompletionAction: normalizeActionValue(
      settings?.quotationApprovalCompletionAction,
      SUPPORTED_QUOTATION_ACTIONS,
      QUOTATION_ACTION_NAMES
    ),
    orderApprovalCompletionAction: normalizeActionValue(
      settings?.orderApprovalCompletionAction,
      SUPPORTED_ORDER_ACTIONS,
      ORDER_ACTION_NAMES
    ),
    updatedAt: settings?.updatedAt,
  };
}

function pickOptionalLabel(value: string | null | undefined): string | null {
  return pickOptionalString(value, 50);
}

function pickOptionalString(value: string | null | undefined, maxLength: number): string | null {
  const normalizedValue = value?.trim();
  return normalizedValue ? normalizedValue.slice(0, maxLength) : null;
}

function normalizeActionValue(
  value: number | string | undefined,
  supportedValues: Set<number>,
  namedValues: Record<string, number>
): number {
  if (typeof value === 'number' && Number.isInteger(value) && supportedValues.has(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const trimmedValue = value.trim();
    const numericValue = Number(trimmedValue);
    if (Number.isInteger(numericValue) && supportedValues.has(numericValue)) {
      return numericValue;
    }

    const namedValue = namedValues[trimmedValue];
    if (supportedValues.has(namedValue)) {
      return namedValue;
    }
  }

  return 1;
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

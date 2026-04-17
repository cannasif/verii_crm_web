import i18n from '@/lib/i18n';
import { getDefaultSystemSettings, useSystemSettingsStore } from '@/stores/system-settings-store';

function getSettings() {
  return useSystemSettingsStore.getState().settings ?? getDefaultSystemSettings();
}

function getActiveLanguage(): string {
  return (i18n.resolvedLanguage || i18n.language || 'tr').split('-')[0].toLowerCase();
}

function getActiveLocale(): string {
  return i18n.resolvedLanguage || i18n.language || 'tr';
}

export function getSystemLocale(): string {
  const settings = getSettings();
  return settings.numberFormat || (getActiveLanguage() === 'tr' ? 'tr-TR' : getActiveLocale());
}

export function getSystemTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
}

export function getSystemCurrency(): string {
  return getSettings().defaultCurrencyCode || 'TRY';
}

export function getSystemDecimalPlaces(): number {
  const value = getSettings().decimalPlaces;
  return Number.isFinite(value) ? value : 2;
}

export async function applySystemLanguageIfNeeded(): Promise<void> {
  return Promise.resolve();
}

function fallbackFormat(value: number, currencyCode?: string): string {
  const precision = getSystemDecimalPlaces();
  const formatted = new Intl.NumberFormat(getSystemLocale(), {
    style: 'decimal',
    minimumFractionDigits: precision,
    maximumFractionDigits: precision,
  }).format(value);
  return currencyCode ? `${formatted} ${currencyCode}` : formatted;
}

export function formatSystemNumber(
  value: number,
  options?: { minimumFractionDigits?: number; maximumFractionDigits?: number }
): string {
  const precision = getSystemDecimalPlaces();
  return new Intl.NumberFormat(getSystemLocale(), {
    style: 'decimal',
    minimumFractionDigits: options?.minimumFractionDigits ?? precision,
    maximumFractionDigits: options?.maximumFractionDigits ?? precision,
  }).format(value);
}

export function formatSystemCurrency(value: number, currencyCode?: string): string {
  const currency = currencyCode || getSystemCurrency();
  const precision = getSystemDecimalPlaces();

  try {
    return new Intl.NumberFormat(getSystemLocale(), {
      style: 'currency',
      currency,
      minimumFractionDigits: precision,
      maximumFractionDigits: precision,
    }).format(value);
  } catch {
    return fallbackFormat(value, currency);
  }
}

function parseDateValue(value: string | Date | number): Date | null {
  const parsed = value instanceof Date ? value : new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatDateValue(
  value: string | Date | number,
  options: Intl.DateTimeFormatOptions
): string {
  const parsed = parseDateValue(value);
  if (!parsed) return '-';

  return new Intl.DateTimeFormat(getActiveLocale(), {
    timeZone: getSystemTimeZone(),
    ...options,
  }).format(parsed);
}

export function formatSystemDate(value: string | Date | number): string {
  return formatDateValue(value, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

export function formatSystemDateTime(value: string | Date | number): string {
  return formatDateValue(value, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatSystemTime(value: string | Date | number): string {
  return formatDateValue(value, {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function getSystemDatePickerLocale(): string {
  return new Intl.DateTimeFormat(getActiveLocale(), {
    timeZone: getSystemTimeZone(),
  }).resolvedOptions().locale;
}

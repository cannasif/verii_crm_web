import i18n from '@/lib/i18n';
import { useSystemSettingsStore, getDefaultSystemSettings } from '@/stores/system-settings-store';

function getSettings() {
  return useSystemSettingsStore.getState().settings ?? getDefaultSystemSettings();
}

export function getSystemLanguage(): string {
  return getSettings().defaultLanguage || 'tr';
}

export function getSystemLocale(): string {
  const settings = getSettings();
  return settings.numberFormat || (settings.defaultLanguage === 'tr' ? 'tr-TR' : settings.defaultLanguage);
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

function getDatePattern(): string {
  return getSettings().dateFormat || 'dd.MM.yyyy';
}

function getTimePattern(): string {
  return getSettings().timeFormat || 'HH:mm';
}

export async function applySystemLanguageIfNeeded(): Promise<void> {
  const userSelectedLanguage =
    typeof window !== 'undefined' ? window.localStorage.getItem('i18nextLng') : null;
  if (userSelectedLanguage) return;

  const targetLanguage = getSystemLanguage();
  const normalizedCurrent = (i18n.language || 'tr').split('-')[0].toLowerCase();
  if (normalizedCurrent === targetLanguage.toLowerCase()) return;

  await i18n.changeLanguage(targetLanguage);
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

function getDateParts(parsed: Date): Record<string, string> {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: getSystemTimeZone(),
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(parsed);

  return {
    dd: parts.find((part) => part.type === 'day')?.value ?? '',
    MM: parts.find((part) => part.type === 'month')?.value ?? '',
    yyyy: parts.find((part) => part.type === 'year')?.value ?? '',
    HH: parts.find((part) => part.type === 'hour')?.value ?? '',
    mm: parts.find((part) => part.type === 'minute')?.value ?? '',
  };
}

function applyPattern(pattern: string, parts: Record<string, string>): string {
  return pattern
    .replace(/yyyy/g, parts.yyyy)
    .replace(/dd/g, parts.dd)
    .replace(/MM/g, parts.MM)
    .replace(/HH/g, parts.HH)
    .replace(/mm/g, parts.mm);
}

function parseDateValue(value: string | Date | number): Date | null {
  const parsed = value instanceof Date ? value : new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function formatSystemDate(value: string | Date | number): string {
  const parsed = parseDateValue(value);
  if (!parsed) return '-';

  return applyPattern(getDatePattern(), getDateParts(parsed));
}

export function formatSystemDateTime(value: string | Date | number): string {
  const parsed = parseDateValue(value);
  if (!parsed) return '-';

  const parts = getDateParts(parsed);
  return `${applyPattern(getDatePattern(), parts)} ${applyPattern(getTimePattern(), parts)}`.trim();
}

export function formatSystemTime(value: string | Date | number): string {
  const parsed = parseDateValue(value);
  if (!parsed) return '-';

  return applyPattern(getTimePattern(), getDateParts(parsed));
}

export function getSystemDatePickerLocale(): string {
  return new Intl.DateTimeFormat(getSystemLocale(), {
    timeZone: getSystemTimeZone(),
  }).resolvedOptions().locale;
}

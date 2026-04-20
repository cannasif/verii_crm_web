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
  return 'TRY';
}

export function getSystemDecimalPlaces(): number {
  const value = getSettings().decimalPlaces;
  return Number.isFinite(value) ? value : 2;
}

function clampFractionDigits(places: number): number {
  if (!Number.isFinite(places)) return 2;
  return Math.min(6, Math.max(0, Math.round(places)));
}

function roundToFractionDigits(value: number, fractionDigits: number): number {
  const p = clampFractionDigits(fractionDigits);
  if (!Number.isFinite(value)) return NaN;
  if (p === 0) return Math.round(value);
  const m = 10 ** p;
  return Math.round(value * m) / m;
}

/**
 * Controlled `<input type="number">` value: always `.` as decimal separator, fixed fractional digits.
 * Uses Sistem Ayarları `decimalPlaces` unless `fractionDigits` is passed.
 */
export function formatHtmlNumberInputDraft(
  value: number | null | undefined,
  options?: { fractionDigits?: number }
): string {
  if (value == null || typeof value !== 'number' || !Number.isFinite(value)) return '';
  const digits = options?.fractionDigits ?? getSystemDecimalPlaces();
  const p = clampFractionDigits(digits);
  const rounded = roundToFractionDigits(value, p);
  if (p === 0) return String(rounded);
  return rounded.toFixed(p);
}

/** `step` for `<input type="number">` aligned with fractional digit precision (e.g. 4 → 0.0001). */
export function getHtmlNumberInputStepForDecimals(fractionDigits?: number): string {
  const p = clampFractionDigits(fractionDigits ?? getSystemDecimalPlaces());
  if (p <= 0) return '1';
  const step = 1 / 10 ** p;
  return step.toFixed(p);
}

/**
 * Miktar tam sayı olmalı (oklar ±1 adet): AD/ADET ve yaygın ERP kodları.
 * Birim metni farklı yazılmış olsa da (ör. sondaki nokta) eşleşir.
 */
export function isIntegerQuantityUnit(unit: string | null | undefined): boolean {
  const u = (unit ?? '')
    .trim()
    .toUpperCase()
    .replace(/\u00A0/g, '')
    .replace(/\.+$/g, '');
  if (u === 'AD' || u === 'ADET') return true;
  if (u === 'ADT' || u === 'PCS' || u === 'PCE' || u === 'PC') return true;
  return false;
}

/** Line table quick-edit draft: quantity (AD/ADET = integer), unit price & discount rates use system decimals. */
export function formatLineTableQuickEditDraft(
  field: string,
  value: number | null | undefined,
  options?: { unit?: string | null }
): string {
  if (value == null || typeof value !== 'number' || !Number.isFinite(value)) return '';

  if (field === 'quantity') {
    if (isIntegerQuantityUnit(options?.unit)) return String(Math.max(1, Math.round(value)));
    return formatHtmlNumberInputDraft(value);
  }

  if (field === 'unitPrice') {
    return formatHtmlNumberInputDraft(value);
  }

  if (field === 'discountRate1' || field === 'discountRate2' || field === 'discountRate3') {
    return formatHtmlNumberInputDraft(value);
  }

  return formatHtmlNumberInputDraft(value);
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

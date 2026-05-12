import { getSystemDecimalPlaces } from '@/lib/system-settings';

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

function stripTrailingZerosFromFraction(fraction: string): string {
  return fraction.replace(/0+$/, '');
}

function formatIntegerDigitsWithDots(integerDigits: string): string {
  const onlyDigits = integerDigits.replace(/\D/g, '');
  if (!onlyDigits) return '';
  const noLeadingZeros = onlyDigits.replace(/^0+(?=\d)/, '') || '0';
  const rev = [...noLeadingZeros].reverse();
  const groups: string[] = [];
  for (let i = 0; i < rev.length; i += 3) {
    groups.push(rev.slice(i, i + 3).reverse().join(''));
  }
  return groups.reverse().join('.');
}

export function sanitizeMonetaryTrTyping(raw: string, maxFractionDigits: number): string {
  const maxF = clampFractionDigits(maxFractionDigits);
  if (maxF === 0) {
    const digitsOnly = raw.replace(/\s/g, '').replace(/\./g, '').replace(/[^\d]/g, '');
    if (!digitsOnly) return '';
    return formatIntegerDigitsWithDots(digitsOnly);
  }
  const s0 = raw.replace(/\s/g, '').replace(/[^\d.,]/g, '');
  const commaIdx = s0.indexOf(',');
  let intRaw = commaIdx === -1 ? s0 : s0.slice(0, commaIdx);
  let decRaw = commaIdx === -1 ? '' : s0.slice(commaIdx + 1).replace(/,/g, '');
  intRaw = intRaw.replace(/\./g, '').replace(/[^\d]/g, '');
  decRaw = decRaw.replace(/[^\d]/g, '').slice(0, maxF);
  const endsWithComma = commaIdx !== -1 && decRaw === '' && s0.endsWith(',');
  if (!intRaw && !decRaw) {
    if (endsWithComma) return ',';
    return '';
  }
  let intDigits = intRaw;
  if (!intDigits && decRaw) {
    intDigits = '0';
  }
  const grouped = intDigits ? formatIntegerDigitsWithDots(intDigits) : '';
  if (endsWithComma) {
    return `${grouped || '0'},`;
  }
  if (decRaw) {
    return `${grouped || '0'},${decRaw}`;
  }
  return grouped;
}

export function parseMonetaryTrDraft(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const withoutDots = trimmed.replace(/\./g, '');
  const commaI = withoutDots.indexOf(',');
  const intDigits = (commaI === -1 ? withoutDots : withoutDots.slice(0, commaI)).replace(/\D/g, '');
  const decDigits = commaI === -1 ? '' : withoutDots.slice(commaI + 1).replace(/\D/g, '');
  if (!intDigits && !decDigits) return null;
  const normalized = decDigits ? `${intDigits || '0'}.${decDigits}` : intDigits || '0';
  const n = Number.parseFloat(normalized);
  return Number.isFinite(n) ? n : null;
}

export function formatMonetaryTrDraftFromNumber(
  value: number | null | undefined,
  options?: { fractionDigits?: number }
): string {
  if (value == null || typeof value !== 'number' || !Number.isFinite(value)) return '';
  if (value === 0) return '0';
  const p = clampFractionDigits(options?.fractionDigits ?? getSystemDecimalPlaces());
  const rounded = roundToFractionDigits(value, p);
  if (!Number.isFinite(rounded) || rounded === 0) return '0';
  if (p === 0) {
    return formatIntegerDigitsWithDots(String(Math.round(rounded)));
  }
  const fixed = rounded.toFixed(p);
  const [intPart, fracPart = ''] = fixed.split('.');
  const fracTrimmed = stripTrailingZerosFromFraction(fracPart);
  const intGrouped = formatIntegerDigitsWithDots(intPart);
  if (!fracTrimmed) return intGrouped;
  return `${intGrouped},${fracTrimmed}`;
}

export function normalizeMonetaryTrOnBlur(
  raw: string,
  options?: { fractionDigits?: number }
): { display: string; numeric: number } {
  const p = clampFractionDigits(options?.fractionDigits ?? getSystemDecimalPlaces());
  const n = parseMonetaryTrDraft(raw);
  if (n === null || n < 0) {
    return { display: '0', numeric: 0 };
  }
  const rounded = roundToFractionDigits(n, p);
  if (!Number.isFinite(rounded) || rounded === 0) {
    return { display: '0', numeric: 0 };
  }
  return { display: formatMonetaryTrDraftFromNumber(rounded, { fractionDigits: p }), numeric: rounded };
}

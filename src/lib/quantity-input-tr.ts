import { getSystemDecimalPlaces } from '@/lib/system-settings';
import {
  formatMonetaryTrDraftFromNumber,
  normalizeMonetaryTrOnBlur,
  sanitizeMonetaryTrTyping,
} from '@/lib/monetary-input-tr';

export function formatQuantityTrDraftFromNumber(
  value: number | null | undefined,
  _unit?: string | null | undefined
): string {
  if (value == null || typeof value !== 'number' || !Number.isFinite(value)) {
    return '0';
  }
  return formatMonetaryTrDraftFromNumber(value);
}

export function formatQuantityInputDraftFromNumber(
  value: number | null | undefined,
  unit?: string | null | undefined
): string {
  return formatQuantityTrDraftFromNumber(value, unit);
}

export function sanitizeQuantityTrTyping(raw: string, _unit?: string | null | undefined): string {
  return sanitizeMonetaryTrTyping(raw, getSystemDecimalPlaces());
}

export function normalizeQuantityTrOnBlur(
  raw: string,
  _unit?: string | null | undefined
): { display: string; numeric: number } {
  return normalizeMonetaryTrOnBlur(raw);
}

export { parseMonetaryTrDraft as parseQuantityTrDraft } from '@/lib/monetary-input-tr';

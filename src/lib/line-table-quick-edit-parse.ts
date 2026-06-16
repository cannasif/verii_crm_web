import { parseMonetaryTrDraft } from '@/lib/monetary-input-tr';

export function parseLineTableQuickEditNumericValue(field: string, draft: string): number | null {
  const trimmed = draft.trim();
  if (!trimmed) return null;

  if (field === 'unitPrice') {
    return parseMonetaryTrDraft(trimmed);
  }

  const normalized = trimmed.replace(',', '.');
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

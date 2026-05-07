type TranslateFn = (key: string, options?: { defaultValue?: string }) => string;

export function formatSalesmen360PeriodLabel(value: string, locale: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    return trimmed;
  }

  const yMonth = /^(\d{4})-(\d{2})$/u.exec(trimmed);
  if (yMonth) {
    const y = Number(yMonth[1]);
    const monthIndex = Number(yMonth[2]) - 1;
    if (monthIndex >= 0 && monthIndex <= 11) {
      const date = new Date(y, monthIndex, 1);
      return date.toLocaleDateString(locale, { month: 'short', year: 'numeric' });
    }
  }

  const ymd = /^(\d{4})-(\d{2})-(\d{2})/u.exec(trimmed);
  if (ymd) {
    const y = Number(ymd[1]);
    const monthIndex = Number(ymd[2]) - 1;
    const d = Number(ymd[3]);
    const date = new Date(y, monthIndex, d);
    if (!Number.isNaN(date.getTime())) {
      return date.toLocaleDateString(locale, { month: 'short', year: 'numeric' });
    }
  }

  const parsed = Date.parse(trimmed);
  if (!Number.isNaN(parsed)) {
    return new Date(parsed).toLocaleDateString(locale, { month: 'short', year: 'numeric' });
  }

  return trimmed;
}

export function translateSalesmen360RfmSegment(
  segment: string | null | undefined,
  translate: TranslateFn
): string {
  if (segment == null || segment === '') {
    return '-';
  }
  const trimmed = segment.trim();
  if (!trimmed) {
    return '-';
  }

  const keyBase = trimmed
    .replace(/\s+/g, '_')
    .replace(/[^a-zA-Z0-9_]/gu, '')
    .replace(/_+/gu, '_')
    .replace(/^_|_$/gu, '')
    .toUpperCase();

  if (!keyBase) {
    return trimmed;
  }

  return translate(`salesman360.segmentLabels.${keyBase}`, { defaultValue: trimmed });
}

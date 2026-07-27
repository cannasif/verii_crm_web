export function formatPerformanceDate(value: string, locale: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';

  return new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function formatPerformanceAmount(
  value: number,
  currency: string,
  locale: string
): string {
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    const amount = new Intl.NumberFormat(locale, {
      maximumFractionDigits: 2,
    }).format(value);
    return `${amount} ${currency}`;
  }
}

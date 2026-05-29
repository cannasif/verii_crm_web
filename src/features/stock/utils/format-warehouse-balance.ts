export function formatWarehouseBalance(value: number): string {
  return new Intl.NumberFormat('tr-TR', {
    minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatWarehouseBalanceWithUnit(value: number, unit?: string | null): string {
  const formatted = formatWarehouseBalance(value);
  const normalizedUnit = unit?.trim();
  if (!normalizedUnit) {
    return formatted;
  }
  return `${formatted} ${normalizedUnit}`;
}

export function formatWarehouseSyncDate(value: string | null | undefined, locale: string): string {
  if (!value) {
    return '—';
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return '—';
  }
  return parsed.toLocaleString(locale);
}

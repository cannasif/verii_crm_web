import { formatSystemCurrency } from '@/lib/system-settings';

export function formatCurrency(amount: number, currencyCode: string): string {
  return formatSystemCurrency(amount, currencyCode);
}

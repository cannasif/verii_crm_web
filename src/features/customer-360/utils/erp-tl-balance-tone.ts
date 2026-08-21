export const ERP_BALANCE_EPSILON = 1e-6;

export type ErpTlBalanceTone = 'success' | 'danger' | 'neutral';

/**
 * Netsis'te 120 ile başlayan müşteri hesaplarında bakiye yönünün görsel
 * anlamı, 320 hesaplarının tersidir. Diğer hesap grupları mevcut davranışı
 * korur.
 */
export function resolveErpTlBalanceTone(
  value: number,
  customerCode?: string | null
): ErpTlBalanceTone {
  if (!Number.isFinite(value) || Math.abs(value) <= ERP_BALANCE_EPSILON) {
    return 'neutral';
  }

  const isReceivableAccount = customerCode?.trim().startsWith('120') ?? false;
  const isPositive = value > 0;

  if (isReceivableAccount) {
    return isPositive ? 'danger' : 'success';
  }

  return isPositive ? 'success' : 'danger';
}

import type { PagedFilter } from '@/types/api';

/** Teklif / sipariş / aktivite sekmelerinde aynı müşteri eşlemesi. */
export function buildCustomerDocumentFilters(
  customerCode?: string | null,
  customerName?: string | null
): PagedFilter[] {
  if (customerCode?.trim()) {
    return [{ column: 'ErpCustomerCode', operator: 'Equals', value: customerCode.trim() }];
  }
  if (customerName?.trim()) {
    return [{ column: 'PotentialCustomerName', operator: 'Equals', value: customerName.trim() }];
  }
  return [];
}

import type { NetsisOrderHeader } from '@/features/order/types/erp-order-types';

export function normalizeCariCode(code: string | null | undefined): string | null {
  if (!code) return null;
  const trimmed = code.trim();
  return trimmed.length > 0 ? trimmed.toUpperCase() : null;
}

export function filterOrdersForCustomer(
  allOrders: NetsisOrderHeader[],
  customerCode: string
): NetsisOrderHeader[] {
  const target = normalizeCariCode(customerCode);
  if (!target) return [];

  return allOrders.filter((order) => normalizeCariCode(order.cariKodu) === target);
}

export function sortOrdersByDateDesc(orders: NetsisOrderHeader[]): NetsisOrderHeader[] {
  return [...orders].sort((a, b) => {
    const left = a.tarih ?? '';
    const right = b.tarih ?? '';
    return right.localeCompare(left);
  });
}

export function paginateClient<T>(
  items: T[],
  page: number,
  pageSize: number
): {
  data: T[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
  totalPages: number;
} {
  const start = (page - 1) * pageSize;
  return {
    data: items.slice(start, start + pageSize),
    totalCount: items.length,
    pageNumber: page,
    pageSize,
    totalPages: Math.ceil(items.length / pageSize) || 0,
  };
}

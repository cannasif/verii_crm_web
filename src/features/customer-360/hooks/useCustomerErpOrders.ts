import { useMemo } from 'react';
import { isAxiosError } from 'axios';
import { useErpOrders } from '@/features/order/hooks/useErpOrders';
import {
  filterOrdersForCustomer,
  normalizeCariCode,
  sortOrdersByDateDesc,
} from '../utils/erp-order-customer-filter';

export type CustomerErpOrdersSkipReason = 'no-cari' | 'forbidden' | null;

export function useCustomerErpOrders(params: {
  customerCode?: string | null;
  canViewErpOrders: boolean;
}) {
  const { customerCode, canViewErpOrders } = params;
  const normalizedCode = useMemo(() => normalizeCariCode(customerCode), [customerCode]);
  const hasCariCode = Boolean(normalizedCode);

  const erpOrdersQuery = useErpOrders({
    enabled: canViewErpOrders && hasCariCode,
  });

  const skipped: CustomerErpOrdersSkipReason = !canViewErpOrders
    ? 'forbidden'
    : !hasCariCode
      ? 'no-cari'
      : null;

  const isForbidden =
    skipped === 'forbidden' ||
    (erpOrdersQuery.isError &&
      isAxiosError(erpOrdersQuery.error) &&
      erpOrdersQuery.error.response?.status === 403);

  const orders = useMemo(() => {
    if (!normalizedCode || !erpOrdersQuery.data) return [];
    return sortOrdersByDateDesc(filterOrdersForCustomer(erpOrdersQuery.data, normalizedCode));
  }, [erpOrdersQuery.data, normalizedCode]);

  return {
    orders,
    normalizedCode,
    skipped: isForbidden ? ('forbidden' as const) : skipped,
    isLoading: hasCariCode && canViewErpOrders && erpOrdersQuery.isLoading,
    isError: hasCariCode && canViewErpOrders && erpOrdersQuery.isError && !isForbidden,
    error: erpOrdersQuery.error,
    refetch: erpOrdersQuery.refetch,
    isFetching: erpOrdersQuery.isFetching,
  };
}

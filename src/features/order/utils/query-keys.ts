import type { PagedParams, PagedFilter } from '@/types/api';

export const QUOTATION_QUERY_KEYS = {
  QUOTATIONS: 'order.orders',
  QUOTATION: 'order.order',
  CUSTOMERS: 'order.customers',
  SHIPPING_ADDRESSES: 'order.shippingAddresses',
  USERS: 'order.users',
  PAYMENT_TYPES: 'order.paymentTypes',
  PRODUCTS: 'order.products',
  CAN_EDIT: 'order.canEdit',
  APPROVAL_STATUS: 'order.approvalStatus',
  PRICE_RULE_OF_QUOTATION: 'order.priceRuleOfOrder',
  WAITING_APPROVALS: 'order.waitingApprovals',
  QUOTATION_EXCHANGE_RATES: 'order.exchangeRates',
  QUOTATION_LINES: 'order.lines',
  ORDER_NOTES: 'order.notes',
  RELATED_USERS: 'order.relatedUsers',
  APPROVAL_FLOW_REPORT: 'order.approvalFlowReport',
} as const;

export const queryKeys = {
  orders: (params?: PagedParams & { filters?: PagedFilter[] | Record<string, unknown> }) => 
    [QUOTATION_QUERY_KEYS.QUOTATIONS, params] as const,
  order: (id: number) => [QUOTATION_QUERY_KEYS.QUOTATION, id] as const,
  customers: (search?: string) => [QUOTATION_QUERY_KEYS.CUSTOMERS, search] as const,
  shippingAddresses: (customerId?: number) => [QUOTATION_QUERY_KEYS.SHIPPING_ADDRESSES, customerId] as const,
  users: () => [QUOTATION_QUERY_KEYS.USERS] as const,
  paymentTypes: () => [QUOTATION_QUERY_KEYS.PAYMENT_TYPES] as const,
  products: (search?: string) => [QUOTATION_QUERY_KEYS.PRODUCTS, search] as const,
  canEdit: (orderId: number) => [QUOTATION_QUERY_KEYS.CAN_EDIT, orderId] as const,
  approvalStatus: (orderId: number) => [QUOTATION_QUERY_KEYS.APPROVAL_STATUS, orderId] as const,
  priceRuleOfOrder: (customerCode: string, salesmenId: number, orderDate: string) => 
    [QUOTATION_QUERY_KEYS.PRICE_RULE_OF_QUOTATION, customerCode, salesmenId, orderDate] as const,
  userDiscountLimitsBySalesperson: (salespersonId: number) => ['user-discount-limits', 'salesperson', salespersonId] as const,
  waitingApprovals: () => [QUOTATION_QUERY_KEYS.WAITING_APPROVALS] as const,
  orderExchangeRates: (orderId: number) => [QUOTATION_QUERY_KEYS.QUOTATION_EXCHANGE_RATES, orderId] as const,
  orderLines: (orderId: number) => [QUOTATION_QUERY_KEYS.QUOTATION_LINES, orderId] as const,
  orderNotes: (orderId: number) => [QUOTATION_QUERY_KEYS.ORDER_NOTES, orderId] as const,
  relatedUsers: (userId: number) => [QUOTATION_QUERY_KEYS.RELATED_USERS, userId] as const,
  approvalFlowReport: (orderId: number) => [QUOTATION_QUERY_KEYS.APPROVAL_FLOW_REPORT, orderId] as const,
};

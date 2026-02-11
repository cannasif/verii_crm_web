import type { PagedParams, PagedFilter } from '@/types/api';

export const DEMAND_QUERY_KEYS = {
  DEMANDS: 'demand.demands',
  DEMAND: 'demand.demand',
  CUSTOMERS: 'demand.customers',
  SHIPPING_ADDRESSES: 'demand.shippingAddresses',
  USERS: 'demand.users',
  PAYMENT_TYPES: 'demand.paymentTypes',
  PRODUCTS: 'demand.products',
  CAN_EDIT: 'demand.canEdit',
  APPROVAL_STATUS: 'demand.approvalStatus',
  PRICE_RULE_OF_DEMAND: 'demand.priceRuleOfDemand',
  WAITING_APPROVALS: 'demand.waitingApprovals',
  DEMAND_EXCHANGE_RATES: 'demand.exchangeRates',
  DEMAND_LINES: 'demand.lines',
  DEMAND_NOTES: 'demand.notes',
  RELATED_USERS: 'demand.relatedUsers',
  APPROVAL_FLOW_REPORT: 'demand.approvalFlowReport',
} as const;

export const queryKeys = {
  demands: (params?: PagedParams & { filters?: PagedFilter[] | Record<string, unknown> }) => 
    [DEMAND_QUERY_KEYS.DEMANDS, params] as const,
  demand: (id: number) => [DEMAND_QUERY_KEYS.DEMAND, id] as const,
  customers: (search?: string) => [DEMAND_QUERY_KEYS.CUSTOMERS, search] as const,
  shippingAddresses: (customerId?: number) => [DEMAND_QUERY_KEYS.SHIPPING_ADDRESSES, customerId] as const,
  users: () => [DEMAND_QUERY_KEYS.USERS] as const,
  paymentTypes: () => [DEMAND_QUERY_KEYS.PAYMENT_TYPES] as const,
  products: (search?: string) => [DEMAND_QUERY_KEYS.PRODUCTS, search] as const,
  canEdit: (demandId: number) => [DEMAND_QUERY_KEYS.CAN_EDIT, demandId] as const,
  approvalStatus: (demandId: number) => [DEMAND_QUERY_KEYS.APPROVAL_STATUS, demandId] as const,
  priceRuleOfDemand: (customerCode: string, salesmenId: number, demandDate: string) => 
    [DEMAND_QUERY_KEYS.PRICE_RULE_OF_DEMAND, customerCode, salesmenId, demandDate] as const,
  userDiscountLimitsBySalesperson: (salespersonId: number) => ['user-discount-limits', 'salesperson', salespersonId] as const,
  waitingApprovals: () => [DEMAND_QUERY_KEYS.WAITING_APPROVALS] as const,
  demandExchangeRates: (demandId: number) => [DEMAND_QUERY_KEYS.DEMAND_EXCHANGE_RATES, demandId] as const,
  demandLines: (demandId: number) => [DEMAND_QUERY_KEYS.DEMAND_LINES, demandId] as const,
  demandNotes: (demandId: number) => [DEMAND_QUERY_KEYS.DEMAND_NOTES, demandId] as const,
  relatedUsers: (userId: number) => [DEMAND_QUERY_KEYS.RELATED_USERS, userId] as const,
  approvalFlowReport: (demandId: number) => [DEMAND_QUERY_KEYS.APPROVAL_FLOW_REPORT, demandId] as const,
};

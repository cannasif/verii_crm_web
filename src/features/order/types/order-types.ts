export const ApprovalLevel = {
  SalesManager: 1,
  RegionalManager: 2,
  Finance: 3,
  GeneralManager: 4,
} as const;

export type ApprovalLevel = typeof ApprovalLevel[keyof typeof ApprovalLevel];

export const ApprovalStatus = {
  NotRequired: 0,
  Waiting: 1,
  Approved: 2,
  Rejected: 3,
  Closed: 4,
} as const;

export type ApprovalStatus = typeof ApprovalStatus[keyof typeof ApprovalStatus];

export { OfferType, type OfferTypeValue, DEFAULT_OFFER_TYPE, normalizeOfferType } from '@/types/offer-type';

export interface OrderNotesGetDto {
  id?: number;
  orderId: number;
  note1?: string | null;
  note2?: string | null;
  note3?: string | null;
  note4?: string | null;
  note5?: string | null;
  note6?: string | null;
  note7?: string | null;
  note8?: string | null;
  note9?: string | null;
  note10?: string | null;
  note11?: string | null;
  note12?: string | null;
  note13?: string | null;
  note14?: string | null;
  note15?: string | null;
}

export interface UpdateOrderNotesListDto {
  notes?: string[];
}

export interface OrderBulkCreateDto {
  order: CreateOrderDto;
  lines: CreateOrderLineDto[];
  exchangeRates?: OrderExchangeRateCreateDto[];
}

export interface CreateOrderDto {
  potentialCustomerId?: number | null;
  erpCustomerCode?: string | null;
  deliveryDate?: string | null;
  shippingAddressId?: number | null;
  representativeId?: number | null;
  projectCode?: string | null;
  status?: number | null;
  description?: string | null;
  paymentTypeId?: number | null;
  documentSerialTypeId?: number | null;
  offerType: string;
  deliveryMethod?: string | null;
  salesTypeDefinitionId?: number | null;
  erpProjectCode?: string | null;
  offerDate?: string | null;
  offerNo?: string | null;
  revisionNo?: string | null;
  revisionId?: number | null;
  currency: string;
  generalDiscountRate?: number | null;
  generalDiscountAmount?: number | null;
}

export interface CreateOrderLineDto {
  orderId: number;
  productId?: number | null;
  productCode: string;
  productName: string;
  groupCode?: string | null;
  quantity: number;
  unitPrice: number;
  discountRate1: number;
  discountAmount1: number;
  discountRate2: number;
  discountAmount2: number;
  discountRate3: number;
  discountAmount3: number;
  vatRate: number;
  vatAmount: number;
  lineTotal: number;
  lineGrandTotal: number;
  description?: string | null;
  description1?: string | null;
  description2?: string | null;
  description3?: string | null;
  pricingRuleHeaderId?: number | null;
  projectCode?: string | null;
  erpProjectCode?: string | null;
  imagePath?: string | null;
  relatedStockId?: number | null;
  relatedProductKey?: string | null;
  isMainRelatedProduct?: boolean;
  approvalStatus?: ApprovalStatus;
}

export interface UpdateOrderLineDto {
  productId: number;
  productCode?: string | null;
  productName: string;
  groupCode?: string | null;
  quantity: number;
  unitPrice: number;
  discountRate1: number;
  discountAmount1: number;
  discountRate2: number;
  discountAmount2: number;
  discountRate3: number;
  discountAmount3: number;
  vatRate: number;
  vatAmount: number;
  lineTotal: number;
  lineGrandTotal: number;
  description?: string | null;
  description1?: string | null;
  description2?: string | null;
  description3?: string | null;
  pricingRuleHeaderId?: number | null;
  projectCode?: string | null;
  erpProjectCode?: string | null;
  imagePath?: string | null;
  relatedStockId?: number | null;
  relatedProductKey?: string | null;
  isMainRelatedProduct?: boolean;
  approvalStatus?: ApprovalStatus;
}

export interface OrderLineGetDto {
  id: number;
  orderId: number;
  productId?: number | null;
  productCode?: string | null;
  productName: string;
  unit?: string | null;
  groupCode?: string | null;
  quantity: number;
  unitPrice: number;
  discountRate1: number;
  discountAmount1: number;
  discountRate2: number;
  discountAmount2: number;
  discountRate3: number;
  discountAmount3: number;
  vatRate: number;
  vatAmount: number;
  lineTotal: number;
  lineGrandTotal: number;
  description?: string | null;
  description1?: string | null;
  description2?: string | null;
  description3?: string | null;
  pricingRuleHeaderId?: number | null;
  projectCode?: string | null;
  erpProjectCode?: string | null;
  imagePath?: string | null;
  relatedStockId?: number | null;
  relatedProductKey?: string | null;
  isMainRelatedProduct?: boolean;
  approvalStatus?: ApprovalStatus;
  createdAt: string;
  updatedAt?: string | null;
}

export interface OrderExchangeRateCreateDto {
  orderId: number;
  currency: string;
  exchangeRate: number;
  exchangeRateDate: string;
  isOfficial?: boolean;
}

export interface OrderGetDto {
  id: number;
  potentialCustomerId?: number | null;
  potentialCustomerName?: string | null;
  erpCustomerCode?: string | null;
  deliveryDate?: string | null;
  shippingAddressId?: number | null;
  shippingAddressText?: string | null;
  representativeId?: number | null;
  representativeName?: string | null;
  projectCode?: string | null;
  status?: number | null;
  description?: string | null;
  paymentTypeId?: number | null;
  paymentTypeName?: string | null;
  documentSerialTypeId?: number | null;
  offerType: string;
  deliveryMethod?: string | null;
  salesTypeDefinitionId?: number | null;
  salesTypeDefinitionName?: string | null;
  erpProjectCode?: string | null;
  offerDate?: string | null;
  offerNo?: string | null;
  revisionNo?: string | null;
  revisionId?: number | null;
  currency: string;
  currencyCode?: string | null;
  currencyDisplay?: string | null;
  total: number;
  grandTotal: number;
  grandTotalDisplay?: string | null;
  hasCustomerSpecificDiscount: boolean;
  validUntil?: string | null;
  contactId?: number | null;
  activityId?: number | null;
  generalDiscountRate?: number | null;
  generalDiscountAmount?: number | null;
  createdAt: string;
  updatedAt?: string | null;
  createdBy?: string | null;
  updatedBy?: string | null;
  lines?: OrderLineGetDto[];
  exchangeRates?: OrderExchangeRateGetDto[];
}

export interface OrderExchangeRateGetDto {
  id: number;
  orderId: number;
  orderOfferNo?: string | null;
  currency: string;
  exchangeRate: number;
  exchangeRateDate: string;
  isOfficial: boolean;
  createdAt?: string;
  updatedAt?: string | null;
}

export interface OrderLineFormState extends Omit<CreateOrderLineDto, 'orderId'> {
  id: string;
  unit?: string | null;
  isEditing: boolean;
  relatedLines?: OrderLineFormState[];
}

export interface OrderExchangeRateFormState {
  id: string;
  currency: string;
  exchangeRate: number;
  exchangeRateDate: string;
  isOfficial?: boolean;
  dovizTipi?: number;
}

export interface Customer {
  id: number;
  name: string;
  customerCode?: string | null;
  erpCode?: string | null;
}

export interface ShippingAddress {
  id: number;
  addressText: string;
  customerId: number;
}

export interface User {
  id: number;
  firstName: string;
  lastName: string;
  fullName: string;
}

export interface PaymentType {
  id: number;
  name: string;
}

export interface Product {
  id: number;
  code: string;
  name: string;
  unitPrice?: number;
  vatRate?: number;
}

export interface PriceOfProductRequestDto {
  productCode: string;
  groupCode: string;
}

export interface PriceOfProductDto {
  productCode: string;
  groupCode: string;
  currency: string;
  listPrice: number;
  costPrice: number;
  discount1?: number | null;
  discount2?: number | null;
  discount3?: number | null;
}

export interface PricingRuleLineGetDto {
  id: number;
  pricingRuleHeaderId: number;
  stokCode: string;
  minQuantity: number;
  maxQuantity?: number | null;
  fixedUnitPrice?: number | null;
  currencyCode: string;
  discountRate1: number;
  discountAmount1: number;
  discountRate2: number;
  discountAmount2: number;
  discountRate3: number;
  discountAmount3: number;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface UserDiscountLimitDto {
  erpProductGroupCode: string;
  salespersonId: number;
  salespersonName: string;
  maxDiscount1: number;
  maxDiscount2?: number | null;
  maxDiscount3?: number | null;
  id?: number;
  createdAt?: string | null;
  updatedAt?: string | null;
  createdBy?: number | null;
  updatedBy?: number | null;
  deletedBy?: number | null;
}

export interface ApprovalActionGetDto {
  id: number;
  approvalRequestId: number;
  approvalRequestDescription?: string | null;
  stepOrder: number;
  approvedByUserId: number;
  approvedByUserFullName?: string | null;
  actionDate: string;
  status: number;
  statusName?: string | null;
  createdDate: string;
  updatedDate?: string | null;
  createdBy?: string | null;
  createdByFullName?: string | null;
  createdByFullUser?: string | null;
}

export interface ApproveActionDto {
  approvalActionId: number;
}

export interface RejectActionDto {
  approvalActionId: number;
  rejectReason?: string | null;
}

export interface ApprovalScopeUserDto {
  flowId: number;
  userId: number;
  firstName: string;
  lastName: string;
  roleGroupName: string;
  stepOrder: number;
}

export interface ApprovalActionDetailDto {
  userId: number;
  userFullName: string | null;
  userEmail: string | null;
  status: number;
  statusName: string;
  actionDate: string | null;
  rejectedReason: string | null;
}

export interface ApprovalFlowStepReportDto {
  stepOrder: number;
  stepName: string;
  stepStatus: 'NotStarted' | 'InProgress' | 'Completed' | 'Rejected';
  actions: ApprovalActionDetailDto[];
}

export interface OrderApprovalFlowReportDto {
  orderId: number;
  orderOfferNo: string | null;
  hasApprovalRequest: boolean;
  overallStatus: number | null;
  overallStatusName: string | null;
  currentStep: number;
  flowDescription: string | null;
  rejectedReason: string | null;
  steps: ApprovalFlowStepReportDto[];
}

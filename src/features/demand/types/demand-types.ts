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

export const OfferType = {
  Domestic: 'Domestic',
  Export: 'Export',
} as const;

export type OfferType = typeof OfferType[keyof typeof OfferType];

export interface DemandBulkCreateDto {
  demand: CreateDemandDto;
  lines: CreateDemandLineDto[];
  exchangeRates?: DemandExchangeRateCreateDto[];
}

export interface CreateDemandDto {
  potentialCustomerId?: number | null;
  erpCustomerCode?: string | null;
  deliveryDate?: string | null;
  shippingAddressId?: number | null;
  representativeId?: number | null;
  status?: number | null;
  description?: string | null;
  paymentTypeId?: number | null;
  documentSerialTypeId?: number | null;
  offerType: string;
  offerDate?: string | null;
  offerNo?: string | null;
  revisionNo?: string | null;
  revisionId?: number | null;
  currency: string;
  generalDiscountRate?: number | null;
  generalDiscountAmount?: number | null;
}

export interface CreateDemandLineDto {
  demandId: number;
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
  pricingRuleHeaderId?: number | null;
  relatedStockId?: number | null;
  relatedProductKey?: string | null;
  isMainRelatedProduct?: boolean;
  approvalStatus?: ApprovalStatus;
}

export interface UpdateDemandLineDto {
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
  pricingRuleHeaderId?: number | null;
  relatedStockId?: number | null;
  relatedProductKey?: string | null;
  isMainRelatedProduct?: boolean;
  approvalStatus?: ApprovalStatus;
}

export interface DemandLineGetDto {
  id: number;
  demandId: number;
  productId?: number | null;
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
  pricingRuleHeaderId?: number | null;
  relatedStockId?: number | null;
  relatedProductKey?: string | null;
  isMainRelatedProduct?: boolean;
  approvalStatus?: ApprovalStatus;
  createdAt: string;
  updatedAt?: string | null;
}

export interface DemandExchangeRateCreateDto {
  demandId: number;
  currency: string;
  exchangeRate: number;
  exchangeRateDate: string;
  isOfficial?: boolean;
}

export interface DemandGetDto {
  id: number;
  potentialCustomerId?: number | null;
  potentialCustomerName?: string | null;
  erpCustomerCode?: string | null;
  deliveryDate?: string | null;
  shippingAddressId?: number | null;
  shippingAddressText?: string | null;
  representativeId?: number | null;
  representativeName?: string | null;
  status?: number | null;
  description?: string | null;
  paymentTypeId?: number | null;
  paymentTypeName?: string | null;
  documentSerialTypeId?: number | null;
  offerType: string;
  offerDate?: string | null;
  offerNo?: string | null;
  revisionNo?: string | null;
  revisionId?: number | null;
  currency: string;
  total: number;
  grandTotal: number;
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
  lines?: DemandLineGetDto[];
  exchangeRates?: DemandExchangeRateGetDto[];
}

export interface DemandExchangeRateGetDto {
  id: number;
  demandId: number;
  demandOfferNo?: string | null;
  currency: string;
  exchangeRate: number;
  exchangeRateDate: string;
  isOfficial: boolean;
  createdAt?: string;
  updatedAt?: string | null;
}

export interface DemandLineFormState extends Omit<CreateDemandLineDto, 'demandId'> {
  id: string;
  isEditing: boolean;
  relatedLines?: DemandLineFormState[];
}

export interface DemandExchangeRateFormState {
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

export interface DemandApprovalFlowReportDto {
  demandId: number;
  demandOfferNo: string | null;
  hasApprovalRequest: boolean;
  overallStatus: number | null;
  overallStatusName: string | null;
  currentStep: number;
  flowDescription: string | null;
  rejectedReason: string | null;
  steps: ApprovalFlowStepReportDto[];
}
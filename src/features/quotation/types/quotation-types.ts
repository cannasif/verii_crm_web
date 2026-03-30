import { z } from 'zod';

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

export interface QuotationNotesDto {
  note1?: string;
  note2?: string;
  note3?: string;
  note4?: string;
  note5?: string;
  note6?: string;
  note7?: string;
  note8?: string;
  note9?: string;
  note10?: string;
  note11?: string;
  note12?: string;
  note13?: string;
  note14?: string;
  note15?: string;
}

export interface QuotationNotesGetDto {
  id?: number;
  quotationId: number;
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

export interface UpdateQuotationNotesListDto {
  notes?: string[];
}

export interface QuotationBulkCreateDto {
  quotation: CreateQuotationDto;
  lines: QuotationBulkLineDto[];
  exchangeRates?: QuotationBulkExchangeRateDto[];
  quotationNotes?: QuotationNotesDto;
}

export interface QuotationBulkLineDto extends CreateQuotationLineDto {
  id?: number | null;
}

export interface QuotationBulkExchangeRateDto extends QuotationExchangeRateCreateDto {
  id?: number | null;
}

export interface CreateQuotationDto {
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

export type UpdateQuotationDto = CreateQuotationDto;

export interface QuotationDto {
  id: number;
  generalDiscountRate?: number | null;
  generalDiscountAmount?: number | null;
  [key: string]: unknown;
}

export interface CreateQuotationLineDto {
  quotationId: number;
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
  relatedStockId?: number | null;
  relatedProductKey?: string | null;
  isMainRelatedProduct?: boolean;
  approvalStatus?: ApprovalStatus;
}

export interface UpdateQuotationLineDto {
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
  relatedStockId?: number | null;
  relatedProductKey?: string | null;
  isMainRelatedProduct?: boolean;
  approvalStatus?: ApprovalStatus;
}

export interface QuotationLineGetDto {
  id: number;
  quotationId: number;
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
  description1?: string | null;
  description2?: string | null;
  description3?: string | null;
  pricingRuleHeaderId?: number | null;
  projectCode?: string | null;
  erpProjectCode?: string | null;
  relatedStockId?: number | null;
  relatedProductKey?: string | null;
  isMainRelatedProduct?: boolean;
  approvalStatus?: ApprovalStatus;
  createdAt: string;
  updatedAt?: string | null;
}

export interface QuotationExchangeRateCreateDto {
  quotationId: number;
  currency: string;
  exchangeRate: number;
  exchangeRateDate: string;
  isOfficial?: boolean;
}

export interface QuotationGetDto {
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
  lines?: QuotationLineGetDto[];
  exchangeRates?: QuotationExchangeRateGetDto[];
}

export interface QuotationExchangeRateGetDto {
  id: number;
  quotationId: number;
  quotationOfferNo?: string | null;
  currency: string;
  exchangeRate: number;
  exchangeRateDate: string;
  isOfficial: boolean;
  createdAt?: string;
  updatedAt?: string | null;
}

export interface QuotationLineFormState extends Omit<CreateQuotationLineDto, 'quotationId'> {
  id: string;
  isEditing: boolean;
  relatedLines?: QuotationLineFormState[];
  supplierCode?: string;
  supplierName?: string;
}

export interface QuotationExchangeRateFormState {
  id: string;
  currency: string;
  exchangeRate: number;
  exchangeRateDate: string;
  isOfficial?: boolean;
  dovizTipi?: number;
}

export const quotationLineRequiredSchema = z.object({
  productCode: z.string().min(1),
});

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
  entityId: number;
  approvalRequestDescription?: string | null;
  quotationOfferNo?: string | null;
  quotationRevisionNo?: string | null;
  quotationCustomerName?: string | null;
  quotationCustomerCode?: string | null;
  quotationOwnerName?: string | null;
  quotationGrandTotal?: number | null;
  quotationGrandTotalDisplay?: string | null;
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

export interface QuotationApprovalFlowReportDto {
  quotationId: number;
  quotationOfferNo: string | null;
  hasApprovalRequest: boolean;
  overallStatus: number | null;
  overallStatusName: string | null;
  currentStep: number;
  flowDescription: string | null;
  rejectedReason: string | null;
  steps: ApprovalFlowStepReportDto[];
}

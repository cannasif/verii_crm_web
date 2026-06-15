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
  CustomerCancelled: 5,
  SalespersonClosedForRevision: 6,
  SupersededByApprovedRevision: 7,
} as const;

export type ApprovalStatus = typeof ApprovalStatus[keyof typeof ApprovalStatus];

export interface ApprovalQueueGetDto {
  id: number;
  quotationId: number;
  quotationOfferNo?: string | null;
  quotationLineId?: number | null;
  quotationLineProductCode?: string | null;
  assignedToUserId: number;
  assignedToUserFullName?: string | null;
  approvalLevel: ApprovalLevel;
  status: ApprovalStatus;
  assignedAt: string;
  completedAt?: string | null;
  sequenceOrder: number;
  isCurrent: boolean;
  note?: string | null;
  createdAt: string;
  updatedAt?: string | null;
}

export interface ApprovalNoteDto {
  note?: string | null;
}

export type ApprovalActionDto = ApprovalNoteDto;

export interface QuotationDetailDto {
  id: number;
  offerNo?: string | null;
  potentialCustomerName?: string | null;
  representativeName?: string | null;
  currency: string;
  total: number;
  grandTotal: number;
  offerDate?: string | null;
  deliveryDate?: string | null;
  description?: string | null;
  lines: QuotationLineDetailDto[];
  exchangeRates?: QuotationExchangeRateDetailDto[];
  approvalStatus: ApprovalStatus;
  currentApprover?: ApprovalQueueGetDto | null;
}

export interface QuotationLineDetailDto {
  id: number;
  productCode: string;
  productName: string;
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
}

export interface QuotationExchangeRateDetailDto {
  id: number;
  currency: string;
  exchangeRate: number;
  exchangeRateDate: string;
  isOfficial: boolean;
}

export interface ApprovalTransactionDto {
  id: number;
  documentId: number;
  lineId?: number | null;
  approvalLevel: ApprovalLevel;
  status: ApprovalStatus;
  approvedByUserId?: number | null;
  approvedByUserFullName?: string | null;
  requestedAt: string;
  actionDate?: string | null;
  note?: string | null;
}

export interface ApprovalQueueFilter {
  status?: ApprovalStatus;
  approvalLevel?: ApprovalLevel;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
}

export interface ApprovalQueueCardProps {
  queue: ApprovalQueueGetDto;
  onViewDetail: (queue: ApprovalQueueGetDto) => void;
  onApprove: (queue: ApprovalQueueGetDto) => void;
  onReject: (queue: ApprovalQueueGetDto) => void;
}

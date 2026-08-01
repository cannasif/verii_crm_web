export interface CustomerDuplicateCandidateDto {
  masterCustomerId: number;
  masterCustomerName: string;
  duplicateCustomerId: number;
  duplicateCustomerName: string;
  matchType: string;
  score: number;
  masterIsErpRegistered: boolean;
  duplicateIsErpRegistered: boolean;
  masterCompletenessScore: number;
  duplicateCompletenessScore: number;
  recommendedMasterCustomerId: number;
  recommendationReason: string;
}

export interface CustomerMergeRequestDto {
  masterCustomerId: number;
  duplicateCustomerId: number;
  preferMasterValues: boolean;
  fieldSelections?: Record<string, number>;
}

export interface CustomerMergeRelationCountsDto {
  contacts: number;
  shippingAddresses: number;
  images: number;
  activities: number;
  demands: number;
  quotations: number;
  orders: number;
  pricingRules: number;
  temporaryQuotations: number;
  otherRelations: number;
}

export interface CustomerMergeSnapshotDto {
  customerId: number;
  customerName: string;
  customerCode?: string | null;
  isErpRegistered: boolean;
  isPotential: boolean;
  completenessScore: number;
  filledFieldCount: number;
  totalFieldCount: number;
  relations: CustomerMergeRelationCountsDto;
}

export interface CustomerMergeFieldComparisonDto {
  field: string;
  label: string;
  firstValue?: string | null;
  secondValue?: string | null;
  isDifferent: boolean;
  recommendedSourceCustomerId: number;
}

export interface CustomerMergePreviewDto {
  first: CustomerMergeSnapshotDto;
  second: CustomerMergeSnapshotDto;
  recommendedMasterCustomerId: number;
  recommendationReason: string;
  canMerge: boolean;
  blockReason?: string | null;
  matchReasons: string[];
  warnings: string[];
  fields: CustomerMergeFieldComparisonDto[];
}

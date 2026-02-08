export interface CustomerDuplicateCandidateDto {
  masterCustomerId: number;
  masterCustomerName: string;
  duplicateCustomerId: number;
  duplicateCustomerName: string;
  matchType: string;
  score: number;
}

export interface CustomerMergeRequestDto {
  masterCustomerId: number;
  duplicateCustomerId: number;
  preferMasterValues: boolean;
}

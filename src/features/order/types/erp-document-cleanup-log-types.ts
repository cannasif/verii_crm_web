export type ErpCleanupDocumentType = 1 | 2 | 3;
export type ErpCleanupOperationStatus = 0 | 1 | 2 | 3;

export interface ErpDocumentCleanupLog {
  id: number;
  documentType: ErpCleanupDocumentType;
  documentTypeName: string;
  sourceDocumentId: number;
  newDocumentId?: number | null;
  sourceDocumentNumber?: string | null;
  newDocumentNumber?: string | null;
  erpDocumentNumber?: string | null;
  erpDocumentType?: string | null;
  cleanupReason: string;
  cleanupNote?: string | null;
  requestedByUserId: number;
  requestedByUserFullName?: string | null;
  requestedAt: string;
  erpDeleteStatus: ErpCleanupOperationStatus;
  newDocumentCreateStatus: ErpCleanupOperationStatus;
  overallStatus: ErpCleanupOperationStatus;
  erpDeleteErrorMessage?: string | null;
  requestBranchCode?: string | null;
  createdDate: string;
}

export interface ErpDocumentCleanupLogPagedRequest {
  pageNumber?: number;
  pageSize?: number;
  search?: string;
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
  filters?: Array<{ column: string; operator: string; value: string }>;
  filterLogic?: 'and' | 'or';
}

export interface ErpDocumentCleanupLogPagedResponse<T> {
  data?: T[];
  items?: T[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}

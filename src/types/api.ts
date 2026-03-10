export interface ApiResponse<T> {
  success: boolean;
  message: string;
  exceptionMessage: string;
  data: T;
  details?: unknown;
  errors: string[];
  timestamp: string;
  statusCode: number;
  className: string;
}

export interface PagedFilter {
  column: string;
  operator: string;
  value: string;
}

export interface PagedParams {
  pageNumber?: number;
  pageSize?: number;
  sortBy?: string;
  sortDirection?: string;
  filters?: PagedFilter[];
  filterLogic?: 'and' | 'or';
}

export interface PagedResponse<T> {
  data: T[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}

export interface CustomerSyncTriggerResponse {
  jobId: string;
  queue: string;
  enqueuedAtUtc: string;
}

import { isAxiosError } from 'axios';

export interface CustomerDuplicateConflict {
  customerId: number;
  customerName: string;
  field: 'TaxNumber' | 'TcknNumber' | 'CustomerCode' | string;
  value: string;
  branchCode?: number | null;
}

export interface CustomerDuplicateConflictPayload {
  conflicts: CustomerDuplicateConflict[];
}

interface ApiErrorWithDetails {
  details?: unknown;
}

function isConflictPayload(value: unknown): value is CustomerDuplicateConflictPayload {
  if (value == null || typeof value !== 'object') {
    return false;
  }

  const conflicts = (value as { conflicts?: unknown }).conflicts;
  return Array.isArray(conflicts);
}

export function extractCustomerConflictPayload(error: unknown): CustomerDuplicateConflictPayload | null {
  if (!isAxiosError<ApiErrorWithDetails>(error)) {
    return null;
  }

  const details = error.response?.data?.details;
  if (!isConflictPayload(details)) {
    return null;
  }

  const conflicts = details.conflicts.filter(
    (conflict): conflict is CustomerDuplicateConflict =>
      conflict != null &&
      typeof conflict === 'object' &&
      typeof (conflict as { customerId?: unknown }).customerId === 'number' &&
      typeof (conflict as { customerName?: unknown }).customerName === 'string' &&
      typeof (conflict as { field?: unknown }).field === 'string' &&
      typeof (conflict as { value?: unknown }).value === 'string'
  );

  return conflicts.length > 0 ? { conflicts } : null;
}

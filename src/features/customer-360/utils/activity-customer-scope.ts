import type { ActivityDto } from '@/features/activity-management/types/activity-types';
import type { PagedFilter } from '@/types/api';

/** Activity/query — entity FK; backend'de doğrudan desteklenir (PotentialCustomerName mapping'den bağımsız). */
export function buildCustomerActivityFilters(
  customerId: number,
  customerCode?: string | null,
  customerName?: string | null
): PagedFilter[] {
  const code = customerCode?.trim();
  if (code) {
    return [{ column: 'ErpCustomerCode', operator: 'Equals', value: code }];
  }
  if (customerId > 0) {
    return [{ column: 'PotentialCustomerId', operator: 'Equals', value: String(customerId) }];
  }
  const name = customerName?.trim();
  if (name) {
    return [{ column: 'PotentialCustomerName', operator: 'Equals', value: name }];
  }
  return [];
}

export function activityBelongsToCustomer(
  activity: ActivityDto,
  customerId: number,
  customerCode?: string | null,
  customerName?: string | null
): boolean {
  if (customerId > 0 && activity.potentialCustomerId === customerId) {
    return true;
  }
  const code = customerCode?.trim();
  if (code) {
    if (activity.erpCustomerCode?.trim() === code) return true;
    if (activity.potentialCustomer?.customerCode?.trim() === code) return true;
  }
  const name = customerName?.trim();
  if (name) {
    const linkedName = activity.potentialCustomer?.name?.trim();
    if (linkedName && linkedName.localeCompare(name, undefined, { sensitivity: 'accent' }) === 0) {
      return true;
    }
  }
  return false;
}

/** Sunucu filtresini yok saydığında true (ör. PotentialCustomerName ignore). */
export function didServerIgnoreActivityCustomerFilter(
  rows: ActivityDto[],
  customerId: number,
  customerCode?: string | null,
  customerName?: string | null
): boolean {
  if (rows.length === 0) return false;
  return rows.some((row) => !activityBelongsToCustomer(row, customerId, customerCode, customerName));
}

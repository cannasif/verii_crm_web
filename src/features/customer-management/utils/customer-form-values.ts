import type { CustomerDto, CustomerFormData } from '../types/customer-types';

export function normalizeOptionalEntityId(value?: number | null): number | undefined {
  if (value == null || value <= 0) {
    return undefined;
  }
  return value;
}

export function normalizeOptionalEmail(value?: string | null): string {
  return (value ?? '').trim();
}

export function resolveCustomerBranchCode(
  customerBranchCode: number | undefined,
  sessionBranchCode: string | number | undefined
): number {
  if (customerBranchCode != null && customerBranchCode > 0) {
    return customerBranchCode;
  }

  if (sessionBranchCode != null) {
    const parsed = Number(sessionBranchCode);
    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed;
    }
  }

  return 1;
}

export function resolveCustomerBusinessUnitCode(businessUnitCode: number | undefined): number {
  if (businessUnitCode != null && businessUnitCode > 0) {
    return businessUnitCode;
  }
  return 1;
}

export function mapCustomerToFormData(
  customer: CustomerDto,
  sessionBranchCode: string | number | undefined
): CustomerFormData {
  return {
    name: customer.name || '',
    customerCode: customer.customerCode ?? '',
    email: normalizeOptionalEmail(customer.email),
    phone: customer.phone ?? '',
    phone2: customer.phone2 ?? '',
    address: customer.address ?? '',
    postalCode: customer.postalCode ?? '',
    taxNumber: customer.taxNumber ?? '',
    taxOffice: customer.taxOffice ?? '',
    tcknNumber: customer.tcknNumber ?? '',
    website: customer.website ?? '',
    notes: customer.notes ?? '',
    salesRepCode: customer.salesRepCode ?? '',
    groupCode: customer.groupCode ?? '',
    accountingCode: customer.accountingCode ?? '',
    creditLimit: customer.creditLimit ?? 0,
    defaultShippingAddressId: normalizeOptionalEntityId(customer.defaultShippingAddressId) ?? null,
    branchCode: resolveCustomerBranchCode(customer.branchCode, sessionBranchCode),
    businessUnitCode: resolveCustomerBusinessUnitCode(customer.businessUnitCode),
    countryId: normalizeOptionalEntityId(customer.countryId),
    cityId: normalizeOptionalEntityId(customer.cityId),
    districtId: normalizeOptionalEntityId(customer.districtId),
    customerTypeId: normalizeOptionalEntityId(customer.customerTypeId),
    isCompleted: false,
  };
}

export function createEmptyCustomerFormData(
  sessionBranchCode: string | number | undefined
): CustomerFormData {
  return {
    name: '',
    customerCode: '',
    email: '',
    phone: '',
    phone2: '',
    address: '',
    postalCode: '',
    taxNumber: '',
    taxOffice: '',
    tcknNumber: '',
    website: '',
    notes: '',
    salesRepCode: '',
    groupCode: '',
    accountingCode: '',
    creditLimit: 0,
    defaultShippingAddressId: null,
    branchCode: resolveCustomerBranchCode(undefined, sessionBranchCode),
    businessUnitCode: 1,
    countryId: undefined,
    cityId: undefined,
    districtId: undefined,
    customerTypeId: undefined,
    isCompleted: false,
  };
}

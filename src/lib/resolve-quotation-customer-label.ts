import { customerApi } from '@/features/customer-management/api/customer-api';

export interface QuotationCustomerLabelOption {
  id: number;
  name?: string | null;
  customerCode?: string | null;
}

export interface ResolveQuotationCustomerLabelParams {
  potentialCustomerId?: number | null;
  erpCustomerCode?: string | null;
  potentialCustomerName?: string | null;
  customerFromApi?: { name?: string | null } | null;
  customerOptions?: QuotationCustomerLabelOption[];
}

export function resolveQuotationCustomerLabel(params: ResolveQuotationCustomerLabelParams): string {
  const nameFromCustomerApi = params.customerFromApi?.name?.trim();
  if (nameFromCustomerApi) {
    return nameFromCustomerApi;
  }

  const nameFromQuotation = params.potentialCustomerName?.trim();
  if (nameFromQuotation) {
    return nameFromQuotation;
  }

  const customerId = params.potentialCustomerId;
  const erpCode = params.erpCustomerCode?.trim();
  const options = params.customerOptions ?? [];

  if (customerId != null && customerId > 0) {
    const matchedById = options.find((option) => option.id === customerId);
    const nameFromId = matchedById?.name?.trim();
    if (nameFromId) {
      return nameFromId;
    }
  }

  if (erpCode) {
    const matchedByCode = options.find((option) => option.customerCode?.trim() === erpCode);
    const nameFromCode = matchedByCode?.name?.trim();
    if (nameFromCode) {
      return nameFromCode;
    }
  }

  return '';
}

export async function resolveQuotationCustomerLabelForPdf(
  params: ResolveQuotationCustomerLabelParams
): Promise<string> {
  const resolved = resolveQuotationCustomerLabel(params);
  if (resolved) {
    return resolved;
  }

  const customerId = params.potentialCustomerId;
  if (customerId != null && customerId > 0) {
    try {
      const customer = await customerApi.getById(customerId);
      const name = customer.name?.trim();
      if (name) {
        return name;
      }
    } catch {
      void 0;
    }
  }

  return '';
}

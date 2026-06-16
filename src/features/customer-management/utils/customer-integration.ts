import type { CustomerDto } from '../types/customer-types';

export type CustomerSelectKind = 'erp' | 'crm';

export type CustomerIntegrationFields = Pick<
  CustomerDto,
  'isIntegrated' | 'isERPIntegrated' | 'customerCode' | 'name'
>;

export function isErpIntegratedCustomer(
  customer: Pick<CustomerDto, 'isIntegrated' | 'isERPIntegrated'>
): boolean {
  return customer.isIntegrated === true || customer.isERPIntegrated === true;
}

export function resolveCustomerSelectKind(customer: CustomerDto): CustomerSelectKind {
  return isErpIntegratedCustomer(customer) ? 'erp' : 'crm';
}

export function formatCustomerSelectLabel(customer: CustomerIntegrationFields): string {
  const code = customer.customerCode?.trim();
  if (isErpIntegratedCustomer(customer) && code) {
    return `ERP: ${code} - ${customer.name}`;
  }
  return `CRM: ${customer.name}`;
}

export function resolveErpCustomerCodeForSelection(
  customer: Pick<CustomerDto, 'isIntegrated' | 'isERPIntegrated' | 'customerCode'>
): string | undefined {
  if (!isErpIntegratedCustomer(customer)) {
    return undefined;
  }

  const code = customer.customerCode?.trim();
  return code && code.length > 0 ? code : undefined;
}

export interface CustomerFieldDisplayParams {
  customerId?: number | null;
  erpCustomerCode?: string | null;
  customer?: CustomerDto | null;
  customerOptions?: CustomerDto[];
}

export function resolveCustomerFieldDisplayValue(params: CustomerFieldDisplayParams): string {
  const customerId = params.customerId;
  const erpCustomerCode = params.erpCustomerCode?.trim() ?? '';
  const customer = params.customer;
  const customerOptions = params.customerOptions ?? [];

  if (!customerId && !erpCustomerCode) {
    return '';
  }

  if (customer) {
    return formatCustomerSelectLabel(customer);
  }

  const matchedOption = customerOptions.find(
    (option) =>
      (customerId != null && option.id === customerId) ||
      (erpCustomerCode.length > 0 && option.customerCode?.trim() === erpCustomerCode)
  );

  if (matchedOption) {
    return formatCustomerSelectLabel(matchedOption);
  }

  if (erpCustomerCode) {
    return `ERP: ${erpCustomerCode}`;
  }

  return customerId != null ? `ID: ${customerId}` : '';
}

export interface CustomerComboboxOption {
  value: string;
  label: string;
  type: CustomerSelectKind;
  id: number;
  code?: string;
  customerTypeId?: number;
  name: string;
  phone?: string;
  email?: string;
}

export function mapCustomerToComboboxOption(customer: CustomerDto): CustomerComboboxOption {
  const kind = resolveCustomerSelectKind(customer);
  const code = resolveErpCustomerCodeForSelection(customer);

  return {
    value: `customer-${customer.id}`,
    label: formatCustomerSelectLabel(customer),
    type: kind,
    id: customer.id,
    code,
    customerTypeId: customer.customerTypeId,
    name: customer.name,
    phone: customer.phone,
    email: customer.email,
  };
}

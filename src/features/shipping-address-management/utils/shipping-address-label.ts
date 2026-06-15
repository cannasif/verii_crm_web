import type { ShippingAddressDto } from '../types/shipping-address-types';

type ShippingAddressLabelSource = Pick<
  ShippingAddressDto,
  'address' | 'name' | 'customerName' | 'erpShippingCode' | 'erpMainCustomerCode'
>;

export function buildShippingAddressLabel(address: ShippingAddressLabelSource): string {
  const customerName = address.name || address.customerName || '';
  const customerCode = address.erpShippingCode || address.erpMainCustomerCode || '';
  const title = [customerName, customerCode ? `(${customerCode})` : ''].filter(Boolean).join(' ');

  return [title, address.address].filter(Boolean).join(' - ') || customerCode || '';
}

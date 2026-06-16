import type { ShippingAddressDto } from '../types/shipping-address-types';

type ShippingAddressLabelSource = Pick<
  ShippingAddressDto,
  'address' | 'name' | 'customerName' | 'erpShippingCode' | 'erpMainCustomerCode' | 'cityName' | 'districtName'
>;

function normalizeLabelValue(value?: string | null): string {
  return (value ?? '').trim().toLocaleLowerCase('tr-TR');
}

export function buildShippingAddressLabel(address: ShippingAddressLabelSource): string {
  const customerName = address.name || address.customerName || '';
  const customerCode = address.erpShippingCode || address.erpMainCustomerCode || '';
  const title = [customerName, customerCode ? `(${customerCode})` : ''].filter(Boolean).join(' ');
  const addressText = address.address?.trim() ?? '';
  const missingLocationParts = [address.districtName, address.cityName]
    .map((part) => part?.trim())
    .filter((part): part is string => Boolean(part))
    .filter((part) => !normalizeLabelValue(addressText).includes(normalizeLabelValue(part)));
  const location = missingLocationParts.join(' / ');

  return [title, addressText, location].filter(Boolean).join(' - ') || customerCode || '';
}

import type { CustomerDto, CustomerFormData } from '../types/customer-types';

const FIELDS_TO_TRACK: (keyof CustomerDto | keyof CustomerFormData)[] = [
  'customerCode',
  'name',
  'customerTypeId',
  'email',
  'phone',
  'cityId',
  'districtId',
  'countryId',
  'creditLimit',
  'defaultShippingAddressId',
  'tcknNumber',
  'taxNumber',
  'website',
];

export function calculateCustomerCompletion(
  data: Partial<CustomerDto> | Partial<CustomerFormData>
): number {
  let filledCount = 0;

  FIELDS_TO_TRACK.forEach((field) => {
    // @ts-expect-error We know these fields overlap and are mostly primitives
    const value = data[field];

    if (typeof value === 'string' && value.trim() !== '') {
      filledCount++;
    } else if (typeof value === 'number' && value > 0) {
      filledCount++;
    }
  });

  return Math.round((filledCount / FIELDS_TO_TRACK.length) * 100);
}

export function getCompletionColorClasses(percentage: number): {
  text: string;
  bg: string;
  shadow: string;
  hoverText: string;
} {
  if (percentage <= 20) {
    return {
      text: 'text-red-500',
      bg: 'bg-red-500',
      shadow: 'shadow-[0_0_8px_rgba(239,68,68,0.5)]',
      hoverText: 'hover:text-red-600',
    };
  }
  if (percentage <= 75) {
    return {
      text: 'text-amber-500',
      bg: 'bg-amber-500',
      shadow: 'shadow-[0_0_8px_rgba(245,158,11,0.5)]',
      hoverText: 'hover:text-amber-600',
    };
  }
  if (percentage <= 99) {
    return {
      text: 'text-emerald-500',
      bg: 'bg-emerald-500',
      shadow: 'shadow-[0_0_8px_rgba(16,185,129,0.5)]',
      hoverText: 'hover:text-emerald-600',
    };
  }

  // 100%
  return {
    text: 'text-emerald-600',
    bg: 'bg-emerald-600',
    shadow: 'shadow-[0_0_8px_rgba(5,150,105,0.6)]',
    hoverText: 'hover:text-emerald-700',
  };
}

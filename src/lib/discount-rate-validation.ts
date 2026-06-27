export type DiscountRateField = 'discountRate1' | 'discountRate2' | 'discountRate3';

export type DiscountRateSet = Partial<Record<DiscountRateField, number | null | undefined>>;

export interface DiscountRateNormalizationResult {
  value: number;
  wasClamped: boolean;
  reason: 'range' | 'total' | null;
}

const MAX_DISCOUNT_RATE = 100;

function readDiscountRate(value: number | null | undefined): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

export function clampDiscountRate(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(MAX_DISCOUNT_RATE, value));
}

export function getDiscountRateTotal(rates: DiscountRateSet): number {
  return (
    readDiscountRate(rates.discountRate1) +
    readDiscountRate(rates.discountRate2) +
    readDiscountRate(rates.discountRate3)
  );
}

export function getMaxAllowedDiscountRate(field: DiscountRateField, currentRates: DiscountRateSet): number {
  const otherTotal = getDiscountRateTotal({
    discountRate1: field === 'discountRate1' ? 0 : currentRates.discountRate1,
    discountRate2: field === 'discountRate2' ? 0 : currentRates.discountRate2,
    discountRate3: field === 'discountRate3' ? 0 : currentRates.discountRate3,
  });

  return Math.max(0, MAX_DISCOUNT_RATE - otherTotal);
}

export function normalizeDiscountRateForField(
  field: DiscountRateField,
  value: number,
  currentRates: DiscountRateSet
): DiscountRateNormalizationResult {
  const rangeClamped = clampDiscountRate(value);
  const maxAllowed = getMaxAllowedDiscountRate(field, currentRates);
  const totalClamped = Math.min(rangeClamped, maxAllowed);

  return {
    value: totalClamped,
    wasClamped: totalClamped !== value,
    reason: rangeClamped !== value ? 'range' : totalClamped !== rangeClamped ? 'total' : null,
  };
}

export function areDiscountRatesValid(rates: DiscountRateSet): boolean {
  const values = [rates.discountRate1, rates.discountRate2, rates.discountRate3].map(readDiscountRate);
  return values.every((value) => value >= 0 && value <= MAX_DISCOUNT_RATE) && values.reduce((sum, value) => sum + value, 0) <= MAX_DISCOUNT_RATE;
}


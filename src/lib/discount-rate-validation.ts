export type DiscountRateField = 'discountRate1' | 'discountRate2' | 'discountRate3';

export type DiscountRateSet = Partial<Record<DiscountRateField, number | null | undefined>>;

export interface DiscountRateNormalizationResult {
  value: number;
  wasClamped: boolean;
  reason: 'range' | 'total' | null;
}

const MAX_DISCOUNT_RATE = 100;
const MAX_EFFECTIVE_DISCOUNT_RATE = 99.99;

function readDiscountRate(value: number | null | undefined): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

export function clampDiscountRate(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(MAX_DISCOUNT_RATE, value));
}

export function getDiscountRateTotal(rates: DiscountRateSet): number {
  const values = [rates.discountRate1, rates.discountRate2, rates.discountRate3].map((value) =>
    clampDiscountRate(readDiscountRate(value))
  );
  const remainingMultiplier = values.reduce((multiplier, value) => multiplier * (1 - value / 100), 1);
  return (1 - remainingMultiplier) * 100;
}

export function getMaxAllowedDiscountRate(field: DiscountRateField, currentRates: DiscountRateSet): number {
  const otherRates = {
    discountRate1: field === 'discountRate1' ? 0 : currentRates.discountRate1,
    discountRate2: field === 'discountRate2' ? 0 : currentRates.discountRate2,
    discountRate3: field === 'discountRate3' ? 0 : currentRates.discountRate3,
  };
  const otherEffectiveRate = getDiscountRateTotal(otherRates);

  return otherEffectiveRate >= MAX_DISCOUNT_RATE ? 0 : MAX_EFFECTIVE_DISCOUNT_RATE;
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
  return (
    values.every((value) => value >= 0 && value <= MAX_DISCOUNT_RATE) &&
    getDiscountRateTotal(rates) < MAX_DISCOUNT_RATE
  );
}

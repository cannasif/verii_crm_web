import type { PricingRuleLineGetDto } from '@/features/quotation/types/quotation-types';

function readNumber(value: unknown, fallback = 0): number {
  if (value == null || value === '') return fallback;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function readNullableNumber(value: unknown): number | null {
  if (value == null || value === '') return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function readString(value: unknown): string {
  if (value == null) return '';
  return String(value).trim();
}

export function mapPricingRuleLineFromApi(item: unknown): PricingRuleLineGetDto {
  const value = item as Record<string, unknown>;
  const currencyRaw = value.currencyCode ?? value.CurrencyCode ?? '';

  return {
    id: readNumber(value.id ?? value.Id),
    pricingRuleHeaderId: readNumber(value.pricingRuleHeaderId ?? value.PricingRuleHeaderId),
    stokCode: readString(value.stokCode ?? value.StokCode),
    minQuantity: readNumber(value.minQuantity ?? value.MinQuantity),
    maxQuantity: readNullableNumber(value.maxQuantity ?? value.MaxQuantity),
    fixedUnitPrice: readNullableNumber(value.fixedUnitPrice ?? value.FixedUnitPrice),
    currencyCode: readString(currencyRaw),
    discountRate1: readNumber(value.discountRate1 ?? value.DiscountRate1),
    discountAmount1: readNumber(value.discountAmount1 ?? value.DiscountAmount1),
    discountRate2: readNumber(value.discountRate2 ?? value.DiscountRate2),
    discountAmount2: readNumber(value.discountAmount2 ?? value.DiscountAmount2),
    discountRate3: readNumber(value.discountRate3 ?? value.DiscountRate3),
    discountAmount3: readNumber(value.discountAmount3 ?? value.DiscountAmount3),
    createdAt: (value.createdAt ?? value.CreatedAt ?? null) as string | null,
    updatedAt: (value.updatedAt ?? value.UpdatedAt ?? null) as string | null,
  };
}

export function mapPricingRuleLinesFromApi(items: unknown[]): PricingRuleLineGetDto[] {
  return items.map(mapPricingRuleLineFromApi);
}

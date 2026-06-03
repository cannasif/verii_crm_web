export interface PricingRuleLineMatchLike {
  stokCode: string;
  minQuantity?: number | null;
  maxQuantity?: number | null;
}

export function normalizeStockCodeForPricingRule(code?: string | null): string {
  return (code ?? '').trim().toUpperCase();
}

export function findMatchingPricingRuleLine<T extends PricingRuleLineMatchLike>(
  rules: T[],
  productCode: string,
  quantity: number
): T | undefined {
  const normalizedProductCode = normalizeStockCodeForPricingRule(productCode);
  if (!normalizedProductCode || !rules.length) {
    return undefined;
  }

  return rules
    .filter((rule) => normalizeStockCodeForPricingRule(rule.stokCode) === normalizedProductCode)
    .filter((rule) => {
      const minQuantity = rule.minQuantity ?? 0;
      const maxQuantity = rule.maxQuantity ?? Number.POSITIVE_INFINITY;
      return quantity >= minQuantity && quantity <= maxQuantity;
    })
    .sort((left, right) => (right.minQuantity ?? 0) - (left.minQuantity ?? 0))[0];
}

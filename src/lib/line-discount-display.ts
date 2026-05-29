export interface LineDiscountTierDisplay {
  rate: number;
  unitDiscountAmount: number;
  unitPriceBefore: number;
  unitPriceAfter: number;
}

export interface LineUnitDiscountBreakdown {
  tiers: LineDiscountTierDisplay[];
  originalUnitPrice: number;
  discountedUnitPrice: number;
  hasDiscount: boolean;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

export function getLineUnitDiscountBreakdown(
  unitPrice: number,
  discountRate1: number,
  discountRate2: number,
  discountRate3: number,
): LineUnitDiscountBreakdown {
  const rates = [discountRate1, discountRate2, discountRate3];
  let currentUnitPrice = unitPrice;
  const tiers: LineDiscountTierDisplay[] = [];

  for (const rate of rates) {
    const normalizedRate = Math.max(0, rate);
    const unitPriceBefore = currentUnitPrice;
    const unitDiscountAmount = round2(unitPriceBefore * (normalizedRate / 100));
    const unitPriceAfter = round2(Math.max(0, unitPriceBefore - unitDiscountAmount));
    tiers.push({
      rate: normalizedRate,
      unitDiscountAmount,
      unitPriceBefore,
      unitPriceAfter,
    });
    currentUnitPrice = unitPriceAfter;
  }

  const hasDiscount = tiers.some((tier) => tier.rate > 0 || tier.unitDiscountAmount > 0);

  return {
    tiers,
    originalUnitPrice: unitPrice,
    discountedUnitPrice: currentUnitPrice,
    hasDiscount,
  };
}

export function getUnitDiscountAmountForTierIndex(
  breakdown: LineUnitDiscountBreakdown,
  tierIndex: number,
): number {
  return breakdown.tiers[tierIndex]?.unitDiscountAmount ?? 0;
}

export interface CalculatedLineAmounts {
  discountAmount1: number;
  discountAmount2: number;
  discountAmount3: number;
  lineTotal: number;
  vatAmount: number;
  lineGrandTotal: number;
}

export function calculateLineTotalsAmounts(
  unitPrice: number,
  quantity: number,
  discountRate1: number,
  discountRate2: number,
  discountRate3: number,
  vatRate: number,
): CalculatedLineAmounts {
  const breakdown = getLineUnitDiscountBreakdown(
    unitPrice,
    discountRate1,
    discountRate2,
    discountRate3,
  );
  const qty = Math.max(0, quantity);

  const discountAmount1 = round2((breakdown.tiers[0]?.unitDiscountAmount ?? 0) * qty);
  const discountAmount2 = round2((breakdown.tiers[1]?.unitDiscountAmount ?? 0) * qty);
  const discountAmount3 = round2((breakdown.tiers[2]?.unitDiscountAmount ?? 0) * qty);
  const lineTotal = round2(Math.max(0, breakdown.discountedUnitPrice * qty));
  const vatAmount = round2(lineTotal * (Math.max(0, vatRate) / 100));
  const lineGrandTotal = round2(lineTotal + vatAmount);

  return {
    discountAmount1: Math.max(0, discountAmount1),
    discountAmount2: Math.max(0, discountAmount2),
    discountAmount3: Math.max(0, discountAmount3),
    lineTotal,
    vatAmount: Math.max(0, vatAmount),
    lineGrandTotal: Math.max(0, lineGrandTotal),
  };
}

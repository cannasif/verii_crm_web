import { calculateLineTotalsAmounts } from '@/lib/line-discount-display';

type SalesDocumentLine = {
  unitPrice: number;
  quantity: number;
  discountRate1: number;
  discountRate2: number;
  discountRate3: number;
  vatRate: number;
};

function round6(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000;
}

export function applyExchangeRateChangeToLines<TLine extends SalesDocumentLine>(
  lines: TLine[],
  oldExchangeRate: number,
  newExchangeRate: number,
): TLine[] {
  if (oldExchangeRate <= 0 || newExchangeRate <= 0 || oldExchangeRate === newExchangeRate) {
    return lines;
  }

  const priceScaleFactor = oldExchangeRate / newExchangeRate;

  return lines.map((line) => {
    const unitPrice = round6(line.unitPrice * priceScaleFactor);
    const amounts = calculateLineTotalsAmounts(
      unitPrice,
      line.quantity,
      line.discountRate1,
      line.discountRate2,
      line.discountRate3,
      line.vatRate,
    );

    return {
      ...line,
      unitPrice,
      ...amounts,
    };
  });
}

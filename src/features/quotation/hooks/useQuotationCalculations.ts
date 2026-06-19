import type { QuotationLineFormState } from '../types/quotation-types';
import { calculateLineTotalsAmounts } from '@/lib/line-discount-display';
import { useCallback, useMemo } from 'react';

export interface CalculationTotals {
  subtotal: number;
  totalVat: number;
  grandTotal: number;
  netTotal: number;
  discountedNetTotal: number;
  generalDiscountAmount: number;
  totalVatAfterDiscount: number;
  grandTotalAfterDiscount: number;
}

interface UseQuotationCalculationsReturn {
  calculateLineTotals: (line: QuotationLineFormState) => QuotationLineFormState;
  calculateTotals: (
    lines: QuotationLineFormState[],
    options?: { generalDiscountRate?: number | null; generalDiscountAmount?: number | null }
  ) => CalculationTotals;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

export function useQuotationCalculations(): UseQuotationCalculationsReturn {
  const calculateLineTotals = useCallback((line: QuotationLineFormState): QuotationLineFormState => {
    const amounts = calculateLineTotalsAmounts(
      line.unitPrice,
      line.quantity,
      line.discountRate1,
      line.discountRate2,
      line.discountRate3,
      line.vatRate,
    );

    return {
      ...line,
      ...amounts,
    };
  }, []);

  const calculateTotals = useCallback((
    lines: QuotationLineFormState[],
    options?: { generalDiscountRate?: number | null; generalDiscountAmount?: number | null }
  ): CalculationTotals => {
    const netTotal = round2(lines.reduce((sum, line) => sum + line.lineTotal, 0));
    const totalVat = round2(lines.reduce((sum, line) => sum + line.vatAmount, 0));
    const grandTotal = round2(lines.reduce((sum, line) => sum + line.lineGrandTotal, 0));
    const subtotal = netTotal;

    let generalDiscountAmount = 0;
    if (options?.generalDiscountAmount != null && !Number.isNaN(options.generalDiscountAmount)) {
      generalDiscountAmount = round2(Math.min(Math.max(0, options.generalDiscountAmount), netTotal));
    } else if (options?.generalDiscountRate != null && !Number.isNaN(options.generalDiscountRate)) {
      const rate = Math.min(100, Math.max(0, options.generalDiscountRate));
      generalDiscountAmount = round2(Math.min(netTotal * (rate / 100), netTotal));
    }

    const discountedNetTotal = round2(Math.max(netTotal - generalDiscountAmount, 0));
    const totalVatAfterDiscount =
      netTotal > 0 ? round2(totalVat * (discountedNetTotal / netTotal)) : 0;
    const grandTotalAfterDiscount = round2(discountedNetTotal + totalVatAfterDiscount);

    return {
      subtotal,
      totalVat,
      grandTotal,
      netTotal,
      discountedNetTotal,
      generalDiscountAmount,
      totalVatAfterDiscount,
      grandTotalAfterDiscount,
    };
  }, []);

  return useMemo(() => ({
    calculateLineTotals,
    calculateTotals,
  }), [calculateLineTotals, calculateTotals]);
}

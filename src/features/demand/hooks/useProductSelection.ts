import { useCallback } from 'react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { demandApi } from '../api/demand-api';
import { stockApi } from '@/features/stock/api/stock-api';
import { useDemandCalculations } from './useDemandCalculations';
import { useCurrencyOptions } from '@/services/hooks/useCurrencyOptions';
import { useExchangeRate } from '@/services/hooks/useExchangeRate';
import type {
  DemandLineFormState,
  DemandExchangeRateFormState,
  PricingRuleLineGetDto,
} from '../types/demand-types';
import type { ProductSelectionResult } from '@/components/shared/ProductSelectDialog';
import { createClientId } from '@/lib/create-client-id';
import { getRelatedQuantityPerMainUnit } from '@/lib/related-stock-quantity';
import {
  convertProductLinePriceForDocument,
  type PricingRulePriceLineLike,
} from '@/lib/line-unit-price-currency';

interface UseProductSelectionParams {
  currency: number;
  exchangeRates: DemandExchangeRateFormState[];
  pricingRules?: PricingRuleLineGetDto[];
}

interface UseProductSelectionReturn {
  handleProductSelect: (product: ProductSelectionResult) => Promise<DemandLineFormState>;
  handleProductSelectWithRelatedStocks: (product: ProductSelectionResult, relatedStockIds: number[]) => Promise<DemandLineFormState[]>;
}

export function useProductSelection({
  currency,
  exchangeRates,
  pricingRules = [],
}: UseProductSelectionParams): UseProductSelectionReturn {
  const { calculateLineTotals } = useDemandCalculations();
  const { currencyOptions } = useCurrencyOptions();
  const { data: erpRates = [] } = useExchangeRate();
  const { t } = useTranslation(['demand', 'common']);

  const createEmptyLine = useCallback(
    (product: ProductSelectionResult): DemandLineFormState => {
      return {
        id: `temp-${Date.now()}`,
        productId: null,
        productCode: product.code,
        productName: product.name,
        unit: product.unit ?? null,
        quantity: 1,
        unitPrice: 0,
        discountRate1: 0,
        discountAmount1: 0,
        discountRate2: 0,
        discountAmount2: 0,
        discountRate3: 0,
        discountAmount3: 0,
        vatRate: product.vatRate || 20,
        vatAmount: 0,
        lineTotal: 0,
        lineGrandTotal: 0,
        description: null,
        description1: null,
        description2: null,
        description3: null,
        pricingRuleHeaderId: null,
        relatedStockId: product.id || null,
        isEditing: true,
      };
    },
    []
  );

  const convertPriceData = useCallback(
    (
      priceData: { listPrice?: number | null; currency?: string | null; discount1?: number | null; discount2?: number | null; discount3?: number | null },
      productCode: string,
      quantity: number
    ) => {
      const converted = convertProductLinePriceForDocument({
        priceData,
        productCode,
        quantity,
        documentDovizTipi: currency,
        currencyOptions,
        exchangeRates,
        erpRates,
        pricingRules: pricingRules as PricingRulePriceLineLike[],
      });

      if (converted.zeroRate) {
        toast.error(t('update.error', 'Hata'), {
          description: t('exchangeRates.zeroRateError', 'Lütfen devam edebilmek için kur değeri girin.'),
        });
        throw new Error('ZERO_RATE');
      }

      return converted;
    },
    [currency, currencyOptions, erpRates, exchangeRates, pricingRules, t]
  );

  const handleProductSelectWithRelatedStocks = useCallback(
    async (product: ProductSelectionResult, relatedStockIds: number[]): Promise<DemandLineFormState[]> => {
      const requests: Array<{ productCode: string; groupCode: string }> = [
        {
          productCode: product.code,
          groupCode: product.groupCode || '',
        },
      ];

      for (const relatedStockId of relatedStockIds) {
        try {
          const relatedStock = await stockApi.getById(relatedStockId);
          if (relatedStock && relatedStock.erpStockCode) {
            requests.push({
              productCode: relatedStock.erpStockCode,
              groupCode: relatedStock.grupKodu || '',
            });
          }
        } catch {
          void 0;
        }
      }

      try {
        const prices = await demandApi.getPriceOfProduct(requests);

        const lines: DemandLineFormState[] = [];
        const mainStockId = product.id || null;
        const relatedProductKey = createClientId();

        for (let i = 0; i < requests.length; i++) {
          const request = requests[i];
          const productCode = request.productCode;
          const isMainProduct = i === 0;

          let productName = isMainProduct ? product.name : '';
          const vatRate = product.vatRate || 20;
          const relatedStockId: number | null = mainStockId;

          let relatedStockIdFromArray: number | undefined;
          if (!isMainProduct) {
            relatedStockIdFromArray = relatedStockIds[i - 1];

            try {
              const relatedStock = relatedStockIdFromArray != null ? await stockApi.getById(relatedStockIdFromArray) : null;
              if (relatedStock) {
                productName = relatedStock.stockName;
              }
            } catch {
              void 0;
            }
          }

          const lineQty = isMainProduct
            ? 1
            : relatedStockIdFromArray != null
              ? getRelatedQuantityPerMainUnit(product, relatedStockIdFromArray)
              : 1;

          const priceData = prices.find((p) => p.productCode === productCode);

          if (!priceData) {
            const emptyLine = {
              id: `temp-${Date.now()}-${i}`,
              productId: null,
              productCode,
              productName,
              unit: isMainProduct ? (product.unit ?? null) : null,
              groupCode: request.groupCode || null,
              quantity: lineQty,
              unitPrice: 0,
              discountRate1: 0,
              discountAmount1: 0,
              discountRate2: 0,
              discountAmount2: 0,
              discountRate3: 0,
              discountAmount3: 0,
              vatRate,
              vatAmount: 0,
              lineTotal: 0,
              lineGrandTotal: 0,
              description: null,
              description1: null,
              description2: null,
              description3: null,
              pricingRuleHeaderId: null,
              relatedStockId,
              relatedProductKey,
              isMainRelatedProduct: isMainProduct,
              isEditing: true,
            };
            lines.push(calculateLineTotals(emptyLine));
            continue;
          }

          const converted = convertPriceData(priceData, productCode, lineQty);

          const line: DemandLineFormState = {
            id: `temp-${Date.now()}-${i}`,
            productId: null,
            productCode,
            productName,
            unit: isMainProduct ? (product.unit ?? null) : null,
            groupCode: priceData.groupCode || request.groupCode || null,
            quantity: lineQty,
            unitPrice: converted.unitPrice,
            discountRate1: converted.discountRate1,
            discountAmount1: 0,
            discountRate2: converted.discountRate2,
            discountAmount2: 0,
            discountRate3: converted.discountRate3,
            discountAmount3: 0,
            vatRate,
            vatAmount: 0,
            lineTotal: 0,
            lineGrandTotal: 0,
            description: null,
            description1: null,
            description2: null,
            description3: null,
            pricingRuleHeaderId: converted.pricingRuleHeaderId,
            relatedStockId,
            relatedProductKey,
            isMainRelatedProduct: isMainProduct,
            isEditing: true,
          };

          lines.push(calculateLineTotals(line));
        }

        return lines;
      } catch (error) {
        if (error instanceof Error && error.message === 'ZERO_RATE') {
          throw error;
        }
        const baseLine = createEmptyLine(product);
        return [calculateLineTotals(baseLine)];
      }
    },
    [convertPriceData, createEmptyLine, calculateLineTotals]
  );

  const handleProductSelect = useCallback(
    async (product: ProductSelectionResult): Promise<DemandLineFormState> => {
      const baseLine = createEmptyLine(product);
      const hasRelatedStocks = product.relatedStockIds && product.relatedStockIds.length > 0;

      if (hasRelatedStocks && product.relatedStockIds) {
        const allLines = await handleProductSelectWithRelatedStocks(product, product.relatedStockIds);
        return allLines[0] || baseLine;
      }

      try {
        const prices = await demandApi.getPriceOfProduct([
          {
            productCode: product.code,
            groupCode: product.groupCode || '',
          },
        ]);

        if (!prices || prices.length === 0) {
          return calculateLineTotals(baseLine);
        }

        const selectedPrice = prices.find((p) => p.productCode === product.code) || prices[0];
        if (!selectedPrice) {
          return calculateLineTotals(baseLine);
        }

        const converted = convertPriceData(selectedPrice, product.code, 1);

        const updatedLine: DemandLineFormState = {
          ...baseLine,
          groupCode: selectedPrice.groupCode || product.groupCode || null,
          unitPrice: converted.unitPrice,
          discountRate1: converted.discountRate1,
          discountRate2: converted.discountRate2,
          discountRate3: converted.discountRate3,
          pricingRuleHeaderId: converted.pricingRuleHeaderId,
        };

        return calculateLineTotals(updatedLine);
      } catch (error) {
        if (error instanceof Error && error.message === 'ZERO_RATE') {
          throw error;
        }
        return calculateLineTotals(baseLine);
      }
    },
    [convertPriceData, createEmptyLine, calculateLineTotals, handleProductSelectWithRelatedStocks]
  );

  return {
    handleProductSelect,
    handleProductSelectWithRelatedStocks,
  };
}

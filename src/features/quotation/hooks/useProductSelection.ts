import { useCallback } from 'react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { quotationApi } from '../api/quotation-api';
import { stockApi } from '@/features/stock/api/stock-api';
import { getLocalizedStockName, resolveDocumentLineProductName } from '@/features/stock/utils/localized-stock-name';
import { useQuotationCalculations } from './useQuotationCalculations';
import { useCurrencyOptions } from '@/services/hooks/useCurrencyOptions';
import { useExchangeRate } from '@/services/hooks/useExchangeRate';
import type {
  QuotationLineFormState,
  QuotationExchangeRateFormState,
  PricingRuleLineGetDto,
} from '../types/quotation-types';
import type { ProductSelectionResult } from '@/components/shared/ProductSelectDialog';
import { createClientId } from '@/lib/create-client-id';
import { resolveProductSelectionUnit } from '@/lib/resolve-product-selection-unit';
import { getRelatedQuantityPerMainUnit } from '@/lib/related-stock-quantity';
import {
  convertProductLinePriceForDocument,
  hasRequiredDocumentExchangeRate,
  type PricingRulePriceLineLike,
} from '@/lib/line-unit-price-currency';
import { resolveDocumentVatRate } from '@/lib/document-vat';

interface UseProductSelectionParams {
  currency: number;
  exchangeRates: QuotationExchangeRateFormState[];
  pricingRules?: PricingRuleLineGetDto[];
  offerType?: string | null;
  deliveryMethodName?: string | null;
}

interface UseProductSelectionReturn {
  handleProductSelect: (product: ProductSelectionResult) => Promise<QuotationLineFormState>;
  handleProductSelectWithRelatedStocks: (product: ProductSelectionResult, relatedStockIds: number[]) => Promise<QuotationLineFormState[]>;
}

export function useProductSelection({
  currency,
  exchangeRates,
  pricingRules = [],
  offerType,
  deliveryMethodName,
}: UseProductSelectionParams): UseProductSelectionReturn {
  const { calculateLineTotals } = useQuotationCalculations();
  const { currencyOptions } = useCurrencyOptions();
  const { data: erpRates = [] } = useExchangeRate();
  const { t, i18n } = useTranslation(['quotation', 'common']);

  const createEmptyLine = useCallback(
    (product: ProductSelectionResult): QuotationLineFormState => {
      return {
        id: createClientId(),
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
        vatRate: resolveDocumentVatRate(undefined, offerType, deliveryMethodName, product.vatRate ?? 20),
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
    [offerType, deliveryMethodName]
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
        requireDocumentExchangeRates: true,
      });

      if (converted.zeroRate) {
        toast.error(t('update.error'), {
          description: t('exchangeRates.zeroRateError', {
            defaultValue: 'Lütfen devam edebilmek için kur değeri girin.',
          }),
        });
        throw new Error('ZERO_RATE');
      }

      return converted;
    },
    [currency, currencyOptions, erpRates, exchangeRates, pricingRules, t]
  );

  const ensureDocumentExchangeRate = useCallback((): void => {
    if (
      hasRequiredDocumentExchangeRate(currency, currencyOptions, exchangeRates, erpRates, {
        allowErpFallback: false,
      })
    ) {
      return;
    }

    toast.error(t('update.error'), {
      description: t('exchangeRates.zeroRateError', {
        defaultValue: 'Lütfen devam edebilmek için kur değeri girin.',
      }),
    });
    throw new Error('ZERO_RATE');
  }, [currency, currencyOptions, exchangeRates, erpRates, t]);

  const handleProductSelectWithRelatedStocks = useCallback(
    async (product: ProductSelectionResult, relatedStockIds: number[]): Promise<QuotationLineFormState[]> => {
      ensureDocumentExchangeRate();
      const productWithUnit = await resolveProductSelectionUnit(product);
      const resolvedMainProductName = await resolveDocumentLineProductName(productWithUnit, i18n.language);
      const productWithResolvedName: ProductSelectionResult = {
        ...productWithUnit,
        name: resolvedMainProductName,
      };

      const requests: Array<{ productCode: string; groupCode: string }> = [
        {
          productCode: productWithResolvedName.code,
          groupCode: productWithResolvedName.groupCode || '',
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
        const prices = await quotationApi.getPriceOfProduct(requests);

        const lines: QuotationLineFormState[] = [];
        const mainStockId = productWithResolvedName.id || null;
        const relatedProductKey = createClientId();

        for (let i = 0; i < requests.length; i++) {
          const request = requests[i];
          const productCode = request.productCode;
          const isMainProduct = i === 0;

          let productName = isMainProduct ? resolvedMainProductName : '';
          const vatRate = resolveDocumentVatRate(undefined, offerType, deliveryMethodName, productWithResolvedName.vatRate ?? 20);

          let relatedStockIdFromArray: number | undefined;
          if (!isMainProduct) {
            relatedStockIdFromArray = relatedStockIds[i - 1];

            try {
              const relatedStock = relatedStockIdFromArray != null ? await stockApi.getById(relatedStockIdFromArray) : null;
              if (relatedStock) {
                productName = getLocalizedStockName(relatedStock, i18n.language);
              }
            } catch {
              void 0;
            }
          }
          const relatedStockId: number | null = isMainProduct ? mainStockId : relatedStockIdFromArray ?? null;

          const lineQty = isMainProduct
            ? 1
            : relatedStockIdFromArray != null
              ? getRelatedQuantityPerMainUnit(productWithResolvedName, relatedStockIdFromArray)
              : 1;

          const priceData = prices.find((p) => p.productCode === productCode);

          if (!priceData) {
            const emptyLine = {
              id: `${createClientId()}-${i}`,
              productId: null,
              productCode,
              productName,
              unit: isMainProduct ? (productWithResolvedName.unit ?? null) : null,
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

          const line: QuotationLineFormState = {
            id: `${createClientId()}-${i}`,
            productId: null,
            productCode,
            productName,
            unit: isMainProduct ? (productWithResolvedName.unit ?? null) : null,
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
        const baseLine = createEmptyLine(productWithResolvedName);
        return [calculateLineTotals(baseLine)];
      }
    },
    [convertPriceData, createEmptyLine, calculateLineTotals, ensureDocumentExchangeRate, i18n.language, offerType, deliveryMethodName]
  );

  const handleProductSelect = useCallback(
    async (product: ProductSelectionResult): Promise<QuotationLineFormState> => {
      ensureDocumentExchangeRate();
      const productWithUnit = await resolveProductSelectionUnit(product);
      const resolvedProductName = await resolveDocumentLineProductName(productWithUnit, i18n.language);
      const productWithResolvedName: ProductSelectionResult = {
        ...productWithUnit,
        name: resolvedProductName,
      };
      const baseLine = createEmptyLine(productWithResolvedName);
      const hasRelatedStocks = productWithResolvedName.relatedStockIds && productWithResolvedName.relatedStockIds.length > 0;

      if (hasRelatedStocks && productWithResolvedName.relatedStockIds) {
        const allLines = await handleProductSelectWithRelatedStocks(productWithResolvedName, productWithResolvedName.relatedStockIds);
        return allLines[0] || baseLine;
      }

      try {
        const prices = await quotationApi.getPriceOfProduct([
          {
            productCode: productWithResolvedName.code,
            groupCode: productWithResolvedName.groupCode || '',
          },
        ]);

        if (!prices || prices.length === 0) {
          return calculateLineTotals(baseLine);
        }

        const selectedPrice = prices.find((p) => p.productCode === productWithResolvedName.code) || prices[0];
        if (!selectedPrice) {
          return calculateLineTotals(baseLine);
        }

        const converted = convertPriceData(selectedPrice, productWithResolvedName.code, 1);

        const updatedLine: QuotationLineFormState = {
          ...baseLine,
          groupCode: selectedPrice.groupCode || productWithResolvedName.groupCode || null,
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
    [convertPriceData, createEmptyLine, calculateLineTotals, ensureDocumentExchangeRate, handleProductSelectWithRelatedStocks, i18n.language]
  );

  return {
    handleProductSelect,
    handleProductSelectWithRelatedStocks,
  };
}

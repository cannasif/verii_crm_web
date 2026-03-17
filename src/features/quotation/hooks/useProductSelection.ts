import { useCallback } from 'react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { quotationApi } from '../api/quotation-api';
import { stockApi } from '@/features/stock/api/stock-api';
import { useQuotationCalculations } from './useQuotationCalculations';
import { useCurrencyOptions } from '@/services/hooks/useCurrencyOptions';
import { useExchangeRate } from '@/services/hooks/useExchangeRate';
import type { QuotationLineFormState, QuotationExchangeRateFormState } from '../types/quotation-types';
import type { ProductSelectionResult } from '@/components/shared/ProductSelectDialog';
import type { KurDto } from '@/services/erp-types';
import { createClientId } from '@/lib/create-client-id';

function findExchangeRateByDovizTipi(
  dovizTipi: number,
  exchangeRates: QuotationExchangeRateFormState[],
  erpRates?: KurDto[]
): number | null {
  const exchangeRate = exchangeRates.find((er) => er.dovizTipi === dovizTipi);
  if (exchangeRate) {
    if (exchangeRate.exchangeRate != null && exchangeRate.exchangeRate > 0) {
      return exchangeRate.exchangeRate;
    }
    return null;
  }

  if (erpRates && erpRates.length > 0) {
    const erpRate = erpRates.find((er) => er.dovizTipi === dovizTipi);
    if (erpRate?.kurDegeri && erpRate.kurDegeri > 0) {
      return erpRate.kurDegeri;
    }
  }

  return null;
}

interface UseProductSelectionParams {
  currency: number;
  exchangeRates: QuotationExchangeRateFormState[];
}

interface UseProductSelectionReturn {
  handleProductSelect: (product: ProductSelectionResult) => Promise<QuotationLineFormState>;
  handleProductSelectWithRelatedStocks: (product: ProductSelectionResult, relatedStockIds: number[]) => Promise<QuotationLineFormState[]>;
}

export function useProductSelection({ currency, exchangeRates }: UseProductSelectionParams): UseProductSelectionReturn {
  const { calculateLineTotals } = useQuotationCalculations();
  const { currencyOptions } = useCurrencyOptions();
  const { data: erpRates = [] } = useExchangeRate();
  const { t } = useTranslation();

  const createEmptyLine = useCallback(
    (product: ProductSelectionResult): QuotationLineFormState => {
      return {
        id: `temp-${Date.now()}`,
        productId: null,
        productCode: product.code,
        productName: product.name,
        quantity: 1,
        unitPrice: 0,
        discountRate1: 0,
        discountAmount1: 0,
        discountRate2: 0,
        discountAmount2: 0,
        discountRate3: 0,
        discountAmount3: 0,
        vatRate: product.vatRate || 18,
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

  const handleProductSelectWithRelatedStocks = useCallback(
    async (product: ProductSelectionResult, relatedStockIds: number[]): Promise<QuotationLineFormState[]> => {
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
        const prices = await quotationApi.getPriceOfProduct(requests);

        const lines: QuotationLineFormState[] = [];
        const mainStockId = product.id || null;
        const relatedProductKey = createClientId();

        for (let i = 0; i < requests.length; i++) {
          const request = requests[i];
          const productCode = request.productCode;
          const isMainProduct = i === 0;
          
          let productName = isMainProduct ? product.name : '';
          const vatRate = product.vatRate || 18;
          const relatedStockId: number | null = mainStockId;

          if (!isMainProduct) {
            const relatedStockIdFromArray = relatedStockIds[i - 1];
            
            try {
              const relatedStock = await stockApi.getById(relatedStockIdFromArray);
              if (relatedStock) {
                productName = relatedStock.stockName;
              }
            } catch {
              void 0;
            }
          }

          const priceData = prices.find((p) => p.productCode === productCode);
          
          if (!priceData) {
            const emptyLine = {
              id: `temp-${Date.now()}-${i}`,
              productId: null,
              productCode,
              productName,
              groupCode: request.groupCode || null,
              quantity: 1,
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

          const sourceCurrencyFromApi = priceData.currency || '';
          let sourceDovizTipi: number | null = null;
          if (sourceCurrencyFromApi) {
            const numericCurrency = parseInt(sourceCurrencyFromApi, 10);
            if (!isNaN(numericCurrency)) {
              sourceDovizTipi = numericCurrency;
            } else {
              const sourceCurrencyOption = currencyOptions.find((opt) => opt.code === sourceCurrencyFromApi || opt.dovizIsmi === sourceCurrencyFromApi);
              sourceDovizTipi = sourceCurrencyOption?.dovizTipi || null;
            }
          }

          let convertedPrice = priceData.listPrice ?? 0;
          if (sourceDovizTipi) {
            const sourceRate = findExchangeRateByDovizTipi(sourceDovizTipi, exchangeRates, erpRates);
            const targetRate = findExchangeRateByDovizTipi(currency, exchangeRates, erpRates);

            if (!sourceRate || sourceRate <= 0 || !targetRate || targetRate <= 0) {
              toast.error(t('quotation.update.error'), {
                description: t('quotation.exchangeRates.zeroRateError', {
                  defaultValue: 'Lütfen devam edebilmek için kur değeri girin.',
                }),
              });
              throw new Error('ZERO_RATE');
            }

            if (sourceDovizTipi !== currency) {
              convertedPrice = (priceData.listPrice ?? 0) * sourceRate / targetRate;
            }
          }

          const line: QuotationLineFormState = {
            id: `temp-${Date.now()}-${i}`,
            productId: null,
            productCode,
            productName,
            groupCode: priceData.groupCode || request.groupCode || null,
            quantity: 1,
            unitPrice: convertedPrice,
            discountRate1: priceData.discount1 ?? 0,
            discountAmount1: 0,
            discountRate2: priceData.discount2 ?? 0,
            discountAmount2: 0,
            discountRate3: priceData.discount3 ?? 0,
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
    [currency, exchangeRates, currencyOptions, erpRates, createEmptyLine, calculateLineTotals]
  );

  const handleProductSelect = useCallback(
    async (product: ProductSelectionResult): Promise<QuotationLineFormState> => {
      const baseLine = createEmptyLine(product);
      const hasRelatedStocks = product.relatedStockIds && product.relatedStockIds.length > 0;

      if (hasRelatedStocks && product.relatedStockIds) {
        const allLines = await handleProductSelectWithRelatedStocks(product, product.relatedStockIds);
        return allLines[0] || baseLine;
      }

      try {
        const prices = await quotationApi.getPriceOfProduct([
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

        const sourceCurrencyFromApi = selectedPrice.currency || '';

        let sourceDovizTipi: number | null = null;
        if (sourceCurrencyFromApi) {
          const numericCurrency = parseInt(sourceCurrencyFromApi, 10);
          if (!isNaN(numericCurrency)) {
            sourceDovizTipi = numericCurrency;
          } else {
            const sourceCurrencyOption = currencyOptions.find((opt) => opt.code === sourceCurrencyFromApi || opt.dovizIsmi === sourceCurrencyFromApi);
            sourceDovizTipi = sourceCurrencyOption?.dovizTipi || null;
          }
        }

        if (!sourceDovizTipi) {
          const updatedLine: QuotationLineFormState = {
            ...baseLine,
            groupCode: selectedPrice.groupCode || product.groupCode || null,
            unitPrice: selectedPrice.listPrice ?? 0,
            discountRate1: selectedPrice.discount1 ?? 0,
            discountRate2: selectedPrice.discount2 ?? 0,
            discountRate3: selectedPrice.discount3 ?? 0,
          };
          return calculateLineTotals(updatedLine);
        }

        const sourceRate = findExchangeRateByDovizTipi(sourceDovizTipi, exchangeRates, erpRates);
        const targetRate = findExchangeRateByDovizTipi(currency, exchangeRates, erpRates);

        let convertedPrice = selectedPrice.listPrice ?? 0;
        if (sourceRate && sourceRate > 0 && targetRate && targetRate > 0) {
          if (sourceDovizTipi !== currency) {
            convertedPrice = (selectedPrice.listPrice ?? 0) * sourceRate / targetRate;
          }
        }

        const updatedLine: QuotationLineFormState = {
          ...baseLine,
          groupCode: selectedPrice.groupCode || product.groupCode || null,
          unitPrice: convertedPrice,
          discountRate1: selectedPrice.discount1 ?? 0,
          discountRate2: selectedPrice.discount2 ?? 0,
          discountRate3: selectedPrice.discount3 ?? 0,
        };

        const calculatedLine = calculateLineTotals(updatedLine);
        return calculatedLine;
      } catch (error) {
        if (error instanceof Error && error.message === 'ZERO_RATE') {
          throw error;
        }
        return calculateLineTotals(baseLine);
      }
    },
    [
      currency,
      exchangeRates,
      currencyOptions,
      erpRates,
      createEmptyLine,
      calculateLineTotals,
      handleProductSelectWithRelatedStocks,
    ]
  );

  return {
    handleProductSelect,
    handleProductSelectWithRelatedStocks,
  };
}

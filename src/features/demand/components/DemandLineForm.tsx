'use client';

import { type ReactElement, useState, useEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PricingRuleInsightDialog } from '@/components/shared/PricingRuleInsightDialog';
import { useDemandCalculations } from '../hooks/useDemandCalculations';
import { useDiscountLimitValidation } from '../hooks/useDiscountLimitValidation';
import { useCurrencyOptions } from '@/services/hooks/useCurrencyOptions';
import { useExchangeRate } from '@/services/hooks/useExchangeRate';
import { useErpProjects } from '@/services/hooks/useErpProjects';
import { ProductSelectDialog, type ProductSelectionResult } from '@/components/shared/ProductSelectDialog';
import { VoiceSearchCombobox } from '@/components/shared/VoiceSearchCombobox';
import { useProductSelection } from '../hooks/useProductSelection';
import { formatCurrency } from '../utils/format-currency';
import { findExchangeRateByDovizTipi } from '../utils/price-conversion';
import { demandApi } from '../api/demand-api';
import type { DemandLineFormState, DemandExchangeRateFormState, PricingRuleLineGetDto, UserDiscountLimitDto, ApprovalStatus } from '../types/demand-types';
import { X, Check, Package, Calculator, Percent, DollarSign, Info, Folder } from 'lucide-react';

interface TemporaryStockData {
  productCode: string;
  groupCode?: string;
  quantity: number;
  unitPrice: number;
  discountRate1: number;
  discountRate2: number;
  discountRate3: number;
  currencyCode: string;
}

const areTemporaryStockDataEqual = (
  a: TemporaryStockData[],
  b: TemporaryStockData[]
): boolean => {
  if (a === b) return true;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    const left = a[i];
    const right = b[i];
    if (!left || !right) return false;
    if (left.productCode !== right.productCode) return false;
    if ((left.groupCode ?? '') !== (right.groupCode ?? '')) return false;
    if (left.quantity !== right.quantity) return false;
    if (left.unitPrice !== right.unitPrice) return false;
    if (left.discountRate1 !== right.discountRate1) return false;
    if (left.discountRate2 !== right.discountRate2) return false;
    if (left.discountRate3 !== right.discountRate3) return false;
    if (left.currencyCode !== right.currencyCode) return false;
  }
  return true;
};

function normalizeGroupCode(code?: string | null): string {
  return (code ?? '').trim().toUpperCase();
}

function toGroupRoot(code?: string | null): string {
  const normalized = normalizeGroupCode(code);
  return normalized.split('/')[0] ?? normalized;
}

function groupMatches(limitCode?: string | null, stockCode?: string | null): boolean {
  const limitNormalized = normalizeGroupCode(limitCode);
  const stockNormalized = normalizeGroupCode(stockCode);
  if (!limitNormalized || !stockNormalized) return false;
  if (limitNormalized === stockNormalized) return true;
  return toGroupRoot(limitNormalized) === toGroupRoot(stockNormalized);
}

interface DemandLineFormProps {
  line: DemandLineFormState;
  onSave: (line: DemandLineFormState) => void;
  onCancel: () => void;
  currency: number;
  exchangeRates?: DemandExchangeRateFormState[];
  pricingRules?: PricingRuleLineGetDto[];
  userDiscountLimits?: UserDiscountLimitDto[];
  onSaveMultiple?: (lines: DemandLineFormState[]) => void;
}

export function DemandLineForm({
  line,
  onSave,
  onCancel,
  currency,
  exchangeRates = [],
  pricingRules = [],
  userDiscountLimits = [],
  onSaveMultiple,
}: DemandLineFormProps): ReactElement {
  const { t } = useTranslation();
  const { calculateLineTotals } = useDemandCalculations();
  const [productDialogOpen, setProductDialogOpen] = useState(false);
  const { currencyOptions } = useCurrencyOptions();
  const { data: erpRates = [] } = useExchangeRate();
  const { data: projects = [] } = useErpProjects();
  const { handleProductSelect: handleProductSelectHook, handleProductSelectWithRelatedStocks } = useProductSelection({
    currency,
    exchangeRates,
  });

  const currencyCode = useMemo(() => {
    const found = currencyOptions.find((opt) => opt.dovizTipi === currency);
    return found?.code || 'TRY';
  }, [currency, currencyOptions]);

  const [formData, setFormData] = useState<DemandLineFormState>(line);
  const [relatedLines, setRelatedLines] = useState<DemandLineFormState[]>([]);
  const [pricingInfoOpen, setPricingInfoOpen] = useState(false);
  const [temporaryStockData, setTemporaryStockData] = useState<TemporaryStockData[]>([]);
  const [lastLoadedProductCode, setLastLoadedProductCode] = useState<string | null>(null);
  const [quantityInputValue, setQuantityInputValue] = useState<string>(String(line.quantity || ''));
  const [vatRateInputValue, setVatRateInputValue] = useState<string>(String(line.vatRate || ''));
  const [discountRate1InputValue, setDiscountRate1InputValue] = useState<string>(String(line.discountRate1 || ''));
  const [discountRate2InputValue, setDiscountRate2InputValue] = useState<string>(String(line.discountRate2 || ''));
  const [discountRate3InputValue, setDiscountRate3InputValue] = useState<string>(String(line.discountRate3 || ''));
  const prevDiscountRatesRef = useRef({ discountRate1: line.discountRate1, discountRate2: line.discountRate2, discountRate3: line.discountRate3 });

  const mainStockData = useMemo(() => {
    return temporaryStockData.find((data) => data.productCode === formData.productCode);
  }, [temporaryStockData, formData.productCode]);


  const activeGroupCode = useMemo(
    () => mainStockData?.groupCode || formData.groupCode || undefined,
    [mainStockData?.groupCode, formData.groupCode]
  );

  const discountValidation = useDiscountLimitValidation({
    groupCode: activeGroupCode,
    discountRate1: formData.discountRate1,
    discountRate2: formData.discountRate2,
    discountRate3: formData.discountRate3,
    userDiscountLimits,
  });

  const matchingPricingRules = useMemo(
    () =>
      pricingRules
        .filter((rule) => normalizeGroupCode(rule.stokCode) === normalizeGroupCode(formData.productCode))
        .sort((left, right) => (left.minQuantity ?? 0) - (right.minQuantity ?? 0)),
    [pricingRules, formData.productCode]
  );

  const matchingDiscountLimit = useMemo(
    () =>
      userDiscountLimits.find((limit) =>
        groupMatches(limit.erpProductGroupCode, activeGroupCode)
      ) ?? null,
    [userDiscountLimits, activeGroupCode]
  );

  const ruleInsightCount = matchingPricingRules.length + (matchingDiscountLimit ? 1 : 0);


  useEffect(() => {
    setFormData(line);
    setQuantityInputValue(String(line.quantity || ''));
    setVatRateInputValue(String(line.vatRate || ''));
    setDiscountRate1InputValue(String(line.discountRate1 || ''));
    setDiscountRate2InputValue(String(line.discountRate2 || ''));
    setDiscountRate3InputValue(String(line.discountRate3 || ''));
    const lineRelatedLines = (line as DemandLineFormState & { relatedLines?: DemandLineFormState[] }).relatedLines || [];
    if (lineRelatedLines.length > 0) {
      setRelatedLines(lineRelatedLines);
    } else {
      setRelatedLines([]);
    }
  }, [line]);

  useEffect(() => {
    const lineRelatedLines = (line as DemandLineFormState & { relatedLines?: DemandLineFormState[] }).relatedLines || [];
    const loadTemporaryStockData = async (): Promise<void> => {
      if (line.productCode && line.productName) {
        const targetCurrencyCode = currencyOptions.find((opt) => opt.dovizTipi === currency)?.code || 'TRY';
        
        const existingMainStockData = temporaryStockData.find((data) => data.productCode === line.productCode);
        const hasAllRelatedStocks = lineRelatedLines.every((relatedLine) => {
          if (!relatedLine.productCode) return true;
          return temporaryStockData.some((data) => data.productCode === relatedLine.productCode);
        });
        
        const shouldLoadFromApi = 
          (temporaryStockData.length === 0 || !existingMainStockData || !existingMainStockData.groupCode) &&
          lastLoadedProductCode !== line.productCode &&
          (!hasAllRelatedStocks || lineRelatedLines.some((relatedLine) => {
            if (!relatedLine.productCode) return false;
            const existingRelatedData = temporaryStockData.find((data) => data.productCode === relatedLine.productCode);
            return !existingRelatedData || !existingRelatedData.groupCode;
          }));

        if (shouldLoadFromApi) {
          try {
            const requests: Array<{ productCode: string; groupCode: string }> = [
              {
                productCode: line.productCode,
                groupCode: '',
              },
            ];

            for (const relatedLine of lineRelatedLines) {
              if (relatedLine.productCode) {
                requests.push({
                  productCode: relatedLine.productCode,
                  groupCode: '',
                });
              }
            }

            const prices = await demandApi.getPriceOfProduct(requests);

            const mainPrice = prices.find((p) => p.productCode === line.productCode) || prices[0];
            let mainUnitPrice = line.unitPrice;
            let mainDiscountRate1 = line.discountRate1;
            let mainDiscountRate2 = line.discountRate2;
            let mainDiscountRate3 = line.discountRate3;

            if (mainPrice) {
              const sourceCurrencyFromApi = mainPrice.currency || '';
              let sourceDovizTipi: number | null = null;
              if (sourceCurrencyFromApi) {
                const numericCurrency = parseInt(sourceCurrencyFromApi, 10);
                if (!isNaN(numericCurrency)) {
                  sourceDovizTipi = numericCurrency;
                } else {
                  const sourceCurrencyOption = currencyOptions.find(
                    (opt) => opt.code === sourceCurrencyFromApi || opt.dovizIsmi === sourceCurrencyFromApi
                  );
                  sourceDovizTipi = sourceCurrencyOption?.dovizTipi || null;
                }
              }

              if (sourceDovizTipi) {
                const sourceRate = findExchangeRateByDovizTipi(sourceDovizTipi, exchangeRates, erpRates);
                const targetRate = findExchangeRateByDovizTipi(currency, exchangeRates, erpRates);

                if (sourceRate && sourceRate > 0 && targetRate && targetRate > 0) {
                  if (sourceDovizTipi !== currency) {
                    mainUnitPrice = (mainPrice.listPrice ?? 0) * sourceRate / targetRate;
                  } else {
                    mainUnitPrice = mainPrice.listPrice ?? 0;
                  }
                } else {
                  mainUnitPrice = mainPrice.listPrice ?? 0;
                }
              } else {
                mainUnitPrice = mainPrice.listPrice ?? 0;
              }

              mainDiscountRate1 = mainPrice.discount1 ?? 0;
              mainDiscountRate2 = mainPrice.discount2 ?? 0;
              mainDiscountRate3 = mainPrice.discount3 ?? 0;
            }

            const mainStockData: TemporaryStockData = {
              productCode: line.productCode,
              groupCode: mainPrice?.groupCode || undefined,
              quantity: line.quantity,
              unitPrice: mainUnitPrice,
              discountRate1: mainDiscountRate1,
              discountRate2: mainDiscountRate2,
              discountRate3: mainDiscountRate3,
              currencyCode: targetCurrencyCode,
            };
            
            setFormData((prev) => ({
              ...prev,
              groupCode: mainStockData.groupCode || null,
            }));

            const relatedStocksData: TemporaryStockData[] = await Promise.all(
              lineRelatedLines.map(async (relatedLine) => {
                if (!relatedLine.productCode) {
                  return {
                    productCode: '',
                    groupCode: undefined,
                    quantity: relatedLine.quantity,
                    unitPrice: relatedLine.unitPrice,
                    discountRate1: relatedLine.discountRate1,
                    discountRate2: relatedLine.discountRate2,
                    discountRate3: relatedLine.discountRate3,
                    currencyCode: targetCurrencyCode,
                  };
                }

                const relatedPrice = prices.find((p) => p.productCode === relatedLine.productCode);
                let relatedUnitPrice = relatedLine.unitPrice;
                let relatedDiscountRate1 = relatedLine.discountRate1;
                let relatedDiscountRate2 = relatedLine.discountRate2;
                let relatedDiscountRate3 = relatedLine.discountRate3;

                if (relatedPrice) {
                  const sourceCurrencyFromApi = relatedPrice.currency || '';
                  let sourceDovizTipi: number | null = null;
                  if (sourceCurrencyFromApi) {
                    const numericCurrency = parseInt(sourceCurrencyFromApi, 10);
                    if (!isNaN(numericCurrency)) {
                      sourceDovizTipi = numericCurrency;
                    } else {
                      const sourceCurrencyOption = currencyOptions.find(
                        (opt) => opt.code === sourceCurrencyFromApi || opt.dovizIsmi === sourceCurrencyFromApi
                      );
                      sourceDovizTipi = sourceCurrencyOption?.dovizTipi || null;
                    }
                  }

                  if (sourceDovizTipi) {
                    const sourceRate = findExchangeRateByDovizTipi(sourceDovizTipi, exchangeRates, erpRates);
                    const targetRate = findExchangeRateByDovizTipi(currency, exchangeRates, erpRates);

                    if (sourceRate && sourceRate > 0 && targetRate && targetRate > 0) {
                      if (sourceDovizTipi !== currency) {
                        relatedUnitPrice = (relatedPrice.listPrice ?? 0) * sourceRate / targetRate;
                      } else {
                        relatedUnitPrice = relatedPrice.listPrice ?? 0;
                      }
                    } else {
                      relatedUnitPrice = relatedPrice.listPrice ?? 0;
                    }
                  } else {
                    relatedUnitPrice = relatedPrice.listPrice ?? 0;
                  }

                  relatedDiscountRate1 = relatedPrice.discount1 ?? 0;
                  relatedDiscountRate2 = relatedPrice.discount2 ?? 0;
                  relatedDiscountRate3 = relatedPrice.discount3 ?? 0;
                }

                return {
                  productCode: relatedLine.productCode,
                  groupCode: relatedPrice?.groupCode || undefined,
                  quantity: relatedLine.quantity,
                  unitPrice: relatedUnitPrice,
                  discountRate1: relatedDiscountRate1,
                  discountRate2: relatedDiscountRate2,
                  discountRate3: relatedDiscountRate3,
                  currencyCode: targetCurrencyCode,
                };
              })
            );
            
            setTemporaryStockData((prev) => {
              const next = [mainStockData, ...relatedStocksData];
              return areTemporaryStockDataEqual(prev, next) ? prev : next;
            });
            setLastLoadedProductCode((prev) => (prev === line.productCode ? prev : line.productCode));
          } catch {
            const mainStockData: TemporaryStockData = {
              productCode: line.productCode,
              groupCode: line.groupCode || undefined,
              quantity: line.quantity,
              unitPrice: line.unitPrice,
              discountRate1: line.discountRate1,
              discountRate2: line.discountRate2,
              discountRate3: line.discountRate3,
              currencyCode: targetCurrencyCode,
            };

            const relatedStocksData: TemporaryStockData[] = lineRelatedLines.map((relatedLine) => {
              const groupCode = relatedLine.groupCode || undefined;
              return {
                productCode: relatedLine.productCode || '',
                groupCode: groupCode,
                quantity: relatedLine.quantity,
                unitPrice: relatedLine.unitPrice,
                discountRate1: relatedLine.discountRate1,
                discountRate2: relatedLine.discountRate2,
                discountRate3: relatedLine.discountRate3,
                currencyCode: targetCurrencyCode,
              };
            });

            setTemporaryStockData((prev) => {
              const next = [mainStockData, ...relatedStocksData];
              return areTemporaryStockDataEqual(prev, next) ? prev : next;
            });
            setLastLoadedProductCode((prev) => (prev === line.productCode ? prev : line.productCode));
          }
        } else {
          const existingMainStockData = temporaryStockData.find((data) => data.productCode === line.productCode);
          const mainStockData: TemporaryStockData = {
            productCode: line.productCode,
            groupCode: existingMainStockData?.groupCode || undefined,
            quantity: line.quantity,
            unitPrice: line.unitPrice,
            discountRate1: line.discountRate1,
            discountRate2: line.discountRate2,
            discountRate3: line.discountRate3,
            currencyCode: targetCurrencyCode,
          };
          
          if (existingMainStockData?.groupCode) {
            setFormData((prev) => ({
              ...prev,
              groupCode: existingMainStockData.groupCode || null,
            }));
          }

          const relatedStocksData: TemporaryStockData[] = lineRelatedLines.map((relatedLine) => {
            const existingRelatedStockData = temporaryStockData.find((data) => data.productCode === relatedLine.productCode);
            const groupCode = existingRelatedStockData?.groupCode || relatedLine.groupCode || undefined;
            return {
              productCode: relatedLine.productCode || '',
              groupCode: groupCode,
              quantity: relatedLine.quantity,
              unitPrice: relatedLine.unitPrice,
              discountRate1: relatedLine.discountRate1,
              discountRate2: relatedLine.discountRate2,
              discountRate3: relatedLine.discountRate3,
              currencyCode: targetCurrencyCode,
            };
          });

          setTemporaryStockData((prev) => {
            const next = [mainStockData, ...relatedStocksData];
            return areTemporaryStockDataEqual(prev, next) ? prev : next;
          });
        }
      } else {
        setTemporaryStockData((prev) => (prev.length === 0 ? prev : []));
      }
    };

    void loadTemporaryStockData();
  }, [line, currency, currencyOptions, exchangeRates, erpRates, lastLoadedProductCode, temporaryStockData]);

  useEffect(() => {
    if (
      prevDiscountRatesRef.current.discountRate1 !== formData.discountRate1 ||
      prevDiscountRatesRef.current.discountRate2 !== formData.discountRate2 ||
      prevDiscountRatesRef.current.discountRate3 !== formData.discountRate3
    ) {
      setDiscountRate1InputValue(String(formData.discountRate1 || ''));
      setDiscountRate2InputValue(String(formData.discountRate2 || ''));
      setDiscountRate3InputValue(String(formData.discountRate3 || ''));
      prevDiscountRatesRef.current = {
        discountRate1: formData.discountRate1,
        discountRate2: formData.discountRate2,
        discountRate3: formData.discountRate3,
      };
    }
  }, [formData.discountRate1, formData.discountRate2, formData.discountRate3]);

  const convertPriceWithCurrency = (
    price: number,
    sourceCurrencyCode: string,
    targetCurrency: number
  ): number => {
    if (!sourceCurrencyCode) {
      return price;
    }

    const sourceCurrencyOption = currencyOptions.find(
      (opt) => opt.code === sourceCurrencyCode || opt.dovizIsmi === sourceCurrencyCode
    );
    const sourceDovizTipi = sourceCurrencyOption?.dovizTipi;

    if (!sourceDovizTipi) {
      return price;
    }

    if (sourceDovizTipi === targetCurrency) {
      return price;
    }

    const sourceRate = findExchangeRateByDovizTipi(sourceDovizTipi, exchangeRates, erpRates);
    const targetRate = findExchangeRateByDovizTipi(targetCurrency, exchangeRates, erpRates);

    if (!sourceRate || sourceRate <= 0 || !targetRate || targetRate <= 0) {
      return price;
    }

    const priceInTL = price * sourceRate;
    const finalPrice = priceInTL / targetRate;

    return finalPrice;
  };

  const handleProductSelect = async (product: ProductSelectionResult): Promise<void> => {
    const hasRelatedStocks = product.relatedStockIds && product.relatedStockIds.length > 0;

    if (hasRelatedStocks && handleProductSelectWithRelatedStocks && product.relatedStockIds) {
      const allLines = await handleProductSelectWithRelatedStocks(product, product.relatedStockIds);

      if (allLines.length > 0) {
        const mainLine = {
          ...allLines[0],
          id: formData.id,
          groupCode: product.groupCode || null,
        };
        setFormData(mainLine);
        const relatedLinesData = allLines.slice(1).map((relatedLine, index) => {
          const relatedStockIdFromArray = product.relatedStockIds?.[index];
          if (relatedStockIdFromArray) {
            return {
              ...relatedLine,
              groupCode: relatedLine.groupCode || null,
            };
          }
          return relatedLine;
        });
        setRelatedLines(relatedLinesData);

        const targetCurrencyCode = currencyOptions.find((opt) => opt.dovizTipi === currency)?.code || 'TRY';
        const mainStockData: TemporaryStockData = {
          productCode: mainLine.productCode || '',
          groupCode: product.groupCode,
          quantity: mainLine.quantity,
          unitPrice: mainLine.unitPrice,
          discountRate1: mainLine.discountRate1,
          discountRate2: mainLine.discountRate2,
          discountRate3: mainLine.discountRate3,
          currencyCode: targetCurrencyCode,
        };

        const relatedStocksData: TemporaryStockData[] = relatedLinesData.map((relatedLine) => ({
          productCode: relatedLine.productCode || '',
          groupCode: relatedLine.groupCode || undefined,
          quantity: relatedLine.quantity,
          unitPrice: relatedLine.unitPrice,
          discountRate1: relatedLine.discountRate1,
          discountRate2: relatedLine.discountRate2,
          discountRate3: relatedLine.discountRate3,
          currencyCode: targetCurrencyCode,
        }));

        setTemporaryStockData((prev) => {
          const next = [mainStockData, ...relatedStocksData];
          return areTemporaryStockDataEqual(prev, next) ? prev : next;
        });
      }
    } else {
      const newLine = await handleProductSelectHook(product);

      const updatedFormData = {
        ...newLine,
        id: formData.id,
        groupCode: product.groupCode || null,
      };

      setFormData(updatedFormData);
      setRelatedLines([]);

      const targetCurrencyCode = currencyOptions.find((opt) => opt.dovizTipi === currency)?.code || 'TRY';
      const mainStockData: TemporaryStockData = {
        productCode: updatedFormData.productCode || '',
        groupCode: product.groupCode,
        quantity: updatedFormData.quantity,
        unitPrice: updatedFormData.unitPrice,
        discountRate1: updatedFormData.discountRate1,
        discountRate2: updatedFormData.discountRate2,
        discountRate3: updatedFormData.discountRate3,
        currencyCode: targetCurrencyCode,
      };

      setTemporaryStockData((prev) => {
        const next = [mainStockData];
        return areTemporaryStockDataEqual(prev, next) ? prev : next;
      });
    }
  };

  const handleFieldChange = (field: keyof DemandLineFormState, value: unknown): void => {
    const updated = { ...formData, [field]: value };
    let calculated = calculateLineTotals(updated);

    if (field === 'quantity' && formData.productCode) {
      const newQuantity = value as number;
      const mainStockData = temporaryStockData.find((data) => data.productCode === formData.productCode);
      const matchingPricingRule = pricingRules
        .filter((rule) => normalizeGroupCode(rule.stokCode) === normalizeGroupCode(formData.productCode))
        .filter((rule) => {
          const minQuantity = rule.minQuantity ?? 0;
          const maxQuantity = rule.maxQuantity ?? Infinity;
          return newQuantity >= minQuantity && newQuantity <= maxQuantity;
        })
        .sort((left, right) => (right.minQuantity ?? 0) - (left.minQuantity ?? 0))[0];

      if (matchingPricingRule) {
        if (matchingPricingRule.fixedUnitPrice !== null && matchingPricingRule.fixedUnitPrice !== undefined) {
          const convertedPrice = convertPriceWithCurrency(
            matchingPricingRule.fixedUnitPrice,
            matchingPricingRule.currencyCode,
            currency
          );

          calculated = {
            ...calculated,
            unitPrice: convertedPrice,
            discountRate1: matchingPricingRule.discountRate1,
            discountRate2: matchingPricingRule.discountRate2,
            discountRate3: matchingPricingRule.discountRate3,
            pricingRuleHeaderId: matchingPricingRule.pricingRuleHeaderId,
          };
          calculated = calculateLineTotals(calculated);
        } else {
          calculated = {
            ...calculated,
            discountRate1: matchingPricingRule.discountRate1,
            discountRate2: matchingPricingRule.discountRate2,
            discountRate3: matchingPricingRule.discountRate3,
            pricingRuleHeaderId: matchingPricingRule.pricingRuleHeaderId,
          };
          calculated = calculateLineTotals(calculated);
        }
      } else if (mainStockData) {
        calculated = {
          ...calculated,
          unitPrice: mainStockData.unitPrice,
          discountRate1: mainStockData.discountRate1,
          discountRate2: mainStockData.discountRate2,
          discountRate3: mainStockData.discountRate3,
          pricingRuleHeaderId: null,
        };
        calculated = calculateLineTotals(calculated);
      }
    }

    if ((field === 'discountRate1' || field === 'discountRate2' || field === 'discountRate3') && formData.productCode && activeGroupCode) {
      const discountRate1 = field === 'discountRate1' ? (value as number) : calculated.discountRate1;
      const discountRate2 = field === 'discountRate2' ? (value as number) : calculated.discountRate2;
      const discountRate3 = field === 'discountRate3' ? (value as number) : calculated.discountRate3;

      const matchingLimit = userDiscountLimits.find(
        (limit) => groupMatches(limit.erpProductGroupCode, activeGroupCode)
      );

      if (matchingLimit) {
        const exceedsLimit1 = discountRate1 > matchingLimit.maxDiscount1;
        const exceedsLimit2 =
          matchingLimit.maxDiscount2 !== null &&
          matchingLimit.maxDiscount2 !== undefined
            ? discountRate2 > matchingLimit.maxDiscount2
            : false;
        const exceedsLimit3 =
          matchingLimit.maxDiscount3 !== null &&
          matchingLimit.maxDiscount3 !== undefined
            ? discountRate3 > matchingLimit.maxDiscount3
            : false;

        const exceedsLimit = exceedsLimit1 || exceedsLimit2 || exceedsLimit3;
        const approvalStatus = exceedsLimit ? 1 : 0;

        calculated = {
          ...calculated,
          approvalStatus: approvalStatus as ApprovalStatus,
        };
      }
    } else if (activeGroupCode && userDiscountLimits.length > 0) {
      calculated = {
        ...calculated,
        approvalStatus: discountValidation.approvalStatus,
      };
    }

    setFormData(calculated);

    if (field === 'quantity' && formData.productCode) {
      setDiscountRate1InputValue(String(calculated.discountRate1 || ''));
      setDiscountRate2InputValue(String(calculated.discountRate2 || ''));
      setDiscountRate3InputValue(String(calculated.discountRate3 || ''));
    }

    if (field === 'quantity' && formData.relatedProductKey && relatedLines.length > 0) {
      const newQuantity = value as number;
      const updatedRelatedLines = relatedLines.map((relatedLine) => {
        const relatedStockData = temporaryStockData.find(
          (data) => data.productCode === relatedLine.productCode
        );

        if (relatedStockData) {
          const newRelatedQuantity = relatedStockData.quantity * newQuantity;
          const updatedRelatedLine = { 
            ...relatedLine, 
            quantity: newRelatedQuantity,
            groupCode: relatedLine.groupCode || relatedStockData.groupCode || null,
          };
          return calculateLineTotals(updatedRelatedLine);
        }

        return relatedLine;
      });
      setRelatedLines(updatedRelatedLines);
    }
  };

  const handleSave = (): void => {
    if (onSaveMultiple && relatedLines.length > 0) {
      const linesToSave = [formData, ...relatedLines];
      onSaveMultiple(linesToSave);
    } else {
      onSave(formData);
    }
  };


  const totalDiscount = (formData.discountAmount1 || 0) + (formData.discountAmount2 || 0) + (formData.discountAmount3 || 0);
  const hasDiscount = totalDiscount > 0;
  const hasApprovalWarning = discountValidation.exceedsLimit || formData.approvalStatus === 1;

  return (
    <Card className={`border-2 ${hasApprovalWarning ? 'border-red-500 bg-red-50/50 dark:bg-red-950/20' : 'border-primary/20'} bg-card`}>
      <CardContent className="p-4 space-y-4">
        <div className="flex items-center justify-between pb-2 border-b">
          <h4 className="text-base font-semibold flex items-center gap-2">
            <Package className="h-4 w-4 text-primary" />
            {t('demand.lines.editLine', 'Satır Düzenle')}
          </h4>
          <div className="flex items-center gap-2">
            {hasApprovalWarning && (
              <Badge variant="outline" className="text-red-600 border-red-600 bg-red-50 dark:bg-red-950/30 text-xs">
                {t('demand.lines.approvalRequired', 'Onay Gerekli')}
              </Badge>
            )}
            {(!formData.productCode || !formData.productName) && (
              <Badge variant="outline" className="text-orange-600 border-orange-600 text-xs">
                {t('demand.lines.selectStockFirst', 'Stok seçilmedi')}
              </Badge>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-1.5 md:col-span-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium flex items-center gap-2">
                <Package className="h-3.5 w-3.5" />
                {t('demand.lines.stock', 'Stok')} *
              </label>
              <Button
                type="button"
                variant="default"
                onClick={() => setProductDialogOpen(true)}
                className="gap-2"
                size="sm"
              >
                <Package className="h-3.5 w-3.5" />
                {t('demand.lines.selectStock', 'Stok Seç')}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setPricingInfoOpen(true)}
                disabled={!formData.productCode}
                className="gap-2"
                size="sm"
              >
                <Info className="h-3.5 w-3.5" />
                {t('common.pricingInsights.button', 'Kural')}
                {ruleInsightCount > 0 && (
                  <span className="inline-flex min-w-5 h-5 px-1 items-center justify-center rounded-full bg-pink-500 text-white text-[10px] font-bold">
                    {ruleInsightCount}
                  </span>
                )}
              </Button>
            </div>
            <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
              <Input
                value={formData.productCode || ''}
                placeholder={t('demand.lines.productCode', 'Stok Kodu')}
                readOnly
                className="bg-muted/50 font-mono text-sm h-9"
              />
              <Input
                value={formData.groupCode || ''}
                placeholder={t('demand.lines.groupCode', 'Grup Kodu')}
                readOnly
                className="bg-muted/50 font-mono text-sm h-9"
              />
              <Input
                value={formData.productName || ''}
                placeholder={t('demand.lines.productName', 'Stok Adı')}
                readOnly
                className="bg-muted/50 text-sm h-9"
              />
            </div>
            <div className="w-full">
              <label className="text-sm font-medium flex items-center gap-2 mb-1.5">
                <Folder className="h-3.5 w-3.5 text-slate-500" />
                {t('quotation.header.projectCode', 'Proje Kodu')}
              </label>
              <VoiceSearchCombobox
                className="h-11 bg-slate-50 dark:bg-[#0f0a18] border-slate-200 dark:border-white/10 rounded-xl"
                value={formData.projectCode || ''}
                onSelect={(value) => handleFieldChange('projectCode', value)}
                options={projects.map((p) => ({
                  value: p.projeKod,
                  label: p.projeAciklama ? `${p.projeKod} - ${p.projeAciklama}` : p.projeKod
                }))}
                placeholder={t('quotation.header.projectCodePlaceholder', 'Proje kodu seçiniz...')}
                searchPlaceholder={t('common.search', 'Ara...')}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <DollarSign className="h-3.5 w-3.5" />
                {t('demand.lines.unitPrice', 'Birim Fiyat')} *
              </label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={formData.unitPrice}
                readOnly
                className="bg-muted/50 font-medium"
              />
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  {t('demand.lines.quantity', 'Miktar')} *
                </label>
                <Input
                  type="number"
                  step="0.001"
                  min="0.01"
                  value={quantityInputValue}
                  onChange={(e) => {
                    const inputValue = e.target.value;
                    setQuantityInputValue(inputValue);
                    if (inputValue === '' || inputValue === '.') {
                      handleFieldChange('quantity', 0);
                    } else {
                      const numValue = parseFloat(inputValue);
                      if (!isNaN(numValue)) {
                        handleFieldChange('quantity', numValue);
                      }
                    }
                  }}
                  onBlur={() => {
                    if (quantityInputValue === '' || quantityInputValue === '.') {
                      setQuantityInputValue('0');
                      handleFieldChange('quantity', 0);
                    } else {
                      const numValue = parseFloat(quantityInputValue);
                      if (!isNaN(numValue)) {
                        setQuantityInputValue(String(numValue));
                      }
                    }
                  }}
                  className="font-medium"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">
                {t('demand.lines.vatRate', 'KDV Oranı %')}
              </label>
              <Input
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={vatRateInputValue}
                onChange={(e) => {
                  const inputValue = e.target.value;
                  setVatRateInputValue(inputValue);
                  if (inputValue === '' || inputValue === '.') {
                    handleFieldChange('vatRate', 0);
                  } else {
                    const numValue = parseFloat(inputValue);
                    if (!isNaN(numValue)) {
                      handleFieldChange('vatRate', numValue);
                    }
                  }
                }}
                onBlur={() => {
                  if (vatRateInputValue === '' || vatRateInputValue === '.') {
                    setVatRateInputValue('0');
                    handleFieldChange('vatRate', 0);
                  } else {
                    const numValue = parseFloat(vatRateInputValue);
                    if (!isNaN(numValue)) {
                      setVatRateInputValue(String(numValue));
                    }
                  }
                }}
              />
            </div>
          </div>

          <div className="space-y-2 md:col-span-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <Percent className="h-3.5 w-3.5" />
              {t('demand.lines.discounts', 'İndirimler')}
            </label>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <div className="space-y-1.5 p-2 border rounded-md bg-muted/10">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-muted-foreground">
                    {t('demand.lines.discount1', 'İndirim 1 %')}
                  </label>
                  <span className="text-xs font-semibold text-red-600 dark:text-red-400">
                    {formData.discountAmount1 > 0 ? '-' : ''}{formatCurrency(formData.discountAmount1 || 0, currencyCode)}
                  </span>
                </div>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={discountRate1InputValue}
                  onChange={(e) => {
                    const inputValue = e.target.value;
                    setDiscountRate1InputValue(inputValue);
                    if (inputValue === '' || inputValue === '.') {
                      handleFieldChange('discountRate1', 0);
                    } else {
                      const numValue = parseFloat(inputValue);
                      if (!isNaN(numValue)) {
                        handleFieldChange('discountRate1', numValue);
                      }
                    }
                  }}
                  onBlur={() => {
                    if (discountRate1InputValue === '' || discountRate1InputValue === '.') {
                      setDiscountRate1InputValue('0');
                      handleFieldChange('discountRate1', 0);
                    } else {
                      const numValue = parseFloat(discountRate1InputValue);
                      if (!isNaN(numValue)) {
                        setDiscountRate1InputValue(String(numValue));
                      }
                    }
                  }}
                  placeholder="0"
                  className="text-sm h-9"
                />
              </div>
              <div className="space-y-1.5 p-2 border rounded-md bg-muted/10">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-muted-foreground">
                    {t('demand.lines.discount2', 'İndirim 2 %')}
                  </label>
                  <span className="text-xs font-semibold text-red-600 dark:text-red-400">
                    {formData.discountAmount2 > 0 ? '-' : ''}{formatCurrency(formData.discountAmount2 || 0, currencyCode)}
                  </span>
                </div>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={discountRate2InputValue}
                  onChange={(e) => {
                    const inputValue = e.target.value;
                    setDiscountRate2InputValue(inputValue);
                    if (inputValue === '' || inputValue === '.') {
                      handleFieldChange('discountRate2', 0);
                    } else {
                      const numValue = parseFloat(inputValue);
                      if (!isNaN(numValue)) {
                        handleFieldChange('discountRate2', numValue);
                      }
                    }
                  }}
                  onBlur={() => {
                    if (discountRate2InputValue === '' || discountRate2InputValue === '.') {
                      setDiscountRate2InputValue('0');
                      handleFieldChange('discountRate2', 0);
                    } else {
                      const numValue = parseFloat(discountRate2InputValue);
                      if (!isNaN(numValue)) {
                        setDiscountRate2InputValue(String(numValue));
                      }
                    }
                  }}
                  placeholder="0"
                  className="text-sm h-9"
                />
              </div>
              <div className="space-y-1.5 p-2 border rounded-md bg-muted/10">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-muted-foreground">
                    {t('demand.lines.discount3', 'İndirim 3 %')}
                  </label>
                  <span className="text-xs font-semibold text-red-600 dark:text-red-400">
                    {formData.discountAmount3 > 0 ? '-' : ''}{formatCurrency(formData.discountAmount3 || 0, currencyCode)}
                  </span>
                </div>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={discountRate3InputValue}
                  onChange={(e) => {
                    const inputValue = e.target.value;
                    setDiscountRate3InputValue(inputValue);
                    if (inputValue === '' || inputValue === '.') {
                      handleFieldChange('discountRate3', 0);
                    } else {
                      const numValue = parseFloat(inputValue);
                      if (!isNaN(numValue)) {
                        handleFieldChange('discountRate3', numValue);
                      }
                    }
                  }}
                  onBlur={() => {
                    if (discountRate3InputValue === '' || discountRate3InputValue === '.') {
                      setDiscountRate3InputValue('0');
                      handleFieldChange('discountRate3', 0);
                    } else {
                      const numValue = parseFloat(discountRate3InputValue);
                      if (!isNaN(numValue)) {
                        setDiscountRate3InputValue(String(numValue));
                      }
                    }
                  }}
                  placeholder="0"
                  className="text-sm h-9"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-muted/30 rounded-lg p-3 space-y-2 border">
          <div className="flex items-center gap-2 mb-2">
            <Calculator className="h-3.5 w-3.5 text-primary" />
            <span className="text-sm font-semibold">
              {t('demand.lines.calculations', 'Hesaplamalar')}
            </span>
          </div>
          <div className="grid grid-cols-1 gap-2 text-sm">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">
                {t('demand.lines.discountAmount', 'Toplam İndirim')}:
              </span>
              <span className={`font-medium ${hasDiscount ? 'text-red-600 dark:text-red-400' : 'text-muted-foreground'}`}>
                {hasDiscount ? '-' : ''}{formatCurrency(totalDiscount, currencyCode)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">
                {t('demand.lines.netPrice', 'Net Fiyat')}:
              </span>
              <span className="font-medium text-green-600 dark:text-green-400">
                {formatCurrency(formData.lineTotal || 0, currencyCode)}
              </span>
            </div>
            <div className="flex justify-between items-center pt-2 border-t font-semibold">
              <span>
                {t('demand.lines.lineTotal', 'Satır Toplamı (KDV Dahil)')}:
              </span>
              <span className="text-primary text-base">
                {formatCurrency(formData.lineGrandTotal, currencyCode)}
              </span>
            </div>
          </div>
        </div>

        {relatedLines.length > 0 && (
          <div className="space-y-4 pt-4 border-t">
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-primary" />
              <h5 className="text-sm font-semibold">
                {t('demand.lines.relatedStocks', 'Bağlı Stoklar')} ({relatedLines.length})
              </h5>
            </div>
            <div className="space-y-3">
              {relatedLines.map((relatedLine) => (
                <div key={relatedLine.id} className="p-3 border rounded-md bg-muted/30">
                  <div className="grid grid-cols-1 gap-2 md:grid-cols-2 mb-2">
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">
                        {t('demand.lines.productCode', 'Stok Kodu')}
                      </div>
                      <div className="font-mono text-sm font-medium">
                        {relatedLine.productCode || '-'}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-muted-foreground mb-1">
                        {t('demand.lines.productName', 'Stok Adı')}
                      </div>
                      <div className="text-sm font-medium">
                        {relatedLine.productName || '-'}
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-muted-foreground">
                        {t('demand.lines.quantity', 'Miktar')}:
                      </span>
                      <span className="ml-2 font-medium">{relatedLine.quantity}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">
                        {t('demand.lines.unitPrice', 'Birim Fiyat')}:
                      </span>
                      <span className="ml-2 font-medium">
                        {formatCurrency(relatedLine.unitPrice, currencyCode)}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">
                        {t('demand.lines.netPrice', 'Net Fiyat')}:
                      </span>
                      <span className="ml-2 font-medium text-green-600 dark:text-green-400">
                        {formatCurrency(relatedLine.lineTotal || 0, currencyCode)}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">
                        {t('demand.lines.lineTotal', 'Toplam')}:
                      </span>
                      <span className="ml-2 font-medium text-primary">
                        {formatCurrency(relatedLine.lineGrandTotal, currencyCode)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2 border-t">
          <Button type="button" variant="outline" onClick={onCancel} size="sm" className="gap-2">
            <X className="h-4 w-4" />
            {t('demand.cancel', 'İptal')}
          </Button>
          <Button 
            type="button" 
            onClick={handleSave} 
            size="sm" 
            className="gap-2"
            disabled={!formData.productCode || !formData.productName}
          >
            <Check className="h-4 w-4" />
            {t('demand.save', 'Kaydet')}
          </Button>
        </div>

        <ProductSelectDialog
          open={productDialogOpen}
          onOpenChange={setProductDialogOpen}
          onSelect={handleProductSelect}
        />
        <PricingRuleInsightDialog
          open={pricingInfoOpen}
          onOpenChange={setPricingInfoOpen}
          productCode={formData.productCode}
          activeGroupCode={activeGroupCode}
          rules={matchingPricingRules}
          discountLimit={matchingDiscountLimit}
        />
      </CardContent>
    </Card>
  );
}

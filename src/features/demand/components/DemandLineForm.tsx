'use client';

import { type ReactElement, useState, useEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
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
import { X, Check, Package, Calculator, Percent, DollarSign, Info, Folder, FileText, Layers } from 'lucide-react';
import { cn } from '@/lib/utils';

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
}

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

 const handleSave = (e?: React.MouseEvent): void => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
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

  const styles = {
    inputBase: "h-11 bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm transition-all duration-300 focus-visible:ring-4 focus-visible:ring-pink-500/10 focus-visible:border-pink-500 outline-none w-full px-3 text-sm",
    label: "text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-2 flex items-center gap-2",
    iconWrapper: "p-1.5 rounded-lg flex items-center justify-center shrink-0",
    sectionCard: "rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 p-4 sm:p-5 shadow-sm",
  };

  return (
    <div className={cn(
      "relative space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500",
      hasApprovalWarning ? "rounded-2xl border-2 border-amber-500 shadow-[0_0_20px_-5px_rgba(245,158,11,0.3)] bg-amber-50/10 dark:bg-amber-950/10" : ""
    )}>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-linear-to-br from-indigo-500 to-violet-600 shadow-lg shadow-indigo-500/20 text-white shrink-0">
              <Package className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-zinc-900 dark:text-white">
                {t('demand.lines.editLine')}
              </h3>
              <p className="text-xs text-zinc-500 font-medium">Stok kalemi detaylarını düzenleyin</p>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-2">
            {hasApprovalWarning && (
              <Badge className="h-7 px-3 bg-amber-100 text-amber-700 hover:bg-amber-100 dark:bg-amber-900/30 dark:text-amber-400 border border-amber-200 dark:border-amber-800/50 rounded-full font-bold shadow-sm">
                <span className="relative flex h-2 w-2 mr-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                </span>
                {t('demand.lines.approvalRequired')}
              </Badge>
            )}
            {(!formData.productCode || !formData.productName) && (
              <Badge className="h-7 px-3 bg-orange-100 text-orange-700 hover:bg-orange-100 dark:bg-orange-900/30 dark:text-orange-400 border border-orange-200 dark:border-orange-800/50 rounded-full font-bold shadow-sm">
                {t('demand.lines.selectStockFirst')}
              </Badge>
            )}
          </div>
        </div>

        <div className={styles.sectionCard}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4 md:col-span-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <label className={cn(styles.label, "mb-0")}>
                  <div className={cn(styles.iconWrapper, "bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600")}>
                    <Package className="w-3.5 h-3.5" />
                  </div>
                  {t('demand.lines.stock')} *
                </label>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
                  <Button
                    type="button"
                    onClick={() => setProductDialogOpen(true)}
                    className="w-full sm:w-auto h-10 px-6 rounded-xl bg-linear-to-r from-pink-600 to-orange-600 text-white font-bold shadow-lg shadow-pink-500/20 hover:scale-105 active:scale-95 transition-all duration-300 border-0 hover:text-white"
                    size="sm"
                  >
                    <Package className="h-4 w-4 mr-2" />
                    {t('demand.lines.selectStock')}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setPricingInfoOpen(true)}
                    disabled={!formData.productCode}
                    className="w-full sm:w-auto h-10 rounded-xl border-zinc-200 dark:border-zinc-800 hover:border-pink-500 hover:text-pink-600 transition-colors bg-white dark:bg-zinc-950"
                    size="sm"
                  >
                    <Info className="h-4 w-4 mr-2" />
                    {t('common.pricingInsights.button')}
                    {ruleInsightCount > 0 && (
                      <span className="ml-2 inline-flex h-5 items-center justify-center rounded-full bg-pink-100 dark:bg-pink-900/30 px-2 text-[10px] font-bold text-pink-600 dark:text-pink-400 border border-pink-200 dark:border-pink-800/50">
                        {ruleInsightCount} Fırsat
                      </span>
                    )}
                  </Button>
                </div>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Input
                  value={formData.productCode || ''}
                  placeholder={t('demand.lines.productCode')}
                  readOnly
                  className={cn(styles.inputBase, "bg-zinc-50 dark:bg-zinc-900 font-mono text-zinc-500")}
                />
                <Input
                  value={formData.groupCode || ''}
                  placeholder={t('demand.lines.groupCode')}
                  readOnly
                  className={cn(styles.inputBase, "bg-zinc-50 dark:bg-zinc-900 font-mono text-zinc-500")}
                />
                <Input
                  value={formData.productName || ''}
                  placeholder={t('demand.lines.productName')}
                  readOnly
                  className={cn(styles.inputBase, "bg-zinc-50 dark:bg-zinc-900 text-zinc-500")}
                />
              </div>
            </div>

            <div className="md:col-span-2">
              <label className={styles.label}>
                <div className={cn(styles.iconWrapper, "bg-slate-100 dark:bg-slate-800/50 text-slate-500")}>
                  <Folder className="w-3.5 h-3.5" />
                </div>
                {t('quotation.header.projectCode')}
              </label>
              <VoiceSearchCombobox
                className={styles.inputBase}
                value={formData.projectCode || ''}
                onSelect={(value) => handleFieldChange('projectCode', value)}
                options={projects.map((p) => ({
                  value: p.projeKod,
                  label: p.projeAciklama ? `${p.projeKod} - ${p.projeAciklama}` : p.projeKod
                }))}
                placeholder={t('quotation.header.projectCodePlaceholder')}
                searchPlaceholder={t('common.search')}
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <div className={cn(styles.sectionCard, "space-y-4")}>
             <label className={styles.label}>
               <div className={cn(styles.iconWrapper, "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600")}>
                 <DollarSign className="w-3.5 h-3.5" />
               </div>
               Fiyat & Miktar
             </label>
             
             <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
               <div>
                  <label className="text-xs font-semibold text-zinc-500 mb-1.5 block">
                    {t('demand.lines.unitPrice')} *
                  </label>
                  <div className="relative">
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.unitPrice}
                      readOnly
                      className={cn(styles.inputBase, "pr-14 bg-zinc-50 dark:bg-zinc-900 font-mono font-bold text-zinc-700 dark:text-zinc-300")}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 text-sm font-bold pointer-events-none">
                      {currencyCode}
                    </span>
                  </div>
               </div>
               <div>
                  <label className="text-xs font-semibold text-zinc-500 mb-1.5 block">
                    {t('demand.lines.quantity')} *
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
                        if (!isNaN(numValue)) handleFieldChange('quantity', numValue);
                      }
                    }}
                    onBlur={() => {
                      if (quantityInputValue === '' || quantityInputValue === '.') {
                        setQuantityInputValue('0');
                        handleFieldChange('quantity', 0);
                      } else {
                        const numValue = parseFloat(quantityInputValue);
                        if (!isNaN(numValue)) setQuantityInputValue(String(numValue));
                      }
                    }}
                    className={cn(styles.inputBase, "font-bold")}
                  />
               </div>
               <div className="sm:col-span-2">
                  <label className="text-xs font-semibold text-zinc-500 mb-1.5 block">
                    {t('demand.lines.vatRate')} (%)
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
                        if (!isNaN(numValue)) handleFieldChange('vatRate', numValue);
                      }
                    }}
                    onBlur={() => {
                      if (vatRateInputValue === '' || vatRateInputValue === '.') {
                        setVatRateInputValue('0');
                        handleFieldChange('vatRate', 0);
                      } else {
                        const numValue = parseFloat(vatRateInputValue);
                        if (!isNaN(numValue)) setVatRateInputValue(String(numValue));
                      }
                    }}
                    className={styles.inputBase}
                  />
               </div>
             </div>
          </div>

          <div className={cn(styles.sectionCard, "space-y-4")}>
             <label className={styles.label}>
               <div className={cn(styles.iconWrapper, "bg-rose-50 dark:bg-rose-900/20 text-rose-600")}>
                 <Percent className="w-3.5 h-3.5" />
               </div>
               {t('demand.lines.discounts')}
             </label>

             <div className="grid grid-cols-1 gap-3">
               <div className="relative overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30 p-3">
                 <div className="flex items-center justify-between mb-2">
                   <label className="text-xs font-bold text-zinc-600 dark:text-zinc-400">
                     {t('demand.lines.discount1')} (%)
                   </label>
                   <span className="text-xs font-black text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/30 px-2 py-0.5 rounded-md border border-rose-100 dark:border-rose-900/50">
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
                       if (!isNaN(numValue)) handleFieldChange('discountRate1', numValue);
                     }
                   }}
                   onBlur={() => {
                     if (discountRate1InputValue === '' || discountRate1InputValue === '.') {
                       setDiscountRate1InputValue('0');
                       handleFieldChange('discountRate1', 0);
                     } else {
                       const numValue = parseFloat(discountRate1InputValue);
                       if (!isNaN(numValue)) setDiscountRate1InputValue(String(numValue));
                     }
                   }}
                   placeholder="0"
                   className={cn(styles.inputBase, "h-10 bg-white dark:bg-zinc-950")}
                 />
               </div>

               <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                 <div className="relative overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30 p-3">
                   <div className="flex items-center justify-between mb-2">
                     <label className="text-xs font-bold text-zinc-600 dark:text-zinc-400">
                       İnd. 2 (%)
                     </label>
                     <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400">
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
                         if (!isNaN(numValue)) handleFieldChange('discountRate2', numValue);
                       }
                     }}
                     onBlur={() => {
                       if (discountRate2InputValue === '' || discountRate2InputValue === '.') {
                         setDiscountRate2InputValue('0');
                         handleFieldChange('discountRate2', 0);
                       } else {
                         const numValue = parseFloat(discountRate2InputValue);
                         if (!isNaN(numValue)) setDiscountRate2InputValue(String(numValue));
                       }
                     }}
                     placeholder="0"
                     className={cn(styles.inputBase, "h-9 bg-white dark:bg-zinc-950")}
                   />
                 </div>
                 <div className="relative overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30 p-3">
                   <div className="flex items-center justify-between mb-2">
                     <label className="text-xs font-bold text-zinc-600 dark:text-zinc-400">
                       İnd. 3 (%)
                     </label>
                     <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400">
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
                         if (!isNaN(numValue)) handleFieldChange('discountRate3', numValue);
                       }
                     }}
                     onBlur={() => {
                       if (discountRate3InputValue === '' || discountRate3InputValue === '.') {
                         setDiscountRate3InputValue('0');
                         handleFieldChange('discountRate3', 0);
                       } else {
                         const numValue = parseFloat(discountRate3InputValue);
                         if (!isNaN(numValue)) setDiscountRate3InputValue(String(numValue));
                       }
                     }}
                     placeholder="0"
                     className={cn(styles.inputBase, "h-9 bg-white dark:bg-zinc-950")}
                   />
                 </div>
               </div>
             </div>
          </div>
        </div>

        <div className={styles.sectionCard}>
          <label className={styles.label}>
            <div className={cn(styles.iconWrapper, "bg-purple-50 dark:bg-purple-900/20 text-purple-600")}>
              <FileText className="w-3.5 h-3.5" />
            </div>
            Satır Açıklamaları
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-500 ml-1">Açıklama 1</label>
              <Input
                value={formData.description1 ?? ''}
                onChange={(e) => handleFieldChange('description1', e.target.value || null)}
                maxLength={200}
                placeholder="Açıklama giriniz..."
                className={styles.inputBase}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-500 ml-1">Açıklama 2</label>
              <Input
                value={formData.description2 ?? ''}
                onChange={(e) => handleFieldChange('description2', e.target.value || null)}
                maxLength={200}
                placeholder="Açıklama giriniz..."
                className={styles.inputBase}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-500 ml-1">Açıklama 3</label>
              <Input
                value={formData.description3 ?? ''}
                onChange={(e) => handleFieldChange('description3', e.target.value || null)}
                maxLength={200}
                placeholder="Açıklama giriniz..."
                className={styles.inputBase}
              />
            </div>
          </div>
        </div>

        {relatedLines.length > 0 && (
          <div className={styles.sectionCard}>
            <label className={styles.label}>
              <div className={cn(styles.iconWrapper, "bg-cyan-50 dark:bg-cyan-900/20 text-cyan-600")}>
                <Layers className="w-3.5 h-3.5" />
              </div>
              {t('demand.lines.relatedStocks')} ({relatedLines.length})
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
              {relatedLines.map((relatedLine) => (
                <div key={relatedLine.id} className="relative overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30 p-4 transition-all hover:border-cyan-200 dark:hover:border-cyan-900/50">
                  <div className="grid grid-cols-1 gap-2 mb-3 pb-3 border-b border-zinc-200 dark:border-zinc-800">
                    <div>
                      <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">{t('demand.lines.productCode')}</div>
                      <div className="font-mono text-sm font-bold text-zinc-700 dark:text-zinc-300">{relatedLine.productCode || '-'}</div>
                    </div>
                    <div>
                      <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1">{t('demand.lines.productName')}</div>
                      <div className="text-xs font-medium text-zinc-600 dark:text-zinc-400 line-clamp-1">{relatedLine.productName || '-'}</div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-zinc-400 font-medium block mb-1">{t('demand.lines.quantity')}</span>
                      <span className="font-bold text-zinc-700 dark:text-zinc-200">{relatedLine.quantity}</span>
                    </div>
                    <div>
                      <span className="text-zinc-400 font-medium block mb-1">{t('demand.lines.unitPrice')}</span>
                      <span className="font-mono font-bold text-zinc-700 dark:text-zinc-200">
                        {formatCurrency(relatedLine.unitPrice, currencyCode)}
                      </span>
                    </div>
                    <div>
                      <span className="text-zinc-400 font-medium block mb-1">{t('demand.lines.netPrice')}</span>
                      <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                        {formatCurrency(relatedLine.lineTotal || 0, currencyCode)}
                      </span>
                    </div>
                    <div>
                      <span className="text-zinc-400 font-medium block mb-1">{t('demand.lines.lineTotal')}</span>
                      <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                        {formatCurrency(relatedLine.lineGrandTotal, currencyCode)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-8 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-[#0f0a18] p-5 shadow-sm flex flex-col md:flex-row md:items-end justify-between gap-6">
          
          <div className="flex-1 space-y-4 md:space-y-3">
            <label className={styles.label}>
              <div className={cn(styles.iconWrapper, "bg-amber-50 dark:bg-amber-900/20 text-amber-600")}>
                <Calculator className="w-3.5 h-3.5" />
              </div>
              {t('demand.lines.calculations')}
            </label>
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
              <div>
                <span className="text-xs font-medium text-zinc-500 block mb-1">{t('demand.lines.discountAmount')}</span>
                <span className={cn("text-lg font-mono font-black", hasDiscount ? "text-rose-600 dark:text-rose-400" : "text-zinc-400")}>
                  {hasDiscount ? '-' : ''}{formatCurrency(totalDiscount, currencyCode)}
                </span>
              </div>
              <div className="sm:border-l sm:border-zinc-200 dark:sm:border-zinc-800 sm:pl-6">
                <span className="text-xs font-medium text-zinc-500 block mb-1">{t('demand.lines.netPrice')} (KDV Hariç)</span>
                <span className="text-lg font-mono font-black text-emerald-600 dark:text-emerald-400">
                  {formatCurrency(formData.lineTotal || 0, currencyCode)}
                </span>
              </div>
              <div className="sm:border-l sm:border-zinc-200 dark:sm:border-zinc-800 sm:pl-6">
                <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider block mb-1">{t('demand.lines.lineTotal')}</span>
                <span className="text-2xl font-mono font-black bg-clip-text text-transparent bg-linear-to-r from-pink-600 to-purple-600">
                  {formatCurrency(formData.lineGrandTotal, currencyCode)}
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
            <Button 
              type="button" 
              variant="outline" 
              onClick={onCancel} 
              className="flex-1 sm:flex-none h-12 px-6 rounded-xl border-zinc-200 dark:border-zinc-800 font-bold hover:bg-zinc-100 dark:hover:bg-zinc-800"
            >
              <X className="h-4 w-4 mr-2" />
              {t('demand.cancel')}
            </Button>
            <Button 
              type="button" 
              onClick={handleSave} 
              disabled={!formData.productCode || !formData.productName}
              className="flex-1 sm:flex-none h-12 px-8 rounded-xl bg-linear-to-r from-pink-600 to-orange-600 text-white font-bold shadow-lg shadow-pink-500/20 hover:scale-105 transition-all duration-300 border-0"
            >
              <Check className="h-5 w-5 mr-2" />
              {t('demand.save')}
            </Button>
          </div>
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
      </div>
    </div>
  );
}
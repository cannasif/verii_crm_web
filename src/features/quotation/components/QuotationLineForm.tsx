'use client';

import { type ChangeEvent, type ReactElement, type MouseEvent, useState, useEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { useQuotationCalculations } from '../hooks/useQuotationCalculations';
import { useDiscountLimitValidation } from '../hooks/useDiscountLimitValidation';
import { useCurrencyOptions } from '@/services/hooks/useCurrencyOptions';
import { useExchangeRate } from '@/services/hooks/useExchangeRate';
import { useErpProjectCodesInfinite } from '@/services/hooks/useErpProjectCodesInfinite';
import { VoiceSearchCombobox } from '@/components/shared/VoiceSearchCombobox';
import { ProductSelectDialog, type ProductSelectionResult } from '@/components/shared/ProductSelectDialog';
import { CatalogStockSelectDialog } from '@/components/shared/CatalogStockSelectDialog';
import { CustomerSelectDialog, type CustomerSelectionResult } from '@/components/shared/CustomerSelectDialog';
import { PricingRuleInsightDialog } from '@/components/shared/PricingRuleInsightDialog';
import { useProductSelection } from '../hooks/useProductSelection';
import { formatCurrency } from '../utils/format-currency';
import { findExchangeRateByDovizTipi } from '../utils/price-conversion';
import { quotationApi } from '../api/quotation-api';
import { quotationLineRequiredSchema, type QuotationLineFormState, type QuotationExchangeRateFormState, type PricingRuleLineGetDto, type UserDiscountLimitDto, type ApprovalStatus } from '../types/quotation-types';
import { pdfReportTemplateApi } from '@/features/pdf-report';
import type { UploadPdfAssetOptions } from '@/features/pdf-report/api/pdf-report-template-api';
import { getImageUrl } from '@/lib/image-url';
import { Check, Package, Percent, Loader2, Coins, Layers, BadgePercent, AlertTriangle, Search, Info, X, LayoutGrid, ImagePlus, Trash2 } from 'lucide-react';
import { isZodFieldRequired } from '@/lib/zod-required';
import { useLineFormUiPreferencesStore } from '@/stores/line-form-ui-preferences-store';
import { applyLineDescriptionSavePolicy } from '@/lib/apply-line-description-save-policy';
import { isIntegerQuantityUnit } from '@/lib/system-settings';

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

interface QuotationLineFormProps {
  line: QuotationLineFormState;
  /** Tek satır kaydı; `onSaveMultiple` + bağlı satırlar varken kullanılmayabilir */
  onSave?: (line: QuotationLineFormState) => void;
  onCancel: () => void;
  currency: number;
  exchangeRates?: QuotationExchangeRateFormState[];
  pricingRules?: PricingRuleLineGetDto[];
  userDiscountLimits?: UserDiscountLimitDto[];
  onSaveMultiple?: (lines: QuotationLineFormState[]) => void;
  isSaving?: boolean;
  /** Belgedeki mevcut satır stokları — stok/katalog seçicide “Satırda” rozeti */
  existingLineStockMarkers?: ProductSelectionResult[];
  allowImageUpload?: boolean;
  imageUploadScope?: 'quotation-line';
  imageUploadExtras?: Omit<UploadPdfAssetOptions, 'assetScope'>;
}

export function QuotationLineForm({
  line,
  onSave,
  onCancel,
  currency,
  exchangeRates = [],
  pricingRules = [],
  userDiscountLimits = [],
  onSaveMultiple,
  isSaving = false,
  existingLineStockMarkers = [],
  allowImageUpload = false,
  imageUploadScope = 'quotation-line',
  imageUploadExtras,
}: QuotationLineFormProps): ReactElement {
  const { t } = useTranslation(['quotation', 'common']);
  const showDescriptionSectionPref = useLineFormUiPreferencesStore((s) => s.showDescriptionFieldsSection);
  const customDescLabel1 = useLineFormUiPreferencesStore((s) => s.customDescriptionLabel1);
  const customDescLabel2 = useLineFormUiPreferencesStore((s) => s.customDescriptionLabel2);
  const customDescLabel3 = useLineFormUiPreferencesStore((s) => s.customDescriptionLabel3);
  const { calculateLineTotals } = useQuotationCalculations();
  const [productDialogOpen, setProductDialogOpen] = useState(false);
  const [catalogDialogOpen, setCatalogDialogOpen] = useState(false);
  const [companyDialogOpen, setCompanyDialogOpen] = useState(false);
  const [pricingInfoOpen, setPricingInfoOpen] = useState(false);
  const [projectSearchTerm, setProjectSearchTerm] = useState('');
  const projectDropdown = useErpProjectCodesInfinite(projectSearchTerm);
  const { currencyOptions } = useCurrencyOptions();
  const { data: erpRates = [] } = useExchangeRate();
  const { handleProductSelect: handleProductSelectHook, handleProductSelectWithRelatedStocks } = useProductSelection({
    currency,
    exchangeRates,
  });

  const handleCompanySelect = (result: CustomerSelectionResult) => {
    setFormData((prev) => ({
      ...prev,
      supplierCode: result.erpCustomerCode,
      supplierName: result.customerName,
    }));
  };

  const currencyCode = useMemo(() => {
    const found = currencyOptions.find((opt) => opt.dovizTipi === currency);
    return found?.code || 'TRY';
  }, [currency, currencyOptions]);

  const [formData, setFormData] = useState<QuotationLineFormState>(line);
  const [relatedLines, setRelatedLines] = useState<QuotationLineFormState[]>([]);
  const [bulkDraftLines, setBulkDraftLines] = useState<QuotationLineFormState[]>([]);
  const [activeBulkIndex, setActiveBulkIndex] = useState(0);
  const [temporaryStockData, setTemporaryStockData] = useState<TemporaryStockData[]>([]);
  const [lastLoadedProductCode, setLastLoadedProductCode] = useState<string | null>(null);
  const [quantityInputValue, setQuantityInputValue] = useState<string>(String(line.quantity || ''));
  const [vatRateInputValue, setVatRateInputValue] = useState<string>(String(line.vatRate || ''));
  const [discountRate1InputValue, setDiscountRate1InputValue] = useState<string>(String(line.discountRate1 || ''));
  const [discountRate2InputValue, setDiscountRate2InputValue] = useState<string>(String(line.discountRate2 || ''));
  const [discountRate3InputValue, setDiscountRate3InputValue] = useState<string>(String(line.discountRate3 || ''));
  const prevDiscountRatesRef = useRef({ discountRate1: line.discountRate1, discountRate2: line.discountRate2, discountRate3: line.discountRate3 });
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const persistedLineId = imageUploadExtras?.quotationLineId;

  const [descriptionSlotsEnabled, setDescriptionSlotsEnabled] = useState<[boolean, boolean, boolean]>([true, true, true]);

  useEffect(() => {
    setDescriptionSlotsEnabled([true, true, true]);
  }, [line.id]);

  const descriptionSlotLabels = useMemo(
    () =>
      [
        customDescLabel1.trim() || t('quotation.lines.descriptionField1Label'),
        customDescLabel2.trim() || t('quotation.lines.descriptionField2Label'),
        customDescLabel3.trim() || t('quotation.lines.descriptionField3Label'),
      ] as const,
    [customDescLabel1, customDescLabel2, customDescLabel3, t]
  );

  type DiscountField = 'discountRate1' | 'discountRate2' | 'discountRate3';
  const discountInputs = useMemo<
    Array<{
      val: string;
      setVal: (value: string) => void;
      field: DiscountField;
      label: string;
    }>
  >(
    () => [
      {
        val: discountRate1InputValue,
        setVal: setDiscountRate1InputValue,
        field: 'discountRate1',
        label: t('quotation.lines.discountNumbered1'),
      },
      {
        val: discountRate2InputValue,
        setVal: setDiscountRate2InputValue,
        field: 'discountRate2',
        label: t('quotation.lines.discountNumbered2'),
      },
      {
        val: discountRate3InputValue,
        setVal: setDiscountRate3InputValue,
        field: 'discountRate3',
        label: t('quotation.lines.discountNumbered3'),
      },
    ],
    [t, discountRate1InputValue, discountRate2InputValue, discountRate3InputValue]
  );

  const getDiscountAmount = (field: DiscountField): number => {
    if (field === 'discountRate1') return formData.discountAmount1 || 0;
    if (field === 'discountRate2') return formData.discountAmount2 || 0;
    return formData.discountAmount3 || 0;
  };

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
    const lineRelatedLines = (line as QuotationLineFormState & { relatedLines?: QuotationLineFormState[] }).relatedLines || [];
    if (lineRelatedLines.length > 0) {
      setRelatedLines(lineRelatedLines);
    } else {
      setRelatedLines([]);
    }
  }, [line]);

  useEffect(() => {
    return () => {
      if (formData.pendingImagePreviewUrl?.startsWith('blob:')) {
        URL.revokeObjectURL(formData.pendingImagePreviewUrl);
      }
    };
  }, [formData.pendingImagePreviewUrl]);

  useEffect(() => {
    const lineRelatedLines = (line as QuotationLineFormState & { relatedLines?: QuotationLineFormState[] }).relatedLines || [];
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

            const prices = await quotationApi.getPriceOfProduct(requests);

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

  const handleImageSelect = async (event: ChangeEvent<HTMLInputElement>): Promise<void> => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    if (!persistedLineId) {
      if (formData.pendingImagePreviewUrl?.startsWith('blob:')) {
        URL.revokeObjectURL(formData.pendingImagePreviewUrl);
      }
      const previewUrl = URL.createObjectURL(file);
      setFormData((prev) => ({
        ...prev,
        imagePath: null,
        pendingImageFile: file,
        pendingImagePreviewUrl: previewUrl,
      }));
      toast.success(t('common.saved'));
      return;
    }

    setIsUploadingImage(true);
    try {
      const uploaded = await pdfReportTemplateApi.uploadAsset(file, {
        assetScope: imageUploadScope,
        quotationId: imageUploadExtras?.quotationId,
        quotationLineId: persistedLineId,
        productCode: imageUploadExtras?.productCode || formData.productCode || undefined,
      });
      setFormData((prev) => ({
        ...prev,
        imagePath: uploaded.relativeUrl,
        pendingImageFile: null,
        pendingImagePreviewUrl: null,
      }));
      toast.success(t('common.saved'));
    } catch (error) {
      const message = error instanceof Error ? error.message : t('common.imageUploadFailed');
      toast.error(t('common.imageUploadFailed'), { description: message });
    } finally {
      setIsUploadingImage(false);
    }
  };

  const currentImagePreview = formData.pendingImagePreviewUrl || formData.imagePath;

  const handleRemoveImage = (): void => {
    if (formData.pendingImagePreviewUrl?.startsWith('blob:')) {
      URL.revokeObjectURL(formData.pendingImagePreviewUrl);
    }
    setFormData((prev) => ({
      ...prev,
      imagePath: null,
      pendingImageFile: null,
      pendingImagePreviewUrl: null,
    }));
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

  const handleMultiProductSelect = async (products: ProductSelectionResult[]): Promise<void> => {
    if (!products.length) return;

    const collectedLines: QuotationLineFormState[] = [];

    for (let productIndex = 0; productIndex < products.length; productIndex++) {
      const product = products[productIndex];
      const hasRelatedStocks = product.relatedStockIds && product.relatedStockIds.length > 0;

      if (hasRelatedStocks && handleProductSelectWithRelatedStocks && product.relatedStockIds) {
        const allLines = await handleProductSelectWithRelatedStocks(product, product.relatedStockIds);
        const mainLine = allLines[0];
        if (mainLine) {
          collectedLines.push({
            ...mainLine,
            id: `${mainLine.id}-m${productIndex}-0`,
            groupCode: mainLine.groupCode || product.groupCode || null,
            relatedLines: allLines.slice(1).map((line, lineIndex) => ({
              ...line,
              id: `${line.id}-m${productIndex}-${lineIndex + 1}`,
              groupCode: line.groupCode || product.groupCode || null,
            })),
          });
        }
      } else {
        const line = await handleProductSelectHook(product);
        collectedLines.push({
          ...line,
          id: `${line.id}-m${productIndex}`,
          groupCode: line.groupCode || product.groupCode || null,
        });
      }
    }

    if (!collectedLines.length) return;

    const firstLine = collectedLines[0];
    if (firstLine) {
      setFormData(firstLine);
      setQuantityInputValue(String(firstLine.quantity || ''));
      setVatRateInputValue(String(firstLine.vatRate || ''));
      setDiscountRate1InputValue(String(firstLine.discountRate1 || ''));
      setDiscountRate2InputValue(String(firstLine.discountRate2 || ''));
      setDiscountRate3InputValue(String(firstLine.discountRate3 || ''));
      setActiveBulkIndex(0);
    }

    setBulkDraftLines(collectedLines);
  };

  const handleBulkDraftConfirm = (): void => {
    if (!bulkDraftLines.length) return;

    const flattenedLines = bulkDraftLines.flatMap((lineItem) => {
      const nested = (lineItem as QuotationLineFormState & { relatedLines?: QuotationLineFormState[] }).relatedLines ?? [];
      return [lineItem, ...nested];
    });

    const prefs = useLineFormUiPreferencesStore.getState();
    const policy = {
      showDescriptionFieldsSection: prefs.showDescriptionFieldsSection,
      slotEnabled: descriptionSlotsEnabled,
    };
    const linesWithDescriptionPolicy = flattenedLines.map((l) => applyLineDescriptionSavePolicy(l, policy));

    if (onSaveMultiple) {
      onSaveMultiple(linesWithDescriptionPolicy);
    } else {
      const firstLine = bulkDraftLines[0];
      if (firstLine) {
        setFormData({ ...firstLine, id: formData.id });
        const nested = (firstLine as QuotationLineFormState & { relatedLines?: QuotationLineFormState[] }).relatedLines ?? [];
        setRelatedLines(nested);
      }
    }

    setBulkDraftLines([]);
  };

  const handleSelectBulkLine = (index: number): void => {
    const selected = bulkDraftLines[index];
    if (!selected) return;
    setActiveBulkIndex(index);
    setFormData(selected);
    setQuantityInputValue(String(selected.quantity || ''));
    setVatRateInputValue(String(selected.vatRate || ''));
    setDiscountRate1InputValue(String(selected.discountRate1 || ''));
    setDiscountRate2InputValue(String(selected.discountRate2 || ''));
    setDiscountRate3InputValue(String(selected.discountRate3 || ''));
    const nested = (selected as QuotationLineFormState & { relatedLines?: QuotationLineFormState[] }).relatedLines ?? [];
    setRelatedLines(nested);
  };

  const handleRemoveBulkDraftLine = (removeIdx: number) => (e: MouseEvent<HTMLButtonElement>): void => {
    e.preventDefault();
    e.stopPropagation();
    const next = bulkDraftLines.filter((_, i) => i !== removeIdx);
    setBulkDraftLines(next);
    if (next.length === 0) {
      setActiveBulkIndex(0);
      setFormData(line);
      setQuantityInputValue(String(line.quantity || ''));
      setVatRateInputValue(String(line.vatRate || ''));
      setDiscountRate1InputValue(String(line.discountRate1 || ''));
      setDiscountRate2InputValue(String(line.discountRate2 || ''));
      setDiscountRate3InputValue(String(line.discountRate3 || ''));
      const lineRelatedLines =
        (line as QuotationLineFormState & { relatedLines?: QuotationLineFormState[] }).relatedLines || [];
      setRelatedLines(lineRelatedLines.length > 0 ? lineRelatedLines : []);
      return;
    }
    let newActive = activeBulkIndex;
    if (removeIdx < activeBulkIndex) {
      newActive = activeBulkIndex - 1;
    } else if (removeIdx === activeBulkIndex) {
      newActive = Math.min(removeIdx, next.length - 1);
    }
    setActiveBulkIndex(newActive);
    const selected = next[newActive];
    if (selected) {
      setFormData(selected);
      setQuantityInputValue(String(selected.quantity || ''));
      setVatRateInputValue(String(selected.vatRate || ''));
      setDiscountRate1InputValue(String(selected.discountRate1 || ''));
      setDiscountRate2InputValue(String(selected.discountRate2 || ''));
      setDiscountRate3InputValue(String(selected.discountRate3 || ''));
      const nested =
        (selected as QuotationLineFormState & { relatedLines?: QuotationLineFormState[] }).relatedLines ?? [];
      setRelatedLines(nested);
    }
  };

  const handleFieldChange = (field: keyof QuotationLineFormState, value: unknown): void => {
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
    if (bulkDraftLines.length > 0) {
      setBulkDraftLines((prev) =>
        prev.map((lineItem, index) => (
          index === activeBulkIndex ? { ...calculated, id: lineItem.id } : lineItem
        ))
      );
    }

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
    const prefs = useLineFormUiPreferencesStore.getState();
    const policy = {
      showDescriptionFieldsSection: prefs.showDescriptionFieldsSection,
      slotEnabled: descriptionSlotsEnabled,
    };
    if (onSaveMultiple && relatedLines.length > 0) {
      const linesToSave = [
        applyLineDescriptionSavePolicy(formData, policy),
        ...relatedLines.map((rl) => applyLineDescriptionSavePolicy(rl, policy)),
      ];
      onSaveMultiple(linesToSave);
    } else if (onSave) {
      onSave(applyLineDescriptionSavePolicy(formData, policy));
    }
  };


  const totalDiscount = (formData.discountAmount1 || 0) + (formData.discountAmount2 || 0) + (formData.discountAmount3 || 0);
  const hasDiscount = totalDiscount > 0;
  const hasApprovalWarning = discountValidation.exceedsLimit || formData.approvalStatus === 1;
  const bulkDraftGrandTotal = bulkDraftLines.reduce((sum, item) => sum + (item.lineGrandTotal || 0), 0);
  const pinkFocusClass = 'focus-visible:border-pink-500 focus-visible:ring-2 focus-visible:ring-pink-500/20';
  const isQuantityIntegerOnly = isIntegerQuantityUnit(formData.unit);
  const quantityStep = isQuantityIntegerOnly ? '1' : '0.1';
  const quantityMin = isQuantityIntegerOnly ? '1' : '0.1';
  const percentageStep = '0.1';

  return (
    <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
      <div className="space-y-4">
        <label className="text-sm font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-2">
          <Package className="h-4 w-4 text-pink-500" />
          {t('quotation.lines.stock')}
          {isZodFieldRequired(quotationLineRequiredSchema, 'productCode') ? <span className="text-pink-500">*</span> : null}
        </label>
        
        <div className="flex flex-col gap-3">
          <div className="flex flex-row gap-3">
            <div className="relative flex-1">
              <Input
                value={formData.productCode || ''}
                placeholder={t('quotation.lines.productCode')}
                readOnly
                onClick={() => setProductDialogOpen(true)}
                className={`cursor-pointer bg-slate-50 dark:bg-[#0f0a18] border-slate-200 dark:border-white/10 text-slate-900 dark:text-white font-mono text-sm h-11 rounded-xl ${pinkFocusClass}`}
              />
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={() => setProductDialogOpen(true)}
              className="h-11 w-11 p-0 rounded-xl border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#0f0a18] hover:bg-pink-50 dark:hover:bg-pink-500/10 text-pink-500 dark:text-pink-400 hover:text-pink-600 dark:hover:text-pink-300 transition-all flex-none items-center justify-center"
            >
              <Search className="h-5 w-5" />
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setCatalogDialogOpen(true)}
              className="h-11 px-3 rounded-xl border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#0f0a18] hover:bg-pink-50 dark:hover:bg-pink-500/10 text-pink-500 dark:text-pink-400 hover:text-pink-600 dark:hover:text-pink-300 transition-all flex-none items-center gap-2"
            >
              <LayoutGrid className="h-4 w-4" />
              <span className="text-xs font-medium">
                {t('catalogStockPicker.openButton', { ns: 'common' })}
              </span>
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setPricingInfoOpen(true)}
              disabled={!formData.productCode}
              className="h-11 px-3 rounded-xl border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#0f0a18] hover:bg-slate-100 dark:hover:bg-white/5 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-all flex-none items-center gap-2"
            >
              <Info className="h-4 w-4" />
              <span className="text-xs font-medium">
                {t('common.pricingInsights.button')}
              </span>
              {ruleInsightCount > 0 && (
                <span className="inline-flex min-w-5 h-5 px-1 items-center justify-center rounded-full bg-pink-500 text-white text-[10px] font-bold">
                  {ruleInsightCount}
                </span>
              )}
            </Button>
          </div>

          <div className="w-full">
            <Input
              value={formData.productName || ''}
              placeholder={t('quotation.lines.productName')}
              readOnly
                className={`bg-slate-50 dark:bg-[#0f0a18] border-slate-200 dark:border-white/10 text-slate-900 dark:text-white font-semibold text-sm h-11 rounded-xl w-full ${pinkFocusClass}`}
            />
          </div>

          <div className="w-full">
            <VoiceSearchCombobox
              className="h-11 bg-slate-50 dark:bg-[#0f0a18] border-slate-200 dark:border-white/10 rounded-xl"
              value={formData.projectCode || ''}
              onSelect={(value) => handleFieldChange('projectCode', value)}
              options={projectDropdown.options}
              onDebouncedSearchChange={setProjectSearchTerm}
              onFetchNextPage={projectDropdown.fetchNextPage}
              hasNextPage={projectDropdown.hasNextPage}
              isLoading={projectDropdown.isLoading}
              isFetchingNextPage={projectDropdown.isFetchingNextPage}
              placeholder={t('quotation:header.projectCode')}
              searchPlaceholder={t('common.search')}
            />
          </div>

          {bulkDraftLines.length > 0 && (
            <div className="rounded-xl border border-pink-200/70 dark:border-pink-800/40 bg-pink-50/50 dark:bg-pink-950/10 p-3 space-y-2">
              <div className="flex items-center justify-between gap-2 text-xs text-slate-600 dark:text-slate-300">
                <span className="font-semibold">{t('quotation.lines.stock')} ({bulkDraftLines.length})</span>
                <span className="inline-flex items-center rounded-full border border-pink-300/70 dark:border-pink-700/50 bg-white/90 dark:bg-pink-900/30 px-2.5 py-1 text-[11px] font-bold text-pink-700 dark:text-pink-300">
                  {t('quotation.lines.grandTotal')}: {formatCurrency(bulkDraftGrandTotal, currencyCode)}
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {bulkDraftLines.map((item, index) => (
                  <div
                    key={`${item.id}-${index}`}
                    className={`inline-flex items-stretch overflow-hidden rounded-full border transition-all ${
                      index === activeBulkIndex
                        ? 'border-pink-500 bg-pink-600 shadow-md shadow-pink-500/30 dark:border-pink-400 dark:bg-pink-500'
                        : 'border-pink-200/80 bg-white/80 dark:border-pink-700/40 dark:bg-pink-900/20'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => handleSelectBulkLine(index)}
                      title={item.productName || item.productCode || '-'}
                      className={`flex h-8 max-w-[180px] items-center gap-1.5 px-3 text-left text-sm transition-colors ${
                        index === activeBulkIndex
                          ? 'text-white hover:bg-pink-700/35 dark:hover:bg-white/10'
                          : 'text-pink-700 hover:bg-pink-50 dark:text-pink-300 dark:hover:bg-pink-900/35'
                      }`}
                    >
                      {(item.relatedLines?.length ?? 0) > 0 ? <Layers className="h-3.5 w-3.5 shrink-0" /> : null}
                      <span className="truncate font-mono">{item.productCode || '-'}</span>
                    </button>
                    <button
                      type="button"
                      aria-label={t('common.remove')}
                      title={t('common.remove')}
                      onClick={handleRemoveBulkDraftLine(index)}
                      className={`flex h-8 w-7 shrink-0 items-center justify-center border-l text-xs transition-colors ${
                        index === activeBulkIndex
                          ? 'border-pink-400/50 text-white/90 hover:bg-white/15 hover:text-white'
                          : 'border-pink-200/70 text-pink-600 hover:bg-pink-100 dark:border-pink-700/50 dark:text-pink-300 dark:hover:bg-pink-900/40'
                      }`}
                    >
                      <X className="h-3.5 w-3.5" strokeWidth={2.5} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-2">
            <Layers className="h-4 w-4 text-blue-500" />
            {t('quotation.lines.quantity')}
          </label>
          <Input
            type="number"
            step={quantityStep}
            min={quantityMin}
            value={quantityInputValue}
            onChange={(e) => {
              const inputValue = e.target.value;
              setQuantityInputValue(inputValue);
              if (inputValue === '' || inputValue === '.') {
                handleFieldChange('quantity', 0);
              } else {
                const numValue = parseFloat(inputValue);
                if (!isNaN(numValue)) {
                  const normalizedQuantity = isQuantityIntegerOnly ? Math.round(numValue) : numValue;
                  handleFieldChange('quantity', normalizedQuantity);
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
                  const normalizedQuantity = isQuantityIntegerOnly ? Math.round(numValue) : numValue;
                  setQuantityInputValue(String(normalizedQuantity));
                  handleFieldChange('quantity', normalizedQuantity);
                }
              }
            }}
              className={`h-11 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#0f0a18] text-slate-900 dark:text-white font-extrabold text-center shadow-sm ${pinkFocusClass}`}
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-2">
            <Coins className="h-4 w-4 text-emerald-500" />
            {t('quotation.lines.unitPrice')}
          </label>
          <div className="relative">
            <Input
              type="number"
              step="0.000001"
              min="0"
              value={formData.unitPrice}
              onChange={(e) => {
                const inputValue = e.target.value;
                if (inputValue === '' || inputValue === '.') {
                  handleFieldChange('unitPrice', 0);
                  return;
                }

                const numValue = parseFloat(inputValue);
                if (!isNaN(numValue)) {
                  handleFieldChange('unitPrice', numValue);
                }
              }}
              className={`h-11 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#0f0a18] text-slate-900 dark:text-white font-mono font-extrabold text-center pr-10 shadow-sm ${pinkFocusClass}`}
            />
            <div className="absolute right-3 top-3 text-xs font-bold text-slate-400 dark:text-slate-500">{t('quotation.lines.currencyTry')}</div>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-2">
            <Package className="h-4 w-4 text-purple-500" />
            {t('quotation.lines.unit')}
          </label>
          <Input
            value={formData.unit || '-'}
            readOnly
              className={`h-11 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#0f0a18] text-slate-900 dark:text-white font-semibold text-center shadow-sm ${pinkFocusClass}`}
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-2">
            <Percent className="h-4 w-4 text-orange-500" />
            {t('quotation.lines.vatRate')}
          </label>
          <div className="relative">
            <Input
              type="number"
              step={percentageStep}
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
              className={`h-11 rounded-xl border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#0f0a18] text-slate-900 dark:text-white font-bold text-center pr-8 transition-all ${pinkFocusClass}`}
            />
            <div className="absolute right-3 top-3 text-slate-400 dark:text-slate-500 font-bold">%</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 pt-4 border-t border-slate-200 dark:border-white/10">
        <div className="xl:col-span-7 space-y-4">
          <h5 className="text-sm font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-2">
            <BadgePercent className="h-4 w-4 text-purple-500" />
            {t('quotation.lines.discounts')}
          </h5>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
	            {discountInputs.map((item, idx) => (
	              <div key={idx} className="space-y-1.5 p-2 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/70 dark:bg-[#0f0a18]">
                  <div className="flex items-center justify-between gap-2">
                    <label className="text-xs font-medium text-slate-500 dark:text-slate-400 ml-1">
                      {item.label}
                    </label>
                    <span className="text-xs font-semibold text-red-500 dark:text-red-400">
                      {getDiscountAmount(item.field) > 0 ? '-' : ''}
                      {formatCurrency(getDiscountAmount(item.field), currencyCode)}
                    </span>
                  </div>
	                <Input
                  type="number"
                  step={percentageStep}
                  min="0"
                  max="100"
	                  value={item.val}
	                  onChange={(e) => {
	                    const inputValue = e.target.value;
	                    item.setVal(inputValue);
	                    if (inputValue === '' || inputValue === '.') {
	                      handleFieldChange(item.field, 0);
	                    } else {
	                      const numValue = parseFloat(inputValue);
	                      if (!isNaN(numValue)) {
	                        handleFieldChange(item.field, numValue);
	                      }
	                    }
	                  }}
	                  onBlur={() => {
	                    if (item.val === '' || item.val === '.') {
	                      item.setVal('0');
	                      handleFieldChange(item.field, 0);
	                    } else {
	                      const numValue = parseFloat(item.val);
	                      if (!isNaN(numValue)) {
                        item.setVal(String(numValue));
                      }
                    }
                  }}
                  placeholder="0"
                  className={`h-11 rounded-xl border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#0f0a18] text-slate-900 dark:text-white transition-all text-center ${pinkFocusClass}`}
                />
              </div>
            ))}
          </div>

          {hasApprovalWarning && (
            <div className="flex items-start gap-3 p-4 rounded-xl bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/30">
              <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/40 shadow-sm">
                <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-red-800 dark:text-red-300">{t('quotation.lines.approvalNeeded')}</h4>
                <p className="text-xs text-red-600 dark:text-red-400 mt-1">{t('quotation.lines.discountLimitExceeded')}</p>
              </div>
            </div>
          )}

          {showDescriptionSectionPref ? (
            <div className="space-y-3">
              <h5 className="text-sm font-semibold text-slate-500 dark:text-slate-400">
                {t('quotation.lines.descriptionFieldsTitle')}
              </h5>
              <p className="text-xs text-muted-foreground">{t('lineFormPreferences.slotToggleHint', { ns: 'common' })}</p>
              <div className="flex flex-wrap items-center gap-4">
                <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-300">
                  <Checkbox
                    checked={descriptionSlotsEnabled[0]}
                    onCheckedChange={(v) => {
                      const on = v === true;
                      setDescriptionSlotsEnabled((prev) => [on, prev[1], prev[2]]);
                      if (!on) handleFieldChange('description1', null);
                    }}
                  />
                  {descriptionSlotLabels[0]}
                </label>
                <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-300">
                  <Checkbox
                    checked={descriptionSlotsEnabled[1]}
                    onCheckedChange={(v) => {
                      const on = v === true;
                      setDescriptionSlotsEnabled((prev) => [prev[0], on, prev[2]]);
                      if (!on) handleFieldChange('description2', null);
                    }}
                  />
                  {descriptionSlotLabels[1]}
                </label>
                <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-300">
                  <Checkbox
                    checked={descriptionSlotsEnabled[2]}
                    onCheckedChange={(v) => {
                      const on = v === true;
                      setDescriptionSlotsEnabled((prev) => [prev[0], prev[1], on]);
                      if (!on) handleFieldChange('description3', null);
                    }}
                  />
                  {descriptionSlotLabels[2]}
                </label>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-500 dark:text-slate-400 ml-1">
                    {descriptionSlotLabels[0]}
                  </label>
                  <Input
                    value={formData.description1 ?? ''}
                    onChange={(e) => handleFieldChange('description1', e.target.value || null)}
                    maxLength={200}
                    placeholder={t('quotation.lines.max200Chars')}
                    disabled={!descriptionSlotsEnabled[0]}
                    className={`h-11 rounded-xl border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#0f0a18] text-slate-900 dark:text-white ${pinkFocusClass}`}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-500 dark:text-slate-400 ml-1">
                    {descriptionSlotLabels[1]}
                  </label>
                  <Input
                    value={formData.description2 ?? ''}
                    onChange={(e) => handleFieldChange('description2', e.target.value || null)}
                    maxLength={200}
                    placeholder={t('quotation.lines.max200Chars')}
                    disabled={!descriptionSlotsEnabled[1]}
                    className={`h-11 rounded-xl border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#0f0a18] text-slate-900 dark:text-white ${pinkFocusClass}`}
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-500 dark:text-slate-400 ml-1">
                    {descriptionSlotLabels[2]}
                  </label>
                  <Input
                    value={formData.description3 ?? ''}
                    onChange={(e) => handleFieldChange('description3', e.target.value || null)}
                    maxLength={200}
                    placeholder={t('quotation.lines.max200Chars')}
                    disabled={!descriptionSlotsEnabled[2]}
                    className={`h-11 rounded-xl border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#0f0a18] text-slate-900 dark:text-white ${pinkFocusClass}`}
                  />
                </div>
              </div>
            </div>
          ) : null}
        </div>

        <div className="xl:col-span-5 flex flex-col gap-4">
          {allowImageUpload ? (
            <div className="bg-slate-50 dark:bg-[#1a1025]/50 rounded-2xl p-4 border border-slate-200 dark:border-white/5 space-y-3 backdrop-blur-sm">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h5 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                    {t('common.lineImage.title')}
                  </h5>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {t('common.lineImage.hint')}
                  </p>
                </div>
                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(event) => void handleImageSelect(event)}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => imageInputRef.current?.click()}
                  disabled={isUploadingImage || !formData.productCode}
                  className="rounded-xl"
                >
                  {isUploadingImage ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ImagePlus className="h-4 w-4" />
                  )}
                  <span className="ml-2">
                    {currentImagePreview ? t('common.lineImage.change') : t('common.lineImage.add')}
                  </span>
                </Button>
              </div>
              {currentImagePreview ? (
                <div className="space-y-3">
                  <img
                    src={formData.pendingImagePreviewUrl || getImageUrl(formData.imagePath) || formData.imagePath || ''}
                    alt={formData.productName || t('common.lineImage.title')}
                    className="h-44 w-full rounded-xl border border-slate-200 dark:border-white/10 object-cover bg-white dark:bg-[#0f0a18]"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={handleRemoveImage}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    {t('common.lineImage.remove')}
                  </Button>
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-slate-300 dark:border-white/10 bg-white/70 dark:bg-[#0f0a18] px-4 py-8 text-center text-sm text-slate-500 dark:text-slate-400">
                  {t('common.lineImage.empty')}
                </div>
              )}
            </div>
          ) : null}

          <div className="bg-slate-50 dark:bg-[#1a1025]/50 rounded-2xl p-5 border border-slate-200 dark:border-white/5 space-y-3 backdrop-blur-sm">
            <div className="flex justify-between items-center text-sm gap-4">
              <span className="text-slate-500 dark:text-slate-400 font-medium">{t('quotation.lines.subtotal')}</span>
              <span className="font-semibold text-slate-700 dark:text-slate-200">{formatCurrency(formData.lineTotal || 0, currencyCode)}</span>
            </div>
            <div className="flex justify-between items-center text-sm gap-4">
              <span className="text-slate-500 dark:text-slate-400 font-medium">{t('quotation.lines.totalDiscount')}</span>
              <span className="font-semibold text-red-500 dark:text-red-400">
                {hasDiscount ? '-' : ''}{formatCurrency(totalDiscount, currencyCode)}
              </span>
            </div>
            <div className="flex justify-between items-center text-sm gap-4">
              <span className="text-slate-500 dark:text-slate-400 font-medium">{t('quotation.lines.vatAmount')}</span>
              <span className="font-semibold text-slate-700 dark:text-slate-200">{formatCurrency(formData.vatAmount || 0, currencyCode)}</span>
            </div>
            <div className="h-px bg-slate-200 dark:bg-white/10 my-2 border-dashed" />
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1">
              <span className="text-base font-bold text-slate-900 dark:text-white">{t('quotation.lines.grandTotal')}</span>
              <span className="text-2xl font-black tracking-tight text-orange-600 dark:text-orange-500">
                {formatCurrency(formData.lineGrandTotal, currencyCode)}
              </span>
            </div>
          </div>

          {relatedLines.length > 0 && (
            <div className="bg-slate-50 dark:bg-[#1a1025]/50 rounded-2xl p-4 border border-slate-200 dark:border-white/5 space-y-3 backdrop-blur-sm">
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-purple-500" />
                <h5 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                  {t('quotation.lines.relatedStocks')} ({relatedLines.length})
                </h5>
              </div>
              <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                {relatedLines.map((relatedLine, index) => (
                  <div
                    key={`${relatedLine.productCode || 'related'}-${index}`}
                    className="p-3 rounded-xl border border-slate-200 dark:border-white/10 bg-white/70 dark:bg-[#0f0a18] shadow-sm"
                  >
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 mb-2">
                      <div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">
                          {t('quotation.lines.productCode')}
                        </div>
                        <div className="font-mono text-sm font-semibold text-slate-800 dark:text-slate-100">
                          {relatedLine.productCode || '-'}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">
                          {t('quotation.lines.productName')}
                        </div>
                        <div className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                          {relatedLine.productName || '-'}
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-slate-500 dark:text-slate-400">
                          {t('quotation.lines.quantity')}:
                        </span>
                        <span className="ml-2 font-semibold text-slate-800 dark:text-slate-200">{relatedLine.quantity}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 dark:text-slate-400">
                          {t('quotation.lines.unitPrice')}:
                        </span>
                        <span className="ml-2 font-semibold text-slate-800 dark:text-slate-200">
                          {formatCurrency(relatedLine.unitPrice, currencyCode)}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 dark:text-slate-400">
                          {t('quotation.lines.netPrice')}:
                        </span>
                        <span className="ml-2 font-semibold text-emerald-600 dark:text-emerald-400">
                          {formatCurrency(relatedLine.lineTotal || 0, currencyCode)}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 dark:text-slate-400">
                          {t('quotation.lines.lineTotal')}:
                        </span>
                        <span className="ml-2 font-semibold text-orange-600 dark:text-orange-400">
                          {formatCurrency(relatedLine.lineGrandTotal || 0, currencyCode)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 mt-auto">
            <Button 
              type="button" 
              variant="ghost" 
              onClick={onCancel} 
              disabled={isSaving}
              className="h-12 px-6 w-full sm:w-auto rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 font-medium transition-all"
            >
              {t('quotation.cancel')}
            </Button>
            <Button
              type="button"
              onClick={bulkDraftLines.length > 0 ? handleBulkDraftConfirm : handleSave}
              disabled={(bulkDraftLines.length > 0 ? bulkDraftLines.length === 0 : (!formData.productCode || !formData.productName)) || isSaving}
              className="h-12 px-8 w-full sm:w-auto rounded-xl bg-linear-to-r from-pink-600 to-orange-600 hover:from-pink-700 hover:to-orange-700 text-white shadow-lg shadow-pink-600/20 hover:shadow-xl font-bold transition-all active:scale-95"
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  {t('quotation.saving')}
                </>
              ) : (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  {t('quotation.save')}{bulkDraftLines.length > 0 ? ` (${bulkDraftLines.length})` : ''}
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      <CustomerSelectDialog
        open={companyDialogOpen}
        onOpenChange={setCompanyDialogOpen}
        onSelect={handleCompanySelect}
        className="z-200"
      />

      <PricingRuleInsightDialog
        open={pricingInfoOpen}
        onOpenChange={setPricingInfoOpen}
        productCode={formData.productCode}
        activeGroupCode={activeGroupCode}
        rules={matchingPricingRules}
        discountLimit={matchingDiscountLimit}
      />

      <ProductSelectDialog
        open={productDialogOpen}
        onOpenChange={setProductDialogOpen}
        onSelect={handleProductSelect}
        multiSelect
        onMultiSelect={handleMultiProductSelect}
        existingLineStockMarkers={existingLineStockMarkers}
        initialSelectedResults={bulkDraftLines.map((lineItem) => ({
          ...(lineItem.productId != null && lineItem.productId > 0 ? { id: lineItem.productId } : {}),
          code: lineItem.productCode || '',
          name: lineItem.productName || '',
          unit: lineItem.unit ?? undefined,
          groupCode: lineItem.groupCode || undefined,
        }))}
      />

      <CatalogStockSelectDialog
        open={catalogDialogOpen}
        onOpenChange={setCatalogDialogOpen}
        onSelect={handleProductSelect}
        multiSelect
        onMultiSelect={handleMultiProductSelect}
        existingLineStockMarkers={existingLineStockMarkers}
        initialSelectedResults={bulkDraftLines.map((lineItem) => ({
          ...(lineItem.productId != null && lineItem.productId > 0 ? { id: lineItem.productId } : {}),
          code: lineItem.productCode || '',
          name: lineItem.productName || '',
          unit: lineItem.unit ?? undefined,
          groupCode: lineItem.groupCode || undefined,
        }))}
      />
    </div>
  );
}

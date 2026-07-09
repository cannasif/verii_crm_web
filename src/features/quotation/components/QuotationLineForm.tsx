'use client';

import { type ChangeEvent, type ReactElement, type MouseEvent, useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import { toast } from 'sonner';
import { FormSubmitTooltipWrap } from '@/components/shared/FormSubmitTooltipWrap';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useQuotationCalculations } from '../hooks/useQuotationCalculations';
import { useDiscountLimitValidation } from '../hooks/useDiscountLimitValidation';
import { useCurrencyOptions } from '@/services/hooks/useCurrencyOptions';
import { useExchangeRate } from '@/services/hooks/useExchangeRate';
import { useErpProjectCodesInfinite } from '@/services/hooks/useErpProjectCodesInfinite';
import { VoiceSearchCombobox } from '@/components/shared/VoiceSearchCombobox';
import { ErpFieldHint } from '@/components/shared/ErpFieldHint';
import { ProductSelectDialog, type ProductSelectionResult } from '@/components/shared/ProductSelectDialog';
import { LineFormStockSearchField } from '@/components/shared/LineFormStockSearchField';
import { CatalogStockSelectDialog } from '@/components/shared/CatalogStockSelectDialog';
import { LineDiscountedUnitPriceDisplay } from '@/components/shared/LineDiscountedUnitPriceDisplay';
import { LineFormUnitPriceInput } from '@/components/shared/LineFormUnitPriceInput';
import { useLineUnitPriceInput } from '@/hooks/useLineUnitPriceInput';
import {
  convertPriceForDocumentCurrency,
  convertProductLinePriceForDocument,
} from '@/lib/line-unit-price-currency';
import { findMatchingPricingRuleLine } from '@/lib/pricing-rule-line-match';
import { getLineUnitDiscountBreakdown, getUnitDiscountAmountForTierIndex } from '@/lib/line-discount-display';
import {
  areDiscountRatesValid,
  normalizeDiscountRateForField,
  type DiscountRateField,
} from '@/lib/discount-rate-validation';
import { PricingRuleType } from '@/features/pricing-rule/types/pricing-rule-types';
import { CustomerSelectDialog, type CustomerSelectionResult } from '@/components/shared/CustomerSelectDialog';
import { PricingRuleInsightDialog } from '@/components/shared/PricingRuleInsightDialog';
import { useProductSelection } from '../hooks/useProductSelection';
import { formatCurrency } from '../utils/format-currency';
import { quotationApi } from '../api/quotation-api';
import { quotationLineRequiredSchema, type QuotationLineFormState, type QuotationExchangeRateFormState, type PricingRuleLineGetDto, type UserDiscountLimitDto, type ApprovalStatus } from '../types/quotation-types';
import { pdfReportTemplateApi } from '@/features/pdf-report';
import type { UploadPdfAssetOptions } from '@/features/pdf-report/api/pdf-report-template-api';
import { getImageUrl } from '@/lib/image-url';
import { Check, Package, Percent, Loader2, Coins, Layers, BadgePercent, AlertTriangle, Search, Info, X, LayoutGrid, ImagePlus, Trash2, CirclePlus } from 'lucide-react';
import { isZodFieldRequired } from '@/lib/zod-required';
import {
  formatQuantityInputDraftFromNumber,
  normalizeQuantityTrOnBlur,
  parseQuantityTrDraft,
  sanitizeQuantityTrTyping,
} from '@/lib/quantity-input-tr';
import { useWindoDefinitionOptions } from '@/features/windo-profil-demir-vida-management/hooks/useWindoDefinitionOptions';
import {
  useWindoBaskiOptionsInfinite,
  useWindoDemirOptionsInfinite,
  useWindoProfilOptionsInfinite,
  useWindoVidaOptionsInfinite,
} from '@/features/windo-profil-demir-vida-management/hooks/useWindoDefinitionOptionsInfinite';
import { WindoQuickCreateDialog } from '@/features/windo-profil-demir-vida-management/components/WindoQuickCreateDialog';
import {
  DOCUMENT_LINE_FORM_CANCEL_BUTTON_CLASS,
  DOCUMENT_LINE_FORM_SAVE_BUTTON_CLASS,
} from '@/lib/document-line-dialog-styles';
import { useSystemSettingsQuery } from '@/features/system-settings/hooks/useSystemSettingsQuery';
import { useSystemSettingsStore } from '@/stores/system-settings-store';
import { applyDocumentVatDefaultOnLine, getDefaultDocumentVatRate, resolveDocumentVatRate } from '@/lib/document-vat';
import { useDocumentFieldLabelMap } from '@/features/document-field-labels/hooks/useDocumentFieldLabels';

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
  offerType?: string | null;
  deliveryMethodName?: string | null;
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
  offerType,
  deliveryMethodName,
}: QuotationLineFormProps): ReactElement {
  const { t } = useTranslation(['quotation', 'common']);
  const lineDescriptionLabels = useDocumentFieldLabelMap('quotation', 'LineDescription');
  const description1Label = lineDescriptionLabels.Description1?.effectiveLabel || t('lines.descriptionField1Label');
  const description2Label = lineDescriptionLabels.Description2?.effectiveLabel || t('lines.descriptionField2Label');
  const description3Label = lineDescriptionLabels.Description3?.effectiveLabel || t('lines.descriptionField3Label');
  const queryClient = useQueryClient();
  const { calculateLineTotals } = useQuotationCalculations();
  const storedSystemSettings = useSystemSettingsStore((state) => state.settings);
  const { data: freshSystemSettings } = useSystemSettingsQuery();
  const effectiveSystemSettings = freshSystemSettings ?? storedSystemSettings;
  const hideVatRate = effectiveSystemSettings.hideQuotationVatRate;
  const readonlyVatRate = effectiveSystemSettings.readonlyQuotationVatRate;
  const isVatRateInputLocked = readonlyVatRate;
  const [productDialogOpen, setProductDialogOpen] = useState(false);
  const [catalogDialogOpen, setCatalogDialogOpen] = useState(false);
  const [companyDialogOpen, setCompanyDialogOpen] = useState(false);
  const [pricingInfoOpen, setPricingInfoOpen] = useState(false);
  const [profilCreateOpen, setProfilCreateOpen] = useState(false);
  const [demirCreateOpen, setDemirCreateOpen] = useState(false);
  const [vidaCreateOpen, setVidaCreateOpen] = useState(false);
  const [baskiCreateOpen, setBaskiCreateOpen] = useState(false);
  const [projectSearchTerm, setProjectSearchTerm] = useState('');
  const projectDropdown = useErpProjectCodesInfinite(projectSearchTerm);
  const { currencyOptions } = useCurrencyOptions();
  const { data: erpRates = [] } = useExchangeRate();
  const { handleProductSelect: handleProductSelectHook, handleProductSelectWithRelatedStocks } = useProductSelection({
    currency,
    exchangeRates,
    pricingRules,
    offerType,
    deliveryMethodName,
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

  const [formData, setFormData] = useState<QuotationLineFormState>(() => calculateLineTotals(applyDocumentVatDefaultOnLine(line, offerType, deliveryMethodName)));
  const { demirOptions, vidaOptions, baskiOptions, allDemirOptions, allVidaOptions, isLoading: isDefinitionOptionsLoading } =
    useWindoDefinitionOptions(formData.profilDefinitionId, {
      demirDefinitionId: formData.demirDefinitionId,
      vidaDefinitionId: formData.vidaDefinitionId,
    });
  const [profilSearchTerm, setProfilSearchTerm] = useState('');
  const [demirSearchTerm, setDemirSearchTerm] = useState('');
  const [vidaSearchTerm, setVidaSearchTerm] = useState('');
  const [baskiSearchTerm, setBaskiSearchTerm] = useState('');
  const profilDropdown = useWindoProfilOptionsInfinite(profilSearchTerm);
  const demirDropdown = useWindoDemirOptionsInfinite(
    demirSearchTerm,
    formData.profilDefinitionId,
    formData.demirDefinitionId
  );
  const vidaDropdown = useWindoVidaOptionsInfinite(
    vidaSearchTerm,
    formData.profilDefinitionId,
    formData.vidaDefinitionId
  );
  const baskiDropdown = useWindoBaskiOptionsInfinite(baskiSearchTerm);
  const hasAppliedDefaultBaskiRef = useRef(false);

  const [relatedLines, setRelatedLines] = useState<QuotationLineFormState[]>([]);
  const [bulkDraftLines, setBulkDraftLines] = useState<QuotationLineFormState[]>([]);
  const [activeBulkIndex, setActiveBulkIndex] = useState(0);
  const [temporaryStockData, setTemporaryStockData] = useState<TemporaryStockData[]>([]);
  const [lastLoadedProductCode, setLastLoadedProductCode] = useState<string | null>(null);
  const handleFieldChangeRef = useRef<(field: keyof QuotationLineFormState, value: unknown) => void>(() => { });
  const unitPriceInput = useLineUnitPriceInput({
    documentCurrencyDovizTipi: currency,
    documentUnitPrice: formData.unitPrice ?? 0,
    currencyOptions,
    exchangeRates,
    erpRates,
    onDocumentUnitPriceChange: useCallback((price: number) => {
      handleFieldChangeRef.current('unitPrice', price);
    }, []),
  });
  const [quantityInputValue, setQuantityInputValue] = useState<string>(() =>
    formatQuantityInputDraftFromNumber(line.quantity ?? 0, line.unit),
  );
  const [vatRateInputValue, setVatRateInputValue] = useState<string>(() => String(resolveDocumentVatRate(line.vatRate, offerType, deliveryMethodName)));
  const previousOfferTypeRef = useRef(offerType);
  const previousDeliveryMethodNameRef = useRef(deliveryMethodName);
  const [discountRate1InputValue, setDiscountRate1InputValue] = useState<string>(String(line.discountRate1 || ''));
  const [discountRate2InputValue, setDiscountRate2InputValue] = useState<string>(String(line.discountRate2 || ''));
  const [discountRate3InputValue, setDiscountRate3InputValue] = useState<string>(String(line.discountRate3 || ''));
  const prevDiscountRatesRef = useRef({ discountRate1: line.discountRate1, discountRate2: line.discountRate2, discountRate3: line.discountRate3 });
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const persistedLineId = imageUploadExtras?.quotationLineId;
  const profilComboboxOptions = profilDropdown.options;
  const demirComboboxOptions = demirDropdown.options;
  const vidaComboboxOptions = vidaDropdown.options;
  const baskiComboboxOptions = baskiDropdown.options;
  const handleWindoDefinitionCreated = async (
    kind: 'profil' | 'demir' | 'vida' | 'baski',
    item: { id: number; profilDefinitionId?: number | null }
  ): Promise<void> => {
    await queryClient.invalidateQueries({ queryKey: ['windo-definition'] });

    setFormData((prev) => {
      if (kind === 'profil') {
        return {
          ...prev,
          profilDefinitionId: item.id,
          demirDefinitionId: null,
          vidaDefinitionId: null,
        };
      }

      if (kind === 'demir') {
        return {
          ...prev,
          profilDefinitionId: item.profilDefinitionId ?? prev.profilDefinitionId ?? null,
          demirDefinitionId: item.id,
        };
      }

      if (kind === 'vida') {
        return {
          ...prev,
          profilDefinitionId: item.profilDefinitionId ?? prev.profilDefinitionId ?? null,
          vidaDefinitionId: item.id,
        };
      }

      if (kind === 'baski') {
        return {
          ...prev,
          baskiDefinitionId: item.id,
        };
      }

      return prev;
    });
  };

  type DiscountField = DiscountRateField;
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
        label: t('lines.discountNumbered1'),
      },
      {
        val: discountRate2InputValue,
        setVal: setDiscountRate2InputValue,
        field: 'discountRate2',
        label: t('lines.discountNumbered2'),
      },
      {
        val: discountRate3InputValue,
        setVal: setDiscountRate3InputValue,
        field: 'discountRate3',
        label: t('lines.discountNumbered3'),
      },
    ],
    [t, discountRate1InputValue, discountRate2InputValue, discountRate3InputValue]
  );

  const unitDiscountBreakdown = useMemo(
    () =>
      getLineUnitDiscountBreakdown(
        formData.unitPrice ?? 0,
        formData.discountRate1 ?? 0,
        formData.discountRate2 ?? 0,
        formData.discountRate3 ?? 0,
      ),
    [formData.unitPrice, formData.discountRate1, formData.discountRate2, formData.discountRate3],
  );

  const getDiscountAmount = (field: DiscountField): number => {
    if (field === 'discountRate1') return getUnitDiscountAmountForTierIndex(unitDiscountBreakdown, 0);
    if (field === 'discountRate2') return getUnitDiscountAmountForTierIndex(unitDiscountBreakdown, 1);
    return getUnitDiscountAmountForTierIndex(unitDiscountBreakdown, 2);
  };

  const showDiscountRateError = useCallback(() => {
    toast.error('Kademeli iskonto efektif %100 değerine ulaşamaz.');
  }, []);

  const normalizeDiscountInput = useCallback(
    (field: DiscountField, value: number): number => {
      const normalized = normalizeDiscountRateForField(field, value, {
        discountRate1: formData.discountRate1,
        discountRate2: formData.discountRate2,
        discountRate3: formData.discountRate3,
      });

      if (normalized.wasClamped) {
        showDiscountRateError();
      }

      return normalized.value;
    },
    [formData.discountRate1, formData.discountRate2, formData.discountRate3, showDiscountRateError]
  );

  const validateDiscountRatesBeforeSave = useCallback(
    (linesToValidate: Array<Pick<QuotationLineFormState, DiscountField>>): boolean => {
      const isValid = linesToValidate.every((item) => areDiscountRatesValid(item));
      if (!isValid) {
        showDiscountRateError();
      }
      return isValid;
    },
    [showDiscountRateError]
  );

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
    unitPriceInput.resetInputCurrencyToDocument();
    unitPriceInput.syncUnitPriceFromDocument(formData.unitPrice ?? 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currency, formData.unitPrice]);

  useEffect(() => {
    if (!line.productCode?.trim() && formData.productCode?.trim()) {
      return;
    }

    const nextLine = calculateLineTotals(applyDocumentVatDefaultOnLine(line, offerType, deliveryMethodName));
    setFormData(nextLine);
    setQuantityInputValue(formatQuantityInputDraftFromNumber(nextLine.quantity ?? 0, nextLine.unit));
    unitPriceInput.resetInputCurrencyToDocument();
    unitPriceInput.syncUnitPriceFromDocument(nextLine.unitPrice ?? 0);
    setVatRateInputValue(String(resolveDocumentVatRate(nextLine.vatRate, offerType, deliveryMethodName)));
    setDiscountRate1InputValue(String(nextLine.discountRate1 || ''));
    setDiscountRate2InputValue(String(nextLine.discountRate2 || ''));
    setDiscountRate3InputValue(String(nextLine.discountRate3 || ''));
    const lineRelatedLines = (line as QuotationLineFormState & { relatedLines?: QuotationLineFormState[] }).relatedLines || [];
    if (lineRelatedLines.length > 0) {
      setRelatedLines(lineRelatedLines.map((relatedLine) => calculateLineTotals(applyDocumentVatDefaultOnLine(relatedLine, offerType, deliveryMethodName))));
    } else {
      setRelatedLines([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [calculateLineTotals, line, offerType, deliveryMethodName, formData.productCode]);

  useEffect(() => {
    if (previousOfferTypeRef.current === offerType && previousDeliveryMethodNameRef.current === deliveryMethodName) return;
    previousOfferTypeRef.current = offerType;
    previousDeliveryMethodNameRef.current = deliveryMethodName;
    const defaultVatRate = getDefaultDocumentVatRate(offerType, deliveryMethodName);
    setVatRateInputValue(String(defaultVatRate));
    setFormData((prev) => {
      if ((prev.vatRate ?? null) === defaultVatRate && (prev.vatAmount ?? 0) === 0) return prev;
      return calculateLineTotals({ ...prev, vatRate: defaultVatRate, vatAmount: 0 });
    });
    setRelatedLines((prev) => prev.map((relatedLine) => calculateLineTotals({ ...relatedLine, vatRate: defaultVatRate, vatAmount: 0 })));
    setBulkDraftLines((prev) => prev.map((draftLine) => calculateLineTotals({ ...draftLine, vatRate: defaultVatRate, vatAmount: 0 })));
  }, [calculateLineTotals, offerType, deliveryMethodName]);

  useEffect(() => {
    unitPriceInput.syncUnitPriceFromDocument(formData.unitPrice ?? 0);
    setQuantityInputValue(formatQuantityInputDraftFromNumber(formData.quantity ?? 0, formData.unit));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.productCode, formData.quantity, formData.unit, formData.unitPrice, line.id]);

  useEffect(() => {
    setFormData((prev) => {
      if (!prev.profilDefinitionId) {
        if (prev.demirDefinitionId == null && prev.vidaDefinitionId == null) {
          return prev;
        }

        return {
          ...prev,
          demirDefinitionId: null,
          vidaDefinitionId: null,
        };
      }

      const currentDemir = allDemirOptions.find((option) => option.id === prev.demirDefinitionId);
      const currentVida = allVidaOptions.find((option) => option.id === prev.vidaDefinitionId);
      const nextDemirId =
        currentDemir?.profilDefinitionId === prev.profilDefinitionId
          ? prev.demirDefinitionId
          : null;
      const nextVidaId =
        currentVida?.profilDefinitionId === prev.profilDefinitionId
          ? prev.vidaDefinitionId
          : null;

      if (nextDemirId === prev.demirDefinitionId && nextVidaId === prev.vidaDefinitionId) {
        return prev;
      }

      return {
        ...prev,
        demirDefinitionId: nextDemirId,
        vidaDefinitionId: nextVidaId,
      };
    });
  }, [allDemirOptions, allVidaOptions, demirOptions, vidaOptions, formData.profilDefinitionId]);

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
              const converted = convertProductLinePriceForDocument({
                priceData: mainPrice,
                productCode: line.productCode,
                quantity: line.quantity,
                documentDovizTipi: currency,
                currencyOptions,
                exchangeRates,
                erpRates,
                pricingRules,
                requireDocumentExchangeRates: true,
              });
              mainUnitPrice = converted.unitPrice;
              mainDiscountRate1 = converted.discountRate1;
              mainDiscountRate2 = converted.discountRate2;
              mainDiscountRate3 = converted.discountRate3;
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
                  const converted = convertProductLinePriceForDocument({
                    priceData: relatedPrice,
                    productCode: relatedLine.productCode,
                    quantity: relatedLine.quantity,
                    documentDovizTipi: currency,
                    currencyOptions,
                    exchangeRates,
                    erpRates,
                    pricingRules,
                    requireDocumentExchangeRates: true,
                  });
                  relatedUnitPrice = converted.unitPrice;
                  relatedDiscountRate1 = converted.discountRate1;
                  relatedDiscountRate2 = converted.discountRate2;
                  relatedDiscountRate3 = converted.discountRate3;
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
  }, [line, currency, currencyOptions, exchangeRates, erpRates, lastLoadedProductCode, temporaryStockData, pricingRules]);

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

  const syncActiveBulkDraftImage = (
    imageUpdate: Pick<QuotationLineFormState, 'imagePath' | 'pendingImageFile' | 'pendingImagePreviewUrl'>
  ): void => {
    setBulkDraftLines((prev) =>
      prev.length > 0
        ? prev.map((lineItem, index) =>
          index === activeBulkIndex ? { ...lineItem, ...imageUpdate } : lineItem
        )
        : prev
    );
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
      const imageUpdate = {
        imagePath: null,
        pendingImageFile: file,
        pendingImagePreviewUrl: previewUrl,
      };
      setFormData((prev) => ({ ...prev, ...imageUpdate }));
      syncActiveBulkDraftImage(imageUpdate);
      toast.success(t('common.saved', { ns: 'common' }));
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
      const imageUpdate = {
        imagePath: uploaded.relativeUrl,
        pendingImageFile: null,
        pendingImagePreviewUrl: null,
      };
      setFormData((prev) => ({ ...prev, ...imageUpdate }));
      syncActiveBulkDraftImage(imageUpdate);
      toast.success(t('common.saved', { ns: 'common' }));
    } catch (error) {
      const message = error instanceof Error ? error.message : t('common.imageUploadFailed', { ns: 'common' });
      toast.error(t('common.imageUploadFailed', { ns: 'common' }), { description: message });
    } finally {
      setIsUploadingImage(false);
    }
  };

  const currentImagePreview = formData.pendingImagePreviewUrl || formData.imagePath;

  const handleRemoveImage = (): void => {
    if (formData.pendingImagePreviewUrl?.startsWith('blob:')) {
      URL.revokeObjectURL(formData.pendingImagePreviewUrl);
    }
    const imageUpdate = {
      imagePath: null,
      pendingImageFile: null,
      pendingImagePreviewUrl: null,
    };
    setFormData((prev) => ({ ...prev, ...imageUpdate }));
    syncActiveBulkDraftImage(imageUpdate);
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
          baskiDefinitionId: formData.baskiDefinitionId ?? getDefaultBaskiId() ?? undefined,
        };
        setFormData(mainLine);
        setQuantityInputValue(formatQuantityInputDraftFromNumber(mainLine.quantity ?? 0, mainLine.unit));
        unitPriceInput.resetInputCurrencyToDocument();
        unitPriceInput.syncUnitPriceFromDocument(mainLine.unitPrice ?? 0);
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
        baskiDefinitionId: formData.baskiDefinitionId ?? getDefaultBaskiId() ?? undefined,
      };

      setFormData(updatedFormData);
      setQuantityInputValue(formatQuantityInputDraftFromNumber(updatedFormData.quantity ?? 0, updatedFormData.unit));
      unitPriceInput.resetInputCurrencyToDocument();
      unitPriceInput.syncUnitPriceFromDocument(updatedFormData.unitPrice ?? 0);
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
            baskiDefinitionId: getDefaultBaskiId() ?? undefined,
            relatedLines: allLines.slice(1).map((line, lineIndex) => ({
              ...line,
              id: `${line.id}-m${productIndex}-${lineIndex + 1}`,
              groupCode: line.groupCode || product.groupCode || null,
              baskiDefinitionId: getDefaultBaskiId() ?? undefined,
            })),
          });
        }
      } else {
        const line = await handleProductSelectHook(product);
        collectedLines.push({
          ...line,
          id: `${line.id}-m${productIndex}`,
          groupCode: line.groupCode || product.groupCode || null,
          baskiDefinitionId: getDefaultBaskiId() ?? undefined,
        });
      }
    }

    if (!collectedLines.length) return;

    const firstLine = collectedLines[0];
    if (firstLine) {
      setFormData(firstLine);
      setQuantityInputValue(formatQuantityInputDraftFromNumber(firstLine.quantity ?? 0, firstLine.unit));
      unitPriceInput.resetInputCurrencyToDocument();
      unitPriceInput.syncUnitPriceFromDocument(firstLine.unitPrice ?? 0);
      setVatRateInputValue(String(resolveDocumentVatRate(firstLine.vatRate, offerType)));
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
    }).map((draftLine) => calculateLineTotals(applyDocumentVatDefaultOnLine(draftLine, offerType)));
    if (!validateDiscountRatesBeforeSave(flattenedLines)) {
      return;
    }
    if (onSaveMultiple) {
      onSaveMultiple(flattenedLines);
    } else {
      const firstLine = bulkDraftLines[0];
      if (firstLine) {
        const merged = { ...firstLine, id: formData.id };
        setFormData(merged);
        setQuantityInputValue(formatQuantityInputDraftFromNumber(merged.quantity ?? 0, merged.unit));
        unitPriceInput.resetInputCurrencyToDocument();
        unitPriceInput.syncUnitPriceFromDocument(merged.unitPrice ?? 0);
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
    setQuantityInputValue(formatQuantityInputDraftFromNumber(selected.quantity ?? 0, selected.unit));
    unitPriceInput.syncUnitPriceFromDocument(selected.unitPrice ?? 0);
    setVatRateInputValue(String(resolveDocumentVatRate(selected.vatRate, offerType)));
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
      setQuantityInputValue(formatQuantityInputDraftFromNumber(line.quantity ?? 0, line.unit));
      unitPriceInput.resetInputCurrencyToDocument();
      unitPriceInput.syncUnitPriceFromDocument(line.unitPrice ?? 0);
      setVatRateInputValue(String(resolveDocumentVatRate(line.vatRate, offerType)));
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
      setQuantityInputValue(formatQuantityInputDraftFromNumber(selected.quantity ?? 0, selected.unit));
      unitPriceInput.syncUnitPriceFromDocument(selected.unitPrice ?? 0);
      setVatRateInputValue(String(resolveDocumentVatRate(selected.vatRate, offerType)));
      setDiscountRate1InputValue(String(selected.discountRate1 || ''));
      setDiscountRate2InputValue(String(selected.discountRate2 || ''));
      setDiscountRate3InputValue(String(selected.discountRate3 || ''));
      const nested =
        (selected as QuotationLineFormState & { relatedLines?: QuotationLineFormState[] }).relatedLines ?? [];
      setRelatedLines(nested);
    }
  };

  const handleFieldChange = (field: keyof QuotationLineFormState, value: unknown): void => {
    if (readonlyVatRate && field === 'vatRate') {
      return;
    }

    const prevUnitPrice = formData.unitPrice;
    const prevQuantity = formData.quantity;
    const updated = { ...formData, [field]: value };
    let calculated = calculateLineTotals(updated);

    if (field === 'quantity' && formData.productCode) {
      const newQuantity = value as number;
      const mainStockData = temporaryStockData.find((data) => data.productCode === formData.productCode);
      const matchingPricingRule = findMatchingPricingRuleLine(
        pricingRules,
        formData.productCode,
        newQuantity
      );

      if (matchingPricingRule) {
        if (matchingPricingRule.fixedUnitPrice !== null && matchingPricingRule.fixedUnitPrice !== undefined) {
          const convertedPrice = convertPriceForDocumentCurrency(
            matchingPricingRule.fixedUnitPrice,
            matchingPricingRule.currencyCode,
            currency,
            currencyOptions,
            exchangeRates,
            erpRates,
            {
              pricingRuleCurrencyCode: matchingPricingRule.currencyCode,
              hasPricingRuleFixedPrice: true,
            }
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

    const nextCalculated = calculated;

    setFormData(nextCalculated);
    if (bulkDraftLines.length > 0) {
      setBulkDraftLines((prev) =>
        prev.map((lineItem, index) => (
          index === activeBulkIndex ? { ...nextCalculated, id: lineItem.id } : lineItem
        ))
      );
    }

    if (field !== 'unitPrice' && nextCalculated.unitPrice !== prevUnitPrice) {
      unitPriceInput.syncUnitPriceFromDocument(nextCalculated.unitPrice ?? 0);
    }

    if (field !== 'quantity' && nextCalculated.quantity !== prevQuantity) {
      setQuantityInputValue(
        formatQuantityInputDraftFromNumber(nextCalculated.quantity ?? 0, nextCalculated.unit ?? formData.unit),
      );
    }

    if (field === 'quantity' && formData.productCode) {
      setDiscountRate1InputValue(String(nextCalculated.discountRate1 || ''));
      setDiscountRate2InputValue(String(nextCalculated.discountRate2 || ''));
      setDiscountRate3InputValue(String(nextCalculated.discountRate3 || ''));
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
          return calculateLineTotals(applyDocumentVatDefaultOnLine(updatedRelatedLine, offerType));
        }

        return relatedLine;
      });
      setRelatedLines(updatedRelatedLines);
    }

  };

  handleFieldChangeRef.current = handleFieldChange;

  const getDefaultBaskiId = useCallback((): number | null => {
    const isExistingDoc = !!imageUploadExtras?.quotationId;
    const hasSavedBaski = !!line.baskiDefinitionId;
    const shouldApplyBaskisizDefault = !isExistingDoc || !hasSavedBaski;

    if (shouldApplyBaskisizDefault) {
      const baskisizOption = baskiOptions.find(o => {
        const name = o.name.trim();
        const trName = name.toLocaleLowerCase('tr-TR');
        const enName = name.toLowerCase();
        return trName.includes('baskısız') || trName.includes('baskisiz') || enName.includes('baskısız') || enName.includes('baskisiz');
      });
      return baskisizOption ? baskisizOption.id : null;
    }
    return line.baskiDefinitionId ?? null;
  }, [baskiOptions, line.baskiDefinitionId, imageUploadExtras?.quotationId]);

  useEffect(() => {
    if (!hasAppliedDefaultBaskiRef.current && baskiOptions.length > 0) {
      if (!formData.baskiDefinitionId) {
        const defaultBaskiId = getDefaultBaskiId();
        if (defaultBaskiId) {
          setTimeout(() => {
            if (handleFieldChangeRef.current) {
              handleFieldChangeRef.current('baskiDefinitionId', defaultBaskiId);
            }
          }, 50);
          hasAppliedDefaultBaskiRef.current = true;
        } else if (!isDefinitionOptionsLoading) {
          hasAppliedDefaultBaskiRef.current = true;
        }
      } else {
        hasAppliedDefaultBaskiRef.current = true;
      }
    } else if (!hasAppliedDefaultBaskiRef.current && !isDefinitionOptionsLoading && baskiOptions.length === 0) {
      hasAppliedDefaultBaskiRef.current = true;
    }
  }, [baskiOptions, formData.baskiDefinitionId, isDefinitionOptionsLoading, getDefaultBaskiId]);

  const handleSave = (): void => {
    const normalizedFormData = calculateLineTotals(formData);
    const normalizedRelatedLines = relatedLines.map((relatedLine) => calculateLineTotals(relatedLine));
    if (!validateDiscountRatesBeforeSave([normalizedFormData, ...normalizedRelatedLines])) {
      return;
    }

    if (onSaveMultiple && relatedLines.length > 0) {
      const linesToSave = [normalizedFormData, ...normalizedRelatedLines];
      onSaveMultiple(linesToSave);
    } else if (onSave) {
      onSave(normalizedFormData);
    }
  };


  const totalDiscount = (formData.discountAmount1 || 0) + (formData.discountAmount2 || 0) + (formData.discountAmount3 || 0);
  const hasDiscount = totalDiscount > 0;
  const hasApprovalWarning = discountValidation.exceedsLimit || formData.approvalStatus === 1;
  const bulkDraftGrandTotal = bulkDraftLines.reduce((sum, item) => sum + (item.lineGrandTotal || 0), 0);
  const pinkFocusClass = 'focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20';
  const percentageStep = '0.1';
  const isLineStockSelected = Boolean((formData.productCode ?? '').trim());

  return (
    <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
      <div className="space-y-4">
        <label className="text-sm font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-2">
          <Package className="h-4 w-4 text-primary" />
          {t('lines.stock')}
          {isZodFieldRequired(quotationLineRequiredSchema, 'productCode') ? <span className="text-primary">*</span> : null}
        </label>

        <div className="flex flex-col gap-3">
          <div className="flex flex-row gap-3">
            <div className="group relative min-w-0 flex-1">
              <div className="pointer-events-none absolute left-3 top-1/2 z-20 flex -translate-y-1/2 items-center justify-center text-zinc-400 transition-colors group-focus-within:text-primary">
                <Search className="h-4 w-4" />
              </div>
              <LineFormStockSearchField
                productCode={formData.productCode || ''}
                onSelectResult={handleProductSelect}
                inputClassName={`border-slate-200 bg-slate-50 pl-10 font-mono text-slate-900 dark:border-white/10 dark:bg-white/[0.04] dark:text-white ${pinkFocusClass}`}
              />
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={() => setProductDialogOpen(true)}
              className="h-11 w-11 p-0 rounded-xl border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.04] hover:bg-accent text-primary transition-all flex-none items-center justify-center"
            >
              <Search className="h-5 w-5" />
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setCatalogDialogOpen(true)}
              className="h-11 px-3 rounded-xl border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.04] hover:bg-accent text-primary transition-all flex-none items-center gap-2"
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
              disabled={!isLineStockSelected}
              className="h-11 px-3 rounded-xl border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.04] hover:bg-slate-100 dark:hover:bg-white/5 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-all flex-none items-center gap-2"
            >
              <Info className="h-4 w-4" />
              <span className="text-xs font-medium">
                {t('common.pricingInsights.button', { ns: 'common' })}
              </span>
              {ruleInsightCount > 0 && (
                <span className="inline-flex min-w-5 h-5 px-1 items-center justify-center rounded-full bg-accent text-white text-[10px] font-bold">
                  {ruleInsightCount}
                </span>
              )}
            </Button>
          </div>

          <div className="w-full">
            <Input
              value={formData.productName || ''}
              placeholder={t('lines.productName')}
              readOnly
              className={`bg-slate-50 dark:bg-white/[0.04] border-slate-200 dark:border-white/10 text-slate-900 dark:text-white font-semibold text-sm h-11 rounded-xl w-full ${pinkFocusClass}`}
            />
          </div>

          <div className="w-full">
            <VoiceSearchCombobox
              className="h-11 bg-slate-50 dark:bg-white/[0.04] border-slate-200 dark:border-white/10 rounded-xl"
              value={formData.projectCode || ''}
              onSelect={(value) => handleFieldChange('projectCode', value)}
              options={projectDropdown.options}
              onDebouncedSearchChange={setProjectSearchTerm}
              onFetchNextPage={projectDropdown.fetchNextPage}
              hasNextPage={projectDropdown.hasNextPage}
              isLoading={projectDropdown.isLoading}
              isFetchingNextPage={projectDropdown.isFetchingNextPage}
              placeholder={t('quotation:header.projectCode')}
              searchPlaceholder={t('common.search', { ns: 'common' })}
            />
          </div>

          {bulkDraftLines.length > 0 && (
            <div className="rounded-xl border border-primary/20 dark:border-primary/30 bg-accent/40 p-3 space-y-2">
              <div className="flex items-center justify-between gap-2 text-xs text-slate-600 dark:text-slate-300">
                <span className="font-semibold">{t('lines.stock')} ({bulkDraftLines.length})</span>
                <span className="inline-flex items-center rounded-full border border-primary/30 bg-white/90 dark:bg-primary/10 px-2.5 py-1 text-[11px] font-bold text-primary">
                  {t('lines.grandTotal')}: {formatCurrency(bulkDraftGrandTotal, currencyCode)}
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {bulkDraftLines.map((item, index) => (
                  <div
                    key={`${item.id}-${index}`}
                    className={`inline-flex items-stretch overflow-hidden rounded-full border transition-all ${index === activeBulkIndex
                      ? 'border-primary bg-primary shadow-md shadow-primary/30 text-primary-foreground'
                      : 'border-primary/20 bg-white/80 dark:border-primary/30 dark:bg-primary/10'
                      }`}
                  >
                    <button
                      type="button"
                      onClick={() => handleSelectBulkLine(index)}
                      title={item.productName || item.productCode || '-'}
                      className={`flex h-8 max-w-[180px] items-center gap-1.5 px-3 text-left text-sm transition-colors ${index === activeBulkIndex
                        ? 'text-primary-foreground hover:bg-primary-foreground/10'
                        : 'text-primary hover:bg-accent'
                        }`}
                    >
                      {(item.relatedLines?.length ?? 0) > 0 ? <Layers className="h-3.5 w-3.5 shrink-0" /> : null}
                      <span className="truncate font-mono">{item.productCode || '-'}</span>
                    </button>
                    <button
                      type="button"
                      aria-label={t('common.remove', { ns: 'common' })}
                      title={t('common.remove', { ns: 'common' })}
                      onClick={handleRemoveBulkDraftLine(index)}
                      className={`flex h-8 w-7 shrink-0 items-center justify-center border-l text-xs transition-colors ${index === activeBulkIndex
                        ? 'border-primary-foreground/20 text-primary-foreground hover:bg-primary-foreground/10'
                        : 'border-primary/20 text-primary hover:bg-accent'
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
            <Layers className="h-4 w-4 text-sky-500" />
            {t('lines.quantity')}
          </label>
          <Input
            type="text"
            inputMode="decimal"
            autoComplete="off"
            disabled={!isLineStockSelected}
            value={quantityInputValue}
            onChange={(e) => {
              const next = sanitizeQuantityTrTyping(e.target.value, formData.unit);
              setQuantityInputValue(next);
              const parsed = parseQuantityTrDraft(next);
              if (parsed === null) {
                handleFieldChange('quantity', 0);
                return;
              }
              handleFieldChange('quantity', parsed);
            }}
            onBlur={() => {
              const { display, numeric } = normalizeQuantityTrOnBlur(quantityInputValue, formData.unit);
              setQuantityInputValue(display);
              handleFieldChange('quantity', numeric);
            }}
            className={`h-11 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.04] text-slate-900 dark:text-white font-extrabold text-center shadow-sm ${pinkFocusClass}`}
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-2">
            <Coins className="h-4 w-4 text-emerald-500" />
            {t('lines.unitPrice')}
          </label>
          <LineFormUnitPriceInput
            disabled={!isLineStockSelected}
            value={unitPriceInput.unitPriceInputValue}
            inputClassName={`h-11 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.04] text-slate-900 dark:text-white font-mono font-extrabold text-center shadow-sm ${pinkFocusClass}`}
            currencyLabel={unitPriceInput.unitPriceInputCurrencyLabel}
            selectedCurrencyDovizTipi={unitPriceInput.unitPriceInputCurrencyDovizTipi}
            currencyDialogOpen={unitPriceInput.currencyDialogOpen}
            onCurrencyDialogOpenChange={unitPriceInput.setCurrencyDialogOpen}
            onChange={unitPriceInput.handleUnitPriceInputChange}
            onBlur={unitPriceInput.handleUnitPriceInputBlur}
            onCurrencySelect={unitPriceInput.handleInputCurrencySelect}
          />
          {isLineStockSelected && unitDiscountBreakdown.hasDiscount ? (
            <LineDiscountedUnitPriceDisplay
              unitPrice={formData.unitPrice ?? 0}
              discountRate1={formData.discountRate1}
              discountRate2={formData.discountRate2}
              discountRate3={formData.discountRate3}
              currencyCode={currencyCode}
              align="center"
              className="mt-2"
              discountedClassName="text-sm font-bold text-emerald-600 dark:text-emerald-400"
            />
          ) : null}
        </div>

        <div className="space-y-2">
          <label className="text-sm font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-2">
            <Package className="h-4 w-4 text-indigo-500" />
            {t('lines.unit')}
          </label>
          <Input
            value={formData.unit || '-'}
            readOnly
            disabled={!isLineStockSelected}
            className={`h-11 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.04] text-slate-900 dark:text-white font-semibold text-center shadow-sm ${pinkFocusClass}`}
          />
        </div>

        {!hideVatRate ? (
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-2">
              <Percent className="h-4 w-4 text-amber-500" />
              {t('lines.vatRate')}
            </label>
            <div className="relative">
              <Input
                type="number"
                step={percentageStep}
                min="0"
                max="100"
                disabled={!isLineStockSelected || isVatRateInputLocked}
                value={vatRateInputValue}
                onChange={(e) => {
                  if (isVatRateInputLocked) return;
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
                  if (isVatRateInputLocked) return;
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
                className={`h-11 rounded-xl border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.04] text-slate-900 dark:text-white font-bold text-center pr-8 transition-all ${pinkFocusClass}`}
              />
              <div className="absolute right-3 top-3 text-slate-400 dark:text-slate-500 font-bold">%</div>
            </div>
          </div>
        ) : null}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[17fr_6fr] gap-6 pt-4 border-t border-slate-200 dark:border-white/10">
        <div className="space-y-4 min-w-0">
          <h5 className="text-sm font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-2">
            <BadgePercent className="h-4 w-4 text-indigo-500" />
            {t('lines.discounts')}
          </h5>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {discountInputs.map((item, idx) => (
              <div key={idx} className="space-y-1.5 p-2 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/70 dark:bg-white/[0.04]">
                <div className="flex items-center justify-between gap-2">
                  <label className="text-xs font-medium text-slate-500 dark:text-slate-400 ml-1">
                    {item.label}
                  </label>
                  <span className="text-xs font-semibold text-primary">
                    {getDiscountAmount(item.field) > 0 ? '-' : ''}
                    {formatCurrency(getDiscountAmount(item.field), currencyCode)}
                  </span>
                </div>
                <Input
                  type="number"
                  step={percentageStep}
                  min="0"
                  max="100"
                  disabled={!isLineStockSelected}
                  value={item.val}
                  onChange={(e) => {
                    const inputValue = e.target.value;
                    item.setVal(inputValue);
                    if (inputValue === '' || inputValue === '.') {
                      handleFieldChange(item.field, 0);
                    } else {
                      const numValue = parseFloat(inputValue);
                      if (!isNaN(numValue)) {
                        const normalizedValue = normalizeDiscountInput(item.field, numValue);
                        item.setVal(String(normalizedValue));
                        handleFieldChange(item.field, normalizedValue);
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
                        const normalizedValue = normalizeDiscountInput(item.field, numValue);
                        item.setVal(String(normalizedValue));
                        handleFieldChange(item.field, normalizedValue);
                      }
                    }
                  }}
                  placeholder="0"
                  className={`h-11 rounded-xl border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.04] text-slate-900 dark:text-white transition-all text-center ${pinkFocusClass}`}
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
                <h4 className="text-sm font-bold text-red-800 dark:text-red-300">{t('lines.approvalNeeded')}</h4>
                <p className="text-xs text-red-600 dark:text-red-400 mt-1">{t('lines.discountLimitExceeded')}</p>
              </div>
            </div>
          )}

          <div className="space-y-3">
            <h5 className="text-sm font-semibold text-slate-500 dark:text-slate-400">
              {t('lines.descriptionFieldsTitle')}
            </h5>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 ml-1">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
                    {description1Label}
                  </label>
                  <ErpFieldHint label={`${t('lines.descriptionTooltipPrefix', { defaultValue: "Satır bazlı üretim açıklamasıdır. ERP'ye aktarıldığında Netsis eşleşmesi:" })} ${description1Label} -> ${t('lines.erpTargetExtraField1', { defaultValue: 'Ek Alan 1' })}.`} />
                </div>
                <Input
                  value={formData.description1 ?? ''}
                  onChange={(e) => handleFieldChange('description1', e.target.value || null)}
                  maxLength={200}
                  placeholder={t('lines.lineItemDescriptionPlaceholder', { defaultValue: 'Satır bazlı kalem açıklaması' })}
                  className={`h-11 rounded-xl border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.04] text-slate-900 dark:text-white ${pinkFocusClass}`}
                />
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 ml-1">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
                    {description2Label}
                  </label>
                  <ErpFieldHint label={`${t('lines.descriptionTooltipPrefix', { defaultValue: "Satır bazlı üretim açıklamasıdır. ERP'ye aktarıldığında Netsis eşleşmesi:" })} ${description2Label} -> ${t('lines.erpTargetExtraField2', { defaultValue: 'Ek Alan 2' })}.`} />
                </div>
                <Input
                  value={formData.description2 ?? ''}
                  onChange={(e) => handleFieldChange('description2', e.target.value || null)}
                  maxLength={200}
                  placeholder={t('lines.lineItemDescriptionPlaceholder', { defaultValue: 'Satır bazlı kalem açıklaması' })}
                  className={`h-11 rounded-xl border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.04] text-slate-900 dark:text-white ${pinkFocusClass}`}
                />
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 ml-1">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
                    {description3Label}
                  </label>
                  <ErpFieldHint label={`${t('lines.descriptionTooltipPrefix', { defaultValue: "Satır bazlı üretim açıklamasıdır. ERP'ye aktarıldığında Netsis eşleşmesi:" })} ${description3Label} -> ${t('lines.erpTargetLineExtraDesc7', { defaultValue: 'Satır Ek Açıklama 7' })}.`} />
                </div>
                <Input
                  value={formData.description3 ?? ''}
                  onChange={(e) => handleFieldChange('description3', e.target.value || null)}
                  maxLength={200}
                  placeholder={t('lines.lineItemDescriptionPlaceholder', { defaultValue: 'Satır bazlı kalem açıklaması' })}
                  className={`h-11 rounded-xl border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/[0.04] text-slate-900 dark:text-white ${pinkFocusClass}`}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 ml-1">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
                    {t('lines.windoProfileLabel')} <span className="text-primary">*</span>
                  </label>
                  <ErpFieldHint label={t('lines.profileErpTooltip')} />
                </div>
                <VoiceSearchCombobox
                  options={profilComboboxOptions}
                  value={formData.profilDefinitionId ? String(formData.profilDefinitionId) : null}
                  onSelect={(value) => handleFieldChange('profilDefinitionId', value ? Number(value) : null)}
                  onDebouncedSearchChange={setProfilSearchTerm}
                  onFetchNextPage={profilDropdown.fetchNextPage}
                  hasNextPage={profilDropdown.hasNextPage}
                  isLoading={profilDropdown.isLoading}
                  isFetchingNextPage={profilDropdown.isFetchingNextPage}
                  placeholder={profilDropdown.isLoading ? t('loading') : t('lines.selectWindoProfile')}
                  searchPlaceholder={t('lines.searchWindoProfile')}
                  className={`h-11 rounded-xl border-slate-200 bg-slate-50 text-slate-900 dark:border-white/10 dark:bg-white/[0.04] dark:text-white ${pinkFocusClass}`}
                  disabled={profilDropdown.isLoading && profilComboboxOptions.length === 0}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 px-0 text-xs text-primary hover:text-primary/80"
                  onClick={() => setProfilCreateOpen(true)}
                >
                  <CirclePlus className="mr-1 h-3.5 w-3.5" />
                  {t('lines.addNewProfile', { defaultValue: 'Yeni profil ekle' })}
                </Button>
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 ml-1">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
                    {t('lines.windoRebarLabel')}
                  </label>
                  <ErpFieldHint label={t('lines.rebarErpTooltip')} />
                </div>
                <VoiceSearchCombobox
                  options={demirComboboxOptions}
                  value={formData.demirDefinitionId ? String(formData.demirDefinitionId) : null}
                  onSelect={(value) => handleFieldChange('demirDefinitionId', value ? Number(value) : null)}
                  onDebouncedSearchChange={setDemirSearchTerm}
                  onFetchNextPage={demirDropdown.fetchNextPage}
                  hasNextPage={demirDropdown.hasNextPage}
                  isLoading={demirDropdown.isLoading}
                  isFetchingNextPage={demirDropdown.isFetchingNextPage}
                  placeholder={demirDropdown.isLoading ? t('loading') : t('lines.selectWindoRebar')}
                  searchPlaceholder={t('lines.searchWindoRebar')}
                  className={`h-11 rounded-xl border-slate-200 bg-slate-50 text-slate-900 dark:border-white/10 dark:bg-white/[0.04] dark:text-white ${pinkFocusClass}`}
                  disabled={demirDropdown.isLoading && demirComboboxOptions.length === 0}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 px-0 text-xs text-primary hover:text-primary/80"
                  onClick={() => setDemirCreateOpen(true)}
                >
                  <CirclePlus className="mr-1 h-3.5 w-3.5" />
                  {t('lines.addNewRebar', { defaultValue: 'Yeni demir ekle' })}
                </Button>
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 ml-1">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
                    {t('lines.windoScrewLabel')}
                  </label>
                  <ErpFieldHint label={t('lines.screwErpTooltip')} />
                </div>
                <VoiceSearchCombobox
                  options={vidaComboboxOptions}
                  value={formData.vidaDefinitionId ? String(formData.vidaDefinitionId) : null}
                  onSelect={(value) => handleFieldChange('vidaDefinitionId', value ? Number(value) : null)}
                  onDebouncedSearchChange={setVidaSearchTerm}
                  onFetchNextPage={vidaDropdown.fetchNextPage}
                  hasNextPage={vidaDropdown.hasNextPage}
                  isLoading={vidaDropdown.isLoading}
                  isFetchingNextPage={vidaDropdown.isFetchingNextPage}
                  placeholder={vidaDropdown.isLoading ? t('loading') : t('lines.selectWindoScrew')}
                  searchPlaceholder={t('lines.searchWindoScrew')}
                  className={`h-11 rounded-xl border-slate-200 bg-slate-50 text-slate-900 dark:border-white/10 dark:bg-white/[0.04] dark:text-white ${pinkFocusClass}`}
                  disabled={vidaDropdown.isLoading && vidaComboboxOptions.length === 0}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 px-0 text-xs text-primary hover:text-primary/80"
                  onClick={() => setVidaCreateOpen(true)}
                >
                  <CirclePlus className="mr-1 h-3.5 w-3.5" />
                  {t('lines.addNewScrew', { defaultValue: 'Yeni vida ekle' })}
                </Button>
              </div>
              <div className="space-y-1.5 sm:col-span-2 lg:col-span-1 lg:col-start-auto">
                <div className="flex items-center gap-1.5 ml-1">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-200">
                    {t('lines.windoPrintLabel', { defaultValue: 'Baskı' })}
                  </label>
                  <ErpFieldHint label={t('lines.printErpTooltip')} />
                </div>
                <VoiceSearchCombobox
                  options={baskiComboboxOptions}
                  value={formData.baskiDefinitionId ? String(formData.baskiDefinitionId) : null}
                  onSelect={(value) => handleFieldChange('baskiDefinitionId', value ? Number(value) : null)}
                  onDebouncedSearchChange={setBaskiSearchTerm}
                  onFetchNextPage={baskiDropdown.fetchNextPage}
                  hasNextPage={baskiDropdown.hasNextPage}
                  isLoading={baskiDropdown.isLoading}
                  isFetchingNextPage={baskiDropdown.isFetchingNextPage}
                  placeholder={baskiDropdown.isLoading ? t('loading') : t('lines.selectPrint', { defaultValue: 'Baskı seçin' })}
                  searchPlaceholder={t('lines.searchWindoPrint', { defaultValue: 'Baskı ara...' })}
                  className={`h-11 rounded-xl border-slate-200 bg-slate-50 text-slate-900 dark:border-white/10 dark:bg-white/[0.04] dark:text-white ${pinkFocusClass}`}
                  disabled={baskiDropdown.isLoading && baskiComboboxOptions.length === 0}
                  disableToggleOff
                />
                <Input
                  value={formData.baskiAciklama ?? ''}
                  onChange={(event) => handleFieldChange('baskiAciklama', event.target.value.slice(0, 50) || null)}
                  maxLength={50}
                  placeholder={t('lines.windoPrintDescriptionPlaceholder', { defaultValue: 'Baskı açıklaması (max 50 karakter)' })}
                  className={`h-11 rounded-xl border-slate-200 bg-slate-50 text-slate-900 dark:border-white/10 dark:bg-white/[0.04] dark:text-white ${pinkFocusClass}`}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 px-0 text-xs text-primary hover:text-primary/80"
                  onClick={() => setBaskiCreateOpen(true)}
                >
                  <CirclePlus className="mr-1 h-3.5 w-3.5" />
                  {t('lines.addNewPrint', { defaultValue: 'Yeni baskı ekle' })}
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-4 min-w-0">
          {allowImageUpload ? (
            <div className="bg-slate-50 dark:bg-white/[0.03] rounded-2xl p-4 border border-slate-200 dark:border-white/5 space-y-3 backdrop-blur-sm">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h5 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                    {t('common.lineImage.title', { ns: 'common' })}
                  </h5>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {t('common.lineImage.hint', { ns: 'common' })}
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
                    {currentImagePreview ? t('common.lineImage.change', { ns: 'common' }) : t('common.lineImage.add', { ns: 'common' })}
                  </span>
                </Button>
              </div>
              {currentImagePreview ? (
                <div className="space-y-3">
                  <img
                    src={formData.pendingImagePreviewUrl || getImageUrl(formData.imagePath) || formData.imagePath || ''}
                    alt={formData.productName || t('common.lineImage.title', { ns: 'common' })}
                    className="h-44 w-full rounded-xl border border-slate-200 dark:border-white/10 object-cover bg-white dark:bg-white/[0.04]"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={handleRemoveImage}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    {t('common.lineImage.remove', { ns: 'common' })}
                  </Button>
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-slate-300 dark:border-white/10 bg-white/70 dark:bg-white/[0.04] px-4 py-8 text-center text-sm text-slate-500 dark:text-slate-400">
                  {t('common.lineImage.empty', { ns: 'common' })}
                </div>
              )}
            </div>
          ) : null}

          <div className="bg-slate-50 dark:bg-white/[0.03] rounded-2xl p-5 border border-slate-200 dark:border-white/5 space-y-3 backdrop-blur-sm">
            <div className="flex justify-between items-center text-sm gap-4">
              <span className="text-slate-500 dark:text-slate-400 font-medium">{t('lines.subtotal')}</span>
              <span className="font-semibold text-slate-700 dark:text-slate-200">{formatCurrency(formData.lineTotal || 0, currencyCode)}</span>
            </div>
            <div className="flex justify-between items-center text-sm gap-4">
              <span className="text-slate-500 dark:text-slate-400 font-medium">{t('lines.totalDiscount')}</span>
              <span className="font-semibold text-primary">
                {hasDiscount ? '-' : ''}{formatCurrency(totalDiscount, currencyCode)}
              </span>
            </div>
            <div className="flex justify-between items-center text-sm gap-4">
              <span className="text-slate-500 dark:text-slate-400 font-medium">{t('lines.vatAmount')}</span>
              <span className="font-semibold text-slate-700 dark:text-slate-200">{formatCurrency(formData.vatAmount || 0, currencyCode)}</span>
            </div>
            <div className="h-px bg-slate-200 dark:bg-white/10 my-2 border-dashed" />
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1">
              <span className="text-base font-bold text-slate-900 dark:text-white">{t('lines.grandTotal')}</span>
              <span className="text-2xl font-black tracking-tight text-amber-600 dark:text-amber-500">
                {formatCurrency(formData.lineGrandTotal, currencyCode)}
              </span>
            </div>
          </div>

          {relatedLines.length > 0 && (
            <div className="bg-slate-50 dark:bg-white/[0.03] rounded-2xl p-4 border border-slate-200 dark:border-white/5 space-y-3 backdrop-blur-sm">
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-indigo-500" />
                <h5 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                  {t('lines.relatedStocks')} ({relatedLines.length})
                </h5>
              </div>
              <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                {relatedLines.map((relatedLine, index) => (
                  <div
                    key={`${relatedLine.productCode || 'related'}-${index}`}
                    className="p-3 rounded-xl border border-slate-200 dark:border-white/10 bg-white/70 dark:bg-white/[0.04] shadow-sm"
                  >
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 mb-2">
                      <div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">
                          {t('lines.productCode')}
                        </div>
                        <div className="font-mono text-sm font-semibold text-slate-800 dark:text-slate-100">
                          {relatedLine.productCode || '-'}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">
                          {t('lines.productName')}
                        </div>
                        <div className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                          {relatedLine.productName || '-'}
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-slate-500 dark:text-slate-400">
                          {t('lines.quantity')}:
                        </span>
                        <span className="ml-2 font-semibold text-slate-800 dark:text-slate-200">{relatedLine.quantity}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 dark:text-slate-400">
                          {t('lines.unitPrice')}:
                        </span>
                        <span className="ml-2 font-semibold text-slate-800 dark:text-slate-200">
                          {formatCurrency(relatedLine.unitPrice, currencyCode)}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 dark:text-slate-400">
                          {t('lines.netPrice')}:
                        </span>
                        <span className="ml-2 font-semibold text-emerald-600 dark:text-emerald-400">
                          {formatCurrency(relatedLine.lineTotal || 0, currencyCode)}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 dark:text-slate-400">
                          {t('lines.lineTotal')}:
                        </span>
                        <span className="ml-2 font-semibold text-amber-600 dark:text-amber-400">
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
              variant="outline"
              onClick={onCancel}
              disabled={isSaving}
              className={DOCUMENT_LINE_FORM_CANCEL_BUTTON_CLASS}
            >
              {t('cancel')}
            </Button>
            {(() => {
              const missingFields: string[] = [];
              if (bulkDraftLines.length === 0) {
                if (!formData.productCode || !formData.productName) {
                  missingFields.push(t('lines.stockSelectionRequired', { defaultValue: 'Stok Seçimi' }));
                }
                if (!formData.profilDefinitionId) {
                  missingFields.push(t('lines.windoProfileLabel', { defaultValue: 'Profil' }));
                }
              } else {
                if (bulkDraftLines.some(line => !line.profilDefinitionId)) {
                  missingFields.push(t('lines.windoProfileLabel', { defaultValue: 'Profil' }));
                }
              }

              return (
                <FormSubmitTooltipWrap
                  schema={z.any()}
                  value={{}}
                  isValid={missingFields.length === 0}
                  isPending={isSaving}
                  manualHintLines={missingFields}
                >
                  <Button
                    type="button"
                    onClick={bulkDraftLines.length > 0 ? handleBulkDraftConfirm : handleSave}
                    disabled={(bulkDraftLines.length > 0 ? bulkDraftLines.some(line => !line.profilDefinitionId) : (!formData.productCode || !formData.productName || !formData.profilDefinitionId)) || isSaving}
                    className={DOCUMENT_LINE_FORM_SAVE_BUTTON_CLASS}
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        {t('saving')}
                      </>
                    ) : (
                      <>
                        <Check className="h-4 w-4 mr-2" />
                        {t('save')}{bulkDraftLines.length > 0 ? ` (${bulkDraftLines.length})` : ''}
                      </>
                    )}
                  </Button>
                </FormSubmitTooltipWrap>
              );
            })()}
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
      <WindoQuickCreateDialog
        kind="profil"
        open={profilCreateOpen}
        onOpenChange={setProfilCreateOpen}
        initialProfilDefinitionId={formData.profilDefinitionId}
        profilOptions={profilComboboxOptions}
        onCreated={(item) => void handleWindoDefinitionCreated('profil', item)}
      />
      <WindoQuickCreateDialog
        kind="demir"
        open={demirCreateOpen}
        onOpenChange={setDemirCreateOpen}
        initialProfilDefinitionId={formData.profilDefinitionId}
        profilOptions={profilComboboxOptions}
        onCreated={(item) => void handleWindoDefinitionCreated('demir', item)}
      />
      <WindoQuickCreateDialog
        kind="vida"
        open={vidaCreateOpen}
        onOpenChange={setVidaCreateOpen}
        initialProfilDefinitionId={formData.profilDefinitionId}
        profilOptions={profilComboboxOptions}
        onCreated={(item) => void handleWindoDefinitionCreated('vida', item)}
      />

      <WindoQuickCreateDialog
        kind="baski"
        open={baskiCreateOpen}
        onOpenChange={setBaskiCreateOpen}
        initialProfilDefinitionId={formData.profilDefinitionId}
        profilOptions={profilComboboxOptions}
        onCreated={(item) => void handleWindoDefinitionCreated('baski', item)}
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
        pricingRuleType={PricingRuleType.Quotation}
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

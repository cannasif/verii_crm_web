import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import type { KurDto } from '@/services/erp-types';
import type { CurrencyOption } from '@/services/hooks/useCurrencyOptions';
import {
  convertPriceBetweenDovizTipi,
  getCurrencyLabelForDovizTipi,
  resolveDocumentDovizTipi,
  type DocumentExchangeRate,
} from '@/lib/line-unit-price-currency';
import {
  formatMonetaryTrDraftFromNumber,
  normalizeMonetaryTrOnBlur,
  parseMonetaryTrDraft,
  sanitizeMonetaryTrTyping,
} from '@/lib/monetary-input-tr';
import { getSystemDecimalPlaces } from '@/lib/system-settings';

interface UseLineUnitPriceInputParams {
  documentCurrencyDovizTipi: number;
  documentUnitPrice: number;
  currencyOptions: CurrencyOption[];
  exchangeRates: DocumentExchangeRate[];
  erpRates?: KurDto[];
  disabled?: boolean;
  onDocumentUnitPriceChange: (price: number) => void;
}

interface UseLineUnitPriceInputReturn {
  unitPriceInputValue: string;
  unitPriceInputCurrencyDovizTipi: number;
  unitPriceInputCurrencyLabel: string;
  currencyDialogOpen: boolean;
  setCurrencyDialogOpen: (open: boolean) => void;
  handleUnitPriceInputChange: (raw: string) => void;
  handleUnitPriceInputBlur: () => void;
  handleInputCurrencySelect: (dovizTipi: number) => void;
  syncUnitPriceFromDocument: (documentPrice: number) => void;
  resetInputCurrencyToDocument: () => void;
}

export function useLineUnitPriceInput({
  documentCurrencyDovizTipi,
  documentUnitPrice,
  currencyOptions,
  exchangeRates,
  erpRates = [],
  onDocumentUnitPriceChange,
}: UseLineUnitPriceInputParams): UseLineUnitPriceInputReturn {
  const { t } = useTranslation(['quotation', 'demand', 'order', 'common']);
  const resolvedDocumentCurrency = useMemo(
    () => resolveDocumentDovizTipi(documentCurrencyDovizTipi, currencyOptions, erpRates),
    [documentCurrencyDovizTipi, currencyOptions, erpRates]
  );

  const [inputCurrencyDovizTipi, setInputCurrencyDovizTipi] = useState(resolvedDocumentCurrency);
  const [inputValue, setInputValue] = useState(() =>
    formatMonetaryTrDraftFromNumber(documentUnitPrice ?? 0)
  );
  const [currencyDialogOpen, setCurrencyDialogOpen] = useState(false);

  const inputCurrencyLabel = useMemo(
    () => getCurrencyLabelForDovizTipi(inputCurrencyDovizTipi, currencyOptions),
    [inputCurrencyDovizTipi, currencyOptions]
  );

  const toInputDisplay = useCallback(
    (documentPrice: number, inputCurrency: number): number => {
      const converted = convertPriceBetweenDovizTipi(
        documentPrice,
        resolvedDocumentCurrency,
        inputCurrency,
        exchangeRates,
        erpRates,
        currencyOptions
      );
      return converted ?? documentPrice;
    },
    [resolvedDocumentCurrency, exchangeRates, erpRates, currencyOptions]
  );

  const toDocumentPrice = useCallback(
    (inputPrice: number, inputCurrency: number): number | null => {
      return convertPriceBetweenDovizTipi(
        inputPrice,
        inputCurrency,
        resolvedDocumentCurrency,
        exchangeRates,
        erpRates,
        currencyOptions
      );
    },
    [resolvedDocumentCurrency, exchangeRates, erpRates, currencyOptions]
  );

  const syncUnitPriceFromDocument = useCallback(
    (documentPrice: number): void => {
      const display = toInputDisplay(documentPrice, inputCurrencyDovizTipi);
      setInputValue(formatMonetaryTrDraftFromNumber(display));
    },
    [inputCurrencyDovizTipi, toInputDisplay]
  );

  const resetInputCurrencyToDocument = useCallback((): void => {
    setInputCurrencyDovizTipi(resolvedDocumentCurrency);
  }, [resolvedDocumentCurrency]);

  useEffect(() => {
    setInputCurrencyDovizTipi(resolvedDocumentCurrency);
    setInputValue(
      formatMonetaryTrDraftFromNumber(toInputDisplay(documentUnitPrice ?? 0, resolvedDocumentCurrency))
    );
  }, [resolvedDocumentCurrency, documentCurrencyDovizTipi, documentUnitPrice, toInputDisplay]);

  const zeroRateMessage = t('exchangeRates.zeroRateError', {
    ns: 'quotation',
    defaultValue: 'Lütfen devam edebilmek için kur değeri girin.',
  });

  const handleUnitPriceInputChange = useCallback(
    (raw: string): void => {
      const maxFrac = getSystemDecimalPlaces();
      const next = sanitizeMonetaryTrTyping(raw, maxFrac);
      setInputValue(next);

      const parsed = parseMonetaryTrDraft(next);
      if (parsed === null) {
        onDocumentUnitPriceChange(0);
        return;
      }

      const documentPrice = toDocumentPrice(parsed, inputCurrencyDovizTipi);
      if (documentPrice == null) {
        toast.error(t('update.error', { ns: 'quotation', defaultValue: 'Hata' }), {
          description: zeroRateMessage,
        });
        return;
      }

      onDocumentUnitPriceChange(documentPrice);
    },
    [inputCurrencyDovizTipi, onDocumentUnitPriceChange, toDocumentPrice, zeroRateMessage, t]
  );

  const handleUnitPriceInputBlur = useCallback((): void => {
    const { display, numeric } = normalizeMonetaryTrOnBlur(inputValue);
    setInputValue(display);

    const documentPrice = toDocumentPrice(numeric, inputCurrencyDovizTipi);
    if (documentPrice == null) {
      syncUnitPriceFromDocument(documentUnitPrice ?? 0);
      return;
    }

    onDocumentUnitPriceChange(documentPrice);
  }, [
    documentUnitPrice,
    inputCurrencyDovizTipi,
    inputValue,
    onDocumentUnitPriceChange,
    syncUnitPriceFromDocument,
    toDocumentPrice,
  ]);

  const handleInputCurrencySelect = useCallback(
    (dovizTipi: number): void => {
      if (dovizTipi === inputCurrencyDovizTipi) {
        setCurrencyDialogOpen(false);
        return;
      }

      const display =
        dovizTipi === resolvedDocumentCurrency
          ? (documentUnitPrice ?? 0)
          : convertPriceBetweenDovizTipi(
              documentUnitPrice ?? 0,
              resolvedDocumentCurrency,
              dovizTipi,
              exchangeRates,
              erpRates,
              currencyOptions
            );

      if (display == null) {
        toast.error(t('update.error', { ns: 'quotation', defaultValue: 'Hata' }), {
          description: zeroRateMessage,
        });
        setCurrencyDialogOpen(false);
        return;
      }

      setInputCurrencyDovizTipi(dovizTipi);
      setInputValue(formatMonetaryTrDraftFromNumber(display));
      setCurrencyDialogOpen(false);
    },
    [
      documentUnitPrice,
      erpRates,
      exchangeRates,
      currencyOptions,
      inputCurrencyDovizTipi,
      resolvedDocumentCurrency,
      zeroRateMessage,
      t,
    ]
  );

  return useMemo(
    () => ({
      unitPriceInputValue: inputValue,
      unitPriceInputCurrencyDovizTipi: inputCurrencyDovizTipi,
      unitPriceInputCurrencyLabel: inputCurrencyLabel,
      currencyDialogOpen,
      setCurrencyDialogOpen,
      handleUnitPriceInputChange,
      handleUnitPriceInputBlur,
      handleInputCurrencySelect,
      syncUnitPriceFromDocument,
      resetInputCurrencyToDocument,
    }),
    [
      inputValue,
      inputCurrencyDovizTipi,
      inputCurrencyLabel,
      currencyDialogOpen,
      handleUnitPriceInputChange,
      handleUnitPriceInputBlur,
      handleInputCurrencySelect,
      syncUnitPriceFromDocument,
      resetInputCurrencyToDocument,
    ]
  );
}

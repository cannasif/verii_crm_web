import { type Dispatch, type ReactElement, type SetStateAction, useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { useFormContext } from 'react-hook-form';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LineTableQuickEditNumberInput } from '@/components/shared/LineTableQuickEditNumberInput';
import { LineTableQuickEditMonetaryInput } from '@/components/shared/LineTableQuickEditMonetaryInput';
import { parseLineTableQuickEditNumericValue } from '@/lib/line-table-quick-edit-parse';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { QuotationLineForm } from './QuotationLineForm';
import { ProductSelectDialog, type ProductSelectionResult } from '@/components/shared/ProductSelectDialog';
import { DocumentLineFormDialog } from '@/components/shared/DocumentLineFormDialog';
import { LineDiscountedUnitPriceDisplay } from '@/components/shared/LineDiscountedUnitPriceDisplay';
import { getLineUnitDiscountBreakdown, getUnitDiscountAmountForTierIndex, calculateLineTotalsAmounts } from '@/lib/line-discount-display';
import { useSalesTypeOptionsInfinite } from '@/components/shared/dropdown/useDropdownEntityInfinite';
import { DescriptionCell } from '@/components/shared';
import { LineTableImageThumbnail } from '@/components/shared/LineTableImageThumbnail';
import { useCurrencyOptions } from '@/services/hooks/useCurrencyOptions';
import { useExchangeRate } from '@/services/hooks/useExchangeRate';
import { useProductSelection } from '../hooks/useProductSelection';
import { useQuotationCalculations } from '../hooks/useQuotationCalculations';
import { useCreateQuotationLines } from '../hooks/useCreateQuotationLines';
import { useUpdateQuotationLines } from '../hooks/useUpdateQuotationLines';
import { useDeleteQuotationLine } from '../hooks/useDeleteQuotationLine';
import { quotationApi } from '../api/quotation-api';
import { queryKeys } from '../utils/query-keys';
import { pdfReportTemplateApi } from '@/features/pdf-report/api/pdf-report-template-api';
import { formatCurrency } from '../utils/format-currency';
import {
  buildDocumentLineTableExportData,
  buildDocumentLineTableExportLabels,
  exportDocumentLineTablePowerPoint,
} from '@/lib/document-line-table-export';
import {
  Trash2,
  Edit,
  Plus,
  ShoppingCart,
  Box,
  AlertTriangle,
  Layers,
  Loader2,
  Menu,
  FileSpreadsheet,
  FileText,
  Presentation,
  X,
  Check,
} from 'lucide-react';
import type { QuotationLineFormState, QuotationExchangeRateFormState, PricingRuleLineGetDto, UserDiscountLimitDto, CreateQuotationLineDto, QuotationLineGetDto } from '../types/quotation-types';
import { cn } from '@/lib/utils';
import { getImageUrl } from '@/lib/image-url';
import {
  buildDocumentLinePrerequisiteHintLines,
  canDocumentLinePrerequisites,
} from '@/lib/document-line-prerequisites';
import { linesToDocumentStockMarkers, linesToDocumentStockMarkersExceptLine } from '@/lib/line-form-stock-markers';
import {
  formatLineTableQuickEditDraft,
  getHtmlNumberInputStepForDecimals,
} from '@/lib/system-settings';
import { useSystemSettingsStore } from '@/stores/system-settings-store';
import { enforceExportVatOnLine, getDefaultDocumentVatRate, resolveDocumentVatRate } from '@/lib/document-vat';
import { mergeLinesAfterMainLineUpdate } from '@/lib/merge-lines-after-main-update';
import {
  applyQuotationLineQuickFieldPatch,
  type QuotationQuickEditField,
} from '../utils/apply-quotation-line-quick-field-patch';
import { mergeCreatedLineProductNamesByBackendId } from '@/lib/merge-created-line-product-name';
import {
  applyDocumentLinesUpdate,
  mergeRefetchedDocumentLines,
  removeDocumentLineFromState,
  resolveDocumentLineBackendId,
  syncDocumentLinesFromServer,
} from '@/lib/document-line-list-update';
import { createClientId } from '@/lib/create-client-id';
import { exportObjectsToXlsx } from '@/lib/xlsx-export';
import { useWindoDefinitionOptions } from '@/features/windo-profil-demir-vida-management/hooks/useWindoDefinitionOptions';
import {
  DOCUMENT_LINE_TABLE_SCROLL_CONTAINER_CLASS,
  DOCUMENT_LINE_TABLE_STICKY_HEAD_CLASS,
  DOCUMENT_LINE_TABLE_CLASS,
  getDocumentLineTableBodyCellClass,
  getDocumentLineTableStickyStockCellClass,
} from '@/lib/document-line-table-layout';
import { hasRequiredDocumentExchangeRate } from '@/lib/line-unit-price-currency';

function toCreateDto(line: QuotationLineFormState, quotationId: number): CreateQuotationLineDto {
  const {
    id,
    isEditing,
    relatedLines,
    pendingImageFile,
    pendingImagePreviewUrl,
    vidaDefinitionName,
    baskiDefinitionName,
    ...rest
  } = line;
  void id;
  void isEditing;
  void relatedLines;
  void pendingImageFile;
  void pendingImagePreviewUrl;
  void vidaDefinitionName;
  void baskiDefinitionName;
  return {
    ...rest,
    quotationId,
    unit: line.unit ?? null,
    productId: line.productId ?? 0,
    productCode: line.productCode ?? '',
    productName: line.productName ?? '',
    approvalStatus: line.approvalStatus ?? 0,
    erpProjectCode: line.projectCode ?? null,
    imagePath: line.imagePath ?? null,
  };
}

function getValidRelatedProductGroup(
  lines: QuotationLineFormState[],
  line?: QuotationLineFormState | null
): QuotationLineFormState[] {
  const relatedProductKey = line?.relatedProductKey?.trim();
  if (!relatedProductKey) return [];

  const sameGroupLines = lines.filter((l) => l.relatedProductKey?.trim() === relatedProductKey);
  const hasMainLine = sameGroupLines.some((l) => l.isMainRelatedProduct === true);
  const hasRelatedLine = sameGroupLines.some((l) => l.isMainRelatedProduct !== true);

  return sameGroupLines.length > 1 && hasMainLine && hasRelatedLine ? sameGroupLines : [];
}

function dtoToFormState(dto: QuotationLineGetDto, _index: number): QuotationLineFormState {
  const amounts = calculateLineTotalsAmounts(
    dto.unitPrice,
    dto.quantity,
    dto.discountRate1,
    dto.discountRate2,
    dto.discountRate3,
    dto.vatRate,
  );

  return {
    id: createClientId(),
    backendLineId: dto.id && dto.id > 0 ? dto.id : null,
    isEditing: false,
    productId: dto.productId ?? null,
    productCode: dto.productCode ?? '',
    productName: dto.productName,
    unit: dto.unit ?? null,
    groupCode: dto.groupCode ?? null,
    quantity: dto.quantity,
    unitPrice: dto.unitPrice,
    discountRate1: dto.discountRate1,
    discountRate2: dto.discountRate2,
    discountRate3: dto.discountRate3,
    vatRate: dto.vatRate,
    description: dto.description ?? null,
    description1: dto.description1 ?? null,
    description2: dto.description2 ?? null,
    description3: dto.description3 ?? null,
    profilDefinitionId: dto.profilDefinitionId ?? null,
    demirDefinitionId: dto.demirDefinitionId ?? null,
    vidaDefinitionId: dto.vidaDefinitionId ?? null,
    vidaDefinitionName: dto.vidaDefinitionName ?? null,
    baskiDefinitionId: dto.baskiDefinitionId ?? null,
    baskiDefinitionName: dto.baskiDefinitionName ?? null,
    baskiAciklama: dto.baskiAciklama ?? null,
    pricingRuleHeaderId: dto.pricingRuleHeaderId ?? null,
    projectCode: dto.erpProjectCode ?? dto.projectCode ?? null,
    imagePath: dto.imagePath ?? null,
    relatedStockId: dto.productId ?? dto.relatedStockId ?? null,
    relatedProductKey: dto.relatedProductKey ?? null,
    isMainRelatedProduct: dto.isMainRelatedProduct ?? false,
    approvalStatus: dto.approvalStatus ?? 0,
    ...amounts,
  };
}

function toUpdateDto(line: QuotationLineFormState, quotationId: number): QuotationLineGetDto {
  void line.pendingImageFile;
  void line.pendingImagePreviewUrl;
  const lineId = resolveDocumentLineBackendId(line) ?? 0;
  return {
    id: lineId,
    quotationId,
    productId: line.productId ?? null,
    productCode: line.productCode ?? '',
    productName: line.productName ?? '',
    unit: line.unit ?? null,
    groupCode: line.groupCode ?? null,
    quantity: line.quantity,
    unitPrice: line.unitPrice,
    discountRate1: line.discountRate1,
    discountAmount1: line.discountAmount1,
    discountRate2: line.discountRate2,
    discountAmount2: line.discountAmount2,
    discountRate3: line.discountRate3,
    discountAmount3: line.discountAmount3,
    vatRate: line.vatRate,
    vatAmount: line.vatAmount,
    lineTotal: line.lineTotal,
    lineGrandTotal: line.lineGrandTotal,
    description: line.description ?? null,
    description1: line.description1 ?? null,
    description2: line.description2 ?? null,
    description3: line.description3 ?? null,
    profilDefinitionId: line.profilDefinitionId ?? null,
    demirDefinitionId: line.demirDefinitionId ?? null,
    vidaDefinitionId: line.vidaDefinitionId ?? null,
    vidaDefinitionName: line.vidaDefinitionName ?? null,
    baskiDefinitionId: line.baskiDefinitionId ?? null,
    baskiDefinitionName: line.baskiDefinitionName ?? null,
    baskiAciklama: line.baskiAciklama ?? null,
    pricingRuleHeaderId: line.pricingRuleHeaderId ?? null,
    projectCode: line.projectCode ?? null,
    erpProjectCode: line.projectCode ?? null,
    imagePath: line.imagePath ?? null,
    relatedStockId: line.relatedStockId ?? null,
    relatedProductKey: line.relatedProductKey ?? null,
    isMainRelatedProduct: line.isMainRelatedProduct ?? false,
    approvalStatus: line.approvalStatus ?? 0,
    createdAt: '',
  };
}

async function finalizeCreatedLineImages(
  draftLines: QuotationLineFormState[],
  createdLines: QuotationLineGetDto[],
  quotationId: number
): Promise<QuotationLineGetDto[]> {
  const nextCreated = [...createdLines];

  for (let index = 0; index < draftLines.length; index += 1) {
    const draftLine = draftLines[index];
    const pendingImageFile = draftLine.pendingImageFile;
    const createdLine = nextCreated[index];

    if (!pendingImageFile || !createdLine?.id) continue;

    const uploaded = await pdfReportTemplateApi.uploadAsset(pendingImageFile, {
      assetScope: 'quotation-line',
      quotationId,
      quotationLineId: createdLine.id,
      productCode: draftLine.productCode || createdLine.productCode || undefined,
    });

    const [updatedLine] = await quotationApi.updateQuotationLines([
      {
        ...createdLine,
        imagePath: uploaded.relativeUrl,
      },
    ]);

    nextCreated[index] = updatedLine ?? {
      ...createdLine,
      imagePath: uploaded.relativeUrl,
    };
  }

  return nextCreated;
}

interface QuotationLineTableProps {
  lines: QuotationLineFormState[];
  setLines: Dispatch<SetStateAction<QuotationLineFormState[]>>;
  currency: number;
  exchangeRates?: QuotationExchangeRateFormState[];
  pricingRules?: PricingRuleLineGetDto[];
  userDiscountLimits?: UserDiscountLimitDto[];
  customerId?: number | null;
  erpCustomerCode?: string | null;
  representativeId?: number | null;
  quotationId?: number | null;
  enabled?: boolean;
  offerNo?: string | null;
  customerName?: string | null;
  buildExportPdfBlob?: (options: { draft: boolean; showDiscount?: boolean; hideVat?: boolean }) => Promise<Blob>;
  exportPdfFileName?: string;
  exportPdfAsDraft?: boolean;
  offerType?: string | null;
}

export function QuotationLineTable({
  lines,
  setLines,
  currency,
  exchangeRates = [],
  pricingRules = [],
  userDiscountLimits = [],
  customerId,
  erpCustomerCode,
  representativeId,
  quotationId,
  enabled = true,
  offerNo: _offerNo,
  customerName: _customerName,
  buildExportPdfBlob,
  exportPdfFileName,
  exportPdfAsDraft = false,
  offerType,
}: QuotationLineTableProps): ReactElement {
  const queryClient = useQueryClient();
  const form = useFormContext();
  const watchedDeliveryMethod = form?.watch ? form.watch('quotation.deliveryMethod') : null;

  const { options: deliveryMethodOptions } = useSalesTypeOptionsInfinite(
    '',
    !!offerType,
    offerType ?? null
  );

  const deliveryMethodName = useMemo(() => {
    if (!watchedDeliveryMethod) return null;
    return deliveryMethodOptions.find((o) => o.value === String(watchedDeliveryMethod))?.label || null;
  }, [watchedDeliveryMethod, deliveryMethodOptions]);

  const linesEditable = enabled;
  const linesRef = useRef(lines);
  linesRef.current = lines;

  const updateLines = useCallback(
    (nextOrUpdater: QuotationLineFormState[] | ((prev: QuotationLineFormState[]) => QuotationLineFormState[])) => {
      applyDocumentLinesUpdate(linesRef, setLines, nextOrUpdater);
    },
    [setLines],
  );

  const { t } = useTranslation(['quotation', 'common']);
  const { profilMap, demirMap, vidaMap, baskiMap } = useWindoDefinitionOptions();
  const scrollRef = useRef<HTMLDivElement>(null);
  const actionMenuRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [productDialogOpen, setProductDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [lineToDelete, setLineToDelete] = useState<string | null>(null);
  const deleteTargetRef = useRef<{ formLineId: string; backendLineId: number | null } | null>(null);
  const [relatedLinesCount, setRelatedLinesCount] = useState(0);
  const [addLineDialogOpen, setAddLineDialogOpen] = useState(false);
  const [newLine, setNewLine] = useState<QuotationLineFormState | null>(null);
  const [editLineDialogOpen, setEditLineDialogOpen] = useState(false);
  const [lineToEdit, setLineToEdit] = useState<QuotationLineFormState | null>(null);
  const [actionMenuOpen, setActionMenuOpen] = useState(false);
  const [quickEdit, setQuickEdit] = useState<{
    lineId: string;
    field: QuotationQuickEditField;
    draft: string;
  } | null>(null);
  const { currencyOptions } = useCurrencyOptions();
  const { data: erpRates = [] } = useExchangeRate();
  const { calculateLineTotals } = useQuotationCalculations();
  const createMutation = useCreateQuotationLines(quotationId ?? 0);
  const updateMutation = useUpdateQuotationLines(quotationId ?? 0);
  const deleteMutation = useDeleteQuotationLine(quotationId ?? 0);
  const systemDecimalPlaces = useSystemSettingsStore((s) => s.settings.decimalPlaces);

  useEffect(() => {
    if (!actionMenuOpen) {
      return;
    }

    const handlePointerDown = (event: PointerEvent): void => {
      const target = event.target as Node | null;
      if (target && actionMenuRef.current?.contains(target)) {
        return;
      }
      setActionMenuOpen(false);
    };

    document.addEventListener('pointerdown', handlePointerDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
    };
  }, [actionMenuOpen]);
  const numberInputStep = useMemo(
    () => getHtmlNumberInputStepForDecimals(systemDecimalPlaces),
    [systemDecimalPlaces]
  );
  const isExistingQuotation = quotationId != null && quotationId > 0;
  const isDeleting = deleteMutation.isPending;
  const { handleProductSelect: handleProductSelectHook, handleProductSelectWithRelatedStocks } = useProductSelection({
    currency,
    exchangeRates,
    pricingRules,
    offerType,
    deliveryMethodName,
  });
  const previousOfferTypeRef = useRef(offerType);
  const previousDeliveryMethodNameRef = useRef(deliveryMethodName);

  useEffect(() => {
    if (previousOfferTypeRef.current === offerType && previousDeliveryMethodNameRef.current === deliveryMethodName) return;
    previousOfferTypeRef.current = offerType;
    previousDeliveryMethodNameRef.current = deliveryMethodName;
    const defaultVatRate = getDefaultDocumentVatRate(offerType, deliveryMethodName);
    updateLines((prev) => {
      let changed = false;
      const next = prev.map((line) => {
        if ((line.vatRate ?? null) === defaultVatRate && (line.vatAmount ?? 0) === 0) return line;
        changed = true;
        return calculateLineTotals({ ...line, vatRate: defaultVatRate, vatAmount: 0 });
      });
      return changed ? next : prev;
    });
  }, [calculateLineTotals, offerType, deliveryMethodName, updateLines]);

  const existingDocumentLineMarkers = useMemo(() => linesToDocumentStockMarkers(lines), [lines]);
  const existingDocumentLineMarkersForEdit = useMemo(
    () => (lineToEdit ? linesToDocumentStockMarkersExceptLine(lines, lineToEdit.id) : []),
    [lines, lineToEdit]
  );

  const styles = {
    glassCard: "relative overflow-hidden  border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 shadow-sm",
    tableHeadRow: "bg-zinc-50/80 dark:bg-zinc-900/50 border-b border-zinc-200 dark:border-zinc-700",
    tableHead: "h-11 px-4 text-xs font-bold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider border-r border-zinc-200 dark:border-zinc-700 last:border-r-0",
    tableHeadRight: "h-11 px-4 text-xs font-bold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider text-right border-r border-zinc-200 dark:border-zinc-700 last:border-r-0",
    tableCell: "p-4 text-sm font-medium text-zinc-700 dark:text-zinc-200 border-b border-r border-zinc-200 dark:border-zinc-700 last:border-r-0",
    tableCellRight: "p-4 text-sm font-medium text-zinc-700 dark:text-zinc-200 border-b border-r border-zinc-200 dark:border-zinc-700 text-right font-mono tabular-nums last:border-r-0",
    tableRow: 'group border-b transition-colors',
    actionButton: "h-8 w-8 p-0 rounded-lg hover:bg-white dark:hover:bg-zinc-700 hover:shadow-sm hover:scale-105 transition-all duration-200",
  };

  const currencyCode = useMemo(() => {
    const found = currencyOptions.find((opt) => opt.dovizTipi === currency);
    return found?.code || 'TRY';
  }, [currency, currencyOptions]);

  const lineTableExportData = useMemo(
    () =>
      buildDocumentLineTableExportData({
        lines,
        labels: buildDocumentLineTableExportLabels((key, options) => t(key, options)),
        currencyCode,
        formatCurrency,
        windoMaps: { profilMap, demirMap, vidaMap, baskiMap },
      }),
    [lines, t, currencyCode, profilMap, demirMap, vidaMap, baskiMap],
  );

  const linePrerequisitesInput = useMemo(
    () => ({
      customerId,
      erpCustomerCode,
      representativeId,
      currency,
    }),
    [customerId, erpCustomerCode, representativeId, currency],
  );

  const linePrerequisitesMet = canDocumentLinePrerequisites(linePrerequisitesInput);
  const documentExchangeRateMet = hasRequiredDocumentExchangeRate(currency, currencyOptions, exchangeRates, erpRates, {
    allowErpFallback: false,
  });

  const ensureDocumentExchangeRate = (): boolean => {
    if (documentExchangeRateMet) return true;

    toast.error(t('error'), {
      description: t('exchangeRates.zeroRateError', {
        defaultValue: 'Lütfen devam edebilmek için kur değeri girin.',
      }),
    });
    return false;
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>): void => {
    if (!scrollRef.current) return;
    const target = e.target as HTMLElement | null;
    if (target?.closest('button, input, textarea, select, a, [role="button"]')) return;

    setIsDragging(true);
    setStartX(e.clientX - scrollRef.current.getBoundingClientRect().left);
    setScrollLeft(scrollRef.current.scrollLeft);
  };

  const handleMouseUpOrLeave = (): void => {
    setIsDragging(false);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>): void => {
    if (!isDragging || !scrollRef.current) return;
    e.preventDefault();
    const x = e.clientX - scrollRef.current.getBoundingClientRect().left;
    const walkX = (x - startX) * 2.2;
    scrollRef.current.scrollLeft = scrollLeft - walkX;
  };

  const handleExportExcel = async (): Promise<void> => {
    await exportObjectsToXlsx('teklif-kalemleri.xlsx', 'Teklif Kalemleri', lineTableExportData.excelRows);
  };

  const handleExportPDF = async () => {
    if (!buildExportPdfBlob) {
      toast.error(t('error'), {
        description: t('pdfExportTemplate.notAvailable', {
          defaultValue: 'PDF çıktısı bu ekranda kullanılamıyor.',
        }),
      });
      return;
    }

    if (lines.length === 0) {
      toast.error(t('error'), {
        description: t('lines.required'),
      });
      return;
    }

    try {
      const blob = await buildExportPdfBlob({ draft: exportPdfAsDraft });
      const fileName = exportPdfFileName ?? 'teklif-kalemleri.pdf';
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = fileName;
      anchor.rel = 'noopener';
      anchor.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error(t('error'), {
        description: t('exportPreview.error', {
          defaultValue: 'PDF oluşturulurken bir hata oluştu.',
        }),
      });
    }
  };

  const handleExportPowerPoint = async () => {
    await exportDocumentLineTablePowerPoint({
      fileName: 'teklif-kalemleri.pptx',
      title: t('lines.title'),
      exportData: lineTableExportData,
    });
  };

  const handleAddLine = (): void => {
    setQuickEdit(null);
    if (!linesEditable) return;
    if (!linePrerequisitesMet) {
      toast.error(t('error'), {
        description: t('lines.requiredFieldsMissing'),
      });
      return;
    }
    if (!ensureDocumentExchangeRate()) return;

    const line: QuotationLineFormState = {
      id: createClientId(),
      productId: null,
      productCode: '',
      productName: '',
      quantity: 1,
      unitPrice: 0,
      discountRate1: 0,
      discountAmount1: 0,
      discountRate2: 0,
      discountAmount2: 0,
      discountRate3: 0,
      discountAmount3: 0,
      vatRate: resolveDocumentVatRate(undefined, offerType, deliveryMethodName, 20),
      vatAmount: 0,
      lineTotal: 0,
      lineGrandTotal: 0,
      description: null,
      description1: null,
      description2: null,
      description3: null,
      isEditing: true,
    };
    setNewLine(line);
    setAddLineDialogOpen(true);
  };

  const canAddLine = linesEditable && linePrerequisitesMet && documentExchangeRateMet;

  const headerSectionTitle = t('sections.header');
  const addLineDisableHints = useMemo(() => {
    if (canAddLine || !linesEditable) return [];
    const hints = buildDocumentLinePrerequisiteHintLines(linePrerequisitesInput, (key) =>
      t(key, { ns: 'common' }),
    );
    if (!documentExchangeRateMet) {
      hints.push(t('disabledActionHints.needExchangeRate', { ns: 'common', defaultValue: 'Kur değeri' }));
    }
    return hints;
  }, [canAddLine, linesEditable, linePrerequisitesInput, documentExchangeRateMet, t]);

  const quickPatchDeps = useMemo(
    () => ({
      currency,
      currencyOptions,
      exchangeRates,
      erpRates,
      pricingRules,
      userDiscountLimits,
      calculateLineTotals,
    }),
    [currency, currencyOptions, exchangeRates, erpRates, pricingRules, userDiscountLimits, calculateLineTotals]
  );

  const lineAllowsQuickEdit = useCallback(
    (line: QuotationLineFormState): boolean => {
      if (!linesEditable || !line.productCode) return false;
      const isRelatedProduct = line.relatedProductKey != null;
      const isMainStock = line.isMainRelatedProduct === true;
      if (isRelatedProduct && !isMainStock) return false;
      return true;
    },
    [linesEditable]
  );

  const beginQuickEdit = useCallback(
    (line: QuotationLineFormState, field: QuotationQuickEditField) => {
      if (!lineAllowsQuickEdit(line) || updateMutation.isPending) return;
      if (quickEdit && quickEdit.lineId !== line.id) return;
      const cur = line[field];
      const draft =
        typeof cur === 'number' && Number.isFinite(cur)
          ? formatLineTableQuickEditDraft(field, cur, { unit: line.unit })
          : '';
      setQuickEdit({ lineId: line.id, field, draft });
    },
    [lineAllowsQuickEdit, quickEdit, updateMutation.isPending]
  );

  const cancelQuickEdit = useCallback(() => {
    setQuickEdit(null);
  }, []);

  const commitQuickEdit = useCallback(async () => {
    if (!quickEdit || !linesEditable) return;
    const originalLine = lines.find((l) => l.id === quickEdit.lineId);
    if (!originalLine || !lineAllowsQuickEdit(originalLine)) {
      setQuickEdit(null);
      return;
    }

    const parsedFloat = parseLineTableQuickEditNumericValue(quickEdit.field, quickEdit.draft);
    if (parsedFloat === null) return;

    let value: number;
    if (quickEdit.field === 'quantity') {
      if (parsedFloat < 0) return;
      value = parsedFloat;
    } else if (quickEdit.field === 'unitPrice') {
      if (parsedFloat < 0) return;
      value = parsedFloat;
    } else {
      value = Math.min(100, Math.max(0, parsedFloat));
    }

    const patched = enforceExportVatOnLine(
      applyQuotationLineQuickFieldPatch(originalLine, quickEdit.field, value, quickPatchDeps),
      offerType,
      deliveryMethodName
    );
    const nextLines = mergeLinesAfterMainLineUpdate(
      lines,
      originalLine,
      patched,
      undefined,
      calculateLineTotals
    );

    const patchedFromNext = nextLines.find((l) => l.id === patched.id);
    if (!patchedFromNext) {
      setQuickEdit(null);
      return;
    }

    if (isExistingQuotation && quotationId) {
      const apiTargets =
        patchedFromNext.relatedProductKey &&
          patchedFromNext.isMainRelatedProduct &&
          originalLine.quantity !== patchedFromNext.quantity
          ? nextLines.filter(
            (l) => l.relatedProductKey === patchedFromNext.relatedProductKey && resolveDocumentLineBackendId(l) != null
          )
          : resolveDocumentLineBackendId(patchedFromNext) != null
            ? [patchedFromNext]
            : [];

      if (apiTargets.length > 0) {
        try {
          const dtos = apiTargets.map((l) => toUpdateDto(l, quotationId));
          await updateMutation.mutateAsync(dtos);
          const fresh = await quotationApi.getQuotationLinesByQuotationId(quotationId);
          const mapped = fresh.map((dto, index) => dtoToFormState(dto, index));
          updateLines(mergeRefetchedDocumentLines(mapped, linesRef.current, resolveDocumentLineBackendId));
        } catch {
          void 0;
        }
        setQuickEdit(null);
        return;
      }
    }

    updateLines(nextLines);
    setQuickEdit(null);
  }, [
    quickEdit,
    linesEditable,
    lines,
    lineAllowsQuickEdit,
    quickPatchDeps,
    calculateLineTotals,
    isExistingQuotation,
    quotationId,
    updateMutation,
    updateLines,
    offerType,
    deliveryMethodName,
  ]);

  const handleSaveNewLine = useCallback(
    async (line: QuotationLineFormState): Promise<void> => {
      if (!linesEditable) return;
      const lineToAdd = { ...enforceExportVatOnLine(line, offerType, deliveryMethodName), isEditing: false };
      if (isExistingQuotation && quotationId) {
        try {
          const dtos: CreateQuotationLineDto[] = [toCreateDto(lineToAdd, quotationId)];
          const created = await createMutation.mutateAsync(dtos);
          const createdWithImages = await finalizeCreatedLineImages([lineToAdd], created, quotationId);
          const fresh = await quotationApi.getQuotationLinesByQuotationId(quotationId);
          queryClient.setQueryData(queryKeys.quotationLines(quotationId), fresh);
          const snapshot = linesRef.current;
          const mapped = mergeCreatedLineProductNamesByBackendId(
            fresh.map((dto, index) => dtoToFormState(dto, index)),
            createdWithImages,
            [lineToAdd],
          );
          updateLines(syncDocumentLinesFromServer(mapped, snapshot, { keepLocalDraftLines: true }));
          setAddLineDialogOpen(false);
          setNewLine(null);
        } catch {
          void 0;
        }
        return;
      }
      updateLines((prev) => [...prev, lineToAdd]);
      setAddLineDialogOpen(false);
      setNewLine(null);
    },
    [isExistingQuotation, quotationId, createMutation, updateLines, linesEditable, offerType, deliveryMethodName, queryClient]
  );

  const handleSaveMultipleLines = useCallback(
    async (newLines: QuotationLineFormState[]): Promise<void> => {
      if (!linesEditable) return;
      const linesToAdd = newLines.map((l) => ({ ...enforceExportVatOnLine(l, offerType, deliveryMethodName), isEditing: false }));
      if (isExistingQuotation && quotationId) {
        try {
          const dtos: CreateQuotationLineDto[] = linesToAdd.map((l) => toCreateDto(l, quotationId));
          const created = await createMutation.mutateAsync(dtos);
          const createdWithImages = await finalizeCreatedLineImages(linesToAdd, created, quotationId);
          const fresh = await quotationApi.getQuotationLinesByQuotationId(quotationId);
          queryClient.setQueryData(queryKeys.quotationLines(quotationId), fresh);
          const snapshot = linesRef.current;
          const mapped = mergeCreatedLineProductNamesByBackendId(
            fresh.map((dto, index) => dtoToFormState(dto, index)),
            createdWithImages,
            linesToAdd,
          );
          updateLines(syncDocumentLinesFromServer(mapped, snapshot, { keepLocalDraftLines: true }));
          setAddLineDialogOpen(false);
          setNewLine(null);
        } catch {
          void 0;
        }
        return;
      }
      updateLines((prev) => [...prev, ...linesToAdd]);
      setAddLineDialogOpen(false);
      setNewLine(null);
    },
    [isExistingQuotation, quotationId, createMutation, updateLines, linesEditable, offerType, deliveryMethodName, queryClient]
  );

  const handleCancelNewLine = (): void => {
    setAddLineDialogOpen(false);
    setNewLine(null);
  };

  const handleProductSelect = async (product: ProductSelectionResult): Promise<void> => {
    if (!linePrerequisitesMet) {
      toast.error(t('error'), {
        description: t('lines.requiredFieldsMissing'),
      });
      return;
    }
    if (!ensureDocumentExchangeRate()) return;

    const hasRelatedStocks = product.relatedStockIds && product.relatedStockIds.length > 0;

    if (hasRelatedStocks && handleProductSelectWithRelatedStocks && product.relatedStockIds) {
      const newLines = await handleProductSelectWithRelatedStocks(product, product.relatedStockIds);
      const firstLine = newLines[0];
      if (firstLine) {
        setNewLine(firstLine);
        setAddLineDialogOpen(true);
      }
    } else {
      const newLine = await handleProductSelectHook(product);
      setNewLine(newLine);
      setAddLineDialogOpen(true);
    }
  };

  const handleEditLine = (id: string): void => {
    setQuickEdit(null);
    if (!linesEditable) return;
    const line = lines.find((l) => l.id === id);
    if (!line) return;

    const sameGroupLines = getValidRelatedProductGroup(lines, line);
    if (sameGroupLines.length > 0) {
      const mainLine = sameGroupLines.find((l) => l.isMainRelatedProduct === true) || sameGroupLines[0];

      if (mainLine.id !== line.id) return;

      const relatedLines = sameGroupLines.filter((l) => l.id !== line.id);
      setLineToEdit({ ...line, relatedLines: relatedLines.length > 0 ? relatedLines : undefined });
    } else {
      setLineToEdit({ ...line, relatedLines: undefined });
    }
    setEditLineDialogOpen(true);
  };

  const applyLineUpdatesToLocalState = (
    updatedLine: QuotationLineFormState,
    relatedLinesToUpdate: QuotationLineFormState[] | undefined,
    originalLine: QuotationLineFormState
  ): void => {
    updateLines(
      mergeLinesAfterMainLineUpdate(
        linesRef.current,
        originalLine,
        updatedLine,
        relatedLinesToUpdate,
        calculateLineTotals
      )
    );
  };

  const handleSaveLine = async (
    updatedLine: QuotationLineFormState,
    relatedLinesToUpdate?: QuotationLineFormState[]
  ): Promise<void> => {
    const originalLine = lines.find((l) => l.id === updatedLine.id);
    if (!originalLine) {
      setEditLineDialogOpen(false);
      setLineToEdit(null);
      return;
    }

    const normalizedUpdatedLine = enforceExportVatOnLine(updatedLine, offerType, deliveryMethodName);
    const normalizedRelatedLines = relatedLinesToUpdate?.map((line) => enforceExportVatOnLine(line, offerType, deliveryMethodName));
    const allUpdatedLines = [normalizedUpdatedLine, ...(normalizedRelatedLines || [])].map((l) => ({ ...l, isEditing: false }));
    const linesWithBackendId = allUpdatedLines.filter((l) => resolveDocumentLineBackendId(l) != null);

    if (isExistingQuotation && quotationId && linesWithBackendId.length > 0) {
      try {
        const dtos: QuotationLineGetDto[] = linesWithBackendId.map((l) => toUpdateDto(l, quotationId));
        await updateMutation.mutateAsync(dtos);
        const fresh = await quotationApi.getQuotationLinesByQuotationId(quotationId);
        queryClient.setQueryData(queryKeys.quotationLines(quotationId), fresh);
        const mapped = fresh.map((dto, index) => dtoToFormState(dto, index));
        updateLines(mergeRefetchedDocumentLines(mapped, linesRef.current, resolveDocumentLineBackendId));
        setEditLineDialogOpen(false);
        setLineToEdit(null);
      } catch {
        void 0;
      }
      return;
    }

    applyLineUpdatesToLocalState(normalizedUpdatedLine, normalizedRelatedLines, originalLine);
    setEditLineDialogOpen(false);
    setLineToEdit(null);
  };

  const handleCancelEditLine = (): void => {
    setEditLineDialogOpen(false);
    setLineToEdit(null);
  };

  const handleDeleteClick = (id: string): void => {
    if (!linesEditable) return;
    const line = lines.find((l) => l.id === id);
    const relatedGroup = getValidRelatedProductGroup(lines, line);
    deleteTargetRef.current = {
      formLineId: id,
      backendLineId: line ? resolveDocumentLineBackendId(line) : null,
    };
    setLineToDelete(id);
    setRelatedLinesCount(relatedGroup.length);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async (): Promise<void> => {
    if (!linesEditable) return;
    const target =
      deleteTargetRef.current ??
      (lineToDelete
        ? {
            formLineId: lineToDelete,
            backendLineId: resolveDocumentLineBackendId(
              linesRef.current.find((line) => line.id === lineToDelete) ?? { id: lineToDelete },
            ),
          }
        : null);
    if (!target) return;

    const closeDeleteDialog = (): void => {
      deleteTargetRef.current = null;
      setLineToDelete(null);
      setRelatedLinesCount(0);
      setDeleteDialogOpen(false);
    };

    const snapshotBeforeDelete = linesRef.current;
    const lineToDeleteObj = snapshotBeforeDelete.find((line) => line.id === target.formLineId);
    if (!lineToDeleteObj) {
      closeDeleteDialog();
      return;
    }

    const backendLineId = target.backendLineId ?? resolveDocumentLineBackendId(lineToDeleteObj);

    updateLines((prev) =>
      removeDocumentLineFromState(prev, target.formLineId, backendLineId, getValidRelatedProductGroup),
    );
    closeDeleteDialog();

    if (isExistingQuotation && quotationId) {
      const qid = Number(quotationId);
      if (backendLineId == null || !Number.isFinite(qid) || qid < 1) {
        return;
      }

      try {
        await deleteMutation.mutateAsync(backendLineId);
        const fresh = await quotationApi.getQuotationLinesByQuotationId(qid);
        queryClient.setQueryData(queryKeys.quotationLines(qid), fresh);
        const mapped = fresh.map((dto, index) => dtoToFormState(dto, index));
        updateLines(syncDocumentLinesFromServer(mapped, snapshotBeforeDelete));
      } catch {
        try {
          const fresh = await quotationApi.getQuotationLinesByQuotationId(qid);
          queryClient.setQueryData(queryKeys.quotationLines(qid), fresh);
          const mapped = fresh.map((dto, index) => dtoToFormState(dto, index));
          updateLines(syncDocumentLinesFromServer(mapped, snapshotBeforeDelete));
        } catch {
          void 0;
        }
      }
    }
  };

  const handleDeleteCancel = (): void => {
    setLineToDelete(null);
    setRelatedLinesCount(0);
    setDeleteDialogOpen(false);
  };

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className={styles.glassCard}>
        <div className="p-5 border-b border-zinc-200 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-linear-to-br from-indigo-500 to-violet-600 shadow-lg shadow-indigo-500/20 text-white">
              <ShoppingCart className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-zinc-900 dark:text-white">
                {t('lines.title')}
              </h3>
              <p className="text-xs text-zinc-500 font-medium">
                {lines.length > 0
                  ? t('lines.itemCount', { count: lines.length })
                  : t('lines.noItems')
                }
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {linesEditable &&
              (canAddLine ? (
                <Button
                  type="button"
                  onClick={handleAddLine}
                  size="sm"
                  className="h-10 px-6 rounded-xl bg-[image:var(--crm-brand-gradient)] text-white font-bold shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all duration-300 border-0 hover:text-white opacity-90 grayscale-[0] dark:opacity-100 dark:grayscale-0"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  {t('lines.add')}
                </Button>
              ) : (
                <TooltipProvider delayDuration={200}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="inline-flex cursor-help rounded-md">
                        <Button
                          type="button"
                          onClick={handleAddLine}
                          disabled
                          size="sm"
                          className="h-10 px-6 rounded-xl bg-[image:var(--crm-brand-gradient)] text-white font-bold shadow-lg shadow-primary/20 transition-all duration-300 border-0 hover:text-white disabled:opacity-50 disabled:hover:scale-100"
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          {t('lines.add')}
                        </Button>
                      </span>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-80 text-sm font-medium leading-relaxed p-3">
                      <div className="flex flex-col gap-2">
                        <span className="font-bold">
                          {t('disabledActionHints.addLineTitle', { ns: 'common', section: headerSectionTitle })}
                        </span>
                        {addLineDisableHints.length > 0 && (
                          <ul className="list-disc pl-5 space-y-1">
                            {addLineDisableHints.map((hint, idx) => (
                              <li key={idx}>{hint}</li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ))}

            <div ref={actionMenuRef} className="relative">
              <button
                type="button"
                aria-haspopup="menu"
                aria-expanded={actionMenuOpen}
                onClick={() => setActionMenuOpen((current) => !current)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-slate-200 bg-white/50 p-0 text-sm font-medium shadow-xs transition-all hover:border-primary/30 hover:bg-accent/35 focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] disabled:pointer-events-none disabled:opacity-50 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
              >
                <Menu size={18} className="text-slate-500 dark:text-slate-400" />
              </button>
              {actionMenuOpen ? (
                <div
                  role="menu"
                  className="absolute right-0 top-full z-50 mt-1 w-64 overflow-visible rounded-md border border-white/10 bg-[#151025] p-0 shadow-2xl shadow-black/50"
                >
                  <div className="p-2">
                    <div className="px-3 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                      {t('common.actions', { ns: 'common' })}
                    </div>
                  </div>

                  <div className="h-px bg-white/5 my-1"></div>

                  <div className="p-2">
                    <div className="px-3 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                      {t('common.export', { ns: 'common' })}
                    </div>
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setActionMenuOpen(false);
                        handleExportExcel();
                      }}
                      className="flex items-center gap-2 w-full px-3 py-2.5 rounded-lg text-sm text-gray-200 hover:bg-white/5 transition-colors text-left"
                    >
                      <FileSpreadsheet size={16} className="text-emerald-500" />
                      <span>{t('common.exportExcel', { ns: 'common' })}</span>
                    </button>
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setActionMenuOpen(false);
                        handleExportPDF();
                      }}
                      className="flex items-center gap-2 w-full px-3 py-2.5 rounded-lg text-sm text-gray-200 hover:bg-white/5 transition-colors text-left"
                    >
                      <FileText size={16} className="text-red-400" />
                      <span>{t('common.exportPDF', { ns: 'common' })}</span>
                    </button>
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setActionMenuOpen(false);
                        handleExportPowerPoint();
                      }}
                      className="flex items-center gap-2 w-full px-3 py-2.5 rounded-lg text-sm text-gray-200 hover:bg-white/5 transition-colors text-left"
                    >
                      <Presentation size={16} className="text-orange-400" />
                      <span>{t('common.exportPPT', { ns: 'common' })}</span>
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <div className="p-0">
          {lines.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
              <div className="w-20 h-20 rounded-full bg-zinc-50 dark:bg-zinc-900 flex items-center justify-center mb-4 ring-1 ring-zinc-100 dark:ring-zinc-800">
                <Box className="h-8 w-8 text-zinc-300 dark:text-zinc-600" />
              </div>
              <h4 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
                {t('lines.empty')}
              </h4>
              <p className="text-sm text-zinc-500 max-w-xs mx-auto">
                {t('lines.emptyDescription')}
              </p>
            </div>
          ) : (
            <div
              ref={scrollRef}
              className={cn(
                DOCUMENT_LINE_TABLE_SCROLL_CONTAINER_CLASS,
                isDragging ? 'cursor-grabbing select-none' : 'cursor-grab',
              )}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUpOrLeave}
              onMouseLeave={handleMouseUpOrLeave}
            >
              <table className={DOCUMENT_LINE_TABLE_CLASS}>
                <thead className="[&_tr]:border-b">
                  <tr className={cn("hover:bg-transparent border-b", styles.tableHeadRow)}>
                    <th className={cn(DOCUMENT_LINE_TABLE_STICKY_HEAD_CLASS, styles.tableHead)}>{t('lines.stock')}</th>
                    <th className={cn("text-left align-middle whitespace-nowrap", styles.tableHeadRight, "min-w-[100px] md:min-w-[120px]")}>{t('lines.unitPrice')}</th>
                    <th className={cn("text-left align-middle whitespace-nowrap", styles.tableHead, "text-center min-w-[80px] md:min-w-[90px]")}>{t('lines.quantity')}</th>
                    <th className={cn("text-left align-middle whitespace-nowrap", styles.tableHead, "text-center min-w-[64px] md:min-w-[72px]")}>{t('lines.discount1')}</th>
                    <th className={cn("text-left align-middle whitespace-nowrap", styles.tableHead, "text-center min-w-[64px] md:min-w-[72px]")}>{t('lines.discount2')}</th>
                    <th className={cn("text-left align-middle whitespace-nowrap", styles.tableHead, "text-center min-w-[64px] md:min-w-[72px]")}>{t('lines.discount3')}</th>
                    <th className={cn("text-left align-middle whitespace-nowrap", styles.tableHeadRight, "min-w-[132px] md:min-w-[156px] pr-6")}>{t('lines.amountBreakdown', 'Tutarlar')}</th>
                    {linesEditable && (
                      <th className={cn("text-left align-middle whitespace-nowrap", styles.tableHead, "text-center w-[84px] md:w-[100px]")}>{t('actions')}</th>
                    )}
                  </tr>
                </thead>
                <tbody className="[&_tr:last-child]:border-0">
                  {lines.map((line) => {
                    const isRelatedProduct = line.relatedProductKey !== null && line.relatedProductKey !== undefined;
                    const isMainStock = line.isMainRelatedProduct === true;
                    const hasApprovalWarning = line.approvalStatus === 1;
                    const lineImagePreview =
                      line.pendingImagePreviewUrl || getImageUrl(line.imagePath ?? null) || undefined;
                    const hasLineImage = Boolean(lineImagePreview);
                    const unitDiscountBreakdown = getLineUnitDiscountBreakdown(
                      line.unitPrice,
                      line.discountRate1,
                      line.discountRate2,
                      line.discountRate3,
                    );

                    return (
                      <tr
                        key={line.id}
                        className={cn(
                          "border-b transition-colors group",
                          styles.tableRow,
                          hasApprovalWarning && 'border-l-4 border-l-amber-500',
                        )}
                      >
                        {/* STOK BİLGİSİ */}
                        <td className={getDocumentLineTableStickyStockCellClass(styles.tableCell, hasApprovalWarning)}>
                          <div className="flex gap-3 min-w-0 w-full overflow-hidden">
                            {hasLineImage ? (
                              <LineTableImageThumbnail
                                src={lineImagePreview ?? ''}
                                alt={line.productName || line.productCode || 'Line image'}
                                imagePath={line.imagePath}
                                pendingImagePreviewUrl={line.pendingImagePreviewUrl}
                              />
                            ) : null}
                            <div className="flex min-w-0 flex-1 flex-col gap-1.5 overflow-hidden">
                              <div className="font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                                {line.productCode || '-'}
                              </div>
                              {line.productName && (
                                <DescriptionCell
                                  content={line.productName}
                                  hideIcon
                                  textClassName="text-xs font-medium text-zinc-500"
                                  className="w-full"
                                  popoverHeader={t('lines.stock')}
                                />
                              )}
                              {line.unit && (
                                <div className="text-[11px] font-semibold text-purple-600 dark:text-purple-300">
                                  {t('lines.unit')}: {line.unit}
                                </div>
                              )}

                              {(line.description1 || line.description2 || line.description3 || line.profilDefinitionId || line.demirDefinitionId || line.vidaDefinitionId || line.baskiDefinitionId || line.baskiAciklama) && (
                                <div className="space-y-0.5 text-[11px] text-zinc-500 dark:text-zinc-400">
                                  {line.description1 && (
                                    <div className="line-clamp-1">
                                      {t('lines.lineDetailPair', {
                                        label: t('lines.descriptionField1Label'),
                                        value: line.description1,
                                      })}
                                    </div>
                                  )}
                                  {line.description2 && (
                                    <div className="line-clamp-1">
                                      {t('lines.lineDetailPair', {
                                        label: t('lines.descriptionField2Label'),
                                        value: line.description2,
                                      })}
                                    </div>
                                  )}
                                  {line.description3 && (
                                    <div className="line-clamp-1">
                                      {t('lines.lineDetailPair', {
                                        label: t('lines.descriptionField3Label'),
                                        value: line.description3,
                                      })}
                                    </div>
                                  )}
                                  {line.profilDefinitionId && (
                                    <div className="line-clamp-1">
                                      {t('lines.lineDetailPair', {
                                        label: t('lines.windoProfileLabel'),
                                        value: profilMap[line.profilDefinitionId] ?? `#${line.profilDefinitionId}`,
                                      })}
                                    </div>
                                  )}
                                  {line.demirDefinitionId && (
                                    <div className="line-clamp-1">
                                      {t('lines.lineDetailPair', {
                                        label: t('lines.windoRebarLabel'),
                                        value: demirMap[line.demirDefinitionId] ?? `#${line.demirDefinitionId}`,
                                      })}
                                    </div>
                                  )}
                                  {line.vidaDefinitionId && (
                                    <div className="line-clamp-1">
                                      {t('lines.lineDetailPair', {
                                        label: t('lines.windoScrewLabel'),
                                        value: line.vidaDefinitionName ?? vidaMap[line.vidaDefinitionId] ?? `#${line.vidaDefinitionId}`,
                                      })}
                                    </div>
                                  )}
                                  {line.baskiDefinitionId && (
                                    <div className="line-clamp-1">
                                      {t('lines.lineDetailPair', {
                                        label: t('lines.windoPrintLabel', { defaultValue: 'Baskı' }),
                                        value: line.baskiDefinitionName ?? baskiMap[line.baskiDefinitionId] ?? `#${line.baskiDefinitionId}`,
                                      })}
                                    </div>
                                  )}
                                  {line.baskiAciklama && (
                                    <div className="line-clamp-1">
                                      {t('lines.lineDetailPair', {
                                        label: t('lines.windoPrintDescriptionLabel', { defaultValue: 'Baskı açıklaması' }),
                                        value: line.baskiAciklama,
                                      })}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>

                            <div className="flex flex-wrap gap-2 mt-1">
                              {hasApprovalWarning && (
                                <Badge variant="outline" className="h-5 bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800 gap-1 px-1.5 shadow-sm">
                                  <AlertTriangle className="w-3 h-3" />
                                  <span className="text-[10px] font-bold">{t('lines.approvalRequired')}</span>
                                </Badge>
                              )}

                              {isRelatedProduct && (
                                <Badge variant="outline" className={cn(
                                  "h-5 gap-1 px-1.5 shadow-sm",
                                  isMainStock
                                    ? "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-300 dark:border-indigo-800"
                                    : "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800"
                                )}>
                                  <Layers className="w-3 h-3" />
                                  <span className="text-[10px] font-bold">
                                    {isMainStock ? 'Ana Stok' : 'Bağlı Stok'}
                                  </span>
                                </Badge>
                              )}
                            </div>
                          </div>
                        </td>

                        <td className={getDocumentLineTableBodyCellClass(cn(styles.tableCellRight, 'p-2 align-middle whitespace-nowrap pr-4'), hasApprovalWarning)}>
                          {quickEdit?.lineId === line.id && quickEdit.field === 'unitPrice' ? (
                            <div
                              className="flex items-center justify-end gap-1"
                              onMouseDown={(e) => e.stopPropagation()}
                              onClick={(e) => e.stopPropagation()}
                            >
                              <LineTableQuickEditMonetaryInput
                                value={quickEdit.draft}
                                onChange={(draft) => setQuickEdit((q) => (q ? { ...q, draft } : q))}
                                className="h-8 min-w-[120px] w-[120px] rounded-lg border-primary/50 text-sm font-mono px-2"
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') void commitQuickEdit();
                                  if (e.key === 'Escape') cancelQuickEdit();
                                }}
                              />
                              <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 shrink-0 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                                onClick={() => void commitQuickEdit()}
                                disabled={updateMutation.isPending}
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                              <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 shrink-0 text-zinc-500"
                                onClick={cancelQuickEdit}
                                disabled={updateMutation.isPending}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          ) : (
                            <span
                              className={cn(
                                'inline-flex bg-zinc-100/60 dark:bg-zinc-800/60 px-2 py-1 rounded-lg text-sm',
                                lineAllowsQuickEdit(line) && 'cursor-pointer select-none hover:ring-2 hover:ring-primary/20 rounded-lg'
                              )}
                              title={t('lines.doubleClickToEdit', 'Çift tıklayarak düzenleyin')}
                              onDoubleClick={(e) => {
                                e.stopPropagation();
                                beginQuickEdit(line, 'unitPrice');
                              }}
                            >
                              <LineDiscountedUnitPriceDisplay
                                unitPrice={line.unitPrice}
                                discountRate1={line.discountRate1}
                                discountRate2={line.discountRate2}
                                discountRate3={line.discountRate3}
                                currencyCode={currencyCode}
                                singlePriceClassName="font-mono text-zinc-700 dark:text-zinc-300"
                                discountedClassName="text-sm font-semibold text-emerald-700 dark:text-emerald-300"
                              />
                            </span>
                          )}
                        </td>

                        <td className={getDocumentLineTableBodyCellClass(cn(styles.tableCell, 'p-2 align-middle whitespace-nowrap text-center'), hasApprovalWarning)}>
                          {quickEdit?.lineId === line.id && quickEdit.field === 'quantity' ? (
                            <div
                              className="flex items-center justify-center gap-1"
                              onMouseDown={(e) => e.stopPropagation()}
                              onClick={(e) => e.stopPropagation()}
                            >
                              <LineTableQuickEditNumberInput
                                step={numberInputStep}
                                min={0}
                                value={quickEdit.draft}
                                onChange={(draft) => setQuickEdit((q) => (q ? { ...q, draft } : q))}
                                className="h-8 w-16 rounded-lg border-primary/50 text-sm font-bold text-center px-1"
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') void commitQuickEdit();
                                  if (e.key === 'Escape') cancelQuickEdit();
                                }}
                              />
                              <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 shrink-0 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                                onClick={() => void commitQuickEdit()}
                                disabled={updateMutation.isPending}
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                              <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 shrink-0 text-zinc-500"
                                onClick={cancelQuickEdit}
                                disabled={updateMutation.isPending}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          ) : (
                            <span
                              className={cn(
                                'inline-flex items-center justify-center min-w-10 h-7 px-2 rounded-lg bg-white border border-zinc-200 dark:bg-zinc-800 dark:border-zinc-700 text-sm font-bold text-zinc-900 dark:text-zinc-100 tabular-nums',
                                lineAllowsQuickEdit(line) && 'cursor-pointer select-none hover:border-primary/40'
                              )}
                              title={t('lines.doubleClickToEdit', 'Çift tıklayarak düzenleyin')}
                              onDoubleClick={(e) => {
                                e.stopPropagation();
                                beginQuickEdit(line, 'quantity');
                              }}
                            >
                              {line.quantity}
                            </span>
                          )}
                        </td>

                        {(
                          [
                            { rate: line.discountRate1, field: 'discountRate1' as const, tierIndex: 0 },
                            { rate: line.discountRate2, field: 'discountRate2' as const, tierIndex: 1 },
                            { rate: line.discountRate3, field: 'discountRate3' as const, tierIndex: 2 },
                          ] as const
                        ).map((discount) => {
                          const unitDiscountAmount = getUnitDiscountAmountForTierIndex(
                            unitDiscountBreakdown,
                            discount.tierIndex,
                          );
                          const hasDiscount = discount.rate > 0 || unitDiscountAmount > 0;
                          const isEditingDiscount =
                            quickEdit?.lineId === line.id && quickEdit.field === discount.field;
                          return (
                            <td
                              key={discount.field}
                              className={getDocumentLineTableBodyCellClass(cn(styles.tableCell, 'p-2 align-middle whitespace-nowrap text-center'), hasApprovalWarning)}
                            >
                              {isEditingDiscount ? (
                                <div
                                  className="flex flex-col items-center gap-1"
                                  onMouseDown={(e) => e.stopPropagation()}
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <div className="flex items-center justify-center gap-1">
                                    <LineTableQuickEditNumberInput
                                      step={numberInputStep}
                                      min={0}
                                      max={100}
                                      value={quickEdit.draft}
                                      onChange={(draft) => setQuickEdit((q) => (q ? { ...q, draft } : q))}
                                      className="h-8 w-14 rounded-lg border-primary/50 text-sm font-bold text-center px-1"
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') void commitQuickEdit();
                                        if (e.key === 'Escape') cancelQuickEdit();
                                      }}
                                    />
                                    <span className="text-xs font-bold text-zinc-500">%</span>
                                    <Button
                                      type="button"
                                      size="icon"
                                      variant="ghost"
                                      className="h-8 w-8 shrink-0 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                                      onClick={() => void commitQuickEdit()}
                                      disabled={updateMutation.isPending}
                                    >
                                      <Check className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      type="button"
                                      size="icon"
                                      variant="ghost"
                                      className="h-8 w-8 shrink-0 text-zinc-500"
                                      onClick={cancelQuickEdit}
                                      disabled={updateMutation.isPending}
                                    >
                                      <X className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </div>
                              ) : hasDiscount ? (
                                <div
                                  className={cn(
                                    'inline-flex min-w-[96px] flex-col items-center gap-1 rounded-xl border border-emerald-200/80 bg-emerald-50/70 px-2 py-1.5 shadow-sm dark:border-emerald-900/40 dark:bg-emerald-950/20',
                                    lineAllowsQuickEdit(line) &&
                                    'cursor-pointer hover:ring-2 hover:ring-primary/20'
                                  )}
                                  title={t('lines.doubleClickToEdit', 'Çift tıklayarak düzenleyin')}
                                  onDoubleClick={(e) => {
                                    e.stopPropagation();
                                    beginQuickEdit(line, discount.field);
                                  }}
                                >
                                  <span className="text-[11px] font-black leading-none text-emerald-700 dark:text-emerald-300">
                                    %{discount.rate}
                                  </span>
                                  <span className="text-[10px] font-semibold leading-none text-red-600 dark:text-red-400">
                                    -{formatCurrency(unitDiscountAmount, currencyCode)}
                                  </span>
                                </div>
                              ) : (
                                <span
                                  className={cn(
                                    'inline-flex min-w-[96px] justify-center rounded-xl border border-zinc-200 bg-zinc-50 px-2 py-2 text-[11px] font-semibold text-zinc-400 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-600',
                                    lineAllowsQuickEdit(line) &&
                                    'cursor-pointer hover:border-primary/40 hover:text-zinc-600 dark:hover:text-zinc-400'
                                  )}
                                  title={t('lines.doubleClickToEdit', 'Çift tıklayarak düzenleyin')}
                                  onDoubleClick={(e) => {
                                    e.stopPropagation();
                                    beginQuickEdit(line, discount.field);
                                  }}
                                >
                                  İndirim yok
                                </span>
                              )}
                            </td>
                          );
                        })}

                        <td className={getDocumentLineTableBodyCellClass(cn(styles.tableCellRight, 'p-2 align-middle whitespace-nowrap pr-6'), hasApprovalWarning)}>
                          <div className="flex flex-col items-end gap-1">
                            <div className="flex items-center gap-2 text-[11px] font-semibold text-zinc-500 dark:text-zinc-400">
                              <span>{t('lines.vatExcludedShort', 'KDV Hariç')}</span>
                              <span className="tabular-nums">{formatCurrency(line.lineTotal, currencyCode)}</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm font-bold text-zinc-900 dark:text-white">
                              <span className="text-[11px] font-semibold text-primary">{t('lines.vatIncludedShort', 'KDV Dahil')}</span>
                              <span className="tabular-nums">{formatCurrency(line.lineGrandTotal, currencyCode)}</span>
                            </div>
                          </div>
                        </td>

                        {linesEditable && (
                          <td className={getDocumentLineTableBodyCellClass(cn(styles.tableCell, 'p-2 align-middle whitespace-nowrap text-center pr-4'), hasApprovalWarning)}>
                            <div className="flex items-center justify-center gap-2">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className={styles.actionButton}
                                onClick={() => handleEditLine(line.id)}
                                disabled={!isMainStock && isRelatedProduct}
                                title={!isMainStock && isRelatedProduct ? "Bağlı stok düzenlenemez" : "Düzenle"}
                              >
                                <Edit className={cn(
                                  "h-4 w-4",
                                  !isMainStock && isRelatedProduct ? "text-zinc-300" : "text-blue-600"
                                )} />
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className={cn(styles.actionButton, "text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30")}
                                onClick={() => handleDeleteClick(line.id)}
                                title={t('common.delete.action', { ns: 'common' })}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <ProductSelectDialog
        open={productDialogOpen}
        onOpenChange={setProductDialogOpen}
        onSelect={handleProductSelect}
      />

      <DocumentLineFormDialog
        open={addLineDialogOpen}
        onOpenChange={(open) => {
          setAddLineDialogOpen(open);
          if (!open) {
            setNewLine(null);
          }
        }}
        title={t('lines.addTitle')}
        icon={<Plus className="h-4 w-4 sm:h-5 sm:w-5" />}
        variant="add"
        onClose={() => setAddLineDialogOpen(false)}
      >
        {newLine && (
          <QuotationLineForm
            key={`add-line-${newLine.id}-${currency}`}
            line={newLine}
            onSave={handleSaveNewLine}
            onCancel={handleCancelNewLine}
            currency={currency}
            exchangeRates={exchangeRates}
            pricingRules={pricingRules}
            userDiscountLimits={userDiscountLimits}
            onSaveMultiple={handleSaveMultipleLines}
            isSaving={createMutation.isPending}
            existingLineStockMarkers={existingDocumentLineMarkers}
            offerType={offerType}
            deliveryMethodName={deliveryMethodName}
            allowImageUpload
            imageUploadScope="quotation-line"
                imageUploadExtras={{
                  quotationId: quotationId ?? undefined,
                  productCode: newLine.productCode || undefined,
                }}
              />
        )}
      </DocumentLineFormDialog>

      <DocumentLineFormDialog
        open={editLineDialogOpen}
        onOpenChange={setEditLineDialogOpen}
        title={t('lines.editTitle')}
        icon={<Edit className="h-4 w-4 sm:h-5 sm:w-5" />}
        variant="edit"
        onClose={() => setEditLineDialogOpen(false)}
      >
        {lineToEdit && (
          <QuotationLineForm
            line={lineToEdit}
            onSave={
              lineToEdit.relatedLines && lineToEdit.relatedLines.length > 0
                ? undefined
                : (line) => handleSaveLine(line)
            }
            onSaveMultiple={
              lineToEdit.relatedLines && lineToEdit.relatedLines.length > 0
                ? (lines) => {
                  if (lines.length === 0) return;
                  const [main, ...rest] = lines;
                  void handleSaveLine(main, rest);
                }
                : undefined
            }
            onCancel={handleCancelEditLine}
            currency={currency}
            exchangeRates={exchangeRates}
            pricingRules={pricingRules}
            userDiscountLimits={userDiscountLimits}
            offerType={offerType}
            deliveryMethodName={deliveryMethodName}
            isSaving={updateMutation.isPending}
            existingLineStockMarkers={existingDocumentLineMarkersForEdit}
            allowImageUpload={true}
            imageUploadScope="quotation-line"
                imageUploadExtras={{
                  quotationId: quotationId ?? undefined,
                  quotationLineId: resolveDocumentLineBackendId(lineToEdit) ?? undefined,
                  productCode: lineToEdit.productCode || undefined,
                }}
              />
        )}
      </DocumentLineFormDialog>

      <Dialog
        open={deleteDialogOpen}
        onOpenChange={(open) => {
          if (!open && isDeleting) return;
          setDeleteDialogOpen(open);
          if (!open) {
            setLineToDelete(null);
            setRelatedLinesCount(0);
          }
        }}
      >
        <DialogContent className="bg-white/80 dark:bg-[#0c0516]/80 backdrop-blur-xl border-slate-200 dark:border-white/10 w-[calc(100vw-1rem)] sm:w-[calc(100vw-2rem)] max-w-[425px] p-0 overflow-hidden shadow-2xl">
          <DialogHeader className="px-6 py-5 border-b border-slate-200/50 dark:border-white/5 bg-slate-50/50 dark:bg-white/5">
            <DialogTitle className="flex items-center gap-3 text-slate-900 dark:text-white text-lg">
              <div className="bg-linear-to-br from-red-500 to-red-600 p-2.5 rounded-xl shadow-lg shadow-red-500/20 text-white">
                <Trash2 className="h-5 w-5" />
              </div>
              {relatedLinesCount > 1
                ? t('lines.delete.confirmTitleMultiple')
                : t('lines.delete.confirmTitle')}
            </DialogTitle>
            <DialogDescription className="pt-2 text-slate-500 dark:text-slate-400 text-sm leading-relaxed">
              {relatedLinesCount > 1
                ? t('lines.delete.confirmMessageMultiple', { count: relatedLinesCount })
                : t('lines.delete.confirmMessage')
              }
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-3 p-6 bg-slate-50/30 dark:bg-black/20">
            <Button
              type="button"
              variant="outline"
              onClick={handleDeleteCancel}
              disabled={isDeleting}
              className="h-11 px-6 rounded-xl border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/5 text-slate-700 dark:text-slate-300 font-medium transition-all"
            >
              {t('cancel')}
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                void handleDeleteConfirm();
              }}
              disabled={isDeleting}
              className="h-11 px-6 rounded-xl bg-linear-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white shadow-lg shadow-red-500/25 hover:shadow-red-500/40 border-0 font-medium transition-all"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  {t('saving')}
                </>
              ) : (
                t('delete')
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

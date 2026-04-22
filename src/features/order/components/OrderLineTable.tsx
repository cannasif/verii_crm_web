import { type ReactElement, useState, useMemo, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { OrderLineForm } from './OrderLineForm';
import { ProductSelectDialog, type ProductSelectionResult } from '@/components/shared/ProductSelectDialog';
import { useCurrencyOptions } from '@/services/hooks/useCurrencyOptions';
import { useProductSelection } from '../hooks/useProductSelection';
import { useOrderCalculations } from '../hooks/useOrderCalculations';
import { useCreateOrderLines } from '../hooks/useCreateOrderLines';
import { useUpdateOrderLines } from '../hooks/useUpdateOrderLines';
import { useDeleteOrderLine } from '../hooks/useDeleteOrderLine';
import { orderApi } from '../api/order-api';
import { formatCurrency } from '../utils/format-currency';
import { mergeLinesAfterMainLineUpdate } from '@/lib/merge-lines-after-main-update';
import {
  applyOrderLineQuickFieldPatch,
  type OrderQuickEditField,
} from '../utils/apply-order-line-quick-field-patch';
import {
  Trash2,
  Edit,
  Plus,
  ShoppingCart,
  Box,
  AlertTriangle,
  Layers,
  Loader2,
  X,
  Menu,
  FileSpreadsheet,
  FileText,
  Presentation,
  Check,
} from 'lucide-react';
import type { OrderLineFormState, OrderExchangeRateFormState, PricingRuleLineGetDto, UserDiscountLimitDto, CreateOrderLineDto, OrderLineGetDto } from '../types/order-types';
import { cn } from '@/lib/utils';
import {
  formatLineTableQuickEditDraft,
  getHtmlNumberInputStepForDecimals,
  isIntegerQuantityUnit,
} from '@/lib/system-settings';
import { useSystemSettingsStore } from '@/stores/system-settings-store';
import { useExchangeRate } from '@/services/hooks/useExchangeRate';
import { linesToDocumentStockMarkers, linesToDocumentStockMarkersExceptLine } from '@/lib/line-form-stock-markers';

function toCreateDto(line: OrderLineFormState, orderId: number): CreateOrderLineDto {
  const { id, isEditing, relatedLines, unit, ...rest } = line;
  return {
    ...rest,
    orderId,
    productId: line.productId ?? 0,
    productCode: line.productCode ?? '',
    productName: line.productName ?? '',
    approvalStatus: line.approvalStatus ?? 0,
    erpProjectCode: line.projectCode ?? null,
    imagePath: line.imagePath ?? null,
  };
}

function parseLineId(formId: string | number | undefined): number | null {
  if (formId == null) return null;
  if (typeof formId === 'number' && Number.isFinite(formId) && formId > 0) return formId;
  const s = String(formId).trim();
  const prefixed = s.match(/^line-(\d+)(?:-|$)/);
  if (prefixed) {
    const n = parseInt(prefixed[1], 10);
    return Number.isNaN(n) ? null : n;
  }
  if (/^\d+$/.test(s)) {
    const n = parseInt(s, 10);
    return Number.isNaN(n) ? null : n;
  }
  return null;
}

function dtoToFormState(dto: OrderLineGetDto, index: number): OrderLineFormState {
  return {
    id: dto.id && dto.id > 0 ? `line-${dto.id}-${index}` : `line-temp-${index}`,
    isEditing: false,
    productId: dto.productId ?? null,
    productCode: dto.productCode ?? '',
    productName: dto.productName,
    unit: dto.unit ?? null,
    groupCode: dto.groupCode ?? null,
    quantity: dto.quantity,
    unitPrice: dto.unitPrice,
    discountRate1: dto.discountRate1,
    discountAmount1: dto.discountAmount1,
    discountRate2: dto.discountRate2,
    discountAmount2: dto.discountAmount2,
    discountRate3: dto.discountRate3,
    discountAmount3: dto.discountAmount3,
    vatRate: dto.vatRate,
    vatAmount: dto.vatAmount,
    lineTotal: dto.lineTotal,
    lineGrandTotal: dto.lineGrandTotal,
    description: dto.description ?? null,
    description1: dto.description1 ?? null,
    description2: dto.description2 ?? null,
    description3: dto.description3 ?? null,
    pricingRuleHeaderId: dto.pricingRuleHeaderId ?? null,
    projectCode: dto.erpProjectCode ?? dto.projectCode ?? null,
    imagePath: dto.imagePath ?? null,
    relatedStockId: dto.relatedStockId ?? null,
    relatedProductKey: dto.relatedProductKey ?? null,
    isMainRelatedProduct: dto.isMainRelatedProduct ?? false,
    approvalStatus: dto.approvalStatus ?? 0,
  };
}

function toUpdateDto(line: OrderLineFormState, orderId: number): OrderLineGetDto {
  const lineId = parseLineId(line.id) ?? 0;
  return {
    id: lineId,
    orderId,
    productId: line.productId ?? null,
    productCode: line.productCode ?? '',
    productName: line.productName ?? '',
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

interface OrderLineTableProps {
  lines: OrderLineFormState[];
  setLines: (lines: OrderLineFormState[]) => void;
  currency: number;
  exchangeRates?: OrderExchangeRateFormState[];
  pricingRules?: PricingRuleLineGetDto[];
  userDiscountLimits?: UserDiscountLimitDto[];
  customerId?: number | null;
  erpCustomerCode?: string | null;
  representativeId?: number | null;
  orderId?: number | null;
  enabled?: boolean;
}

export function OrderLineTable({
  lines,
  setLines,
  currency,
  exchangeRates = [],
  pricingRules = [],
  userDiscountLimits = [],
  customerId,
  erpCustomerCode,
  representativeId,
  orderId,
  enabled = true,
}: OrderLineTableProps): ReactElement {
  const linesEditable = enabled;
  const { t } = useTranslation();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [productDialogOpen, setProductDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [lineToDelete, setLineToDelete] = useState<string | null>(null);
  const [relatedLinesCount, setRelatedLinesCount] = useState(0);
  const [addLineDialogOpen, setAddLineDialogOpen] = useState(false);
  const [newLine, setNewLine] = useState<OrderLineFormState | null>(null);
  const [editLineDialogOpen, setEditLineDialogOpen] = useState(false);
  const [lineToEdit, setLineToEdit] = useState<OrderLineFormState | null>(null);
  const [quickEdit, setQuickEdit] = useState<{
    lineId: string;
    field: OrderQuickEditField;
    draft: string;
  } | null>(null);
  const { currencyOptions } = useCurrencyOptions();
  const { data: erpRates = [] } = useExchangeRate();
  const { calculateLineTotals } = useOrderCalculations();
  const createMutation = useCreateOrderLines(orderId ?? 0);
  const updateMutation = useUpdateOrderLines(orderId ?? 0);
  const deleteMutation = useDeleteOrderLine(orderId ?? 0);
  const systemDecimalPlaces = useSystemSettingsStore((s) => s.settings.decimalPlaces);
  const numberInputStep = useMemo(
    () => getHtmlNumberInputStepForDecimals(systemDecimalPlaces),
    [systemDecimalPlaces]
  );
  const isExistingOrder = orderId != null && orderId > 0;
  const isDeleting = deleteMutation.isPending;
  const { handleProductSelect: handleProductSelectHook, handleProductSelectWithRelatedStocks } = useProductSelection({
    currency,
    exchangeRates,
  });

  const existingDocumentLineMarkers = useMemo(() => linesToDocumentStockMarkers(lines), [lines]);
  const existingDocumentLineMarkersForEdit = useMemo(
    () => (lineToEdit ? linesToDocumentStockMarkersExceptLine(lines, lineToEdit.id) : []),
    [lines, lineToEdit]
  );

  const styles = {
    glassCard:
      'relative overflow-hidden border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 shadow-sm',
    tableHeadRow: 'bg-zinc-50/80 dark:bg-zinc-900/50 border-b border-zinc-200 dark:border-zinc-800',
    tableHead: 'h-11 px-4 text-xs font-bold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider',
    tableHeadRight: 'h-11 px-4 text-xs font-bold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider text-right',
    tableCell: 'p-4 text-sm font-medium text-zinc-700 dark:text-zinc-200 border-b border-zinc-100 dark:border-zinc-800',
    tableCellRight:
      'p-4 text-sm font-medium text-zinc-700 dark:text-zinc-200 border-b border-zinc-100 dark:border-zinc-800 text-right font-mono tabular-nums',
    tableRow: 'group transition-all duration-200 hover:bg-zinc-50 dark:hover:bg-zinc-800/40',
    actionButton: 'h-8 w-8 p-0 rounded-lg hover:bg-white dark:hover:bg-zinc-700 hover:shadow-sm hover:scale-105 transition-all duration-200',
  };

  const currencyCode = useMemo(() => {
    const found = currencyOptions.find((opt) => opt.dovizTipi === currency);
    return found?.code || 'TRY';
  }, [currency, currencyOptions]);

  const isCurrencySelected = currency !== undefined && currency !== null && !Number.isNaN(currency);

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

  const handleAddLine = (): void => {
    setQuickEdit(null);
    if (!linesEditable) return;
    if ((!customerId && !erpCustomerCode) || !representativeId || !isCurrencySelected) {
      toast.error(t('order.error'), {
        description: t('order.lines.requiredFieldsMissing'),
      });
      return;
    }

    const line: OrderLineFormState = {
      id: `temp-${Date.now()}`,
      productId: null,
      productCode: '',
      productName: '',
      projectCode: null,
      quantity: 1,
      unitPrice: 0,
      discountRate1: 0,
      discountAmount1: 0,
      discountRate2: 0,
      discountAmount2: 0,
      discountRate3: 0,
      discountAmount3: 0,
      vatRate: 18,
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

  const canAddLine = linesEditable && Boolean((customerId || erpCustomerCode) && representativeId && isCurrencySelected);

  const headerSectionTitle = t('order.sections.header');
  const addLineDisableHints = useMemo(() => {
    if (canAddLine || !linesEditable) return [];
    const items: string[] = [];
    if (!customerId && !erpCustomerCode) {
      items.push(t('disabledActionHints.needCustomer', { ns: 'common' }));
    }
    if (!representativeId) {
      items.push(t('disabledActionHints.needRepresentative', { ns: 'common' }));
    }
    if (!isCurrencySelected) {
      items.push(t('disabledActionHints.needCurrency', { ns: 'common' }));
    }
    return items;
  }, [canAddLine, linesEditable, customerId, erpCustomerCode, representativeId, isCurrencySelected, t]);

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
    (line: OrderLineFormState): boolean => {
      if (!linesEditable || !line.productCode) return false;
      const isRelatedProduct = line.relatedProductKey != null;
      const isMainStock = line.isMainRelatedProduct === true;
      if (isRelatedProduct && !isMainStock) return false;
      return true;
    },
    [linesEditable]
  );

  const beginQuickEdit = useCallback(
    (line: OrderLineFormState, field: OrderQuickEditField) => {
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

    const raw = quickEdit.draft.replace(',', '.').trim();
    const parsedFloat = parseFloat(raw);
    if (raw === '' || Number.isNaN(parsedFloat)) return;

    let value: number;
    if (quickEdit.field === 'quantity') {
      const intOnly = isIntegerQuantityUnit(originalLine.unit);
      if (parsedFloat < 0) return;
      value = intOnly ? Math.max(1, Math.round(parsedFloat)) : parsedFloat;
    } else if (quickEdit.field === 'unitPrice') {
      if (parsedFloat < 0) return;
      value = parsedFloat;
    } else {
      value = Math.min(100, Math.max(0, parsedFloat));
    }

    const patched = applyOrderLineQuickFieldPatch(originalLine, quickEdit.field, value, quickPatchDeps);
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

    if (isExistingOrder && orderId) {
      const apiTargets =
        patchedFromNext.relatedProductKey &&
        patchedFromNext.isMainRelatedProduct &&
        originalLine.quantity !== patchedFromNext.quantity
          ? nextLines.filter(
              (l) => l.relatedProductKey === patchedFromNext.relatedProductKey && parseLineId(l.id) != null
            )
          : parseLineId(patchedFromNext.id) != null
            ? [patchedFromNext]
            : [];

      if (apiTargets.length > 0) {
        try {
          const dtos = apiTargets.map((l) => toUpdateDto(l, orderId));
          await updateMutation.mutateAsync(dtos);
          const fresh = await orderApi.getOrderLinesByOrderId(orderId);
          const mapped = fresh.map((dto, index) => dtoToFormState(dto, index));
          setLines(mapped);
        } catch {
          void 0;
        }
        setQuickEdit(null);
        return;
      }
    }

    setLines(nextLines);
    setQuickEdit(null);
  }, [
    quickEdit,
    linesEditable,
    lines,
    lineAllowsQuickEdit,
    quickPatchDeps,
    calculateLineTotals,
    isExistingOrder,
    orderId,
    updateMutation,
    setLines,
  ]);

  const handleSaveNewLine = useCallback(
    async (line: OrderLineFormState): Promise<void> => {
      const lineToAdd = { ...line, isEditing: false };
      if (isExistingOrder && orderId) {
          try {
            const dtos: CreateOrderLineDto[] = [toCreateDto(lineToAdd, orderId)];
            const created = await createMutation.mutateAsync(dtos);
            const mapped = created.map((dto: OrderLineGetDto, i: number) => dtoToFormState(dto, lines.length + i));
            setLines([...lines, ...mapped]);
            setAddLineDialogOpen(false);
            setNewLine(null);
          } catch {
            void 0;
          }
          return;
        }
      setLines([...lines, lineToAdd]);
      setAddLineDialogOpen(false);
      setNewLine(null);
    },
      [isExistingOrder, orderId, createMutation, lines, setLines]
    );

  const handleSaveMultipleLines = useCallback(
    async (newLines: OrderLineFormState[]): Promise<void> => {
      if (!linesEditable) return;
      const linesToAdd = newLines.map((l) => ({ ...l, isEditing: false }));
      if (isExistingOrder && orderId) {
          try {
            const dtos: CreateOrderLineDto[] = linesToAdd.map((l) => toCreateDto(l, orderId));
            const created = await createMutation.mutateAsync(dtos);
            const mapped = created.map((dto: OrderLineGetDto, i: number) => dtoToFormState(dto, lines.length + i));
            setLines([...lines, ...mapped]);
            setAddLineDialogOpen(false);
            setNewLine(null);
          } catch {
            void 0;
          }
          return;
        }
      setLines([...lines, ...linesToAdd]);
      setAddLineDialogOpen(false);
      setNewLine(null);
    },
    [isExistingOrder, orderId, createMutation, lines, setLines, linesEditable]
  );

  const handleCancelNewLine = (): void => {
    setAddLineDialogOpen(false);
    setNewLine(null);
  };

  const handleProductSelect = async (product: ProductSelectionResult): Promise<void> => {
    if ((!customerId && !erpCustomerCode) || !representativeId || !isCurrencySelected) {
      toast.error(t('order.error'), {
        description: t('order.lines.requiredFieldsMissing'),
      });
      return;
    }

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

    const isRelatedProduct = line.relatedProductKey !== null && line.relatedProductKey !== undefined;
    if (isRelatedProduct) {
      const sameGroupLines = lines.filter((l) => l.relatedProductKey === line.relatedProductKey);
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
    updatedLine: OrderLineFormState,
    relatedLinesToUpdate: OrderLineFormState[] | undefined,
    originalLine: OrderLineFormState
  ): void => {
    setLines(
      mergeLinesAfterMainLineUpdate(
        lines,
        originalLine,
        updatedLine,
        relatedLinesToUpdate,
        calculateLineTotals
      )
    );
  };

  const handleSaveLine = async (
    updatedLine: OrderLineFormState,
    relatedLinesToUpdate?: OrderLineFormState[]
  ): Promise<void> => {
    const originalLine = lines.find((l) => l.id === updatedLine.id);
    if (!originalLine) {
      setEditLineDialogOpen(false);
      setLineToEdit(null);
      return;
    }

    const allUpdatedLines = [updatedLine, ...(relatedLinesToUpdate || [])].map((l) => ({ ...l, isEditing: false }));
    const linesWithBackendId = allUpdatedLines.filter((l) => parseLineId(l.id) != null);

    if (isExistingOrder && orderId && linesWithBackendId.length > 0) {
        try {
          const dtos: OrderLineGetDto[] = linesWithBackendId.map((l) => toUpdateDto(l, orderId));
          await updateMutation.mutateAsync(dtos);
          const fresh = await orderApi.getOrderLinesByOrderId(orderId);
          const mapped = fresh.map((dto: OrderLineGetDto, index: number) => dtoToFormState(dto, index));
          setLines(mapped);
          setEditLineDialogOpen(false);
          setLineToEdit(null);
        } catch {
          void 0;
        }
        return;
      }

    applyLineUpdatesToLocalState(updatedLine, relatedLinesToUpdate, originalLine);
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
    setLineToDelete(id);
    if (line?.relatedProductKey) {
      setRelatedLinesCount(lines.filter((l) => l.relatedProductKey === line.relatedProductKey).length);
    } else {
      setRelatedLinesCount(0);
    }
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async (): Promise<void> => {
    if (!linesEditable) return;
    if (!lineToDelete) return;
    const lineToDeleteObj = lines.find((line) => line.id === lineToDelete);
    if (!lineToDeleteObj) {
      setLineToDelete(null);
      setDeleteDialogOpen(false);
      return;
    }
    const removeFromList = (): void => {
      if (lineToDeleteObj.relatedProductKey) {
        setLines(lines.filter((l) => l.relatedProductKey !== lineToDeleteObj.relatedProductKey));
      } else {
        setLines(lines.filter((l) => l.id !== lineToDelete));
      }
      setLineToDelete(null);
      setRelatedLinesCount(0);
      setDeleteDialogOpen(false);
    };
    if (isExistingOrder && orderId) {
      const lineBackendId = parseLineId(lineToDeleteObj.id);
      const oid = Number(orderId);
      if (lineBackendId == null) {
        removeFromList();
        return;
      }
      if (!Number.isFinite(oid) || oid < 1) {
        removeFromList();
        return;
      }
      deleteMutation.mutate(lineBackendId, {
        onSuccess: async (): Promise<void> => {
          const fresh = await orderApi.getOrderLinesByOrderId(oid);
          const mapped = fresh.map((dto: OrderLineGetDto, index: number) => dtoToFormState(dto, index));
          setLines(mapped);
          setLineToDelete(null);
          setRelatedLinesCount(0);
          setDeleteDialogOpen(false);
        },
      });
      return;
    }
    removeFromList();
  };

  const handleDeleteCancel = (): void => {
    setLineToDelete(null);
    setRelatedLinesCount(0);
    setDeleteDialogOpen(false);
  };

  const handleExportExcel = async (): Promise<void> => {
    const dataToExport = lines.map((line) => ({
      [t('order.lines.productCode')]: line.productCode,
      [t('order.lines.productName')]: line.productName,
      [t('order.lines.quantity')]: line.quantity,
      [t('order.lines.unitPrice')]: formatCurrency(line.unitPrice, currencyCode),
      [t('order.lines.vatRate')]: `%${line.vatRate}`,
      [t('order.lines.lineTotal')]: formatCurrency(line.lineTotal, currencyCode),
    }));

    const XLSX = await import('xlsx');
    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Siparis Kalemleri');
    XLSX.writeFile(wb, 'siparis-kalemleri.xlsx');
  };

  const handleExportPDF = async (): Promise<void> => {
    const [{ default: JsPDF }, { default: autoTable }] = await Promise.all([
      import('jspdf'),
      import('jspdf-autotable'),
    ]);
    const doc = new JsPDF();
    doc.setFontSize(16);
    doc.text(t('order.lines.title'), 14, 18);
    const headers = [
      [
        t('order.lines.productCode'),
        t('order.lines.productName'),
        t('order.lines.quantity'),
        t('order.lines.unitPrice'),
        t('order.lines.vatRate'),
        t('order.lines.lineTotal'),
      ],
    ];
    const data = lines.map((line) => [
      line.productCode ?? '',
      line.productName ?? '',
      String(line.quantity),
      formatCurrency(line.unitPrice, currencyCode),
      `%${line.vatRate}`,
      formatCurrency(line.lineTotal, currencyCode),
    ]);
    autoTable(doc, {
      startY: 24,
      head: headers,
      body: data,
      styles: { font: 'helvetica', fontStyle: 'normal' },
      theme: 'grid',
    });
    doc.save('siparis-kalemleri.pdf');
  };

  const handleExportPowerPoint = async (): Promise<void> => {
    const { default: PptxGenJS } = await import('pptxgenjs');
    const pptx = new PptxGenJS();
    const slide = pptx.addSlide();

    slide.addText(t('order.lines.title'), { x: 0.5, y: 0.5, w: '90%', fontSize: 24, bold: true });

    const headers = [
      t('order.lines.productCode'),
      t('order.lines.productName'),
      t('order.lines.quantity'),
      t('order.lines.unitPrice'),
      t('order.lines.vatRate'),
      t('order.lines.lineTotal'),
    ];

    const rows = lines.map((line) => [
      line.productCode,
      line.productName,
      String(line.quantity),
      formatCurrency(line.unitPrice, currencyCode),
      `%${line.vatRate}`,
      formatCurrency(line.lineTotal, currencyCode),
    ]);

    const tableData = [
      headers.map((text) => ({ text, options: { bold: true, fill: 'F0F0F0' } })),
      ...rows.map((row) => row.map((text) => ({ text }))),
    ];

    slide.addTable(tableData, { x: 0.5, y: 1.5, w: '90%' });

    pptx.writeFile({ fileName: 'siparis-kalemleri.pptx' });
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
                {t('order.lines.title')}
              </h3>
              <p className="text-xs text-zinc-500 font-medium">
                {lines.length > 0 
                  ? t('order.lines.itemCount', { count: lines.length })
                  : t('order.lines.noItems')
                }
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {linesEditable &&
              (canAddLine ? (
                <Button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleAddLine();
                  }}
                  size="sm"
                  className="h-10 px-6 rounded-xl bg-linear-to-r from-pink-600 to-orange-600 text-white font-bold shadow-lg shadow-pink-500/20 hover:scale-105 active:scale-95 transition-all duration-300 border-0 hover:text-white"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  {t('order.lines.add')}
                </Button>
              ) : (
                <Tooltip delayDuration={250}>
                  <TooltipTrigger asChild>
                    <span className="inline-flex cursor-help rounded-md">
                      <Button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                        }}
                        disabled
                        size="sm"
                        className="h-10 px-6 rounded-xl bg-linear-to-r from-pink-600 to-orange-600 text-white font-bold shadow-lg shadow-pink-500/20 transition-all duration-300 border-0 hover:text-white disabled:opacity-50 disabled:hover:scale-100"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        {t('order.lines.add')}
                      </Button>
                    </span>
                  </TooltipTrigger>
                  <TooltipContent
                    side="top"
                    align="end"
                    className="max-w-xs border bg-popover px-3 py-2.5 text-left text-popover-foreground shadow-md"
                  >
                    <p className="text-sm font-medium leading-snug">
                      {t('disabledActionHints.addLineTitle', { ns: 'common', section: headerSectionTitle })}
                    </p>
                    <ul className="mt-2 list-disc space-y-1 pl-4 text-xs leading-relaxed text-foreground/95">
                      {addLineDisableHints.map((hint) => (
                        <li key={hint}>{hint}</li>
                      ))}
                    </ul>
                  </TooltipContent>
                </Tooltip>
              ))}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  className="h-10 w-10 p-0 border-slate-200 dark:border-white/10 bg-white/50 dark:bg-white/5 hover:bg-pink-50 dark:hover:bg-white/10 hover:border-pink-500/30"
                >
                  <Menu size={18} className="text-slate-500 dark:text-slate-400" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-64 bg-[#151025] border border-white/10 shadow-2xl shadow-black/50 overflow-visible p-0"
              >
                <div className="p-2">
                  <div className="px-3 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    {t('common.actions')}
                  </div>
                </div>

                <div className="h-px bg-white/5 my-1" />

                <div className="p-2">
                  <div className="px-3 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    {t('common.export')}
                  </div>
                  <button
                    type="button"
                    onClick={() => void handleExportExcel()}
                    className="flex items-center gap-2 w-full px-3 py-2.5 rounded-lg text-sm text-gray-200 hover:bg-white/5 transition-colors text-left"
                  >
                    <FileSpreadsheet size={16} className="text-emerald-500" />
                    <span>{t('common.exportExcel')}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleExportPDF()}
                    className="flex items-center gap-2 w-full px-3 py-2.5 rounded-lg text-sm text-gray-200 hover:bg-white/5 transition-colors text-left"
                  >
                    <FileText size={16} className="text-red-400" />
                    <span>{t('common.exportPDF')}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleExportPowerPoint()}
                    className="flex items-center gap-2 w-full px-3 py-2.5 rounded-lg text-sm text-gray-200 hover:bg-white/5 transition-colors text-left"
                  >
                    <Presentation size={16} className="text-orange-400" />
                    <span>{t('common.exportPPT')}</span>
                  </button>
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <div className="p-0">
          {lines.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
              <div className="w-20 h-20 rounded-full bg-zinc-50 dark:bg-zinc-900 flex items-center justify-center mb-4 ring-1 ring-zinc-100 dark:ring-zinc-800">
                <Box className="h-8 w-8 text-zinc-300 dark:text-zinc-600" />
              </div>
              <h4 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
                {t('order.lines.empty')}
              </h4>
              <p className="text-sm text-zinc-500 max-w-xs mx-auto">
                {t('order.lines.emptyDescription')}
              </p>
            </div>
          ) : (
            <div
              ref={scrollRef}
              className={cn(
                "w-full overflow-x-auto overscroll-x-contain",
                isDragging ? "cursor-grabbing select-none" : "cursor-grab"
              )}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUpOrLeave}
              onMouseLeave={handleMouseUpOrLeave}
            >
              <table className="w-full caption-bottom text-sm min-w-[1600px] whitespace-nowrap">
                <thead className="[&_tr]:border-b">
                  <tr className={cn("hover:bg-transparent border-b", styles.tableHeadRow)}>
                    <th className={cn("text-left align-middle whitespace-nowrap", styles.tableHead, "pl-6 min-w-[180px] md:min-w-[240px]")}>{t('order.lines.stock')}</th>
                    <th className={cn("text-left align-middle whitespace-nowrap", styles.tableHeadRight, "min-w-[100px] md:min-w-[120px]")}>{t('order.lines.unitPrice')}</th>
                    <th className={cn("text-left align-middle whitespace-nowrap", styles.tableHead, "text-center min-w-[80px] md:min-w-[90px]")}>{t('order.lines.quantity')}</th>
                    <th className={cn("text-left align-middle whitespace-nowrap", styles.tableHead, "text-center min-w-[64px] md:min-w-[72px]")}>{t('order.lines.discount1')}</th>
                    <th className={cn("text-left align-middle whitespace-nowrap", styles.tableHead, "text-center min-w-[64px] md:min-w-[72px]")}>{t('order.lines.discount2')}</th>
                    <th className={cn("text-left align-middle whitespace-nowrap", styles.tableHead, "text-center min-w-[64px] md:min-w-[72px]")}>{t('order.lines.discount3')}</th>
                    <th className={cn("text-left align-middle whitespace-nowrap", styles.tableHeadRight, "min-w-[100px] md:min-w-[120px] pr-6")}>{t('order.lines.netPrice')}</th>
                    {linesEditable && (
                    <th className={cn("text-left align-middle whitespace-nowrap", styles.tableHead, "text-center w-[84px] md:w-[100px]")}>{t('order.actions')}</th>
                    )}
                  </tr>
                </thead>
                <tbody className="[&_tr:last-child]:border-0">
                  {lines.map((line) => {
                    const isRelatedProduct = line.relatedProductKey !== null && line.relatedProductKey !== undefined;
                    const isMainStock = line.isMainRelatedProduct === true;
                    const hasApprovalWarning = line.approvalStatus === 1;

                    return (
                      <tr
                        key={line.id} 
                        className={cn(
                          "border-b transition-colors",
                          styles.tableRow,
                          hasApprovalWarning && "bg-amber-50/60 dark:bg-amber-950/20 border-l-4 border-l-amber-500"
                        )}
                      >
                        {/* STOK BİLGİSİ */}
                        <td className={cn("p-2 align-middle whitespace-nowrap", styles.tableCell, "pl-6")}>
                          <div className="flex flex-col gap-1.5">
                            <div className="font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                              {line.productCode || '-'}
                            </div>
                            {line.productName && (
                              <div className="text-xs font-medium text-zinc-500 line-clamp-1" title={line.productName}>
                                {line.productName}
                              </div>
                            )}
                            {line.unit && (
                              <div className="text-[11px] font-semibold text-purple-600 dark:text-purple-300">
                                {t('order.lines.unit')}: {line.unit}
                              </div>
                            )}

                            {(line.description1 || line.description2 || line.description3) && (
                              <div className="space-y-0.5 text-[11px] text-zinc-500 dark:text-zinc-400">
                                {line.description1 && <div className="line-clamp-1">Profile: {line.description1}</div>}
                                {line.description2 && <div className="line-clamp-1">Demir: {line.description2}</div>}
                                {line.description3 && <div className="line-clamp-1">Vida: {line.description3}</div>}
                              </div>
                            )}
                            
                            <div className="flex flex-wrap gap-2 mt-1">
                              {hasApprovalWarning && (
                                <Badge variant="outline" className="h-5 bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800 gap-1 px-1.5 shadow-sm">
                                  <AlertTriangle className="w-3 h-3" />
                                  <span className="text-[10px] font-bold">{t('order.lines.approvalRequired')}</span>
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

                        <td className={cn("p-2 align-middle whitespace-nowrap", styles.tableCellRight, "pr-4")}>
                          {quickEdit?.lineId === line.id && quickEdit.field === 'unitPrice' ? (
                            <div
                              className="flex items-center justify-end gap-1"
                              onMouseDown={(e) => e.stopPropagation()}
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Input
                                type="number"
                                step={numberInputStep}
                                min={0}
                                value={quickEdit.draft}
                                onChange={(e) => setQuickEdit((q) => (q ? { ...q, draft: e.target.value } : q))}
                                className="h-8 w-[104px] rounded-lg border-pink-500/50 text-sm font-mono px-2"
                                autoFocus
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
                                'font-mono text-zinc-700 dark:text-zinc-300 bg-zinc-100/60 dark:bg-zinc-800/60 px-2 py-1 rounded-lg text-sm',
                                lineAllowsQuickEdit(line) && 'cursor-pointer select-none hover:ring-2 hover:ring-pink-500/25 rounded-lg'
                              )}
                              title={t('order.lines.doubleClickToEdit', 'Çift tıklayarak düzenleyin')}
                              onDoubleClick={(e) => {
                                e.stopPropagation();
                                beginQuickEdit(line, 'unitPrice');
                              }}
                            >
                              {formatCurrency(line.unitPrice, currencyCode)}
                            </span>
                          )}
                        </td>

                        {/* MİKTAR */}
                        <td className={cn("p-2 align-middle whitespace-nowrap", styles.tableCell, "text-center")}>
                          {quickEdit?.lineId === line.id && quickEdit.field === 'quantity' ? (
                            <div
                              className="flex items-center justify-center gap-1"
                              onMouseDown={(e) => e.stopPropagation()}
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Input
                                type="number"
                                step={isIntegerQuantityUnit(line.unit) ? '1' : numberInputStep}
                                min={isIntegerQuantityUnit(line.unit) ? 1 : 0.1}
                                value={quickEdit.draft}
                                onChange={(e) => setQuickEdit((q) => (q ? { ...q, draft: e.target.value } : q))}
                                className="h-8 w-16 rounded-lg border-pink-500/50 text-sm font-bold text-center px-1"
                                autoFocus
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
                                lineAllowsQuickEdit(line) && 'cursor-pointer select-none hover:border-pink-400/60'
                              )}
                              title={t('order.lines.doubleClickToEdit', 'Çift tıklayarak düzenleyin')}
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
                            { rate: line.discountRate1, amount: line.discountAmount1, field: 'discountRate1' as const },
                            { rate: line.discountRate2, amount: line.discountAmount2, field: 'discountRate2' as const },
                            { rate: line.discountRate3, amount: line.discountAmount3, field: 'discountRate3' as const },
                          ] as const
                        ).map((discount) => {
                          const hasDiscount = discount.rate > 0 || discount.amount > 0;
                          const isEditingDiscount =
                            quickEdit?.lineId === line.id && quickEdit.field === discount.field;
                          return (
                            <td
                              key={discount.field}
                              className={cn("p-2 align-middle whitespace-nowrap", styles.tableCell, "text-center")}
                            >
                              {isEditingDiscount ? (
                                <div
                                  className="flex flex-col items-center gap-1"
                                  onMouseDown={(e) => e.stopPropagation()}
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <div className="flex items-center justify-center gap-1">
                                    <Input
                                      type="number"
                                      step={numberInputStep}
                                      min={0}
                                      max={100}
                                      value={quickEdit.draft}
                                      onChange={(e) => setQuickEdit((q) => (q ? { ...q, draft: e.target.value } : q))}
                                      className="h-8 w-14 rounded-lg border-pink-500/50 text-sm font-bold text-center px-1"
                                      autoFocus
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
                                      'cursor-pointer hover:ring-2 hover:ring-pink-500/20'
                                  )}
                                  title={t('order.lines.doubleClickToEdit', 'Çift tıklayarak düzenleyin')}
                                  onDoubleClick={(e) => {
                                    e.stopPropagation();
                                    beginQuickEdit(line, discount.field);
                                  }}
                                >
                                  <span className="text-[11px] font-black leading-none text-emerald-700 dark:text-emerald-300">
                                    %{discount.rate}
                                  </span>
                                  <span className="text-[10px] font-semibold leading-none text-rose-600 dark:text-rose-400">
                                    -{formatCurrency(discount.amount || 0, currencyCode)}
                                  </span>
                                </div>
                              ) : (
                                <span
                                  className={cn(
                                    'inline-flex min-w-[96px] justify-center rounded-xl border border-zinc-200 bg-zinc-50 px-2 py-2 text-[11px] font-semibold text-zinc-400 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-600',
                                    lineAllowsQuickEdit(line) &&
                                      'cursor-pointer hover:border-pink-400/50 hover:text-zinc-600 dark:hover:text-zinc-400'
                                  )}
                                  title={t('order.lines.doubleClickToEdit', 'Çift tıklayarak düzenleyin')}
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

                        {/* TUTAR */}
                        <td className={cn("p-2 align-middle whitespace-nowrap", styles.tableCellRight, "pr-6")}>
                          <span className="font-bold text-zinc-900 dark:text-white text-sm tabular-nums">
                            {formatCurrency(line.lineTotal, currencyCode)}
                          </span>
                        </td>

                        {linesEditable && (
                        <td className={cn("p-2 align-middle whitespace-nowrap", styles.tableCell, "text-center pr-4")}>
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
                              className={cn(styles.actionButton, "text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30")}
                              onClick={() => handleDeleteClick(line.id)}
                              title={t('common.delete.action')}
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

      <Dialog open={addLineDialogOpen} onOpenChange={setAddLineDialogOpen}>
        <DialogContent showCloseButton={false} className="w-[calc(100vw-1rem)] sm:w-[calc(100vw-2rem)] max-w-[96vw] xl:max-w-[1200px] max-h-[92vh] p-0 overflow-hidden bg-white dark:bg-[#130822] border border-slate-100 dark:border-white/10 text-slate-900 dark:text-white shadow-2xl">
          <DialogHeader className="px-4 sm:px-6 py-3 border-b border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-[#1a1025]/50 flex flex-row items-center justify-between sticky top-0 z-10 backdrop-blur-sm">
            <DialogTitle className="text-slate-900 dark:text-white flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-linear-to-br from-pink-500 to-orange-500 p-0.5 shadow-lg shadow-pink-500/20">
                <div className="h-full w-full bg-white dark:bg-[#130822] rounded-[10px] flex items-center justify-center">
                  <Plus className="h-5 w-5 text-pink-600 dark:text-pink-500" />
                </div>
              </div>
              {t('order.lines.addLine')}
            </DialogTitle>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-white/10 transition-colors"
              onClick={() => setAddLineDialogOpen(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </DialogHeader>
          <div className="px-3 sm:px-6 py-3 sm:py-4 overflow-y-auto max-h-[calc(90vh-76px)]">
            {newLine && (
              <OrderLineForm
                line={newLine}
                onSave={handleSaveNewLine}
                onSaveMultiple={handleSaveMultipleLines}
                onCancel={handleCancelNewLine}
                currency={currency}
                exchangeRates={exchangeRates}
                pricingRules={pricingRules}
                userDiscountLimits={userDiscountLimits}
                isSaving={createMutation.isPending}
                existingLineStockMarkers={existingDocumentLineMarkers}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={editLineDialogOpen} onOpenChange={setEditLineDialogOpen}>
        <DialogContent showCloseButton={false} className="w-[calc(100vw-1rem)] sm:w-[calc(100vw-2rem)] max-w-[96vw] xl:max-w-[1200px] max-h-[92vh] p-0 overflow-hidden bg-white dark:bg-[#130822] border border-slate-100 dark:border-white/10 text-slate-900 dark:text-white shadow-2xl">
          <DialogHeader className="px-4 sm:px-6 py-3 border-b border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-[#1a1025]/50 flex flex-row items-center justify-between sticky top-0 z-10 backdrop-blur-sm">
            <DialogTitle className="text-slate-900 dark:text-white flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-linear-to-br from-blue-500 to-indigo-500 p-0.5 shadow-lg shadow-blue-500/20">
                <div className="h-full w-full bg-white dark:bg-[#130822] rounded-[10px] flex items-center justify-center">
                  <Edit className="h-5 w-5 text-blue-600 dark:text-blue-500" />
                </div>
              </div>
              {t('order.lines.editLine')}
            </DialogTitle>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-white/10 transition-colors"
              onClick={() => setEditLineDialogOpen(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </DialogHeader>
          <div className="px-3 sm:px-6 py-3 sm:py-4 overflow-y-auto max-h-[calc(90vh-76px)]">
            {lineToEdit && (
              <OrderLineForm
                line={lineToEdit}
                onSave={(line) => handleSaveLine(line)}
                onSaveMultiple={(lines) => {
                  if (lines.length > 0) {
                    handleSaveLine(lines[0], lines.slice(1));
                  }
                }}
                onCancel={handleCancelEditLine}
                currency={currency}
                exchangeRates={exchangeRates}
                pricingRules={pricingRules}
                userDiscountLimits={userDiscountLimits}
                isSaving={updateMutation.isPending}
                existingLineStockMarkers={existingDocumentLineMarkersForEdit}
                allowImageUpload={Boolean(parseLineId(lineToEdit.id))}
                imageUploadScope="order-line"
                imageUploadExtras={{
                  orderId: orderId ?? undefined,
                  orderLineId: parseLineId(lineToEdit.id) ?? undefined,
                }}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

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
              <div className="bg-linear-to-br from-red-500 to-rose-600 p-2.5 rounded-xl shadow-lg shadow-red-500/20 text-white">
                <Trash2 className="h-5 w-5" />
              </div>
              {relatedLinesCount > 1
                ? t('order.lines.delete.confirmTitleMultiple')
                : t('order.lines.delete.confirmTitle')}
            </DialogTitle>
            <DialogDescription className="pt-2 text-slate-500 dark:text-slate-400 text-sm leading-relaxed">
              {relatedLinesCount > 1
                ? t('order.lines.delete.confirmMessageMultiple', { count: relatedLinesCount })
                : t('order.lines.delete.confirmMessage')
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
              {t('order.cancel')}
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
              className="h-11 px-6 rounded-xl bg-linear-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white shadow-lg shadow-red-500/25 hover:shadow-red-500/40 border-0 font-medium transition-all"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  {t('order.saving')}
                </>
              ) : (
                t('order.delete')
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

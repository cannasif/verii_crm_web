import { type ReactElement, useState, useMemo, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { DemandLineForm } from './DemandLineForm';
import { ProductSelectDialog, type ProductSelectionResult } from '@/components/shared/ProductSelectDialog';
import { useCurrencyOptions } from '@/services/hooks/useCurrencyOptions';
import { useProductSelection } from '../hooks/useProductSelection';
import { useDemandCalculations } from '../hooks/useDemandCalculations';
import { useCreateDemandLines } from '../hooks/useCreateDemandLines';
import { useUpdateDemandLines } from '../hooks/useUpdateDemandLines';
import { useDeleteDemandLine } from '../hooks/useDeleteDemandLine';
import { demandApi } from '../api/demand-api';
import { formatCurrency } from '../utils/format-currency';
import { Trash2, Edit, Plus, ShoppingCart, Box, AlertTriangle, Layers, Loader2, X } from 'lucide-react';
import type { DemandLineFormState, DemandExchangeRateFormState, PricingRuleLineGetDto, UserDiscountLimitDto, CreateDemandLineDto, DemandLineGetDto } from '../types/demand-types';
import { cn } from '@/lib/utils';

function toCreateDto(line: DemandLineFormState, demandId: number): CreateDemandLineDto {
  const { id, isEditing, relatedLines, ...rest } = line;
  return {
    ...rest,
    demandId,
    productId: line.productId ?? 0,
    productCode: line.productCode ?? '',
    productName: line.productName ?? '',
    approvalStatus: line.approvalStatus ?? 0,
    erpProjectCode: line.projectCode ?? null,
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

function dtoToFormState(dto: DemandLineGetDto, index: number): DemandLineFormState {
  return {
    id: dto.id && dto.id > 0 ? `line-${dto.id}-${index}` : `line-temp-${index}`,
    isEditing: false,
    productId: dto.productId ?? null,
    productCode: dto.productCode ?? '',
    productName: dto.productName,
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
    relatedStockId: dto.relatedStockId ?? null,
    relatedProductKey: dto.relatedProductKey ?? null,
    isMainRelatedProduct: dto.isMainRelatedProduct ?? false,
    approvalStatus: dto.approvalStatus ?? 0,
  };
}

function toUpdateDto(line: DemandLineFormState, demandId: number): DemandLineGetDto {
  const lineId = parseLineId(line.id) ?? 0;
  return {
    id: lineId,
    demandId,
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
    relatedStockId: line.relatedStockId ?? null,
    relatedProductKey: line.relatedProductKey ?? null,
    isMainRelatedProduct: line.isMainRelatedProduct ?? false,
    approvalStatus: line.approvalStatus ?? 0,
    createdAt: '',
  };
}

interface DemandLineTableProps {
  lines: DemandLineFormState[];
  setLines: (lines: DemandLineFormState[]) => void;
  currency: number;
  exchangeRates?: DemandExchangeRateFormState[];
  pricingRules?: PricingRuleLineGetDto[];
  userDiscountLimits?: UserDiscountLimitDto[];
  customerId?: number | null;
  erpCustomerCode?: string | null;
  representativeId?: number | null;
  demandId?: number | null;
  enabled?: boolean;
}

export function DemandLineTable({
  lines,
  setLines,
  currency,
  exchangeRates = [],
  pricingRules = [],
  userDiscountLimits = [],
  customerId,
  erpCustomerCode,
  representativeId,
  demandId,
  enabled = true,
}: DemandLineTableProps): ReactElement {
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
  const [newLine, setNewLine] = useState<DemandLineFormState | null>(null);
  const [editLineDialogOpen, setEditLineDialogOpen] = useState(false);
  const [lineToEdit, setLineToEdit] = useState<DemandLineFormState | null>(null);
  const { currencyOptions } = useCurrencyOptions();
  const { calculateLineTotals } = useDemandCalculations();
  const createMutation = useCreateDemandLines(demandId ?? 0);
  const updateMutation = useUpdateDemandLines(demandId ?? 0);
  const deleteMutation = useDeleteDemandLine(demandId ?? 0);
  const isExistingDemand = demandId != null && demandId > 0;
  const isDeleting = deleteMutation.isPending;
  const { handleProductSelect: handleProductSelectHook, handleProductSelectWithRelatedStocks } = useProductSelection({
    currency,
    exchangeRates,
  });

  const styles = {
    glassCard: "relative overflow-hidden rounded-none border border-zinc-200 dark:border-zinc-800 bg-white/95 dark:bg-zinc-900/50 backdrop-blur-xl shadow-lg shadow-zinc-200/50 dark:shadow-none",
    tableHeadRow: "bg-zinc-50/80 dark:bg-zinc-900/50 border-b border-zinc-200 dark:border-zinc-800",
    tableHead: "h-11 px-4 text-xs font-bold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider",
    tableCell: "p-4 text-sm font-medium text-zinc-700 dark:text-zinc-200 border-b border-zinc-100 dark:border-zinc-800",
    tableRow: "group transition-all duration-200 hover:bg-zinc-50 dark:hover:bg-zinc-800/40",
    actionButton: "h-8 w-8 p-0 rounded-lg hover:bg-white dark:hover:bg-zinc-700 hover:shadow-sm hover:scale-105 transition-all duration-200",
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
    if (!linesEditable) return;
    if ((!customerId && !erpCustomerCode) || !representativeId || !isCurrencySelected) {
      toast.error(t('demand.error'), {
        description: t('demand.lines.requiredFieldsMissing'),
      });
      return;
    }

    const line: DemandLineFormState = {
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

  const handleSaveNewLine = useCallback(
    async (line: DemandLineFormState): Promise<void> => {
      const lineToAdd = { ...line, isEditing: false };
      if (isExistingDemand && demandId) {
          try {
            const dtos: CreateDemandLineDto[] = [toCreateDto(lineToAdd, demandId)];
            const created = await createMutation.mutateAsync(dtos);
            const mapped = created.map((dto: DemandLineGetDto, i: number) => dtoToFormState(dto, lines.length + i));
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
      [isExistingDemand, demandId, createMutation, lines, setLines]
    );

  const handleSaveMultipleLines = useCallback(
    async (newLines: DemandLineFormState[]): Promise<void> => {
      if (!linesEditable) return;
      const linesToAdd = newLines.map((l) => ({ ...l, isEditing: false }));
      if (isExistingDemand && demandId) {
          try {
            const dtos: CreateDemandLineDto[] = linesToAdd.map((l) => toCreateDto(l, demandId));
            const created = await createMutation.mutateAsync(dtos);
            const mapped = created.map((dto: DemandLineGetDto, i: number) => dtoToFormState(dto, lines.length + i));
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
    [isExistingDemand, demandId, createMutation, lines, setLines, linesEditable]
  );

  const handleCancelNewLine = (): void => {
    setAddLineDialogOpen(false);
    setNewLine(null);
  };

  const handleProductSelect = async (product: ProductSelectionResult): Promise<void> => {
    if ((!customerId && !erpCustomerCode) || !representativeId || !isCurrencySelected) {
      toast.error(t('demand.error'), {
        description: t('demand.lines.requiredFieldsMissing'),
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
    updatedLine: DemandLineFormState,
    relatedLinesToUpdate: DemandLineFormState[] | undefined,
    originalLine: DemandLineFormState
  ): void => {
    const isQuantityChanged = originalLine.quantity !== updatedLine.quantity;
    const isMainLine = updatedLine.isMainRelatedProduct === true;

    if (relatedLinesToUpdate && relatedLinesToUpdate.length > 0) {
      const allUpdatedLines = [updatedLine, ...relatedLinesToUpdate].map((line) => ({ ...line, isEditing: false }));
      setLines(lines.map((line) => {
        const updated = allUpdatedLines.find((ul) => ul.id === line.id);
        if (updated) return updated;
        if (isQuantityChanged && isMainLine && updatedLine.relatedProductKey && line.relatedProductKey === updatedLine.relatedProductKey) {
          const quantityRatio = updatedLine.quantity / originalLine.quantity;
          return calculateLineTotals({ ...line, quantity: line.quantity * quantityRatio });
        }
        return line;
      }));
    } else if (isQuantityChanged && isMainLine && updatedLine.relatedProductKey) {
      const quantityRatio = updatedLine.quantity / originalLine.quantity;
      setLines(lines.map((line) => {
        if (line.id === updatedLine.id) return { ...updatedLine, isEditing: false };
        if (line.relatedProductKey === updatedLine.relatedProductKey) {
          return calculateLineTotals({ ...line, quantity: line.quantity * quantityRatio });
        }
        return line;
      }));
    } else {
      setLines(lines.map((line) => line.id === updatedLine.id ? { ...updatedLine, isEditing: false } : line));
    }
  };

  const handleSaveLine = async (
    updatedLine: DemandLineFormState,
    relatedLinesToUpdate?: DemandLineFormState[]
  ): Promise<void> => {
    const originalLine = lines.find((l) => l.id === updatedLine.id);
    if (!originalLine) {
      setEditLineDialogOpen(false);
      setLineToEdit(null);
      return;
    }

    const allUpdatedLines = [updatedLine, ...(relatedLinesToUpdate || [])].map((l) => ({ ...l, isEditing: false }));
    const linesWithBackendId = allUpdatedLines.filter((l) => parseLineId(l.id) != null);

    if (isExistingDemand && demandId && linesWithBackendId.length > 0) {
        try {
          const dtos: DemandLineGetDto[] = linesWithBackendId.map((l) => toUpdateDto(l, demandId));
          await updateMutation.mutateAsync(dtos);
          const fresh = await demandApi.getDemandLinesByDemandId(demandId);
          const mapped = fresh.map((dto, index) => dtoToFormState(dto, index));
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
    if (isExistingDemand && demandId) {
      const lineBackendId = parseLineId(lineToDeleteObj.id);
      const did = Number(demandId);
      if (lineBackendId == null) {
        removeFromList();
        return;
      }
      if (!Number.isFinite(did) || did < 1) {
        removeFromList();
        return;
      }
      deleteMutation.mutate(lineBackendId, {
        onSuccess: async (): Promise<void> => {
          const fresh = await demandApi.getDemandLinesByDemandId(did);
          const mapped = fresh.map((dto, index) => dtoToFormState(dto, index));
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

  const canAddLine = linesEditable && Boolean((customerId || erpCustomerCode) && representativeId && isCurrencySelected);

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
                {t('demand.lines.title')}
              </h3>
              <p className="text-xs text-zinc-500 font-medium">
                {lines.length > 0 
                  ? t('demand.lines.itemCount', { count: lines.length })
                  : t('demand.lines.noItems')
                }
              </p>
            </div>
          </div>
          
         {linesEditable && (
          <Button 
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleAddLine();
            }}
            disabled={!canAddLine}
            size="sm"
            className="h-10 px-6 rounded-xl bg-linear-to-r from-pink-600 to-orange-600 text-white font-bold shadow-lg shadow-pink-500/20 hover:scale-105 active:scale-95 transition-all duration-300 border-0 hover:text-white disabled:opacity-50 disabled:pointer-events-none disabled:hover:scale-100"
          >
            <Plus className="h-4 w-4 mr-2" />
            {t('demand.lines.add')}
          </Button>
          )}
          
        </div>

        <div className="p-0">
          {lines.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
              <div className="w-20 h-20 rounded-full bg-zinc-50 dark:bg-zinc-900 flex items-center justify-center mb-4 ring-1 ring-zinc-100 dark:ring-zinc-800">
                <Box className="h-8 w-8 text-zinc-300 dark:text-zinc-600" />
              </div>
              <h4 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
                {t('demand.lines.empty')}
              </h4>
              <p className="text-sm text-zinc-500 max-w-xs mx-auto">
                {t('demand.lines.emptyDescription')}
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
                    <th className={cn("text-left align-middle whitespace-nowrap", styles.tableHead, "pl-6 min-w-[180px] md:min-w-[240px]")}>{t('demand.lines.stock')}</th>
                    <th className={cn("text-left align-middle whitespace-nowrap", styles.tableHead, "text-right min-w-[120px] md:min-w-[140px]")}>{t('demand.lines.unitPrice')}</th>
                    <th className={cn("text-left align-middle whitespace-nowrap", styles.tableHead, "text-center min-w-[90px] md:min-w-[100px]")}>{t('demand.lines.quantity')}</th>
                    <th className={cn("text-left align-middle whitespace-nowrap", styles.tableHead, "text-center min-w-[70px] md:min-w-[80px]")}>{t('demand.lines.discount1')}</th>
                    <th className={cn("text-left align-middle whitespace-nowrap", styles.tableHead, "text-center min-w-[70px] md:min-w-[80px]")}>{t('demand.lines.discount2')}</th>
                    <th className={cn("text-left align-middle whitespace-nowrap", styles.tableHead, "text-center min-w-[70px] md:min-w-[80px]")}>{t('demand.lines.discount3')}</th>
                    <th className={cn("text-left align-middle whitespace-nowrap", styles.tableHead, "text-right min-w-[110px] md:min-w-[120px]")}>{t('demand.lines.netPrice')}</th>
                    {linesEditable && (
                    <th className={cn("text-left align-middle whitespace-nowrap", styles.tableHead, "text-center w-[84px] md:w-[100px]")}>{t('demand.actions')}</th>
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

                            {(line.description1 || line.description2 || line.description3) && (
                              <div className="space-y-0.5 text-[11px] text-zinc-500 dark:text-zinc-400">
                                {line.description1 && <div className="line-clamp-1">Açıklama 1: {line.description1}</div>}
                                {line.description2 && <div className="line-clamp-1">Açıklama 2: {line.description2}</div>}
                                {line.description3 && <div className="line-clamp-1">Açıklama 3: {line.description3}</div>}
                              </div>
                            )}
                            
                            <div className="flex flex-wrap gap-2 mt-1">
                              {hasApprovalWarning && (
                                <Badge variant="outline" className="h-5 bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800 gap-1 px-1.5 shadow-sm">
                                  <AlertTriangle className="w-3 h-3" />
                                  <span className="text-[10px] font-bold">Onay Gerekli</span>
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

                        <td className={cn("p-2 align-middle whitespace-nowrap", styles.tableCell, "text-right")}>
                          <div className="font-mono font-semibold text-zinc-700 dark:text-zinc-300 bg-zinc-100/50 dark:bg-zinc-800/50 px-2 py-1 rounded inline-block">
                            {formatCurrency(line.unitPrice, currencyCode)}
                          </div>
                        </td>

                        {/* MİKTAR */}
                        <td className={cn("p-2 align-middle whitespace-nowrap", styles.tableCell, "text-center")}>
                          <span className="inline-flex items-center justify-center min-w-10 h-7 px-2 rounded-lg bg-white border border-zinc-200 dark:bg-zinc-800 dark:border-zinc-700 text-sm font-bold text-zinc-900 dark:text-zinc-100 shadow-sm">
                            {line.quantity}
                          </span>
                        </td>

                        {[
                          { rate: line.discountRate1, amount: line.discountAmount1 },
                          { rate: line.discountRate2, amount: line.discountAmount2 },
                          { rate: line.discountRate3, amount: line.discountAmount3 },
                        ].map((discount, i) => {
                          const hasDiscount = discount.rate > 0 || discount.amount > 0;
                          return (
                            <td key={i} className={cn("p-2 align-middle whitespace-nowrap", styles.tableCell, "text-center")}>
                              {hasDiscount ? (
                                <div className="inline-flex min-w-[96px] flex-col items-center gap-1 rounded-xl border border-emerald-200/80 bg-emerald-50/70 px-2 py-1.5 shadow-sm dark:border-emerald-900/40 dark:bg-emerald-950/20">
                                  <span className="text-[11px] font-black leading-none text-emerald-700 dark:text-emerald-300">
                                    %{discount.rate}
                                  </span>
                                  <span className="text-[10px] font-semibold leading-none text-rose-600 dark:text-rose-400">
                                    -{formatCurrency(discount.amount || 0, currencyCode)}
                                  </span>
                                </div>
                              ) : (
                                <span className="inline-flex min-w-[96px] justify-center rounded-xl border border-zinc-200 bg-zinc-50 px-2 py-2 text-[11px] font-semibold text-zinc-400 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-600">
                                  İndirim yok
                                </span>
                              )}
                            </td>
                          );
                        })}

                        {/* TUTAR */}
                        <td className={cn("p-2 align-middle whitespace-nowrap", styles.tableCell, "text-right")}>
                          <div className="font-bold text-zinc-900 dark:text-white text-base">
                            {formatCurrency(line.lineTotal, currencyCode)}
                          </div>
                        </td>

                        {linesEditable && (
                        <td className={cn("p-2 align-middle whitespace-nowrap", styles.tableCell, "text-center pr-4")}>
                          <div className="flex items-center justify-center gap-2">
                            <Button
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
                              variant="ghost"
                              size="icon"
                              className={cn(styles.actionButton, "text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30")}
                              onClick={() => handleDeleteClick(line.id)}
                              title="Sil"
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
              {t('demand.lines.addLine')}
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
              <DemandLineForm
                line={newLine}
                onSave={handleSaveNewLine}
                onSaveMultiple={handleSaveMultipleLines}
                onCancel={handleCancelNewLine}
                currency={currency}
                exchangeRates={exchangeRates}
                pricingRules={pricingRules}
                userDiscountLimits={userDiscountLimits}
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
              {t('demand.lines.editLine')}
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
              <DemandLineForm
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
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-rose-600">
              <Trash2 className="h-5 w-5" />
              {relatedLinesCount > 1
                ? t('demand.lines.delete.confirmTitleMultiple')
                : t('demand.lines.delete.confirmTitle')}
            </DialogTitle>
            <DialogDescription className="pt-2">
              {relatedLinesCount > 1 
                ? t('demand.lines.delete.confirmMessageMultiple', { count: relatedLinesCount })
                : t('demand.lines.delete.confirmMessage')
              }
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={handleDeleteCancel} disabled={isDeleting}>{t('demand.cancel')}</Button>
            <Button variant="destructive" onClick={() => void handleDeleteConfirm()} disabled={isDeleting}>
              {isDeleting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />{t('demand.saving')}</> : t('demand.delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

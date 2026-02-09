import { type ReactElement, useState, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
import { Trash2, Edit, Plus, ShoppingCart, Box, AlertTriangle, Layers, Loader2 } from 'lucide-react';
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
    pricingRuleHeaderId: dto.pricingRuleHeaderId ?? null,
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
    pricingRuleHeaderId: line.pricingRuleHeaderId ?? null,
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
    glassCard: "relative overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white/95 dark:bg-zinc-900/50 backdrop-blur-xl shadow-lg shadow-zinc-200/50 dark:shadow-none",
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

  const handleAddLine = (): void => {
    if (!linesEditable) return;
    if ((!customerId && !erpCustomerCode) || !representativeId || !isCurrencySelected) {
      toast.error(t('demand.error', 'Hata'), {
        description: t('demand.lines.requiredFieldsMissing', 'Lütfen müşteri, temsilci ve para birimi seçimlerini yapınız.'),
      });
      return;
    }

    const line: DemandLineFormState = {
      id: `temp-${Date.now()}`,
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
      vatRate: 18,
      vatAmount: 0,
      lineTotal: 0,
      lineGrandTotal: 0,
      description: null,
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
      toast.error(t('demand.error', 'Hata'), {
        description: t('demand.lines.requiredFieldsMissing', 'Lütfen müşteri, temsilci ve para birimi seçimlerini yapınız.'),
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

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className={styles.glassCard}>
        <div className="p-5 border-b border-zinc-200 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg shadow-indigo-500/20 text-white">
              <ShoppingCart className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-zinc-900 dark:text-white">
                {t('demand.lines.title', 'Teklif Kalemleri')}
              </h3>
              <p className="text-xs text-zinc-500 font-medium">
                {lines.length > 0 
                  ? t('demand.lines.itemCount', '{count} kalem ürün listeleniyor', { count: lines.length })
                  : t('demand.lines.noItems', 'Henüz ürün eklenmedi')
                }
              </p>
            </div>
          </div>
          
          {linesEditable && (
          <Button 
            onClick={handleAddLine} 
            size="sm"
            className="h-10 px-6 rounded-xl bg-gradient-to-r from-pink-600 to-orange-600 text-white font-bold shadow-lg shadow-pink-500/20 hover:scale-105 active:scale-95 transition-all duration-300 border-0 hover:text-white"
          >
            <Plus className="h-4 w-4 mr-2" />
            {t('demand.lines.add', 'Satır Ekle')}
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
                {t('demand.lines.empty', 'Sepetiniz Boş')}
              </h4>
              <p className="text-sm text-zinc-500 max-w-xs mx-auto">
                {t('demand.lines.emptyDescription', 'Teklif oluşturmak için "Satır Ekle" butonunu kullanarak ürün eklemeye başlayın.')}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className={styles.tableHeadRow}>
                    <TableHead className={cn(styles.tableHead, "pl-6 min-w-[180px] md:min-w-[240px]")}>{t('demand.lines.stock', 'Stok Bilgisi')}</TableHead>
                    <TableHead className={cn(styles.tableHead, "text-right min-w-[120px] md:min-w-[140px]")}>{t('demand.lines.unitPrice', 'Birim Fiyat')}</TableHead>
                    <TableHead className={cn(styles.tableHead, "text-center min-w-[90px] md:min-w-[100px]")}>{t('demand.lines.quantity', 'Miktar')}</TableHead>
                    <TableHead className={cn(styles.tableHead, "text-center min-w-[70px] md:min-w-[80px]")}>{t('demand.lines.discount1', 'İnd.1')}</TableHead>
                    <TableHead className={cn(styles.tableHead, "text-center min-w-[70px] md:min-w-[80px]")}>{t('demand.lines.discount2', 'İnd.2')}</TableHead>
                    <TableHead className={cn(styles.tableHead, "text-center min-w-[70px] md:min-w-[80px]")}>{t('demand.lines.discount3', 'İnd.3')}</TableHead>
                    <TableHead className={cn(styles.tableHead, "text-right min-w-[110px] md:min-w-[120px]")}>{t('demand.lines.netPrice', 'Tutar')}</TableHead>
                    {!linesEditable && (
                    <TableHead className={cn(styles.tableHead, "text-center w-[84px] md:w-[100px]")}>{t('demand.actions', 'İşlem')}</TableHead>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lines.map((line) => {
                    const isRelatedProduct = line.relatedProductKey !== null && line.relatedProductKey !== undefined;
                    const isMainStock = line.isMainRelatedProduct === true;
                    const hasApprovalWarning = line.approvalStatus === 1;

                    return (
                      <TableRow 
                        key={line.id} 
                        className={cn(
                          styles.tableRow,
                          hasApprovalWarning && "bg-amber-50/60 dark:bg-amber-950/20 border-l-4 border-l-amber-500"
                        )}
                      >
                        {/* STOK BİLGİSİ */}
                        <TableCell className={cn(styles.tableCell, "pl-6")}>
                          <div className="flex flex-col gap-1.5">
                            <div className="font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                              {line.productCode || '-'}
                            </div>
                            {line.productName && (
                              <div className="text-xs font-medium text-zinc-500 line-clamp-1" title={line.productName}>
                                {line.productName}
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
                        </TableCell>

                        <TableCell className={cn(styles.tableCell, "text-right")}>
                          <div className="font-mono font-semibold text-zinc-700 dark:text-zinc-300 bg-zinc-100/50 dark:bg-zinc-800/50 px-2 py-1 rounded inline-block">
                            {formatCurrency(line.unitPrice, currencyCode)}
                          </div>
                        </TableCell>

                        {/* MİKTAR */}
                        <TableCell className={cn(styles.tableCell, "text-center")}>
                          <span className="inline-flex items-center justify-center min-w-[2.5rem] h-7 px-2 rounded-lg bg-white border border-zinc-200 dark:bg-zinc-800 dark:border-zinc-700 text-sm font-bold text-zinc-900 dark:text-zinc-100 shadow-sm">
                            {line.quantity}
                          </span>
                        </TableCell>

                        {[line.discountRate1, line.discountRate2, line.discountRate3].map((rate, i) => (
                          <TableCell key={i} className={cn(styles.tableCell, "text-center")}>
                            {rate > 0 ? (
                              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 border border-emerald-100 dark:bg-emerald-950/30 dark:border-emerald-900/30 px-1.5 py-0.5 rounded shadow-sm">
                                %{rate}
                              </span>
                            ) : (
                              <span className="text-zinc-300 dark:text-zinc-700 text-xs font-medium">-</span>
                            )}
                          </TableCell>
                        ))}

                        {/* TUTAR */}
                        <TableCell className={cn(styles.tableCell, "text-right")}>
                          <div className="font-bold text-zinc-900 dark:text-white text-base">
                            {formatCurrency(line.lineTotal, currencyCode)}
                          </div>
                        </TableCell>

                        {linesEditable && (
                        <TableCell className={cn(styles.tableCell, "text-center pr-4")}>
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
                        </TableCell>
                        )}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
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
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('demand.lines.addLine', 'Yeni Satır Ekle')}</DialogTitle>
            <DialogDescription>{t('demand.lines.addLineDescription', 'Teklif satırı bilgilerini giriniz')}</DialogDescription>
          </DialogHeader>
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
        </DialogContent>
      </Dialog>

      <Dialog open={editLineDialogOpen} onOpenChange={setEditLineDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('demand.lines.editLine', 'Satırı Düzenle')}</DialogTitle>
            <DialogDescription>{t('demand.lines.editLineDescription', 'Teklif satırı bilgilerini düzenleyiniz')}</DialogDescription>
          </DialogHeader>
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
        </DialogContent>
      </Dialog>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-rose-600">
              <Trash2 className="h-5 w-5" />
              {relatedLinesCount > 1
                ? t('demand.lines.delete.confirmTitleMultiple', 'Bağlı Stokları Sil')
                : t('demand.lines.delete.confirmTitle', 'Satırı Sil')}
            </DialogTitle>
            <DialogDescription className="pt-2">
              {relatedLinesCount > 1 
                ? t('demand.lines.delete.confirmMessageMultiple', 'Bu satır silindiğinde bağlı olan diğer {count} stok da silinecektir.', { count: relatedLinesCount })
                : t('demand.lines.delete.confirmMessage', 'Bu satırı silmek istediğinizden emin misiniz?')
              }
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={handleDeleteCancel} disabled={isDeleting}>{t('demand.cancel', 'İptal')}</Button>
            <Button variant="destructive" onClick={() => void handleDeleteConfirm()} disabled={isDeleting}>
              {isDeleting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />{t('demand.saving', 'Siliniyor...')}</> : t('demand.delete', 'Sil')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

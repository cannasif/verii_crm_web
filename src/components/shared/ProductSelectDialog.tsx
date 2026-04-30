import { type ReactElement, useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { LayoutGrid, List as ListIcon, X, AlertCircle, Filter } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { getImageUrl } from '@/features/stock/utils/image-url';
import { stockApi } from '@/features/stock/api/stock-api';
import { RelatedStocksSelectionDialog, type RelatedStockSelectionConfirmItem } from './RelatedStocksSelectionDialog';
import { cn } from '@/lib/utils';
import type { StockGetDto, StockGetWithMainImageDto, StockRelationDto } from '@/features/stock/types';
import { useDropdownInfiniteSearch } from '@/hooks/useDropdownInfiniteSearch';
import { dropdownApi } from '@/components/shared/dropdown/dropdown-api';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { AdvancedFilter } from '@/components/shared/AdvancedFilter';
import {
  rowsToBackendFilters,
  type FilterColumnConfig,
  type FilterRow,
} from '@/lib/advanced-filter-types';
import {
  DROPDOWN_MIN_CHARS,
  DROPDOWN_PAGE_SIZE,
  DROPDOWN_SCROLL_THRESHOLD,
} from '@/components/shared/dropdown/constants';

const POPUP_SEARCH_DEBOUNCE_MS = 700;

const STOCK_FILTER_COLUMNS: readonly FilterColumnConfig[] = [
  { value: 'Id', type: 'number', labelKey: 'columnId' },
  { value: 'ErpStockCode', type: 'string', labelKey: 'columnErpStockCode' },
  { value: 'StockName', type: 'string', labelKey: 'columnStockName' },
  { value: 'grupKodu', type: 'string', labelKey: 'columnGroupCode' },
  { value: 'grupAdi', type: 'string', labelKey: 'columnGroupName' },
  { value: 'kod1', type: 'string', labelKey: 'columnCode1' },
  { value: 'kod1Adi', type: 'string', labelKey: 'columnCode1Name' },
  { value: 'kod2', type: 'string', labelKey: 'columnCode2' },
  { value: 'kod2Adi', type: 'string', labelKey: 'columnCode2Name' },
  { value: 'kod3', type: 'string', labelKey: 'columnCode3' },
  { value: 'kod3Adi', type: 'string', labelKey: 'columnCode3Name' },
  { value: 'kod4', type: 'string', labelKey: 'columnCode4' },
  { value: 'kod4Adi', type: 'string', labelKey: 'columnCode4Name' },
  { value: 'kod5', type: 'string', labelKey: 'columnCode5' },
  { value: 'kod5Adi', type: 'string', labelKey: 'columnCode5Name' },
  { value: 'ureticiKodu', type: 'string', labelKey: 'columnManufacturerCode' },
  { value: 'unit', type: 'string', labelKey: 'columnUnit' },
  { value: 'branchCode', type: 'number', labelKey: 'columnBranchCode' },
] as const;

export interface ProductSelectionResult {
  id?: number;
  code: string;
  name: string;
  unit?: string;
  vatRate?: number;
  groupCode?: string;
  relatedStockIds?: number[];
  relatedStockQuantitiesById?: Record<number, number>;
}

export function stockMatchesDraftSnapshot(
  stock: { id: number; erpStockCode: string },
  snapshot: ProductSelectionResult[]
): boolean {
  if (!snapshot.length) return false;
  const code = (stock.erpStockCode ?? '').trim();
  return snapshot.some(
    (item) =>
      (item.id != null && item.id === stock.id) ||
      (Boolean((item.code ?? '').trim()) && (item.code ?? '').trim() === code)
  );
}

interface ProductSelectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (result: ProductSelectionResult) => void | Promise<void>;
  onMultiSelect?: (results: ProductSelectionResult[]) => void | Promise<void>;
  multiSelect?: boolean;
  disableRelatedStocks?: boolean;
  initialSelectedResults?: ProductSelectionResult[];
  /** Belgede (tabloda) zaten satırı olan stoklar — “Satırda” rozeti */
  existingLineStockMarkers?: ProductSelectionResult[];
}

interface StockCardProps {
  stock: StockGetDto;
  onClick: () => void;
  onRelatedStockSelect?: (stock: StockGetDto) => void;
  selected?: boolean;
  alreadyInDraft?: boolean;
  alreadyOnDocumentLine?: boolean;
}

interface StockWithImageCardProps {
  stock: StockGetWithMainImageDto;
  onClick: () => void;
  onRelatedStockSelect?: (stock: StockGetDto) => void;
  selected?: boolean;
  alreadyInDraft?: boolean;
  alreadyOnDocumentLine?: boolean;
}

function StockCard({
  stock,
  onClick,
  onRelatedStockSelect,
  selected = false,
  alreadyInDraft = false,
  alreadyOnDocumentLine = false,
}: StockCardProps): ReactElement {
  const { t } = useTranslation('common');
  const hasRelatedStocks = stock.parentRelations && stock.parentRelations.length > 0;
  const codePairs = [
    { leftLabel: 'Kod1', leftValue: stock.kod1 || '-', rightLabel: 'Kod2', rightValue: stock.kod2 || '-' },
    { leftLabel: 'Kod3', leftValue: stock.kod3 || '-', rightLabel: 'Kod4', rightValue: stock.kod4 || '-' },
  ];
  const chipCodes = [stock.kod5, stock.grupKodu].filter(Boolean) as string[];

  const handleRelatedStockClick = async (e: React.MouseEvent, relatedStock: StockRelationDto): Promise<void> => {
    e.stopPropagation();
    if (onRelatedStockSelect) {
      try {
        const relatedStockData = await stockApi.getById(relatedStock.relatedStockId);
        if (relatedStockData) {
          onRelatedStockSelect(relatedStockData);
        }
      } catch (error) {
        console.error('Related stock bilgisi alınamadı:', error);
      }
    }
  };

  return (
    <Card
      className={cn(
        'group h-[202px] cursor-pointer transition-all duration-200',
        'bg-white dark:bg-[#1a1025]/45 border-slate-300 dark:border-white/10',
        selected
          ? 'border-pink-400 ring-1 ring-pink-300 dark:ring-pink-500/40 shadow-sm'
          : 'hover:border-pink-400/70 dark:hover:border-pink-500/50 hover:shadow-md hover:shadow-pink-500/10',
        'active:scale-[0.98] touch-manipulation'
      )}
      onClick={onClick}
    >
      <CardContent className="flex h-full flex-col p-3.5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="mb-1.5 flex flex-wrap items-center gap-2">
              <span
                className="max-w-[150px] truncate rounded border border-pink-200 bg-pink-100 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-pink-700 dark:border-pink-700/40 dark:bg-pink-900/30 dark:text-pink-300"
                title={stock.erpStockCode}
              >
                {stock.erpStockCode}
              </span>
              {alreadyOnDocumentLine ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge
                      variant="outline"
                      className="h-5 shrink-0 border-indigo-300/80 bg-indigo-50 px-1.5 text-[9px] font-semibold text-indigo-900 dark:border-indigo-500/50 dark:bg-indigo-950/50 dark:text-indigo-100"
                    >
                      {t('catalogStockPicker.alreadyOnLineBadge')}
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-xs text-xs">
                    {t('catalogStockPicker.alreadyOnLineTooltip')}
                  </TooltipContent>
                </Tooltip>
              ) : null}
              {alreadyInDraft ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge
                      variant="outline"
                      className="h-5 shrink-0 border-amber-300/80 bg-amber-50 px-1.5 text-[9px] font-semibold text-amber-900 dark:border-amber-600/50 dark:bg-amber-950/40 dark:text-amber-100"
                    >
                      {t('catalogStockPicker.alreadyInDraftBadge')}
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-xs text-xs">
                    {t('catalogStockPicker.alreadyInDraftTooltip')}
                  </TooltipContent>
                </Tooltip>
              ) : null}
              {chipCodes.map((value) => (
                <span
                  key={value}
                  className="max-w-[80px] truncate rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600 dark:bg-white/10 dark:text-slate-300"
                  title={value}
                >
                  {value}
                </span>
              ))}
            </div>
            <h3 className="mb-2 line-clamp-2 min-h-10 break-words text-sm font-semibold leading-tight text-slate-900 transition-colors group-hover:text-pink-600 dark:text-white dark:group-hover:text-pink-400">
              {stock.stockName}
            </h3>
            <div className="space-y-1 text-xs">
              {codePairs.map((pair) => (
                <div key={pair.leftLabel} className="grid grid-cols-2 items-center gap-2">
                  <div className="flex items-center gap-1 min-w-0">
                    <span className="text-slate-500 dark:text-slate-400">{pair.leftLabel}:</span>
                    <span className="truncate font-medium text-slate-700 dark:text-slate-300">{pair.leftValue}</span>
                  </div>
                  <div className="flex items-center gap-1 min-w-0">
                    <span className="text-slate-500 dark:text-slate-400">{pair.rightLabel}:</span>
                    <span className="truncate font-medium text-slate-700 dark:text-slate-300">{pair.rightValue}</span>
                  </div>
                </div>
              ))}
              <div className="grid grid-cols-[44px_minmax(0,1fr)] items-center gap-1">
                <span className="text-slate-500 dark:text-slate-400">{t('productSelectDialog.unit')}:</span>
                <span className="truncate font-medium text-slate-700 dark:text-slate-300">{stock.unit || '-'}</span>
              </div>
            </div>
            {hasRelatedStocks && (
              <div className="mt-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs border-slate-200 dark:border-white/10 hover:border-pink-500/50 hover:bg-pink-50 dark:hover:bg-pink-500/10 hover:text-pink-600 dark:hover:text-pink-400 transition-all rounded-lg"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="12"
                        height="12"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="mr-1.5"
                      >
                        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                        <circle cx="9" cy="7" r="4" />
                        <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                      </svg>
                      {t('productSelectDialog.relatedStocks')} 
                      <span className="ml-1 px-1.5 py-0.5 bg-pink-100 dark:bg-pink-900/50 text-pink-700 dark:text-pink-300 rounded text-[10px] font-bold">
                        {stock.parentRelations?.length || 0}
                      </span>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80" onClick={(e) => e.stopPropagation()}>
                    <div className="space-y-2">
                      <h4 className="font-semibold text-sm">
                        {t('productSelectDialog.relatedStocks')}
                      </h4>
                      <div className="max-h-60 overflow-y-auto space-y-2">
                        {stock.parentRelations?.map((relation) => (
                          <div
                            key={relation.id}
                            className="flex items-center justify-between p-2 rounded-md border hover:bg-muted cursor-pointer"
                            onClick={(e) => handleRelatedStockClick(e, relation)}
                          >
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <div className="font-medium text-sm truncate">
                                  {relation.relatedStockName || t('productSelectDialog.unknownStock')}
                                </div>
                                {relation.relatedStockCode && (
                                  <span className="text-xs text-muted-foreground font-mono">
                                    ({relation.relatedStockCode})
                                  </span>
                                )}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {t('productSelectDialog.quantity')}: {relation.quantity}
                                {relation.isMandatory && (
                                  <span className="ml-2 text-orange-600 dark:text-orange-400">
                                    ({t('productSelectDialog.mandatory')})
                                  </span>
                                )}
                              </div>
                              {relation.description && (
                                <div className="text-xs text-muted-foreground mt-1">
                                  {relation.description}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            )}
          </div>
          <div className="shrink-0">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-muted-foreground"
            >
              <path d="m9 18 6-6-6-6" />
            </svg>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function StockWithImageCard({
  stock,
  onClick,
  onRelatedStockSelect,
  selected = false,
  alreadyInDraft = false,
  alreadyOnDocumentLine = false,
}: StockWithImageCardProps): ReactElement {
  const { t } = useTranslation('common');
  const imageUrl = stock.mainImage ? getImageUrl(stock.mainImage.filePath) : null;
  const hasRelatedStocks = stock.parentRelations && stock.parentRelations.length > 0;
  const codePairs = [
    { leftLabel: 'Kod1', leftValue: stock.kod1 || '-', rightLabel: 'Kod2', rightValue: stock.kod2 || '-' },
    { leftLabel: 'Kod3', leftValue: stock.kod3 || '-', rightLabel: 'Kod4', rightValue: stock.kod4 || '-' },
  ];
  const chipCodes = [stock.kod5, stock.grupKodu].filter(Boolean) as string[];

  const handleRelatedStockClick = async (e: React.MouseEvent, relatedStock: StockRelationDto): Promise<void> => {
    e.stopPropagation();
    if (onRelatedStockSelect) {
      try {
        const relatedStockData = await stockApi.getById(relatedStock.relatedStockId);
        if (relatedStockData) {
          onRelatedStockSelect(relatedStockData);
        }
      } catch (error) {
        console.error('Related stock bilgisi alınamadı:', error);
      }
    }
  };

  return (
    <Card
      className={cn(
        'group h-[222px] cursor-pointer overflow-hidden transition-all duration-200 gap-0 py-0',
        'bg-white dark:bg-[#1a1025]/45 border-slate-300 dark:border-white/10',
        selected
          ? 'border-pink-400 ring-1 ring-pink-300 dark:ring-pink-500/40 shadow-sm'
          : 'hover:border-pink-400/70 dark:hover:border-pink-500/50 hover:shadow-md hover:shadow-pink-500/10',
        'active:scale-[0.98] touch-manipulation overflow-hidden'
      )}
      onClick={onClick}
    >
      <CardContent className="h-full p-0">
        <div className="relative h-[124px] w-full overflow-hidden bg-slate-100 dark:bg-white/5">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={stock.mainImage?.altText || stock.stockName}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-linear-to-br from-slate-100 to-slate-200 text-slate-300 dark:from-white/5 dark:to-white/10 dark:text-slate-600">
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-black/5 to-transparent" />
          <div className="absolute left-2.5 top-2.5 flex max-w-[calc(100%-4rem)] flex-wrap items-center gap-1">
            <span className="max-w-[150px] truncate rounded-md border border-pink-300/80 bg-pink-100/95 px-2 py-0.5 font-mono text-[11px] font-bold text-pink-800 shadow-sm dark:border-pink-700/60 dark:bg-pink-900/80 dark:text-pink-100">
              {stock.erpStockCode}
            </span>
            {alreadyOnDocumentLine ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge
                    variant="outline"
                    className="h-5 shrink-0 border-indigo-400/90 bg-indigo-100/95 px-1.5 text-[9px] font-semibold text-indigo-950 shadow-sm dark:border-indigo-500/60 dark:bg-indigo-950/80 dark:text-indigo-50"
                  >
                    {t('catalogStockPicker.alreadyOnLineBadge')}
                  </Badge>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-xs text-xs">
                  {t('catalogStockPicker.alreadyOnLineTooltip')}
                </TooltipContent>
              </Tooltip>
            ) : null}
            {alreadyInDraft ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge
                    variant="outline"
                    className="h-5 shrink-0 border-amber-400/90 bg-amber-100/95 px-1.5 text-[9px] font-semibold text-amber-950 shadow-sm dark:border-amber-500/60 dark:bg-amber-950/80 dark:text-amber-50"
                  >
                    {t('catalogStockPicker.alreadyInDraftBadge')}
                  </Badge>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-xs text-xs">
                  {t('catalogStockPicker.alreadyInDraftTooltip')}
                </TooltipContent>
              </Tooltip>
            ) : null}
          </div>
          <div className="absolute right-2.5 top-2.5 flex gap-1">
            {chipCodes.slice(0, 2).map((value) => (
              <span
                key={value}
                className="max-w-[70px] truncate rounded bg-black/45 px-1.5 py-0.5 text-[10px] font-semibold text-white"
                title={value}
              >
                {value}
              </span>
            ))}
          </div>
        </div>

        <div className="p-2 pt-1.5">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <h3 className="mb-0.5 line-clamp-2 min-h-[24px] overflow-hidden text-[11px] font-semibold leading-[1.1] text-slate-900 transition-colors group-hover:text-pink-600 dark:text-white dark:group-hover:text-pink-400">
                {stock.stockName}
              </h3>
              <div className="space-y-0 text-[11px] leading-snug">
                {codePairs.map((pair) => (
                  <div key={pair.leftLabel} className="grid grid-cols-2 items-center gap-1.5">
                    <div className="flex min-w-0 items-center gap-1">
                      <span className="text-slate-500 dark:text-slate-400">{pair.leftLabel}:</span>
                      <span className="truncate font-medium text-slate-700 dark:text-slate-300">{pair.leftValue}</span>
                    </div>
                    <div className="flex min-w-0 items-center gap-1">
                      <span className="text-slate-500 dark:text-slate-400">{pair.rightLabel}:</span>
                      <span className="truncate font-medium text-slate-700 dark:text-slate-300">{pair.rightValue}</span>
                    </div>
                  </div>
                ))}
                <div className="grid grid-cols-[36px_minmax(0,1fr)] items-center gap-1">
                  <span className="text-slate-500 dark:text-slate-400">{t('productSelectDialog.unit')}:</span>
                  <span className="truncate font-medium text-slate-700 dark:text-slate-300">{stock.unit || '-'}</span>
                </div>
              </div>
            </div>
            <div className="mt-0.5 shrink-0 text-slate-300 dark:text-slate-600 group-hover:text-pink-500 dark:group-hover:text-pink-400 transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6" /></svg>
            </div>
          </div>
          {hasRelatedStocks && (
            <div className="mt-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 text-[11px] border-slate-200 dark:border-white/10 hover:border-pink-500/50 hover:bg-pink-50 dark:hover:bg-pink-500/10 hover:text-pink-600 dark:hover:text-pink-400 transition-all rounded-md"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {t('productSelectDialog.relatedStocks')}
                    <span className="ml-1 rounded bg-pink-100 px-1.5 py-0.5 text-[10px] font-bold text-pink-700 dark:bg-pink-900/50 dark:text-pink-300">
                      {stock.parentRelations?.length || 0}
                    </span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 p-0 overflow-hidden bg-white/95 dark:bg-[#1a1025]/95 backdrop-blur-xl border border-white/20 dark:border-white/10" onClick={(e) => e.stopPropagation()}>
                  <div className="flex flex-col max-h-[300px]">
                    <div className="p-3 border-b border-slate-200 dark:border-white/5 bg-slate-50/50 dark:bg-white/5">
                      <h4 className="font-semibold text-sm text-slate-900 dark:text-white">
                        {t('productSelectDialog.relatedStocks')}
                      </h4>
                    </div>
                    <div className="overflow-y-auto p-2 space-y-2">
                      {stock.parentRelations?.map((relation) => (
                        <div
                          key={relation.id}
                          className="group/item flex items-center justify-between p-2 rounded-lg border border-transparent hover:border-pink-500/30 hover:bg-pink-50/50 dark:hover:bg-pink-500/10 cursor-pointer transition-all"
                          onClick={(e) => handleRelatedStockClick(e, relation)}
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <div className="font-medium text-sm truncate text-slate-700 dark:text-slate-200 group-hover/item:text-pink-700 dark:group-hover/item:text-pink-300 transition-colors">
                                {relation.relatedStockName || t('productSelectDialog.unknownStock')}
                              </div>
                              {relation.relatedStockCode && (
                                <span className="text-xs text-slate-400 font-mono">
                                  ({relation.relatedStockCode})
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-slate-500 dark:text-slate-400">
                              {t('productSelectDialog.quantity')}: <span className="font-medium text-slate-700 dark:text-slate-300">{relation.quantity}</span>
                              {relation.isMandatory && (
                                <span className="ml-2 text-orange-600 dark:text-orange-400 font-medium bg-orange-50 dark:bg-orange-900/20 px-1.5 py-0.5 rounded">
                                  {t('productSelectDialog.mandatory')}
                                </span>
                              )}
                            </div>
                            {relation.description && (
                              <div className="text-xs text-slate-400 mt-1 italic">
                                {relation.description}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function StockListItem({
  stock,
  onClick,
  selected = false,
  alreadyInDraft = false,
  alreadyOnDocumentLine = false,
}: StockCardProps): ReactElement {
  const { t } = useTranslation('common');

  return (
    <div
      className={cn(
        'group grid h-14 grid-cols-[minmax(0,1fr)_120px_20px] items-center gap-2 px-3 text-xs',
        'cursor-pointer border-b border-slate-300 dark:border-white/15',
        selected
          ? 'bg-pink-100/90 dark:bg-pink-900/35 ring-1 ring-pink-400/90 dark:ring-pink-500/55 border-pink-300 dark:border-pink-600/40'
          : 'hover:bg-slate-50 dark:hover:bg-white/5 transition-colors'
      )}
      onClick={onClick}
    >
      <div className="flex min-w-0 items-center gap-2">
        <span className="shrink-0 max-w-[130px] truncate rounded border border-pink-200 bg-pink-100 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-pink-700 dark:border-pink-700/40 dark:bg-pink-900/30 dark:text-pink-300" title={stock.erpStockCode}>
          {stock.erpStockCode}
        </span>
        {alreadyOnDocumentLine ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge
                variant="outline"
                className="h-4 shrink-0 border-indigo-300/80 bg-indigo-50 px-1 text-[8px] font-semibold leading-none text-indigo-900 dark:border-indigo-600/50 dark:bg-indigo-950/40 dark:text-indigo-100"
              >
                {t('catalogStockPicker.alreadyOnLineBadge')}
              </Badge>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-xs text-xs">
              {t('catalogStockPicker.alreadyOnLineTooltip')}
            </TooltipContent>
          </Tooltip>
        ) : null}
        {alreadyInDraft ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge
                variant="outline"
                className="h-4 shrink-0 border-amber-300/80 bg-amber-50 px-1 text-[8px] font-semibold leading-none text-amber-900 dark:border-amber-600/50 dark:bg-amber-950/40 dark:text-amber-100"
              >
                {t('catalogStockPicker.alreadyInDraftBadge')}
              </Badge>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-xs text-xs">
              {t('catalogStockPicker.alreadyInDraftTooltip')}
            </TooltipContent>
          </Tooltip>
        ) : null}
        <span className="min-w-0 truncate text-sm font-semibold text-slate-900 dark:text-white" title={stock.stockName}>
          {stock.stockName}
        </span>
      </div>
      <div className="text-right text-xs text-slate-500 dark:text-slate-400">
        {t('productSelectDialog.unit')}: <span className="font-semibold text-slate-700 dark:text-slate-300">{stock.unit || '-'}</span>
      </div>
      <div className="text-slate-300 dark:text-slate-600 group-hover:text-pink-500 dark:group-hover:text-pink-400">
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m9 18 6-6-6-6" />
        </svg>
      </div>
    </div>
  );
}

function StockWithImageListItem({
  stock,
  onClick,
  selected = false,
  alreadyInDraft = false,
  alreadyOnDocumentLine = false,
}: StockWithImageCardProps): ReactElement {
  const { t } = useTranslation('common');
  const imageUrl = stock.mainImage ? getImageUrl(stock.mainImage.filePath) : null;

  return (
    <div
      className={cn(
        'group grid h-16 grid-cols-[42px_minmax(0,1fr)_120px_20px] items-center gap-2 px-3 text-xs',
        'cursor-pointer border-b border-slate-300 dark:border-white/15',
        selected
          ? 'bg-pink-100/90 dark:bg-pink-900/35 ring-1 ring-pink-400/90 dark:ring-pink-500/55 border-pink-300 dark:border-pink-600/40'
          : 'hover:bg-slate-50 dark:hover:bg-white/5 transition-colors'
      )}
      onClick={onClick}
    >
      <div className="h-10 w-10 rounded-md bg-slate-100 dark:bg-white/5 overflow-hidden border border-slate-200 dark:border-white/5">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={stock.mainImage?.altText || stock.stockName}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-300 dark:text-slate-600">
             <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
          </div>
        )}
      </div>

      <div className="flex min-w-0 items-center gap-2">
        <span className="shrink-0 max-w-[130px] truncate rounded border border-pink-200 bg-pink-100 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-pink-700 dark:border-pink-700/40 dark:bg-pink-900/30 dark:text-pink-300" title={stock.erpStockCode}>
          {stock.erpStockCode}
        </span>
        {alreadyOnDocumentLine ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge
                variant="outline"
                className="h-4 shrink-0 border-indigo-300/80 bg-indigo-50 px-1 text-[8px] font-semibold leading-none text-indigo-900 dark:border-indigo-600/50 dark:bg-indigo-950/40 dark:text-indigo-100"
              >
                {t('catalogStockPicker.alreadyOnLineBadge')}
              </Badge>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-xs text-xs">
              {t('catalogStockPicker.alreadyOnLineTooltip')}
            </TooltipContent>
          </Tooltip>
        ) : null}
        {alreadyInDraft ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge
                variant="outline"
                className="h-4 shrink-0 border-amber-300/80 bg-amber-50 px-1 text-[8px] font-semibold leading-none text-amber-900 dark:border-amber-600/50 dark:bg-amber-950/40 dark:text-amber-100"
              >
                {t('catalogStockPicker.alreadyInDraftBadge')}
              </Badge>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-xs text-xs">
              {t('catalogStockPicker.alreadyInDraftTooltip')}
            </TooltipContent>
          </Tooltip>
        ) : null}
        <span className="min-w-0 truncate text-sm font-semibold text-slate-900 dark:text-white" title={stock.stockName}>
          {stock.stockName}
        </span>
      </div>
      <div className="text-right text-xs text-slate-500 dark:text-slate-400">
        {t('productSelectDialog.unit')}: <span className="font-semibold text-slate-700 dark:text-slate-300">{stock.unit || '-'}</span>
      </div>
      <div className="text-slate-300 dark:text-slate-600 group-hover:text-pink-500 dark:group-hover:text-pink-400">
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m9 18 6-6-6-6" />
        </svg>
      </div>
    </div>
  );
}

export function ProductSelectDialog({
  open,
  onOpenChange,
  onSelect,
  onMultiSelect,
  multiSelect = false,
  disableRelatedStocks = false,
  initialSelectedResults = [],
  existingLineStockMarkers = [],
}: ProductSelectDialogProps): ReactElement {
  const { t, i18n } = useTranslation('common');
  const [viewMode, setViewMode] = useState<'card' | 'list'>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('stocks');
  const [isListening, setIsListening] = useState(false);
  const [filterPopoverOpen, setFilterPopoverOpen] = useState(false);
  const [draftFilterRows, setDraftFilterRows] = useState<FilterRow[]>([]);
  const [appliedFilterRows, setAppliedFilterRows] = useState<FilterRow[]>([]);
  const [draftFilterLogic, setDraftFilterLogic] = useState<'and' | 'or'>('and');
  const [appliedFilterLogic, setAppliedFilterLogic] = useState<'and' | 'or'>('and');
  const [relatedStocksDialogOpen, setRelatedStocksDialogOpen] = useState(false);
  const [selectedStock, setSelectedStock] = useState<StockGetDto | StockGetWithMainImageDto | null>(null);
  const [selectedResults, setSelectedResults] = useState<ProductSelectionResult[]>([]);
  const initialDraftSnapshotRef = useRef<ProductSelectionResult[]>([]);
  const documentLinesSnapshotRef = useRef<ProductSelectionResult[]>([]);
  const multiSelectSessionStartedRef = useRef(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const debouncedSearch = useDebouncedValue(searchQuery, POPUP_SEARCH_DEBOUNCE_MS);
  const isThresholdInput = searchQuery.trim().length > 0 && searchQuery.trim().length < DROPDOWN_MIN_CHARS;
  const rawAppliedAdvancedFilters = useMemo(() => rowsToBackendFilters(appliedFilterRows), [appliedFilterRows]);
  const hasAdvancedFilters = rawAppliedAdvancedFilters.length > 0;
  const minCharsHint = t('dropdown.minCharsHint', {
    count: DROPDOWN_MIN_CHARS,
    defaultValue: `Minimum ${DROPDOWN_MIN_CHARS} characters`,
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition =
        (window as Window & { webkitSpeechRecognition?: new () => SpeechRecognition }).SpeechRecognition ||
        (window as Window & { webkitSpeechRecognition?: new () => SpeechRecognition }).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        
        const langMap: Record<string, string> = {
          'tr': 'tr-TR',
          'en': 'en-US',
          'de': 'de-DE',
          'fr': 'fr-FR'
        };
        recognition.lang = langMap[i18n.language] || i18n.language;

        recognition.onresult = (event: SpeechRecognitionEvent) => {
          const transcript = event.results[0][0].transcript;
          setSearchQuery(transcript);
          setIsListening(false);
        };

        recognition.onerror = () => {
          setIsListening(false);
        };

        recognition.onend = () => {
          setIsListening(false);
        };

        recognitionRef.current = recognition;
      }
    }
  }, [i18n.language]);

  const handleVoiceSearch = (): void => {
    if (!recognitionRef.current) {
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  useEffect(() => {
    if (!open && !relatedStocksDialogOpen) {
      setSearchQuery('');
      setFilterPopoverOpen(false);
      setDraftFilterRows([]);
      setAppliedFilterRows([]);
      setDraftFilterLogic('and');
      setAppliedFilterLogic('and');
      setIsListening(false);
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setSelectedResults([]);
      multiSelectSessionStartedRef.current = false;
      initialDraftSnapshotRef.current = [];
      documentLinesSnapshotRef.current = [];
    }
  }, [open, relatedStocksDialogOpen]);

  useEffect(() => {
    if (!open || relatedStocksDialogOpen || !multiSelect) return;
    if (!multiSelectSessionStartedRef.current) {
      const seeded = initialSelectedResults.map((r) => ({ ...r }));
      initialDraftSnapshotRef.current = seeded;
      documentLinesSnapshotRef.current = (existingLineStockMarkers ?? []).map((r) => ({ ...r }));
      setSelectedResults(seeded);
      multiSelectSessionStartedRef.current = true;
    }
  }, [open, relatedStocksDialogOpen, initialSelectedResults, multiSelect, existingLineStockMarkers]);

  useEffect(() => {
    if (!open || relatedStocksDialogOpen || multiSelect) return;
    documentLinesSnapshotRef.current = (existingLineStockMarkers ?? []).map((r) => ({ ...r }));
  }, [open, relatedStocksDialogOpen, multiSelect, existingLineStockMarkers]);

  const getSelectionKey = (value: { id?: number; code: string }): string =>
    value.id != null ? `id:${value.id}` : `code:${value.code}`;

  const addSelection = useCallback((result: ProductSelectionResult): void => {
    setSelectedResults((prev) => [...prev, result]);
  }, []);

  const removeSelectionAtIndex = useCallback((index: number): void => {
    setSelectedResults((prev) => prev.filter((_, i) => i !== index));
  }, []);
  const selectedKeySet = useMemo(
    () => new Set(selectedResults.map((item) => getSelectionKey(item))),
    [selectedResults]
  );
  const initialSelectedKeySet = useMemo(
    () => new Set(initialSelectedResults.map((item) => getSelectionKey(item))),
    [initialSelectedResults]
  );
  const visibleSelectedKeySet = useMemo(() => {
    const combined = new Set(initialSelectedKeySet);
    selectedKeySet.forEach((key) => combined.add(key));
    return combined;
  }, [initialSelectedKeySet, selectedKeySet]);

  const draftSnapshotList = initialDraftSnapshotRef.current;
  const documentLinesList = documentLinesSnapshotRef.current;

  const stocksDropdown = useDropdownInfiniteSearch<StockGetDto>({
    entityKey: 'stocks',
    searchTerm: debouncedSearch,
    enabled: open && activeTab === 'stocks',
    minChars: DROPDOWN_MIN_CHARS,
    // Keep request size high enough for seamless infinite scroll while list UI stays compact.
    pageSize: DROPDOWN_PAGE_SIZE,
    sortBy: 'Id',
    sortDirection: 'desc',
    extraQueryKey: [JSON.stringify(rawAppliedAdvancedFilters), appliedFilterLogic],
    buildFilters: () => (hasAdvancedFilters ? rawAppliedAdvancedFilters : undefined),
    filterLogic: appliedFilterLogic,
    fetchPage: dropdownApi.getStockPage,
  });

  const stocksWithImagesDropdown = useDropdownInfiniteSearch<StockGetWithMainImageDto>({
    entityKey: 'stocks-with-images',
    searchTerm: debouncedSearch,
    enabled: open && activeTab === 'stocksWithImages',
    minChars: DROPDOWN_MIN_CHARS,
    pageSize: DROPDOWN_PAGE_SIZE,
    sortBy: 'Id',
    sortDirection: 'desc',
    extraQueryKey: [JSON.stringify(rawAppliedAdvancedFilters), appliedFilterLogic],
    buildFilters: () => (hasAdvancedFilters ? rawAppliedAdvancedFilters : undefined),
    filterLogic: appliedFilterLogic,
    fetchPage: dropdownApi.getStockWithImagesPage,
  });

  const visibleStocks = stocksDropdown.items;

  const visibleStocksWithImages = stocksWithImagesDropdown.items;

  const handleStockSelect = async (stock: StockGetDto | StockGetWithMainImageDto): Promise<void> => {
    const hasRelatedStocks = stock.parentRelations && stock.parentRelations.length > 0;

    if (hasRelatedStocks && !disableRelatedStocks) {
      setSelectedStock(stock);
      onOpenChange(false);
      setRelatedStocksDialogOpen(true);
      return;
    }

    const result: ProductSelectionResult = {
      id: stock.id,
      code: stock.erpStockCode,
      name: stock.stockName,
      unit: stock.unit,
      groupCode: stock.grupKodu,
    };

    if (multiSelect) {
      addSelection(result);
      return;
    }

    try {
      await onSelect(result);
      onOpenChange(false);
    } catch (error) {
      console.error('❌ [ProductSelectDialog] onSelect hatası:', error);
      throw error;
    }
  };

  const handleRelatedStocksConfirm = async (selection: RelatedStockSelectionConfirmItem[]): Promise<void> => {
    if (!selectedStock) {
      return;
    }

    try {
      const relatedStockIds = selection.map((item) => item.relatedStockId);
      const relatedStockQuantitiesById: Record<number, number> = {};
      for (const item of selection) {
        relatedStockQuantitiesById[item.relatedStockId] = item.quantityPerMain;
      }

      const result: ProductSelectionResult = {
        id: selectedStock.id,
        code: selectedStock.erpStockCode,
        name: selectedStock.stockName,
        unit: selectedStock.unit,
        groupCode: selectedStock.grupKodu,
        relatedStockIds,
        relatedStockQuantitiesById,
      };

      if (multiSelect) {
        addSelection(result);
        setRelatedStocksDialogOpen(false);
        setSelectedStock(null);
        onOpenChange(true);
      } else {
        await onSelect(result);
        setRelatedStocksDialogOpen(false);
        setSelectedStock(null);
      }
    } catch (error) {
      console.error('❌ [ProductSelectDialog] onSelect hatası:', error);
      setRelatedStocksDialogOpen(false);
      setSelectedStock(null);
      throw error;
    }
  };

  const handleConfirmMultiSelect = async (): Promise<void> => {
    if (!multiSelect || !onMultiSelect || selectedResults.length === 0) return;
    await onMultiSelect(selectedResults);
    onOpenChange(false);
  };

  const handleRelatedStocksDialogClose = (open: boolean): void => {
    setRelatedStocksDialogOpen(open);
    if (!open) {
      setSelectedStock(null);
    }
  };

  const handleScroll = useCallback(
    (event: React.UIEvent<HTMLDivElement>): void => {
      const activeDropdown = activeTab === 'stocks' ? stocksDropdown : stocksWithImagesDropdown;
      if (!activeDropdown.hasNextPage || activeDropdown.isFetchingNextPage) {
        return;
      }

      const target = event.currentTarget;
      if (target.scrollHeight <= 0) {
        return;
      }

      const scrollProgress = (target.scrollTop + target.clientHeight) / target.scrollHeight;
      if (scrollProgress >= DROPDOWN_SCROLL_THRESHOLD) {
        void activeDropdown.fetchNextPage();
      }
    },
    [activeTab, stocksDropdown, stocksWithImagesDropdown]
  );

  const renderStocks = (): ReactElement => {
    if (stocksDropdown.isLoading) {
      return (
        <div className="flex items-center justify-center py-12">
          <div className="text-muted-foreground">
            {t('productSelectDialog.loading')}
          </div>
        </div>
      );
    }

    if (visibleStocks.length === 0) {
      return (
        <div className="flex items-center justify-center py-12">
          <div className="text-muted-foreground">
            {searchQuery.trim() ? t('productSelectDialog.noResults') : t('productSelectDialog.noProducts')}
          </div>
        </div>
      );
    }

    if (viewMode === 'list') {
      return (
        <div className="overflow-hidden rounded-lg border border-slate-300 bg-white dark:border-white/20 dark:bg-white/5">
          {visibleStocks.map((stock) => (
            <StockListItem
              key={stock.id}
              stock={stock}
              onClick={() => handleStockSelect(stock)}
              onRelatedStockSelect={handleStockSelect}
              selected={visibleSelectedKeySet.has(getSelectionKey({ id: stock.id, code: stock.erpStockCode }))}
              alreadyInDraft={stockMatchesDraftSnapshot(stock, draftSnapshotList)}
              alreadyOnDocumentLine={stockMatchesDraftSnapshot(stock, documentLinesList)}
            />
          ))}
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-2 2xl:grid-cols-3">
        {visibleStocks.map((stock) => (
          <StockCard
            key={stock.id}
            stock={stock}
            onClick={() => handleStockSelect(stock)}
            onRelatedStockSelect={handleStockSelect}
            selected={visibleSelectedKeySet.has(getSelectionKey({ id: stock.id, code: stock.erpStockCode }))}
            alreadyInDraft={stockMatchesDraftSnapshot(stock, draftSnapshotList)}
            alreadyOnDocumentLine={stockMatchesDraftSnapshot(stock, documentLinesList)}
          />
        ))}
      </div>
    );
  };

  const renderStocksWithImages = (): ReactElement => {
    if (stocksWithImagesDropdown.isLoading) {
      return (
        <div className="flex items-center justify-center py-12">
          <div className="text-muted-foreground">
            {t('productSelectDialog.loading')}
          </div>
        </div>
      );
    }

    if (visibleStocksWithImages.length === 0) {
      return (
        <div className="flex items-center justify-center py-12">
          <div className="text-muted-foreground">
            {searchQuery.trim() ? t('productSelectDialog.noResults') : t('productSelectDialog.noProducts')}
          </div>
        </div>
      );
    }

    if (viewMode === 'list') {
      return (
        <div className="overflow-hidden rounded-lg border border-slate-300 bg-white dark:border-white/20 dark:bg-white/5">
          {visibleStocksWithImages.map((stock) => (
            <StockWithImageListItem
              key={stock.id}
              stock={stock}
              onClick={() => handleStockSelect(stock)}
              onRelatedStockSelect={handleStockSelect}
              selected={visibleSelectedKeySet.has(getSelectionKey({ id: stock.id, code: stock.erpStockCode }))}
              alreadyInDraft={stockMatchesDraftSnapshot(stock, draftSnapshotList)}
              alreadyOnDocumentLine={stockMatchesDraftSnapshot(stock, documentLinesList)}
            />
          ))}
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-2 2xl:grid-cols-3">
        {visibleStocksWithImages.map((stock) => (
          <StockWithImageCard
            key={stock.id}
            stock={stock}
            onClick={() => handleStockSelect(stock)}
            onRelatedStockSelect={handleStockSelect}
            selected={visibleSelectedKeySet.has(getSelectionKey({ id: stock.id, code: stock.erpStockCode }))}
            alreadyInDraft={stockMatchesDraftSnapshot(stock, draftSnapshotList)}
            alreadyOnDocumentLine={stockMatchesDraftSnapshot(stock, documentLinesList)}
          />
        ))}
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="flex max-h-[min(86dvh,760px)] w-[calc(100vw-0.75rem)] max-w-[calc(100vw-0.75rem)] flex-col overflow-hidden border border-slate-100 bg-white p-0 text-slate-900 shadow-2xl dark:border-white/10 dark:bg-[#130822] dark:text-white sm:w-[min(920px,calc(100vw-2rem))] sm:max-w-[min(920px,calc(100vw-2rem))] md:w-[min(980px,calc(100vw-2.5rem))] md:max-w-[min(980px,calc(100vw-2.5rem))] lg:!w-[min(1040px,calc(100vw-3rem))] lg:!max-w-[min(1040px,calc(100vw-3rem))] xl:!w-[min(1120px,calc(100vw-4rem))] xl:!max-w-[min(1120px,calc(100vw-4rem))] 2xl:!w-[min(1180px,calc(100vw-5rem))] 2xl:!max-w-[min(1180px,calc(100vw-5rem))]"
      >
        <DialogHeader className="px-3 py-2.5 sm:px-6 sm:py-3 flex-shrink-0 border-b border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-[#1a1025]/50 flex flex-row items-center justify-between sticky top-0 z-10 backdrop-blur-sm">
          <DialogTitle className="text-lg font-bold text-slate-900 dark:text-white">
            {t('productSelectDialog.title')}
          </DialogTitle>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-lg text-slate-500 transition-colors hover:bg-red-50 hover:text-red-600 dark:text-slate-400 dark:hover:bg-red-500/15 dark:hover:text-red-400"
            onClick={() => onOpenChange(false)}
          >
            <X className="h-4 w-4" />
          </Button>
        </DialogHeader>

        <div className="px-3 py-2.5 sm:px-6 sm:py-3 flex-shrink-0 bg-slate-50/50 dark:bg-white/5 border-b border-slate-200/50 dark:border-white/5">
          <div className="flex flex-col lg:flex-row gap-3">
            <div className="relative flex-1 flex gap-2">
              <div className="relative flex-1 group">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-pink-500 transition-colors"
                >
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.3-4.3" />
                </svg>
                <Input
                  type="text"
                  placeholder={t('productSelectDialog.searchPlaceholder')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-20 h-10 sm:h-11 bg-white dark:bg-[#0c0516] border-slate-300 dark:border-white/15 focus-visible:border-pink-400 dark:focus-visible:border-pink-500 focus-visible:ring-2 focus-visible:ring-pink-300/60 dark:focus-visible:ring-pink-500/35 rounded-xl transition-all shadow-sm"
                />
              </div>
              {isThresholdInput ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      aria-label={minCharsHint}
                      className="absolute right-12 top-1/2 -translate-y-1/2 inline-flex h-8 w-8 items-center justify-center rounded-lg text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/30"
                    >
                      <AlertCircle className="h-4 w-4" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top">{minCharsHint}</TooltipContent>
                </Tooltip>
              ) : null}
              {recognitionRef.current && (
                <Button
                  type="button"
                  variant={isListening ? 'default' : 'outline'}
                  size="icon"
                  onClick={handleVoiceSearch}
                  className={cn(
                    'shrink-0 h-10 w-10 sm:h-11 sm:w-11 rounded-xl transition-all',
                    isListening 
                      ? 'animate-pulse bg-red-500 hover:bg-red-600 border-red-500 shadow-lg shadow-red-500/30' 
                      : 'bg-white dark:bg-[#0c0516] border-slate-200 dark:border-white/10 hover:border-pink-500/50 hover:bg-pink-50 dark:hover:bg-pink-500/10 text-slate-500 dark:text-slate-400 hover:text-pink-600 dark:hover:text-pink-400'
                  )}
                  title={t('productSelectDialog.voiceSearch')}
                >
                  {isListening ? (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <rect width="18" height="18" x="3" y="3" rx="2" />
                      <path d="M12 8v8" />
                      <path d="M8 12h8" />
                    </svg>
                  ) : (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                      <line x1="12" x2="12" y1="19" y2="23" />
                      <line x1="8" x2="16" y1="23" y2="23" />
                    </svg>
                  )}
                </Button>
              )}
            </div>

            <div className="flex items-center gap-2 self-end lg:self-auto shrink-0">
              <Popover open={filterPopoverOpen} onOpenChange={setFilterPopoverOpen}>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-10 sm:h-11 rounded-xl bg-white dark:bg-[#0c0516] border-slate-200 dark:border-white/10 hover:border-pink-500/50 hover:bg-pink-50 dark:hover:bg-pink-500/10 text-slate-500 dark:text-slate-400 hover:text-pink-600 dark:hover:text-pink-400"
                  >
                    <Filter className="h-4 w-4 mr-2" />
                    {t('filters', { defaultValue: 'Filtreler' })}
                    {hasAdvancedFilters ? (
                      <span className="ml-2 inline-flex min-w-5 justify-center rounded-full bg-pink-100 px-1.5 py-0.5 text-[10px] font-semibold text-pink-700 dark:bg-pink-900/40 dark:text-pink-300">
                        {rawAppliedAdvancedFilters.length}
                      </span>
                    ) : null}
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-[min(96vw,680px)] p-0">
                  <AdvancedFilter
                    embedded
                    columns={STOCK_FILTER_COLUMNS}
                    defaultColumn="ErpStockCode"
                    draftRows={draftFilterRows}
                    onDraftRowsChange={setDraftFilterRows}
                    filterLogic={draftFilterLogic}
                    onFilterLogicChange={setDraftFilterLogic}
                    onSearch={() => {
                      setAppliedFilterRows(draftFilterRows);
                      setAppliedFilterLogic(draftFilterLogic);
                    }}
                    onClear={() => {
                      setDraftFilterRows([]);
                      setAppliedFilterRows([]);
                      setDraftFilterLogic('and');
                      setAppliedFilterLogic('and');
                      setFilterPopoverOpen(false);
                    }}
                    translationNamespace="common"
                  />
                  <div className="flex items-center justify-end gap-2 border-t border-slate-200 dark:border-white/10 p-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setDraftFilterRows(appliedFilterRows);
                        setDraftFilterLogic(appliedFilterLogic);
                        setFilterPopoverOpen(false);
                      }}
                    >
                      {t('cancel', { defaultValue: 'İptal' })}
                    </Button>
                    <Button
                      type="button"
                      onClick={() => {
                        setAppliedFilterRows(draftFilterRows);
                        setAppliedFilterLogic(draftFilterLogic);
                        setFilterPopoverOpen(false);
                      }}
                    >
                      {t('apply', { defaultValue: 'Uygula' })}
                    </Button>
                  </div>
                </PopoverContent>
              </Popover>

              <div className="bg-white dark:bg-[#1a1025] p-1 rounded-xl flex items-center gap-1 border border-slate-200 dark:border-white/5 shadow-sm">
                <button
                  type="button"
                  onClick={() => setViewMode('card')}
                  className={cn(
                    "p-2 rounded-lg transition-all",
                    viewMode === 'card' 
                      ? "bg-pink-50 dark:bg-pink-900/20 text-pink-600 dark:text-pink-400 shadow-sm" 
                      : "text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5"
                  )}
                  title={t('productSelectDialog.cardView')}
                >
                  <LayoutGrid size={18} />
                </button>
                <div className="w-px h-4 bg-slate-200 dark:bg-white/10 mx-0.5" />
                <button
                  type="button"
                  onClick={() => setViewMode('list')}
                  className={cn(
                    "p-2 rounded-lg transition-all",
                    viewMode === 'list' 
                      ? "bg-pink-50 dark:bg-pink-900/20 text-pink-600 dark:text-pink-400 shadow-sm" 
                      : "text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5"
                  )}
                  title={t('productSelectDialog.listView')}
                >
                  <ListIcon size={18} />
                </button>
              </div>
            </div>
          </div>
          {multiSelect && selectedResults.length > 0 ? (
            <div className="mt-3 flex max-h-28 flex-wrap items-center gap-2 overflow-y-auto pr-1">
              <span className="w-full text-xs font-semibold text-slate-500 dark:text-slate-400 sm:w-auto">
                {t('selected', { defaultValue: 'Secilen' })}: {selectedResults.length}
              </span>
              {selectedResults.map((item, index) => (
                <button
                  key={`pick-${index}-${getSelectionKey(item)}`}
                  type="button"
                  onClick={() => removeSelectionAtIndex(index)}
                  title={item.code}
                  className="inline-flex max-w-[min(11rem,42vw)] items-center gap-1 rounded-full border border-pink-200 bg-pink-50 px-2 py-1 text-left text-[11px] font-medium text-pink-700 dark:border-pink-700/40 dark:bg-pink-900/20 dark:text-pink-300 sm:max-w-[13rem]"
                >
                  <span className="flex min-w-0 flex-1 flex-col gap-0 overflow-hidden text-left leading-tight">
                    <span className="truncate font-mono" title={item.code}>
                      {item.code}
                    </span>
                    {item.name ? (
                      <span className="truncate text-[10px] font-normal text-pink-600/90 dark:text-pink-300/80" title={item.name}>
                        {item.name}
                      </span>
                    ) : null}
                  </span>
                  <X className="h-3 w-3 shrink-0 opacity-70" />
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0 px-3 pt-3 sm:px-6 sm:pt-4">
          <TabsList className="w-full justify-start gap-2 bg-slate-100/80 dark:bg-white/5 p-1 mb-4 border border-slate-300 dark:border-white/20 rounded-xl h-auto">
            <TabsTrigger 
              value="stocks"
              className="px-6 py-2 rounded-lg border border-transparent data-[state=active]:border-pink-300 dark:data-[state=active]:border-pink-500/50 data-[state=active]:bg-pink-100 dark:data-[state=active]:bg-pink-900/30 data-[state=active]:text-pink-700 dark:data-[state=active]:text-pink-300 font-semibold text-slate-700 dark:text-slate-300 transition-all"
            >
              {t('productSelectDialog.stocks')}
            </TabsTrigger>
            <TabsTrigger 
              value="stocksWithImages"
              className="px-6 py-2 rounded-lg border border-transparent data-[state=active]:border-pink-300 dark:data-[state=active]:border-pink-500/50 data-[state=active]:bg-pink-100 dark:data-[state=active]:bg-pink-900/30 data-[state=active]:text-pink-700 dark:data-[state=active]:text-pink-300 font-semibold text-slate-700 dark:text-slate-300 transition-all"
            >
              {t('productSelectDialog.stocksWithImages')}
            </TabsTrigger>
          </TabsList>

          <div
            ref={scrollContainerRef}
            onScroll={handleScroll}
            className="flex-1 min-h-0 max-h-[min(44vh,380px)] overflow-y-auto pb-4 sm:pb-6 custom-scrollbar sm:max-h-[min(52vh,500px)] lg:max-h-[min(58vh,560px)]"
          >
            <TabsContent value="stocks" className="mt-0">
              {renderStocks()}
            </TabsContent>
            <TabsContent value="stocksWithImages" className="mt-0">
              {renderStocksWithImages()}
            </TabsContent>
            {(activeTab === 'stocks' ? stocksDropdown.isFetchingNextPage : stocksWithImagesDropdown.isFetchingNextPage) ? (
              <div className="flex items-center justify-center py-4 text-sm text-muted-foreground">
                {t('productSelectDialog.loading')}
              </div>
            ) : null}
          </div>
        </Tabs>
        {multiSelect ? (
          <div className="flex items-center justify-end gap-2 border-t border-slate-200/60 dark:border-white/10 bg-slate-50/50 dark:bg-white/5 px-3 py-2.5 sm:px-6 sm:py-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setSelectedResults([]);
              }}
              disabled={selectedResults.length === 0}
            >
              {t('clear', { defaultValue: 'Temizle' })}
            </Button>
            <Button
              type="button"
              onClick={() => void handleConfirmMultiSelect()}
              disabled={selectedResults.length === 0}
              className="bg-linear-to-r from-pink-600 to-orange-600 hover:from-pink-700 hover:to-orange-700 text-white"
            >
              {t('addSelected', { defaultValue: 'Secilenleri Ekle' })} ({selectedResults.length})
            </Button>
          </div>
        ) : null}
      </DialogContent>

      {selectedStock && selectedStock.parentRelations && (
        <RelatedStocksSelectionDialog
          open={relatedStocksDialogOpen}
          onOpenChange={handleRelatedStocksDialogClose}
          relatedStocks={selectedStock.parentRelations}
          onConfirm={handleRelatedStocksConfirm}
        />
      )}
    </Dialog>
  );
}

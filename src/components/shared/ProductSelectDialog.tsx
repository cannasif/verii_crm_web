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
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { getImageUrl } from '@/features/stock/utils/image-url';
import { stockApi } from '@/features/stock/api/stock-api';
import { RelatedStocksSelectionDialog } from './RelatedStocksSelectionDialog';
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
  DROPDOWN_DEBOUNCE_MS,
  DROPDOWN_MIN_CHARS,
  DROPDOWN_PAGE_SIZE,
  DROPDOWN_SCROLL_THRESHOLD,
} from '@/components/shared/dropdown/constants';

const STOCK_SEARCH_COLUMNS = [
  'stockName',
  'erpStockCode',
  'grupKodu',
  'grupAdi',
  'kod1',
  'kod1Adi',
  'kod2',
  'kod2Adi',
  'ureticiKodu',
] as const;

const STOCK_FILTER_COLUMNS: readonly FilterColumnConfig[] = [
  { value: 'Id', type: 'number', labelKey: 'columnId' },
  { value: 'ErpStockCode', type: 'string', labelKey: 'columnErpStockCode' },
  { value: 'StockName', type: 'string', labelKey: 'columnStockName' },
  { value: 'unit', type: 'string', labelKey: 'columnUnit' },
] as const;

function normalizeSearchText(value: string): string {
  return value
    .toLocaleLowerCase('tr-TR')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ı/g, 'i')
    .replace(/İ/g, 'i')
    .replace(/ş/g, 's')
    .replace(/Ş/g, 's')
    .replace(/ğ/g, 'g')
    .replace(/Ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/Ü/g, 'u')
    .replace(/ö/g, 'o')
    .replace(/Ö/g, 'o')
    .replace(/ç/g, 'c')
    .replace(/Ç/g, 'c')
    .replace(/\s+/g, ' ')
    .trim();
}

function matchesSearchQuery(
  stock: Pick<
    StockGetDto,
    | 'stockName'
    | 'erpStockCode'
    | 'grupKodu'
    | 'grupAdi'
    | 'kod1'
    | 'kod1Adi'
    | 'kod2'
    | 'kod2Adi'
    | 'ureticiKodu'
  >,
  searchQuery: string
): boolean {
  const query = normalizeSearchText(searchQuery);
  if (!query) return true;

  const haystacks = [
    stock.stockName,
    stock.erpStockCode,
    stock.grupKodu,
    stock.grupAdi,
    stock.kod1,
    stock.kod1Adi,
    stock.kod2,
    stock.kod2Adi,
    stock.ureticiKodu,
  ]
    .filter(Boolean)
    .map((item) => normalizeSearchText(String(item)));

  return haystacks.some((item) => item.includes(query));
}

function formatStockBalance(stock: StockGetDto | StockGetWithMainImageDto): string | null {
  if (stock.balanceText?.trim()) {
    return stock.balanceText.trim();
  }

  if (typeof stock.balance === 'number' && Number.isFinite(stock.balance)) {
    return new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 2 }).format(stock.balance);
  }

  return null;
}

function getStockMetaRows(
  stock: StockGetDto | StockGetWithMainImageDto,
  t: (key: string) => string
): Array<{ label: string; value: string }> {
  return [
    stock.grupKodu || stock.grupAdi
      ? { label: t('productSelectDialog.group'), value: [stock.grupKodu, stock.grupAdi].filter(Boolean).join(' - ') }
      : null,
    stock.kod1 || stock.kod1Adi
      ? { label: t('productSelectDialog.code1'), value: [stock.kod1, stock.kod1Adi].filter(Boolean).join(' - ') }
      : null,
    stock.kod2 || stock.kod2Adi
      ? { label: t('productSelectDialog.code2'), value: [stock.kod2, stock.kod2Adi].filter(Boolean).join(' - ') }
      : null,
  ].filter((row): row is { label: string; value: string } => Boolean(row));
}

export interface ProductSelectionResult {
  id?: number;
  code: string;
  name: string;
  vatRate?: number;
  groupCode?: string;
  relatedStockIds?: number[];
}

interface ProductSelectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (result: ProductSelectionResult) => void | Promise<void>;
  disableRelatedStocks?: boolean;
}

interface StockCardProps {
  stock: StockGetDto;
  onClick: () => void;
  onRelatedStockSelect?: (stock: StockGetDto) => void;
}

interface StockWithImageCardProps {
  stock: StockGetWithMainImageDto;
  onClick: () => void;
  onRelatedStockSelect?: (stock: StockGetDto) => void;
}

function StockCard({
  stock,
  onClick,
  onRelatedStockSelect,
}: StockCardProps): ReactElement {
  const { t } = useTranslation();
  const hasRelatedStocks = stock.parentRelations && stock.parentRelations.length > 0;
  const metaRows = getStockMetaRows(stock, t);
  const balance = formatStockBalance(stock);

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
        'cursor-pointer transition-all duration-300 group',
        'bg-white/50 dark:bg-[#1a1025]/40 border-slate-200 dark:border-white/5',
        'hover:border-pink-500/50 dark:hover:border-pink-500/50 hover:shadow-lg hover:shadow-pink-500/10 hover:-translate-y-1',
        'active:scale-[0.98] touch-manipulation'
      )}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2 py-0.5 rounded-md text-xs font-bold whitespace-nowrap bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300 border border-pink-200 dark:border-pink-800/50">
                {t('productSelectDialog.stock')}
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400 font-mono bg-slate-100 dark:bg-white/5 px-1.5 py-0.5 rounded">
                {stock.erpStockCode}
              </span>
            </div>
            <h3 className="font-semibold text-base mb-2 truncate text-slate-900 dark:text-white group-hover:text-pink-600 dark:group-hover:text-pink-400 transition-colors">{stock.stockName}</h3>
            {metaRows.map((row) => (
              <div key={row.label} className="text-sm text-slate-500 dark:text-slate-400 mb-1">
                {row.label}: <span className="font-medium text-slate-700 dark:text-slate-300">{row.value}</span>
              </div>
            ))}
            {stock.unit && (
              <div className="text-sm text-slate-500 dark:text-slate-400">
                {t('productSelectDialog.unit')}: <span className="font-medium text-slate-700 dark:text-slate-300">{stock.unit}</span>
              </div>
            )}
            {balance ? (
              <div className="mt-2 inline-flex items-center rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-300">
                {t('productSelectDialog.balance')}: {balance}
              </div>
            ) : null}
            {hasRelatedStocks && (
              <div className="mt-3">
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
}: StockWithImageCardProps): ReactElement {
  const { t } = useTranslation();
  const imageUrl = stock.mainImage ? getImageUrl(stock.mainImage.filePath) : null;
  const hasRelatedStocks = stock.parentRelations && stock.parentRelations.length > 0;
  const metaRows = getStockMetaRows(stock, t);
  const balance = formatStockBalance(stock);

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
        'cursor-pointer transition-all duration-300 group',
        'bg-white/50 dark:bg-[#1a1025]/40 border-slate-200 dark:border-white/5',
        'hover:border-pink-500/50 dark:hover:border-pink-500/50 hover:shadow-lg hover:shadow-pink-500/10 hover:-translate-y-1',
        'active:scale-[0.98] touch-manipulation overflow-hidden'
      )}
      onClick={onClick}
    >
      <CardContent className="p-0">
        {imageUrl && (
          <div className="relative w-full h-48 bg-slate-100 dark:bg-white/5 overflow-hidden">
            <img
              src={imageUrl}
              alt={stock.mainImage?.altText || stock.stockName}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          </div>
        )}
        <div className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <span className="px-2 py-0.5 rounded-md text-xs font-bold whitespace-nowrap bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300 border border-pink-200 dark:border-pink-800/50">
                  {t('productSelectDialog.stock')}
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400 font-mono bg-slate-100 dark:bg-white/5 px-1.5 py-0.5 rounded">
                  {stock.erpStockCode}
                </span>
              </div>
              <h3 className="font-semibold text-base mb-2 truncate text-slate-900 dark:text-white group-hover:text-pink-600 dark:group-hover:text-pink-400 transition-colors">{stock.stockName}</h3>
            {metaRows.map((row) => (
              <div key={row.label} className="text-sm text-slate-500 dark:text-slate-400 mb-1">
                {row.label}: <span className="font-medium text-slate-700 dark:text-slate-300">{row.value}</span>
              </div>
            ))}
            {stock.unit && (
              <div className="text-sm text-slate-500 dark:text-slate-400">
                {t('productSelectDialog.unit')}: <span className="font-medium text-slate-700 dark:text-slate-300">{stock.unit}</span>
              </div>
            )}
            {balance ? (
              <div className="mt-2 inline-flex items-center rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-300">
                {t('productSelectDialog.balance')}: {balance}
              </div>
            ) : null}
            {hasRelatedStocks && (
                <div className="mt-3">
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
            <div className="shrink-0 text-slate-300 dark:text-slate-600 group-hover:text-pink-500 dark:group-hover:text-pink-400 transition-colors">
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
              >
                <path d="m9 18 6-6-6-6" />
              </svg>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function StockListItem({
  stock,
  onClick,
  onRelatedStockSelect,
}: StockCardProps): ReactElement {
  const { t } = useTranslation();
  const hasRelatedStocks = stock.parentRelations && stock.parentRelations.length > 0;
  const metaRows = getStockMetaRows(stock, t);
  const balance = formatStockBalance(stock);

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
    <div
      className={cn(
        'group flex items-center gap-4 p-3 rounded-xl cursor-pointer transition-all duration-300',
        'bg-white/50 dark:bg-[#1a1025]/40 border-slate-200 dark:border-white/5',
        'hover:border-pink-500/50 dark:hover:border-pink-500/50 hover:bg-pink-50/30 dark:hover:bg-pink-500/5 hover:shadow-md hover:shadow-pink-500/5',
        'active:scale-[0.99] touch-manipulation'
      )}
      onClick={onClick}
    >
      <div className="flex-1 min-w-0 grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
         <div className="md:col-span-5 flex flex-col justify-center">
            <div className="flex items-center gap-2 mb-1">
               <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300 border border-pink-200 dark:border-pink-800/50 uppercase tracking-wider">
                  {t('productSelectDialog.stock')}
               </span>
               <span className="text-xs font-mono text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-white/5 px-1.5 py-0.5 rounded">
                 {stock.erpStockCode}
               </span>
            </div>
            <span className="font-semibold text-sm text-slate-900 dark:text-white truncate group-hover:text-pink-600 dark:group-hover:text-pink-400 transition-colors">
              {stock.stockName}
            </span>
         </div>

         <div className="md:col-span-4 flex flex-col justify-center gap-1 text-sm text-slate-500 dark:text-slate-400">
            {metaRows.map((row) => (
              <span key={row.label} className="truncate text-xs">
                {row.label}: <span className="font-medium text-slate-700 dark:text-slate-300">{row.value}</span>
              </span>
            ))}
            {stock.unit && (
              <span className="text-xs opacity-80 mt-0.5">
                {t('productSelectDialog.unit')}: {stock.unit}
              </span>
            )}
            {balance ? (
              <span className="text-xs font-medium text-emerald-600 dark:text-emerald-300">
                {t('productSelectDialog.balance')}: {balance}
              </span>
            ) : null}
         </div>

         <div className="md:col-span-3 flex justify-end items-center gap-2">
            {hasRelatedStocks && (
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs border-slate-200 dark:border-white/10 hover:border-pink-500/50 hover:bg-pink-50 dark:hover:bg-pink-500/10 hover:text-pink-600 dark:hover:text-pink-400 transition-all rounded-lg shrink-0"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {t('productSelectDialog.relatedStocks')} 
                    <span className="ml-1 px-1.5 py-0.5 bg-pink-100 dark:bg-pink-900/50 text-pink-700 dark:text-pink-300 rounded text-[10px] font-bold">
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
            )}
            
            <div className="shrink-0 text-slate-300 dark:text-slate-600 group-hover:text-pink-500 dark:group-hover:text-pink-400 transition-colors">
               <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                 <path d="m9 18 6-6-6-6" />
               </svg>
            </div>
         </div>
      </div>
    </div>
  );
}

function StockWithImageListItem({
  stock,
  onClick,
  onRelatedStockSelect,
}: StockWithImageCardProps): ReactElement {
  const { t } = useTranslation();
  const imageUrl = stock.mainImage ? getImageUrl(stock.mainImage.filePath) : null;
  const hasRelatedStocks = stock.parentRelations && stock.parentRelations.length > 0;
  const metaRows = getStockMetaRows(stock, t);
  const balance = formatStockBalance(stock);

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
    <div
      className={cn(
        'group flex items-center gap-4 p-2 rounded-xl cursor-pointer transition-all duration-300',
        'bg-white/50 dark:bg-[#1a1025]/40 border-slate-200 dark:border-white/5',
        'hover:border-pink-500/50 dark:hover:border-pink-500/50 hover:bg-pink-50/30 dark:hover:bg-pink-500/5 hover:shadow-md hover:shadow-pink-500/5',
        'active:scale-[0.99] touch-manipulation'
      )}
      onClick={onClick}
    >
      <div className="shrink-0 w-16 h-16 rounded-lg bg-slate-100 dark:bg-white/5 overflow-hidden border border-slate-200 dark:border-white/5">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={stock.mainImage?.altText || stock.stockName}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-300 dark:text-slate-600">
             <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0 grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
         <div className="md:col-span-5 flex flex-col justify-center">
            <div className="flex items-center gap-2 mb-1">
               <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300 border border-pink-200 dark:border-pink-800/50 uppercase tracking-wider">
                  {t('productSelectDialog.stock')}
               </span>
               <span className="text-xs font-mono text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-white/5 px-1.5 py-0.5 rounded">
                 {stock.erpStockCode}
               </span>
            </div>
            <span className="font-semibold text-sm text-slate-900 dark:text-white truncate group-hover:text-pink-600 dark:group-hover:text-pink-400 transition-colors">
              {stock.stockName}
            </span>
         </div>

         <div className="md:col-span-4 flex flex-col justify-center gap-1 text-sm text-slate-500 dark:text-slate-400">
            {metaRows.map((row) => (
              <span key={row.label} className="truncate text-xs">
                {row.label}: <span className="font-medium text-slate-700 dark:text-slate-300">{row.value}</span>
              </span>
            ))}
            {stock.unit && (
              <span className="text-xs opacity-80 mt-0.5">
                {t('productSelectDialog.unit')}: {stock.unit}
              </span>
            )}
            {balance ? (
              <span className="text-xs font-medium text-emerald-600 dark:text-emerald-300">
                {t('productSelectDialog.balance')}: {balance}
              </span>
            ) : null}
         </div>

         <div className="md:col-span-3 flex justify-end items-center gap-2">
            {hasRelatedStocks && (
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs border-slate-200 dark:border-white/10 hover:border-pink-500/50 hover:bg-pink-50 dark:hover:bg-pink-500/10 hover:text-pink-600 dark:hover:text-pink-400 transition-all rounded-lg shrink-0"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {t('productSelectDialog.relatedStocks')} 
                    <span className="ml-1 px-1.5 py-0.5 bg-pink-100 dark:bg-pink-900/50 text-pink-700 dark:text-pink-300 rounded text-[10px] font-bold">
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
            )}
            
            <div className="shrink-0 text-slate-300 dark:text-slate-600 group-hover:text-pink-500 dark:group-hover:text-pink-400 transition-colors">
               <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                 <path d="m9 18 6-6-6-6" />
               </svg>
            </div>
         </div>
      </div>
    </div>
  );
}

export function ProductSelectDialog({
  open,
  onOpenChange,
  onSelect,
  disableRelatedStocks = false,
}: ProductSelectDialogProps): ReactElement {
  const { t, i18n } = useTranslation();
  const [viewMode, setViewMode] = useState<'card' | 'list'>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('stocks');
  const [isListening, setIsListening] = useState(false);
  const [draftFilterRows, setDraftFilterRows] = useState<FilterRow[]>([]);
  const [appliedFilterRows, setAppliedFilterRows] = useState<FilterRow[]>([]);
  const [relatedStocksDialogOpen, setRelatedStocksDialogOpen] = useState(false);
  const [selectedStock, setSelectedStock] = useState<StockGetDto | StockGetWithMainImageDto | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const debouncedSearch = useDebouncedValue(searchQuery, DROPDOWN_DEBOUNCE_MS);
  const isThresholdInput = searchQuery.trim().length > 0 && searchQuery.trim().length < DROPDOWN_MIN_CHARS;
  const appliedAdvancedFilters = useMemo(() => rowsToBackendFilters(appliedFilterRows), [appliedFilterRows]);
  const hasAdvancedFilters = appliedAdvancedFilters.length > 0;
  const minCharsHint = t('common.dropdown.minCharsHint', {
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
    if (!open) {
      setSearchQuery('');
      setDraftFilterRows([]);
      setAppliedFilterRows([]);
      setIsListening(false);
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    }
  }, [open]);

  const stocksDropdown = useDropdownInfiniteSearch<StockGetDto>({
    entityKey: 'stocks',
    searchTerm: debouncedSearch,
    enabled: open && activeTab === 'stocks',
    minChars: DROPDOWN_MIN_CHARS,
    // Keep request size high enough for seamless infinite scroll while list UI stays compact.
    pageSize: DROPDOWN_PAGE_SIZE,
    sortBy: 'Id',
    sortDirection: 'desc',
    extraQueryKey: [JSON.stringify(appliedAdvancedFilters)],
    buildFilters: (searchTerm) => {
      if (hasAdvancedFilters) {
        return appliedAdvancedFilters;
      }
      return searchTerm
        ? [...STOCK_SEARCH_COLUMNS.map((column) => ({ column, operator: 'contains', value: searchTerm }))]
        : undefined;
    },
    filterLogic: hasAdvancedFilters ? 'and' : 'or',
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
    extraQueryKey: [JSON.stringify(appliedAdvancedFilters)],
    buildFilters: (searchTerm) => {
      if (hasAdvancedFilters) {
        return appliedAdvancedFilters;
      }
      return searchTerm
        ? [...STOCK_SEARCH_COLUMNS.map((column) => ({ column, operator: 'contains', value: searchTerm }))]
        : undefined;
    },
    filterLogic: hasAdvancedFilters ? 'and' : 'or',
    fetchPage: dropdownApi.getStockWithImagesPage,
  });

  const visibleStocks = useMemo(
    () =>
      (hasAdvancedFilters ? stocksDropdown.items.filter((item) => matchesSearchQuery(item, searchQuery)) : stocksDropdown.items),
    [hasAdvancedFilters, searchQuery, stocksDropdown.items]
  );

  const visibleStocksWithImages = useMemo(
    () =>
      (hasAdvancedFilters
        ? stocksWithImagesDropdown.items.filter((item) => matchesSearchQuery(item, searchQuery))
        : stocksWithImagesDropdown.items),
    [hasAdvancedFilters, searchQuery, stocksWithImagesDropdown.items]
  );

  const handleStockSelect = async (stock: StockGetDto | StockGetWithMainImageDto): Promise<void> => {
    const hasRelatedStocks = stock.parentRelations && stock.parentRelations.length > 0;
    
    if (hasRelatedStocks && !disableRelatedStocks) {
      setSelectedStock(stock);
      onOpenChange(false);
      setRelatedStocksDialogOpen(true);
    } else {
      try {
        await onSelect({
          id: stock.id,
          code: stock.erpStockCode,
          name: stock.stockName,
          groupCode: stock.grupKodu,
        });
        onOpenChange(false);
      } catch (error) {
        console.error('❌ [ProductSelectDialog] onSelect hatası:', error);
        throw error;
      }
    }
  };

  const handleRelatedStocksConfirm = async (selectedStockIds: number[]): Promise<void> => {
    if (!selectedStock) {
      return;
    }

    try {
      await onSelect({
        id: selectedStock.id,
        code: selectedStock.erpStockCode,
        name: selectedStock.stockName,
        groupCode: selectedStock.grupKodu,
        relatedStockIds: selectedStockIds,
      });
      setRelatedStocksDialogOpen(false);
      setSelectedStock(null);
    } catch (error) {
      console.error('❌ [ProductSelectDialog] onSelect hatası:', error);
      setRelatedStocksDialogOpen(false);
      setSelectedStock(null);
      throw error;
    }
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
        <div className="flex flex-col gap-2">
          {visibleStocks.map((stock) => (
            <StockListItem
              key={stock.id}
              stock={stock}
              onClick={() => handleStockSelect(stock)}
              onRelatedStockSelect={handleStockSelect}
            />
          ))}
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {visibleStocks.map((stock) => (
          <StockCard
            key={stock.id}
            stock={stock}
            onClick={() => handleStockSelect(stock)}
            onRelatedStockSelect={handleStockSelect}
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
        <div className="flex flex-col gap-2">
          {visibleStocksWithImages.map((stock) => (
            <StockWithImageListItem
              key={stock.id}
              stock={stock}
              onClick={() => handleStockSelect(stock)}
              onRelatedStockSelect={handleStockSelect}
            />
          ))}
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {visibleStocksWithImages.map((stock) => (
          <StockWithImageCard
            key={stock.id}
            stock={stock}
            onClick={() => handleStockSelect(stock)}
            onRelatedStockSelect={handleStockSelect}
          />
        ))}
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} className="w-[calc(100vw-1rem)] sm:w-[calc(100vw-2rem)] max-w-[750px] max-h-[85vh] flex flex-col p-0 bg-white dark:bg-[#130822] border border-slate-100 dark:border-white/10 text-slate-900 dark:text-white shadow-2xl overflow-hidden">
        <DialogHeader className="px-6 py-3 flex-shrink-0 border-b border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-[#1a1025]/50 flex flex-row items-center justify-between sticky top-0 z-10 backdrop-blur-sm">
          <DialogTitle className="text-lg font-bold text-slate-900 dark:text-white">
            {t('productSelectDialog.title')}
          </DialogTitle>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-white/10 transition-colors"
            onClick={() => onOpenChange(false)}
          >
            <X className="h-4 w-4" />
          </Button>
        </DialogHeader>

        <div className="px-6 py-3 flex-shrink-0 bg-slate-50/50 dark:bg-white/5 border-b border-slate-200/50 dark:border-white/5">
          <div className="flex flex-col sm:flex-row gap-3">
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
                  className="pl-10 pr-20 h-11 bg-white dark:bg-[#0c0516] border-slate-200 dark:border-white/10 focus:border-pink-500/50 dark:focus:border-pink-500/50 focus:ring-pink-500/20 rounded-xl transition-all shadow-sm"
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
                    'shrink-0 h-11 w-11 rounded-xl transition-all',
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

            <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-11 rounded-xl bg-white dark:bg-[#0c0516] border-slate-200 dark:border-white/10 hover:border-pink-500/50 hover:bg-pink-50 dark:hover:bg-pink-500/10 text-slate-500 dark:text-slate-400 hover:text-pink-600 dark:hover:text-pink-400"
                  >
                    <Filter className="h-4 w-4 mr-2" />
                    {t('common.filters', { defaultValue: 'Filtreler' })}
                    {hasAdvancedFilters ? (
                      <span className="ml-2 inline-flex min-w-5 justify-center rounded-full bg-pink-100 px-1.5 py-0.5 text-[10px] font-semibold text-pink-700 dark:bg-pink-900/40 dark:text-pink-300">
                        {appliedAdvancedFilters.length}
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
                    onSearch={() => setAppliedFilterRows(draftFilterRows)}
                    onClear={() => {
                      setDraftFilterRows([]);
                      setAppliedFilterRows([]);
                    }}
                    translationNamespace="common"
                  />
                  <div className="flex items-center justify-end gap-2 border-t border-slate-200 dark:border-white/10 p-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setDraftFilterRows(appliedFilterRows)}
                    >
                      {t('common.cancel', { defaultValue: 'İptal' })}
                    </Button>
                    <Button
                      type="button"
                      onClick={() => setAppliedFilterRows(draftFilterRows)}
                    >
                      {t('common.apply', { defaultValue: 'Uygula' })}
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
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0 px-6 pt-4">
          <TabsList className="w-full justify-start gap-2 bg-transparent p-0 mb-4 border-b border-slate-200/50 dark:border-white/5 h-auto">
            <TabsTrigger 
              value="stocks"
              className="px-6 py-2.5 rounded-t-xl rounded-b-none border-b-2 border-transparent data-[state=active]:border-pink-500 data-[state=active]:bg-pink-500/5 dark:data-[state=active]:bg-pink-500/10 data-[state=active]:text-pink-600 dark:data-[state=active]:text-pink-400 font-semibold transition-all"
            >
              {t('productSelectDialog.stocks')}
            </TabsTrigger>
            <TabsTrigger 
              value="stocksWithImages"
              className="px-6 py-2.5 rounded-t-xl rounded-b-none border-b-2 border-transparent data-[state=active]:border-pink-500 data-[state=active]:bg-pink-500/5 dark:data-[state=active]:bg-pink-500/10 data-[state=active]:text-pink-600 dark:data-[state=active]:text-pink-400 font-semibold transition-all"
            >
              {t('productSelectDialog.stocksWithImages')}
            </TabsTrigger>
          </TabsList>

          <div
            ref={scrollContainerRef}
            onScroll={handleScroll}
            className="flex-1 overflow-y-auto min-h-0 max-h-[420px] custom-scrollbar pb-6"
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

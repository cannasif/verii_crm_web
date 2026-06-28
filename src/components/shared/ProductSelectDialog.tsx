import { type ReactElement, useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, LayoutGrid, List as ListIcon, Package, X, AlertCircle, Filter } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { getImageUrl } from '@/features/stock/utils/image-url';
import { StockWarehouseBalanceBadge } from '@/features/stock/components/StockWarehouseBalanceBadge';
import {
  dedupeStocksByErpStockCode,
  normalizeErpStockCodeForDedupe,
} from '@/features/stock/utils/dedupe-stocks-by-erp-code';
import { RelatedStocksSelectionDialog, type RelatedStockSelectionConfirmItem } from './RelatedStocksSelectionDialog';
import { cn } from '@/lib/utils';
import type { StockGetDto, StockGetWithMainImageDto } from '@/features/stock/types';
import { getLocalizedStockName } from '@/features/stock/utils/localized-stock-name';
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
import { getCatalogFieldLabel } from '@/lib/catalog-field-labels';
import { useSystemSettingsStore } from '@/stores/system-settings-store';

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

interface ProductSelectStockItemProps {
  stock: StockGetWithMainImageDto;
  onClick: () => void;
  selected?: boolean;
  alreadyInDraft?: boolean;
  alreadyOnDocumentLine?: boolean;
}

function resolveProductSelectStockImageUrl(stock: StockGetWithMainImageDto): string | null {
  const mainPath = stock.mainImage?.filePath?.trim();
  if (mainPath) {
    return getImageUrl(mainPath);
  }
  const primary = stock.stockImages?.find((img) => img.isPrimary) ?? stock.stockImages?.[0];
  const fallbackPath = primary?.filePath?.trim();
  return fallbackPath ? getImageUrl(fallbackPath) : null;
}

function ProductSelectCatalogStockCard({
  stock,
  onClick,
  selected = false,
  alreadyInDraft = false,
  alreadyOnDocumentLine = false,
}: ProductSelectStockItemProps): ReactElement {
  const { t, i18n } = useTranslation('common');
  const displayStockName = getLocalizedStockName(stock, i18n.language);
  const watermark = (stock.erpStockCode ?? '').slice(0, 2).toUpperCase() || '·';
  const relCount = stock.parentRelations?.length ?? 0;
  const imageUrl = resolveProductSelectStockImageUrl(stock);

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'group relative flex flex-col overflow-hidden rounded-xl border border-slate-300/90 bg-white crm-text-start shadow-md shadow-slate-200/45 backdrop-blur-md transition-all duration-300 ease-out will-change-transform dark:border-white/10 dark:bg-white/[0.03] dark:shadow-none',
        'hover:-translate-y-0.5 hover:border-rose-400/60 hover:shadow-[0_10px_30px_-8px_rgba(236,72,153,0.28),0_2px_6px_rgba(15,23,42,0.06)] dark:hover:border-rose-500/45 dark:hover:bg-white/[0.05] dark:hover:shadow-[0_6px_24px_rgba(236,72,153,0.22)]',
        selected &&
          'border-pink-400/70 bg-gradient-to-b from-pink-50/90 to-white shadow-[0_6px_22px_-6px_rgba(236,72,153,0.28)] ring-1 ring-pink-400/40 dark:from-pink-500/[0.08] dark:to-transparent dark:border-pink-500/55 dark:shadow-[0_0_22px_rgba(236,72,153,0.2)] dark:ring-pink-500/30',
      )}
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-pink-500/35 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        aria-hidden
      />

      {selected ? (
        <div
          className="pointer-events-none absolute crm-end-1-5 top-1.5 z-20 flex h-6 w-6 items-center justify-center rounded-full border border-pink-400/80 bg-pink-500 shadow-[0_4px_14px_-2px_rgba(236,72,153,0.6)] ring-2 ring-white/90 backdrop-blur-md dark:ring-zinc-950/80"
          aria-hidden
        >
          <Check className="h-3 w-3 text-white" strokeWidth={3.5} />
        </div>
      ) : null}

      <div className="relative aspect-[16/9] w-full overflow-hidden bg-gradient-to-br from-slate-100 via-white to-slate-200/70 dark:from-zinc-900 dark:via-slate-950 dark:to-zinc-900">
        {imageUrl ? (
          <>
            <img
              src={imageUrl}
              alt={displayStockName}
              loading="lazy"
              className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
            />
            <div
              className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_top,rgba(15,23,42,0.45),transparent_55%)] dark:bg-[linear-gradient(to_top,rgba(9,9,11,0.7),transparent_55%)]"
              aria-hidden
            />
          </>
        ) : (
          <>
            <div
              className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(236,72,153,0.14),transparent_55%),radial-gradient(circle_at_80%_90%,rgba(59,130,246,0.09),transparent_50%)] dark:bg-[radial-gradient(circle_at_30%_20%,rgba(236,72,153,0.18),transparent_55%),radial-gradient(circle_at_80%_90%,rgba(59,130,246,0.12),transparent_50%)]"
              aria-hidden
            />
            <div
              className="pointer-events-none absolute inset-0 opacity-60 [background-image:linear-gradient(rgba(15,23,42,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(15,23,42,0.05)_1px,transparent_1px)] [background-size:18px_18px] dark:opacity-70 dark:[background-image:linear-gradient(rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px)]"
              aria-hidden
            />
            <span
              className="pointer-events-none absolute -bottom-2 crm-start-1 select-none font-mono text-[clamp(2.25rem,7vw,4rem)] font-black uppercase leading-none tracking-tighter text-slate-900/[0.07] transition-all duration-500 group-hover:-translate-y-0.5 group-hover:text-pink-500/20 dark:text-white/[0.06] dark:group-hover:text-pink-300/[0.14]"
              aria-hidden
            >
              {watermark}
            </span>
            <Package
              className="pointer-events-none absolute crm-end-2 top-2 h-4 w-4 text-slate-400/70 transition-all duration-300 group-hover:text-pink-500/70 dark:text-white/15 dark:group-hover:text-pink-300/60"
              aria-hidden
            />
            <div
              className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_top,rgba(241,245,249,0.9),transparent_55%)] dark:bg-[linear-gradient(to_top,rgba(9,9,11,0.85),transparent_50%)]"
              aria-hidden
            />
          </>
        )}
        {(alreadyInDraft || alreadyOnDocumentLine || relCount > 0) ? (
          <div className="absolute bottom-1.5 crm-start-1-5 z-10 flex flex-wrap items-center gap-1">
            {alreadyInDraft ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="rounded-full border border-amber-500/50 bg-amber-500 px-1.5 py-0 text-[8px] font-semibold uppercase tracking-wide text-white shadow-sm backdrop-blur-md dark:border-amber-400/50 dark:bg-amber-500/25 dark:text-amber-100">
                    {t('catalogStockPicker.alreadyInDraftBadge')}
                  </span>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-xs text-xs">
                  {t('catalogStockPicker.alreadyInDraftTooltip')}
                </TooltipContent>
              </Tooltip>
            ) : null}
            {alreadyOnDocumentLine ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="rounded-full border border-indigo-500/50 bg-indigo-500 px-1.5 py-0 text-[8px] font-semibold uppercase tracking-wide text-white shadow-sm backdrop-blur-md dark:border-indigo-400/50 dark:bg-indigo-500/25 dark:text-indigo-100">
                    {t('catalogStockPicker.alreadyOnLineBadge')}
                  </span>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-xs text-xs">
                  {t('catalogStockPicker.alreadyOnLineTooltip')}
                </TooltipContent>
              </Tooltip>
            ) : null}
            {relCount > 0 ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="inline-flex items-center gap-0.5 rounded-full border border-orange-500/50 bg-orange-500 px-1.5 py-0 font-mono text-[8px] font-semibold text-white shadow-sm backdrop-blur-md dark:border-orange-400/50 dark:bg-orange-500/25 dark:text-orange-100">
                    ×{relCount}
                  </span>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-xs text-xs">
                  {t('catalogStockPicker.relatedStocksHint')}
                </TooltipContent>
              </Tooltip>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-1 p-2.5">
        <div className="flex items-center justify-between gap-2">
          <span className="truncate font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-pink-600 dark:text-pink-300/90">
            {stock.erpStockCode}
          </span>
          {stock.unit ? (
            <span className="shrink-0 rounded-md bg-slate-100 px-1.5 py-0 font-mono text-[9px] font-semibold uppercase tracking-wider text-slate-600 dark:bg-white/[0.06] dark:text-slate-300">
              {stock.unit}
            </span>
          ) : null}
        </div>

        <h3 className="line-clamp-2 min-h-[2.2em] text-[12.5px] font-medium leading-snug tracking-tight text-slate-800 dark:text-slate-100">
          {displayStockName}
        </h3>

        <div className="mt-auto flex w-fit max-w-full pt-1">
          <StockWarehouseBalanceBadge stockId={stock.id} unit={stock.unit} />
        </div>

        {(stock.grupKodu || stock.kod1) ? (
          <div className="mt-auto flex items-center gap-1 pt-0.5">
            {stock.grupKodu ? (
              <span className="truncate rounded bg-pink-50 px-1.5 py-0.5 font-mono text-[9px] text-pink-700/90 dark:bg-pink-500/[0.08] dark:text-pink-200/90">
                {stock.grupKodu}
              </span>
            ) : null}
            {stock.kod1 ? (
              <span className="truncate rounded bg-slate-100/80 px-1.5 py-0.5 font-mono text-[9px] text-slate-500 dark:bg-white/[0.04] dark:text-slate-400">
                {stock.kod1}
              </span>
            ) : null}
          </div>
        ) : null}
      </div>
    </button>
  );
}

type ProductSelectCatalogStockListProps = {
  stocks: StockGetWithMainImageDto[];
  getSelectionKey: (value: { id?: number; code: string }) => string;
  selectedKeySet: Set<string>;
  draftSnapshotList: ProductSelectionResult[];
  documentLinesList: ProductSelectionResult[];
  onStockClick: (stock: StockGetWithMainImageDto) => void;
};

function ProductSelectCatalogStockList({
  stocks,
  getSelectionKey,
  selectedKeySet,
  draftSnapshotList,
  documentLinesList,
  onStockClick,
}: ProductSelectCatalogStockListProps): ReactElement {
  const { t, i18n } = useTranslation('common');
  const systemSettings = useSystemSettingsStore((state) => state.settings);
  const groupCodeLabel = getCatalogFieldLabel(systemSettings, 'grupKodu', t);

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-300/90 bg-white shadow-md shadow-slate-200/50 backdrop-blur-md dark:border-white/10 dark:bg-white/[0.03] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] dark:shadow-none">
      <div className="overflow-auto">
        <table className="w-full min-w-[620px] table-fixed border-collapse text-sm sm:min-w-[720px]">
          <thead>
            <tr className="border-b border-slate-300/90 bg-slate-100/90 text-[10px] font-semibold uppercase tracking-wide text-slate-700 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-400 sm:text-[11px]">
              <th className="w-[120px] crm-border-end border-slate-300/90 px-2 py-1.5 text-center sm:px-3 sm:py-2 dark:border-white/10">
                {t('catalogStockPicker.listColCode')}
              </th>
              <th className="crm-border-end border-slate-300/90 px-2 py-1.5 text-center sm:px-3 sm:py-2 dark:border-white/10">
                {t('catalogStockPicker.listColName')}
              </th>
              <th className="w-14 crm-border-end border-slate-300/90 px-2 py-1.5 text-center sm:py-2 dark:border-white/10">
                {t('catalogStockPicker.unit')}
              </th>
              <th className="w-24 crm-border-end border-slate-300/90 px-2 py-1.5 text-center sm:py-2 dark:border-white/10">
                {groupCodeLabel}
              </th>
              <th className="w-36 crm-border-end border-slate-300/90 px-2 py-1.5 text-center sm:py-2 dark:border-white/10">
                {t('catalogStockPicker.warehouseBalanceTotal', { defaultValue: 'Toplam bakiye' })}
              </th>
              <th className="w-16 crm-border-end border-slate-300/90 px-2 py-1.5 text-center sm:py-2 dark:border-white/10">
                {t('catalogStockPicker.listColRelated')}
              </th>
              <th className="w-28 px-2 py-1.5 text-center sm:py-2">{t('catalogStockPicker.listColAction')}</th>
            </tr>
          </thead>
          <tbody>
            {stocks.map((stock) => {
              const selectionKey = getSelectionKey({ id: stock.id, code: stock.erpStockCode });
              const selected = selectedKeySet.has(selectionKey);
              const inOpeningDraft = stockMatchesDraftSnapshot(stock, draftSnapshotList);
              const onDocumentLine = stockMatchesDraftSnapshot(stock, documentLinesList);
              const relCount = stock.parentRelations?.length ?? 0;
              const displayStockName = getLocalizedStockName(stock, i18n.language);

              return (
                <tr
                  key={stock.id}
                  tabIndex={0}
                  className={cn(
                    'cursor-pointer border-b border-slate-200/90 transition-colors duration-200 hover:bg-rose-50/80 dark:border-white/5 dark:hover:bg-rose-500/[0.07]',
                    selected && 'bg-pink-50 dark:bg-pink-500/10 ring-1 ring-inset ring-pink-500/25',
                  )}
                  onClick={() => onStockClick(stock)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onStockClick(stock);
                    }
                  }}
                >
                  <td className="crm-border-end border-slate-200/90 px-2 py-1 align-middle sm:px-3 sm:py-1.5 dark:border-white/10">
                    <div className="flex flex-wrap items-center justify-center gap-1">
                      <span className="font-mono text-[11px] font-semibold tracking-wide text-pink-700 dark:text-pink-300 sm:text-xs">
                        {stock.erpStockCode}
                      </span>
                      {inOpeningDraft ? (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Badge
                              variant="outline"
                              className="h-4 border border-amber-400/40 bg-amber-50 px-1 text-[8px] font-semibold leading-none text-amber-800 dark:bg-amber-500/10 dark:text-amber-200"
                            >
                              {t('catalogStockPicker.alreadyInDraftBadge')}
                            </Badge>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="max-w-xs text-xs">
                            {t('catalogStockPicker.alreadyInDraftTooltip')}
                          </TooltipContent>
                        </Tooltip>
                      ) : null}
                      {onDocumentLine ? (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Badge
                              variant="outline"
                              className="h-4 border border-indigo-400/40 bg-indigo-50 px-1 text-[8px] font-semibold leading-none text-indigo-800 dark:bg-indigo-500/10 dark:text-indigo-200"
                            >
                              {t('catalogStockPicker.alreadyOnLineBadge')}
                            </Badge>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="max-w-xs text-xs">
                            {t('catalogStockPicker.alreadyOnLineTooltip')}
                          </TooltipContent>
                        </Tooltip>
                      ) : null}
                    </div>
                  </td>
                  <td className="crm-border-end border-slate-200/90 px-2 py-1 align-middle sm:px-3 sm:py-1.5 dark:border-white/10">
                    <div className="min-w-0 crm-text-start">
                      <span className="line-clamp-2 text-sm font-medium leading-relaxed tracking-tight text-slate-900 dark:text-slate-100">
                        {displayStockName}
                      </span>
                    </div>
                  </td>
                  <td className="crm-border-end border-slate-200/90 px-2 py-1 text-center align-middle font-mono text-[11px] text-slate-500 dark:text-slate-400 sm:py-1.5 sm:text-xs dark:border-white/10">
                    {stock.unit || '—'}
                  </td>
                  <td className="crm-border-end border-slate-200/90 px-2 py-1 text-center align-middle font-mono text-[11px] text-slate-500 dark:text-slate-400 sm:py-1.5 sm:text-xs dark:border-white/10">
                    {stock.grupKodu || '—'}
                  </td>
                  <td className="crm-border-end border-slate-200/90 px-2 py-1 align-middle text-center sm:py-1.5 dark:border-white/10">
                    <div className="flex justify-center" onClick={(e) => e.stopPropagation()}>
                      <StockWarehouseBalanceBadge stockId={stock.id} unit={stock.unit} />
                    </div>
                  </td>
                  <td className="crm-border-end border-slate-200/90 px-2 py-1 align-middle text-center sm:py-1.5 dark:border-white/10">
                    {relCount > 0 ? (
                      <Badge
                        variant="outline"
                        className="border border-cyan-400/40 bg-cyan-50 px-1.5 py-0 text-[10px] font-mono text-cyan-700 dark:bg-cyan-500/10 dark:text-cyan-300"
                      >
                        {relCount}
                      </Badge>
                    ) : (
                      <span className="text-slate-400 dark:text-slate-500">—</span>
                    )}
                  </td>
                  <td className="px-2 py-1 align-middle text-center sm:py-1.5">
                    {selected ? (
                      <span className="inline-flex items-center justify-center gap-1 text-xs font-semibold text-pink-600 dark:text-pink-300">
                        <Check className="h-3.5 w-3.5 drop-shadow-[0_0_10px_rgba(244,114,182,0.55)]" />
                        {t('catalogStockPicker.selectedBadge')}
                      </span>
                    ) : (
                      <span className="text-xs text-slate-400 dark:text-slate-500">{t('catalogStockPicker.selectStockButton')}</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
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
    const normalizedCode = normalizeErpStockCodeForDedupe(result.code);
    setSelectedResults((prev) => {
      if (
        normalizedCode &&
        prev.some((item) => normalizeErpStockCodeForDedupe(item.code) === normalizedCode)
      ) {
        return prev;
      }
      const nextKey = getSelectionKey(result);
      if (prev.some((item) => getSelectionKey(item) === nextKey)) {
        return prev;
      }
      return [...prev, result];
    });
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

  const stocksDropdown = useDropdownInfiniteSearch<StockGetWithMainImageDto>({
    entityKey: 'stocks-with-images',
    searchTerm: debouncedSearch,
    enabled: open,
    minChars: DROPDOWN_MIN_CHARS,
    pageSize: DROPDOWN_PAGE_SIZE,
    sortBy: 'Id',
    sortDirection: 'desc',
    extraQueryKey: [JSON.stringify(rawAppliedAdvancedFilters), appliedFilterLogic],
    buildFilters: () => (hasAdvancedFilters ? rawAppliedAdvancedFilters : undefined),
    filterLogic: appliedFilterLogic,
    fetchPage: dropdownApi.getStockWithImagesPage,
  });

  const visibleStocks = useMemo(
    () => dedupeStocksByErpStockCode(stocksDropdown.items),
    [stocksDropdown.items],
  );

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
      name: getLocalizedStockName(stock, i18n.language),
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
        name: getLocalizedStockName(selectedStock, i18n.language),
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
      if (!stocksDropdown.hasNextPage || stocksDropdown.isFetchingNextPage) {
        return;
      }

      const target = event.currentTarget;
      if (target.scrollHeight <= 0) {
        return;
      }

      const scrollProgress = (target.scrollTop + target.clientHeight) / target.scrollHeight;
      if (scrollProgress >= DROPDOWN_SCROLL_THRESHOLD) {
        void stocksDropdown.fetchNextPage();
      }
    },
    [stocksDropdown]
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
        <ProductSelectCatalogStockList
          stocks={visibleStocks}
          getSelectionKey={getSelectionKey}
          selectedKeySet={visibleSelectedKeySet}
          draftSnapshotList={draftSnapshotList}
          documentLinesList={documentLinesList}
          onStockClick={(stock) => void handleStockSelect(stock)}
        />
      );
    }

    return (
      <div className="relative">
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(244,63,94,0.06),transparent_55%),radial-gradient(ellipse_60%_40%_at_100%_100%,rgba(148,163,184,0.08),transparent_60%)] dark:bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(244,63,94,0.08),transparent_55%)]"
          aria-hidden
        />
        <div className="relative grid grid-cols-1 gap-2.5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 2xl:gap-3">
          {visibleStocks.map((stock) => (
            <ProductSelectCatalogStockCard
              key={stock.id}
              stock={stock}
              onClick={() => void handleStockSelect(stock)}
              selected={visibleSelectedKeySet.has(getSelectionKey({ id: stock.id, code: stock.erpStockCode }))}
              alreadyInDraft={stockMatchesDraftSnapshot(stock, draftSnapshotList)}
              alreadyOnDocumentLine={stockMatchesDraftSnapshot(stock, documentLinesList)}
            />
          ))}
        </div>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="!fixed !flex min-h-0 flex-col gap-0 !overflow-hidden border border-slate-300/95 bg-[linear-gradient(180deg,#ffffff,#f8fafc_40%,#f1f5f9)] p-0 text-slate-900 shadow-[0_0_50px_rgba(244,63,94,0.08),0_25px_80px_rgba(15,23,42,0.15)] ring-1 ring-slate-300/40 backdrop-blur-3xl dark:border-white/10 dark:bg-zinc-950/85 dark:bg-none dark:text-slate-100 dark:shadow-[0_0_50px_rgba(244,63,94,0.1),0_25px_80px_rgba(0,0,0,0.45)] dark:ring-0 max-lg:!top-3 max-lg:!left-1/2 max-lg:!h-[calc(100svh-0.75rem)] max-lg:!max-h-[calc(100svh-0.75rem)] max-lg:!-translate-x-1/2 max-lg:!translate-y-0 max-lg:!w-[calc(100vw-0.5rem)] max-lg:!max-w-[calc(100vw-0.5rem)] lg:!top-1/2 lg:!left-1/2 lg:!h-[min(86dvh,760px)] lg:!max-h-[min(86dvh,760px)] lg:!-translate-x-1/2 lg:!-translate-y-1/2 lg:!w-[min(1040px,calc(100vw-3rem))] lg:!max-w-[min(1040px,calc(100vw-3rem))] xl:!w-[min(1120px,calc(100vw-4rem))] xl:!max-w-[min(1120px,calc(100vw-4rem))] 2xl:!w-[min(1180px,calc(100vw-5rem))] 2xl:!max-w-[min(1180px,calc(100vw-5rem))]"
      >
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_120%_80%_at_50%_-40%,rgba(244,63,94,0.06),transparent_50%),radial-gradient(ellipse_70%_50%_at_100%_100%,rgba(59,130,246,0.04),transparent_45%)] dark:bg-[radial-gradient(ellipse_120%_80%_at_50%_-40%,rgba(244,63,94,0.12),transparent_50%),radial-gradient(ellipse_70%_50%_at_100%_100%,rgba(59,130,246,0.08),transparent_45%)]"
          aria-hidden
        />
        <DialogHeader className="relative z-10 shrink-0 border-b border-slate-300/90 bg-white px-3 py-2.5 shadow-[inset_0_-1px_0_rgba(148,163,184,0.12)] backdrop-blur-xl dark:border-white/10 dark:bg-zinc-950/80 dark:shadow-none sm:px-6 sm:py-3 flex flex-row items-center justify-between">
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

        <div className="relative z-10 shrink-0 border-b border-slate-300/90 bg-white px-3 py-2.5 backdrop-blur-xl dark:border-white/10 dark:bg-zinc-950/80 sm:px-6 sm:py-3">
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
                  className="absolute crm-start-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-rose-500 transition-colors"
                >
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.3-4.3" />
                </svg>
                <Input
                  type="text"
                  placeholder={t('productSelectDialog.searchPlaceholder')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="crm-ps-10 crm-pe-20 h-10 sm:h-11 bg-white dark:bg-[#0c0516] border-slate-300 dark:border-white/15 focus-visible:border-rose-400 dark:focus-visible:border-rose-500 focus-visible:ring-2 focus-visible:ring-rose-300/60 dark:focus-visible:ring-rose-500/35 rounded-xl transition-all shadow-sm"
                />
              </div>
              {isThresholdInput ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      aria-label={minCharsHint}
                      className="absolute crm-end-12 top-1/2 -translate-y-1/2 inline-flex h-8 w-8 items-center justify-center rounded-lg text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/30"
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
                      : 'bg-white dark:bg-[#0c0516] border-slate-200 dark:border-white/10 hover:border-rose-500/50 hover:bg-rose-50 dark:hover:bg-rose-500/10 text-slate-500 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400'
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
                    className="h-10 sm:h-11 rounded-xl bg-white dark:bg-[#0c0516] border-slate-200 dark:border-white/10 hover:border-rose-500/50 hover:bg-rose-50 dark:hover:bg-rose-500/10 text-slate-500 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400"
                  >
                    <Filter className="h-4 w-4 crm-me-2" />
                    {t('filters', { defaultValue: 'Filtreler' })}
                    {hasAdvancedFilters ? (
                      <span className="crm-ms-2 inline-flex min-w-5 justify-center rounded-full bg-rose-100 px-1.5 py-0.5 text-[10px] font-semibold text-rose-700 dark:bg-rose-900/40 dark:text-rose-300">
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
                      ? "bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 shadow-sm" 
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
                      ? "bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 shadow-sm" 
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
            <div className="mt-3 flex max-h-28 flex-wrap items-center gap-2 overflow-y-auto crm-pe-1">
              <span className="w-full text-xs font-semibold text-slate-500 dark:text-slate-400 sm:w-auto">
                {t('selected', { defaultValue: 'Secilen' })}: {selectedResults.length}
              </span>
              {selectedResults.map((item, index) => (
                <button
                  key={`pick-${index}-${getSelectionKey(item)}`}
                  type="button"
                  onClick={() => removeSelectionAtIndex(index)}
                  title={item.code}
                  className="inline-flex max-w-[min(11rem,42vw)] items-center gap-1 rounded-full border border-rose-200 bg-rose-50 px-2 py-1 crm-text-start text-[11px] font-medium text-rose-700 dark:border-rose-700/40 dark:bg-rose-900/20 dark:text-rose-300 sm:max-w-[13rem]"
                >
                  <span className="flex min-w-0 flex-1 flex-col gap-0 overflow-hidden crm-text-start leading-tight">
                    <span className="truncate font-mono" title={item.code}>
                      {item.code}
                    </span>
                    {item.name ? (
                      <span className="truncate text-[10px] font-normal text-rose-600/90 dark:text-rose-300/80" title={item.name}>
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

        <div
          ref={scrollContainerRef}
          onScroll={handleScroll}
          className="relative z-10 min-h-0 flex-1 touch-pan-y overscroll-contain overflow-y-auto px-3 pb-4 pt-3 [-webkit-overflow-scrolling:touch] custom-scrollbar sm:px-6 sm:pb-6 sm:pt-4"
        >
          {renderStocks()}
          {stocksDropdown.isFetchingNextPage ? (
            <div className="flex items-center justify-center py-4 text-sm text-muted-foreground">
              {t('productSelectDialog.loading')}
            </div>
          ) : null}
        </div>
        {multiSelect ? (
          <div className="relative z-10 flex shrink-0 items-center justify-end gap-2 border-t border-slate-300/90 bg-white px-3 py-2.5 dark:border-white/10 dark:bg-zinc-950/80 sm:px-6 sm:py-3">
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
              className="bg-linear-to-r from-rose-600 to-amber-600 hover:from-rose-700 hover:to-amber-700 text-white"
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

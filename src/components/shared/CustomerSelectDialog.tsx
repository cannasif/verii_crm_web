import { type ReactElement, useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { CustomerDto } from '@/features/customer-management/types/customer-types';
import { cn } from '@/lib/utils';
import {
  Phone, Mail, ChevronRight, Search, Mic, Building2, UserRound, X, MapPin,
  Users, LayoutGrid, List, AlertCircle, SlidersHorizontal,
} from 'lucide-react';
import { useDropdownInfiniteSearch } from '@/hooks/useDropdownInfiniteSearch';
import { dropdownApi } from '@/components/shared/dropdown/dropdown-api';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import {
  DROPDOWN_MIN_CHARS,
  DROPDOWN_PAGE_SIZE,
  DROPDOWN_SCROLL_THRESHOLD,
} from '@/components/shared/dropdown/constants';
import type { FilterRow } from '@/lib/advanced-filter-types';
import { rowsToBackendFilters } from '@/lib/advanced-filter-types';
import { AdvancedFilter } from '@/components/shared/AdvancedFilter';
import { CUSTOMER_FILTER_COLUMNS } from '@/features/customer-management/types/customer-filter.types';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

const POPUP_SEARCH_DEBOUNCE_MS = 700;

export interface CustomerSelectionResult {
  customerId?: number;
  erpCustomerCode?: string;
  customerName?: string;
}

interface CustomerSelectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (result: CustomerSelectionResult) => void;
  className?: string;
  contextUserId?: number | null;
}

/** ERP: entegre veya ERP müşteri kodu dolu; aksi halde potansiyel. */
export function resolveCustomerSelectKind(c: CustomerDto): 'erp' | 'crm' {
  if (c.isIntegrated === true) return 'erp';
  const code = c.customerCode != null ? String(c.customerCode).trim() : '';
  if (code.length > 0) return 'erp';
  return 'crm';
}

interface CustomerCardProps {
  type: 'erp' | 'crm';
  name: string;
  customerCode?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  district?: string;
  onClick: () => void;
  viewMode: 'list' | 'grid';
  /** Sadece "Tümü" sekmesinde: kart üzerinde ERP / Potansiyel etiketi */
  showKindBadge?: boolean;
}

const INPUT_STYLE = `
  h-12 rounded-xl
  bg-white dark:bg-[#0f0a18]
  border border-slate-300 dark:border-white/10
  shadow-sm
  text-slate-900 dark:text-white text-sm
  placeholder:text-slate-500 dark:placeholder:text-slate-600

  focus-visible:bg-white dark:focus-visible:bg-[#1a1025]
  focus-visible:border-pink-300 dark:focus-visible:border-pink-400/50
  focus-visible:ring-2 focus-visible:ring-pink-200/60 dark:focus-visible:ring-pink-400/15 focus-visible:ring-offset-0

  focus:ring-2 focus:ring-pink-200/50 dark:focus:ring-pink-400/15 focus:ring-offset-0 focus:border-pink-300

  transition-all duration-200
`;

function CustomerCard({
  type,
  name,
  customerCode,
  phone,
  email,
  address,
  city,
  district,
  onClick,
  viewMode,
  showKindBadge = false,
}: CustomerCardProps): ReactElement {
  const { t } = useTranslation('common');
  const locationLabel = [city, district].filter((v): v is string => Boolean(v && v.trim())).join(', ');
  const shortAddress = (address ?? '').trim();
  const trimmedAddress = shortAddress.length > 52 ? `${shortAddress.slice(0, 52)}...` : shortAddress;
  const kindBadge =
    showKindBadge ? (
      <span
        className={cn(
          'inline-flex shrink-0 items-center rounded-md px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide sm:text-[10px]',
          type === 'erp'
            ? 'bg-purple-100 text-purple-800 dark:bg-purple-500/20 dark:text-purple-200'
            : 'bg-rose-100 text-rose-800 dark:bg-rose-950/50 dark:text-rose-200'
        )}
      >
        {type === 'erp' ? t('customerSelectDialog.badgeKindErp') : t('customerSelectDialog.badgeKindPotential')}
      </span>
    ) : null;

  if (viewMode === 'grid') {
    return (
      <div
        onClick={onClick}
        className={cn(
          'group flex h-full cursor-pointer flex-col gap-2 rounded-lg border p-2.5 transition-all duration-200 sm:p-3',
          'border-slate-400/80 bg-white shadow-sm dark:border-white/5 dark:bg-white/5',
          'hover:border-pink-300/80 hover:bg-pink-50/40 hover:shadow-sm dark:hover:border-pink-400/20 dark:hover:bg-white/10'
        )}
      >
        <div className="flex w-full items-start justify-between gap-2">
          <div
            className={cn(
              'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg shadow-sm sm:h-10 sm:w-10',
              type === 'erp'
                ? 'bg-purple-100 text-purple-600 dark:bg-purple-500/10 dark:text-purple-400'
                : 'bg-rose-50 text-rose-600 dark:bg-pink-950/40 dark:text-pink-300'
            )}
          >
            {type === 'erp' ? <Building2 size={18} className="sm:h-5 sm:w-5" /> : <UserRound size={18} className="sm:h-5 sm:w-5" />}
          </div>
          {customerCode ? (
            <span className="max-w-[45%] truncate rounded-md bg-slate-100 px-1.5 py-0.5 font-mono text-[9px] font-medium text-slate-600 dark:bg-white/5 dark:text-slate-400 sm:text-[10px]">
              {customerCode}
            </span>
          ) : null}
        </div>

        <div className="min-h-[2.25rem] space-y-1">
          <div className="flex flex-wrap items-start gap-1.5 gap-y-1">
            <span className="line-clamp-3 min-w-0 flex-1 break-words text-xs font-semibold leading-snug text-slate-900 dark:text-zinc-100 sm:text-sm">
              {name}
            </span>
            {kindBadge}
          </div>
        </div>

        <div className="mt-auto space-y-1 border-t border-slate-200 pt-2 dark:border-white/5">
          {(locationLabel || trimmedAddress) ? (
            <div className="flex min-w-0 items-center gap-1.5 text-[10px] text-slate-600 dark:text-zinc-400 sm:text-[11px]">
              <MapPin size={11} className="shrink-0 opacity-70 sm:h-3.5 sm:w-3.5" />
              <span className="truncate">{locationLabel || trimmedAddress}</span>
            </div>
          ) : null}
          <div className="flex min-w-0 items-center gap-1.5 text-[10px] text-slate-500 dark:text-zinc-400 sm:text-[11px]">
            <Phone size={11} className="shrink-0 opacity-70 sm:h-3.5 sm:w-3.5" />
            <span className="truncate">{phone || '-'}</span>
          </div>
          <div className="flex min-w-0 items-center gap-1.5 text-[10px] text-slate-500 dark:text-zinc-400 sm:text-[11px]">
            <Mail size={11} className="shrink-0 opacity-70 sm:h-3.5 sm:w-3.5" />
            <span className="truncate">{email || '-'}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={onClick}
      className={cn(
        'group flex cursor-pointer items-center gap-2 rounded-lg border p-2 transition-all duration-200 sm:gap-2.5 sm:p-2.5',
        'border-slate-400/80 bg-white shadow-sm dark:border-white/5 dark:bg-white/5',
        'hover:border-pink-300/80 hover:bg-pink-50/35 dark:hover:border-pink-400/20 dark:hover:bg-white/10'
      )}
    >
      <div
        className={cn(
          'flex h-8 w-8 shrink-0 items-center justify-center rounded-full sm:h-9 sm:w-9',
          type === 'erp'
            ? 'bg-purple-100 text-purple-600 dark:bg-purple-500/10 dark:text-purple-400'
            : 'bg-rose-50 text-rose-600 dark:bg-pink-950/40 dark:text-pink-300'
        )}
      >
        {type === 'erp' ? <Building2 size={15} className="sm:h-4 sm:w-4" /> : <UserRound size={15} className="sm:h-4 sm:w-4" />}
      </div>
      <div className="min-w-0 flex-1 sm:max-w-[min(100%,38%)] sm:shrink-0 lg:max-w-[min(100%,34%)]">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="line-clamp-2 min-w-0 flex-1 break-words text-[11px] font-medium leading-snug text-slate-900 dark:text-zinc-200 sm:text-xs">
            {name}
          </span>
          {kindBadge}
        </div>
        {customerCode ? (
          <span className="mt-0.5 block truncate font-mono text-[10px] text-slate-500 dark:text-zinc-500 sm:text-[11px]">{customerCode}</span>
        ) : null}
      </div>

      <div className="grid min-w-0 flex-1 grid-cols-1 gap-1 sm:grid-cols-2 sm:gap-x-3 sm:gap-y-0">
        {(locationLabel || trimmedAddress) ? (
          <div className="flex min-w-0 items-center gap-1 text-[10px] text-slate-600 dark:text-zinc-400 sm:text-[11px]">
            <MapPin size={11} className="shrink-0 opacity-60 sm:h-3.5 sm:w-3.5" />
            <span className="truncate">{locationLabel || trimmedAddress}</span>
          </div>
        ) : null}
        <div className="flex min-w-0 items-center gap-1 text-[10px] text-slate-500 dark:text-zinc-400 sm:text-[11px]">
          <Phone size={11} className="shrink-0 opacity-60 sm:h-3.5 sm:w-3.5" />
          <span className="truncate">{phone || '-'}</span>
        </div>
        <div className="flex min-w-0 items-center gap-1 text-[10px] text-slate-500 dark:text-zinc-400 sm:text-[11px]">
          <Mail size={11} className="shrink-0 opacity-60 sm:h-3.5 sm:w-3.5" />
          <span className="truncate">{email || '-'}</span>
        </div>
      </div>

      <ChevronRight className="h-4 w-4 shrink-0 text-slate-400 transition-colors group-hover:text-pink-400/90 dark:text-zinc-600 dark:group-hover:text-pink-300 sm:h-4 sm:w-4" />
    </div>
  );
}

export function CustomerSelectDialog({
  open,
  onOpenChange,
  onSelect,
  className,
  contextUserId,
}: CustomerSelectDialogProps): ReactElement {
  const { t, i18n } = useTranslation();
  const [activeTab, setActiveTab] = useState<'potential' | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
  const [draftFilterRows, setDraftFilterRows] = useState<FilterRow[]>([]);
  const [appliedFilterRows, setAppliedFilterRows] = useState<FilterRow[]>([]);
  const [filterLogic, setFilterLogic] = useState<'and' | 'or'>('and');
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const debouncedSearch = useDebouncedValue(searchQuery, POPUP_SEARCH_DEBOUNCE_MS);

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
          'fr': 'fr-FR',
        };
        recognition.lang = langMap[i18n.language] || 'tr-TR';

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
    if (!recognitionRef.current) return;
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
      setIsListening(false);
      setIsFilterPanelOpen(false);
      setDraftFilterRows([]);
      setAppliedFilterRows([]);
      setFilterLogic('and');
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    }
  }, [open]);

  const validAppliedFilters = useMemo(
    () => rowsToBackendFilters(appliedFilterRows),
    [appliedFilterRows]
  );
  const hasAdvancedFilters = validAppliedFilters.length > 0;
  const appliedFilterCount = validAppliedFilters.length;
  const advancedFiltersKey = JSON.stringify(appliedFilterRows);

  const {
    items: customers,
    isLoading: isCustomersLoading,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  } = useDropdownInfiniteSearch<CustomerDto>({
    entityKey: 'customers',
    searchTerm: debouncedSearch,
    enabled: open,
    minChars: DROPDOWN_MIN_CHARS,
    pageSize: DROPDOWN_PAGE_SIZE,
    sortBy: 'Id',
    sortDirection: 'asc',
    extraQueryKey: [advancedFiltersKey, filterLogic],
    contextUserId: contextUserId ?? undefined,
    filterLogic,
    buildFilters: () => (hasAdvancedFilters ? validAppliedFilters : undefined),
    fetchPage: dropdownApi.getCustomerPage,
  });

  const isThresholdInput = searchQuery.trim().length > 0 && searchQuery.trim().length < DROPDOWN_MIN_CHARS;
  const minCharsHint = t('common.dropdown.minCharsHint', {
    count: DROPDOWN_MIN_CHARS,
    defaultValue: `Minimum ${DROPDOWN_MIN_CHARS} characters`,
  });

  const displayCustomers = useMemo(() => {
    return customers.map((c) => ({
      ...c,
      type: resolveCustomerSelectKind(c),
    }));
  }, [customers]);

  const potentialCustomers = useMemo(
    () => displayCustomers.filter((c) => c.type === 'crm'),
    [displayCustomers]
  );

  const handleCustomerSelect = (customer: CustomerDto & { type: 'erp' | 'crm' }): void => {
    const code =
      customer.customerCode != null && String(customer.customerCode).trim() !== ''
        ? String(customer.customerCode).trim()
        : undefined;
    onSelect({
      customerId: customer.id,
      erpCustomerCode: code,
      customerName: customer.name,
    });
    onOpenChange(false);
  };

  const handleListScroll = useCallback(
    (event: React.UIEvent<HTMLDivElement>): void => {
      if (!hasNextPage || isFetchingNextPage) return;
      const target = event.currentTarget;
      if (target.scrollHeight <= 0) return;
      const scrollProgress = (target.scrollTop + target.clientHeight) / target.scrollHeight;
      if (scrollProgress >= DROPDOWN_SCROLL_THRESHOLD) {
        void fetchNextPage();
      }
    },
    [fetchNextPage, hasNextPage, isFetchingNextPage]
  );

  const handleApplyFilters = (): void => {
    setAppliedFilterRows(draftFilterRows);
  };

  const handleClearFilters = (): void => {
    setDraftFilterRows([]);
    setAppliedFilterRows([]);
    setFilterLogic('and');
  };

  const renderCustomerList = (
    list: Array<CustomerDto & { type: 'erp' | 'crm' }>,
    emptyKey: string,
    showKindBadge = false
  ): ReactElement => {
    if (isCustomersLoading) {
      return (
        <div className="flex items-center justify-center py-12">
          <div className="text-slate-600 dark:text-zinc-500">
            {t('customerSelectDialog.loading')}
          </div>
        </div>
      );
    }

    if (list.length === 0) {
      return (
        <div className="flex items-center justify-center py-12">
          <div className="text-slate-600 dark:text-zinc-500">
            {searchQuery.trim() || hasAdvancedFilters
              ? t('customerSelectDialog.noResults')
              : t(emptyKey, { ns: 'customer-select-dialog', defaultValue: 'Müşteri bulunamadı' })}
          </div>
        </div>
      );
    }

    return (
      <div>
        <div
          className={cn(
            'grid gap-2 sm:gap-3',
            viewMode === 'list' ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
          )}
        >
          {list.map((customer) => (
            <CustomerCard
              key={`customer-${customer.id}`}
              type={customer.type}
              name={customer.name}
              customerCode={customer.customerCode ?? undefined}
              phone={customer.phone}
              email={customer.email}
              address={customer.address}
              city={customer.cityName}
              district={customer.districtName}
              onClick={() => handleCustomerSelect(customer)}
              viewMode={viewMode}
              showKindBadge={showKindBadge}
            />
          ))}
        </div>
        {isFetchingNextPage ? (
          <div className="flex items-center justify-center py-4 text-sm text-slate-600 dark:text-zinc-500">
            {t('customerSelectDialog.loading')}
          </div>
        ) : null}
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className={cn(
          // dialog.tsx içindeki lg:max-w-lg (~512px) tüm lg+ ekranlarda genişliği kilitliyor; aşağıda lg/xl/2xl ile açıkça eziyoruz
          'flex max-h-[min(92dvh,920px)] w-[calc(100vw-1rem)] max-w-[calc(100vw-1rem)] flex-col overflow-hidden border-slate-300 bg-white p-0 text-slate-900 shadow-xl ring-1 ring-slate-200/90 sm:rounded-2xl dark:border-white/10 dark:bg-[#130822] dark:text-white dark:ring-white/10',
          'sm:w-[min(1152px,calc(100vw-2rem))] sm:max-w-[min(1152px,calc(100vw-2rem))]',
          'md:w-[min(1200px,calc(100vw-2.5rem))] md:max-w-[min(1200px,calc(100vw-2.5rem))]',
          'lg:w-[min(1280px,calc(100vw-3rem))] lg:max-w-[min(1280px,calc(100vw-3rem))]',
          'xl:w-[min(1440px,calc(100vw-4rem))] xl:max-w-[min(1440px,calc(100vw-4rem))]',
          '2xl:w-[min(1600px,calc(100vw-5rem))] 2xl:max-w-[min(1600px,calc(100vw-5rem))]',
          className
        )}
      >
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'potential' | 'all')} className="flex h-full flex-col">
          <DialogHeader className="sticky top-0 z-10 flex shrink-0 flex-row items-start justify-between gap-3 border-b border-slate-200 bg-slate-50 px-4 py-4 backdrop-blur-sm sm:items-center sm:px-6 sm:py-5 dark:border-white/10 dark:bg-[#1a1025]/80">
            <div className="flex min-w-0 flex-1 items-center gap-3 sm:gap-4">
              <div className="h-11 w-11 shrink-0 rounded-2xl bg-linear-to-br from-pink-300 to-orange-300 p-0.5 shadow-md shadow-pink-200/40 dark:from-pink-500/40 dark:to-orange-500/30 dark:shadow-pink-900/20 sm:h-12 sm:w-12">
                <div className="flex h-full w-full items-center justify-center rounded-[14px] bg-white dark:bg-[#130822]">
                  <Users size={22} className="text-pink-400 dark:text-pink-300 sm:h-6 sm:w-6" />
                </div>
              </div>
              <div className="min-w-0 space-y-1 text-left">
                <DialogTitle className="text-lg font-bold tracking-tight text-slate-900 sm:text-xl dark:text-white">
                  {t('customerSelectDialog.title')}
                </DialogTitle>
                <DialogDescription className="text-sm text-slate-600 dark:text-slate-400">
                  {t('customerSelectDialog.description')}
                </DialogDescription>
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => onOpenChange(false)}
              className="h-10 w-10 shrink-0 rounded-xl border-slate-300 bg-white text-slate-700 shadow-sm transition-colors hover:border-red-400 hover:bg-red-50 hover:text-red-600 dark:border-white/15 dark:bg-[#1a1025] dark:text-slate-200 dark:hover:border-red-500/50 dark:hover:bg-red-950/40 dark:hover:text-red-400"
              aria-label={t('close', { ns: 'common' })}
            >
              <X size={20} />
            </Button>
          </DialogHeader>

          <div className="shrink-0 space-y-3 bg-white px-4 pb-0 pt-4 dark:bg-[#130822] sm:px-6 sm:pt-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="group relative min-w-0 flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 transition-colors group-focus-within:text-pink-400" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t('customerSelectDialog.searchPlaceholder')}
                  className={cn(INPUT_STYLE, "pl-9 pr-20")}
                />
                {isThresholdInput ? (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        aria-label={minCharsHint}
                        className="absolute right-10 top-1/2 -translate-y-1/2 inline-flex h-8 w-8 items-center justify-center rounded-lg text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/30"
                      >
                        <AlertCircle size={16} />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top">{minCharsHint}</TooltipContent>
                  </Tooltip>
                ) : null}
                {recognitionRef.current && (
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    onClick={handleVoiceSearch}
                    className={cn(
                      "absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 hover:bg-slate-100 dark:hover:bg-white/5 rounded-lg",
                      isListening ? 'text-pink-400' : 'text-zinc-500'
                    )}
                  >
                    <Mic size={16} />
                  </Button>
                )}
              </div>

              <div className="flex shrink-0 items-center justify-end gap-2 sm:justify-start">
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => setIsFilterPanelOpen((prev) => !prev)}
                className={cn(
                  'relative h-11 w-11 rounded-xl border-slate-300 bg-white shadow-sm transition-all dark:border-white/10 dark:bg-transparent sm:h-12 sm:w-12',
                  isFilterPanelOpen || hasAdvancedFilters
                    ? 'border-pink-200 bg-pink-50/90 text-pink-700 dark:border-pink-400/25 dark:bg-pink-950/35 dark:text-pink-200'
                    : 'text-slate-600 hover:bg-pink-50/50 hover:text-pink-600 dark:text-slate-400 dark:hover:bg-pink-950/25 dark:hover:text-pink-200'
                )}
              >
                <SlidersHorizontal size={18} />
                {appliedFilterCount > 0 && (
                  <Badge className="absolute -top-1.5 -right-1.5 flex h-4 min-w-4 items-center justify-center border border-pink-200/80 bg-pink-100 px-1 text-[10px] font-medium text-pink-800 dark:border-pink-400/30 dark:bg-pink-950/50 dark:text-pink-100">
                    {appliedFilterCount}
                  </Badge>
                )}
              </Button>

              <div className="flex h-11 shrink-0 items-center rounded-xl border border-slate-300 bg-slate-100 p-1 shadow-sm dark:border-white/10 dark:bg-[#1a1025] sm:h-12">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setViewMode('list')}
                  className={cn(
                    'h-9 w-9 rounded-lg transition-all sm:h-10 sm:w-10',
                    viewMode === 'list'
                      ? 'border border-pink-200/90 bg-pink-100/90 text-pink-800 shadow-sm dark:border-pink-400/25 dark:bg-pink-950/40 dark:text-pink-100'
                      : 'text-slate-600 hover:bg-pink-50/80 hover:text-pink-700 dark:text-slate-400 dark:hover:bg-pink-950/30 dark:hover:text-pink-200'
                  )}
                >
                  <List size={18} className="sm:h-5 sm:w-5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setViewMode('grid')}
                  className={cn(
                    'h-9 w-9 rounded-lg transition-all sm:h-10 sm:w-10',
                    viewMode === 'grid'
                      ? 'border border-pink-200/90 bg-pink-100/90 text-pink-800 shadow-sm dark:border-pink-400/25 dark:bg-pink-950/40 dark:text-pink-100'
                      : 'text-slate-600 hover:bg-pink-50/80 hover:text-pink-700 dark:text-slate-400 dark:hover:bg-pink-950/30 dark:hover:text-pink-200'
                  )}
                >
                  <LayoutGrid size={18} className="sm:h-5 sm:w-5" />
                </Button>
              </div>
              </div>
            </div>

            {isFilterPanelOpen && (
              <AdvancedFilter
                columns={CUSTOMER_FILTER_COLUMNS}
                defaultColumn="name"
                draftRows={draftFilterRows}
                onDraftRowsChange={setDraftFilterRows}
                filterLogic={filterLogic}
                onFilterLogicChange={setFilterLogic}
                onSearch={handleApplyFilters}
                onClear={handleClearFilters}
                translationNamespace="customer-management"
                embedded
              />
            )}

            <TabsList className="grid h-auto w-full grid-cols-2 rounded-xl border border-slate-300 bg-slate-100 p-1 shadow-sm dark:border-white/10 dark:bg-[#1a1025]">
              <TabsTrigger
                value="all"
                className="rounded-lg py-2 text-xs font-medium text-slate-600 transition-all hover:bg-pink-50/70 hover:text-pink-700 data-[state=active]:border data-[state=active]:border-pink-200/90 data-[state=active]:bg-pink-100/80 data-[state=active]:text-pink-900 data-[state=active]:shadow-sm data-[state=active]:hover:bg-pink-200/50 dark:text-slate-400 dark:hover:bg-pink-950/30 dark:hover:text-pink-200 dark:data-[state=active]:border-pink-400/20 dark:data-[state=active]:bg-pink-950/45 dark:data-[state=active]:text-pink-100 dark:data-[state=active]:hover:bg-pink-950/55 sm:text-sm"
              >
                {t('customerSelectDialog.allCustomers')}
              </TabsTrigger>
              <TabsTrigger
                value="potential"
                className="rounded-lg py-2 text-xs font-medium text-slate-600 transition-all hover:bg-pink-50/70 hover:text-pink-700 data-[state=active]:border data-[state=active]:border-pink-200/90 data-[state=active]:bg-pink-100/80 data-[state=active]:text-pink-900 data-[state=active]:shadow-sm data-[state=active]:hover:bg-pink-200/50 dark:text-slate-400 dark:hover:bg-pink-950/30 dark:hover:text-pink-200 dark:data-[state=active]:border-pink-400/20 dark:data-[state=active]:bg-pink-950/45 dark:data-[state=active]:text-pink-100 dark:data-[state=active]:hover:bg-pink-950/55 sm:text-sm"
              >
                {t('customerSelectDialog.potentialCustomers')}
              </TabsTrigger>
            </TabsList>
          </div>

          <div
            onScroll={handleListScroll}
            className="custom-scrollbar min-h-0 flex-1 overflow-y-auto bg-slate-50/80 p-4 pt-3 dark:bg-[#130822] sm:p-6 sm:pt-4 max-h-[min(50vh,420px)] sm:max-h-[min(55vh,480px)]"
          >
            <TabsContent value="all" className="mt-0 h-full space-y-2">
              {renderCustomerList(displayCustomers, 'noCustomers', true)}
            </TabsContent>
            <TabsContent value="potential" className="mt-0 h-full space-y-2">
              {renderCustomerList(potentialCustomers, 'noPotentialCustomers', false)}
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

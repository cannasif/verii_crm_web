import { type ReactElement, useState } from 'react';
import { CalendarDays, Check, ChevronDown, Target, Users, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverAnchor, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { matchesSearchTerm } from '@/lib/search';
import { cn } from '@/lib/utils';
import type { Salesmen360PeriodKey, Salesmen360VisibleUserDto } from '../../types/salesmen360.types';

export interface Salesmen360CurrencyFilterOption {
  value: string;
  label: string;
  helper?: string;
}

interface Salesmen360FiltersProps {
  salesmen: Salesmen360VisibleUserDto[];
  selectedUserIds: number[];
  showSalesmanFilter: boolean;
  onSelectedUserIdsChange: (userIds: number[]) => void;
  currencyOptions: Salesmen360CurrencyFilterOption[];
  selectedCurrency: string;
  selectedCurrencyLabel?: string;
  onSelectCurrency: (currency: string) => void;
  selectedPeriod: Salesmen360PeriodKey;
  onSelectPeriod: (period: Salesmen360PeriodKey) => void;
  customStartDate: string;
  customEndDate: string;
  onCustomStartDateChange: (value: string) => void;
  onCustomEndDateChange: (value: string) => void;
}

const PERIOD_OPTIONS: Salesmen360PeriodKey[] = ['today', 'week', 'month', 'year', 'custom'];
const ALL_SALESMEN_ID = 0;

const FILTER_OUTER =
  'flex min-h-11 w-fit max-w-full items-stretch overflow-hidden rounded-2xl border border-slate-200/90 bg-white/95 shadow-sm ring-1 ring-slate-950/[0.03] dark:border-white/10 dark:bg-linear-to-br dark:from-[#1E1627]/95 dark:to-[#130822]/98 dark:ring-white/[0.05]';
const FILTER_LABEL_SEGMENT =
  'flex shrink-0 items-center gap-2.5 border-r border-slate-200/80 bg-linear-to-b from-slate-50/98 to-slate-100/35 px-3 py-2 dark:border-white/10 dark:from-white/[0.07] dark:to-transparent';
const FILTER_MICRO_LABEL =
  'max-w-[5rem] truncate text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500 sm:max-w-[7rem] dark:text-slate-400';
const FILTER_TRIGGER =
  'h-11 min-h-11 w-full min-w-0 border-0 bg-transparent px-3 text-sm font-semibold text-slate-800 shadow-none transition-colors rounded-none rounded-r-2xl hover:bg-accent/50 focus:ring-0 focus:ring-offset-0 focus-visible:bg-accent/60 focus-visible:outline-none data-[state=open]:bg-accent/60 dark:text-white/95 dark:hover:bg-primary/10 dark:focus-visible:bg-primary/12 dark:data-[state=open]:bg-primary/12 [&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:text-slate-400 [&_svg]:opacity-80 dark:[&_svg]:text-slate-500';
const FILTER_CONTENT =
  'z-50 max-h-72 overflow-y-auto rounded-2xl border border-slate-200/90 bg-white/98 p-1.5 shadow-2xl backdrop-blur-xl dark:border-white/10 dark:bg-[#1E1627]/98';
const FILTER_ITEM =
  'cursor-pointer rounded-xl py-2.5 pl-3 pr-9 text-sm font-medium text-slate-700 transition-colors focus:bg-accent focus:text-foreground data-[highlighted]:bg-accent/80 data-[highlighted]:text-foreground data-[selected=true]:bg-accent data-[selected=true]:text-foreground data-[state=checked]:bg-accent data-[state=checked]:text-primary dark:text-slate-200 dark:focus:bg-primary/12 dark:focus:text-slate-100 dark:data-[highlighted]:bg-primary/12 dark:data-[highlighted]:text-slate-100 dark:data-[selected=true]:bg-primary/12 dark:data-[selected=true]:text-primary dark:data-[state=checked]:bg-primary/15 dark:data-[state=checked]:text-primary';

function buildSalespersonOptionLabel(item: Salesmen360VisibleUserDto, meLabel: string): string {
  if (item.userId === ALL_SALESMEN_ID) {
    return item.fullName?.trim() || 'Tümü';
  }

  const fullName = item.fullName?.trim();
  const base = fullName && item.email ? `${fullName} (${item.email})` : fullName || item.email || String(item.userId);
  return item.isSelf ? `${base} • ${meLabel}` : base;
}

function SalesmanCombobox({
  salesmen,
  selectedUserIds,
  onSelectionChange,
}: {
  salesmen: Salesmen360VisibleUserDto[];
  selectedUserIds: number[];
  onSelectionChange: (userIds: number[]) => void;
}): ReactElement {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const meLabel = t('salesman360.salesmanFilter.me');
  const isAllSelected = selectedUserIds.length === 0;
  const selectedSet = new Set(selectedUserIds);
  const triggerLabel = isAllSelected
    ? t('salesman360.salesmanFilter.all')
    : selectedUserIds.length === 1
      ? buildSalespersonOptionLabel(
          salesmen.find((item) => item.userId === selectedUserIds[0]) ?? {
            userId: selectedUserIds[0],
            fullName: String(selectedUserIds[0]),
            email: null,
            isSelf: false,
          },
          meLabel,
        )
      : t('salesman360.salesmanFilter.selectedCount', {
          count: selectedUserIds.length,
          defaultValue: '{{count}} satışçı seçili',
        });

  const toggleUser = (userId: number): void => {
    if (userId === ALL_SALESMEN_ID) {
      onSelectionChange([]);
      return;
    }

    if (isAllSelected) {
      onSelectionChange([userId]);
      return;
    }

    const next = selectedSet.has(userId) ? selectedUserIds.filter((id) => id !== userId) : [...selectedUserIds, userId];
    onSelectionChange(next.length === salesmen.length ? [] : next);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <div className={cn(FILTER_OUTER, 'min-w-0 w-full sm:min-w-[min(30rem,calc(100vw-2rem))] lg:flex-1 lg:max-w-[46rem]')}>
        <PopoverAnchor asChild>
          <div className="flex min-w-0 w-full flex-1 items-stretch">
            <div className={FILTER_LABEL_SEGMENT}>
              <div className="flex size-8 shrink-0 items-center justify-center rounded-xl border border-indigo-200/90 bg-indigo-50 text-indigo-600 shadow-sm shadow-indigo-500/10 dark:border-indigo-400/25 dark:bg-indigo-500/12 dark:text-indigo-200">
                <Users className="size-4" aria-hidden />
              </div>
              <span className={FILTER_MICRO_LABEL}>{t('salesman360.salesmanFilter.label')}</span>
            </div>
            <PopoverTrigger asChild>
              <button
                type="button"
                role="combobox"
                aria-expanded={open}
                aria-haspopup="listbox"
                className={cn(FILTER_TRIGGER, 'flex w-full min-w-0 items-center justify-between gap-2 text-left sm:min-w-[11rem]')}
              >
                <span className="min-w-0 flex-1 truncate">{triggerLabel}</span>
                <ChevronDown className="size-4 shrink-0" aria-hidden />
              </button>
            </PopoverTrigger>
          </div>
        </PopoverAnchor>
      </div>
      <PopoverContent
        align="start"
        alignOffset={0}
        side="bottom"
        sideOffset={6}
        className={cn(FILTER_CONTENT, 'z-50 w-[min(22rem,calc(100vw-2rem))] max-h-[min(20rem,70dvh)] overflow-hidden p-0')}
      >
        <Command
          className="max-h-[min(18rem,65dvh)] rounded-none border-0 bg-transparent shadow-none [&_[cmdk-input-wrapper]]:border-b [&_[cmdk-input-wrapper]]:border-slate-200/80 dark:[&_[cmdk-input-wrapper]]:border-white/10"
          filter={(value, search) => {
            if (Number(value) === ALL_SALESMEN_ID) {
              return matchesSearchTerm(search, [t('salesman360.salesmanFilter.all')]) ? 1 : 0;
            }
            const item = salesmen.find((candidate) => candidate.userId === Number(value));
            return item && matchesSearchTerm(search, [item.fullName, item.email, item.userId]) ? 1 : 0;
          }}
        >
          <CommandInput placeholder={t('salesman360.salesmanFilter.searchPlaceholder')} className="h-10 border-0" />
          <CommandList>
            <CommandEmpty>{t('salesman360.salesmanFilter.noResults')}</CommandEmpty>
            <CommandGroup value="salesmen-360-visible" className="p-1.5">
              {[
                {
                  userId: ALL_SALESMEN_ID,
                  fullName: t('salesman360.salesmanFilter.all'),
                  email: null,
                  isSelf: false,
                },
                ...salesmen,
              ].map((item) => {
                const checked = item.userId === ALL_SALESMEN_ID ? isAllSelected : !isAllSelected && selectedSet.has(item.userId);
                return (
                  <CommandItem
                    key={item.userId}
                    value={String(item.userId)}
                    onSelect={(value) => toggleUser(Number(value))}
                    className={FILTER_ITEM}
                  >
                    <span
                      className={cn(
                        'mr-2 flex size-4 shrink-0 items-center justify-center rounded border',
                        checked ? 'border-primary bg-primary text-white' : 'border-slate-300 dark:border-white/20',
                      )}
                    >
                      {checked ? <Check className="size-3" /> : null}
                    </span>
                    <span className="truncate">{buildSalespersonOptionLabel(item, meLabel)}</span>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export function Salesmen360Filters({
  salesmen,
  selectedUserIds,
  showSalesmanFilter,
  onSelectedUserIdsChange,
  currencyOptions,
  selectedCurrency,
  selectedCurrencyLabel,
  onSelectCurrency,
  selectedPeriod,
  onSelectPeriod,
  customStartDate,
  customEndDate,
  onCustomStartDateChange,
  onCustomEndDateChange,
}: Salesmen360FiltersProps): ReactElement {
  const { t } = useTranslation();

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:items-stretch sm:gap-3">
        {showSalesmanFilter ? (
          <SalesmanCombobox salesmen={salesmen} selectedUserIds={selectedUserIds} onSelectionChange={onSelectedUserIdsChange} />
        ) : null}

        <div className={cn(FILTER_OUTER, 'min-w-0 sm:min-w-[10.5rem]')}>
          <div className={FILTER_LABEL_SEGMENT}>
            <div className="flex size-8 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-accent text-primary shadow-sm shadow-primary/10 dark:border-primary/40 dark:bg-accent/12">
              <Target className="size-4" aria-hidden />
            </div>
            <span className={FILTER_MICRO_LABEL}>{t('salesman360.currencyFilter.label')}</span>
          </div>
          <Select value={selectedCurrency} onValueChange={onSelectCurrency}>
            <SelectTrigger className={cn(FILTER_TRIGGER, 'min-w-[6.5rem]')}>
              <span className="min-w-0 truncate">{selectedCurrencyLabel ?? t('salesman360.currencyFilter.all')}</span>
            </SelectTrigger>
            <SelectContent sideOffset={6} className={FILTER_CONTENT}>
              {currencyOptions.map((option) => (
                <SelectItem key={option.value} value={option.value} textValue={option.label} className={FILTER_ITEM}>
                  <span className="flex min-w-0 flex-col gap-0.5">
                    <span className="truncate">{option.label}</span>
                    {option.helper ? (
                      <span className="truncate text-[11px] font-semibold text-slate-400 dark:text-slate-500">{option.helper}</span>
                    ) : null}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className={cn(FILTER_OUTER, 'min-w-0 sm:min-w-[11rem]')}>
          <div className={FILTER_LABEL_SEGMENT}>
            <div className="flex size-8 shrink-0 items-center justify-center rounded-xl border border-amber-200/90 bg-amber-50 text-amber-600 shadow-sm shadow-amber-500/10 dark:border-amber-400/25 dark:bg-amber-500/12 dark:text-amber-200">
              <CalendarDays className="size-4" aria-hidden />
            </div>
            <span className={FILTER_MICRO_LABEL}>{t('salesman360.periodFilter.label')}</span>
          </div>
          <Select value={selectedPeriod} onValueChange={(value) => onSelectPeriod(value as Salesmen360PeriodKey)}>
            <SelectTrigger className={cn(FILTER_TRIGGER, 'min-w-[6.75rem]')}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent sideOffset={6} className={FILTER_CONTENT}>
              {PERIOD_OPTIONS.map((period) => (
                <SelectItem key={period} value={period} className={FILTER_ITEM}>
                  {t(`salesman360.periodFilter.${period}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {selectedPeriod === 'custom' ? (
          <div className="flex min-w-0 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-1.5 shadow-sm dark:border-white/10 dark:bg-[#160d20]">
            <input
              aria-label="Başlangıç tarihi"
              type="date"
              value={customStartDate}
              max={customEndDate}
              onChange={(event) => onCustomStartDateChange(event.target.value)}
              className="h-8 min-w-0 rounded-lg border border-slate-200 bg-transparent px-2 text-xs font-semibold dark:border-white/10"
            />
            <span className="text-slate-400">–</span>
            <input
              aria-label="Bitiş tarihi"
              type="date"
              value={customEndDate}
              min={customStartDate}
              onChange={(event) => onCustomEndDateChange(event.target.value)}
              className="h-8 min-w-0 rounded-lg border border-slate-200 bg-transparent px-2 text-xs font-semibold dark:border-white/10"
            />
          </div>
        ) : null}
      </div>

      {showSalesmanFilter ? (
        <div className="flex min-w-0 items-center gap-3 rounded-2xl border border-slate-200/80 bg-white/70 px-3 py-2 shadow-sm dark:border-white/10 dark:bg-white/3">
          <span className="shrink-0 text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">
            {t('salesman360.salesmanFilter.scope', {
              defaultValue: 'Rapor kapsamı',
            })}
          </span>
          {selectedUserIds.length === 0 ? (
            <span className="rounded-full border border-primary/20 bg-primary/8 px-3 py-1 text-xs font-bold text-primary">
              {t('salesman360.salesmanFilter.all')}
            </span>
          ) : (
            <div className="flex min-w-0 flex-1 gap-2 overflow-x-auto pb-0.5">
              {selectedUserIds.map((id) => {
                const item = salesmen.find((salesman) => salesman.userId === id);
                return (
                  <span
                    key={id}
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-primary/20 bg-primary/8 py-1 pl-3 pr-1.5 text-xs font-bold text-primary"
                  >
                    {item ? buildSalespersonOptionLabel(item, t('salesman360.salesmanFilter.me')) : id}
                    <button
                      type="button"
                      onClick={() => onSelectedUserIdsChange(selectedUserIds.filter((selectedId) => selectedId !== id))}
                      className="flex size-5 items-center justify-center rounded-full hover:bg-primary/10"
                      aria-label={t('common.remove')}
                    >
                      <X className="size-3" />
                    </button>
                  </span>
                );
              })}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}

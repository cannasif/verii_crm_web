import { useMemo, useState, type ReactElement } from 'react';
import { Check, ListFilter, Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

export interface DropdownSearchFieldOption {
  key: string;
  label: string;
}

interface DropdownSearchFieldSelectorProps {
  options: readonly DropdownSearchFieldOption[];
  selectedFields: readonly string[];
  onChange: (fields: string[]) => void;
  className?: string;
}

export function DropdownSearchFieldSelector({
  options,
  selectedFields,
  onChange,
  className,
}: DropdownSearchFieldSelectorProps): ReactElement {
  const { t } = useTranslation('common');
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState('');
  const visibleOptions = useMemo(() => {
    const term = filter.trim().toLocaleLowerCase();
    return term ? options.filter((option) => option.label.toLocaleLowerCase().includes(term)) : options;
  }, [filter, options]);

  const toggle = (key: string): void => {
    if (selectedFields.includes(key)) {
      if (selectedFields.length === 1) return;
      onChange(selectedFields.filter((field) => field !== key));
      return;
    }
    onChange([...selectedFields, key]);
  };

  return (
    <Popover open={open} onOpenChange={(next) => { setOpen(next); if (!next) setFilter(''); }}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            'relative inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-300 bg-white text-slate-500 shadow-sm transition-colors hover:border-primary/50 hover:text-primary dark:border-white/10 dark:bg-[#0c0516] dark:text-slate-400 dark:hover:text-primary',
            open && 'border-primary/50 bg-primary/5 text-primary',
            className,
          )}
          aria-label={t('searchFields', { defaultValue: 'Arama alanları' })}
          title={t('searchFields', { defaultValue: 'Arama alanları' })}
          onMouseDown={(event) => event.stopPropagation()}
        >
          <ListFilter className="h-4 w-4" />
          {selectedFields.length < options.length ? (
            <span className="absolute -end-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-bold text-white">
              {selectedFields.length}
            </span>
          ) : null}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" sideOffset={8} className="w-80 overflow-hidden rounded-2xl border-slate-200 p-0 shadow-xl dark:border-white/10">
        <div className="flex gap-2.5 border-b border-slate-100 bg-slate-50/70 px-3.5 py-3 dark:border-white/5 dark:bg-white/[0.03]">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><ListFilter className="h-4 w-4" /></div>
          <div>
            <p className="text-sm font-bold">{t('searchFields', { defaultValue: 'Arama alanları' })}</p>
            <p className="mt-0.5 text-[11px] leading-snug text-slate-500 dark:text-slate-400">{t('searchFieldsHelp', { defaultValue: 'Aramanın uygulanacağı alanları seçin. En az bir alan seçili kalmalıdır.' })}</p>
          </div>
        </div>
        <div className="border-b border-slate-100 p-2.5 dark:border-white/5">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input value={filter} onChange={(event) => setFilter(event.target.value)} placeholder={t('searchFieldsFilterPlaceholder', { defaultValue: 'Alan ara...' })} className="h-8 w-full rounded-lg border border-slate-200 bg-white pl-8 pr-2 text-xs outline-none focus:border-primary/60 dark:border-white/10 dark:bg-white/5" />
          </div>
        </div>
        <div className="grid max-h-64 grid-cols-2 gap-1 overflow-y-auto p-2">
          {visibleOptions.map((option) => {
            const checked = selectedFields.includes(option.key);
            const locked = checked && selectedFields.length === 1;
            return (
              <button key={option.key} type="button" disabled={locked} onClick={() => toggle(option.key)} className={cn('flex items-center gap-2 rounded-xl px-2.5 py-2 text-left text-sm', checked ? 'bg-primary/10' : 'hover:bg-slate-100 dark:hover:bg-white/5', locked && 'cursor-not-allowed opacity-60')}>
                <span className={cn('flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-md border', checked ? 'border-primary bg-primary text-white' : 'border-slate-300 dark:border-white/20')}>{checked ? <Check className="h-3 w-3" strokeWidth={3} /> : null}</span>
                <span className="truncate font-medium">{option.label}</span>
              </button>
            );
          })}
        </div>
        <div className="flex items-center justify-between gap-2 border-t border-slate-100 px-3.5 py-2 dark:border-white/5">
          <span className="text-[11px] font-semibold text-slate-400">{selectedFields.length}/{options.length} {t('searchFieldsCount', { defaultValue: 'alan seçili' })}</span>
          <div className="flex items-center gap-1">
            {selectedFields.length > 1 ? <button type="button" onClick={() => onChange([options[0].key])} className="rounded-lg px-2 py-1 text-[11px] font-bold text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-white/10">{t('searchFieldsClear', { defaultValue: 'Temizle' })}</button> : null}
            {selectedFields.length < options.length ? <button type="button" onClick={() => onChange(options.map((option) => option.key))} className="rounded-lg px-2 py-1 text-[11px] font-bold text-primary hover:bg-primary/10">{t('searchFieldsSelectAll', { defaultValue: 'Tümünü seç' })}</button> : null}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

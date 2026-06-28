import { type ReactElement } from 'react';
import { ChevronDown } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { CurrencySelectDialog } from '@/components/shared/CurrencySelectDialog';
import { cn } from '@/lib/utils';
interface LineFormUnitPriceInputProps {
  disabled?: boolean;
  value: string;
  inputClassName?: string;
  currencyLabel: string;
  selectedCurrencyDovizTipi: number;
  currencyDialogOpen: boolean;
  onCurrencyDialogOpenChange: (open: boolean) => void;
  onChange: (raw: string) => void;
  onBlur: () => void;
  onCurrencySelect: (dovizTipi: number) => void;
}

export function LineFormUnitPriceInput({
  disabled = false,
  value,
  inputClassName,
  currencyLabel,
  selectedCurrencyDovizTipi,
  currencyDialogOpen,
  onCurrencyDialogOpenChange,
  onChange,
  onBlur,
  onCurrencySelect,
}: LineFormUnitPriceInputProps): ReactElement {
  return (
    <>
      <div className="relative">        <Input
          type="text"
          inputMode="decimal"
          autoComplete="off"
          disabled={disabled}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          className={cn('pr-[4.5rem]', inputClassName)}
        />
        <button
          type="button"
          disabled={disabled}
          onClick={() => onCurrencyDialogOpenChange(true)}
          aria-label={`${currencyLabel} — para birimi değiştir`}
          className={cn(
            'absolute right-1.5 top-1/2 flex -translate-y-1/2 cursor-pointer items-center gap-0.5 rounded-md border border-transparent',
            'px-1.5 py-1 text-xs font-bold',
            'text-slate-500 dark:text-slate-400',
            'transition-all duration-150',
            'hover:border-rose-300 hover:bg-rose-50 hover:text-rose-700 hover:shadow-sm hover:[&>svg]:opacity-100',
            'dark:hover:border-rose-500/40 dark:hover:bg-rose-500/15 dark:hover:text-rose-300',
            'active:scale-[0.97] active:bg-rose-100 dark:active:bg-rose-500/25',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500/40 focus-visible:ring-offset-1',
            'disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50',
          )}
          title={`${currencyLabel} — tıklayarak para birimini değiştir`}
        >
          <span>{currencyLabel}</span>
          <ChevronDown className="h-3 w-3 shrink-0 opacity-50 transition-opacity duration-150" aria-hidden />
        </button>      </div>
      <CurrencySelectDialog
        open={currencyDialogOpen}
        onOpenChange={onCurrencyDialogOpenChange}
        selectedCurrencyCode={String(selectedCurrencyDovizTipi)}
        onSelect={(currency) => onCurrencySelect(currency.dovizTipi)}
      />
    </>
  );
}

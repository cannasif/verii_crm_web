import { type ReactNode, useState } from 'react';
import { HelpCircle } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { VoiceSearchCombobox } from '@/components/shared/VoiceSearchCombobox';
import {
  useIntegratedSupplierSearch,
  type IntegratedSupplierOption,
} from '@/features/purchase/hooks/useIntegratedSupplierSearch';

export const SECTION_CARD_CLASSNAME =
  'rounded-2xl overflow-hidden border border-slate-400 bg-white shadow-[0_1px_0_rgba(15,23,42,0.04),0_12px_28px_-22px_rgba(15,23,42,0.40)] ring-1 ring-slate-300/70 dark:border-white/16 dark:bg-[#120b1d]/82 dark:ring-white/12';
export const SECTION_HEADER_CLASSNAME =
  'px-5 py-4 flex items-center gap-3 border-b border-slate-400/75 bg-slate-100/85 dark:border-white/12 dark:bg-white/[0.07]';
export const FIELD_LABEL_CLASSNAME =
  'flex items-center gap-2 text-[11px] font-black uppercase tracking-wide text-slate-600 dark:text-slate-300';
export const INPUT_CLASSNAME =
  'h-12 rounded-[8px] border-slate-500/70 bg-white font-semibold text-slate-900 shadow-sm placeholder:text-slate-400 focus-visible:border-pink-500/85 focus-visible:ring-pink-200/70 dark:border-white/20 dark:bg-[#120d1d] dark:text-white dark:placeholder:text-slate-500 dark:focus-visible:border-pink-400/60 dark:focus-visible:ring-pink-400/20';
export const SECTION_FORM_SURFACE_CLASSNAME =
  '[&_label]:text-slate-800 dark:[&_label]:text-slate-200 [&_input]:border-slate-500/70 [&_input]:bg-white [&_input]:shadow-sm [&_input]:placeholder:text-slate-400 [&_input]:focus-visible:border-pink-500/85 [&_input]:focus-visible:ring-pink-200/70 dark:[&_input]:border-white/20 dark:[&_input]:bg-[#120d1d] dark:[&_input]:placeholder:text-slate-500 dark:[&_input]:focus-visible:border-pink-400/60 dark:[&_input]:focus-visible:ring-pink-400/20 [&_textarea]:border-slate-500/70 [&_textarea]:bg-white [&_textarea]:shadow-sm [&_textarea]:placeholder:text-slate-400 [&_textarea]:focus-visible:border-pink-500/85 [&_textarea]:focus-visible:ring-pink-200/70 dark:[&_textarea]:border-white/20 dark:[&_textarea]:bg-[#120d1d] dark:[&_textarea]:placeholder:text-slate-500 dark:[&_textarea]:focus-visible:border-pink-400/60 dark:[&_textarea]:focus-visible:ring-pink-400/20 [&_[data-slot=select-trigger]]:border-slate-500/70 [&_[data-slot=select-trigger]]:bg-white [&_[data-slot=select-trigger]]:shadow-sm dark:[&_[data-slot=select-trigger]]:border-white/20 dark:[&_[data-slot=select-trigger]]:bg-[#120d1d]';

export function FieldHelp({ text }: { text: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-[var(--crm-border)] text-[var(--crm-text-muted)] transition hover:border-[var(--crm-brand-primary)] hover:text-[var(--crm-brand-primary)]"
          aria-label="Bilgi"
        >
          <HelpCircle className="h-3.5 w-3.5" />
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs text-sm leading-5">
        {text}
      </TooltipContent>
    </Tooltip>
  );
}

export function SectionTitle({
  index,
  icon: Icon,
  title,
}: {
  index: number;
  icon: LucideIcon;
  title: string;
}) {
  return (
    <div className={SECTION_HEADER_CLASSNAME}>
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-zinc-200 bg-white text-xs font-bold text-zinc-600 shadow-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300">
        {index}
      </div>
      <Icon className="h-4 w-4 text-zinc-400 dark:text-zinc-500" />
      <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-900 dark:text-zinc-100">{title}</h2>
    </div>
  );
}

export function FieldLabel({
  children,
  help,
  required = false,
}: {
  children: ReactNode;
  help?: string;
  required?: boolean;
}) {
  return (
    <span className={FIELD_LABEL_CLASSNAME}>
      {children}
      {required ? <span className="text-pink-600">*</span> : null}
      {help ? <FieldHelp text={help} /> : null}
    </span>
  );
}

export function PurchaseSupplierCombobox({
  value,
  selectedSupplier,
  onSelect,
}: {
  value: string;
  selectedSupplier: IntegratedSupplierOption | null;
  onSelect: (supplier: IntegratedSupplierOption | null) => void;
}) {
  const [supplierSearch, setSupplierSearch] = useState('');
  const supplierQuery = useIntegratedSupplierSearch(supplierSearch);

  return (
    <VoiceSearchCombobox
      value={value || null}
      options={supplierQuery.options}
      onSelect={(selectedValue) => {
        if (!selectedValue) {
          onSelect(null);
          return;
        }

        const supplier = supplierQuery.suppliers.find((item) => item.id.toString() === selectedValue);
        if (supplier) {
          onSelect(supplier);
        }
      }}
      onDebouncedSearchChange={setSupplierSearch}
      onFetchNextPage={() => {
        void supplierQuery.fetchNextPage();
      }}
      hasNextPage={supplierQuery.hasNextPage}
      isLoading={supplierQuery.isLoading || supplierQuery.isFetching}
      isFetchingNextPage={supplierQuery.isFetchingNextPage}
      minChars={supplierQuery.minChars}
      placeholder={selectedSupplier ? `${selectedSupplier.customerCode} - ${selectedSupplier.name}` : 'ERP entegre tedarikçi seçin'}
      searchPlaceholder="Cari kodu veya tedarikçi adı ile ara..."
      className="h-12 rounded-[8px] border-[var(--crm-border)] bg-[var(--crm-input-bg)] font-semibold text-[var(--crm-text-primary)]"
      popoverContentClassName="rounded-[8px]"
      disableToggleOff
    />
  );
}

import { HelpCircle } from 'lucide-react';

import { cn } from '@/lib/utils';

type ErpFieldHintProps = {
  label: string;
  className?: string;
};

export function ErpFieldHint({ label, className }: ErpFieldHintProps) {
  return (
    <span className={cn('relative inline-flex shrink-0 items-center', className)}>
      <button
        type="button"
        className="peer text-slate-400 transition-colors hover:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-500/40 dark:hover:text-slate-300"
        aria-label={label}
        title={label}
      >
        <HelpCircle size={14} className="stroke-[2.5]" />
      </button>
      <span
        role="tooltip"
        className="pointer-events-none absolute left-1/2 top-full z-50 mt-2 hidden w-72 -translate-x-1/2 rounded-md border border-zinc-200 bg-white px-3 py-2 text-xs font-medium leading-relaxed text-zinc-700 shadow-lg peer-hover:block peer-focus-visible:block dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200"
      >
        {label}
      </span>
    </span>
  );
}

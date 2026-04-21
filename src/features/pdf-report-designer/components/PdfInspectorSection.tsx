import type { ReactElement, ReactNode } from 'react';
import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PdfInspectorSectionProps {
  title: string;
  description?: string;
  icon?: ReactNode;
  defaultOpen?: boolean;
  tone?: 'default' | 'accent' | 'muted';
  children: ReactNode;
  actions?: ReactNode;
}

export function PdfInspectorSection({
  title,
  description,
  icon,
  defaultOpen = true,
  tone = 'default',
  children,
  actions,
}: PdfInspectorSectionProps): ReactElement {
  const [open, setOpen] = useState<boolean>(defaultOpen);

  const toneClasses: Record<'default' | 'accent' | 'muted', string> = {
    default: 'border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900/50',
    accent: 'border-blue-200 bg-blue-50/40 dark:border-blue-900/50 dark:bg-blue-950/20',
    muted: 'border-slate-200 bg-slate-50/60 dark:border-slate-800 dark:bg-slate-900/30',
  };

  return (
    <section
      className={cn(
        'overflow-hidden rounded-lg border transition-colors',
        toneClasses[tone]
      )}
    >
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        className="flex w-full items-center gap-2 px-3 py-2 text-left"
      >
        {icon ? (
          <span className="flex size-4 shrink-0 items-center justify-center text-slate-500 dark:text-slate-400">
            {icon}
          </span>
        ) : null}
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-[11px] font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
            {title}
          </span>
          {description ? (
            <span className="truncate text-[10.5px] font-normal normal-case tracking-normal text-slate-400 dark:text-slate-500">
              {description}
            </span>
          ) : null}
        </span>
        {actions ? <span className="flex shrink-0 items-center gap-1">{actions}</span> : null}
        <ChevronDown
          className={cn(
            'size-3.5 shrink-0 text-slate-400 transition-transform dark:text-slate-500',
            open ? 'rotate-180' : 'rotate-0'
          )}
        />
      </button>
      {open ? (
        <div className="border-t border-slate-100 px-3 py-3 dark:border-slate-800">{children}</div>
      ) : null}
    </section>
  );
}

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
    default: 'border-slate-300/80 bg-white/50 dark:border-white/10 dark:bg-white/5',
    accent: 'border-pink-500/30 bg-pink-500/5 dark:border-pink-500/20 dark:bg-pink-500/10',
    muted: 'border-slate-300/60 bg-slate-50/40 dark:border-white/5 dark:bg-white/5',
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

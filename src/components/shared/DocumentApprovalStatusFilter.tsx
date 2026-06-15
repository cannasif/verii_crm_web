import { type ReactElement, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Archive,
  Ban,
  CheckCircle2,
  ChevronDown,
  Clock3,
  FilePenLine,
  LayoutGrid,
  XCircle,
  type LucideIcon,
} from 'lucide-react';
import { ApprovalStatus } from '@/features/approval/types/approval-types';
import { cn } from '@/lib/utils';

interface StatusFilterOption {
  value: string;
  translationKey?: string;
  defaultLabel?: string;
  Icon: LucideIcon;
  activeClassName: string;
  inactiveClassName: string;
}

const STATUS_FILTER_OPTIONS: readonly StatusFilterOption[] = [
  {
    value: 'all',
    Icon: LayoutGrid,
    activeClassName:
      'border-pink-500/50 bg-pink-500/15 text-pink-700 shadow-sm shadow-pink-500/10 dark:text-pink-300',
    inactiveClassName:
      'border-slate-200/70 bg-white/60 text-slate-600 hover:border-slate-300 hover:bg-white dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:border-white/20 dark:hover:bg-white/10',
  },
  {
    value: String(ApprovalStatus.NotRequired),
    translationKey: 'notRequired',
    Icon: FilePenLine,
    activeClassName:
      'border-slate-400/50 bg-slate-500/15 text-slate-700 shadow-sm dark:text-slate-200',
    inactiveClassName:
      'border-slate-200/70 bg-white/60 text-slate-600 hover:border-slate-300 hover:bg-white dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:border-white/20 dark:hover:bg-white/10',
  },
  {
    value: String(ApprovalStatus.Waiting),
    translationKey: 'waiting',
    Icon: Clock3,
    activeClassName:
      'border-amber-400/50 bg-amber-500/15 text-amber-700 shadow-sm shadow-amber-500/10 dark:text-amber-300',
    inactiveClassName:
      'border-slate-200/70 bg-white/60 text-slate-600 hover:border-slate-300 hover:bg-white dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:border-white/20 dark:hover:bg-white/10',
  },
  {
    value: String(ApprovalStatus.Approved),
    translationKey: 'approved',
    Icon: CheckCircle2,
    activeClassName:
      'border-emerald-400/50 bg-emerald-500/15 text-emerald-700 shadow-sm shadow-emerald-500/10 dark:text-emerald-300',
    inactiveClassName:
      'border-slate-200/70 bg-white/60 text-slate-600 hover:border-slate-300 hover:bg-white dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:border-white/20 dark:hover:bg-white/10',
  },
  {
    value: String(ApprovalStatus.Rejected),
    translationKey: 'rejected',
    Icon: XCircle,
    activeClassName:
      'border-red-400/50 bg-red-500/15 text-red-700 shadow-sm shadow-red-500/10 dark:text-red-300',
    inactiveClassName:
      'border-slate-200/70 bg-white/60 text-slate-600 hover:border-slate-300 hover:bg-white dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:border-white/20 dark:hover:bg-white/10',
  },
  {
    value: String(ApprovalStatus.Closed),
    translationKey: 'closed',
    Icon: Archive,
    activeClassName:
      'border-slate-400/50 bg-slate-500/15 text-slate-700 shadow-sm dark:text-slate-200',
    inactiveClassName:
      'border-slate-200/70 bg-white/60 text-slate-600 hover:border-slate-300 hover:bg-white dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:border-white/20 dark:hover:bg-white/10',
  },
  {
    value: String(ApprovalStatus.CustomerCancelled),
    translationKey: 'customerCancelled',
    defaultLabel: 'Müşteri tarafından iptal edildi',
    Icon: Ban,
    activeClassName:
      'border-rose-400/50 bg-rose-500/15 text-rose-700 shadow-sm shadow-rose-500/10 dark:text-rose-300',
    inactiveClassName:
      'border-slate-200/70 bg-white/60 text-slate-600 hover:border-slate-300 hover:bg-white dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:border-white/20 dark:hover:bg-white/10',
  },
  {
    value: String(ApprovalStatus.SalespersonClosedForRevision),
    translationKey: 'salespersonClosedForRevision',
    defaultLabel: 'ERP kaydı revizyon için plasiyer tarafından kapatıldı',
    Icon: Archive,
    activeClassName:
      'border-orange-400/50 bg-orange-500/15 text-orange-700 shadow-sm shadow-orange-500/10 dark:text-orange-300',
    inactiveClassName:
      'border-slate-200/70 bg-white/60 text-slate-600 hover:border-slate-300 hover:bg-white dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:border-white/20 dark:hover:bg-white/10',
  },
  {
    value: String(ApprovalStatus.SupersededByApprovedRevision),
    translationKey: 'supersededByApprovedRevision',
    defaultLabel: 'Onaylanan revizyon nedeniyle kapatıldı',
    Icon: Archive,
    activeClassName:
      'border-indigo-400/50 bg-indigo-500/15 text-indigo-700 shadow-sm shadow-indigo-500/10 dark:text-indigo-300',
    inactiveClassName:
      'border-slate-200/70 bg-white/60 text-slate-600 hover:border-slate-300 hover:bg-white dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:border-white/20 dark:hover:bg-white/10',
  },
];

function getOptionLabel(
  option: StatusFilterOption,
  t: (key: string, options?: Record<string, unknown>) => string
): string {
  if (option.value === 'all') {
    return t('all', { ns: 'common' });
  }

  return t(`status.${option.translationKey}`, { defaultValue: option.defaultLabel });
}

interface DocumentApprovalStatusFilterProps {
  value: string;
  onValueChange: (value: string) => void;
  className?: string;
}

export function DocumentApprovalStatusFilter({
  value,
  onValueChange,
  className,
}: DocumentApprovalStatusFilterProps): ReactElement {
  const { t } = useTranslation(['approval', 'common']);
  const [isOpen, setIsOpen] = useState(false);

  const activeOption = STATUS_FILTER_OPTIONS.find((option) => option.value === value);
  const activeLabel = activeOption ? getOptionLabel(activeOption, t) : null;
  const ActiveIcon = activeOption?.Icon;

  return (
    <div className={cn('min-w-0', className)}>
      <button
        type="button"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-slate-50/80 dark:hover:bg-white/5"
      >
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <span className="shrink-0 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {t('statusFilterLabel', { defaultValue: 'Onay durumu' })}
          </span>
          {!isOpen && value !== 'all' && activeOption && ActiveIcon && activeLabel && (
            <span
              className={cn(
                'inline-flex max-w-full items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium',
                activeOption.activeClassName
              )}
            >
              <ActiveIcon className="h-3 w-3 shrink-0" aria-hidden />
              <span className="truncate">{activeLabel}</span>
            </span>
          )}
        </div>
        <ChevronDown
          className={cn(
            'h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200',
            isOpen && 'rotate-180'
          )}
          aria-hidden
        />
      </button>

      {isOpen && (
        <div className="min-w-0 px-2.5 pt-1 pb-2">
          <div className="overflow-x-auto overscroll-x-contain [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <div className="flex w-max min-w-full flex-nowrap items-center gap-2 pb-0.5">
              {STATUS_FILTER_OPTIONS.map((option) => {
                const isActive = value === option.value;
                const label = getOptionLabel(option, t);

                return (
                  <button
                    key={option.value}
                    type="button"
                    aria-pressed={isActive}
                    onClick={() => onValueChange(option.value)}
                    className={cn(
                      'inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-[11px] font-medium transition-all duration-200 sm:px-3 sm:text-xs',
                      isActive ? option.activeClassName : option.inactiveClassName
                    )}
                  >
                    <option.Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
                    <span className="whitespace-nowrap">{label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

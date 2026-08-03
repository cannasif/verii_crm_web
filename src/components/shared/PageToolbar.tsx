import { type ReactElement } from 'react';
import { Search, RefreshCw, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useRefreshCooldown } from '@/hooks/useRefreshCooldown';

interface PageToolbarProps {
  searchPlaceholder: string;
  searchValue: string;
  onSearchChange: (value: string) => void;
  onRefresh: () => Promise<void>;
  rightSlot?: React.ReactNode;
}

export function PageToolbar({
  searchPlaceholder,
  searchValue,
  onSearchChange,
  onRefresh,
  rightSlot,
}: PageToolbarProps): ReactElement {
  const refreshCooldown = useRefreshCooldown({ onRefresh, cooldownSeconds: 30 });

  return (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
      <div className="relative group flex-1 min-w-0 max-w-md">
        <Search className="absolute crm-start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-primary transition-colors" />
        <Input
          placeholder={searchPlaceholder}
          value={searchValue}
          onChange={(e) => onSearchChange(e.target.value)}
          className="crm-ps-10 h-10 bg-white/50 dark:bg-card/50 border-slate-200 dark:border-white/10 focus:border-primary/50 focus:ring-primary/20 rounded-xl transition-all"
        />
        {searchValue && (
          <button
            onClick={() => onSearchChange('')}
            className="absolute crm-end-3 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-100 dark:hover:bg-white/10 rounded-full transition-colors"
          >
            <X size={14} className="text-slate-400" />
          </button>
        )}
      </div>
      <div
        className={`h-10 w-10 flex items-center justify-center rounded-xl shrink-0 transition-all ${
          refreshCooldown.isDisabled
            ? 'cursor-not-allowed opacity-50 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10'
            : 'cursor-pointer bg-white/50 dark:bg-card/50 border border-slate-200 dark:border-white/10 hover:border-primary/30 hover:bg-accent/50 dark:hover:bg-primary/10 group'
        }`}
        onClick={() => void refreshCooldown.refresh().catch(() => undefined)}
        role="button"
        aria-disabled={refreshCooldown.isDisabled}
        tabIndex={refreshCooldown.isDisabled ? -1 : 0}
      >
        <RefreshCw
          size={18}
          className={`text-slate-500 dark:text-slate-400 transition-colors ${refreshCooldown.isRefreshing ? 'animate-spin' : ''} ${!refreshCooldown.isDisabled ? 'group-hover:text-primary dark:group-hover:text-primary' : ''}`}
        />
      </div>
      {rightSlot}
    </div>
  );
}

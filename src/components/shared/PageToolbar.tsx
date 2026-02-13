import { type ReactElement, useState, useCallback } from 'react';
import { Search, RefreshCw, X } from 'lucide-react';
import { Input } from '@/components/ui/input';

const REFRESH_COOLDOWN_MS = 45000;

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
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshCooldownUntil, setRefreshCooldownUntil] = useState(0);

  const handleRefresh = useCallback(async (): Promise<void> => {
    const now = Date.now();
    if (now < refreshCooldownUntil) return;
    setIsRefreshing(true);
    await onRefresh();
    setTimeout(() => setIsRefreshing(false), 500);
    setRefreshCooldownUntil(now + REFRESH_COOLDOWN_MS);
    setTimeout(() => setRefreshCooldownUntil(0), REFRESH_COOLDOWN_MS);
  }, [onRefresh, refreshCooldownUntil]);

  const isRefreshDisabled = Date.now() < refreshCooldownUntil;

  return (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
      <div className="relative group flex-1 min-w-0 max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-pink-500 transition-colors" />
        <Input
          placeholder={searchPlaceholder}
          value={searchValue}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-10 h-10 bg-white/50 dark:bg-card/50 border-slate-200 dark:border-white/10 focus:border-pink-500/50 focus:ring-pink-500/20 rounded-xl transition-all"
        />
        {searchValue && (
          <button
            onClick={() => onSearchChange('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-100 dark:hover:bg-white/10 rounded-full transition-colors"
          >
            <X size={14} className="text-slate-400" />
          </button>
        )}
      </div>
      <div
        className={`h-10 w-10 flex items-center justify-center rounded-xl shrink-0 transition-all ${
          isRefreshDisabled
            ? 'cursor-not-allowed opacity-50 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10'
            : 'cursor-pointer bg-white/50 dark:bg-card/50 border border-slate-200 dark:border-white/10 hover:border-pink-500/30 hover:bg-pink-50/50 dark:hover:bg-pink-500/10 group'
        }`}
        onClick={handleRefresh}
        role="button"
        aria-disabled={isRefreshDisabled}
        tabIndex={isRefreshDisabled ? -1 : 0}
      >
        <RefreshCw
          size={18}
          className={`text-slate-500 dark:text-slate-400 transition-colors ${isRefreshing ? 'animate-spin' : ''} ${!isRefreshDisabled ? 'group-hover:text-pink-600 dark:group-hover:text-pink-400' : ''}`}
        />
      </div>
      {rightSlot}
    </div>
  );
}

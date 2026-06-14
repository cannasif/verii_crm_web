import { type ReactElement } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

export function WaitingApprovalsTableLoadingState(): ReactElement {
  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center gap-4 border-b border-slate-100 dark:border-white/5 pb-4">
        <Skeleton className="h-6 w-12 bg-slate-200 dark:bg-white/10" />
        <Skeleton className="h-6 w-48 bg-slate-200 dark:bg-white/10" />
        <Skeleton className="h-6 w-24 bg-slate-200 dark:bg-white/10" />
      </div>
      {[1, 2, 3, 4].map((index) => (
        <div key={index} className="flex items-center gap-4 py-3">
          <Skeleton className="h-5 w-16 bg-slate-100 dark:bg-white/5" />
          <Skeleton className="h-5 w-full max-w-[200px] bg-slate-100 dark:bg-white/5" />
          <Skeleton className="h-5 w-32 bg-slate-100 dark:bg-white/5" />
          <Skeleton className="h-5 w-24 bg-slate-100 dark:bg-white/5" />
        </div>
      ))}
    </div>
  );
}

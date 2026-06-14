import { type ReactElement } from 'react';
import { Check } from 'lucide-react';
import { WAITING_APPROVALS_EMPTY_STATE_CLASSNAME } from './waiting-approvals-styles';

interface WaitingApprovalsTableEmptyStateProps {
  title: string;
  description: string;
}

export function WaitingApprovalsTableEmptyState({
  title,
  description,
}: WaitingApprovalsTableEmptyStateProps): ReactElement {
  return (
    <div className={WAITING_APPROVALS_EMPTY_STATE_CLASSNAME}>
      <div className="w-20 h-20 rounded-full bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center mb-6 ring-1 ring-emerald-100 dark:ring-emerald-500/20">
        <Check className="h-10 w-10 text-emerald-500" />
      </div>
      <h4 className="text-xl font-bold text-slate-900 dark:text-white mb-2">{title}</h4>
      <p className="text-sm text-slate-500 max-w-sm mx-auto">{description}</p>
    </div>
  );
}

import { type ReactElement } from 'react';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  CalendarDays,
  CheckCircle2,
  Clock,
  Hash,
  ListOrdered,
  User,
} from 'lucide-react';
import { WaitingApprovalsStatusBadge } from './WaitingApprovalsStatusBadge';
import type { WaitingApprovalSidebarItem } from './types';
import {
  WAITING_APPROVALS_SIDEBAR_CONTAINER_CLASSNAME,
  WAITING_APPROVALS_SIDEBAR_HEADER_CLASSNAME,
  WAITING_APPROVALS_SIDEBAR_ICON_CLASSNAME,
  WAITING_APPROVALS_SIDEBAR_ITEM_CLASSNAME,
} from './waiting-approvals-styles';

interface WaitingApprovalsSidebarProps {
  title: string;
  noApprovalsText: string;
  emptyStateTitle: string;
  isLoading: boolean;
  items: WaitingApprovalSidebarItem[];
  onItemClick: (item: WaitingApprovalSidebarItem) => void;
  stepOrderLabel: string;
  approvedByLabel: string;
  actionDateLabel: string;
  getStatusLabel: (status: number, statusName?: string | null) => string;
  formatDate: (dateString: string) => string;
}

function SidebarContainer({ children }: { children: React.ReactNode }): ReactElement {
  return <div className={WAITING_APPROVALS_SIDEBAR_CONTAINER_CLASSNAME}>{children}</div>;
}

function SidebarHeader({ title, count }: { title: string; count?: number }): ReactElement {
  return (
    <div className={WAITING_APPROVALS_SIDEBAR_HEADER_CLASSNAME}>
      <div className="flex items-center gap-3">
        <div className={WAITING_APPROVALS_SIDEBAR_ICON_CLASSNAME}>
          <Clock className="h-4 w-4" />
        </div>
        <h3 className="text-sm font-bold text-slate-900 dark:text-white">{title}</h3>
      </div>
      {count !== undefined && count > 0 && (
        <Badge
          variant="outline"
          className="bg-pink-50 text-pink-700 border-pink-200 dark:bg-pink-500/20 dark:text-pink-400 dark:border-pink-500/30 font-bold px-2 py-0.5"
        >
          {count}
        </Badge>
      )}
    </div>
  );
}

export function WaitingApprovalsSidebar({
  title,
  noApprovalsText,
  emptyStateTitle,
  isLoading,
  items,
  onItemClick,
  stepOrderLabel,
  approvedByLabel,
  actionDateLabel,
  getStatusLabel,
  formatDate,
}: WaitingApprovalsSidebarProps): ReactElement {
  if (isLoading) {
    return (
      <SidebarContainer>
        <SidebarHeader title={title} />
        <div className="p-4 space-y-3">
          {[1, 2, 3, 4].map((index) => (
            <Skeleton
              key={index}
              className="h-[120px] w-full rounded-xl bg-slate-100 dark:bg-white/5"
            />
          ))}
        </div>
      </SidebarContainer>
    );
  }

  if (items.length === 0) {
    return (
      <SidebarContainer>
        <SidebarHeader title={title} count={0} />
        <div className="flex flex-col items-center justify-center flex-1 p-6 text-center border-t border-transparent">
          <div className="w-16 h-16 rounded-full bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center mb-4 ring-1 ring-emerald-100 dark:ring-emerald-500/20">
            <CheckCircle2 className="h-8 w-8 text-emerald-500" />
          </div>
          <h4 className="text-base font-bold text-slate-900 dark:text-white mb-1">
            {emptyStateTitle}
          </h4>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{noApprovalsText}</p>
        </div>
      </SidebarContainer>
    );
  }

  return (
    <SidebarContainer>
      <SidebarHeader title={title} count={items.length} />

      <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-2 max-h-[calc(100vh-200px)]">
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onItemClick(item)}
            className={WAITING_APPROVALS_SIDEBAR_ITEM_CLASSNAME}
          >
            <div className="flex items-start justify-between w-full mb-3 gap-2">
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-1 text-[10px] font-mono font-bold tracking-wider text-pink-600 dark:text-pink-400 uppercase mb-1">
                  <Hash size={10} className="opacity-70" />
                  {item.approvalRequestId}
                </div>
                <span className="text-sm font-bold text-slate-900 dark:text-slate-100 line-clamp-1">
                  {item.title}
                </span>
              </div>
              <WaitingApprovalsStatusBadge
                status={item.status}
                label={getStatusLabel(item.status)}
                className="shrink-0"
              />
            </div>

            {item.metaLines && item.metaLines.length > 0 && (
              <div className="flex flex-col gap-1 pb-2 text-xs text-slate-600 dark:text-slate-400">
                {item.metaLines.map((line) => (
                  <span key={line} className="truncate">{line}</span>
                ))}
              </div>
            )}

            <div className="flex flex-col gap-2 pt-3 border-t border-slate-100 dark:border-white/5 w-full">
              <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                <ListOrdered className="h-3.5 w-3.5 text-pink-500/60" />
                <span className="truncate">
                  <span className="font-medium text-slate-500">{stepOrderLabel}:</span> {item.stepOrder}
                </span>
              </div>

              {item.approvedByUserFullName && (
                <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                  <User className="h-3.5 w-3.5 text-pink-500/60" />
                  <span className="truncate">
                    <span className="font-medium text-slate-500">{approvedByLabel}:</span>{' '}
                    {item.approvedByUserFullName}
                  </span>
                </div>
              )}

              <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                <CalendarDays className="h-3.5 w-3.5 text-pink-500/60" />
                <span className="truncate">
                  <span className="font-medium text-slate-500">{actionDateLabel}:</span>{' '}
                  {formatDate(item.actionDate)}
                </span>
              </div>
            </div>
          </button>
        ))}
      </div>
    </SidebarContainer>
  );
}

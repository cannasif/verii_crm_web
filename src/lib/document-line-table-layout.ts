import { cn } from '@/lib/utils';

export const DOCUMENT_LINE_TABLE_SCROLL_CONTAINER_CLASS =
  'w-full overflow-x-auto overscroll-x-contain custom-scrollbar pb-3 [scrollbar-gutter:stable]';

export const DOCUMENT_LINE_TABLE_CLASS =
  'w-auto caption-bottom text-sm min-w-[1380px] whitespace-nowrap border-separate border-spacing-0';

export const DOCUMENT_LINE_TABLE_STICKY_HEAD_CLASS =
  'text-left align-middle whitespace-nowrap sticky left-0 z-40 bg-zinc-50 dark:bg-zinc-900 pl-6 w-[380px] min-w-[380px] max-w-[380px] shadow-[4px_0_12px_-4px_rgba(0,0,0,0.12)] dark:shadow-[6px_0_16px_-4px_rgba(0,0,0,0.6)]';

const DOCUMENT_LINE_TABLE_BODY_HOVER_CLASS =
  'group-hover:bg-zinc-100 dark:group-hover:bg-zinc-800/40';

const DOCUMENT_LINE_TABLE_BODY_APPROVAL_HOVER_CLASS =
  'group-hover:bg-amber-200 dark:group-hover:bg-amber-900/70';

export function getDocumentLineTableStickyStockCellClass(
  tableCellClass: string,
  hasApprovalWarning: boolean,
): string {
  return cn(
    'p-2 align-middle whitespace-nowrap sticky left-0 z-30',
    'pl-6 w-[380px] min-w-[380px] max-w-[380px]',
    'shadow-[4px_0_12px_-4px_rgba(0,0,0,0.12)] dark:shadow-[6px_0_16px_-4px_rgba(0,0,0,0.6)]',
    hasApprovalWarning
      ? 'bg-amber-50 dark:bg-amber-950 group-hover:bg-amber-200 dark:group-hover:bg-amber-900'
      : 'bg-white dark:bg-zinc-900 group-hover:bg-zinc-100 dark:group-hover:bg-zinc-800',
    tableCellClass,
  );
}

export function getDocumentLineTableBodyCellClass(
  tableCellClass: string,
  hasApprovalWarning: boolean,
): string {
  return cn(
    'relative z-0',
    hasApprovalWarning
      ? cn('bg-amber-50 dark:bg-amber-950', DOCUMENT_LINE_TABLE_BODY_APPROVAL_HOVER_CLASS)
      : cn('bg-white dark:bg-zinc-900', DOCUMENT_LINE_TABLE_BODY_HOVER_CLASS),
    tableCellClass,
  );
}

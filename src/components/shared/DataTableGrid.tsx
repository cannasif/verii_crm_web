import { type MouseEvent as ReactMouseEvent, type PointerEvent as ReactPointerEvent, type ReactElement, type ReactNode, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { DataTableActionBar, type DataTableActionBarProps } from './DataTableActionBar';

export type DataTableSortDirection = 'asc' | 'desc';

export interface DataTableGridColumn<TKey extends string> {
  key: TKey;
  label: string;
  sortable?: boolean;
  headClassName?: string;
  cellClassName?: string;
}

interface DataTableGridProps<TRow, TKey extends string> {
  actionBar?: DataTableActionBarProps;
  toolbar?: ReactNode;
  columns: DataTableGridColumn<TKey>[];
  visibleColumnKeys: TKey[];
  rows: TRow[];
  rowKey: (row: TRow) => string | number;
  renderCell: (row: TRow, columnKey: TKey) => ReactNode;
  sortBy?: TKey;
  sortDirection?: DataTableSortDirection;
  onSort?: (columnKey: TKey) => void;
  renderSortIcon?: (columnKey: TKey) => ReactNode;
  isLoading?: boolean;
  isError?: boolean;
  loadingText?: string;
  errorText?: string;
  emptyText?: string;
  minTableWidthClassName?: string;
  showActionsColumn?: boolean;
  actionsHeaderLabel?: string;
  renderActionsCell?: (row: TRow) => ReactNode;
  actionsCellClassName?: string;
  iconOnlyActions?: boolean;
  rowClassName?: string | ((row: TRow) => string | undefined);
  onRowClick?: (row: TRow) => void;
  onRowDoubleClick?: (row: TRow) => void;
  pageSize: number;
  pageSizeOptions: readonly number[];
  onPageSizeChange: (size: number) => void;
  pageNumber: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
  onPreviousPage: () => void;
  onNextPage: () => void;
  previousLabel: string;
  nextLabel: string;
  paginationInfoText: string;
  disablePaginationButtons?: boolean;
}

function isInteractiveTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return Boolean(
    target.closest(
      'button, a, input, select, textarea, label, [role="button"], [data-no-drag-scroll="true"]'
    )
  );
}

export function DataTableGrid<TRow, TKey extends string>({
  actionBar,
  toolbar,
  columns,
  visibleColumnKeys,
  rows,
  rowKey,
  renderCell,
  sortBy: _sortBy,
  sortDirection: _sortDirection,
  onSort,
  renderSortIcon,
  isLoading = false,
  isError = false,
  loadingText: _loadingText = 'Loading...',
  errorText = 'An error occurred while loading rows.',
  emptyText = 'No rows found.',
  minTableWidthClassName = 'min-w-[1200px]',
  showActionsColumn = false,
  actionsHeaderLabel = '',
  renderActionsCell,
  actionsCellClassName = 'text-right align-middle',
  iconOnlyActions = true,
  rowClassName,
  onRowClick,
  onRowDoubleClick,
  pageSize,
  pageSizeOptions,
  onPageSizeChange,
  pageNumber,
  totalPages,
  hasPreviousPage,
  hasNextPage,
  onPreviousPage,
  onNextPage,
  previousLabel,
  nextLabel,
  paginationInfoText,
  disablePaginationButtons = false,
}: DataTableGridProps<TRow, TKey>): ReactElement {
  const { t } = useTranslation('common');
  const MISSING_TRANSLATION = 'Çeviri eksik';

  const resolvedPreviousLabel = previousLabel === MISSING_TRANSLATION ? t('previous', { ns: 'common' }) : previousLabel;
  const resolvedNextLabel = nextLabel === MISSING_TRANSLATION ? t('next', { ns: 'common' }) : nextLabel;
  const resolvedActionsHeaderLabel = actionsHeaderLabel === MISSING_TRANSLATION ? t('actions', { ns: 'common' }) : actionsHeaderLabel;

  const [isDragging, setIsDragging] = useState(false);
  const lastRowClickRef = useRef<{ key: string | number; timestamp: number } | null>(null);
  const suppressNativeDoubleClickUntilRef = useRef(0);
  const tableScrollRef = useRef<HTMLDivElement | null>(null);
  const dragStateRef = useRef({
    isDragging: false,
    startX: 0,
    startScrollLeft: 0,
    moved: false,
    pointerId: -1,
  });

  const handleDragStart = (event: ReactPointerEvent<HTMLDivElement>): void => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    if (isInteractiveTarget(event.target)) return;

    const container = tableScrollRef.current;
    if (!container) return;

    dragStateRef.current = {
      isDragging: true,
      startX: event.clientX,
      startScrollLeft: container.scrollLeft,
      moved: false,
      pointerId: event.pointerId,
    };
    setIsDragging(true);
    container.setPointerCapture(event.pointerId);
  };

  const handleDragMove = (event: ReactPointerEvent<HTMLDivElement>): void => {
    const container = tableScrollRef.current;
    if (!container || !dragStateRef.current.isDragging) return;
    if (dragStateRef.current.pointerId !== event.pointerId) return;

    const deltaX = event.clientX - dragStateRef.current.startX;
    if (Math.abs(deltaX) > 4) {
      dragStateRef.current.moved = true;
    }

    container.scrollLeft = dragStateRef.current.startScrollLeft - deltaX;
  };

  const handleDragEnd = (): void => {
    dragStateRef.current.isDragging = false;
    dragStateRef.current.pointerId = -1;
    setIsDragging(false);
  };

  const handleClickCapture = (event: ReactMouseEvent<HTMLDivElement>): void => {
    if (!dragStateRef.current.moved) return;
    event.preventDefault();
    event.stopPropagation();
    dragStateRef.current.moved = false;
  };

  const handleRowClick = (row: TRow): void => {
    const key = rowKey(row);
    const now = Date.now();
    const lastClick = lastRowClickRef.current;
    const isFastSecondClick =
      lastClick != null && lastClick.key === key && now - lastClick.timestamp <= 320;

    onRowClick?.(row);

    if (isFastSecondClick && onRowDoubleClick) {
      suppressNativeDoubleClickUntilRef.current = now + 400;
      onRowDoubleClick(row);
      lastRowClickRef.current = null;
      return;
    }

    lastRowClickRef.current = { key, timestamp: now };
  };

  const handleRowDoubleClick = (row: TRow): void => {
    if (!onRowDoubleClick) return;
    if (Date.now() <= suppressNativeDoubleClickUntilRef.current) return;
    onRowDoubleClick(row);
  };

  const colSpan = visibleColumnKeys.length + (showActionsColumn ? 1 : 0) || 1;

  return (
    <div className="space-y-4 min-w-0 w-full">
      {actionBar ? <DataTableActionBar {...actionBar} /> : toolbar}
      <div
        ref={tableScrollRef}
        className={cn(
          'rounded-md border overflow-x-auto w-full min-w-0 *:data-[slot=table-container]:overflow-visible',
          isDragging ? 'cursor-grabbing select-none' : 'cursor-grab'
        )}
        onPointerDown={handleDragStart}
        onPointerMove={handleDragMove}
        onPointerUp={handleDragEnd}
        onPointerCancel={handleDragEnd}
        onClickCapture={handleClickCapture}
      >
        <Table className={minTableWidthClassName}>
          <TableHeader>
            <TableRow>
              {visibleColumnKeys.map((key) => {
                const column = columns.find((item) => item.key === key);
                const sortable = Boolean(onSort && column?.sortable !== false);
                return (
                  <TableHead key={key} className={column?.headClassName}>
                    {sortable ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onSort?.(key)}
                        className="h-7 px-1 -ml-1 hover:bg-transparent"
                      >
                        <span>{column?.label ?? key}</span>
                        {renderSortIcon?.(key)}
                      </Button>
                    ) : (
                      <span>{column?.label ?? key}</span>
                    )}
                  </TableHead>
                );
              })}
              {showActionsColumn && (
                <TableHead className="text-right w-[84px]">{resolvedActionsHeaderLabel}</TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading &&
              Array.from({ length: Math.min(pageSize, 10) }).map((_, i) => (
                <TableRow key={`skeleton-${i}`}>
                  {visibleColumnKeys.map((key) => (
                    <TableCell key={key}>
                      <Skeleton className="h-5 w-full max-w-[120px] bg-slate-200/60 dark:bg-white/10" />
                    </TableCell>
                  ))}
                  {showActionsColumn && (
                    <TableCell className="text-right">
                      <Skeleton className="h-8 w-32 ml-auto bg-slate-200/60 dark:bg-white/10" />
                    </TableCell>
                  )}
                </TableRow>
              ))}

            {!isLoading && isError && (
              <TableRow>
                <TableCell colSpan={colSpan} className="text-center text-red-600 py-8">
                  {errorText}
                </TableCell>
              </TableRow>
            )}

            {!isLoading && !isError && rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={colSpan} className="text-center text-muted-foreground py-8">
                  {emptyText}
                </TableCell>
              </TableRow>
            )}

            {!isLoading &&
              !isError &&
              rows.map((row) => {
                const customRowClass =
                  typeof rowClassName === 'function' ? rowClassName(row) : rowClassName;
                return (
                  <TableRow
                    key={rowKey(row)}
                    className={customRowClass}
                    onClick={onRowClick || onRowDoubleClick ? () => handleRowClick(row) : undefined}
                    onDoubleClick={onRowDoubleClick ? () => handleRowDoubleClick(row) : undefined}
                  >
                    {visibleColumnKeys.map((key) => {
                      const column = columns.find((item) => item.key === key);
                      return (
                        <TableCell key={`${rowKey(row)}-${key}`} className={column?.cellClassName}>
                          {renderCell(row, key)}
                        </TableCell>
                      );
                    })}
                    {showActionsColumn && (
                      <TableCell
                        className={cn(
                          actionsCellClassName,
                          iconOnlyActions &&
                            '[&_button]:h-8 [&_button]:w-8 [&_button]:p-0 [&_button]:min-w-8 [&_button]:text-[0px] [&_button]:leading-none [&_button_svg]:h-4 [&_button_svg]:w-4 [&_button_svg]:mx-auto [&_button_svg]:shrink-0 [&_button_span]:hidden'
                        )}
                        onClick={(event) => event.stopPropagation()}
                        data-no-drag-scroll="true"
                      >
                        {renderActionsCell?.(row)}
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 px-3">
                <span>{pageSize}</span>
                <ChevronDown className="ml-1 h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-24">
              {pageSizeOptions.map((size) => (
                <DropdownMenuItem key={size} onClick={() => onPageSizeChange(size)}>
                  {size}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <div className="text-xs text-muted-foreground">{paginationInfoText}</div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onPreviousPage}
            disabled={!hasPreviousPage || disablePaginationButtons}
          >
            {resolvedPreviousLabel}
          </Button>
          <span className="text-xs text-muted-foreground px-2">
            {pageNumber} / {Math.max(totalPages, 1)}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={onNextPage}
            disabled={!hasNextPage || disablePaginationButtons}
          >
            {resolvedNextLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}

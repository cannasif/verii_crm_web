import { type MouseEvent as ReactMouseEvent, type PointerEvent as ReactPointerEvent, type ReactElement, type ReactNode, useRef, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown, GripVertical } from 'lucide-react';
import { DndContext, closestCenter, KeyboardSensor, MouseSensor, TouchSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, horizontalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
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

  centerColumnHeaders?: boolean;
  enableColumnDragAndDrop?: boolean;
  onColumnOrderChange?: (newOrder: TKey[]) => void;
}

function isInteractiveTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  return Boolean(
    target.closest(
      'button, a, input, select, textarea, label, [role="button"], [data-no-drag-scroll="true"], [data-skip-row-double-click]'
    )
  );
}

function SortableTableHead<TKey extends string>({
  columnKey,
  column,
  sortable,
  onSort,
  renderSortIcon,
  centerColumnHeaders,
  enableDragAndDrop,
}: {
  columnKey: TKey;
  column?: DataTableGridColumn<TKey>;
  sortable: boolean;
  onSort?: (key: TKey) => void;
  renderSortIcon?: (key: TKey) => ReactNode;
  centerColumnHeaders?: boolean;
  enableDragAndDrop?: boolean;
}) {
  const isDraggable = enableDragAndDrop && columnKey.toLowerCase() !== 'id';

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: columnKey, disabled: !isDraggable });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.8 : 1,
    zIndex: isDragging ? 10 : 'auto',
    position: isDragging ? 'relative' as const : 'static' as const,
  };

  return (
    <TableHead
      ref={setNodeRef}
      style={style}
      className={cn(centerColumnHeaders && 'text-center', column?.headClassName, isDragging && 'bg-slate-100 dark:bg-white/10 shadow-md')}
    >
      <div className={cn("flex items-center gap-1 w-full", centerColumnHeaders ? "justify-center" : "justify-start")}>
        {isDraggable && (
          <div
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing p-1 -ml-2 text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 transition-colors shrink-0 touch-none"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
            data-no-drag-scroll="true"
          >
            <GripVertical size={14} />
          </div>
        )}
        {sortable ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onSort?.(columnKey)}
            className={cn(
              'h-7 hover:bg-transparent flex-1',
              centerColumnHeaders
                ? 'inline-flex min-h-7 w-full max-w-full flex-nowrap items-center justify-center gap-1 px-1'
                : 'px-1 -ml-1 text-left justify-start'
            )}
          >
            <span className={cn(centerColumnHeaders && 'truncate')}>{column?.label ?? columnKey}</span>
            {renderSortIcon?.(columnKey)}
          </Button>
        ) : (
          <span className={cn("flex-1 px-1", centerColumnHeaders ? "text-center block w-full" : "text-left")}>
            {column?.label ?? columnKey}
          </span>
        )}
      </div>
    </TableHead>
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
  centerColumnHeaders = false,
  enableColumnDragAndDrop = true,
  onColumnOrderChange,
}: DataTableGridProps<TRow, TKey>): ReactElement {
  const { t } = useTranslation('common');
  const MISSING_TRANSLATION = 'Çeviri eksik';

  const resolvedPreviousLabel = previousLabel === MISSING_TRANSLATION ? t('previous', { ns: 'common' }) : previousLabel;
  const resolvedNextLabel = nextLabel === MISSING_TRANSLATION ? t('next', { ns: 'common' }) : nextLabel;
  const resolvedActionsHeaderLabel = actionsHeaderLabel === MISSING_TRANSLATION ? t('actions', { ns: 'common' }) : actionsHeaderLabel;

  const [localVisibleColumnKeys, setLocalVisibleColumnKeys] = useState<TKey[]>(visibleColumnKeys);

  const lastPropRef = useRef(visibleColumnKeys);

  useEffect(() => {
    const isSame = visibleColumnKeys.length === lastPropRef.current.length &&
      visibleColumnKeys.every((key, i) => key === lastPropRef.current[i]);

    if (!isSame) {
      setLocalVisibleColumnKeys(visibleColumnKeys);
      lastPropRef.current = visibleColumnKeys;
    }
  }, [visibleColumnKeys]);

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

  const handleRowClick = (row: TRow, event: ReactMouseEvent<HTMLTableRowElement>): void => {
    const target = event.target as HTMLElement | null;
    if (target?.closest('[data-skip-row-double-click]')) {
      lastRowClickRef.current = null;
      return;
    }

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

  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 10,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 1,
        tolerance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEndDnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = localVisibleColumnKeys.indexOf(active.id as TKey);
      let newIndex = localVisibleColumnKeys.indexOf(over.id as TKey);

      // 'id' sütununun yerini koruması için:
      // Eğer 'id' sütunu ilk sıradaysa ve başka bir sütun ilk sıraya taşınmaya çalışılıyorsa,
      // taşınan sütunu en az 2. sıraya (index 1) yerleştir.
      if (String(localVisibleColumnKeys[0]).toLowerCase() === 'id' && newIndex === 0) {
        newIndex = 1;
      }

      if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
        const newKeys = arrayMove(localVisibleColumnKeys, oldIndex, newIndex);
        setLocalVisibleColumnKeys(newKeys);
        onColumnOrderChange?.(newKeys);
      }
    }
  };

  const colSpan = localVisibleColumnKeys.length + (showActionsColumn ? 1 : 0) || 1;

  return (
    <div className="flex min-w-0 w-full flex-col gap-2">
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
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEndDnd}
            autoScroll={false}
          >
            <TableHeader>
              <TableRow>
                <SortableContext items={localVisibleColumnKeys.filter((k) => String(k).toLowerCase() !== 'id')} strategy={horizontalListSortingStrategy}>
                  {localVisibleColumnKeys.map((key) => {
                    const column = columns.find((item) => item.key === key);
                    const sortable = Boolean(onSort && column?.sortable !== false);
                    return (
                      <SortableTableHead
                        key={key}
                        columnKey={key}
                        column={column}
                        sortable={sortable}
                        onSort={onSort}
                        renderSortIcon={renderSortIcon}
                        centerColumnHeaders={centerColumnHeaders}
                        enableDragAndDrop={enableColumnDragAndDrop}
                      />
                    );
                  })}
                </SortableContext>
                {showActionsColumn && (
                  <TableHead
                    className={cn(iconOnlyActions ? 'w-[84px] text-center' : 'min-w-[280px] text-right')}
                  >
                    {resolvedActionsHeaderLabel}
                  </TableHead>
                )}
              </TableRow>
            </TableHeader>
          </DndContext>
          <TableBody>
            {isLoading &&
              Array.from({ length: Math.min(pageSize, 10) }).map((_, i) => (
                <TableRow key={`skeleton-${i}`}>
                  {localVisibleColumnKeys.map((key) => (
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
                    onClick={
                      onRowClick || onRowDoubleClick
                        ? (e) => handleRowClick(row, e)
                        : undefined
                    }
                    onDoubleClick={onRowDoubleClick ? () => handleRowDoubleClick(row) : undefined}
                  >
                    {localVisibleColumnKeys.map((key) => {
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

      <div className="mt-1 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200/90 px-3 pb-6 pt-3 sm:px-4 dark:border-white/10">
        <div className="flex min-w-0 flex-wrap items-center gap-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-8 border-slate-300 bg-white px-3 shadow-sm hover:bg-stone-50 dark:border-white/15 dark:bg-transparent dark:shadow-none"
              >
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
            className="border-slate-300 bg-white shadow-sm hover:bg-stone-50 dark:border-white/15 dark:bg-transparent dark:shadow-none"
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
            className="border-slate-300 bg-white shadow-sm hover:bg-stone-50 dark:border-white/15 dark:bg-transparent dark:shadow-none"
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

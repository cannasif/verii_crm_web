import { type ReactElement, type ReactNode } from 'react';
import {
  DataTableGrid,
  type DataTableGridColumn,
  type DataTableSortDirection,
} from '@/components/shared';
import type { StockGetDto } from '../types';

type StockColumnKey = 'Id' | 'ErpStockCode' | 'StockName' | 'unit';

interface StockTableProps {
  columns: DataTableGridColumn<StockColumnKey>[];
  visibleColumnKeys: StockColumnKey[];
  rows: StockGetDto[];
  rowKey: (row: StockGetDto) => string | number;
  renderCell: (row: StockGetDto, columnKey: StockColumnKey) => ReactNode;
  sortBy: StockColumnKey;
  sortDirection: DataTableSortDirection;
  onSort: (columnKey: StockColumnKey) => void;
  renderSortIcon: (columnKey: StockColumnKey) => ReactNode;
  isLoading?: boolean;
  isError?: boolean;
  loadingText?: string;
  errorText?: string;
  emptyText?: string;
  minTableWidthClassName?: string;
  showActionsColumn?: boolean;
  actionsHeaderLabel?: string;
  renderActionsCell?: (row: StockGetDto) => ReactNode;
  rowClassName?: string | ((row: StockGetDto) => string | undefined);
  onRowClick?: (row: StockGetDto) => void;
  onRowDoubleClick?: (row: StockGetDto) => void;
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

export function StockTable({
  columns,
  visibleColumnKeys,
  rows,
  rowKey,
  renderCell,
  sortBy,
  sortDirection,
  onSort,
  renderSortIcon,
  isLoading = false,
  isError = false,
  loadingText = 'Loading...',
  errorText = 'An error occurred.',
  emptyText = 'No data.',
  minTableWidthClassName = 'min-w-[900px]',
  showActionsColumn = true,
  actionsHeaderLabel = '',
  renderActionsCell,
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
}: StockTableProps): ReactElement {
  return (
    <DataTableGrid<StockGetDto, StockColumnKey>
      columns={columns}
      visibleColumnKeys={visibleColumnKeys}
      rows={rows}
      rowKey={rowKey}
      renderCell={renderCell}
      sortBy={sortBy}
      sortDirection={sortDirection}
      onSort={onSort}
      renderSortIcon={renderSortIcon}
      isLoading={isLoading}
      isError={isError}
      loadingText={loadingText}
      errorText={errorText}
      emptyText={emptyText}
      minTableWidthClassName={minTableWidthClassName}
      showActionsColumn={showActionsColumn}
      actionsHeaderLabel={actionsHeaderLabel}
      renderActionsCell={renderActionsCell}
      rowClassName={rowClassName}
      onRowClick={onRowClick}
      onRowDoubleClick={onRowDoubleClick}
      pageSize={pageSize}
      pageSizeOptions={pageSizeOptions}
      onPageSizeChange={onPageSizeChange}
      pageNumber={pageNumber}
      totalPages={totalPages}
      hasPreviousPage={hasPreviousPage}
      hasNextPage={hasNextPage}
      onPreviousPage={onPreviousPage}
      onNextPage={onNextPage}
      previousLabel={previousLabel}
      nextLabel={nextLabel}
      paginationInfoText={paginationInfoText}
      disablePaginationButtons={disablePaginationButtons}
    />
  );
}

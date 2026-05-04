import { type ReactElement } from 'react';
import type { TFunction } from 'i18next';
import { DataTableGrid, type DataTableGridColumn } from '@/components/shared';
import type { ErpCustomer } from '../types/erp-customer-types';

type ErpCustomerColumnKey = keyof ErpCustomer;

interface ErpCustomerTableProps {
  toolbar?: React.ReactNode;
  columns: DataTableGridColumn<ErpCustomerColumnKey>[];
  visibleColumnKeys: ErpCustomerColumnKey[];
  rows: ErpCustomer[];
  rowKey: (row: ErpCustomer) => string | number;
  renderCell: (row: ErpCustomer, key: ErpCustomerColumnKey) => React.ReactNode;
  sortBy: ErpCustomerColumnKey;
  sortDirection: 'asc' | 'desc';
  onSort: (key: ErpCustomerColumnKey) => void;
  renderSortIcon: (key: ErpCustomerColumnKey) => React.ReactNode;
  isLoading?: boolean;
  loadingText?: string;
  errorText?: string;
  emptyText?: string;
  minTableWidthClassName?: string;
  showActionsColumn?: boolean;
  onRowClick?: (customer: ErpCustomer) => void;
  rowClassName?: string | ((row: ErpCustomer) => string | undefined);
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
  onColumnOrderChange?: (newOrder: string[]) => void;
}

export const getColumnsConfig = (t: TFunction) => [
  { key: 'branchCode', label: t('table.branchCode'), className: 'font-medium whitespace-nowrap' },
  { key: 'businessUnit', label: t('table.businessUnitCode'), className: 'whitespace-nowrap' },
  { key: 'customerCode', label: t('table.customerCode'), className: 'font-semibold text-slate-900 dark:text-white group-hover:text-pink-600 dark:group-hover:text-pink-400 transition-colors whitespace-nowrap' },
  { key: 'customerName', label: t('table.customerName'), className: 'text-slate-800 dark:text-slate-200 font-medium min-w-[160px] md:min-w-[200px]' },
  { key: 'phone', label: t('table.phone'), className: 'whitespace-nowrap' },
  { key: 'email', label: t('table.email'), className: 'min-w-[160px] md:min-w-[200px] break-all' },
  { key: 'city', label: t('table.city'), className: 'whitespace-nowrap' },
  { key: 'district', label: t('table.district'), className: 'whitespace-nowrap' },
  { key: 'address', label: t('table.address'), className: 'min-w-[220px] md:min-w-[300px] leading-relaxed' },
  { key: 'countryCode', label: t('table.countryCode'), className: '' },
  { key: 'website', label: t('table.website'), className: 'text-blue-500 hover:underline min-w-[120px] md:min-w-[150px] break-all' },
  { key: 'taxNumber', label: t('table.taxNumber'), className: 'font-mono text-xs whitespace-nowrap' },
  { key: 'taxOffice', label: t('table.taxOffice'), className: 'whitespace-nowrap' },
  { key: 'tckn', label: t('table.tcknNumber'), className: 'font-mono text-xs whitespace-nowrap' },
];

export function ErpCustomerTable({
  toolbar,
  columns,
  visibleColumnKeys,
  rows,
  rowKey,
  renderCell,
  sortBy,
  sortDirection,
  onSort,
  renderSortIcon,
  disablePaginationButtons = false,
  isLoading = false,
  loadingText = 'Loading...',
  errorText = 'An error occurred.',
  emptyText = 'No data.',
  minTableWidthClassName = 'min-w-[800px] lg:min-w-[1100px]',
  showActionsColumn = false,
  onRowClick,
  rowClassName,
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
  onColumnOrderChange,
}: ErpCustomerTableProps): ReactElement {
  return (
    <DataTableGrid<ErpCustomer, ErpCustomerColumnKey>
      toolbar={toolbar}
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
      isError={false}
      loadingText={loadingText}
      errorText={errorText}
      emptyText={emptyText}
      minTableWidthClassName={minTableWidthClassName}
      showActionsColumn={showActionsColumn}
      onRowClick={onRowClick}
      rowClassName={rowClassName}
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
      onColumnOrderChange={onColumnOrderChange}
    />
  );
}

import { type ReactElement } from 'react';
import type { TFunction } from 'i18next';
import { DataTableGrid, type DataTableGridColumn } from '@/components/shared';
import { Button } from '@/components/ui/button';
import type { UserDto } from '../types/user-types';
import { Edit2 } from 'lucide-react';

type UserColumnKey = keyof UserDto | 'status';

export interface ColumnDef<T> {
  key: keyof T | 'status';
  label: string;
  className?: string;
}

const SORT_MAP: Record<string, string> = {
  id: 'Id',
  username: 'Username',
  email: 'Email',
  fullName: 'FullName',
  role: 'Role',
  status: 'IsActive',
  creationTime: 'CreationTime',
};

export const getColumnsConfig = (t: TFunction): ColumnDef<UserDto>[] => [
  { key: 'id', label: t('userManagement.table.id'), className: 'w-[80px]' },
  { key: 'username', label: t('userManagement.table.username'), className: 'min-w-[120px]' },
  { key: 'email', label: t('userManagement.table.email'), className: 'min-w-[180px]' },
  { key: 'fullName', label: t('userManagement.table.fullName'), className: 'min-w-[140px]' },
  { key: 'role', label: t('userManagement.table.role'), className: 'w-[120px]' },
  { key: 'status', label: t('userManagement.table.status'), className: 'w-[180px]' },
  { key: 'creationTime', label: t('userManagement.table.createdDate'), className: 'w-[120px]' },
];

interface UserTableProps {
  onEdit: (user: UserDto) => void;
  columns: DataTableGridColumn<UserColumnKey>[];
  visibleColumnKeys: UserColumnKey[];
  rows: UserDto[];
  rowKey: (row: UserDto) => string | number;
  renderCell: (row: UserDto, key: UserColumnKey) => React.ReactNode;
  sortBy: UserColumnKey;
  sortDirection: 'asc' | 'desc';
  onSortChange: (sortBy: string, sortDirection: 'asc' | 'desc') => void;
  renderSortIcon: (key: UserColumnKey) => React.ReactNode;
  isLoading?: boolean;
  loadingText?: string;
  errorText?: string;
  emptyText?: string;
  minTableWidthClassName?: string;
  showActionsColumn?: boolean;
  actionsHeaderLabel?: string;
  rowClassName?: string | ((row: UserDto) => string | undefined);
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

export function UserTable({
  onEdit,
  columns,
  visibleColumnKeys,
  rows,
  rowKey,
  renderCell,
  sortBy,
  sortDirection,
  onSortChange,
  renderSortIcon,
  isLoading = false,
  loadingText = 'Loading...',
  errorText = 'An error occurred.',
  emptyText = 'No data.',
  minTableWidthClassName = 'min-w-[900px] lg:min-w-[1100px]',
  showActionsColumn = true,
  actionsHeaderLabel = '',
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
  disablePaginationButtons = false,
}: UserTableProps): ReactElement {

  const handleSort = (key: UserColumnKey): void => {
    const backendSortBy = SORT_MAP[key as string] ?? key;
    const newDirection = sortBy === key && sortDirection === 'asc' ? 'desc' : 'asc';
    onSortChange(backendSortBy, newDirection);
  };

  const renderActionsCell = (user: UserDto): ReactElement => (
    <div className="flex justify-end gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => onEdit(user)}
        className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-500/10"
      >
        <Edit2 size={16} />
      </Button>
    </div>
  );

  return (
    <DataTableGrid<UserDto, UserColumnKey>
      columns={columns}
      visibleColumnKeys={visibleColumnKeys}
      rows={rows}
      rowKey={rowKey}
      renderCell={renderCell}
      sortBy={sortBy}
      sortDirection={sortDirection}
      onSort={handleSort}
      renderSortIcon={renderSortIcon}
      isLoading={isLoading}
      isError={false}
      loadingText={loadingText}
      errorText={errorText}
      emptyText={emptyText}
      minTableWidthClassName={minTableWidthClassName}
      showActionsColumn={showActionsColumn}
      actionsHeaderLabel={actionsHeaderLabel}
      renderActionsCell={renderActionsCell}
      rowClassName={rowClassName}
      onRowDoubleClick={onEdit}
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

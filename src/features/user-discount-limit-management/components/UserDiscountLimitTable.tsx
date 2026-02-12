import { type ReactElement, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useUserDiscountLimits } from '../hooks/useUserDiscountLimits';
import { useDeleteUserDiscountLimit } from '../hooks/useDeleteUserDiscountLimit';
import type { UserDiscountLimitDto } from '../types/user-discount-limit-types';
import type { PagedFilter } from '@/types/api';

interface UserDiscountLimitTableProps {
  onEdit: (userDiscountLimit: UserDiscountLimitDto) => void;
  pageNumber: number;
  pageSize: number;
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
  filters?: PagedFilter[] | Record<string, unknown>;
  onPageChange: (page: number) => void;
  onSortChange: (sortBy: string, sortDirection: 'asc' | 'desc') => void;
}

export function UserDiscountLimitTable({
  onEdit,
  pageNumber,
  pageSize,
  sortBy = 'Id',
  sortDirection = 'desc',
  filters = {},
  onPageChange,
  onSortChange,
}: UserDiscountLimitTableProps): ReactElement {
  const { t, i18n } = useTranslation();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedUserDiscountLimit, setSelectedUserDiscountLimit] = useState<UserDiscountLimitDto | null>(null);

  const { data, isLoading, isFetching } = useUserDiscountLimits({
    pageNumber,
    pageSize,
    sortBy,
    sortDirection,
    filters: filters as PagedFilter[] | undefined,
  });

  const deleteUserDiscountLimit = useDeleteUserDiscountLimit();

  const handleDeleteClick = (userDiscountLimit: UserDiscountLimitDto): void => {
    setSelectedUserDiscountLimit(userDiscountLimit);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async (): Promise<void> => {
    if (selectedUserDiscountLimit) {
      await deleteUserDiscountLimit.mutateAsync(selectedUserDiscountLimit.id);
      setDeleteDialogOpen(false);
      setSelectedUserDiscountLimit(null);
    }
  };

  const handleSort = (column: string): void => {
    const newDirection =
      sortBy === column && sortDirection === 'asc' ? 'desc' : 'asc';
    onSortChange(column, newDirection);
  };

  const SortIcon = ({ column }: { column: string }): ReactElement => {
    if (sortBy !== column) {
      return (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="ml-1 inline-block text-muted-foreground"
        >
          <path d="M8 9l4-4 4 4" />
          <path d="M16 15l-4 4-4-4" />
        </svg>
      );
    }
    return sortDirection === 'asc' ? (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="ml-1 inline-block"
      >
        <path d="M8 9l4-4 4 4" />
      </svg>
    ) : (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="ml-1 inline-block"
      >
        <path d="M16 15l-4 4-4-4" />
      </svg>
    );
  };

  const formatPercentage = (value: number | undefined | null): string => {
    if (value === undefined || value === null) return '-';
    return `${value.toFixed(2)}%`;
  };

  if (isLoading || isFetching) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-muted-foreground">
          {t('userDiscountLimitManagement.loading')}
        </div>
      </div>
    );
  }

  const userDiscountLimits = data?.data || [];

  if (!data || userDiscountLimits.length === 0) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-muted-foreground">
          {t('userDiscountLimitManagement.noData')}
        </div>
      </div>
    );
  }

  const totalPages = Math.ceil((data.totalCount || 0) / pageSize);

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead
                className="cursor-pointer select-none"
                onClick={() => handleSort('Id')}
              >
                <div className="flex items-center">
                  {t('userDiscountLimitManagement.table.id')}
                  <SortIcon column="Id" />
                </div>
              </TableHead>
              <TableHead
                className="cursor-pointer select-none"
                onClick={() => handleSort('SalespersonName')}
              >
                <div className="flex items-center">
                  {t('userDiscountLimitManagement.salespersonName')}
                  <SortIcon column="SalespersonName" />
                </div>
              </TableHead>
              <TableHead
                className="cursor-pointer select-none"
                onClick={() => handleSort('ErpProductGroupCode')}
              >
                <div className="flex items-center">
                  {t('userDiscountLimitManagement.erpProductGroupCode')}
                  <SortIcon column="ErpProductGroupCode" />
                </div>
              </TableHead>
              <TableHead
                className="cursor-pointer select-none"
                onClick={() => handleSort('MaxDiscount1')}
              >
                <div className="flex items-center">
                  {t('userDiscountLimitManagement.maxDiscount1')}
                  <SortIcon column="MaxDiscount1" />
                </div>
              </TableHead>
              <TableHead
                className="cursor-pointer select-none"
                onClick={() => handleSort('MaxDiscount2')}
              >
                <div className="flex items-center">
                  {t('userDiscountLimitManagement.maxDiscount2')}
                  <SortIcon column="MaxDiscount2" />
                </div>
              </TableHead>
              <TableHead
                className="cursor-pointer select-none"
                onClick={() => handleSort('MaxDiscount3')}
              >
                <div className="flex items-center">
                  {t('userDiscountLimitManagement.maxDiscount3')}
                  <SortIcon column="MaxDiscount3" />
                </div>
              </TableHead>
              <TableHead
                className="cursor-pointer select-none"
                onClick={() => handleSort('CreatedDate')}
              >
                <div className="flex items-center">
                  {t('userDiscountLimitManagement.createdDate')}
                  <SortIcon column="CreatedDate" />
                </div>
              </TableHead>
              <TableHead
                className="cursor-pointer select-none"
                onClick={() => handleSort('UpdatedDate')}
              >
                <div className="flex items-center">
                  {t('userDiscountLimitManagement.updatedDate')}
                  <SortIcon column="UpdatedDate" />
                </div>
              </TableHead>
              <TableHead className="text-right">
                {t('userDiscountLimitManagement.actions')}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {userDiscountLimits.map((userDiscountLimit: UserDiscountLimitDto, index: number) => (
              <TableRow key={userDiscountLimit.id || `user-discount-limit-${index}`}>
                <TableCell>{userDiscountLimit.id}</TableCell>
                <TableCell className="font-medium">{userDiscountLimit.salespersonName}</TableCell>
                <TableCell>{userDiscountLimit.erpProductGroupCode}</TableCell>
                <TableCell>{formatPercentage(userDiscountLimit.maxDiscount1)}</TableCell>
                <TableCell>{formatPercentage(userDiscountLimit.maxDiscount2)}</TableCell>
                <TableCell>{formatPercentage(userDiscountLimit.maxDiscount3)}</TableCell>
                <TableCell>
                  {new Date(userDiscountLimit.createdDate).toLocaleDateString(i18n.language)}
                </TableCell>
                <TableCell>
                  {userDiscountLimit.updatedDate
                    ? new Date(userDiscountLimit.updatedDate).toLocaleDateString(i18n.language)
                    : '-'}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onEdit(userDiscountLimit)}
                    >
                      {t('userDiscountLimitManagement.edit')}
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDeleteClick(userDiscountLimit)}
                    >
                      {t('userDiscountLimitManagement.delete')}
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between py-4">
        <div className="text-sm text-muted-foreground">
          {t('userDiscountLimitManagement.table.showing', {
            from: (pageNumber - 1) * pageSize + 1,
            to: Math.min(pageNumber * pageSize, data.totalCount || 0),
            total: data.totalCount || 0,
          })}
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(pageNumber - 1)}
            disabled={pageNumber <= 1}
          >
            {t('userDiscountLimitManagement.previous')}
          </Button>
          <div className="flex items-center px-4 text-sm">
            {t('userDiscountLimitManagement.table.page', {
              current: pageNumber,
              total: totalPages,
            })}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(pageNumber + 1)}
            disabled={pageNumber >= totalPages}
          >
            {t('userDiscountLimitManagement.next')}
          </Button>
        </div>
      </div>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {t('userDiscountLimitManagement.deleteTitle')}
            </DialogTitle>
            <DialogDescription>
              {t('userDiscountLimitManagement.confirmDelete')}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={deleteUserDiscountLimit.isPending}
            >
              {t('userDiscountLimitManagement.cancel')}
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={deleteUserDiscountLimit.isPending}
            >
              {deleteUserDiscountLimit.isPending
                ? t('userDiscountLimitManagement.loading')
                : t('userDiscountLimitManagement.delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

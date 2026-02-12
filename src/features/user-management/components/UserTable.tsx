import { type ReactElement } from 'react';
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
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { useUserList } from '../hooks/useUserList';
import { useUpdateUser } from '../hooks/useUpdateUser';
import type { UserDto } from '../types/user-types';
import type { PagedFilter } from '@/types/api';

interface UserTableProps {
  pageNumber: number;
  pageSize: number;
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
  filters?: PagedFilter[] | Record<string, unknown>;
  onPageChange: (page: number) => void;
  onSortChange: (sortBy: string, sortDirection: 'asc' | 'desc') => void;
  onEdit?: (user: UserDto) => void;
}

export function UserTable({
  pageNumber,
  pageSize,
  sortBy = 'Id',
  sortDirection = 'asc',
  filters = {},
  onPageChange,
  onSortChange,
  onEdit,
}: UserTableProps): ReactElement {
  const { t, i18n } = useTranslation();

  const { data, isLoading } = useUserList({
    pageNumber,
    pageSize,
    sortBy,
    sortDirection,
    filters: Array.isArray(filters) ? filters : undefined,
  });

  const updateUser = useUpdateUser();

  const handleStatusChange = async (user: UserDto, checked: boolean): Promise<void> => {
    await updateUser.mutateAsync({
      id: user.id,
      data: { isActive: checked },
    });
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-muted-foreground">
          {t('userManagement.table.loading')}
        </div>
      </div>
    );
  }

  const users = data?.data || [];
  
  if (!data || users.length === 0) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-muted-foreground">
          {t('userManagement.table.noData')}
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
                  {t('userManagement.table.id')}
                  <SortIcon column="Id" />
                </div>
              </TableHead>
              <TableHead
                className="cursor-pointer select-none"
                onClick={() => handleSort('Username')}
              >
                <div className="flex items-center">
                  {t('userManagement.table.username')}
                  <SortIcon column="Username" />
                </div>
              </TableHead>
              <TableHead
                className="cursor-pointer select-none"
                onClick={() => handleSort('Email')}
              >
                <div className="flex items-center">
                  {t('userManagement.table.email')}
                  <SortIcon column="Email" />
                </div>
              </TableHead>
              <TableHead>
                {t('userManagement.table.fullName')}
              </TableHead>
              <TableHead>
                {t('userManagement.table.role')}
              </TableHead>
              <TableHead>
                {t('userManagement.table.status')}
              </TableHead>
              <TableHead>
                {t('userManagement.table.createdDate')}
              </TableHead>
              {onEdit && (
                <TableHead className="w-[80px]">
                  {t('common.actions')}
                </TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user: UserDto) => (
              <TableRow key={user.id}>
                <TableCell>{user.id}</TableCell>
                <TableCell className="font-medium">{user.username}</TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>{user.fullName || '-'}</TableCell>
                <TableCell>
                  <Badge variant="outline">{user.role || '-'}</Badge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={user.isActive}
                      onCheckedChange={(checked) => handleStatusChange(user, checked)}
                      disabled={updateUser.isPending}
                    />
                    <span className="text-sm text-muted-foreground">
                        {user.isActive
                            ? t('userManagement.table.active')
                            : t('userManagement.table.inactive')}
                    </span>
                    {user.isEmailConfirmed && (
                      <Badge variant="outline" className="text-xs">
                        {t('userManagement.table.confirmed')}
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  {user.creationTime
                    ? new Date(user.creationTime).toLocaleDateString(i18n.language)
                    : '-'}
                </TableCell>
                {onEdit && (
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onEdit(user)}
                    >
                      {t('common.edit')}
                    </Button>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between py-4">
        <div className="text-sm text-muted-foreground">
          {t('userManagement.table.showing', {
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
            {t('userManagement.table.previous')}
          </Button>
          <div className="flex items-center px-4 text-sm">
            {t('userManagement.table.page', {
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
            {t('userManagement.table.next')}
          </Button>
        </div>
      </div>
    </>
  );
}

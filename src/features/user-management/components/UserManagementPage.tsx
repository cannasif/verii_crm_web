/* [USER_MGMT_STAGE_6_DONE] */
import { type ReactElement, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useUIStore } from '@/stores/ui-store';
import { Button } from '@/components/ui/button';
import { UserStats } from './UserStats';
import { UserTable } from './UserTable';
import { UserForm } from './UserForm';
import { useCreateUser } from '../hooks/useCreateUser';
import { useUpdateUser } from '../hooks/useUpdateUser';
import type { UserDto, CreateUserDto, UpdateUserDto } from '../types/user-types';
import type { UserFormSchema, UserUpdateFormSchema } from '../types/user-types';

export function UserManagementPage(): ReactElement {
  const { t } = useTranslation();
  const { setPageTitle } = useUIStore();
  const [formOpen, setFormOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserDto | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [pageSize] = useState(20);
  const [sortBy, setSortBy] = useState('Id');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [filters] = useState<Record<string, unknown>>({});

  const createUser = useCreateUser();
  const updateUser = useUpdateUser();

  useEffect(() => {
    setPageTitle(t('userManagement.menu'));
    return () => {
      setPageTitle(null);
    };
  }, [t, setPageTitle]);

  const handleAddClick = (): void => {
    setEditingUser(null);
    setFormOpen(true);
  };

  const handleFormSubmit = async (data: UserFormSchema | UserUpdateFormSchema): Promise<void> => {
    if (editingUser) {
      const updateData: UpdateUserDto = {
        email: data.email,
        firstName: data.firstName || undefined,
        lastName: data.lastName || undefined,
        phoneNumber: data.phoneNumber || undefined,
        roleId: data.roleId && data.roleId > 0 ? data.roleId : undefined,
        isActive: data.isActive,
        permissionGroupIds: data.permissionGroupIds,
      };
      await updateUser.mutateAsync({
        id: editingUser.id,
        data: updateData,
      });
    } else {
      const createFormData = data as UserFormSchema;
      const createData: CreateUserDto = {
        username: createFormData.username!,
        email: createFormData.email!,
        password: createFormData.password || undefined,
        firstName: createFormData.firstName || undefined,
        lastName: createFormData.lastName || undefined,
        phoneNumber: createFormData.phoneNumber || undefined,
        roleId: createFormData.roleId!,
        isActive: createFormData.isActive,
        permissionGroupIds: createFormData.permissionGroupIds,
      };
      await createUser.mutateAsync(createData);
    }
    setFormOpen(false);
    setEditingUser(null);
  };

  const handleSortChange = (newSortBy: string, newSortDirection: 'asc' | 'desc'): void => {
    setSortBy(newSortBy);
    setSortDirection(newSortDirection);
    setPageNumber(1);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            {t('userManagement.menu')}
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {t('userManagement.description')}
          </p>
        </div>
        <Button onClick={handleAddClick}>
          {t('userManagement.addButton')}
        </Button>
      </div>

      <UserStats />

      <div className="space-y-4">
        <UserTable
          pageNumber={pageNumber}
          pageSize={pageSize}
          sortBy={sortBy}
          sortDirection={sortDirection}
          filters={filters}
          onPageChange={setPageNumber}
          onSortChange={handleSortChange}
          onEdit={(u) => {
            setEditingUser(u);
            setFormOpen(true);
          }}
        />
      </div>

      <UserForm
        open={formOpen}
        onOpenChange={setFormOpen}
        onSubmit={handleFormSubmit}
        user={editingUser}
        isLoading={createUser.isPending || updateUser.isPending}
      />
    </div>
  );
}

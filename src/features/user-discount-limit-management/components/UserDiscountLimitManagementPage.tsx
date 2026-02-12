import { type ReactElement, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useUIStore } from '@/stores/ui-store';
import { Button } from '@/components/ui/button';
import { UserDiscountLimitTable } from './UserDiscountLimitTable';
import { UserDiscountLimitForm } from './UserDiscountLimitForm';
import { useCreateUserDiscountLimit } from '../hooks/useCreateUserDiscountLimit';
import { useUpdateUserDiscountLimit } from '../hooks/useUpdateUserDiscountLimit';
import type { UserDiscountLimitDto } from '../types/user-discount-limit-types';
import type { UserDiscountLimitFormSchema } from '../types/user-discount-limit-types';

export function UserDiscountLimitManagementPage(): ReactElement {
  const { t } = useTranslation();
  const { setPageTitle } = useUIStore();
  const [formOpen, setFormOpen] = useState(false);
  const [editingUserDiscountLimit, setEditingUserDiscountLimit] = useState<UserDiscountLimitDto | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [pageSize] = useState(20);
  const [sortBy, setSortBy] = useState('Id');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [filters] = useState<Record<string, unknown>>({});

  const createUserDiscountLimit = useCreateUserDiscountLimit();
  const updateUserDiscountLimit = useUpdateUserDiscountLimit();

  useEffect(() => {
    setPageTitle(t('userDiscountLimitManagement.title'));
    return () => {
      setPageTitle(null);
    };
  }, [t, setPageTitle]);

  const handleAddClick = (): void => {
    setEditingUserDiscountLimit(null);
    setFormOpen(true);
  };

  const handleEdit = (userDiscountLimit: UserDiscountLimitDto): void => {
    setEditingUserDiscountLimit(userDiscountLimit);
    setFormOpen(true);
  };

  const handleFormSubmit = async (data: UserDiscountLimitFormSchema): Promise<void> => {
    if (editingUserDiscountLimit) {
      await updateUserDiscountLimit.mutateAsync({
        id: editingUserDiscountLimit.id,
        data: {
          erpProductGroupCode: data.erpProductGroupCode,
          salespersonId: data.salespersonId,
          maxDiscount1: data.maxDiscount1,
          maxDiscount2: data.maxDiscount2 || undefined,
          maxDiscount3: data.maxDiscount3 || undefined,
        },
      });
    } else {
      await createUserDiscountLimit.mutateAsync({
        erpProductGroupCode: data.erpProductGroupCode,
        salespersonId: data.salespersonId,
        maxDiscount1: data.maxDiscount1,
        maxDiscount2: data.maxDiscount2 || undefined,
        maxDiscount3: data.maxDiscount3 || undefined,
      });
    }
    setFormOpen(false);
    setEditingUserDiscountLimit(null);
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
            {t('userDiscountLimitManagement.title')}
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {t('userDiscountLimitManagement.description')}
          </p>
        </div>
        <Button onClick={handleAddClick}>
          {t('userDiscountLimitManagement.create')}
        </Button>
      </div>

      <div className="space-y-4">
        <UserDiscountLimitTable
          onEdit={handleEdit}
          pageNumber={pageNumber}
          pageSize={pageSize}
          sortBy={sortBy}
          sortDirection={sortDirection}
          filters={filters}
          onPageChange={setPageNumber}
          onSortChange={handleSortChange}
        />
      </div>

      <UserDiscountLimitForm
        open={formOpen}
        onOpenChange={setFormOpen}
        onSubmit={handleFormSubmit}
        userDiscountLimit={editingUserDiscountLimit}
        isLoading={createUserDiscountLimit.isPending || updateUserDiscountLimit.isPending}
      />
    </div>
  );
}

import { type ReactElement, useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useUIStore } from '@/stores/ui-store';
import { Button } from '@/components/ui/button';
import { ApprovalRoleGroupTable } from './ApprovalRoleGroupTable';
import { ApprovalRoleGroupForm } from './ApprovalRoleGroupForm';
import { useCreateApprovalRoleGroup } from '../hooks/useCreateApprovalRoleGroup';
import { useUpdateApprovalRoleGroup } from '../hooks/useUpdateApprovalRoleGroup';
import { useApprovalRoleGroupList } from '../hooks/useApprovalRoleGroupList';
import type { ApprovalRoleGroupDto } from '../types/approval-role-group-types';
import type { ApprovalRoleGroupFormSchema } from '../types/approval-role-group-types';
import { Plus } from 'lucide-react';
import { PageToolbar } from '@/components/shared';
import { useQueryClient } from '@tanstack/react-query';
import { APPROVAL_ROLE_GROUP_QUERY_KEYS } from '../utils/query-keys';

export function ApprovalRoleGroupManagementPage(): ReactElement {
  const { t } = useTranslation();
  const { setPageTitle } = useUIStore();
  const queryClient = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<ApprovalRoleGroupDto | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const createGroup = useCreateApprovalRoleGroup();
  const updateGroup = useUpdateApprovalRoleGroup();

  // Fetch all data for client-side processing
  const { data, isLoading } = useApprovalRoleGroupList({
    pageNumber: 1,
    pageSize: 10000,
    sortBy: 'Id',
    sortDirection: 'desc',
  });

  useEffect(() => {
    setPageTitle(t('approvalRoleGroup.menu'));
    return () => {
      setPageTitle(null);
    };
  }, [t, setPageTitle]);

  const filteredRoleGroups = useMemo(() => {
    if (!data?.data) return [];
    
    let result: ApprovalRoleGroupDto[] = [...data.data];

    if (searchTerm) {
      const lowerTerm = searchTerm.toLowerCase();
      result = result.filter((item) =>
        item.name?.toLowerCase().includes(lowerTerm)
      );
    }

    return result;
  }, [data?.data, searchTerm]);

  const handleRefresh = async (): Promise<void> => {
    await queryClient.invalidateQueries({
      queryKey: [APPROVAL_ROLE_GROUP_QUERY_KEYS.LIST],
    });
  };

  const handleAddClick = (): void => {
    setEditingGroup(null);
    setFormOpen(true);
  };

  const handleEdit = (group: ApprovalRoleGroupDto): void => {
    setEditingGroup(group);
    setFormOpen(true);
  };

  const handleFormSubmit = async (data: ApprovalRoleGroupFormSchema): Promise<void> => {
    if (editingGroup) {
      await updateGroup.mutateAsync({
        id: editingGroup.id,
        data: { name: data.name },
      });
    } else {
      await createGroup.mutateAsync({ name: data.name });
    }
    setFormOpen(false);
    setEditingGroup(null);
  };

  return (
    <div className="w-full space-y-6 relative">
      
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-2">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white transition-colors">
            {t('approvalRoleGroup.menu')}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium transition-colors mt-1">
            {t('approvalRoleGroup.description')}
          </p>
        </div>
        
        <Button 
          onClick={handleAddClick}
          className="px-6 py-2 bg-gradient-to-r from-pink-600 to-orange-600 rounded-lg text-white text-sm font-bold shadow-lg shadow-pink-500/20 hover:scale-105 transition-transform border-0 hover:text-white"
        >
          <Plus size={18} className="mr-2" />
          {t('approvalRoleGroup.addButton')}
        </Button>
      </div>

      <div className="bg-white/70 dark:bg-[#1a1025]/60 backdrop-blur-xl border border-white/60 dark:border-white/5 shadow-sm rounded-2xl p-5 flex flex-col gap-5 transition-all duration-300">
        <PageToolbar
          searchPlaceholder={t('approvalRoleGroup.searchPlaceholder')}
          searchValue={searchTerm}
          onSearchChange={setSearchTerm}
          onRefresh={handleRefresh}
        />
      </div>

      <div className="bg-white/70 dark:bg-[#1a1025]/60 backdrop-blur-xl border border-white/60 dark:border-white/5 shadow-sm rounded-2xl p-0 sm:p-1 transition-all duration-300 overflow-hidden">
        <ApprovalRoleGroupTable
          roleGroups={filteredRoleGroups}
          isLoading={isLoading}
          onEdit={handleEdit}
        />
      </div>

      <ApprovalRoleGroupForm
        open={formOpen}
        onOpenChange={setFormOpen}
        onSubmit={handleFormSubmit}
        group={editingGroup}
        isLoading={createGroup.isPending || updateGroup.isPending}
      />
    </div>
  );
}

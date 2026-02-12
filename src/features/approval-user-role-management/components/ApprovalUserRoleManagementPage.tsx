import { type ReactElement, useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useUIStore } from '@/stores/ui-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ApprovalUserRoleTable } from './ApprovalUserRoleTable';
import { ApprovalUserRoleForm } from './ApprovalUserRoleForm';
import { useCreateApprovalUserRole } from '../hooks/useCreateApprovalUserRole';
import { useUpdateApprovalUserRole } from '../hooks/useUpdateApprovalUserRole';
import { useApprovalUserRoleList } from '../hooks/useApprovalUserRoleList';
import type { ApprovalUserRoleDto } from '../types/approval-user-role-types';
import type { ApprovalUserRoleFormSchema } from '../types/approval-user-role-types';
import { Search, RefreshCw, X, Plus } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { APPROVAL_USER_ROLE_QUERY_KEYS } from '../utils/query-keys';

export function ApprovalUserRoleManagementPage(): ReactElement {
  const { t } = useTranslation();
  const { setPageTitle } = useUIStore();
  const [formOpen, setFormOpen] = useState(false);
  const [editingUserRole, setEditingUserRole] = useState<ApprovalUserRoleDto | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const createUserRole = useCreateApprovalUserRole();
  const updateUserRole = useUpdateApprovalUserRole();
  const queryClient = useQueryClient();

  const { data, isLoading } = useApprovalUserRoleList({
    pageNumber: 1,
    pageSize: 10000,
  });

  const filteredUserRoles = useMemo(() => {
    const userRoles = data?.data || [];
    if (!searchTerm) return userRoles;
    
    const lowerSearch = searchTerm.toLowerCase();
    return userRoles.filter((role) => 
      (role.userFullName && role.userFullName.toLowerCase().includes(lowerSearch)) ||
      (role.approvalRoleName && role.approvalRoleName.toLowerCase().includes(lowerSearch))
    );
  }, [data?.data, searchTerm]);

  useEffect(() => {
    setPageTitle(t('approvalUserRole.menu'));
    return () => {
      setPageTitle(null);
    };
  }, [t, setPageTitle]);

  const handleAddClick = (): void => {
    setEditingUserRole(null);
    setFormOpen(true);
  };

  const handleEdit = (userRole: ApprovalUserRoleDto): void => {
    setEditingUserRole(userRole);
    setFormOpen(true);
  };

  const handleFormSubmit = async (data: ApprovalUserRoleFormSchema): Promise<void> => {
    if (editingUserRole) {
      await updateUserRole.mutateAsync({
        id: editingUserRole.id,
        data: { userId: data.userId, approvalRoleId: data.approvalRoleId },
      });
    } else {
      await createUserRole.mutateAsync({ userId: data.userId, approvalRoleId: data.approvalRoleId });
    }
    setFormOpen(false);
    setEditingUserRole(null);
  };

  const clearSearch = () => {
    setSearchTerm('');
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: [APPROVAL_USER_ROLE_QUERY_KEYS.LIST] });
    setTimeout(() => setIsRefreshing(false), 500);
  };

  return (
    <div className="relative min-h-screen space-y-6 p-4 md:p-8 overflow-hidden">
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-pink-500/10 blur-[120px] pointer-events-none dark:block hidden" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-orange-500/10 blur-[120px] pointer-events-none dark:block hidden" />

      <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-6 pb-2">
        <div className="space-y-1">
          <h1 className="text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-foreground">
            {t('approvalUserRole.menu')}
          </h1>
          <div className="flex flex-col gap-1">
            <p className="text-zinc-500 dark:text-muted-foreground text-sm flex items-center gap-2 font-medium">
              <span className="w-2 h-2 rounded-full bg-pink-500 animate-pulse shadow-[0_0_8px_rgba(236,72,153,0.6)]" />
              {t('approvalUserRole.description')}
            </p>
          </div>
        </div>

        <div className="w-full md:w-auto flex flex-col md:flex-row items-center gap-3">
          <div className="w-full md:w-auto flex items-center gap-2">
            <div className="relative group w-full md:w-[320px]">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-pink-600 dark:group-focus-within:text-pink-500 transition-colors pointer-events-none z-10">
                <Search className="w-4 h-4" />
              </div>

              <Input
                placeholder={t('approvalUserRole.searchPlaceholder')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="
                  pl-10 pr-10 h-11 
                  bg-white dark:bg-zinc-900/50 
                  border-zinc-200 dark:border-zinc-800 
                  rounded-xl shadow-sm hover:shadow-md 
                  focus-visible:border-pink-500 focus-visible:ring-4 focus-visible:ring-pink-500/20
                  transition-all duration-300 ease-out
                  text-sm font-medium
                "
              />

              {searchTerm && (
                <button
                  onClick={clearSearch}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-pink-50 dark:hover:bg-pink-900/30 text-muted-foreground hover:text-pink-600 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            
            <div 
              onClick={handleRefresh}
              className={`hidden md:flex items-center justify-center w-11 h-11 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 text-muted-foreground hover:text-pink-600 hover:border-pink-200 transition-all cursor-pointer ${isRefreshing ? 'animate-spin' : ''}`} 
              title={t('approvalUserRole.refresh')}
            >
               <RefreshCw size={16} className="opacity-70" />
            </div>
          </div>

          <Button 
            onClick={handleAddClick}
            className="px-6 py-2 bg-gradient-to-r from-pink-600 to-orange-600 rounded-lg text-white text-sm font-bold shadow-lg shadow-pink-500/20 hover:scale-105 transition-transform border-0 hover:text-white"
          >
            <Plus size={18} className="mr-2" />
            {t('approvalUserRole.addButton')}
          </Button>
        </div>
      </div>

      <div className="relative z-10 bg-white/50 dark:bg-card/30 backdrop-blur-xl border border-white/20 dark:border-border/50 rounded-2xl shadow-sm dark:shadow-2xl overflow-hidden">
        <ApprovalUserRoleTable
          userRoles={filteredUserRoles}
          isLoading={isLoading}
          onEdit={handleEdit}
        />
      </div>

      <ApprovalUserRoleForm
        open={formOpen}
        onOpenChange={setFormOpen}
        onSubmit={handleFormSubmit}
        userRole={editingUserRole}
        isLoading={createUserRole.isPending || updateUserRole.isPending}
      />
    </div>
  );
}

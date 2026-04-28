import { type ReactElement, useMemo, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useUIStore } from '@/stores/ui-store';
import { Button } from '@/components/ui/button';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { VoiceSearchCombobox } from '@/components/shared/VoiceSearchCombobox';
import { CheckCircle2, ShieldCheck, UserRound } from 'lucide-react';
import { useUserOptionsInfinite } from '@/components/shared/dropdown/useDropdownEntityInfinite';
import { useUserPermissionGroupsQuery } from '../hooks/useUserPermissionGroupsQuery';
import { useSetUserPermissionGroupsMutation } from '../hooks/useSetUserPermissionGroupsMutation';
import { PermissionGroupMultiSelect } from './PermissionGroupMultiSelect';
import { FieldHelpTooltip } from './FieldHelpTooltip';

export function UserGroupAssignmentsPage(): ReactElement {
  const { t } = useTranslation(['access-control', 'common']);
  const { setPageTitle } = useUIStore();
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [selectedGroupIds, setSelectedGroupIds] = useState<number[]>([]);
  const [hasChanges, setHasChanges] = useState(false);

  const [userSearchTerm, setUserSearchTerm] = useState('');
  const userDropdown = useUserOptionsInfinite(userSearchTerm, true);
  const { data: userGroups, isLoading: userGroupsLoading } = useUserPermissionGroupsQuery(selectedUserId);
  const setUserGroups = useSetUserPermissionGroupsMutation(selectedUserId ?? 0);

  useEffect(() => {
    setPageTitle(t('userGroupAssignments.title'));
    return () => setPageTitle(null);
  }, [t, setPageTitle]);

  const serverGroupIdsKey = (userGroups?.permissionGroupIds ?? []).join(',');
  const parsedServerGroupIds = useMemo<number[]>(
    () => (serverGroupIdsKey ? serverGroupIdsKey.split(',').map((x) => parseInt(x, 10)) : []),
    [serverGroupIdsKey]
  );

  useEffect(() => {
    setSelectedGroupIds(parsedServerGroupIds.length > 0 ? [...parsedServerGroupIds] : []);
    setHasChanges(false);
  }, [parsedServerGroupIds]);

  const handleGroupIdsChange = (ids: number[]): void => {
    setSelectedGroupIds(ids);
    setHasChanges(true);
  };

  const handleSave = async (): Promise<void> => {
    if (selectedUserId == null) return;
    await setUserGroups.mutateAsync({ permissionGroupIds: selectedGroupIds });
    setHasChanges(false);
  };


  const headerCardStyle = `
    overflow-hidden rounded-[2rem] border border-slate-200 dark:border-white/10 
    bg-white/80 dark:bg-[#180F22] backdrop-blur-md p-6 shadow-xl 
    transition-all duration-300 relative
  `;

  const statCardStyle = `
    rounded-2xl border border-slate-200 dark:border-white/10 
    bg-white/90 dark:bg-[#1E1627] p-5 shadow-sm 
    transition-all duration-300 hover:shadow-md group
  `;

  return (
    <div className="w-full space-y-6">
      <Breadcrumb items={[{ label: t('sidebar.accessControl') }, { label: t('sidebar.userGroupAssignments'), isActive: true }]} />
      <div className={headerCardStyle}>
        <div className="absolute top-0 right-0 w-64 h-64 bg-pink-500/5 dark:bg-pink-500/10 blur-[80px] rounded-full -mr-20 -mt-20 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-orange-500/5 dark:bg-orange-500/10 blur-[80px] rounded-full -ml-20 -mb-20 pointer-events-none" />
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between relative z-10" />
        <div className="min-w-0"></div>

        <h1 className="mt-4 text-3xl font-black tracking-tight text-slate-900 dark:text-white transition-colors">
          {t('userGroupAssignments.title')}
        </h1>
        <p className="mt-2 text-sm font-medium text-slate-600 dark:text-slate-300 transition-colors">
          {t('userGroupAssignments.description')}
        </p>
        <p className="mt-3 flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
          <FieldHelpTooltip text={t('help.userAssignment.systemAdminNote')} side="right" />
          <span className="italic">{t('help.userAssignment.systemAdminNote')}</span>
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-3 relative z-10">
          <div className={statCardStyle}>
            <div className="flex items-center gap-4">
              <div className="rounded-xl bg-pink-100 p-3 text-pink-600 dark:bg-pink-500/10 dark:text-pink-400 border border-pink-100 dark:border-pink-500/20">
                <UserRound className="size-4" />
              </div>
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">
                  {t('userGroupAssignments.selectUser')}
                </p>
                <p className="mt-1 text-sm font-black text-slate-900 dark:text-white">
                  {selectedUserId != null ? `#${selectedUserId}` : '-'}
                </p>
              </div>
            </div>
          </div>
          <div className={statCardStyle}>
            <div className="flex items-center gap-4">
              <div className="rounded-xl bg-emerald-100 p-3 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-500/20">
                <ShieldCheck className="size-4" />
              </div>
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">
                  {t('userGroupAssignments.assignedGroups')}
                </p>
                <p className="mt-1 text-2xl font-black text-slate-900 dark:text-white">{selectedGroupIds.length}</p>
              </div>
            </div>
          </div>
          <div className={statCardStyle}>
            <div className="flex items-center gap-4">
              <div className="rounded-xl bg-orange-100 p-3 text-orange-600 dark:bg-orange-500/10 dark:text-orange-400 border border-orange-100 dark:border-orange-500/20">
                <CheckCircle2 className="size-4" />
              </div>
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">
                  Durum
                </p>
                <p className="mt-1 text-sm font-black text-slate-900 dark:text-white">
                  {hasChanges ? 'Kaydedilmedi' : 'Güncel'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-5 rounded-[2rem] border border-slate-200 bg-slate-50/80 p-6 border border-slate-200 dark:border-white/10  dark:bg-[#1E1627]">
        <div>
          <div className="mb-3 flex items-center justify-between gap-3">
            <label className="text-sm font-medium flex items-center gap-1">
              {t('userGroupAssignments.selectUser')}
              <FieldHelpTooltip text={t('help.userAssignment.user')} />
            </label>
          </div>
          <VoiceSearchCombobox
            options={userDropdown.options}
            value={selectedUserId?.toString() ?? ''}
            onSelect={(v) => setSelectedUserId(v ? parseInt(v, 10) : null)}
            onDebouncedSearchChange={setUserSearchTerm}
            onFetchNextPage={userDropdown.fetchNextPage}
            hasNextPage={userDropdown.hasNextPage}
            isLoading={userDropdown.isLoading}
            isFetchingNextPage={userDropdown.isFetchingNextPage}
            placeholder={t('userGroupAssignments.selectUserPlaceholder')}
            searchPlaceholder={t('common.search')}
          />
        </div>

        {selectedUserId != null && (
          <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50/80 p-4 border border-slate-200 dark:border-white/10  dark:bg-[#180F22]">
            <label className="mb-3 flex items-center gap-1 text-sm font-medium">
              {t('userGroupAssignments.assignedGroups')}
              <FieldHelpTooltip text={t('help.userAssignment.groups')} />
            </label>
            {userGroupsLoading ? (
              <div className="py-8 text-center text-slate-500">{t('common.loading')}</div>
            ) : (
              <>
                <PermissionGroupMultiSelect
                  value={selectedGroupIds}
                  onChange={handleGroupIdsChange}
                  disabled={setUserGroups.isPending}
                />
                {hasChanges && (
                  <div className="mt-4 flex items-center justify-end gap-1">
                    <FieldHelpTooltip text={t('help.userAssignment.save')} side="top" />
                    <Button
                      onClick={handleSave}
                      disabled={setUserGroups.isPending}
                      className="rounded-2xl bg-linear-to-r from-pink-600 to-orange-600 text-white shadow-lg shadow-pink-500/20 hover:text-white"
                    >
                      {setUserGroups.isPending ? t('common.saving') : t('common.save')}
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {!selectedUserId && !userDropdown.isLoading && (
          <div className="py-12 text-center text-slate-500 dark:text-slate-400">
            {t('userGroupAssignments.selectUserHint')}
          </div>
        )}
      </div>
    </div>
  );
}

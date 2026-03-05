import { type ReactElement, useMemo, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useUIStore } from '@/stores/ui-store';
import { Button } from '@/components/ui/button';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { VoiceSearchCombobox } from '@/components/shared/VoiceSearchCombobox';
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

  return (
    <div className="w-full space-y-6">
      <Breadcrumb items={[{ label: t('sidebar.accessControl') }, { label: t('sidebar.userGroupAssignments'), isActive: true }]} />
      <div className="flex flex-col gap-2 pt-2">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white transition-colors">
          {t('userGroupAssignments.title')}
        </h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm font-medium transition-colors">
          {t('userGroupAssignments.description')}
        </p>
        <p className="text-slate-500 dark:text-slate-400 text-sm flex items-center gap-1">
          <FieldHelpTooltip text={t('help.userAssignment.systemAdminNote')} side="right" />
          <span className="italic">{t('help.userAssignment.systemAdminNote')}</span>
        </p>
      </div>

      <div className="bg-white/70 dark:bg-[#1a1025]/60 backdrop-blur-xl border border-white/60 dark:border-white/5 shadow-sm rounded-2xl p-5 space-y-4">
        <div>
          <label className="text-sm font-medium mb-2 flex items-center gap-1">
            {t('userGroupAssignments.selectUser')}
            <FieldHelpTooltip text={t('help.userAssignment.user')} />
          </label>
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
          <div>
            <label className="text-sm font-medium mb-2 flex items-center gap-1">
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
                  <div className="mt-4 flex justify-end items-center gap-1">
                    <FieldHelpTooltip text={t('help.userAssignment.save')} side="top" />
                    <Button onClick={handleSave} disabled={setUserGroups.isPending}>
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

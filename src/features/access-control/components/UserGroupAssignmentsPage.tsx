import { type ReactElement, useMemo, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useUIStore } from '@/stores/ui-store';
import { Button } from '@/components/ui/button';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { VoiceSearchCombobox } from '@/components/shared/VoiceSearchCombobox';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, ShieldCheck, Sparkles, UserRound } from 'lucide-react';
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
      <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-linear-to-br from-white via-cyan-50/70 to-pink-50/70 p-5 shadow-sm dark:border-cyan-800/30 dark:from-blue-950/70 dark:via-blue-950/90 dark:to-cyan-950/40 sm:p-6">
        <div className="inline-flex items-center gap-2 rounded-2xl border border-cyan-200 bg-white/80 px-3 py-1.5 text-xs font-black text-cyan-700 shadow-sm dark:border-cyan-800/40 dark:bg-blue-950/60 dark:text-cyan-300">
          <Sparkles className="size-4" />
          {t('sidebar.userGroupAssignments')}
        </div>
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

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white/85 p-4 shadow-sm dark:border-cyan-800/30 dark:bg-blue-950/50">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-cyan-100 p-2.5 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300">
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
          <div className="rounded-2xl border border-slate-200 bg-white/85 p-4 shadow-sm dark:border-cyan-800/30 dark:bg-blue-950/50">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-emerald-100 p-2.5 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
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
          <div className="rounded-2xl border border-slate-200 bg-white/85 p-4 shadow-sm dark:border-cyan-800/30 dark:bg-blue-950/50">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-pink-100 p-2.5 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300">
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

      <div className="rounded-[28px] border border-slate-200 bg-white/85 p-5 shadow-sm backdrop-blur-xl dark:border-cyan-800/30 dark:bg-blue-950/45 sm:p-6">
        <div>
          <div className="mb-3 flex items-center justify-between gap-3">
            <label className="text-sm font-medium flex items-center gap-1">
              {t('userGroupAssignments.selectUser')}
              <FieldHelpTooltip text={t('help.userAssignment.user')} />
            </label>
            {selectedUserId != null ? (
              <Badge className="rounded-xl border-0 bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300">
                {t('userGroupAssignments.selectUser')}
              </Badge>
            ) : null}
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
          <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50/80 p-4 dark:border-cyan-800/30 dark:bg-blue-900/20">
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

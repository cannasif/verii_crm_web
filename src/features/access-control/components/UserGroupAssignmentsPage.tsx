import { type ReactElement, useMemo, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useUIStore } from '@/stores/ui-store';
import { Button } from '@/components/ui/button';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { VoiceSearchCombobox } from '@/components/shared/VoiceSearchCombobox';
import { CheckCircle2, Loader2, ShieldCheck, Sparkles, UserRound } from 'lucide-react';
import { useUserOptionsInfinite } from '@/components/shared/dropdown/useDropdownEntityInfinite';
import { useUserPermissionGroupsQuery } from '../hooks/useUserPermissionGroupsQuery';
import { useSetUserPermissionGroupsMutation } from '../hooks/useSetUserPermissionGroupsMutation';
import { useCrudPermissions } from '../hooks/useCrudPermissions';
import { PermissionGroupMultiSelect } from './PermissionGroupMultiSelect';
import { FieldHelpTooltip } from './FieldHelpTooltip';
import {
  ACCESS_CONTROL_HEADER_CARD_CLASSNAME,
  ACCESS_CONTROL_STAT_CARD_CLASSNAME,
  ACCESS_CONTROL_WORKSPACE_CLASSNAME,
} from '../utils/access-control-layout';
import { cn } from '@/lib/utils';
import { DOCUMENT_LINE_FORM_SAVE_BUTTON_CLASS } from '@/lib/document-line-dialog-styles';

const INNER_PANEL_CLASSNAME =
  'rounded-xl border border-slate-200 bg-white/90 p-4 dark:border-white/10 dark:bg-[#180F22]';

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
  const { canUpdate } = useCrudPermissions('access-control.user-group-assignments.view');

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

  const selectedUserLabel = useMemo(() => {
    const option = userDropdown.options.find((item) => item.value === String(selectedUserId));
    return option?.label ?? (selectedUserId != null ? `#${selectedUserId}` : '-');
  }, [selectedUserId, userDropdown.options]);

  const handleRevert = (): void => {
    setSelectedGroupIds(parsedServerGroupIds.length > 0 ? [...parsedServerGroupIds] : []);
    setHasChanges(false);
  };

  const headerCardStyle = ACCESS_CONTROL_HEADER_CARD_CLASSNAME;
  const statCardStyle = ACCESS_CONTROL_STAT_CARD_CLASSNAME;

  return (
    <div className="w-full space-y-6">
      <Breadcrumb items={[{ label: t('sidebar.accessControl') }, { label: t('sidebar.userGroupAssignments'), isActive: true }]} />
      <div className={headerCardStyle}>
        <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-primary/5 blur-[80px] dark:bg-primary/10" />
        <div className="pointer-events-none absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-primary/5 blur-[80px] dark:bg-primary/8" />

        <div className="relative z-10">
          <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.28em] text-primary dark:text-primary">
            <Sparkles className="size-3.5" />
            {t('sidebar.accessControl')}
          </div>
          <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-900 dark:text-white">
            {t('userGroupAssignments.title')}
          </h1>
          <p className="mt-2 text-sm font-medium text-slate-600 dark:text-slate-300">
            {t('userGroupAssignments.description')}
          </p>
          <p className="mt-3 flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
            <FieldHelpTooltip text={t('help.userAssignment.systemAdminNote')} side="right" />
            <span className="italic">{t('help.userAssignment.systemAdminNote')}</span>
          </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-3 relative z-10">
          <div className={statCardStyle}>
            <div className="flex items-center gap-4">
              <div className="rounded-xl bg-accent p-3 text-primary dark:bg-primary/10 dark:text-primary border border-primary/15 dark:border-primary/20">
                <UserRound className="size-4" />
              </div>
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">
                  {t('userGroupAssignments.selectUser')}
                </p>
                <p className="mt-1 truncate text-sm font-black text-slate-900 dark:text-white">{selectedUserLabel}</p>
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
              <div
                className={cn(
                  'rounded-xl border p-3',
                  hasChanges
                    ? 'border-amber-200 bg-amber-100 text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300'
                    : 'border-amber-100 bg-amber-100 text-amber-600 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-400'
                )}
              >
                <CheckCircle2 className="size-4" />
              </div>
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">
                  {t('userGroupAssignments.status')}
                </p>
                <p className="mt-1 text-sm font-black text-slate-900 dark:text-white">
                  {hasChanges ? t('userGroupAssignments.unsavedChanges') : t('userGroupAssignments.upToDate')}
                </p>
              </div>
            </div>
          </div>
        </div>
        </div>
      </div>

      <div className={ACCESS_CONTROL_WORKSPACE_CLASSNAME}>
        <div className={INNER_PANEL_CLASSNAME}>
          <label className="mb-3 flex items-center gap-1 text-sm font-semibold text-slate-800 dark:text-slate-100">
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
          <div className={cn(INNER_PANEL_CLASSNAME, 'mt-4')}>
            <label className="mb-3 flex items-center gap-1 text-sm font-semibold text-slate-800 dark:text-slate-100">
              {t('userGroupAssignments.assignedGroups')}
              <FieldHelpTooltip text={t('help.userAssignment.groups')} />
            </label>
            {userGroupsLoading ? (
              <div className="flex items-center justify-center gap-2 py-10 text-sm text-slate-500 dark:text-slate-400">
                <Loader2 className="size-4 animate-spin" />
                {t('common.loading')}
              </div>
            ) : (
              <>
                <PermissionGroupMultiSelect
                  value={selectedGroupIds}
                  onChange={handleGroupIdsChange}
                  disabled={setUserGroups.isPending || !canUpdate}
                />
                {hasChanges && canUpdate && (
                  <div className="mt-4 flex items-center justify-end gap-2 border-t border-slate-200/80 pt-4 dark:border-white/10">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleRevert}
                      disabled={setUserGroups.isPending}
                      className="rounded-xl border-red-200/80 text-red-600 hover:bg-red-50 hover:text-red-700 dark:border-red-500/30 dark:text-red-300 dark:hover:bg-red-500/10"
                    >
                      {t('userVisibilityAssignments.revert', { defaultValue: 'İptal' })}
                    </Button>
                    <Button
                      onClick={handleSave}
                      disabled={setUserGroups.isPending}
                      className={cn(DOCUMENT_LINE_FORM_SAVE_BUTTON_CLASS, 'h-11 px-6')}
                    >
                      {setUserGroups.isPending ? t('common.saving') : t('common.save')}
                    </Button>
                  </div>
                )}
                {!canUpdate && (
                  <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300">
                    {t('common.forbidden', { defaultValue: 'Bu alanda degisiklik yetkin yok.' })}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {!selectedUserId && !userDropdown.isLoading && (
          <div className="mt-4 flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-white/50 py-14 text-center dark:border-white/10 dark:bg-white/[0.02]">
            <div className="rounded-xl border border-slate-200 bg-white p-3 dark:border-white/10 dark:bg-[#180F22]">
              <UserRound className="size-7 text-slate-400 dark:text-slate-500" />
            </div>
            <p className="mt-3 text-sm font-medium text-slate-600 dark:text-slate-300">
              {t('userGroupAssignments.selectUserHint')}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

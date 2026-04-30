import { type ReactElement, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useUIStore } from '@/stores/ui-store';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CheckCircle2, Loader2, ShieldCheck, UserRound } from 'lucide-react';
import { VoiceSearchCombobox } from '@/components/shared/VoiceSearchCombobox';
import { useUserOptionsInfinite } from '@/components/shared/dropdown/useDropdownEntityInfinite';
import { FieldHelpTooltip } from './FieldHelpTooltip';
import { userVisibilityPolicyApi } from '../api/userVisibilityPolicyApi';
import { visibilityPolicyApi } from '../api/visibilityPolicyApi';
import { getVisibilityScopeMeta, VISIBILITY_ENTITY_OPTIONS } from '../utils/visibility-options';
import type { UserVisibilityPolicyDto, VisibilityPolicyDto } from '../types/access-control.types';

export function UserVisibilityAssignmentsPage(): ReactElement {
  const { t } = useTranslation(['access-control', 'common']);
  const { setPageTitle } = useUIStore();
  const queryClient = useQueryClient();
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const userDropdown = useUserOptionsInfinite(userSearchTerm, true);

  useEffect(() => {
    setPageTitle(t('userVisibilityAssignments.title'));
    return () => setPageTitle(null);
  }, [t, setPageTitle]);

  const assignmentsQuery = useQuery({
    queryKey: ['user-visibility-policies', selectedUserId],
    enabled: selectedUserId != null,
    queryFn: async () => {
      if (selectedUserId == null) return { data: [] as UserVisibilityPolicyDto[] };
      return userVisibilityPolicyApi.getList({
        pageNumber: 1,
        pageSize: 100,
        filters: [{ column: 'userId', operator: 'Equals', value: String(selectedUserId) }],
      });
    },
  });

  const policiesQuery = useQuery({
    queryKey: ['visibility-policies', 'all-for-assignment'],
    queryFn: () =>
      visibilityPolicyApi.getList({
        pageNumber: 1,
        pageSize: 200,
        sortBy: 'name',
        sortDirection: 'asc',
      }),
  });

  const createMutation = useMutation({
    mutationFn: userVisibilityPolicyApi.create,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['user-visibility-policies', selectedUserId] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, visibilityPolicyId }: { id: number; visibilityPolicyId: number }) =>
      userVisibilityPolicyApi.update(id, { visibilityPolicyId }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['user-visibility-policies', selectedUserId] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: userVisibilityPolicyApi.delete,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['user-visibility-policies', selectedUserId] });
    },
  });

  const policies = policiesQuery.data?.data ?? [];
  const assignments = assignmentsQuery.data?.data ?? [];
  const assignmentsByEntity = useMemo(
    () =>
      new Map(
        assignments.map((assignment) => [assignment.entityType, assignment])
      ),
    [assignments]
  );

  const selectedUserLabel = useMemo(() => {
    const option = userDropdown.options.find((item) => item.value === String(selectedUserId));
    return option?.label ?? (selectedUserId ? `#${selectedUserId}` : '-');
  }, [selectedUserId, userDropdown.options]);

  const handlePolicySelection = async (entityType: string, value: string): Promise<void> => {
    if (selectedUserId == null) return;
    const existing = assignmentsByEntity.get(entityType);

    if (value === '__none__') {
      if (existing) {
        await deleteMutation.mutateAsync(existing.id);
      }
      return;
    }

    const policyId = Number(value);
    if (existing) {
      if (existing.visibilityPolicyId !== policyId) {
        await updateMutation.mutateAsync({ id: existing.id, visibilityPolicyId: policyId });
      }
      return;
    }

    await createMutation.mutateAsync({ userId: selectedUserId, visibilityPolicyId: policyId });
  };

  const isMutating = createMutation.isPending || updateMutation.isPending || deleteMutation.isPending;

  return (
    <div className="w-full space-y-6">
      <Breadcrumb items={[{ label: t('sidebar.accessControl') }, { label: t('sidebar.userVisibilityAssignments'), isActive: true }]} />

      <div className="rounded-[2rem] border border-slate-200 bg-white/80 p-6 shadow-xl dark:border-white/10 dark:bg-[#180F22]">
        <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">{t('userVisibilityAssignments.title')}</h1>
        <p className="mt-2 text-sm font-medium text-slate-500 dark:text-slate-400">{t('userVisibilityAssignments.description')}</p>
        <p className="mt-3 flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
          <FieldHelpTooltip text={t('help.userVisibilityAssignment.user')} side="right" />
          <span className="italic">{t('help.userVisibilityAssignment.user')}</span>
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          <Card className="rounded-2xl border border-slate-200 dark:border-white/10 dark:bg-[#1E1627]">
            <CardContent className="p-5">
              <div className="flex items-center gap-4">
                <div className="rounded-xl bg-pink-100 p-3 text-pink-600 dark:bg-pink-500/10 dark:text-pink-400 border border-pink-100 dark:border-pink-500/20">
                  <UserRound className="size-4" />
                </div>
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">{t('userVisibilityAssignments.selectedUser')}</p>
                  <p className="mt-1 text-sm font-black text-slate-900 dark:text-white truncate max-w-[180px]">{selectedUserLabel}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="rounded-2xl border border-slate-200 dark:border-white/10 dark:bg-[#1E1627]">
            <CardContent className="p-5">
              <div className="flex items-center gap-4">
                <div className="rounded-xl bg-emerald-100 p-3 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-500/20">
                  <ShieldCheck className="size-4" />
                </div>
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">{t('userVisibilityAssignments.assignedPolicies')}</p>
                  <p className="mt-1 text-2xl font-black text-slate-900 dark:text-white">{assignments.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="rounded-2xl border border-slate-200 dark:border-white/10 dark:bg-[#1E1627]">
            <CardContent className="p-5">
              <div className="flex items-center gap-4">
                <div className="rounded-xl bg-orange-100 p-3 text-orange-600 dark:bg-orange-500/10 dark:text-orange-400 border border-orange-100 dark:border-orange-500/20">
                  <CheckCircle2 className="size-4" />
                </div>
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">{t('userVisibilityAssignments.status')}</p>
                  <p className="mt-1 text-sm font-black text-slate-900 dark:text-white">{isMutating ? t('common.saving') : t('userVisibilityAssignments.ready')}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="rounded-[2rem] border border-slate-200 bg-slate-50/80 p-6 dark:border-white/10 dark:bg-[#1E1627]">
        <div className="mb-3 flex items-center justify-between gap-3">
          <label className="text-sm font-medium flex items-center gap-1">
            {t('userVisibilityAssignments.selectUser')}
            <FieldHelpTooltip text={t('help.userVisibilityAssignment.user')} />
          </label>
        </div>
        <VoiceSearchCombobox
          options={userDropdown.options}
          value={selectedUserId?.toString() ?? ''}
          onSelect={(value) => setSelectedUserId(value ? parseInt(value, 10) : null)}
          onDebouncedSearchChange={setUserSearchTerm}
          onFetchNextPage={userDropdown.fetchNextPage}
          hasNextPage={userDropdown.hasNextPage}
          isLoading={userDropdown.isLoading}
          isFetchingNextPage={userDropdown.isFetchingNextPage}
          placeholder={t('userVisibilityAssignments.selectUserPlaceholder')}
          searchPlaceholder={t('common.search')}
        />

        {selectedUserId != null && (
          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            {VISIBILITY_ENTITY_OPTIONS.map((entity) => {
              const assignment = assignmentsByEntity.get(entity.value);
              const entityPolicies = policies.filter((policy) => policy.entityType === entity.value && policy.isActive);
              const scopeMeta = assignment ? getVisibilityScopeMeta(assignment.scopeType) : null;

              return (
                <Card key={entity.value} className="rounded-2xl border border-slate-200 dark:border-white/10 dark:bg-[#180F22]">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center justify-between gap-3 text-base font-black text-slate-900 dark:text-white">
                      <span>{t(entity.labelKey, { defaultValue: entity.fallback })}</span>
                      {assignment ? (
                        <Badge variant="secondary">
                          {scopeMeta ? t(scopeMeta.labelKey, { defaultValue: scopeMeta.fallback }) : assignment.scopeType}
                        </Badge>
                      ) : (
                        <Badge variant="outline">{t('userVisibilityAssignments.unassigned')}</Badge>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="text-sm text-slate-500 dark:text-slate-400">
                      {t('userVisibilityAssignments.cardDescription', {
                        entity: t(entity.labelKey, { defaultValue: entity.fallback }),
                      })}
                    </div>
                    <Select
                      value={assignment ? String(assignment.visibilityPolicyId) : '__none__'}
                      onValueChange={(value) => void handlePolicySelection(entity.value, value)}
                      disabled={isMutating || assignmentsQuery.isLoading || policiesQuery.isLoading}
                    >
                      <SelectTrigger className="h-11 rounded-lg bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10">
                        <SelectValue placeholder={t('userVisibilityAssignments.selectPolicyPlaceholder')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">{t('userVisibilityAssignments.noPolicy')}</SelectItem>
                        {entityPolicies.map((policy: VisibilityPolicyDto) => (
                          <SelectItem key={policy.id} value={String(policy.id)}>
                            {policy.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {assignment && (
                      <div className="rounded-xl bg-slate-100/80 px-3 py-2 text-sm text-slate-600 dark:bg-white/5 dark:text-slate-300">
                        {assignment.visibilityPolicyName}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {selectedUserId == null && !userDropdown.isLoading && (
          <div className="py-12 text-center text-slate-500 dark:text-slate-400">
            {t('userVisibilityAssignments.selectUserHint')}
          </div>
        )}

        {(assignmentsQuery.isLoading || policiesQuery.isLoading) && selectedUserId != null && (
          <div className="py-10 text-center text-slate-500 dark:text-slate-400">
            <Loader2 className="mx-auto mb-3 size-5 animate-spin" />
            {t('common.loading')}
          </div>
        )}
      </div>
    </div>
  );
}

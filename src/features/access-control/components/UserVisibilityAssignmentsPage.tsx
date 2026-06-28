import { type ReactElement, useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useUIStore } from '@/stores/ui-store';
import { cn } from '@/lib/utils';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectSeparator, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  BarChart3,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Eye,
  FileText,
  Info,
  Loader2,
  Package,
  ShieldCheck,
  Sparkles,
  UserRound,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { VoiceSearchCombobox } from '@/components/shared/VoiceSearchCombobox';
import { useUserOptionsInfinite } from '@/components/shared/dropdown/useDropdownEntityInfinite';
import { FieldHelpTooltip } from './FieldHelpTooltip';
import { userVisibilityPolicyApi } from '../api/userVisibilityPolicyApi';
import { visibilityPolicyApi } from '../api/visibilityPolicyApi';
import { useCrudPermissions } from '../hooks/useCrudPermissions';
import { getVisibilityScopeMeta, VISIBILITY_ENTITY_OPTIONS } from '../utils/visibility-options';
import type { UserVisibilityPolicyDto, VisibilityPolicyDto } from '../types/access-control.types';

const EMPTY_ASSIGNMENTS: UserVisibilityPolicyDto[] = [];

const HEADER_CARD_CLASSNAME =
  'overflow-hidden rounded-[2rem] border border-slate-200 dark:border-white/10 bg-white/80 dark:bg-[#180F22] backdrop-blur-md p-6 shadow-xl transition-all duration-300 relative';

const STAT_CARD_CLASSNAME =
  'rounded-2xl border border-slate-200 dark:border-white/10 bg-white/90 dark:bg-[#1E1627] p-5 shadow-sm transition-all duration-300 hover:shadow-md';

const WORKSPACE_CLASSNAME =
  'rounded-[2rem] border border-slate-200 bg-slate-50/80 p-6 dark:border-white/10 dark:bg-[#1E1627]';

const ENTITY_ICON_MAP: Record<string, LucideIcon> = {
  Activity: CalendarDays,
  Quotation: FileText,
  Demand: ClipboardList,
  Order: Package,
  Salesman360: BarChart3,
};

const POLICY_SELECT_TRIGGER_CLASSNAME =
  'h-10 w-full rounded-xl border border-slate-200/90 bg-slate-50/90 px-3.5 text-sm font-medium text-slate-900 shadow-sm transition-all duration-200 dark:border-white/10 dark:bg-white/[0.04] dark:text-white dark:shadow-none hover:border-slate-300 dark:hover:border-white/20 focus-visible:border-rose-500/60 focus-visible:ring-2 focus-visible:ring-rose-500/15 focus-visible:ring-offset-0 data-[placeholder]:text-slate-400 dark:data-[placeholder]:text-slate-500';

const POLICY_SELECT_CONTENT_CLASSNAME =
  'overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-[0_12px_40px_-16px_rgba(15,23,42,0.35)] dark:border-white/12 dark:bg-[#1a1028] dark:shadow-black/50 [&_[data-slot=select-scroll-up-button]+div]:p-2';

const POLICY_SELECT_ITEM_CLASSNAME =
  'mb-1.5 last:mb-0 rounded-lg border border-transparent py-2.5 pl-3 pr-9 text-sm text-slate-700 transition-all duration-150 dark:text-slate-200 focus:border-slate-200/90 focus:bg-slate-50 dark:focus:border-white/12 dark:focus:bg-white/[0.06] data-[state=checked]:border-rose-300/80 data-[state=checked]:bg-rose-500/10 data-[state=checked]:font-semibold data-[state=checked]:text-rose-700 data-[state=checked]:shadow-sm dark:data-[state=checked]:border-rose-500/35 dark:data-[state=checked]:bg-rose-500/15 dark:data-[state=checked]:text-rose-300 [&_svg]:text-rose-600 dark:[&_svg]:text-rose-400';

const POLICY_SELECT_NONE_ITEM_CLASSNAME =
  'mb-1.5 rounded-lg border border-dashed border-slate-200/80 py-2.5 pl-3 pr-9 text-sm text-slate-500 transition-all duration-150 dark:border-white/10 dark:text-slate-400 focus:border-slate-300 focus:bg-slate-50 dark:focus:border-white/15 dark:focus:bg-white/[0.04]';

const ENTITY_ACCENT_MAP: Record<string, string> = {
  Activity: 'violet',
  Quotation: 'rose',
  Demand: 'sky',
  Order: 'emerald',
  Salesman360: 'amber',
};

function entityAccentClasses(entityType: string): {
  iconWrap: string;
  icon: string;
  dirtyRing: string;
} {
  const accent = ENTITY_ACCENT_MAP[entityType] ?? 'rose';
  const map: Record<string, { iconWrap: string; icon: string; dirtyRing: string }> = {
    violet: {
      iconWrap: 'bg-violet-100 border-violet-100 dark:bg-violet-500/10 dark:border-violet-500/20',
      icon: 'text-violet-600 dark:text-violet-400',
      dirtyRing: 'ring-violet-500/25 border-violet-300 dark:border-violet-500/40',
    },
    rose: {
      iconWrap: 'bg-rose-100 border-rose-100 dark:bg-rose-500/10 dark:border-rose-500/20',
      icon: 'text-rose-600 dark:text-rose-400',
      dirtyRing: 'ring-rose-500/25 border-rose-300 dark:border-rose-500/40',
    },
    sky: {
      iconWrap: 'bg-sky-100 border-sky-100 dark:bg-sky-500/10 dark:border-sky-500/20',
      icon: 'text-sky-600 dark:text-sky-400',
      dirtyRing: 'ring-sky-500/25 border-sky-300 dark:border-sky-500/40',
    },
    emerald: {
      iconWrap: 'bg-emerald-100 border-emerald-100 dark:bg-emerald-500/10 dark:border-emerald-500/20',
      icon: 'text-emerald-600 dark:text-emerald-400',
      dirtyRing: 'ring-emerald-500/25 border-emerald-300 dark:border-emerald-500/40',
    },
    amber: {
      iconWrap: 'bg-amber-100 border-amber-100 dark:bg-amber-500/10 dark:border-amber-500/20',
      icon: 'text-amber-600 dark:text-amber-400',
      dirtyRing: 'ring-amber-500/25 border-amber-300 dark:border-amber-500/40',
    },
  };
  return map[accent];
}

function getScopeBadgeClassName(scopeType: number | null, isUnassigned: boolean): string {
  if (isUnassigned || scopeType == null) {
    return 'border-slate-200/80 bg-slate-100/90 text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-400';
  }

  switch (scopeType) {
    case 1:
      return 'border-sky-200/80 bg-sky-50 text-sky-700 dark:border-sky-500/25 dark:bg-sky-500/10 dark:text-sky-300';
    case 2:
      return 'border-violet-200/80 bg-violet-50 text-violet-700 dark:border-violet-500/25 dark:bg-violet-500/10 dark:text-violet-300';
    case 3:
      return 'border-amber-200/80 bg-amber-50 text-amber-800 dark:border-amber-500/25 dark:bg-amber-500/10 dark:text-amber-200';
    case 4:
      return 'border-emerald-200/80 bg-emerald-50 text-emerald-700 dark:border-emerald-500/25 dark:bg-emerald-500/10 dark:text-emerald-300';
    default:
      return 'border-slate-200/80 bg-slate-100/90 text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-400';
  }
}

const VISIBILITY_AFFECTED_QUERY_PREFIXES = [
  'activityManagement.',
  'demand.',
  'quotation.',
  'order.',
  'approval.',
] as const;

const VISIBILITY_AFFECTED_QUERY_ROOTS = new Set([
  'auth',
  'permissions',
  'salesmen360',
]);

type DraftSelections = Record<string, string>;

type EntityPendingAction = 'create' | 'update' | 'delete';

function buildDraftFromAssignments(assignments: UserVisibilityPolicyDto[]): DraftSelections {
  const draft: DraftSelections = {};
  for (const entity of VISIBILITY_ENTITY_OPTIONS) {
    const assignment = assignments.find((item) => item.entityType === entity.value);
    draft[entity.value] = assignment ? String(assignment.visibilityPolicyId) : '__none__';
  }
  return draft;
}

function areDraftsEqual(left: DraftSelections, right: DraftSelections): boolean {
  for (const entity of VISIBILITY_ENTITY_OPTIONS) {
    const leftValue = left[entity.value] ?? '__none__';
    const rightValue = right[entity.value] ?? '__none__';
    if (leftValue !== rightValue) {
      return false;
    }
  }
  return true;
}

function getEntityPendingAction(
  draftValue: string,
  assignment: UserVisibilityPolicyDto | undefined
): EntityPendingAction | null {
  const serverValue = assignment ? String(assignment.visibilityPolicyId) : '__none__';
  if (draftValue === serverValue) {
    return null;
  }
  if (draftValue === '__none__' && assignment) {
    return 'delete';
  }
  if (draftValue !== '__none__' && assignment) {
    return 'update';
  }
  if (draftValue !== '__none__' && !assignment) {
    return 'create';
  }
  return null;
}

function canApplyEntityAction(
  action: EntityPendingAction | null,
  canCreate: boolean,
  canUpdate: boolean,
  canDelete: boolean,
  isSystemAdmin: boolean
): boolean {
  if (!action) {
    return false;
  }
  if (isSystemAdmin) {
    return true;
  }
  if (action === 'create') {
    return canCreate;
  }
  if (action === 'update') {
    return canUpdate;
  }
  return canDelete;
}

export function UserVisibilityAssignmentsPage(): ReactElement {
  const { t } = useTranslation(['access-control', 'common']);
  const { setPageTitle } = useUIStore();
  const queryClient = useQueryClient();
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [draftSelections, setDraftSelections] = useState<DraftSelections>({});
  const userDropdown = useUserOptionsInfinite(userSearchTerm, true);
  const { canCreate, canUpdate, canDelete, isSystemAdmin } = useCrudPermissions(
    'access-control.user-visibility-assignments.view'
  );

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

  const invalidateVisibilityDependentQueries = useCallback(async () => {
    await queryClient.invalidateQueries({
      predicate: (query) => {
        const [root] = query.queryKey;
        if (typeof root !== 'string') return false;

        return (
          VISIBILITY_AFFECTED_QUERY_ROOTS.has(root) ||
          VISIBILITY_AFFECTED_QUERY_PREFIXES.some((prefix) => root.startsWith(prefix))
        );
      },
      refetchType: 'active',
    });
  }, [queryClient]);

  const saveEntityMutation = useMutation({
    mutationFn: async ({
      userId,
      draftValue,
      assignment,
    }: {
      entityType: string;
      userId: number;
      draftValue: string;
      assignment: UserVisibilityPolicyDto | undefined;
    }): Promise<void> => {
      const action = getEntityPendingAction(draftValue, assignment);
      if (!action) {
        return;
      }

      if (action === 'delete' && assignment) {
        await userVisibilityPolicyApi.delete(assignment.id);
        return;
      }

      if (action === 'update' && assignment) {
        await userVisibilityPolicyApi.update(assignment.id, { visibilityPolicyId: Number(draftValue) });
        return;
      }

      if (action === 'create') {
        await userVisibilityPolicyApi.create({ userId, visibilityPolicyId: Number(draftValue) });
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['user-visibility-policies', selectedUserId] });
      await invalidateVisibilityDependentQueries();
    },
  });

  const policies = policiesQuery.data?.data ?? [];
  const assignments = assignmentsQuery.data?.data ?? EMPTY_ASSIGNMENTS;
  const assignmentsByEntity = useMemo(
    () =>
      new Map(
        assignments.map((assignment) => [assignment.entityType, assignment])
      ),
    [assignments]
  );

  const assignmentsSyncKey = useMemo(
    () =>
      assignments
        .map((assignment) => `${assignment.entityType}:${assignment.visibilityPolicyId}:${assignment.id}`)
        .join('|'),
    [assignments]
  );

  useEffect(() => {
    if (selectedUserId == null) {
      setDraftSelections({});
      return;
    }

    if (assignmentsQuery.isLoading) {
      return;
    }

    setDraftSelections((prev) => {
      const nextDraft = buildDraftFromAssignments(assignments);
      return areDraftsEqual(prev, nextDraft) ? prev : nextDraft;
    });
  }, [selectedUserId, assignmentsSyncKey, assignmentsQuery.isLoading, assignments]);

  const dirtyEntityCount = useMemo(
    () =>
      VISIBILITY_ENTITY_OPTIONS.filter((entity) => {
        const assignment = assignmentsByEntity.get(entity.value);
        const draftValue = draftSelections[entity.value] ?? (assignment ? String(assignment.visibilityPolicyId) : '__none__');
        const serverValue = assignment ? String(assignment.visibilityPolicyId) : '__none__';
        return draftValue !== serverValue;
      }).length,
    [draftSelections, assignmentsByEntity]
  );

  const hasChanges = dirtyEntityCount > 0;

  const savingEntityType = saveEntityMutation.isPending ? saveEntityMutation.variables?.entityType : null;

  const selectedUserLabel = useMemo(() => {
    const option = userDropdown.options.find((item) => item.value === String(selectedUserId));
    return option?.label ?? (selectedUserId ? `#${selectedUserId}` : '-');
  }, [selectedUserId, userDropdown.options]);

  const handleDraftSelection = (entityType: string, value: string): void => {
    setDraftSelections((prev) => ({ ...prev, [entityType]: value }));
  };

  const handleRevertEntity = (entityType: string): void => {
    const assignment = assignmentsByEntity.get(entityType);
    const serverValue = assignment ? String(assignment.visibilityPolicyId) : '__none__';
    setDraftSelections((prev) => ({ ...prev, [entityType]: serverValue }));
  };

  const handleSaveEntity = async (entityType: string): Promise<void> => {
    if (selectedUserId == null) {
      return;
    }

    const assignment = assignmentsByEntity.get(entityType);
    const draftValue = draftSelections[entityType] ?? (assignment ? String(assignment.visibilityPolicyId) : '__none__');
    const action = getEntityPendingAction(draftValue, assignment);

    if (!canApplyEntityAction(action, canCreate, canUpdate, canDelete, isSystemAdmin)) {
      return;
    }

    await saveEntityMutation.mutateAsync({
      entityType,
      userId: selectedUserId,
      draftValue,
      assignment,
    });
  };

  const isSavingAny = saveEntityMutation.isPending;
  const isWorkspaceLoading =
    selectedUserId != null && (assignmentsQuery.isLoading || policiesQuery.isLoading);

  return (
    <div className="w-full space-y-6">
      <Breadcrumb
        items={[
          { label: t('sidebar.accessControl') },
          { label: t('sidebar.userVisibilityAssignments'), isActive: true },
        ]}
      />

      <div className={HEADER_CARD_CLASSNAME}>
        <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-rose-500/5 blur-[80px] dark:bg-rose-500/10" />
        <div className="pointer-events-none absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-amber-500/5 blur-[80px] dark:bg-amber-500/10" />

        <div className="relative z-10">
          <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.28em] text-rose-600 dark:text-rose-400">
            <Sparkles className="size-3.5" />
            {t('sidebar.accessControl')}
          </div>
          <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-900 dark:text-white">
            {t('userVisibilityAssignments.title')}
          </h1>
          <p className="mt-2 max-w-3xl text-sm font-medium text-slate-600 dark:text-slate-300">
            {t('userVisibilityAssignments.description')}
          </p>
          <p className="mt-3 flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
            <FieldHelpTooltip text={t('help.userVisibilityAssignment.save')} side="right" />
            <span className="italic">{t('help.userVisibilityAssignment.save')}</span>
          </p>

          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            <div className={STAT_CARD_CLASSNAME}>
              <div className="flex items-center gap-4">
                <div className="rounded-xl border border-rose-100 bg-rose-100 p-3 text-rose-600 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-400">
                  <UserRound className="size-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">
                    {t('userVisibilityAssignments.selectedUser')}
                  </p>
                  <p className="mt-1 truncate text-sm font-black text-slate-900 dark:text-white">{selectedUserLabel}</p>
                </div>
              </div>
            </div>

            <div className={STAT_CARD_CLASSNAME}>
              <div className="flex items-center gap-4">
                <div className="rounded-xl border border-emerald-100 bg-emerald-100 p-3 text-emerald-600 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400">
                  <ShieldCheck className="size-4" />
                </div>
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">
                    {t('userVisibilityAssignments.assignedPolicies')}
                  </p>
                  <p className="mt-1 text-2xl font-black text-slate-900 dark:text-white">{assignments.length}</p>
                </div>
              </div>
            </div>

            <div className={STAT_CARD_CLASSNAME}>
              <div className="flex items-center gap-4">
                <div
                  className={`rounded-xl border p-3 ${
                    hasChanges
                      ? 'border-amber-200 bg-amber-100 text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300'
                      : 'border-amber-100 bg-amber-100 text-amber-600 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-400'
                  }`}
                >
                  {isSavingAny ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
                </div>
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">
                    {t('userVisibilityAssignments.status')}
                  </p>
                  <p className="mt-1 text-sm font-black text-slate-900 dark:text-white">
                    {isSavingAny
                      ? t('common.saving')
                      : hasChanges
                        ? t('userVisibilityAssignments.unsavedChangesCount', { count: dirtyEntityCount })
                        : t('userVisibilityAssignments.upToDate')}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className={WORKSPACE_CLASSNAME}>
        <div className="rounded-2xl border border-slate-200 bg-white/80 p-5 dark:border-white/10 dark:bg-[#180F22]">
          <label className="mb-3 flex items-center gap-1 text-sm font-semibold text-slate-800 dark:text-slate-100">
            {t('userVisibilityAssignments.selectUser')}
            <FieldHelpTooltip text={t('help.userVisibilityAssignment.user')} />
          </label>
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
        </div>

        {selectedUserId == null && !userDropdown.isLoading && (
          <div className="mt-6 flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white/50 py-16 text-center dark:border-white/10 dark:bg-white/[0.02]">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-[#180F22]">
              <Eye className="size-8 text-slate-400 dark:text-slate-500" />
            </div>
            <p className="mt-4 text-sm font-medium text-slate-600 dark:text-slate-300">
              {t('userVisibilityAssignments.selectUserHint')}
            </p>
          </div>
        )}

        {isWorkspaceLoading && (
          <div className="mt-5 grid gap-3 lg:grid-cols-2">
            {VISIBILITY_ENTITY_OPTIONS.map((entity) => (
              <div
                key={entity.value}
                className="rounded-xl border border-slate-200/80 bg-white/90 px-4 py-3.5 dark:border-white/10 dark:bg-[#180F22]"
              >
                <div className="flex items-center gap-2.5">
                  <div className="size-8 animate-pulse rounded-lg bg-slate-200 dark:bg-white/10" />
                  <div className="h-4 w-24 animate-pulse rounded bg-slate-200 dark:bg-white/10" />
                </div>
                <div className="mt-3 h-9 animate-pulse rounded-lg bg-slate-100 dark:bg-white/5" />
              </div>
            ))}
          </div>
        )}

        {selectedUserId != null && !isWorkspaceLoading && (
          <div className="mt-5">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-xs font-black uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                {t('userVisibilityAssignments.moduleSectionTitle')}
              </h2>
              {hasChanges && (
                <Badge
                  variant="outline"
                  className="rounded-full border-amber-300/60 bg-amber-50 px-2.5 py-0.5 text-[11px] font-semibold text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200"
                >
                  {t('userVisibilityAssignments.unsavedChangesCount', { count: dirtyEntityCount })}
                </Badge>
              )}
            </div>

            <div className="grid gap-3 lg:grid-cols-2">
              {VISIBILITY_ENTITY_OPTIONS.map((entity) => {
                const assignment = assignmentsByEntity.get(entity.value);
                const draftValue =
                  draftSelections[entity.value] ?? (assignment ? String(assignment.visibilityPolicyId) : '__none__');
                const draftPolicyId = draftValue === '__none__' ? null : Number(draftValue);
                const draftPolicy = draftPolicyId != null ? policies.find((policy) => policy.id === draftPolicyId) : null;
                const entityPolicies = policies.filter((policy) => policy.entityType === entity.value && policy.isActive);
                const scopeMeta = draftPolicy ? getVisibilityScopeMeta(draftPolicy.scopeType) : null;
                const serverValue = assignment ? String(assignment.visibilityPolicyId) : '__none__';
                const isEntityDirty = draftValue !== serverValue;
                const isUnassigned = draftValue === '__none__';
                const scopeBadgeLabel = isUnassigned
                  ? t('userVisibilityAssignments.unassigned')
                  : scopeMeta
                    ? t(scopeMeta.labelKey, { defaultValue: scopeMeta.fallback })
                    : String(draftPolicy?.scopeType ?? '');
                const scopeBadgeClass = getScopeBadgeClassName(
                  draftPolicy?.scopeType ?? null,
                  isUnassigned
                );
                const pendingAction = getEntityPendingAction(draftValue, assignment);
                const canSaveEntity = canApplyEntityAction(
                  pendingAction,
                  canCreate,
                  canUpdate,
                  canDelete,
                  isSystemAdmin
                );
                const isEntitySaving = savingEntityType === entity.value;
                const canAssignNew = !assignment && canCreate;
                const canReplaceExisting = Boolean(assignment) && canUpdate;
                const canRemoveExisting = Boolean(assignment) && canDelete;
                const disableSelect =
                  isSavingAny || (!canAssignNew && !canReplaceExisting && !canRemoveExisting);
                const entityLabel = t(entity.labelKey, { defaultValue: entity.fallback });
                const EntityIcon = ENTITY_ICON_MAP[entity.value] ?? Eye;
                const accent = entityAccentClasses(entity.value);

                return (
                  <div
                    key={entity.value}
                    className={`rounded-xl border px-4 py-3.5 transition-all ${
                      isEntityDirty
                        ? `bg-white/95 ring-1 ${accent.dirtyRing} dark:bg-[#180F22]`
                        : 'border-slate-200/80 bg-white/90 dark:border-white/10 dark:bg-[#180F22]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-2.5">
                        <div className={`rounded-lg border p-2 ${accent.iconWrap}`}>
                          <EntityIcon className={`size-3.5 ${accent.icon}`} />
                        </div>
                        <p className="truncate text-sm font-bold text-slate-900 dark:text-white">{entityLabel}</p>
                      </div>
                      <span
                        className={`shrink-0 rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${scopeBadgeClass}`}
                      >
                        {scopeBadgeLabel}
                      </span>
                    </div>

                    <div className="mt-3">
                      <Select
                        value={draftValue}
                        onValueChange={(value) => handleDraftSelection(entity.value, value)}
                        disabled={disableSelect}
                      >
                        <SelectTrigger
                          className={cn(
                            POLICY_SELECT_TRIGGER_CLASSNAME,
                            isEntityDirty && 'border-rose-300/70 dark:border-rose-500/35'
                          )}
                        >
                          <SelectValue placeholder={t('userVisibilityAssignments.selectPolicyPlaceholder')} />
                        </SelectTrigger>
                        <SelectContent
                          position="popper"
                          sideOffset={6}
                          className={cn(POLICY_SELECT_CONTENT_CLASSNAME, 'max-h-60')}
                        >
                          <SelectItem
                            value="__none__"
                            disabled={Boolean(assignment) && !canRemoveExisting}
                            className={POLICY_SELECT_NONE_ITEM_CLASSNAME}
                          >
                            {t('userVisibilityAssignments.noPolicy')}
                          </SelectItem>
                          {entityPolicies.length > 0 && (
                            <SelectSeparator className="my-1 bg-slate-200/80 dark:bg-white/10" />
                          )}
                          {entityPolicies.map((policy: VisibilityPolicyDto) => (
                            <SelectItem
                              key={policy.id}
                              value={String(policy.id)}
                              disabled={assignment ? !canReplaceExisting : !canAssignNew}
                              className={POLICY_SELECT_ITEM_CLASSNAME}
                            >
                              {policy.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="mt-2 flex items-start gap-1.5 rounded-lg border border-sky-200/70 bg-sky-50/80 px-2.5 py-2 text-[11px] font-semibold leading-4 text-sky-800 dark:border-sky-500/20 dark:bg-sky-500/10 dark:text-sky-200">
                        <Info className="mt-0.5 size-3.5 shrink-0" />
                        <span>
                          {t('userVisibilityAssignments.noPolicyCompanyHint', {
                            defaultValue:
                              'Policy yok seçildiğinde kullanıcı bu modülde şirket/fabrika genelindeki tüm kayıtları görebilir.',
                          })}
                        </span>
                      </p>
                    </div>

                    {isEntityDirty && (
                      <div className="mt-3 flex items-center justify-between gap-2 border-t border-slate-100 pt-3 dark:border-white/5">
                        <p className="text-[11px] font-medium text-amber-700 dark:text-amber-300">
                          {t('userVisibilityAssignments.pendingChange')}
                        </p>
                        <div className="flex shrink-0 items-center gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={isEntitySaving}
                            onClick={() => handleRevertEntity(entity.value)}
                            className="h-8 rounded-lg border-red-200 bg-red-50 px-3 text-red-600 hover:bg-red-100 hover:text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300 dark:hover:bg-red-500/20"
                          >
                            {t('userVisibilityAssignments.revert')}
                          </Button>
                          {canSaveEntity ? (
                            <Button
                              type="button"
                              size="sm"
                              disabled={isEntitySaving}
                              onClick={() => void handleSaveEntity(entity.value)}
                              className="h-8 rounded-lg bg-[image:var(--crm-brand-gradient)] border-0 px-3 text-white shadow-sm shadow-rose-500/20 hover:text-white"
                            >
                              {isEntitySaving ? (
                                <>
                                  <Loader2 className="mr-1.5 size-3.5 animate-spin" />
                                  {t('common.saving')}
                                </>
                              ) : (
                                t('userVisibilityAssignments.saveEntity')
                              )}
                            </Button>
                          ) : (
                            <span className="text-[11px] text-amber-700 dark:text-amber-300">
                              {t('common.forbidden', { defaultValue: 'Yetki yok' })}
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    {!isEntityDirty && !canAssignNew && !canReplaceExisting && !canRemoveExisting && (
                      <p className="mt-2 text-[11px] text-amber-700 dark:text-amber-300">
                        {t('common.forbidden', { defaultValue: 'Bu alanda degisiklik yetkin yok.' })}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

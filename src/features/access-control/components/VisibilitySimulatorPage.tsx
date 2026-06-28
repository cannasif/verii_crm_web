import { type ReactElement, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import {
  ChevronLeft,
  ChevronRight,
  CircleCheckBig,
  CircleOff,
  Eye,
  GitBranch,
  Loader2,
  ShieldCheck,
  Sparkles,
  UserRound,
} from 'lucide-react';
import { useUIStore } from '@/stores/ui-store';
import { cn } from '@/lib/utils';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { VoiceSearchCombobox } from '@/components/shared/VoiceSearchCombobox';
import { useUserOptionsInfinite } from '@/components/shared/dropdown/useDropdownEntityInfinite';
import { FieldHelpTooltip } from './FieldHelpTooltip';
import { VisibilityEntitySelect } from './VisibilityEntitySelect';
import { visibilityPolicyApi } from '../api/visibilityPolicyApi';
import { VISIBILITY_ENTITY_OPTIONS, getVisibilityScopeMeta } from '../utils/visibility-options';
import {
  getVisibilityScopeBadgeClassName,
  getVisibilityEntityAccentClasses,
  getVisibilityEntityIcon,
} from '../utils/visibility-entity-visuals';
import {
  ACCESS_CONTROL_HEADER_CARD_CLASSNAME,
  ACCESS_CONTROL_STAT_CARD_CLASSNAME,
  ACCESS_CONTROL_WORKSPACE_CLASSNAME,
} from '../utils/access-control-layout';
import type { VisibilityPreviewUser } from '../types/access-control.types';

const PANEL_CARD_CLASSNAME =
  'rounded-2xl border border-slate-200 bg-white/80 dark:border-white/10 dark:bg-[#180F22]';

const FILTER_INNER_CLASSNAME =
  'rounded-xl border border-slate-200 bg-white/90 p-4 dark:border-white/10 dark:bg-[#180F22]';

const VISIBLE_USERS_PAGE_SIZE = 20;

export function VisibilitySimulatorPage(): ReactElement {
  const { t } = useTranslation(['access-control', 'common']);
  const { setPageTitle } = useUIStore();
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [selectedEntityType, setSelectedEntityType] = useState<string>('Quotation');
  const [recordId, setRecordId] = useState<string>('');
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [visibleUsersPage, setVisibleUsersPage] = useState(1);
  const userDropdown = useUserOptionsInfinite(userSearchTerm, true);

  useEffect(() => {
    setPageTitle(t('visibilitySimulator.title'));
    return () => setPageTitle(null);
  }, [setPageTitle, t]);

  useEffect(() => {
    setVisibleUsersPage(1);
  }, [selectedUserId, selectedEntityType]);

  const previewQuery = useQuery({
    queryKey: ['visibility-preview', selectedUserId, selectedEntityType],
    enabled: selectedUserId != null && !!selectedEntityType,
    queryFn: () => visibilityPolicyApi.preview(selectedUserId!, selectedEntityType),
  });

  const parsedRecordId = useMemo(() => {
    const numeric = Number.parseInt(recordId, 10);
    return Number.isFinite(numeric) && numeric > 0 ? numeric : null;
  }, [recordId]);

  const simulationQuery = useQuery({
    queryKey: ['visibility-simulate', selectedUserId, selectedEntityType, parsedRecordId],
    enabled: selectedUserId != null && !!selectedEntityType && parsedRecordId != null,
    queryFn: () => visibilityPolicyApi.simulate(selectedUserId!, selectedEntityType, parsedRecordId!),
  });

  const selectedUserLabel = useMemo(() => {
    const option = userDropdown.options.find((item) => item.value === String(selectedUserId));
    return option?.label ?? (selectedUserId ? `#${selectedUserId}` : '-');
  }, [selectedUserId, userDropdown.options]);

  const selectedEntityMeta = useMemo(
    () => VISIBILITY_ENTITY_OPTIONS.find((item) => item.value === selectedEntityType),
    [selectedEntityType]
  );

  const selectedEntityLabel = t(selectedEntityMeta?.labelKey ?? 'visibilityPolicies.entity.quotation', {
    defaultValue: selectedEntityMeta?.fallback ?? selectedEntityType,
  });

  const visibleUsers = useMemo(
    () => previewQuery.data?.visibleUsers ?? [],
    [previewQuery.data?.visibleUsers]
  );
  const visibleUsersTotalPages = Math.max(1, Math.ceil(visibleUsers.length / VISIBLE_USERS_PAGE_SIZE));
  const safeVisibleUsersPage = Math.min(visibleUsersPage, visibleUsersTotalPages);

  const paginatedVisibleUsers = useMemo(() => {
    const start = (safeVisibleUsersPage - 1) * VISIBLE_USERS_PAGE_SIZE;
    return visibleUsers.slice(start, start + VISIBLE_USERS_PAGE_SIZE);
  }, [visibleUsers, safeVisibleUsersPage]);

  const visibleUsersFrom = visibleUsers.length === 0 ? 0 : (safeVisibleUsersPage - 1) * VISIBLE_USERS_PAGE_SIZE + 1;
  const visibleUsersTo = Math.min(safeVisibleUsersPage * VISIBLE_USERS_PAGE_SIZE, visibleUsers.length);

  const scopeLabel = useMemo(() => {
    if (!previewQuery.data?.hasExplicitPolicy || previewQuery.data.policies.length === 0) {
      return t('visibilitySimulator.noPolicy');
    }

    return previewQuery.data.policies
      .map((policy) => {
        const scopeMeta = getVisibilityScopeMeta(policy.scopeType);
        const scopeText = t(scopeMeta?.labelKey ?? 'visibilityPolicies.scope.self', {
          defaultValue: policy.name || t('visibilitySimulator.policyActive'),
        });

        return policy.includeSelf ? `${scopeText} + ${t('visibilitySimulator.includeSelf')}` : scopeText;
      })
      .join(', ');
  }, [previewQuery.data?.hasExplicitPolicy, previewQuery.data?.policies, t]);

  return (
    <div className="w-full space-y-5">
      <Breadcrumb items={[{ label: t('sidebar.accessControl') }, { label: t('sidebar.visibilitySimulator'), isActive: true }]} />

      <div className={ACCESS_CONTROL_HEADER_CARD_CLASSNAME}>
        <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-rose-500/5 blur-[80px] dark:bg-rose-500/10" />
        <div className="pointer-events-none absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-amber-500/5 blur-[80px] dark:bg-amber-500/10" />

        <div className="relative z-10">
          <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.28em] text-rose-600 dark:text-rose-400">
            <Sparkles className="size-3.5" />
            {t('sidebar.accessControl')}
          </div>
          <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-900 dark:text-white">
            {t('visibilitySimulator.title')}
          </h1>
          <p className="mt-2 max-w-3xl text-sm font-medium text-slate-500 dark:text-slate-400">
            {t('visibilitySimulator.description')}
          </p>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <SummaryStatCard
              icon={<UserRound className="size-4" />}
              iconWrapClassName="border-rose-100 bg-rose-100 text-rose-600 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-400"
              label={t('visibilitySimulator.selectedUser')}
              value={selectedUserLabel}
              compact
            />
            <SummaryStatCard
              icon={(() => {
                const EntityIcon = getVisibilityEntityIcon(selectedEntityType);
                const accent = getVisibilityEntityAccentClasses(selectedEntityType);
                return <EntityIcon className={cn('size-4', accent.icon)} />;
              })()}
              iconWrapClassName={cn('border', getVisibilityEntityAccentClasses(selectedEntityType).iconWrap)}
              label={t('visibilitySimulator.entity')}
              value={selectedEntityLabel}
              compact
            />
            <SummaryStatCard
              icon={<Eye className="size-4" />}
              iconWrapClassName="border-sky-100 bg-sky-100 text-sky-600 dark:border-sky-500/20 dark:bg-sky-500/10 dark:text-sky-400"
              label={t('visibilitySimulator.visibleUsers')}
              value={String(visibleUsers.length)}
              compact
            />
            <SummaryStatCard
              icon={<GitBranch className="size-4" />}
              iconWrapClassName="border-amber-100 bg-amber-100 text-amber-600 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-400"
              label={t('visibilitySimulator.approvalOverrides')}
              value={String(previewQuery.data?.approvalOverrideEntityIds.length ?? 0)}
              compact
            />
          </div>
        </div>
      </div>

      <div className={ACCESS_CONTROL_WORKSPACE_CLASSNAME}>
        <div className="grid gap-4 lg:grid-cols-3">
          <div className={FILTER_INNER_CLASSNAME}>
            <label className="mb-2 flex items-center gap-1 text-sm font-semibold text-slate-800 dark:text-slate-100">
              {t('visibilitySimulator.selectUser')}
              <FieldHelpTooltip text={t('visibilitySimulator.helpUser')} />
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
              placeholder={t('visibilitySimulator.selectUserPlaceholder')}
              searchPlaceholder={t('common.search')}
            />
          </div>

          <div className={FILTER_INNER_CLASSNAME}>
            <label className="mb-2 flex items-center gap-1 text-sm font-semibold text-slate-800 dark:text-slate-100">
              {t('visibilitySimulator.selectEntity')}
              <FieldHelpTooltip text={t('visibilitySimulator.helpEntity')} />
            </label>
            <VisibilityEntitySelect
              value={selectedEntityType}
              onValueChange={setSelectedEntityType}
              placeholder={t('visibilitySimulator.selectEntityPlaceholder')}
            />
          </div>

          <div className={FILTER_INNER_CLASSNAME}>
            <label className="mb-2 flex items-center gap-1 text-sm font-semibold text-slate-800 dark:text-slate-100">
              {t('visibilitySimulator.recordId')}
              <FieldHelpTooltip text={t('visibilitySimulator.helpRecordId')} />
            </label>
            <Input
              value={recordId}
              onChange={(event) => setRecordId(event.target.value.replace(/[^\d]/g, ''))}
              placeholder={t('visibilitySimulator.recordIdPlaceholder')}
              inputMode="numeric"
              className="h-10 rounded-xl border-slate-200/90 bg-slate-50/90 dark:border-white/10 dark:bg-white/[0.04]"
            />
          </div>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <Card className={PANEL_CARD_CLASSNAME}>
          <CardHeader className="px-5 pb-2 pt-5">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="rounded-lg border border-sky-100 bg-sky-100 p-2 text-sky-600 dark:border-sky-500/20 dark:bg-sky-500/10 dark:text-sky-400">
                  <Eye className="size-4" />
                </div>
                <CardTitle className="text-base font-black text-slate-900 dark:text-white">
                  {t('visibilitySimulator.visibleUsersTitle')}
                </CardTitle>
              </div>
              {visibleUsers.length > 0 && (
                <Badge variant="outline" className="rounded-full border-sky-200/80 bg-sky-50 px-2.5 py-0.5 text-[11px] font-bold text-sky-700 dark:border-sky-500/30 dark:bg-sky-500/15 dark:text-sky-300">
                  {visibleUsers.length}
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-3 px-5 pb-5">
            {previewQuery.isLoading ? (
              <div className="flex items-center justify-center gap-2 py-10 text-sm text-slate-500 dark:text-slate-400">
                <Loader2 className="size-4 animate-spin" />
                {t('common.loading')}
              </div>
            ) : previewQuery.data ? (
              <>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge
                    variant="outline"
                    className={cn(
                      'rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide',
                      previewQuery.data.hasExplicitPolicy
                        ? getVisibilityScopeBadgeClassName(previewQuery.data.policies[0]?.scopeType ?? null)
                        : getVisibilityScopeBadgeClassName(null, true)
                    )}
                  >
                    {previewQuery.data.hasExplicitPolicy ? t('visibilitySimulator.policyDefined') : t('visibilitySimulator.noPolicy')}
                  </Badge>
                  <Badge
                    variant="outline"
                    className={cn(
                      'rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide',
                      previewQuery.data.isUnrestricted
                        ? 'border-emerald-200/80 bg-emerald-50 text-emerald-700 dark:border-emerald-500/25 dark:bg-emerald-500/10 dark:text-emerald-300'
                        : getVisibilityScopeBadgeClassName(previewQuery.data.policies[0]?.scopeType ?? null)
                    )}
                  >
                    {previewQuery.data.isUnrestricted ? t('visibilitySimulator.companyWide') : scopeLabel}
                  </Badge>
                </div>

                {visibleUsers.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 py-10 text-center text-sm text-slate-500 dark:border-white/10 dark:bg-white/[0.02] dark:text-slate-400">
                    {t('visibilitySimulator.noVisibleUsers')}
                  </div>
                ) : (
                  <>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {paginatedVisibleUsers.map((user) => (
                        <VisibleUserCard key={user.userId} user={user} />
                      ))}
                    </div>

                    {visibleUsers.length > VISIBLE_USERS_PAGE_SIZE && (
                      <div className="flex items-center justify-between gap-3 border-t border-slate-200/80 pt-3 dark:border-white/10">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={safeVisibleUsersPage <= 1}
                          onClick={() => setVisibleUsersPage((page) => Math.max(1, page - 1))}
                          className="rounded-xl border-slate-200/90 dark:border-white/10"
                        >
                          <ChevronLeft className="mr-1 size-4" />
                          {t('common.previous')}
                        </Button>
                        <div className="text-center">
                          <p className="text-xs font-bold text-slate-700 dark:text-slate-200">
                            {t('visibilitySimulator.visibleUsersShowing', {
                              from: visibleUsersFrom,
                              to: visibleUsersTo,
                              total: visibleUsers.length,
                            })}
                          </p>
                          <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                            {t('visibilitySimulator.visibleUsersPage', {
                              page: safeVisibleUsersPage,
                              totalPages: visibleUsersTotalPages,
                            })}
                          </p>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={safeVisibleUsersPage >= visibleUsersTotalPages}
                          onClick={() => setVisibleUsersPage((page) => Math.min(visibleUsersTotalPages, page + 1))}
                          className="rounded-xl border-slate-200/90 dark:border-white/10"
                        >
                          {t('common.next')}
                          <ChevronRight className="ml-1 size-4" />
                        </Button>
                      </div>
                    )}
                  </>
                )}
              </>
            ) : (
              <div className="text-sm text-slate-500 dark:text-slate-400">{t('visibilitySimulator.awaitingSelection')}</div>
            )}
          </CardContent>
        </Card>

        <Card className={PANEL_CARD_CLASSNAME}>
          <CardHeader className="px-5 pb-2 pt-5">
            <div className="flex items-center gap-2.5">
              <div className="rounded-lg border border-amber-100 bg-amber-100 p-2 text-amber-600 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-400">
                <GitBranch className="size-4" />
              </div>
              <CardTitle className="text-base font-black text-slate-900 dark:text-white">{t('visibilitySimulator.auditTitle')}</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-2 px-5 pb-5">
            {!previewQuery.data ? (
              <div className="text-sm text-slate-500 dark:text-slate-400">{t('visibilitySimulator.awaitingSelection')}</div>
            ) : previewQuery.data.approvalOverrideAuditEntries.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 py-10 text-center text-sm text-slate-500 dark:border-white/10 dark:bg-white/[0.02] dark:text-slate-400">
                {t('visibilitySimulator.noAudit')}
              </div>
            ) : (
              previewQuery.data.approvalOverrideAuditEntries.map((entry) => (
                <div
                  key={entry.approvalActionId}
                  className="rounded-xl border border-amber-200/80 bg-amber-50/60 p-3.5 text-sm text-amber-900 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-100"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className="rounded-full border-amber-300/60 bg-amber-100/80 text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/15 dark:text-amber-100">
                      {t('visibilitySimulator.overrideRecord', { id: entry.entityId })}
                    </Badge>
                    <Badge variant="outline" className="rounded-full border-amber-300/60 bg-white/60 text-amber-800 dark:border-amber-500/30 dark:bg-white/5 dark:text-amber-200">
                      {t('visibilitySimulator.auditStepValue', { step: entry.stepOrder, currentStep: entry.currentStep })}
                    </Badge>
                  </div>
                  <div className="mt-2.5 grid gap-2 text-xs sm:grid-cols-2">
                    <AuditLine label={t('visibilitySimulator.auditActionId')} value={`#${entry.approvalActionId}`} />
                    <AuditLine label={t('visibilitySimulator.auditRequestId')} value={`#${entry.approvalRequestId}`} />
                    <AuditLine label={t('visibilitySimulator.auditFlow')} value={entry.flowDescription || '-'} />
                    <AuditLine label={t('visibilitySimulator.auditApprover')} value={entry.approvedByUserName || `#${entry.approvedByUserId}`} />
                  </div>
                  <div className="mt-2 rounded-lg bg-black/5 px-3 py-2 text-xs font-medium dark:bg-white/5">{entry.reason}</div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Card className={PANEL_CARD_CLASSNAME}>
        <CardHeader className="px-5 pb-2 pt-5">
          <div className="flex items-center gap-2">
            <div className="rounded-lg border border-violet-100 bg-violet-100 p-2 text-violet-600 dark:border-violet-500/20 dark:bg-violet-500/10 dark:text-violet-400">
              <ShieldCheck className="size-4" />
            </div>
            <CardTitle className="text-base font-black text-slate-900 dark:text-white">
              {t('visibilitySimulator.actionPanelTitle')}
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="px-5 pb-5">
          {parsedRecordId == null ? (
            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 py-8 text-center text-sm text-slate-500 dark:border-white/10 dark:bg-white/[0.02] dark:text-slate-400">
              {t('visibilitySimulator.noRecordSimulation')}
            </div>
          ) : simulationQuery.isLoading ? (
            <div className="flex items-center justify-center gap-2 py-8 text-sm text-slate-500 dark:text-slate-400">
              <Loader2 className="size-4 animate-spin" />
              {t('common.loading')}
            </div>
          ) : simulationQuery.data ? (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {simulationQuery.data.actions.map((action) => (
                <div
                  key={action.action}
                  className="rounded-xl border border-slate-200/80 bg-slate-50/80 p-3.5 dark:border-white/10 dark:bg-white/[0.03]"
                >
                  <div className="flex items-center gap-2.5">
                    <div
                      className={cn(
                        'rounded-lg border p-2',
                        action.allowed
                          ? 'border-emerald-200 bg-emerald-50 text-emerald-600 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300'
                          : 'border-rose-200 bg-rose-50 text-rose-600 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300'
                      )}
                    >
                      {action.allowed ? <CircleCheckBig className="size-4" /> : <CircleOff className="size-4" />}
                    </div>
                    <div>
                      <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                        {t(`visibilitySimulator.action.${action.action}`)}
                      </div>
                      <div className="mt-0.5 text-sm font-bold text-slate-900 dark:text-white">
                        {action.allowed ? t('visibilitySimulator.actionAllowed') : t('visibilitySimulator.actionDenied')}
                      </div>
                    </div>
                  </div>
                  <div className="mt-2.5 text-xs leading-5 text-slate-600 dark:text-slate-300">{action.reason}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-slate-500 dark:text-slate-400">{t('visibilitySimulator.awaitingSelection')}</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function VisibleUserCard({ user }: { user: VisibilityPreviewUser }): ReactElement {
  const displayName = user.fullName?.trim() || `#${user.userId}`;
  const initials = displayName
    .replace(/^#/, '')
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');

  return (
    <div className="flex items-start gap-3 rounded-xl border border-slate-200/80 bg-slate-50/80 px-3.5 py-3 transition-colors hover:border-sky-200/80 hover:bg-sky-50/40 dark:border-white/10 dark:bg-white/[0.03] dark:hover:border-sky-500/25 dark:hover:bg-sky-500/5">
      <div className="flex size-9 shrink-0 items-center justify-center rounded-full border border-sky-200/80 bg-sky-50 text-xs font-black text-sky-700 dark:border-sky-500/25 dark:bg-sky-500/10 dark:text-sky-300">
        {initials || <UserRound className="size-4" />}
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-bold text-slate-900 dark:text-white">{displayName}</div>
        <div className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">{user.email || '-'}</div>
        <div className="mt-1.5 text-[10px] font-mono text-slate-400">#{user.userId}</div>
      </div>
    </div>
  );
}

type SummaryStatCardProps = {
  icon: ReactElement;
  iconWrapClassName: string;
  label: string;
  value: string;
  compact?: boolean;
};

function SummaryStatCard({ icon, iconWrapClassName, label, value, compact = false }: SummaryStatCardProps): ReactElement {
  return (
    <div className={ACCESS_CONTROL_STAT_CARD_CLASSNAME}>
      <div className="flex items-center gap-3">
        <div className={cn('shrink-0 rounded-xl border p-2.5', iconWrapClassName)}>{icon}</div>
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">{label}</p>
          <p
            className={cn(
              'mt-0.5 font-black text-slate-900 dark:text-white',
              compact ? 'truncate text-sm' : 'text-2xl leading-none'
            )}
          >
            {value}
          </p>
        </div>
      </div>
    </div>
  );
}

function AuditLine({ label, value }: { label: string; value: string }): ReactElement {
  return (
    <div>
      <div className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">{label}</div>
      <div className="mt-0.5 text-xs font-semibold text-slate-800 dark:text-slate-100">{value}</div>
    </div>
  );
}

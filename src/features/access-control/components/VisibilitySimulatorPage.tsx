import { type ReactElement, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { ShieldCheck, UserRound, Eye, GitBranch, CircleCheckBig, CircleOff } from 'lucide-react';
import { useUIStore } from '@/stores/ui-store';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { VoiceSearchCombobox } from '@/components/shared/VoiceSearchCombobox';
import { useUserOptionsInfinite } from '@/components/shared/dropdown/useDropdownEntityInfinite';
import { FieldHelpTooltip } from './FieldHelpTooltip';
import { visibilityPolicyApi } from '../api/visibilityPolicyApi';
import { VISIBILITY_ENTITY_OPTIONS, getVisibilityScopeMeta } from '../utils/visibility-options';

export function VisibilitySimulatorPage(): ReactElement {
  const { t } = useTranslation(['access-control', 'common']);
  const { setPageTitle } = useUIStore();
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [selectedEntityType, setSelectedEntityType] = useState<string>('Quotation');
  const [recordId, setRecordId] = useState<string>('');
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const userDropdown = useUserOptionsInfinite(userSearchTerm, true);

  useEffect(() => {
    setPageTitle(t('visibilitySimulator.title'));
    return () => setPageTitle(null);
  }, [setPageTitle, t]);

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
    <div className="w-full space-y-6">
      <Breadcrumb items={[{ label: t('sidebar.accessControl') }, { label: t('sidebar.visibilitySimulator'), isActive: true }]} />

      <div className="rounded-[2rem] border border-slate-200 bg-white/80 p-6 shadow-xl dark:border-white/10 dark:bg-[#180F22]">
        <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">{t('visibilitySimulator.title')}</h1>
        <p className="mt-2 text-sm font-medium text-slate-500 dark:text-slate-400">{t('visibilitySimulator.description')}</p>
      </div>

      <Card className="rounded-[2rem] border border-slate-200 bg-slate-50/80 p-0 dark:border-white/10 dark:bg-[#1E1627]">
        <CardContent className="grid gap-5 p-6 lg:grid-cols-3">
          <div className="space-y-3">
            <label className="text-sm font-medium flex items-center gap-1">
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

          <div className="space-y-3">
            <label className="text-sm font-medium flex items-center gap-1">
              {t('visibilitySimulator.selectEntity')}
              <FieldHelpTooltip text={t('visibilitySimulator.helpEntity')} />
            </label>
            <Select value={selectedEntityType} onValueChange={setSelectedEntityType}>
              <SelectTrigger>
                <SelectValue placeholder={t('visibilitySimulator.selectEntityPlaceholder')} />
              </SelectTrigger>
              <SelectContent>
                {VISIBILITY_ENTITY_OPTIONS.map((entity) => (
                  <SelectItem key={entity.value} value={entity.value}>
                    {t(entity.labelKey, { defaultValue: entity.fallback })}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3">
            <label className="text-sm font-medium flex items-center gap-1">
              {t('visibilitySimulator.recordId')}
              <FieldHelpTooltip text={t('visibilitySimulator.helpRecordId')} />
            </label>
            <Input
              value={recordId}
              onChange={(event) => setRecordId(event.target.value.replace(/[^\d]/g, ''))}
              placeholder={t('visibilitySimulator.recordIdPlaceholder')}
              inputMode="numeric"
            />
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-4">
        <SummaryCard icon={<UserRound className="size-4" />} label={t('visibilitySimulator.selectedUser')} value={selectedUserLabel} />
        <SummaryCard icon={<ShieldCheck className="size-4" />} label={t('visibilitySimulator.entity')} value={t(selectedEntityMeta?.labelKey ?? 'visibilityPolicies.entity.quotation', { defaultValue: selectedEntityMeta?.fallback ?? selectedEntityType })} />
        <SummaryCard icon={<Eye className="size-4" />} label={t('visibilitySimulator.visibleUsers')} value={String(previewQuery.data?.visibleUsers.length ?? 0)} />
        <SummaryCard icon={<GitBranch className="size-4" />} label={t('visibilitySimulator.approvalOverrides')} value={String(previewQuery.data?.approvalOverrideEntityIds.length ?? 0)} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <Card className="rounded-[2rem] border border-slate-200 dark:border-white/10 dark:bg-[#180F22]">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-black text-slate-900 dark:text-white">{t('visibilitySimulator.visibleUsersTitle')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {previewQuery.isLoading ? (
              <div className="text-sm text-slate-500 dark:text-slate-400">{t('common.loading')}</div>
            ) : previewQuery.data ? (
              <>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={previewQuery.data.hasExplicitPolicy ? 'secondary' : 'outline'}>
                    {previewQuery.data.hasExplicitPolicy ? t('visibilitySimulator.policyDefined') : t('visibilitySimulator.noPolicy')}
                  </Badge>
                  <Badge variant={previewQuery.data.isUnrestricted ? 'default' : 'outline'}>
                    {previewQuery.data.isUnrestricted ? t('visibilitySimulator.companyWide') : scopeLabel}
                  </Badge>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  {previewQuery.data.visibleUsers.map((user) => (
                    <div key={user.userId} className="rounded-2xl border border-slate-200 bg-white/80 p-4 dark:border-white/10 dark:bg-[#1E1627]">
                      <div className="font-black text-slate-900 dark:text-white">{user.fullName || `#${user.userId}`}</div>
                      <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">{user.email || '-'}</div>
                      <div className="mt-2 text-[11px] font-mono text-slate-400">#{user.userId}</div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="text-sm text-slate-500 dark:text-slate-400">{t('visibilitySimulator.awaitingSelection')}</div>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-[2rem] border border-slate-200 dark:border-white/10 dark:bg-[#180F22]">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-black text-slate-900 dark:text-white">{t('visibilitySimulator.auditTitle')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!previewQuery.data ? (
              <div className="text-sm text-slate-500 dark:text-slate-400">{t('visibilitySimulator.awaitingSelection')}</div>
            ) : previewQuery.data.approvalOverrideAuditEntries.length === 0 ? (
              <div className="text-sm text-slate-500 dark:text-slate-400">{t('visibilitySimulator.noAudit')}</div>
            ) : (
              <div className="space-y-2">
                {previewQuery.data.approvalOverrideAuditEntries.map((entry) => (
                  <div
                    key={entry.approvalActionId}
                    className="rounded-2xl border border-amber-200 bg-amber-50/80 p-4 text-sm text-amber-900 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-100"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="secondary">{t('visibilitySimulator.overrideRecord', { id: entry.entityId })}</Badge>
                      <Badge variant="outline">{t('visibilitySimulator.auditStepValue', { step: entry.stepOrder, currentStep: entry.currentStep })}</Badge>
                    </div>
                    <div className="mt-3 grid gap-2 text-xs sm:grid-cols-2">
                      <AuditLine label={t('visibilitySimulator.auditActionId')} value={`#${entry.approvalActionId}`} />
                      <AuditLine label={t('visibilitySimulator.auditRequestId')} value={`#${entry.approvalRequestId}`} />
                      <AuditLine label={t('visibilitySimulator.auditFlow')} value={entry.flowDescription || '-'} />
                      <AuditLine label={t('visibilitySimulator.auditApprover')} value={entry.approvedByUserName || `#${entry.approvedByUserId}`} />
                    </div>
                    <div className="mt-3 rounded-xl bg-black/5 px-3 py-2 text-xs font-medium dark:bg-white/5">{entry.reason}</div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-[2rem] border border-slate-200 dark:border-white/10 dark:bg-[#180F22]">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-black text-slate-900 dark:text-white">{t('visibilitySimulator.actionPanelTitle')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {parsedRecordId == null ? (
            <div className="text-sm text-slate-500 dark:text-slate-400">{t('visibilitySimulator.noRecordSimulation')}</div>
          ) : simulationQuery.isLoading ? (
            <div className="text-sm text-slate-500 dark:text-slate-400">{t('common.loading')}</div>
          ) : simulationQuery.data ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {simulationQuery.data.actions.map((action) => (
                <div
                  key={action.action}
                  className="rounded-2xl border border-slate-200 bg-white/80 p-4 dark:border-white/10 dark:bg-[#1E1627]"
                >
                  <div className="flex items-center gap-2">
                    <div
                      className={`rounded-xl border p-2 ${
                        action.allowed
                          ? 'border-emerald-200 bg-emerald-50 text-emerald-600 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300'
                          : 'border-rose-200 bg-rose-50 text-rose-600 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300'
                      }`}
                    >
                      {action.allowed ? <CircleCheckBig className="size-4" /> : <CircleOff className="size-4" />}
                    </div>
                    <div>
                      <div className="text-xs font-black uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">
                        {t(`visibilitySimulator.action.${action.action}`)}
                      </div>
                      <div className="mt-1 text-sm font-black text-slate-900 dark:text-white">
                        {action.allowed ? t('visibilitySimulator.actionAllowed') : t('visibilitySimulator.actionDenied')}
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">{action.reason}</div>
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

function SummaryCard({ icon, label, value }: { icon: ReactElement; label: string; value: string }): ReactElement {
  return (
    <Card className="rounded-2xl border border-slate-200 dark:border-white/10 dark:bg-[#1E1627]">
      <CardContent className="flex items-center gap-4 p-5">
        <div className="rounded-xl bg-pink-100 p-3 text-pink-600 dark:bg-pink-500/10 dark:text-pink-400 border border-pink-100 dark:border-pink-500/20">
          {icon}
        </div>
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">{label}</p>
          <p className="mt-1 text-sm font-black text-slate-900 dark:text-white">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function AuditLine({ label, value }: { label: string; value: string }): ReactElement {
  return (
    <div>
      <div className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">{label}</div>
      <div className="mt-1 font-semibold text-slate-800 dark:text-slate-100">{value}</div>
    </div>
  );
}

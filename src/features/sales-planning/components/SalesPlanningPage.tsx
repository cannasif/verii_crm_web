import { useEffect, useMemo, useState, type ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import {
  CheckCircle2,
  Eye,
  FileClock,
  ListChecks,
  Loader2,
  LockKeyhole,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Send,
  Target,
  Trash2,
  Users,
} from 'lucide-react';
import { ManagementListPageHeader } from '@/components/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useUIStore } from '@/stores/ui-store';
import { useMyPermissionsQuery } from '@/features/access-control/hooks/useMyPermissionsQuery';
import { hasPermission } from '@/features/access-control/utils/hasPermission';
import { useCurrencyOptions } from '@/services/hooks/useCurrencyOptions';
import {
  useDeleteSalesPlanMutation,
  useSalesPlansQuery,
  useTransitionSalesPlanMutation,
} from '../hooks/useSalesPlanning';
import { SalesPlanStatus, type SalesPlanSummaryDto } from '../types/sales-planning.types';
import { getStatusKey, SALES_PLAN_STATUSES } from '../utils/sales-planning-options';
import { SalesPlanDialog } from './SalesPlanDialog';
import { SalesPlanStatusBadge } from './SalesPlanStatusBadge';
import { SalesPlanningWorkspaceNav } from './SalesPlanningWorkspaceNav';

type ConfirmAction = 'submit' | 'approve' | 'lock' | 'delete';

interface PendingAction {
  action: ConfirmAction;
  plan: SalesPlanSummaryDto;
}

export function SalesPlanningPage(): ReactElement {
  const { t, i18n } = useTranslation('sales-planning');
  const setPageTitle = useUIStore((state) => state.setPageTitle);
  const { data: permissions } = useMyPermissionsQuery();
  const canManagePermission = hasPermission(permissions, 'sales-planning.manage');
  const canSubmitPermission = canManagePermission || hasPermission(permissions, 'sales-planning.submit');
  const canApprovePermission = hasPermission(permissions, 'sales-planning.approve');
  const { currencyOptions } = useCurrencyOptions();

  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState<number | undefined>(currentYear);
  const [status, setStatus] = useState<SalesPlanStatus | undefined>();
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState<number | null>(null);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [transitionReason, setTransitionReason] = useState('');

  const plansQuery = useSalesPlansQuery(year, status);
  const deleteMutation = useDeleteSalesPlanMutation();
  const transitionMutation = useTransitionSalesPlanMutation();
  const actionPending = deleteMutation.isPending || transitionMutation.isPending;

  useEffect(() => {
    setPageTitle(t('title'));
    return () => setPageTitle(null);
  }, [setPageTitle, t]);

  const plans = useMemo(() => {
    const normalizedSearch = search.trim().toLocaleLowerCase(i18n.language);
    if (!normalizedSearch) return plansQuery.data ?? [];
    return (plansQuery.data ?? []).filter((plan) =>
      [plan.name, plan.currency, plan.description ?? '']
        .join(' ')
        .toLocaleLowerCase(i18n.language)
        .includes(normalizedSearch),
    );
  }, [i18n.language, plansQuery.data, search]);

  const currencyLabels = useMemo(
    () => new Map(currencyOptions.map((option) => [String(option.dovizTipi), option.code])),
    [currencyOptions],
  );

  const stats = useMemo(() => ({
    plans: plans.length,
    targets: plans.reduce((sum, plan) => sum + plan.targetCount, 0),
    salespeople: plans.reduce((sum, plan) => sum + plan.salespersonCount, 0),
    awaitingApproval: plans.filter((plan) => plan.status === SalesPlanStatus.Submitted).length,
  }), [plans]);

  const openCreate = (): void => {
    setSelectedPlanId(null);
    setDialogOpen(true);
  };

  const openPlan = (planId: number): void => {
    setSelectedPlanId(planId);
    setDialogOpen(true);
  };

  const requestAction = (action: ConfirmAction, plan: SalesPlanSummaryDto): void => {
    setTransitionReason('');
    setPendingAction({ action, plan });
  };

  const confirmAction = async (): Promise<void> => {
    if (!pendingAction) return;
    const { action, plan } = pendingAction;
    try {
      if (action === 'delete') {
        await deleteMutation.mutateAsync({ id: plan.id, rowVersion: plan.rowVersion });
      } else {
        await transitionMutation.mutateAsync({
          id: plan.id,
          action,
          payload: { rowVersion: plan.rowVersion, reason: transitionReason.trim() || null },
        });
      }
      setPendingAction(null);
      setTransitionReason('');
    } catch {
      // Mutation hooks keep the dialog open and show the localized API error.
    }
  };

  const years = Array.from({ length: 7 }, (_, index) => currentYear - 2 + index);
  const dateFormatter = new Intl.DateTimeFormat(i18n.language, { dateStyle: 'medium' });

  return (
    <div className="space-y-5">
      <ManagementListPageHeader
        title={t('title')}
        description={t('description')}
        backLabel={t('actions.back')}
        actions={canManagePermission ? (
          <Button onClick={openCreate} className="h-10">
            <Plus className="size-4" />
            {t('actions.newPlan')}
          </Button>
        ) : null}
      />

      <SalesPlanningWorkspaceNav />

      <div className="grid overflow-hidden rounded-lg border bg-background sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: t('stats.plans'), value: stats.plans, icon: Target },
          { label: t('stats.targets'), value: stats.targets, icon: ListChecks },
          { label: t('stats.salespeople'), value: stats.salespeople, icon: Users },
          { label: t('stats.awaitingApproval'), value: stats.awaitingApproval, icon: FileClock },
        ].map((item) => (
          <div key={item.label} className="flex min-h-20 items-center gap-3 border-b p-4 last:border-b-0 sm:[&:nth-child(odd)]:border-r sm:[&:nth-last-child(-n+2)]:border-b-0 lg:border-b-0 lg:border-r lg:last:border-r-0">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <item.icon className="size-4" />
            </div>
            <div className="min-w-0">
              <p className="text-xl font-bold tabular-nums">{item.value}</p>
              <p className="truncate text-xs text-muted-foreground">{item.label}</p>
            </div>
          </div>
        ))}
      </div>

      <section className="space-y-3">
        <div className="flex flex-col gap-3 rounded-lg border bg-background p-3 lg:flex-row lg:items-center">
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t('filters.search')} className="pl-9" />
          </div>
          <Select value={year == null ? 'all' : String(year)} onValueChange={(value) => setYear(value === 'all' ? undefined : Number(value))}>
            <SelectTrigger className="w-full lg:w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('filters.allYears')}</SelectItem>
              {years.map((item) => <SelectItem key={item} value={String(item)}>{item}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={status == null ? 'all' : String(status)} onValueChange={(value) => setStatus(value === 'all' ? undefined : Number(value) as SalesPlanStatus)}>
            <SelectTrigger className="w-full lg:w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('filters.allStatuses')}</SelectItem>
              {SALES_PLAN_STATUSES.map((item) => <SelectItem key={item} value={String(item)}>{t(`status.${getStatusKey(item)}`)}</SelectItem>)}
            </SelectContent>
          </Select>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="icon" className="size-9 shrink-0" onClick={() => void plansQuery.refetch()} disabled={plansQuery.isFetching} aria-label={t('actions.refresh')}>
                <RefreshCw className={`size-4 ${plansQuery.isFetching ? 'animate-spin' : ''}`} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t('actions.refresh')}</TooltipContent>
          </Tooltip>
        </div>

        <div className="overflow-hidden rounded-lg border bg-background">
          {plansQuery.isLoading ? (
            <div className="space-y-3 p-4">{Array.from({ length: 5 }, (_, index) => <Skeleton key={index} className="h-12 w-full" />)}</div>
          ) : plansQuery.isError ? (
            <div className="flex min-h-56 flex-col items-center justify-center gap-3 p-6 text-center">
              <p className="text-sm text-destructive">{t('errors.list')}</p>
              <Button variant="outline" onClick={() => void plansQuery.refetch()}>{t('actions.retry')}</Button>
            </div>
          ) : plans.length === 0 ? (
            <div className="flex min-h-56 flex-col items-center justify-center gap-2 p-6 text-center">
              <Target className="size-8 text-muted-foreground" />
              <p className="font-medium">{t('empty.title')}</p>
              <p className="max-w-md text-sm text-muted-foreground">{t('empty.description')}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('table.plan')}</TableHead>
                    <TableHead>{t('table.period')}</TableHead>
                    <TableHead>{t('table.status')}</TableHead>
                    <TableHead className="text-right">{t('table.salespeople')}</TableHead>
                    <TableHead className="text-right">{t('table.targets')}</TableHead>
                    <TableHead>{t('table.updated')}</TableHead>
                    <TableHead className="min-w-[320px] text-right">{t('table.actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {plans.map((plan) => (
                    <TableRow key={plan.id}>
                      <TableCell>
                        <button type="button" className="max-w-[360px] text-left" onClick={() => openPlan(plan.id)}>
                          <span className="block truncate font-semibold text-foreground hover:text-primary">{plan.name}</span>
                          <span className="block truncate text-xs text-muted-foreground">{plan.description || t('table.noDescription')}</span>
                        </button>
                      </TableCell>
                      <TableCell><span className="font-medium tabular-nums">{plan.planYear}</span><span className="ml-2 text-xs text-muted-foreground">{currencyLabels.get(plan.currency) ?? plan.currency} · v{plan.version}</span></TableCell>
                      <TableCell><SalesPlanStatusBadge status={plan.status} /></TableCell>
                      <TableCell className="text-right tabular-nums">{plan.salespersonCount}</TableCell>
                      <TableCell className="text-right tabular-nums">{plan.targetCount}</TableCell>
                      <TableCell className="whitespace-nowrap text-sm text-muted-foreground">{dateFormatter.format(new Date(plan.updatedDate ?? plan.createdDate))}</TableCell>
                      <TableCell>
                        <div className="flex h-9 items-center justify-end gap-1">
                          <ActionButton label={plan.canEdit && canManagePermission ? t('actions.edit') : t('actions.view')} icon={plan.canEdit && canManagePermission ? Pencil : Eye} onClick={() => openPlan(plan.id)} />
                          {plan.canSubmit && canSubmitPermission ? <ActionButton label={t('actions.submit')} icon={Send} onClick={() => requestAction('submit', plan)} /> : null}
                          {plan.canApprove && canApprovePermission ? <ActionButton label={t('actions.approve')} icon={CheckCircle2} onClick={() => requestAction('approve', plan)} /> : null}
                          {plan.canLock && canApprovePermission ? <ActionButton label={t('actions.lock')} icon={LockKeyhole} onClick={() => requestAction('lock', plan)} /> : null}
                          {plan.canDelete && canManagePermission ? <ActionButton label={t('actions.delete')} icon={Trash2} destructive onClick={() => requestAction('delete', plan)} /> : null}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </section>

      <SalesPlanDialog open={dialogOpen} onOpenChange={setDialogOpen} planId={selectedPlanId} canManagePermission={canManagePermission} />

      <AlertDialog open={pendingAction != null} onOpenChange={(open) => !open && !actionPending && setPendingAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{pendingAction ? t(`confirm.${pendingAction.action}.title`) : ''}</AlertDialogTitle>
            <AlertDialogDescription>{pendingAction ? t(`confirm.${pendingAction.action}.description`, { name: pendingAction.plan.name }) : ''}</AlertDialogDescription>
          </AlertDialogHeader>
          {pendingAction?.action !== 'delete' ? (
            <div className="space-y-1.5">
              <label htmlFor="sales-plan-transition-reason" className="text-sm font-medium">{t('confirm.reason')}</label>
              <Textarea id="sales-plan-transition-reason" value={transitionReason} onChange={(event) => setTransitionReason(event.target.value)} maxLength={1000} rows={3} placeholder={t('confirm.reasonPlaceholder')} />
            </div>
          ) : null}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionPending}>{t('actions.cancel')}</AlertDialogCancel>
            <AlertDialogAction disabled={actionPending} onClick={(event) => { event.preventDefault(); void confirmAction(); }} className={pendingAction?.action === 'delete' ? 'bg-destructive text-white hover:bg-destructive/90' : undefined}>
              {actionPending ? <Loader2 className="size-4 animate-spin" /> : null}
              {pendingAction ? t(`confirm.${pendingAction.action}.confirm`) : t('actions.continue')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function ActionButton({
  label,
  icon: Icon,
  onClick,
  destructive = false,
}: {
  label: string;
  icon: typeof Eye;
  onClick: () => void;
  destructive?: boolean;
}): ReactElement {
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className={`h-8 gap-1.5 px-2.5 ${destructive ? 'text-destructive hover:text-destructive' : ''}`}
      onClick={onClick}
    >
      <Icon className="size-4" />
      {label}
    </Button>
  );
}

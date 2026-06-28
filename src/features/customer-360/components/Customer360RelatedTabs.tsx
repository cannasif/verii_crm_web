import { type ReactElement, type ReactNode, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight, FileText, Plus, ShoppingCart, Activity, ChevronRight as RowChevron } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { useQuotationList } from '@/features/quotation/hooks/useQuotationList';
import { useOrderList } from '@/features/order/hooks/useOrderList';
import { useCustomerActivities } from '../hooks/useCustomerActivities';
import { buildCustomerDocumentFilters } from '../utils/customer-document-filters';

const PAGE_SIZE = 20;

interface CustomerRelatedTabProps {
  customerId: number;
  customerCode?: string | null;
  customerName?: string | null;
}

function formatAmount(language: string, amount?: number | null, display?: string | null, currency?: string | null): string {
  if (display && display.trim()) return display;
  if (amount == null) return '-';
  const formatted = new Intl.NumberFormat(language, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);
  return currency ? `${formatted} ${currency}` : formatted;
}

function formatDate(language: string, value?: string | null): string {
  if (!value) return '-';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '-' : date.toLocaleDateString(language);
}

function RelatedCard({
  icon: Icon,
  title,
  count,
  createLabel,
  onCreate,
  children,
}: {
  icon: React.ElementType;
  title: string;
  count?: number;
  createLabel: string;
  onCreate: () => void;
  children: ReactNode;
}): ReactElement {
  return (
    <Card className="group relative overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm transition-all duration-300 before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-linear-to-r before:from-transparent before:via-rose-500/40 before:to-transparent before:opacity-60 before:transition-opacity hover:border-rose-500/30 hover:shadow-[0_12px_34px_-16px_rgba(236,72,153,0.4)] hover:before:opacity-100">
      <CardContent className="p-4 sm:p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 text-sm font-semibold">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-linear-to-br from-rose-500/15 to-amber-500/10 text-rose-500 ring-1 ring-inset ring-rose-500/15 transition-all group-hover:from-rose-500/25 group-hover:to-amber-500/15 group-hover:ring-rose-500/30">
              <Icon className="h-4 w-4" />
            </span>
            {title}
            {count != null && (
              <Badge variant="secondary" className="rounded-full">
                {count}
              </Badge>
            )}
          </div>
          <Button
            type="button"
            size="sm"
            onClick={onCreate}
            className="gap-1.5 rounded-xl border-0 bg-[image:var(--crm-brand-gradient)] shadow-[0_4px_14px_-6px_var(--crm-brand-shadow)] hover:shadow-[0_6px_20px_-6px_var(--crm-brand-shadow)] text-white transition-all hover:-translate-y-0.5 hover:text-white"
          >
            <Plus className="h-4 w-4" />
            {createLabel}
          </Button>
        </div>
        {children}
      </CardContent>
    </Card>
  );
}

function ListStates({
  isLoading,
  isError,
  isEmpty,
  errorLabel,
  emptyLabel,
}: {
  isLoading: boolean;
  isError: boolean;
  isEmpty: boolean;
  errorLabel: string;
  emptyLabel: string;
}): ReactElement | null {
  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, idx) => (
          <Skeleton key={idx} className="h-11 w-full rounded-lg" />
        ))}
      </div>
    );
  }
  if (isError) {
    return (
      <div className="rounded-lg border border-dashed border-border py-10 text-center text-sm text-muted-foreground">
        {errorLabel}
      </div>
    );
  }
  if (isEmpty) {
    return (
      <div className="rounded-lg border border-dashed border-border py-10 text-center text-sm text-muted-foreground">
        {emptyLabel}
      </div>
    );
  }
  return null;
}

function Pager({
  pageNumber,
  totalPages,
  onPrev,
  onNext,
}: {
  pageNumber: number;
  totalPages: number;
  onPrev: () => void;
  onNext: () => void;
}): ReactElement | null {
  if (totalPages <= 1) return null;
  return (
    <div className="mt-3 flex items-center justify-end gap-2">
      <Button variant="outline" size="icon" className="h-8 w-8 rounded-lg" onClick={onPrev} disabled={pageNumber <= 1}>
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <span className="text-xs text-muted-foreground">
        {pageNumber} / {totalPages}
      </span>
      <Button
        variant="outline"
        size="icon"
        className="h-8 w-8 rounded-lg"
        onClick={onNext}
        disabled={pageNumber >= totalPages}
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}

const headCellClass = 'h-9 px-3 text-xs font-medium text-muted-foreground';
const rowClass =
  'cursor-pointer border-b border-border/60 transition-colors last:border-0 hover:bg-muted/50';
const cellClass = 'px-3 py-2.5';

export function CustomerQuotationsTab({ customerId, customerCode, customerName }: CustomerRelatedTabProps): ReactElement {
  const { t, i18n } = useTranslation(['customer360', 'common']);
  const tc = (key: string, opts?: Record<string, unknown>) => t(key, { ns: 'customer360', ...opts });
  const navigate = useNavigate();
  const [pageNumber, setPageNumber] = useState(1);
  const filters = useMemo(() => buildCustomerDocumentFilters(customerCode, customerName), [customerCode, customerName]);
  const { data, isLoading, isError } = useQuotationList({
    pageNumber,
    pageSize: PAGE_SIZE,
    sortBy: 'Id',
    sortDirection: 'desc',
    filters,
  });
  const rows = data?.data ?? [];
  const totalPages = data?.totalPages ?? 1;

  return (
    <RelatedCard
      icon={FileText}
      title={tc('tabs.quotations')}
      count={data?.totalCount}
      createLabel={tc('related.newQuotation')}
      onCreate={() =>
        navigate('/quotations/create', {
          state: {
            prefillCustomer: { potentialCustomerId: customerId, erpCustomerCode: customerCode ?? null, customerName: customerName ?? null },
            returnTo: `/customer-360/${customerId}`,
          },
        })
      }
    >
      <ListStates
        isLoading={isLoading}
        isError={isError}
        isEmpty={rows.length === 0}
        errorLabel={tc('related.error')}
        emptyLabel={tc('related.emptyQuotations')}
      />
      {!isLoading && !isError && rows.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-border/70">
          <Table className="min-w-[640px] text-[13px]">
            <TableHeader>
              <TableRow className="border-border/60 hover:bg-transparent">
                <TableHead className={headCellClass}>{tc('related.columns.offerNo')}</TableHead>
                <TableHead className={headCellClass}>{tc('related.columns.date')}</TableHead>
                <TableHead className={headCellClass}>{tc('related.columns.representative')}</TableHead>
                <TableHead className={cn(headCellClass, 'text-right')}>{tc('related.columns.total')}</TableHead>
                <TableHead className={cn(headCellClass, 'w-8')} />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id} className={rowClass} onClick={() => navigate(`/quotations/${row.id}`)}>
                  <TableCell className={cn(cellClass, 'font-medium')}>{row.offerNo || `#${row.id}`}</TableCell>
                  <TableCell className={cn(cellClass, 'text-muted-foreground')}>{formatDate(i18n.language, row.offerDate)}</TableCell>
                  <TableCell className={cn(cellClass, 'text-muted-foreground')}>{row.representativeName || '-'}</TableCell>
                  <TableCell className={cn(cellClass, 'text-right font-semibold tabular-nums')}>
                    {formatAmount(i18n.language, row.grandTotal, row.grandTotalDisplay, row.currencyCode ?? row.currency)}
                  </TableCell>
                  <TableCell className={cn(cellClass, 'text-right')}>
                    <RowChevron className="h-4 w-4 text-muted-foreground/50" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      <Pager
        pageNumber={pageNumber}
        totalPages={totalPages}
        onPrev={() => setPageNumber((p) => Math.max(1, p - 1))}
        onNext={() => setPageNumber((p) => Math.min(totalPages, p + 1))}
      />
    </RelatedCard>
  );
}

export function CustomerOrdersTab({ customerId, customerCode, customerName }: CustomerRelatedTabProps): ReactElement {
  const { t, i18n } = useTranslation(['customer360', 'common']);
  const tc = (key: string, opts?: Record<string, unknown>) => t(key, { ns: 'customer360', ...opts });
  const navigate = useNavigate();
  const [pageNumber, setPageNumber] = useState(1);
  const filters = useMemo(() => buildCustomerDocumentFilters(customerCode, customerName), [customerCode, customerName]);
  const { data, isLoading, isError } = useOrderList({
    pageNumber,
    pageSize: PAGE_SIZE,
    sortBy: 'Id',
    sortDirection: 'desc',
    filters,
  });
  const rows = data?.data ?? [];
  const totalPages = data?.totalPages ?? 1;

  return (
    <RelatedCard
      icon={ShoppingCart}
      title={tc('tabs.orders')}
      count={data?.totalCount}
      createLabel={tc('related.newOrder')}
      onCreate={() =>
        navigate('/orders/create', {
          state: {
            prefillCustomer: { potentialCustomerId: customerId, erpCustomerCode: customerCode ?? null, customerName: customerName ?? null },
            returnTo: `/customer-360/${customerId}`,
          },
        })
      }
    >
      <ListStates
        isLoading={isLoading}
        isError={isError}
        isEmpty={rows.length === 0}
        errorLabel={tc('related.error')}
        emptyLabel={tc('related.emptyOrders')}
      />
      {!isLoading && !isError && rows.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-border/70">
          <Table className="min-w-[640px] text-[13px]">
            <TableHeader>
              <TableRow className="border-border/60 hover:bg-transparent">
                <TableHead className={headCellClass}>{tc('related.columns.offerNo')}</TableHead>
                <TableHead className={headCellClass}>{tc('related.columns.date')}</TableHead>
                <TableHead className={headCellClass}>{tc('related.columns.representative')}</TableHead>
                <TableHead className={cn(headCellClass, 'text-right')}>{tc('related.columns.total')}</TableHead>
                <TableHead className={cn(headCellClass, 'w-8')} />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.id} className={rowClass} onClick={() => navigate(`/orders/${row.id}`)}>
                  <TableCell className={cn(cellClass, 'font-medium')}>{row.offerNo || `#${row.id}`}</TableCell>
                  <TableCell className={cn(cellClass, 'text-muted-foreground')}>{formatDate(i18n.language, row.offerDate)}</TableCell>
                  <TableCell className={cn(cellClass, 'text-muted-foreground')}>{row.representativeName || '-'}</TableCell>
                  <TableCell className={cn(cellClass, 'text-right font-semibold tabular-nums')}>
                    {formatAmount(i18n.language, row.grandTotal, row.grandTotalDisplay, row.currencyCode ?? row.currency)}
                  </TableCell>
                  <TableCell className={cn(cellClass, 'text-right')}>
                    <RowChevron className="h-4 w-4 text-muted-foreground/50" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
      <Pager
        pageNumber={pageNumber}
        totalPages={totalPages}
        onPrev={() => setPageNumber((p) => Math.max(1, p - 1))}
        onNext={() => setPageNumber((p) => Math.min(totalPages, p + 1))}
      />
    </RelatedCard>
  );
}

function activityStatusMeta(status: unknown): { key: string; className: string } {
  const value = Number(status);
  if (value === 1) return { key: 'related.activityStatus.completed', className: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' };
  if (value === 2) return { key: 'related.activityStatus.cancelled', className: 'bg-rose-500/15 text-rose-600 dark:text-rose-400' };
  return { key: 'related.activityStatus.scheduled', className: 'bg-sky-500/15 text-sky-600 dark:text-sky-400' };
}

export function CustomerActivitiesTab({
  customerId,
  customerCode,
  customerName,
  onNewActivity,
  onOpenActivity,
}: CustomerRelatedTabProps & {
  onNewActivity: () => void;
  onOpenActivity: (activityId: number) => void;
}): ReactElement {
  const { t, i18n } = useTranslation(['customer360', 'common']);
  const tc = (key: string, opts?: Record<string, unknown>) => t(key, { ns: 'customer360', ...opts });
  const [pageNumber, setPageNumber] = useState(1);
  const { data, isLoading, isError } = useCustomerActivities({
    customerId,
    customerCode,
    customerName,
    pageNumber,
    pageSize: PAGE_SIZE,
  });
  const rows = data?.data ?? [];
  const totalPages = data?.totalPages ?? 1;

  return (
    <RelatedCard
      icon={Activity}
      title={tc('tabs.activities')}
      count={data?.totalCount}
      createLabel={tc('related.newActivity')}
      onCreate={onNewActivity}
    >
      <ListStates
        isLoading={isLoading}
        isError={isError}
        isEmpty={rows.length === 0}
        errorLabel={tc('related.error')}
        emptyLabel={tc('related.emptyActivities')}
      />
      {!isLoading && !isError && rows.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-border/70">
          <Table className="min-w-[640px] text-[13px]">
            <TableHeader>
              <TableRow className="border-border/60 hover:bg-transparent">
                <TableHead className={headCellClass}>{tc('related.columns.subject')}</TableHead>
                <TableHead className={headCellClass}>{tc('related.columns.type')}</TableHead>
                <TableHead className={headCellClass}>{tc('related.columns.date')}</TableHead>
                <TableHead className={headCellClass}>{tc('related.columns.assignee')}</TableHead>
                <TableHead className={cn(headCellClass, 'text-right')}>{tc('related.columns.status')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => {
                const meta = activityStatusMeta(row.status);
                return (
                  <TableRow
                    key={row.id}
                    className={rowClass}
                    onClick={() => onOpenActivity(row.id)}
                  >
                    <TableCell className={cn(cellClass, 'font-medium')}>{row.subject || `#${row.id}`}</TableCell>
                    <TableCell className={cn(cellClass, 'text-muted-foreground')}>{row.activityType?.name || '-'}</TableCell>
                    <TableCell className={cn(cellClass, 'text-muted-foreground')}>
                      {formatDate(i18n.language, row.startDateTime)}
                    </TableCell>
                    <TableCell className={cn(cellClass, 'text-muted-foreground')}>{row.assignedUser?.fullName || '-'}</TableCell>
                    <TableCell className={cn(cellClass, 'text-right')}>
                      <Badge className={cn('rounded-full border-0 text-xs font-medium', meta.className)}>{tc(meta.key)}</Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
      <Pager
        pageNumber={pageNumber}
        totalPages={totalPages}
        onPrev={() => setPageNumber((p) => Math.max(1, p - 1))}
        onNext={() => setPageNumber((p) => Math.min(totalPages, p + 1))}
      />
    </RelatedCard>
  );
}

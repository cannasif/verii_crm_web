import { type ReactElement, useCallback, useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { ArrowDown, ArrowUp, ArrowUpDown, Eye, Loader2, RefreshCw } from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';
import { loadColumnPreferences } from '@/lib/column-preferences';
import {
  MANAGEMENT_LIST_TABLE_SHELL_CLASSNAME,
  MANAGEMENT_TOOLBAR_OUTLINE_BUTTON_CLASSNAME,
} from '@/lib/management-list-layout';
import { rowsToBackendFilters, type FilterColumnConfig, type FilterRow } from '@/lib/advanced-filter-types';
import {
  DataTableActionBar,
  DataTableGrid,
  ManagementDataTableChrome,
  type DataTableGridColumn,
} from '@/components/shared';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { googleIntegrationApi } from '@/features/google-integration/api/google-integration.api';
import { outlookIntegrationApi } from '@/features/outlook-integration/api/outlook-integration.api';
import type { GoogleCustomerMailLogDto } from '@/features/google-integration/types/google-integration.types';
import type { OutlookCustomerMailLogDto } from '@/features/outlook-integration/types/outlook-integration.types';

const PAGE_KEY = 'customer-360-mail-logs';
const PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const;

type SortDirection = 'asc' | 'desc';
type MailProvider = 'google' | 'outlook';
type CustomerMailLogDto = GoogleCustomerMailLogDto | OutlookCustomerMailLogDto;
type MailLogColumnKey =
  | 'createdDate'
  | 'sentByUserName'
  | 'toEmails'
  | 'subject'
  | 'isSuccess'
  | 'templateName'
  | 'errorCode';

type MailLogColumnConfig = {
  key: MailLogColumnKey;
  labelKey: string;
  fallbackLabel: string;
  filterType: FilterColumnConfig['type'];
};

const MAIL_LOG_COLUMN_CONFIG: readonly MailLogColumnConfig[] = [
  { key: 'createdDate', labelKey: 'customer360.mail.columns.date', fallbackLabel: 'Tarih', filterType: 'date' },
  { key: 'sentByUserName', labelKey: 'customer360.mail.columns.sender', fallbackLabel: 'Gönderen', filterType: 'string' },
  { key: 'toEmails', labelKey: 'customer360.mail.columns.to', fallbackLabel: 'Alıcı', filterType: 'string' },
  { key: 'subject', labelKey: 'customer360.mail.columns.subject', fallbackLabel: 'Konu', filterType: 'string' },
  { key: 'isSuccess', labelKey: 'customer360.mail.columns.status', fallbackLabel: 'Durum', filterType: 'boolean' },
  { key: 'templateName', labelKey: 'customer360.mail.columns.template', fallbackLabel: 'Şablon', filterType: 'string' },
  { key: 'errorCode', labelKey: 'customer360.mail.columns.errorCode', fallbackLabel: 'Hata Kodu', filterType: 'string' },
];

interface CustomerMailLogsTabProps {
  customerId: number;
}

export function CustomerMailLogsTab({ customerId }: CustomerMailLogsTabProps): ReactElement {
  const { t } = useTranslation(['customer360', 'google-integration', 'outlook-integration', 'common']);
  const { user } = useAuthStore();

  const [provider, setProvider] = useState<MailProvider>('google');
  const [pageNumber, setPageNumber] = useState(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [sortBy, setSortBy] = useState<MailLogColumnKey>('createdDate');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [errorsOnly, setErrorsOnly] = useState(false);
  const [draftFilterRows, setDraftFilterRows] = useState<FilterRow[]>([]);
  const [appliedFilterRows, setAppliedFilterRows] = useState<FilterRow[]>([]);

  const baseColumns = useMemo(
    () =>
      MAIL_LOG_COLUMN_CONFIG.map((col) => ({
        key: col.key,
        label: t(col.labelKey, { defaultValue: col.fallbackLabel }),
      })),
    [t]
  );

  const columns = useMemo<DataTableGridColumn<MailLogColumnKey>[]>(
    () => baseColumns,
    [baseColumns]
  );

  const defaultColumnKeys = useMemo(() => baseColumns.map((col) => col.key), [baseColumns]);
  const [columnOrder, setColumnOrder] = useState<string[]>(defaultColumnKeys);
  const [visibleColumns, setVisibleColumns] = useState<string[]>(defaultColumnKeys);

  useEffect(() => {
    const prefs = loadColumnPreferences(PAGE_KEY, user?.id, defaultColumnKeys);
    setColumnOrder(prefs.order);
    setVisibleColumns(prefs.visibleKeys);
  }, [defaultColumnKeys, user?.id]);

  const appliedFilters = useMemo(() => rowsToBackendFilters(appliedFilterRows), [appliedFilterRows]);

  const logsQuery = useQuery({
    queryKey: ['customer-360', 'mail-logs', provider, customerId, pageNumber, pageSize, sortBy, sortDirection, errorsOnly, JSON.stringify(appliedFilters)],
    queryFn: () =>
      provider === 'google'
        ? googleIntegrationApi.getCustomerMailLogs({
            customerId,
            pageNumber,
            pageSize,
            sortBy,
            sortDirection,
            errorsOnly,
            filters: appliedFilters.length > 0 ? appliedFilters : undefined,
            filterLogic: 'and',
          })
        : outlookIntegrationApi.getCustomerMailLogs({
            customerId,
            pageNumber,
            pageSize,
            sortBy,
            sortDirection,
            errorsOnly,
            filters: appliedFilters.length > 0 ? appliedFilters : undefined,
            filterLogic: 'and',
          }),
    enabled: customerId > 0,
  });

  const pagedLogs = logsQuery.data;
  const currentPageRows = useMemo(() => (pagedLogs?.data ?? []) as CustomerMailLogDto[], [pagedLogs?.data]);
  const totalCount = pagedLogs?.totalCount ?? 0;
  const hasNextPage = pagedLogs?.hasNextPage ?? false;
  const hasPreviousPage = pagedLogs?.hasPreviousPage ?? pageNumber > 1;
  const totalPages = pagedLogs?.totalPages ?? 1;
  const startRow = totalCount === 0 ? 0 : (pageNumber - 1) * pageSize + 1;
  const endRow = totalCount === 0 ? 0 : Math.min(pageNumber * pageSize, totalCount);
  const orderedVisibleColumns = columnOrder.filter((key) => visibleColumns.includes(key)) as MailLogColumnKey[];

  const filterColumns = useMemo<FilterColumnConfig[]>(
    () =>
      MAIL_LOG_COLUMN_CONFIG.map((col) => ({
        value: col.key,
        type: col.filterType,
        labelKey: col.labelKey,
      })),
    []
  );

  const exportColumns = useMemo(
    () =>
      orderedVisibleColumns.map((key) => {
        const column = baseColumns.find((item) => item.key === key);
        return {
          key,
          label: column?.label ?? key,
        };
      }),
    [baseColumns, orderedVisibleColumns]
  );

  const successLabel = provider === 'google' ? t('google-integration:logs.success') : t('outlook-integration:logs.success');
  const failedLabel = provider === 'google' ? t('google-integration:logs.failed') : t('outlook-integration:logs.failed');
  const actionNs = provider === 'google' ? 'google-integration' : 'outlook-integration';

  const exportRows = useMemo<Record<string, unknown>[]>(
    () =>
      currentPageRows.map((log) => ({
        createdDate: new Date(log.createdDate).toLocaleString(),
        sentByUserName: log.sentByUserName ?? '-',
        toEmails: log.toEmails,
        subject: log.subject,
        isSuccess: log.isSuccess ? successLabel : failedLabel,
        templateName: log.templateName ?? '-',
        errorCode: log.errorCode ?? '-',
      })),
    [currentPageRows, failedLabel, successLabel]
  );

  const getExportData = useCallback(async (): Promise<{ columns: { key: string; label: string }[]; rows: Record<string, unknown>[] }> => {
    const response =
      provider === 'google'
        ? await googleIntegrationApi.getCustomerMailLogs({
            customerId,
            pageNumber: 1,
            pageSize: 10000,
            sortBy,
            sortDirection,
            errorsOnly,
            filters: appliedFilters.length > 0 ? appliedFilters : undefined,
            filterLogic: 'and',
          })
        : await outlookIntegrationApi.getCustomerMailLogs({
            customerId,
            pageNumber: 1,
            pageSize: 10000,
            sortBy,
            sortDirection,
            errorsOnly,
            filters: appliedFilters.length > 0 ? appliedFilters : undefined,
            filterLogic: 'and',
          });
    const list = (response?.data ?? []) as CustomerMailLogDto[];
    return {
      columns: exportColumns,
      rows: list.map((log) => ({
        createdDate: new Date(log.createdDate).toLocaleString(),
        sentByUserName: log.sentByUserName ?? '-',
        toEmails: log.toEmails,
        subject: log.subject,
        isSuccess: log.isSuccess ? successLabel : failedLabel,
        templateName: log.templateName ?? '-',
        errorCode: log.errorCode ?? '-',
      })),
    };
  }, [provider, customerId, exportColumns, sortBy, sortDirection, errorsOnly, appliedFilters, successLabel, failedLabel]);

  useEffect(() => {
    setPageNumber(1);
  }, [provider, pageSize, sortBy, sortDirection, errorsOnly, appliedFilters]);

  const onSort = (column: MailLogColumnKey): void => {
    if (sortBy === column) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
      return;
    }
    setSortBy(column);
    setSortDirection('asc');
  };

  const renderSortIcon = (column: MailLogColumnKey): ReactElement => {
    if (sortBy !== column) {
      return <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground/70" />;
    }
    return sortDirection === 'asc'
      ? <ArrowUp className="h-3.5 w-3.5 text-foreground" />
      : <ArrowDown className="h-3.5 w-3.5 text-foreground" />;
  };

  const [selectedLog, setSelectedLog] = useState<CustomerMailLogDto | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const handleOpenDetails = (log: CustomerMailLogDto): void => {
    setSelectedLog(log);
    setDetailsOpen(true);
  };

  const renderCell = (log: CustomerMailLogDto, key: MailLogColumnKey): ReactElement | string => {
    if (key === 'createdDate') return new Date(log.createdDate).toLocaleString();
    if (key === 'sentByUserName') return log.sentByUserName ?? '-';
    if (key === 'toEmails') return log.toEmails || '-';
    if (key === 'subject') return log.subject || '-';
    if (key === 'isSuccess') {
      return log.isSuccess ? (
        <Badge variant="default">{successLabel}</Badge>
      ) : (
        <Badge variant="destructive">{failedLabel}</Badge>
      );
    }
    if (key === 'templateName') return log.templateName ?? '-';
    if (key === 'errorCode') return log.errorCode ?? '-';
    return '-';
  };

  return (
    <Card className="rounded-xl border border-slate-200 dark:border-white/10">
      <CardContent className="pt-6 space-y-4">
        <div className="flex items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant={provider === 'google' ? 'default' : 'outline'}
            onClick={() => setProvider('google')}
          >
            {t('customer360.mail.providers.google', { defaultValue: 'Google' })}
          </Button>
          <Button
            type="button"
            size="sm"
            variant={provider === 'outlook' ? 'default' : 'outline'}
            onClick={() => setProvider('outlook')}
          >
            {t('customer360.mail.providers.outlook', { defaultValue: 'Outlook' })}
          </Button>
        </div>

        <DataTableActionBar
          pageKey={`${PAGE_KEY}-${provider}`}
          userId={user?.id}
          columns={baseColumns}
          visibleColumns={visibleColumns}
          columnOrder={columnOrder}
          onVisibleColumnsChange={setVisibleColumns}
          onColumnOrderChange={setColumnOrder}
          exportFileName={`customer-360-mail-logs-${provider}`}
          exportColumns={exportColumns}
          exportRows={exportRows}
          getExportData={getExportData}
          filterColumns={filterColumns}
          defaultFilterColumn="subject"
          draftFilterRows={draftFilterRows}
          onDraftFilterRowsChange={setDraftFilterRows}
          onApplyFilters={() => setAppliedFilterRows(draftFilterRows)}
          onClearFilters={() => {
            setDraftFilterRows([]);
            setAppliedFilterRows([]);
          }}
          translationNamespace={actionNs}
          appliedFilterCount={appliedFilters.length}
          leftSlot={(
            <>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="customer-mail-logs-errors-only"
                  checked={errorsOnly}
                  onCheckedChange={(checked) => setErrorsOnly(Boolean(checked))}
                />
                <Label htmlFor="customer-mail-logs-errors-only" className="text-sm cursor-pointer">
                  {provider === 'google' ? t('google-integration:logs.errorsOnly') : t('outlook-integration:logs.errorsOnly')}
                </Label>
              </div>
              <Button
                variant="outline"
                size="sm"
                className={MANAGEMENT_TOOLBAR_OUTLINE_BUTTON_CLASSNAME}
                onClick={() => logsQuery.refetch()}
                disabled={logsQuery.isFetching}
              >
                {logsQuery.isFetching ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                {provider === 'google' ? t('google-integration:logs.refresh') : t('outlook-integration:logs.refresh')}
              </Button>
            </>
          )}
        />

        <div className={MANAGEMENT_LIST_TABLE_SHELL_CLASSNAME}>
        <ManagementDataTableChrome>
        <DataTableGrid<CustomerMailLogDto, MailLogColumnKey>
          columns={columns}
          visibleColumnKeys={orderedVisibleColumns}
          rows={currentPageRows}
          rowKey={(row) => row.id}
          renderCell={renderCell}
          sortBy={sortBy}
          sortDirection={sortDirection}
          onSort={onSort}
          renderSortIcon={renderSortIcon}
          isLoading={logsQuery.isLoading}
          isError={logsQuery.isError}
          loadingText={provider === 'google' ? t('google-integration:logs.loading') : t('outlook-integration:logs.loading')}
          errorText={provider === 'google' ? t('google-integration:logs.loadError') : t('outlook-integration:logs.loadError')}
          emptyText={provider === 'google' ? t('google-integration:logs.empty') : t('outlook-integration:logs.empty')}
          minTableWidthClassName="min-w-[1100px]"
          showActionsColumn
          actionsHeaderLabel={provider === 'google' ? t('google-integration:logs.actions') : t('outlook-integration:logs.actions')}
          renderActionsCell={(log) => (
            <div className="flex justify-end gap-2 opacity-100 transition-opacity">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-500/10"
                onClick={() => handleOpenDetails(log)}
                title={provider === 'google' ? t('google-integration:logs.viewDetails') : t('outlook-integration:logs.viewDetails')}
              >
                <Eye className="h-4 w-4" />
              </Button>
            </div>
          )}
          rowClassName="group"
          pageSize={pageSize}
          pageSizeOptions={PAGE_SIZE_OPTIONS}
          onPageSizeChange={setPageSize}
          pageNumber={pageNumber}
          totalPages={totalPages}
          hasPreviousPage={hasPreviousPage}
          hasNextPage={hasNextPage}
          onPreviousPage={() => setPageNumber((prev) => Math.max(1, prev - 1))}
          onNextPage={() => setPageNumber((prev) => prev + 1)}
          previousLabel={provider === 'google' ? t('google-integration:logs.previous') : t('outlook-integration:logs.previous')}
          nextLabel={provider === 'google' ? t('google-integration:logs.next') : t('outlook-integration:logs.next')}
          paginationInfoText={t('common.paginationInfo', {
            start: startRow,
            end: endRow,
            total: totalCount,
            ns: 'common',
          })}
          disablePaginationButtons={logsQuery.isFetching}
          centerColumnHeaders
        />
        </ManagementDataTableChrome>
        </div>
      </CardContent>

      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{provider === 'google' ? t('google-integration:logs.detailsTitle') : t('outlook-integration:logs.detailsTitle')}</DialogTitle>
            <DialogDescription>{provider === 'google' ? t('google-integration:logs.detailsDescription') : t('outlook-integration:logs.detailsDescription')}</DialogDescription>
          </DialogHeader>
          {selectedLog && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div><span className="font-medium">{t('mail.columns.date', { ns: 'customer360' })}:</span> {new Date(selectedLog.createdDate).toLocaleString()}</div>
                <div><span className="font-medium">{t('mail.columns.sender', { ns: 'customer360' })}:</span> {selectedLog.sentByUserName ?? '-'}</div>
                <div><span className="font-medium">{t('mail.columns.to', { ns: 'customer360' })}:</span> {selectedLog.toEmails || '-'}</div>
                <div><span className="font-medium">{t('mail.columns.status', { ns: 'customer360' })}:</span> {selectedLog.isSuccess ? successLabel : failedLabel}</div>
              </div>
              <div><span className="font-medium">{t('mail.columns.subject', { ns: 'customer360' })}:</span> {selectedLog.subject || '-'}</div>
              <div>
                <span className="font-medium">{t('mail.columns.body', { ns: 'customer360' })}:</span>
                <div className="mt-1 rounded-md border bg-muted/30 p-3 whitespace-pre-wrap wrap-break-words">
                  {selectedLog.body || selectedLog.bodyPreview || '-'}
                </div>
              </div>
              {!selectedLog.isSuccess && (
                <div className="text-red-600">
                  <span className="font-medium">{t('mail.columns.errorCode', { ns: 'customer360' })}:</span> {selectedLog.errorCode || '-'}
                  {selectedLog.errorMessage ? (
                    <div className="mt-1 rounded-md border border-red-200 bg-red-50 p-2 text-red-700 whitespace-pre-wrap wrap-break-words">
                      {selectedLog.errorMessage}
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}

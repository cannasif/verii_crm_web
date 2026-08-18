import { type ReactElement, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { isAxiosError } from 'axios';
import {
  DataTableGrid,
  ProcessProgressModal,
  useProcessStepPacer,
  type DataTableGridColumn,
  type ProcessProgressStatus,
  type ProcessProgressStep,
} from '@/components/shared';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useDeleteCustomer } from '../hooks/useDeleteCustomer';
import type { CustomerDto } from '../types/customer-types';
import {
  Edit2,
  Trash2,
  Tag,
  MapPin,
  Mail,
  Phone,
  Globe,
  CreditCard,
  Hash,
  LayoutGrid,
  Calendar,
  User,
  Activity,
  CloudUpload,
  PieChart,
  CheckCircle2,
} from 'lucide-react';
import { Alert02Icon } from 'hugeicons-react';
import { MANAGEMENT_DATA_GRID_CLASSNAME, MANAGEMENT_LIST_ID_COLUMN_CELL_CLASSNAME, MANAGEMENT_LIST_ID_COLUMN_HEAD_CLASSNAME } from '@/lib/management-list-layout';
import { useCrudPermissions } from '@/features/access-control/hooks/useCrudPermissions';
import { useMyPermissionsQuery } from '@/features/access-control/hooks/useMyPermissionsQuery';
import { hasPermission } from '@/features/access-control/utils/hasPermission';
import { useCreateErpCustomer } from '../hooks/useCreateErpCustomer';
import { calculateCustomerCompletion, getCompletionColorClasses } from '../utils/customer-completion';
import { createClientId } from '@/lib/create-client-id';

const CRM_NS = 'customer-management' as const;

const ERP_PROCESS_STEP_IDS = [
  'validate-fields',
  'check-required',
  'check-duplicates',
  'prepare-relations',
  'build-erp-payload',
  'send-to-erp',
  'receive-erp-code',
  'update-crm-status',
] as const;

type ErpProcessStepId = (typeof ERP_PROCESS_STEP_IDS)[number];

interface ErpProcessState {
  open: boolean;
  status: ProcessProgressStatus;
  operationKey: string;
  customer: CustomerDto | null;
  result: CustomerDto | null;
  errorMessage: string | null;
  technicalDetails: string | null;
  errorStepId: ErpProcessStepId | null;
}

const INITIAL_ERP_PROCESS_STATE: ErpProcessState = {
  open: false,
  status: 'running',
  operationKey: '',
  customer: null,
  result: null,
  errorMessage: null,
  technicalDetails: null,
  errorStepId: null,
};

function readErrorEnvelope(error: unknown): Record<string, unknown> | null {
  if (!isAxiosError(error) || !error.response?.data || typeof error.response.data !== 'object') return null;
  return error.response.data as Record<string, unknown>;
}

function resolveErpErrorStep(errorCode: string | null): ErpProcessStepId {
  if (errorCode?.includes('required_fields')) return 'check-required';
  if (errorCode?.includes('branch') || errorCode?.includes('sales_rep')) return 'prepare-relations';
  if (errorCode?.includes('customer_code')) return 'build-erp-payload';
  return 'send-to-erp';
}

function describeErpProcessError(error: unknown, fallback: string): {
  message: string;
  technicalDetails: string | null;
  errorStepId: ErpProcessStepId;
} {
  const envelope = readErrorEnvelope(error);
  const errorCode = typeof envelope?.errorCode === 'string' ? envelope.errorCode : null;
  const message = error instanceof Error && error.message ? error.message : fallback;
  const httpStatus = isAxiosError(error) ? error.response?.status : undefined;
  const traceId = isAxiosError(error)
    ? error.response?.headers?.['x-trace-id'] ?? error.response?.headers?.['X-Trace-Id']
    : undefined;
  const details = envelope?.details;
  const lines = [
    errorCode ? `CODE: ${errorCode}` : null,
    httpStatus ? `HTTP: ${httpStatus}` : null,
    traceId ? `TRACE: ${String(traceId)}` : null,
    details ? `DETAILS: ${typeof details === 'string' ? details : JSON.stringify(details, null, 2)}` : null,
  ].filter((value): value is string => Boolean(value));

  return {
    message,
    technicalDetails: lines.length > 0 ? lines.join('\n') : null,
    errorStepId: resolveErpErrorStep(errorCode),
  };
}

/** Tablo başlıkları customer-management namespace ve customerManagement.* anahtar yolu ile çözülür. */
function tc(t: TFunction, key: string): string {
  return t(key, { ns: CRM_NS });
}

export interface ColumnDef<T> {
  key: keyof T;
  label: string;
  type: 'text' | 'date' | 'user' | 'badge' | 'email' | 'phone' | 'location' | 'money' | 'link' | 'code';
  className?: string;
  headClassName?: string;
}

type CustomerColumnKey = keyof CustomerDto;

interface CustomerTableProps {
  toolbar?: React.ReactNode;
  columns: DataTableGridColumn<CustomerColumnKey>[];
  visibleColumnKeys: CustomerColumnKey[];
  rows: CustomerDto[];
  rowKey: (row: CustomerDto) => string | number;
  sortBy: CustomerColumnKey;
  sortDirection: 'asc' | 'desc';
  onSort: (key: CustomerColumnKey) => void;
  renderSortIcon: (key: CustomerColumnKey) => React.ReactNode;
  isLoading?: boolean;
  loadingText?: string;
  errorText?: string;
  emptyText?: string;
  minTableWidthClassName?: string;
  showActionsColumn?: boolean;
  actionsHeaderLabel?: string;
  onEdit: (customer: CustomerDto) => void;
  onQuickActivity: (customer: CustomerDto) => void;
  rowClassName?: string | ((row: CustomerDto) => string | undefined);
  pageSize: number;
  pageSizeOptions: readonly number[];
  onPageSizeChange: (size: number) => void;
  pageNumber: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
  onPreviousPage: () => void;
  onNextPage: () => void;
  previousLabel: string;
  nextLabel: string;
  paginationInfoText: string;
  disablePaginationButtons?: boolean;
  onColumnOrderChange?: (newOrder: CustomerColumnKey[]) => void;
}

const idColumnSurface = MANAGEMENT_LIST_ID_COLUMN_HEAD_CLASSNAME;

export const getColumnsConfig = (t: TFunction): ColumnDef<CustomerDto>[] => [
  {
    key: 'id',
    label: tc(t, 'customerManagement.table.id'),
    type: 'text',
    headClassName: idColumnSurface,
    className: MANAGEMENT_LIST_ID_COLUMN_CELL_CLASSNAME,
  },
  { key: 'customerCode', label: tc(t, 'customerManagement.table.customerCode'), type: 'code', className: 'font-mono text-xs' },
  { key: 'name', label: tc(t, 'customerManagement.table.name'), type: 'text', className: 'font-bold text-slate-900 dark:text-white min-w-[160px] md:min-w-[200px]' },
  { key: 'customerTypeName', label: tc(t, 'customerManagement.table.customerType'), type: 'badge', className: 'min-w-[120px] md:min-w-[140px]' },
  { key: 'email', label: tc(t, 'customerManagement.table.email'), type: 'email', className: 'min-w-[150px] md:min-w-[180px]' },
  { key: 'phone', label: tc(t, 'customerManagement.table.phone'), type: 'phone', className: 'whitespace-nowrap' },
  { key: 'cityName', label: tc(t, 'customerManagement.table.city'), type: 'location', className: 'min-w-[96px] md:min-w-[120px]' },
  { key: 'districtName', label: tc(t, 'customerManagement.table.district'), type: 'text', className: 'text-slate-500' },
  { key: 'countryName', label: tc(t, 'customerManagement.table.country'), type: 'text', className: 'text-slate-500' },
  { key: 'creditLimit', label: tc(t, 'customerManagement.table.creditLimit'), type: 'money', className: 'font-medium' },
  { key: 'defaultShippingAddressId', label: tc(t, 'customerManagement.table.defaultShippingAddressId'), type: 'code', className: 'font-mono text-xs' },
  { key: 'salesRepCode', label: tc(t, 'customerManagement.table.salesRep'), type: 'user', className: 'whitespace-nowrap' },
  { key: 'tcknNumber', label: tc(t, 'customerManagement.table.tckn'), type: 'code', className: 'font-mono text-xs' },
  { key: 'taxNumber', label: tc(t, 'customerManagement.table.tax'), type: 'code', className: 'font-mono text-xs' },
  { key: 'website', label: tc(t, 'customerManagement.table.website'), type: 'link', className: 'text-blue-500' },
  { key: 'createdDate', label: tc(t, 'customerManagement.table.createdDate'), type: 'date', className: 'whitespace-nowrap' },
];

function renderCellContent(
  item: CustomerDto,
  column: ColumnDef<CustomerDto>,
  i18n: { language: string }
): React.ReactNode {
  const value = item[column.key];
  if (!value && value !== 0) return '-';

  switch (column.type) {
    case 'badge':
      return (
        <div className="flex items-center gap-2">
          <Tag size={14} className="text-primary" />
          {String(value)}
        </div>
      );
    case 'email':
      return (
        <div className="flex items-center gap-2 text-xs truncate max-w-[180px]" title={String(value)}>
          <Mail size={14} className="text-blue-500 shrink-0" />
          {String(value)}
        </div>
      );
    case 'phone':
      return (
        <div className="flex items-center gap-2 text-xs">
          <Phone size={14} className="text-orange-500 shrink-0" />
          {String(value)}
        </div>
      );
    case 'location':
      return (
        <div className="flex items-center gap-2 text-xs">
          <MapPin size={14} className="text-green-500 shrink-0" />
          {String(value)}
        </div>
      );
    case 'money':
      return (
        <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-mono">
          <CreditCard size={14} className="shrink-0" />
          {Number(value).toLocaleString(i18n.language, { minimumFractionDigits: 2 })} ₺
        </div>
      );
    case 'user':
      return (
        <div className="flex items-center gap-2 text-xs">
          <User size={14} className="text-indigo-500/50 shrink-0" />
          {String(value)}
        </div>
      );
    case 'link':
      return (
        <div className="flex items-center gap-2 text-xs text-blue-600 hover:underline">
          <Globe size={14} className="shrink-0" />
          <a
            href={String(value).startsWith('http') ? String(value) : `https://${value}`}
            target="_blank"
            rel="noreferrer"
          >
            {String(value)}
          </a>
        </div>
      );
    case 'code':
      return (
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-white/10 px-1.5 py-0.5 rounded text-[11px] font-mono text-slate-600 dark:text-slate-300">
          <Hash size={12} className="opacity-50" />
          {String(value)}
        </div>
      );
    case 'date':
      return (
        <div className="flex items-center gap-2 text-xs">
          <Calendar size={14} className="text-primary/50" />
          {new Date(String(value)).toLocaleDateString(i18n.language)}
        </div>
      );
    default:
      return String(value);
  }
}

export function CustomerTable({
  toolbar,
  columns,
  visibleColumnKeys,
  rows,
  rowKey,
  sortBy,
  sortDirection,
  onSort,
  renderSortIcon,
  disablePaginationButtons = false,
  isLoading = false,
  loadingText = 'Loading...',
  errorText = 'An error occurred.',
  emptyText = 'No data.',
  minTableWidthClassName = 'min-w-[800px] lg:min-w-[1100px]',
  showActionsColumn = true,
  actionsHeaderLabel = '',
  onEdit,
  onQuickActivity,
  rowClassName,
  pageSize,
  pageSizeOptions,
  onPageSizeChange,
  pageNumber,
  totalPages,
  hasPreviousPage,
  hasNextPage,
  onPreviousPage,
  onNextPage,
  previousLabel,
  nextLabel,
  paginationInfoText,
  onColumnOrderChange,
}: CustomerTableProps): ReactElement {
  const { t, i18n } = useTranslation(['customer-management', 'common']);
  const { canUpdate, canDelete } = useCrudPermissions('customers.customer-management.view');
  const { data: permissions } = useMyPermissionsQuery();
  const canCreateErpCustomer = hasPermission(permissions, 'customers.erp-create');
  const navigate = useNavigate();
  const deleteCustomer = useDeleteCustomer();
  const createErpCustomer = useCreateErpCustomer();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerDto | null>(null);
  const [erpCreateDialogOpen, setErpCreateDialogOpen] = useState(false);
  const [erpCreateCustomer, setErpCreateCustomer] = useState<CustomerDto | null>(null);
  const [erpProcess, setErpProcess] = useState<ErpProcessState>(INITIAL_ERP_PROCESS_STATE);
  const erpActiveStepIndex = useProcessStepPacer({
    running: erpProcess.open && erpProcess.status === 'running',
    stepCount: ERP_PROCESS_STEP_IDS.length,
    resetKey: erpProcess.operationKey,
    intervalMs: 700,
  });

  const erpProcessSteps = useMemo<ProcessProgressStep[]>(() => {
    const labels: Record<ErpProcessStepId, string> = {
      'validate-fields': t('customerManagement.erpCreate.progress.steps.validateFields', { ns: CRM_NS }),
      'check-required': t('customerManagement.erpCreate.progress.steps.checkRequired', { ns: CRM_NS }),
      'check-duplicates': t('customerManagement.erpCreate.progress.steps.checkDuplicates', { ns: CRM_NS }),
      'prepare-relations': t('customerManagement.erpCreate.progress.steps.prepareRelations', { ns: CRM_NS }),
      'build-erp-payload': t('customerManagement.erpCreate.progress.steps.buildErpPayload', { ns: CRM_NS }),
      'send-to-erp': t('customerManagement.erpCreate.progress.steps.sendToErp', { ns: CRM_NS }),
      'receive-erp-code': t('customerManagement.erpCreate.progress.steps.receiveErpCode', { ns: CRM_NS }),
      'update-crm-status': t('customerManagement.erpCreate.progress.steps.updateCrmStatus', { ns: CRM_NS }),
    };

    const errorStepIndex = erpProcess.errorStepId
      ? ERP_PROCESS_STEP_IDS.indexOf(erpProcess.errorStepId)
      : -1;

    return ERP_PROCESS_STEP_IDS.map((id, index) => {
      let status: ProcessProgressStep['status'] = 'pending';
      if (erpProcess.status === 'success') {
        status = 'completed';
      } else if (erpProcess.status === 'error') {
        if (index < errorStepIndex) status = 'completed';
        if (index === errorStepIndex) status = 'error';
      } else if (index < erpActiveStepIndex) {
        status = 'completed';
      } else if (index === erpActiveStepIndex) {
        status = 'active';
      }

      return { id, label: labels[id], status };
    });
  }, [erpActiveStepIndex, erpProcess.errorStepId, erpProcess.status, t]);

  const tableColumns = useMemo(
    () => getColumnsConfig(t),
    [t]
  );

  const handleDeleteClick = (customer: CustomerDto): void => {
    if (!canDelete) return;
    setSelectedCustomer(customer);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async (): Promise<void> => {
    if (selectedCustomer) {
      try {
        await deleteCustomer.mutateAsync(selectedCustomer.id);
        setDeleteDialogOpen(false);
        setSelectedCustomer(null);
      } catch (error) {
        console.error(error);
      }
    }
  };

  const handleErpCreateClick = (customer: CustomerDto): void => {
    if (!canCreateErpCustomer || createErpCustomer.isPending) return;
    setErpCreateCustomer(customer);
    setErpCreateDialogOpen(true);
  };

  const runErpCreate = async (customer: CustomerDto, operationKey: string): Promise<void> => {
    setErpCreateDialogOpen(false);
    setErpCreateCustomer(null);
    setErpProcess({
      open: true,
      status: 'running',
      operationKey,
      customer,
      result: null,
      errorMessage: null,
      technicalDetails: null,
      errorStepId: null,
    });

    try {
      const result = await createErpCustomer.mutateAsync({ id: customer.id, operationKey });
      setErpProcess((current) => ({
        ...current,
        status: 'success',
        result,
        errorMessage: null,
        technicalDetails: null,
        errorStepId: null,
      }));
    } catch (error) {
      const failure = describeErpProcessError(
        error,
        t('customerManagement.messages.erpCreateError', { ns: CRM_NS }),
      );
      setErpProcess((current) => ({
        ...current,
        status: 'error',
        result: null,
        ...failure,
      }));
    }
  };

  const handleErpCreateConfirm = async (): Promise<void> => {
    if (!erpCreateCustomer || createErpCustomer.isPending) return;
    await runErpCreate(erpCreateCustomer, createClientId());
  };

  const handleErpCreateRetry = (): void => {
    if (!erpProcess.customer || !erpProcess.operationKey || createErpCustomer.isPending) return;
    void runErpCreate(erpProcess.customer, erpProcess.operationKey);
  };

  const cellRenderer = (row: CustomerDto, key: CustomerColumnKey): React.ReactNode => {
    const col = tableColumns.find((c) => c.key === key);
    const inner =
      col != null
        ? renderCellContent(row, col, i18n)
        : row[key] == null
          ? '-'
          : String(row[key]);

    if (key === 'id') {
      const completionPercentage = calculateCustomerCompletion(row);
      const isComplete = completionPercentage === 100;
      const colors = getCompletionColorClasses(completionPercentage);
      return (
        <div className="flex items-center justify-between gap-1.5 w-full px-1">
          <span className="whitespace-nowrap text-right flex-1 tabular-nums leading-none">{inner}</span>
          <div className="flex shrink-0 items-center">
            <Popover>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  data-skip-row-double-click
                  data-no-drag-scroll="true"
                  onClick={(e) => e.stopPropagation()}
                  onDoubleClick={(e) => e.stopPropagation()}
                  title={t('completionPercentage', { ns: CRM_NS, defaultValue: 'Veri Doluluğu: %{{val}}', val: completionPercentage })}
                  className={`flex h-7 w-7 items-center justify-center shrink-0 rounded-full hover:bg-slate-100 dark:hover:bg-white/10 transition-colors ${colors.text} ${colors.hoverText}`}
                >
                  {isComplete ? <CheckCircle2 size={16} /> : <PieChart size={16} />}
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-60 p-4 shadow-xl border-slate-100 dark:border-white/10 bg-white dark:bg-[#130822]" side="right" align="start">
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    <span>{t('completion', { ns: CRM_NS, defaultValue: 'Doluluk Oranı' })}</span>
                    <span className={colors.text}>{completionPercentage}%</span>
                  </div>
                  <div className="h-2 w-full bg-slate-100 dark:bg-white/10 rounded-full overflow-hidden shadow-inner">
                    <div
                      className={`h-full transition-all duration-500 ease-out rounded-full ${colors.bg} ${colors.shadow}`}
                      style={{ width: `${completionPercentage}%` }}
                    />
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
                    {isComplete
                      ? t('completion.completeMsg', { ns: CRM_NS, defaultValue: 'Tüm temel bilgiler eksiksiz doldurulmuş.' })
                      : t('completion.incompleteMsg', { ns: CRM_NS, defaultValue: 'Daha verimli bir takip için eksik bilgileri tamamlayın.' })}
                  </p>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>
      );
    }

    if (key === 'name') {
      return (
        <span
          data-skip-row-double-click
          data-no-drag-scroll="true"
          className="cursor-pointer select-none rounded px-0.5 -mx-0.5 hover:bg-slate-100/80 dark:hover:bg-white/5"
          title={t('nameOpen360Hint', {
            ns: CRM_NS,
            defaultValue: 'Çift tıklayarak Müşteri 360’a gidin',
          })}
          onDoubleClick={(event) => {
            event.stopPropagation();
            event.preventDefault();
            navigate(`/customer-360/${row.id}`);
          }}
        >
          {inner}
        </span>
      );
    }

    return inner;
  };

  const renderActionsCell = (customer: CustomerDto): ReactElement => (
    <div className="flex justify-end gap-2 opacity-100 transition-opacity">
      {canCreateErpCustomer && !customer.isERPIntegrated && !customer.isIntegrated ? (
        <Button
          variant="ghost"
          size="icon"
          disabled={createErpCustomer.isPending}
          onClick={() => handleErpCreateClick(customer)}
          title={t('customerManagement.erpCreate.button', {
            ns: CRM_NS,
            defaultValue: 'ERP Müşterisi Oluştur',
          })}
          className="h-8 w-8 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-500/10"
        >
          <CloudUpload size={16} />
        </Button>
      ) : null}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => onQuickActivity(customer)}
        title={t('quickActivity', { ns: CRM_NS })}
        className="h-8 w-8 text-primary hover:text-primary hover:bg-accent dark:text-primary dark:hover:bg-primary/10"
      >
        <Activity size={16} />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => navigate(`/customer-360/${customer.id}`)}
        title={t('customer360.button', { ns: CRM_NS, defaultValue: 'Müşteri 360' })}
        className="h-8 w-8 text-violet-600 hover:text-violet-700 hover:bg-violet-50 dark:text-violet-400 dark:hover:bg-violet-500/10"
      >
        <LayoutGrid size={16} />
      </Button>
      {canUpdate ? (
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onEdit(customer)}
          className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-500/10"
        >
          <Edit2 size={16} />
        </Button>
      ) : null}
      {canDelete ? (
        <Button
          variant="ghost"
          size="icon"
          onClick={() => handleDeleteClick(customer)}
          className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10"
        >
          <Trash2 size={16} />
        </Button>
      ) : null}
    </div>
  );

  return (
    <>
      <div className={MANAGEMENT_DATA_GRID_CLASSNAME}>
        <DataTableGrid<CustomerDto, CustomerColumnKey>
          toolbar={toolbar}
          columns={columns}
          visibleColumnKeys={visibleColumnKeys}
          rows={rows}
          rowKey={rowKey}
          renderCell={cellRenderer}
          sortBy={sortBy}
          sortDirection={sortDirection}
          onSort={onSort}
          renderSortIcon={renderSortIcon}
          isLoading={isLoading}
          isError={false}
          loadingText={loadingText}
          errorText={errorText}
          emptyText={emptyText}
          minTableWidthClassName={minTableWidthClassName}
          showActionsColumn={showActionsColumn}
          actionsHeaderLabel={actionsHeaderLabel}
          renderActionsCell={renderActionsCell}
          rowClassName={rowClassName}
          onRowDoubleClick={onEdit}
          pageSize={pageSize}
          pageSizeOptions={pageSizeOptions}
          onPageSizeChange={onPageSizeChange}
          pageNumber={pageNumber}
          totalPages={totalPages}
          hasPreviousPage={hasPreviousPage}
          hasNextPage={hasNextPage}
          onPreviousPage={onPreviousPage}
          onNextPage={onNextPage}
          previousLabel={previousLabel}
          nextLabel={nextLabel}
          paginationInfoText={paginationInfoText}
          disablePaginationButtons={disablePaginationButtons}
          centerColumnHeaders
          onColumnOrderChange={onColumnOrderChange}
        />
      </div>

      <Dialog open={canDelete && deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="bg-white dark:bg-[#130822] border border-slate-100 dark:border-white/10 text-slate-900 dark:text-white w-[90%] sm:w-full max-w-md rounded-2xl shadow-2xl overflow-hidden p-0 gap-0">
          <DialogHeader className="flex flex-col items-center gap-4 text-center pb-6 pt-10 px-6">
            <div className="h-20 w-20 rounded-full bg-red-50 dark:bg-red-500/10 flex items-center justify-center mb-2 animate-in zoom-in duration-300">
              <Alert02Icon size={36} className="text-red-600 dark:text-red-500" />
            </div>
            <div className="space-y-2">
              <DialogTitle className="text-2xl font-bold text-slate-900 dark:text-white">
                {t('delete.confirmTitle', { ns: CRM_NS })}
              </DialogTitle>
              <DialogDescription className="text-slate-500 dark:text-slate-400 max-w-[280px] mx-auto text-sm leading-relaxed">
                {t('delete.confirmMessage', {
                  ns: CRM_NS,
                  name: selectedCustomer?.name || '',
                })}
              </DialogDescription>
            </div>
          </DialogHeader>
          <DialogFooter className="flex flex-row gap-3 justify-center p-6 bg-slate-50/50 dark:bg-[#1a1025]/50 border-t border-slate-100 dark:border-white/5">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              className="flex-1 h-12 rounded-xl border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-white/5 font-semibold"
            >
              {t('cancel', { ns: 'common' })}
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={deleteCustomer.isPending}
              className="flex-1 h-12 rounded-xl bg-linear-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white border-0 shadow-lg shadow-red-500/20 transition-all hover:scale-[1.02] font-bold"
            >
              {deleteCustomer.isPending ? (
                <span className="animate-pulse">{t('loading', { ns: CRM_NS })}</span>
              ) : null}
              {t('delete.action', { ns: CRM_NS })}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={canCreateErpCustomer && erpCreateDialogOpen}
        onOpenChange={(open) => {
          if (createErpCustomer.isPending) return;
          setErpCreateDialogOpen(open);
          if (!open) {
            setErpCreateCustomer(null);
          }
        }}
      >
        <DialogContent className="bg-white dark:bg-[#130822] border border-slate-100 dark:border-white/10 text-slate-900 dark:text-white w-[90%] sm:w-full max-w-md rounded-2xl shadow-2xl overflow-hidden p-0 gap-0">
          <DialogHeader className="flex flex-col items-center gap-4 text-center pb-6 pt-10 px-6">
            <div className="h-20 w-20 rounded-full bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center mb-2 animate-in zoom-in duration-300">
              <CloudUpload size={36} className="text-emerald-600 dark:text-emerald-400" />
            </div>
            <div className="space-y-2">
              <DialogTitle className="text-2xl font-bold text-slate-900 dark:text-white">
                {t('customerManagement.erpCreate.confirmTitle', {
                  ns: CRM_NS,
                  defaultValue: 'Netsis ERP Kaydı Oluştur',
                })}
              </DialogTitle>
              <DialogDescription className="text-slate-500 dark:text-slate-400 max-w-[320px] mx-auto text-sm leading-relaxed">
                {t('customerManagement.erpCreate.confirmMessage', {
                  ns: CRM_NS,
                  name: erpCreateCustomer?.name || '',
                  defaultValue: '{{name}} müşterisi için Netsis ERP cari kaydı oluşturulacak. Onaylıyor musunuz?',
                })}
              </DialogDescription>
            </div>
          </DialogHeader>
          <DialogFooter className="flex flex-row gap-3 justify-center p-6 bg-slate-50/50 dark:bg-[#1a1025]/50 border-t border-slate-100 dark:border-white/5">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setErpCreateDialogOpen(false);
                setErpCreateCustomer(null);
              }}
              disabled={createErpCustomer.isPending}
              className="flex-1 h-12 rounded-xl border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-white/5 font-semibold"
            >
              {t('cancel', { ns: 'common' })}
            </Button>
            <Button
              type="button"
              onClick={() => void handleErpCreateConfirm()}
              disabled={createErpCustomer.isPending}
              className="flex-1 h-12 rounded-xl bg-linear-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white border-0 shadow-lg shadow-emerald-500/20 transition-all hover:scale-[1.02] font-bold"
            >
              {createErpCustomer.isPending ? (
                <span className="animate-pulse">{t('loading', { ns: CRM_NS })}</span>
              ) : (
                t('customerManagement.erpCreate.confirmAction', {
                  ns: CRM_NS,
                  defaultValue: 'Evet, Oluştur',
                })
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ProcessProgressModal
        open={erpProcess.open}
        status={erpProcess.status}
        route="CRM://ERP/SYNC/CUSTOMER"
        eyebrow={t('customerManagement.erpCreate.progress.eyebrow', { ns: CRM_NS })}
        title={t(
          erpProcess.status === 'success'
            ? 'customerManagement.erpCreate.progress.successTitle'
            : erpProcess.status === 'error'
              ? 'customerManagement.erpCreate.progress.errorTitle'
              : 'customerManagement.erpCreate.progress.runningTitle',
          { ns: CRM_NS },
        )}
        description={t(
          erpProcess.status === 'success'
            ? 'customerManagement.erpCreate.progress.successDescription'
            : erpProcess.status === 'error'
              ? 'customerManagement.erpCreate.progress.errorDescription'
              : 'customerManagement.erpCreate.progress.runningDescription',
          { ns: CRM_NS, name: erpProcess.customer?.name ?? '' },
        )}
        operationLabel={t('customerManagement.erpCreate.progress.operationLabel', { ns: CRM_NS })}
        operationId={erpProcess.customer
          ? `CRM-${new Date().getFullYear()}-${String(erpProcess.customer.id).padStart(6, '0')}`
          : undefined}
        icon={<CloudUpload />}
        progress={erpProcess.status === 'success' ? 100 : null}
        steps={erpProcessSteps}
        resultLabel={t('customerManagement.erpCreate.progress.resultLabel', { ns: CRM_NS })}
        resultValue={
          erpProcess.result?.erpIntegrationNumber
          || erpProcess.result?.customerCode
          || erpProcess.result?.accountingCode
          || null
        }
        errorMessage={erpProcess.errorMessage}
        technicalDetails={erpProcess.technicalDetails}
        allowCloseWhileRunning
        labels={{
          runStatus: t('customerManagement.erpCreate.progress.runStatus', { ns: CRM_NS }),
          successStatus: t('customerManagement.erpCreate.progress.successStatus', { ns: CRM_NS }),
          errorStatus: t('customerManagement.erpCreate.progress.errorStatus', { ns: CRM_NS }),
          technicalDetails: t('customerManagement.erpCreate.progress.technicalDetails', { ns: CRM_NS }),
          retry: t('customerManagement.erpCreate.progress.retry', { ns: CRM_NS }),
          saveDraft: t('customerManagement.erpCreate.progress.saveDraft', { ns: CRM_NS }),
          viewRecord: t('customerManagement.erpCreate.progress.viewRecord', { ns: CRM_NS }),
          close: t('customerManagement.erpCreate.progress.close', { ns: CRM_NS }),
          continueInBackground: t('customerManagement.erpCreate.progress.continueInBackground', { ns: CRM_NS }),
          progressLabel: t('customerManagement.erpCreate.progress.progressLabel', { ns: CRM_NS }),
        }}
        onOpenChange={(open) => setErpProcess((current) => ({ ...current, open }))}
        onRetry={handleErpCreateRetry}
        onSaveDraft={() => setErpProcess((current) => ({ ...current, open: false }))}
        onViewRecord={() => {
          const customerId = erpProcess.result?.id ?? erpProcess.customer?.id;
          setErpProcess((current) => ({ ...current, open: false }));
          if (customerId) navigate(`/customer-360/${customerId}`);
        }}
      />
    </>
  );
}

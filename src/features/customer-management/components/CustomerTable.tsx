import { type ReactElement, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { DataTableGrid, type DataTableGridColumn } from '@/components/shared';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
} from 'lucide-react';
import { Alert02Icon } from 'hugeicons-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { MANAGEMENT_DATA_GRID_CLASSNAME } from '@/lib/management-list-layout';
import { useCrudPermissions } from '@/features/access-control/hooks/useCrudPermissions';

const CRM_NS = 'customer-management' as const;

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
}

const idColumnSurface =
  'bg-slate-200/70 dark:bg-white/[0.07] border-r border-slate-300/90 dark:border-white/10';

export const getColumnsConfig = (t: TFunction): ColumnDef<CustomerDto>[] => [
  {
    key: 'id',
    label: tc(t, 'customerManagement.table.id'),
    type: 'text',
    headClassName: idColumnSurface,
    className: cn(
      'text-center font-medium w-[48px] md:w-[60px]',
      'bg-slate-100/80 dark:bg-white/[0.04]',
      'border-r border-slate-200/90 dark:border-white/[0.08]'
    ),
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
          <Tag size={14} className="text-pink-500" />
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
          <Calendar size={14} className="text-pink-500/50" />
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
}: CustomerTableProps): ReactElement {
  const { t, i18n } = useTranslation(['customer-management', 'common']);
  const { canUpdate, canDelete } = useCrudPermissions('customers.customer-management.view');
  const navigate = useNavigate();
  const deleteCustomer = useDeleteCustomer();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerDto | null>(null);

  const tableColumns = useMemo(
    () => getColumnsConfig(t),
    [t, i18n.language, i18n.resolvedLanguage]
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
        toast.success(
          t('messages.deleteSuccess', {
            ns: CRM_NS,
            defaultValue: t('delete.success', { ns: CRM_NS }),
          })
        );
      } catch (error) {
        console.error(error);
        toast.error(
          t('messages.deleteError', {
            ns: CRM_NS,
            defaultValue: t('delete.error', { ns: CRM_NS }),
          })
        );
      }
    }
  };

  const cellRenderer = (row: CustomerDto, key: CustomerColumnKey): React.ReactNode => {
    const col = tableColumns.find((c) => c.key === key);
    const inner =
      col != null
        ? renderCellContent(row, col, i18n)
        : row[key] == null
          ? '-'
          : String(row[key]);

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
      <Button
        variant="ghost"
        size="icon"
        onClick={() => onQuickActivity(customer)}
        title={t('quickActivity', { ns: CRM_NS })}
        className="h-8 w-8 text-pink-600 hover:text-pink-700 hover:bg-pink-50 dark:text-pink-400 dark:hover:bg-pink-500/10"
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
    </>
  );
}

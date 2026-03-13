import { type ReactElement, useState, useMemo } from 'react';
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
import { Badge } from '@/components/ui/badge';
import { useDeleteContact } from '../hooks/useDeleteContact';
import type { ContactDto } from '../types/contact-types';
import {
  Edit2,
  Trash2,
  Mail,
  Phone,
  Smartphone,
  Calendar,
  User,
  Building2,
  Briefcase,
  Activity,
} from 'lucide-react';
import { Alert02Icon } from 'hugeicons-react';
import { toast } from 'sonner';

export interface ColumnDef<T> {
  key: keyof T;
  label: string;
  type: 'text' | 'email' | 'phone' | 'mobile' | 'date' | 'user' | 'customer' | 'title' | 'status' | 'salutation';
  className?: string;
}

type ContactColumnKey = keyof ContactDto;

interface ContactTableProps {
  columns: DataTableGridColumn<ContactColumnKey>[];
  visibleColumnKeys: ContactColumnKey[];
  rows: ContactDto[];
  rowKey: (row: ContactDto) => string | number;
  sortBy: ContactColumnKey;
  sortDirection: 'asc' | 'desc';
  onSort: (key: ContactColumnKey) => void;
  renderSortIcon: (key: ContactColumnKey) => React.ReactNode;
  isLoading?: boolean;
  loadingText?: string;
  errorText?: string;
  emptyText?: string;
  minTableWidthClassName?: string;
  showActionsColumn?: boolean;
  actionsHeaderLabel?: string;
  onEdit: (contact: ContactDto) => void;
  onQuickActivity: (contact: ContactDto) => void;
  rowClassName?: string | ((row: ContactDto) => string | undefined);
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

export const getColumnsConfig = (t: TFunction): ColumnDef<ContactDto>[] => [
  { key: 'id', label: t('contactManagement.table.id'), type: 'text', className: 'font-medium w-[60px] md:w-[80px]' },
  { key: 'salutation', label: t('contactManagement.table.salutation'), type: 'salutation', className: 'w-[96px] md:w-[120px]' },
  { key: 'fullName', label: t('contactManagement.table.fullName'), type: 'text', className: 'font-semibold text-slate-900 dark:text-white min-w-[160px] md:min-w-[200px]' },
  { key: 'email', label: t('contactManagement.table.email'), type: 'email', className: 'min-w-[160px] md:min-w-[200px] break-all' },
  { key: 'phone', label: t('contactManagement.table.phone'), type: 'phone', className: 'whitespace-nowrap' },
  { key: 'mobile', label: t('contactManagement.table.mobile'), type: 'mobile', className: 'whitespace-nowrap' },
  { key: 'customerName', label: t('contactManagement.table.customer'), type: 'customer', className: 'min-w-[160px] md:min-w-[200px]' },
  { key: 'titleName', label: t('contactManagement.table.title'), type: 'title', className: 'min-w-[120px] md:min-w-[150px]' },
  { key: 'createdDate', label: t('contactManagement.table.createdDate'), type: 'date', className: 'whitespace-nowrap' },
  { key: 'createdByFullUser', label: t('contactManagement.table.createdBy'), type: 'user', className: 'whitespace-nowrap' },
  { key: 'status', label: t('contactManagement.table.status'), type: 'status', className: 'w-[84px] md:w-[100px]' },
];

function renderCellContent(
  item: ContactDto,
  column: ColumnDef<ContactDto>,
  t: (key: string) => string,
  i18n: { language: string }
): React.ReactNode {
  const value = item[column.key];
  if (column.key === 'fullName') {
    const composedFullName = [item.firstName, item.middleName, item.lastName].filter(Boolean).join(' ').trim();
    if (composedFullName) return composedFullName;
  }

  if (!value && value !== 0) return '-';

  switch (column.type) {
    case 'email':
      return (
        <div className="flex items-start gap-2">
          <Mail size={14} className="text-blue-500 mt-0.5 shrink-0" />
          {String(value)}
        </div>
      );
    case 'phone':
      return (
        <div className="flex items-center gap-2">
          <Phone size={14} className="text-orange-500" />
          {String(value)}
        </div>
      );
    case 'mobile':
      return (
        <div className="flex items-center gap-2">
          <Smartphone size={14} className="text-green-500" />
          {String(value)}
        </div>
      );
    case 'customer':
      return (
        <div className="flex items-start gap-2">
          <Building2 size={14} className="text-slate-400 mt-0.5 shrink-0" />
          {String(value)}
        </div>
      );
    case 'title':
      return (
        <div className="flex items-start gap-2">
          <Briefcase size={14} className="text-slate-400 mt-0.5 shrink-0" />
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
    case 'user':
      return (
        <div className="flex items-center gap-2 text-xs">
          <User size={14} className="text-indigo-500/50" />
          {String(value)}
        </div>
      );
    case 'status':
      return (
        <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border-emerald-100 dark:border-emerald-500/20 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 shadow-none font-medium">
          {value ? String(value) : t('common.active')}
        </Badge>
      );
    case 'salutation': {
      const salutationValue = Number(value);
      const salutationText =
        salutationValue === 1
          ? t('contactManagement.form.salutationMr')
          : salutationValue === 2
            ? t('contactManagement.form.salutationMs')
            : salutationValue === 3
              ? t('contactManagement.form.salutationMrs')
              : salutationValue === 4
                ? t('contactManagement.form.salutationDr')
                : t('contactManagement.form.salutationNone');
      return (
        <Badge variant="outline" className="text-xs font-medium">
          {salutationText}
        </Badge>
      );
    }
    default:
      return String(value);
  }
}

export function ContactTable({
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
  minTableWidthClassName = 'min-w-[900px] lg:min-w-[1100px]',
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
}: ContactTableProps): ReactElement {
  const { t, i18n } = useTranslation(['contact-management', 'common']);
  const deleteContact = useDeleteContact();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedContact, setSelectedContact] = useState<ContactDto | null>(null);

  const tableColumns = useMemo(() => getColumnsConfig(t), [t]);

  const handleDeleteClick = (contact: ContactDto): void => {
    setSelectedContact(contact);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async (): Promise<void> => {
    if (selectedContact) {
      try {
        await deleteContact.mutateAsync(selectedContact.id);
        setDeleteDialogOpen(false);
        setSelectedContact(null);
        toast.success(t('contactManagement.delete.success'));
      } catch {
        toast.error(t('contactManagement.delete.error'));
      }
    }
  };

  const cellRenderer = (row: ContactDto, key: ContactColumnKey): React.ReactNode => {
    const col = tableColumns.find((c) => c.key === key);
    if (col) return renderCellContent(row, col, t, i18n);
    const val = row[key];
    if (val == null) return '-';
    return String(val);
  };

  const renderActionsCell = (contact: ContactDto): ReactElement => (
    <div className="flex justify-end gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => onEdit(contact)}
        className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-500/10"
      >
        <Edit2 size={16} />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => onQuickActivity(contact)}
        className="h-8 w-8 text-pink-600 hover:text-pink-700 hover:bg-pink-50 dark:text-pink-400 dark:hover:bg-pink-500/10"
        title={t('contactManagement.quickActivity')}
      >
        <Activity size={16} />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => handleDeleteClick(contact)}
        className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10"
      >
        <Trash2 size={16} />
      </Button>
    </div>
  );

  return (
    <>
      <DataTableGrid<ContactDto, ContactColumnKey>
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
      />

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="bg-white dark:bg-[#130822] border border-slate-100 dark:border-white/10 text-slate-900 dark:text-white w-[90%] sm:w-full max-w-md rounded-2xl shadow-2xl overflow-hidden p-0 gap-0">
          <DialogHeader className="flex flex-col items-center gap-4 text-center pb-6 pt-10 px-6">
            <div className="h-20 w-20 rounded-full bg-red-50 dark:bg-red-500/10 flex items-center justify-center mb-2 animate-in zoom-in duration-300">
              <Alert02Icon size={36} className="text-red-600 dark:text-red-500" />
            </div>
            <div className="space-y-2">
              <DialogTitle className="text-2xl font-bold text-slate-900 dark:text-white">
                {t('contactManagement.delete.confirmTitle')}
              </DialogTitle>
              <DialogDescription className="text-slate-500 dark:text-slate-400 max-w-[280px] mx-auto text-sm leading-relaxed">
                {t('contactManagement.delete.confirmMessage', {
                  name: selectedContact?.fullName || '',
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
              {t('common.cancel')}
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={deleteContact.isPending}
              className="flex-1 h-12 rounded-xl bg-linear-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white border-0 shadow-lg shadow-red-500/20 transition-all hover:scale-[1.02] font-bold"
            >
              {deleteContact.isPending ? <span className="animate-pulse">{t('contactManagement.loading')}</span> : null}
              {t('contactManagement.delete.action')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

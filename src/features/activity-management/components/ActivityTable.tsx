import { type ReactElement, useState, useMemo } from 'react';
import type { TFunction } from 'i18next';
import { useTranslation } from 'react-i18next';
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
import { useDeleteActivity } from '../hooks/useDeleteActivity';
import { useUpdateActivity } from '../hooks/useUpdateActivity';
import type { ActivityDto } from '../types/activity-types';
import { ActivityStatus } from '../types/activity-types';
import { toUpdateActivityDto } from '../utils/to-update-activity-dto';
import { ActivityStatusBadge } from './ActivityStatusBadge';
import { ActivityPriorityBadge } from './ActivityPriorityBadge';
import {
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  Calendar,
  User,
  Building2,
  Briefcase,
  List,
  Mail,
} from 'lucide-react';
import { Alert02Icon } from 'hugeicons-react';
import { GoogleCustomerMailDialog } from '@/features/google-integration/components/GoogleCustomerMailDialog';
import { OutlookCustomerMailDialog } from '@/features/outlook-integration/components/OutlookCustomerMailDialog';

export interface ColumnDef<T> {
  key: keyof T | string;
  label: string;
  type: 'text' | 'date' | 'user' | 'status' | 'priority' | 'customer' | 'contact' | 'actions';
  className?: string;
}

export const getColumnsConfig = (t: TFunction): ColumnDef<ActivityDto>[] => [
  { key: 'id', label: t('activityManagement.id'), type: 'text', className: 'font-medium w-[48px] md:w-[60px]' },
  { key: 'subject', label: t('activityManagement.subject'), type: 'text', className: 'font-semibold text-slate-900 dark:text-white min-w-[160px] md:min-w-[200px]' },
  { key: 'activityType', label: t('activityManagement.activityType'), type: 'text', className: 'whitespace-nowrap' },
  { key: 'status', label: t('activityManagement.status'), type: 'status', className: 'whitespace-nowrap' },
  { key: 'priority', label: t('activityManagement.priority'), type: 'priority', className: 'whitespace-nowrap' },
  { key: 'potentialCustomer', label: t('activityManagement.customer'), type: 'customer', className: 'min-w-[120px] md:min-w-[150px]' },
  { key: 'contact', label: t('activityManagement.contact'), type: 'contact', className: 'min-w-[120px] md:min-w-[150px]' },
  { key: 'assignedUser', label: t('activityManagement.assignedUser'), type: 'user', className: 'whitespace-nowrap' },
  { key: 'startDateTime', label: t('activityManagement.activityDate'), type: 'date', className: 'whitespace-nowrap' },
];

interface ActivityTableProps {
  columns: DataTableGridColumn<string>[];
  visibleColumnKeys: string[];
  rows: ActivityDto[];
  rowKey: (row: ActivityDto) => string | number;
  sortBy: string;
  sortDirection: 'asc' | 'desc';
  onSort: (key: string) => void;
  renderSortIcon: (key: string) => React.ReactNode;
  isLoading?: boolean;
  loadingText?: string;
  errorText?: string;
  emptyText?: string;
  minTableWidthClassName?: string;
  showActionsColumn?: boolean;
  actionsHeaderLabel?: string;
  onEdit: (activity: ActivityDto) => void;
  userId?: number;
  rowClassName?: string | ((row: ActivityDto) => string | undefined);
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

function normalizeStatus(value: string | number): ActivityStatus | null {
  if (typeof value === 'number') {
    if (value === ActivityStatus.Scheduled || value === ActivityStatus.Completed || value === ActivityStatus.Cancelled) {
      return value;
    }
    return null;
  }
  if (value === 'Scheduled') return ActivityStatus.Scheduled;
  if (value === 'Completed') return ActivityStatus.Completed;
  if (value === 'Cancelled' || value === 'Canceled') return ActivityStatus.Cancelled;
  return null;
}

function renderCellContent(
  item: ActivityDto,
  column: ColumnDef<ActivityDto>,
  i18n: { language: string }
): React.ReactNode {
  const value = item[column.key as keyof ActivityDto];

  switch (column.type) {
    case 'status':
      return <ActivityStatusBadge status={item.status} />;
    case 'priority':
      return <ActivityPriorityBadge priority={item.priority} />;
    case 'date': {
      const dateValue =
        typeof value === 'string' || typeof value === 'number' || value instanceof Date ? value : null;
      return (
        <div className="flex items-center gap-2 text-xs">
          <Calendar size={14} className="text-pink-500/50" />
          {dateValue ? new Date(dateValue).toLocaleDateString(i18n.language) : '-'}
        </div>
      );
    }
    case 'customer':
      return item.potentialCustomer ? (
        <div className="flex items-start gap-2">
          <Building2 size={14} className="text-slate-400 mt-0.5 shrink-0" />
          <span className="truncate max-w-[150px]" title={item.potentialCustomer.name}>
            {item.potentialCustomer.name}
          </span>
        </div>
      ) : '-';
    case 'contact':
      return item.contact ? (
        <div className="flex items-start gap-2">
          <Briefcase size={14} className="text-slate-400 mt-0.5 shrink-0" />
          <span className="truncate max-w-[150px]" title={item.contact.fullName || item.contact.firstName}>
            {item.contact.fullName || `${item.contact.firstName || ''} ${item.contact.lastName || ''}`.trim()}
          </span>
        </div>
      ) : '-';
    case 'user':
      return item.assignedUser ? (
        <div className="flex items-center gap-2 text-xs">
          <User size={14} className="text-indigo-500/50" />
          {item.assignedUser.fullName || item.assignedUser.userName}
        </div>
      ) : '-';
    default:
      if (column.key === 'activityType') {
        const display =
          value != null && typeof value === 'object' && 'name' in value
            ? (value as { name: string }).name
            : String(value ?? '');
        return (
          <div className="flex items-center gap-2">
            <List size={14} className="text-pink-500" />
            {display}
          </div>
        );
      }
      return String(value ?? '-');
  }
}

export function ActivityTable({
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
  minTableWidthClassName = 'min-w-[1100px]',
  showActionsColumn = true,
  actionsHeaderLabel = '',
  onEdit,
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
}: ActivityTableProps): ReactElement {
  const { t, i18n } = useTranslation(['activity-management', 'common', 'outlook-integration']);
  const deleteActivity = useDeleteActivity();
  const updateActivity = useUpdateActivity();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [mailDialogOpen, setMailDialogOpen] = useState(false);
  const [outlookMailDialogOpen, setOutlookMailDialogOpen] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState<ActivityDto | null>(null);

  const tableColumns = useMemo(() => getColumnsConfig(t), [t]);
  const columnMap = useMemo(() => new Map(tableColumns.map((c) => [c.key as string, c])), [tableColumns]);

  const handleDeleteClick = (activity: ActivityDto): void => {
    setSelectedActivity(activity);
    setDeleteDialogOpen(true);
  };

  const handleMailClick = (activity: ActivityDto): void => {
    setSelectedActivity(activity);
    setMailDialogOpen(true);
  };

  const handleOutlookMailClick = (activity: ActivityDto): void => {
    setSelectedActivity(activity);
    setOutlookMailDialogOpen(true);
  };

  const handleDeleteConfirm = async (): Promise<void> => {
    if (selectedActivity) {
      await deleteActivity.mutateAsync(selectedActivity.id);
      setDeleteDialogOpen(false);
      setSelectedActivity(null);
    }
  };

  const handleStatusChange = async (activity: ActivityDto, newStatus: ActivityStatus): Promise<void> => {
    await updateActivity.mutateAsync({
      id: activity.id,
      data: toUpdateActivityDto(activity, { status: newStatus }),
    });
  };

  const cellRenderer = (row: ActivityDto, key: string): React.ReactNode => {
    const col = columnMap.get(key);
    if (col) return renderCellContent(row, col, i18n);
    const val = row[key as keyof ActivityDto];
    return String(val ?? '-');
  };

  const renderActionsCell = (activity: ActivityDto): ReactElement => {
    const normalizedStatus = normalizeStatus(activity.status);
    const isCompleted = normalizedStatus === ActivityStatus.Completed;
    const isCancelled = normalizedStatus === ActivityStatus.Cancelled;

    return (
      <div className="flex justify-end gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
        {!isCompleted && !isCancelled && (
          <>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-green-600 hover:bg-green-50 dark:text-green-400"
              onClick={() => handleStatusChange(activity, ActivityStatus.Completed)}
              title={t('activityManagement.complete', { defaultValue: 'Tamamla' })}
            >
              <CheckCircle2 size={16} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-orange-600 hover:bg-orange-50 dark:text-orange-400"
              onClick={() => handleStatusChange(activity, ActivityStatus.Cancelled)}
              title={t('activityManagement.cancel', { defaultValue: 'İptal Et' })}
            >
              <XCircle size={16} />
            </Button>
            <div className="w-px h-4 bg-slate-200 dark:bg-white/10 mx-1 self-center" />
          </>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-blue-600 hover:bg-blue-50 dark:text-blue-400"
          onClick={() => onEdit(activity)}
        >
          <Edit2 size={16} />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-indigo-600 hover:bg-indigo-50 dark:text-indigo-400"
          onClick={() => handleMailClick(activity)}
          title={t('google-integration:mailDialog.openButton', { defaultValue: 'Mail' })}
        >
          <Mail size={16} />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-sky-600 hover:bg-sky-50 dark:text-sky-400"
          onClick={() => handleOutlookMailClick(activity)}
          title={t('outlook-integration:mailDialog.openButton', { defaultValue: 'Outlook Mail' })}
        >
          <Mail size={16} />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-red-600 hover:bg-red-50 dark:text-red-400"
          onClick={() => handleDeleteClick(activity)}
        >
          <Trash2 size={16} />
        </Button>
      </div>
    );
  };

  return (
    <>
      <DataTableGrid<ActivityDto, string>
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
        <DialogContent className="max-w-sm bg-white dark:bg-[#0f0a18] border border-slate-200 dark:border-white/10 rounded-xl p-0 overflow-hidden">
          <DialogHeader className="px-6 py-5 border-b border-slate-100 dark:border-white/10">
            <DialogTitle className="text-base font-semibold text-slate-900 dark:text-white flex items-center gap-2">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400">
                <Alert02Icon size={18} />
              </span>
              {t('activityManagement.deleteActivity')}
            </DialogTitle>
            <DialogDescription className="text-slate-500 dark:text-slate-400 text-sm mt-2">
              {t('activityManagement.deleteConfirmation')}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="px-6 py-4 border-t border-slate-100 dark:border-white/10 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)} className="h-9 px-4 rounded-lg text-sm">
              {t('common.cancel')}
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={deleteActivity.isPending}
              className="h-9 px-4 rounded-lg text-sm"
            >
              {deleteActivity.isPending ? t('common.deleting') : t('common.delete.action')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <GoogleCustomerMailDialog
        open={mailDialogOpen}
        onOpenChange={setMailDialogOpen}
        moduleKey="activity"
        recordId={selectedActivity?.id ?? 0}
        customerId={selectedActivity?.potentialCustomerId}
        contactId={selectedActivity?.contactId}
        customerName={selectedActivity?.potentialCustomer?.name}
        contactName={selectedActivity?.contact?.fullName}
      />
      <OutlookCustomerMailDialog
        open={outlookMailDialogOpen}
        onOpenChange={setOutlookMailDialogOpen}
        moduleKey="activity"
        recordId={selectedActivity?.id ?? 0}
        customerId={selectedActivity?.potentialCustomerId}
        contactId={selectedActivity?.contactId}
        customerName={selectedActivity?.potentialCustomer?.name}
        contactName={selectedActivity?.contact?.fullName}
      />
    </>
  );
}

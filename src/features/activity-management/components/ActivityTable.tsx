import { type ReactElement, useState, useMemo } from 'react';
import type { TFunction } from 'i18next';
import { useTranslation } from 'react-i18next';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
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
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  CheckCircle2,
  XCircle,
  Calendar,
  User,
  Building2,
  Briefcase,
  List,
  EyeOff,
  ChevronDown,
} from 'lucide-react';
import { Alert02Icon } from 'hugeicons-react';

export interface ColumnDef<T> {
  key: keyof T | string;
  label: string;
  type: 'text' | 'date' | 'user' | 'status' | 'priority' | 'customer' | 'contact' | 'actions';
  className?: string;
}

interface ActivityTableProps {
  activities: ActivityDto[];
  isLoading: boolean;
  onEdit: (activity: ActivityDto) => void;
  pageNumber: number;
  pageSize: number;
  totalCount: number;
  sortBy: string;
  sortDirection: 'asc' | 'desc';
  onPageChange: (page: number) => void;
  onSortChange: (sortBy: string, sortDirection: 'asc' | 'desc') => void;
}

const getColumnsConfig = (t: TFunction): ColumnDef<ActivityDto>[] => [
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

export function ActivityTable({
  activities,
  isLoading,
  onEdit,
  pageNumber,
  pageSize,
  totalCount,
  sortBy,
  sortDirection,
  onPageChange,
  onSortChange,
}: ActivityTableProps): ReactElement {
  const { t, i18n } = useTranslation();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState<ActivityDto | null>(null);

  const tableColumns = useMemo(() => getColumnsConfig(t), [t]);

  const [visibleColumns, setVisibleColumns] = useState<string[]>(
    tableColumns.map((column) => column.key as string)
  );

  const deleteActivity = useDeleteActivity();
  const updateActivity = useUpdateActivity();

  const totalPages = Math.ceil(totalCount / pageSize);

  const handleDeleteClick = (activity: ActivityDto): void => {
    setSelectedActivity(activity);
    setDeleteDialogOpen(true);
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

  const handleSort = (key: string): void => {
    let newDirection: 'asc' | 'desc' = 'asc';
    if (sortBy === key && sortDirection === 'asc') {
      newDirection = 'desc';
    }
    onSortChange(key, newDirection);
  };

  const toggleColumn = (key: string): void => {
    setVisibleColumns((prev) =>
      prev.includes(key) ? prev.filter((columnKey) => columnKey !== key) : [...prev, key]
    );
  };

  const renderCellContent = (item: ActivityDto, column: ColumnDef<ActivityDto>): ReactElement | string => {
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
              {item.contact.fullName || `${item.contact.firstName || ''} ${item.contact.lastName || ''}`}
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
          const display = value != null && typeof value === 'object' && 'name' in value ? (value as { name: string }).name : String(value ?? '');
          return <div className="flex items-center gap-2"><List size={14} className="text-pink-500" />{display}</div>;
        }
        return String(value ?? '-');
    }
  };

  const SortIcon = ({ column }: { column: string }): ReactElement => {
    if (sortBy !== column) {
      return <ArrowUpDown size={14} className="ml-2 inline-block text-slate-400 opacity-50 group-hover:opacity-100 transition-opacity" />;
    }
    return sortDirection === 'asc' ? (
      <ArrowUp size={14} className="ml-2 inline-block text-pink-600 dark:text-pink-400" />
    ) : (
      <ArrowDown size={14} className="ml-2 inline-block text-pink-600 dark:text-pink-400" />
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20 min-h-[400px]">
        <div className="flex flex-col items-center gap-2">
          <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-current text-pink-500" />
          <div className="text-sm text-muted-foreground animate-pulse">{t('common.loading')}</div>
        </div>
      </div>
    );
  }

  if (!activities || activities.length === 0) {
    return (
      <div className="flex items-center justify-center py-20 min-h-[400px]">
        <div className="text-muted-foreground bg-slate-50 dark:bg-white/5 px-8 py-6 rounded-xl border border-dashed border-slate-200 dark:border-white/10 text-sm font-medium">
          {t('common.noData')}
        </div>
      </div>
    );
  }

  const headStyle = 'cursor-pointer select-none text-slate-500 dark:text-slate-400 hover:text-pink-600 dark:hover:text-pink-400 transition-colors py-4 font-bold text-xs uppercase tracking-wider whitespace-nowrap';
  const cellStyle = 'text-slate-600 dark:text-slate-400 text-sm py-4 border-b border-slate-100 dark:border-white/5 align-middle';

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end p-2 sm:p-0">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="ml-auto h-9 lg:flex border-dashed border-slate-300 dark:border-white/20 bg-transparent hover:bg-slate-50 dark:hover:bg-white/5 text-xs sm:text-sm">
              <EyeOff className="mr-2 h-4 w-4" />
              {t('common.editColumns')}
              <ChevronDown className="ml-2 h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 max-h-[400px] overflow-y-auto bg-white/95 dark:bg-[#1a1025]/95 backdrop-blur-xl border border-slate-200 dark:border-white/10 shadow-xl rounded-xl p-2 z-50">
            <DropdownMenuLabel className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider px-2 py-1.5">
              {t('common.visibleColumns')}
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-slate-200 dark:bg-white/10 my-1" />
            {tableColumns.map((column) => (
              <DropdownMenuCheckboxItem
                key={column.key as string}
                checked={visibleColumns.includes(column.key as string)}
                onSelect={(event) => event.preventDefault()}
                onCheckedChange={() => toggleColumn(column.key as string)}
                className="text-sm text-slate-700 dark:text-slate-200 focus:bg-pink-50 dark:focus:bg-pink-500/10 focus:text-pink-600 dark:focus:text-pink-400 cursor-pointer rounded-lg px-2 py-1.5 pl-8 relative"
              >
                {column.label}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="rounded-xl border border-slate-200 dark:border-white/10 bg-white/50 dark:bg-transparent overflow-hidden">
        <div className="overflow-x-auto">
          <Table className="w-full"
                 style={{ minWidth: '1100px' }}>
            <TableHeader className="bg-slate-50/50 dark:bg-white/5">
              <TableRow className="border-b border-slate-200 dark:border-white/10 hover:bg-transparent">
                {tableColumns.filter((column) => visibleColumns.includes(column.key as string)).map((column) => (
                  <TableHead key={column.key as string} onClick={() => handleSort(column.key as string)} className={headStyle}>
                    <div className="flex items-center gap-2">
                      {column.label}
                      <SortIcon column={column.key as string} />
                    </div>
                  </TableHead>
                ))}
                <TableHead className={`${headStyle} text-right w-[110px] md:w-[140px]`}>
                  {t('common.actions')}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {activities.map((item: ActivityDto, index: number) => {
                const normalizedStatus = normalizeStatus(item.status);
                const isCompleted = normalizedStatus === ActivityStatus.Completed;
                const isCancelled = normalizedStatus === ActivityStatus.Cancelled;

                return (
                  <TableRow
                    key={item.id || `activity-${index}`}
                    className={`
                      border-b border-slate-100 dark:border-white/5 transition-colors duration-200 group last:border-0
                      ${isCompleted ? 'bg-slate-50/50 dark:bg-white/5 opacity-60 grayscale' : 'hover:bg-pink-50/40 dark:hover:bg-pink-500/5'}
                    `}
                  >
                    {tableColumns.filter((column) => visibleColumns.includes(column.key as string)).map((column) => (
                      <TableCell key={`${item.id}-${column.key}`} className={`${cellStyle} ${column.className || ''}`}>
                        {renderCellContent(item, column)}
                      </TableCell>
                    ))}

                    <TableCell className={`${cellStyle} text-right`}>
                      <div className="flex justify-end gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                        {!isCompleted && !isCancelled && (
                          <>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-green-600 hover:bg-green-50 dark:text-green-400" onClick={() => handleStatusChange(item, ActivityStatus.Completed)} title="Tamamla"><CheckCircle2 size={16} /></Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-orange-600 hover:bg-orange-50 dark:text-orange-400" onClick={() => handleStatusChange(item, ActivityStatus.Cancelled)} title="İptal Et"><XCircle size={16} /></Button>
                            <div className="w-px h-4 bg-slate-200 dark:bg-white/10 mx-1 self-center" />
                          </>
                        )}

                        <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600 hover:bg-blue-50 dark:text-blue-400" onClick={() => onEdit(item)}><Edit2 size={16} /></Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600 hover:bg-red-50 dark:text-red-400" onClick={() => handleDeleteClick(item)}><Trash2 size={16} /></Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        {totalPages > 1 && (
          <div className="border-t border-slate-200 dark:border-white/10 p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="text-xs text-slate-500 dark:text-slate-400 order-2 sm:order-1">
              {t('common.paginationInfo', {
                start: (pageNumber - 1) * pageSize + 1,
                end: Math.min(pageNumber * pageSize, totalCount),
                total: totalCount,
              })}
            </div>
            <div className="flex items-center gap-2 order-1 sm:order-2">
              <Button variant="outline" size="sm" onClick={() => onPageChange(pageNumber - 1)} disabled={pageNumber <= 1} className="h-8 px-3 text-xs border-slate-300 dark:border-white/20">
                {t('common.previous')}
              </Button>
              <span className="text-xs text-slate-600 dark:text-slate-300 px-2">{pageNumber} / {totalPages}</span>
              <Button variant="outline" size="sm" onClick={() => onPageChange(pageNumber + 1)} disabled={pageNumber >= totalPages} className="h-8 px-3 text-xs border-slate-300 dark:border-white/20">
                {t('common.next')}
              </Button>
            </div>
          </div>
        )}
      </div>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="max-w-sm bg-white dark:bg-[#0f0a18] border border-slate-200 dark:border-white/10 rounded-xl p-0 overflow-hidden">
          <DialogHeader className="px-6 py-5 border-b border-slate-100 dark:border-white/10">
            <DialogTitle className="text-base font-semibold text-slate-900 dark:text-white flex items-center gap-2">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400"><Alert02Icon size={18} /></span>
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
            <Button variant="destructive" onClick={handleDeleteConfirm} disabled={deleteActivity.isPending} className="h-9 px-4 rounded-lg text-sm">
              {deleteActivity.isPending ? t('common.deleting') : t('common.delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

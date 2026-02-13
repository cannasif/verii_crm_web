import { type ReactElement, useState, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import {
  DndContext, 
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  horizontalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { 
  Edit2, 
  Trash2, 
  ArrowUpDown, 
  ArrowUp, 
  ArrowDown, 
  CheckCircle2,
  XCircle,
  Loader2,
  Calendar,
  GripVertical
} from 'lucide-react';
import { Alert02Icon } from 'hugeicons-react';
import { useDeletePaymentType } from '../hooks/useDeletePaymentType';
import type { PaymentTypeDto } from '../types/payment-type-types';

export interface ColumnDef<T> {
  key: keyof T | 'status';
  label: string;
  type: 'text' | 'date' | 'status' | 'code' | 'id';
  className?: string;
}

interface PaymentTypeTableProps {
  paymentTypes: PaymentTypeDto[];
  isLoading: boolean;
  onEdit: (paymentType: PaymentTypeDto) => void;
  visibleColumns: Array<keyof PaymentTypeDto | 'status'>;
  pageSize: number;
  columnOrder?: string[];
  onColumnOrderChange?: (order: string[]) => void;
}

export const getColumnsConfig = (t: TFunction): ColumnDef<PaymentTypeDto>[] => [
    { key: 'id', label: t('paymentTypeManagement.table.id'), type: 'id', className: 'w-[100px]' },
    { key: 'name', label: t('paymentTypeManagement.table.name'), type: 'text', className: 'min-w-[200px] font-medium' },
    { key: 'description', label: t('paymentTypeManagement.table.description'), type: 'text', className: 'min-w-[200px]' },
    { key: 'createdDate', label: t('paymentTypeManagement.createdDate'), type: 'date', className: 'w-[160px]' },
    { key: 'updatedDate', label: t('paymentTypeManagement.updatedDate'), type: 'date', className: 'w-[160px]' },
    { key: 'isDeleted', label: t('paymentTypeManagement.table.status'), type: 'status', className: 'w-[120px]' },
];

interface DraggableTableHeadProps extends React.ComponentProps<typeof TableHead> {
  id: string;
}

const DraggableTableHead = ({ id, children, className, ...props }: DraggableTableHeadProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.8 : 1,
    zIndex: isDragging ? 1 : 'auto',
    backgroundColor: isDragging ? 'var(--accent)' : undefined,
  };

  return (
    <TableHead
      ref={setNodeRef}
      style={style}
      className={`${className} ${isDragging ? 'bg-accent/20' : ''}`}
      {...props}
    >
      <div className="flex items-center gap-1">
        <button 
          {...attributes} 
          {...listeners} 
          className="cursor-grab active:cursor-grabbing hover:bg-slate-100 dark:hover:bg-white/10 p-1 rounded transition-colors touch-none"
        >
          <GripVertical size={14} className="text-slate-400/50 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300" />
        </button>
        <div className="flex-1">
          {children}
        </div>
      </div>
    </TableHead>
  );
};

export function PaymentTypeTable({
  paymentTypes,
  isLoading,
  onEdit,
  visibleColumns,
  pageSize,
  columnOrder: externalColumnOrder,
  onColumnOrderChange,
}: PaymentTypeTableProps): ReactElement {
  const { t, i18n } = useTranslation();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedPaymentType, setSelectedPaymentType] = useState<PaymentTypeDto | null>(null);
  const deletePaymentType = useDeletePaymentType();

  const [currentPage, setCurrentPage] = useState(1);

  const [sortConfig, setSortConfig] = useState<{ key: keyof PaymentTypeDto | 'status'; direction: 'asc' | 'desc' } | null>(null);

  const tableColumns = useMemo(() => getColumnsConfig(t), [t]);

  const [internalColumnOrder, setInternalColumnOrder] = useState<string[]>([]);

  useEffect(() => {
    if (externalColumnOrder) return;
    if (tableColumns.length > 0 && internalColumnOrder.length === 0) {
      setInternalColumnOrder(tableColumns.map((c) => c.key as string));
    }
  }, [tableColumns, internalColumnOrder.length, externalColumnOrder]);

  const columnOrder = externalColumnOrder ?? internalColumnOrder;

  const orderedColumns = useMemo(() => {
    return columnOrder
      .filter((key) => visibleColumns.includes(key as keyof PaymentTypeDto | 'status'))
      .map((key) => tableColumns.find((col) => col.key === key))
      .filter((col): col is ColumnDef<PaymentTypeDto> => !!col);
  }, [columnOrder, visibleColumns, tableColumns]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const reorder = (items: string[]) => {
        const oldIndex = items.indexOf(active.id as string);
        const newIndex = items.indexOf(over.id as string);
        return arrayMove(items, oldIndex, newIndex);
      };
      if (onColumnOrderChange) {
        onColumnOrderChange(reorder([...columnOrder]));
      } else {
        setInternalColumnOrder((items) => reorder(items));
      }
    }
  };

  const processedPaymentTypes = useMemo(() => {
    const result = [...paymentTypes];

	    if (sortConfig) {
	      result.sort((a, b) => {
	        const key = String(sortConfig.key);
	        const aRaw = (a as unknown as Record<string, unknown>)[key];
	        const bRaw = (b as unknown as Record<string, unknown>)[key];
	        const aValue = aRaw != null ? String(aRaw).toLowerCase() : '';
	        const bValue = bRaw != null ? String(bRaw).toLowerCase() : '';

        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return result;
  }, [paymentTypes, sortConfig]);

  const totalPages = Math.ceil(processedPaymentTypes.length / pageSize);
  const paginatedPaymentTypes = processedPaymentTypes.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleDeleteClick = (paymentType: PaymentTypeDto): void => {
    setSelectedPaymentType(paymentType);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async (): Promise<void> => {
    if (selectedPaymentType) {
      try {
        await deletePaymentType.mutateAsync(selectedPaymentType.id);
        toast.success(t('paymentTypeManagement.delete.success'));
        setDeleteDialogOpen(false);
        setSelectedPaymentType(null);
      } catch {
        toast.error(t('paymentTypeManagement.delete.error'));
      }
    }
  };

  const handleSort = (key: keyof PaymentTypeDto | 'status') => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const renderCellContent = (item: PaymentTypeDto, column: ColumnDef<PaymentTypeDto>) => {
	    const value = (item as unknown as Record<string, unknown>)[String(column.key)];
    
    if (column.key === 'isDeleted') {
        const isActive = !item.isDeleted;
        
        return (
            <Badge 
                variant="outline" 
                className={`gap-1.5 pl-1.5 pr-2.5 py-0.5 border ${
                    isActive 
                        ? 'bg-green-50 dark:bg-green-500/10 text-green-700 dark:text-green-400 border-green-200 dark:border-green-500/20' 
                        : 'bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400 border-red-200 dark:border-red-500/20'
                }`}
            >
                {isActive ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                {isActive ? t('status.active') : t('status.inactive')}
            </Badge>
        );
    }

    if (!value && value !== 0) return '-';

    switch (column.type) {
        case 'id':
            return <span className="font-mono text-xs text-slate-500">{String(value)}</span>;
        case 'date':
             return <div className="flex items-center gap-2 text-xs"><Calendar size={14} className="text-slate-400" />{new Date(String(value)).toLocaleDateString(i18n.language)}</div>;
        default:
            return String(value);
    }
  };

  const SortIcon = ({ column }: { column: keyof PaymentTypeDto | 'status' }): ReactElement => {
    if (sortConfig?.key !== column) {
      return <ArrowUpDown size={14} className="ml-2 inline-block text-slate-400 opacity-50 group-hover:opacity-100 transition-opacity" />;
    }
    return sortConfig.direction === 'asc' ? (
      <ArrowUp size={14} className="ml-2 inline-block text-pink-600 dark:text-pink-400" />
    ) : (
      <ArrowDown size={14} className="ml-2 inline-block text-pink-600 dark:text-pink-400" />
    );
  };

  const headStyle = "cursor-pointer select-none text-slate-500 dark:text-slate-400 hover:text-pink-600 dark:hover:text-pink-400 transition-colors py-4 font-bold text-xs uppercase tracking-wider whitespace-nowrap";
  const cellStyle = "text-slate-600 dark:text-slate-400 text-sm py-4 border-b border-slate-100 dark:border-white/5 align-middle";

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20 min-h-[400px]">
        <div className="flex flex-col items-center gap-2">
           <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-current text-pink-500" />
           <div className="text-sm text-muted-foreground animate-pulse">
             {t('common.loading')}
           </div>
        </div>
      </div>
    );
  }

  if (paymentTypes.length === 0) {
    return (
      <div className="flex items-center justify-center py-20 min-h-[400px]">
        <div className="text-muted-foreground bg-slate-50 dark:bg-white/5 px-8 py-6 rounded-xl border border-dashed border-slate-200 dark:border-white/10 text-sm font-medium">
          {t('paymentTypeManagement.noData')}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-xl border border-slate-200 dark:border-white/10 overflow-hidden bg-white/50 dark:bg-transparent">
        <DndContext 
          sensors={sensors} 
          collisionDetection={closestCenter} 
          onDragEnd={handleDragEnd}
        >
        <div className="overflow-x-auto">
        <Table className="min-w-[800px] lg:min-w-[1000px]">
          <TableHeader className="bg-slate-50/50 dark:bg-white/5">
            <TableRow className="border-b border-slate-200 dark:border-white/10 hover:bg-transparent">
              <SortableContext 
                items={orderedColumns.map(col => col.key)} 
                strategy={horizontalListSortingStrategy}
              >
              {orderedColumns.map((column) => (
                  <DraggableTableHead
                    key={column.key}
                    id={column.key}
                    className={headStyle}
                    onClick={() => handleSort(column.key)}
                  >
                    <div className="flex items-center gap-2 group cursor-pointer">
                      {column.label}
                      <SortIcon column={column.key} />
                    </div>
                  </DraggableTableHead>
              ))}
              </SortableContext>
              <TableHead className={`text-right ${headStyle} w-[100px]`}>
                {t('common.actions')}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedPaymentTypes.map((paymentType: PaymentTypeDto) => (
              <TableRow 
                key={paymentType.id}
                className="border-b border-slate-100 dark:border-white/5 transition-colors duration-200 hover:bg-pink-50/40 dark:hover:bg-pink-500/5 group last:border-0"
              >
                {orderedColumns.map((column) => (
                    <TableCell key={`${paymentType.id}-${column.key}`} className={cellStyle}>
                        {renderCellContent(paymentType, column)}
                    </TableCell>
                ))}
                <TableCell className="text-right py-3 pr-4">
                  <div className="flex justify-end gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-500/10"
                      onClick={() => onEdit(paymentType)}
                      title={t('common.edit')}
                    >
                      <Edit2 size={16} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10"
                      onClick={() => handleDeleteClick(paymentType)}
                      title={t('common.delete.action')}
                    >
                      <Trash2 size={16} />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        </div>
        </DndContext>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-between py-4 gap-4">
        <div className="text-sm text-slate-500 dark:text-slate-400">
          {t('paymentTypeManagement.table.showing', {
            from: (currentPage - 1) * pageSize + 1,
            to: Math.min(currentPage * pageSize, processedPaymentTypes.length),
            total: processedPaymentTypes.length,
          })}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage <= 1} className="bg-white dark:bg-transparent border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/5">{t('common.previous')}</Button>
          <div className="flex items-center px-4 text-sm font-medium text-slate-700 dark:text-slate-200">{t('paymentTypeManagement.table.page', { current: currentPage, total: totalPages || 1 })}</div>
          <Button variant="outline" size="sm" onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} disabled={currentPage >= totalPages} className="bg-white dark:bg-transparent border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/5">{t('common.next')}</Button>
        </div>
      </div>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="bg-white dark:bg-[#130822] border border-slate-100 dark:border-white/10 text-slate-900 dark:text-white w-[90%] sm:w-full max-w-md rounded-2xl shadow-2xl overflow-hidden p-0 gap-0">
          <DialogHeader className="flex flex-col items-center gap-4 text-center pb-6 pt-10 px-6">
            <div className="h-20 w-20 rounded-full bg-red-50 dark:bg-red-500/10 flex items-center justify-center mb-2 animate-in zoom-in duration-300">
               <Alert02Icon size={36} className="text-red-600 dark:text-red-500" />
            </div>
            <div className="space-y-2">
                <DialogTitle className="text-2xl font-bold text-slate-900 dark:text-white">
                {t('paymentTypeManagement.delete.confirmTitle')}
                </DialogTitle>
                <DialogDescription className="text-slate-500 dark:text-slate-400 max-w-[280px] mx-auto text-sm leading-relaxed">
                {t('paymentTypeManagement.delete.confirmMessage', {
                    name: selectedPaymentType?.name || '',
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
              disabled={deletePaymentType.isPending}
              className="flex-1 h-12 rounded-xl bg-linear-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white border-0 shadow-lg shadow-red-500/20 transition-all hover:scale-[1.02] font-bold"
            >
              {deletePaymentType.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {t('common.delete.action')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

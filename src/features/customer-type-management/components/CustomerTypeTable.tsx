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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useDeleteCustomerType } from '../hooks/useDeleteCustomerType';
import type { CustomerTypeDto } from '../types/customer-type-types';
import { 
  Edit2, 
  Trash2, 
  ArrowUpDown, 
  ArrowUp, 
  ArrowDown,
  Calendar,
  User,
  Tag,
  FileText,
  GripVertical
} from 'lucide-react';
import { Alert02Icon } from 'hugeicons-react';

export interface ColumnDef<T> {
  key: keyof T;
  label: string;
  type: 'text' | 'date' | 'user' | 'badge' | 'description';
  className?: string;
}

interface CustomerTypeTableProps {
  customerTypes: CustomerTypeDto[];
  isLoading: boolean;
  onEdit: (customerType: CustomerTypeDto) => void;
  visibleColumns: Array<keyof CustomerTypeDto>;
  columnOrder?: string[];
  onColumnOrderChange?: (order: string[]) => void;
}

export const getColumnsConfig = (t: TFunction): ColumnDef<CustomerTypeDto>[] => [
    { key: 'id', label: t('customerTypeManagement.table.id'), type: 'text', className: 'font-medium w-[50px] md:w-[70px]' },
    { key: 'name', label: t('customerTypeManagement.table.name'), type: 'badge', className: 'font-semibold text-slate-900 dark:text-white min-w-[140px] md:min-w-[180px]' },
    { key: 'description', label: t('customerTypeManagement.table.description'), type: 'description', className: 'min-w-[180px] md:min-w-[220px]' },
    { key: 'createdDate', label: t('customerTypeManagement.table.createdDate'), type: 'date', className: 'whitespace-nowrap' },
    { key: 'createdByFullUser', label: t('customerTypeManagement.table.createdBy'), type: 'user', className: 'whitespace-nowrap' },
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

export function CustomerTypeTable({
  customerTypes,
  isLoading,
  onEdit,
  visibleColumns,
  columnOrder: externalColumnOrder,
  onColumnOrderChange,
}: CustomerTypeTableProps): ReactElement {
  const { t, i18n } = useTranslation();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedCustomerType, setSelectedCustomerType] = useState<CustomerTypeDto | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
  const [sortConfig, setSortConfig] = useState<{ key: keyof CustomerTypeDto; direction: 'asc' | 'desc' } | null>(null);

  const tableColumns = useMemo(() => getColumnsConfig(t), [t]);

  const [internalColumnOrder, setInternalColumnOrder] = useState<string[]>(tableColumns.map((c) => c.key));

  useEffect(() => {
    if (externalColumnOrder) return;
    setInternalColumnOrder((prevOrder) => {
      const newKeys = tableColumns.map((c) => c.key);
      const existingKeys = prevOrder.filter((key) => newKeys.includes(key as keyof CustomerTypeDto));
      const addedKeys = newKeys.filter((key) => !prevOrder.includes(key));
      return [...existingKeys, ...addedKeys];
    });
  }, [tableColumns, externalColumnOrder]);

  const columnOrder = externalColumnOrder ?? internalColumnOrder;

  const orderedColumns = useMemo(() => {
    return columnOrder
      .filter(key => visibleColumns.includes(key as keyof CustomerTypeDto))
      .map(key => tableColumns.find(col => col.key === key))
      .filter((col): col is ColumnDef<CustomerTypeDto> => !!col);
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
  
  const deleteCustomerType = useDeleteCustomerType();

  // Sıralama Mantığı
  const processedData = useMemo(() => {
    const result = [...customerTypes];
    if (sortConfig) {
      result.sort((a, b) => {
        const aValue = a[sortConfig.key] ? String(a[sortConfig.key]).toLowerCase() : '';
        const bValue = b[sortConfig.key] ? String(b[sortConfig.key]).toLowerCase() : '';
        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return result;
  }, [customerTypes, sortConfig]);

  // Sayfalama Mantığı
  const totalPages = Math.ceil(processedData.length / pageSize);
  const paginatedData = processedData.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleDeleteClick = (customerType: CustomerTypeDto): void => {
    setSelectedCustomerType(customerType);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async (): Promise<void> => {
    if (selectedCustomerType) {
      await deleteCustomerType.mutateAsync(selectedCustomerType.id);
      setDeleteDialogOpen(false);
      setSelectedCustomerType(null);
    }
  };

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === (key as keyof CustomerTypeDto) && sortConfig.direction === 'asc') {
        direction = 'desc';
    }
    setSortConfig({ key: key as keyof CustomerTypeDto, direction });
  };

  const renderCellContent = (item: CustomerTypeDto, column: ColumnDef<CustomerTypeDto>) => {
    const value = item[column.key];
    if (!value && value !== 0) return '-';

    switch (column.type) {
        case 'badge':
            return <div className="flex items-center gap-2"><Tag size={14} className="text-pink-500" />{String(value)}</div>;
        case 'description':
            return <div className="flex items-start gap-2"><FileText size={14} className="text-slate-400 mt-0.5 shrink-0" />{String(value)}</div>;
        case 'date':
            return <div className="flex items-center gap-2 text-xs"><Calendar size={14} className="text-pink-500/50" />{new Date(String(value)).toLocaleDateString(i18n.language)}</div>;
        case 'user':
            return <div className="flex items-center gap-2 text-xs"><User size={14} className="text-indigo-500/50" />{String(value)}</div>;
        default:
            return String(value);
    }
  };

  const SortIcon = ({ column }: { column: string }): ReactElement => {
    if (sortConfig?.key !== column) {
      return <ArrowUpDown size={14} className="ml-2 inline-block text-slate-400 opacity-50 group-hover:opacity-100 transition-opacity" />;
    }
    return sortConfig.direction === 'asc' ? (
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
           <div className="text-sm text-muted-foreground animate-pulse">
             {t('customerTypeManagement.loading')}
           </div>
        </div>
      </div>
    );
  }

  if (customerTypes.length === 0) {
    return (
      <div className="flex items-center justify-center py-20 min-h-[400px]">
        <div className="text-muted-foreground bg-slate-50 dark:bg-white/5 px-8 py-6 rounded-xl border border-dashed border-slate-200 dark:border-white/10 text-sm font-medium">
          {t('customerTypeManagement.noData')}
        </div>
      </div>
    );
  }

  const headStyle = "cursor-pointer select-none text-slate-500 dark:text-slate-400 hover:text-pink-600 dark:hover:text-pink-400 transition-colors py-4 font-bold text-xs uppercase tracking-wider whitespace-nowrap";
  const cellStyle = "text-slate-600 dark:text-slate-400 text-sm py-4 border-b border-slate-100 dark:border-white/5 align-middle";

  return (
    <div className="flex flex-col gap-4">
      
      {/* Table */}
      <div className="relative overflow-hidden rounded-xl border border-slate-200 dark:border-white/10 bg-white/50 dark:bg-transparent">
        <DndContext 
          sensors={sensors} 
          collisionDetection={closestCenter} 
          onDragEnd={handleDragEnd}
        >
        <Table>
            <TableHeader className="bg-slate-50/50 dark:bg-white/5">
                <TableRow className="hover:bg-transparent border-slate-200 dark:border-white/10">
                    <SortableContext 
                      items={orderedColumns.map(col => col.key)} 
                      strategy={horizontalListSortingStrategy}
                    >
                      {orderedColumns.map((col) => (
                          <DraggableTableHead 
                              key={col.key as string}
                              id={col.key as string}
                              className={headStyle}
                              onClick={() => handleSort(col.key as string)}
                          >
                              <div className="flex items-center gap-1">
                                  {col.label}
                                  <SortIcon column={col.key as string} />
                              </div>
                          </DraggableTableHead>
                      ))}
                    </SortableContext>
                    <TableHead className={`${headStyle} w-[100px] text-right pr-6`}>
                        {t('common.actions')}
                    </TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {paginatedData.map((item) => (
                    <TableRow 
                        key={item.id}
                        className="group hover:bg-slate-50 dark:hover:bg-white/5 border-slate-100 dark:border-white/5 transition-colors"
                    >
                        {orderedColumns.map((col) => (
                            <TableCell key={`${item.id}-${col.key as string}`} className={cellStyle}>
                                {renderCellContent(item, col)}
                            </TableCell>
                        ))}
                        <TableCell className="text-right pr-4">
                            <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => onEdit(item)}
                                    className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-500/10 rounded-lg transition-colors"
                                >
                                    <Edit2 size={16} />
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleDeleteClick(item)}
                                    className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10 rounded-lg transition-colors"
                                >
                                    <Trash2 size={16} />
                                </Button>
                            </div>
                        </TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
        </DndContext>
      </div>

      {/* SAYFALAMA KONTROLLERİ */}
      <div className="flex flex-col sm:flex-row items-center justify-between py-4 gap-4">
        <div className="text-sm text-slate-500 dark:text-slate-400">
          {t('customerTypeManagement.table.showing', {
            from: (currentPage - 1) * pageSize + 1,
            to: Math.min(currentPage * pageSize, processedData.length),
            total: processedData.length,
          })}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage <= 1} className="bg-white dark:bg-transparent border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/5">{t('customerTypeManagement.previous')}</Button>
          <div className="flex items-center px-4 text-sm font-medium text-slate-700 dark:text-slate-200">{t('customerTypeManagement.table.page', { current: currentPage, total: totalPages || 1 })}</div>
          <Button variant="outline" size="sm" onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} disabled={currentPage >= totalPages} className="bg-white dark:bg-transparent border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/5">{t('customerTypeManagement.next')}</Button>
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
                {t('customerTypeManagement.delete.confirmTitle')}
                </DialogTitle>
                <DialogDescription className="text-slate-500 dark:text-slate-400 max-w-[280px] mx-auto text-sm leading-relaxed">
                {t('customerTypeManagement.delete.confirmMessage', {
                    name: selectedCustomerType?.name || '',
                })}
                </DialogDescription>
            </div>
          </DialogHeader>
          <DialogFooter className="flex flex-row gap-3 justify-center p-6 bg-slate-50/50 dark:bg-[#1a1025]/50 border-t border-slate-100 dark:border-white/5">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={deleteCustomerType.isPending}
              className="flex-1 h-12 rounded-xl border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-white/5 font-semibold"
            >
              {t('customerTypeManagement.form.cancel')}
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={deleteCustomerType.isPending}
              className="flex-1 h-12 rounded-xl bg-linear-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white border-0 shadow-lg shadow-red-500/20 transition-all hover:scale-[1.02] font-bold"
            >
              {deleteCustomerType.isPending
                ? t('customerTypeManagement.delete.deleting')
                : t('customerTypeManagement.delete.confirmButton')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

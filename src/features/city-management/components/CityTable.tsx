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
import { useDeleteCity } from '../hooks/useDeleteCity';
import type { CityDto } from '../types/city-types';
import { toast } from 'sonner';
import { 
  Edit2, 
  Trash2, 
  ArrowUpDown, 
  ArrowUp, 
  ArrowDown, 
  Calendar,
  Map,
  Loader2,
  GripVertical
} from 'lucide-react';
import { Alert02Icon } from 'hugeicons-react';

export interface ColumnDef<T> {
  key: keyof T;
  label: string;
  type: 'text' | 'date' | 'user' | 'id' | 'country';
  className?: string;
}

export const getColumnsConfig = (t: TFunction): ColumnDef<CityDto>[] => [
    { key: 'id', label: t('cityManagement.table.id'), type: 'id', className: 'w-[60px] md:w-[80px]' },
    { key: 'name', label: t('cityManagement.table.name'), type: 'text', className: 'min-w-[140px] md:min-w-[200px] font-medium' },
    { key: 'erpCode', label: t('cityManagement.table.erpCode'), type: 'text', className: 'w-[100px] md:w-[140px]' },
    { key: 'countryName', label: t('cityManagement.table.countryName'), type: 'country', className: 'min-w-[140px] md:min-w-[180px]' },
    { key: 'createdDate', label: t('cityManagement.table.createdDate'), type: 'date', className: 'w-[140px] md:w-[160px]' },
    { key: 'createdByFullUser', label: t('cityManagement.table.createdBy'), type: 'user', className: 'w-[140px] md:w-[160px]' },
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

interface CityTableProps {
  cities: CityDto[];
  isLoading: boolean;
  onEdit: (city: CityDto) => void;
  pageSize?: number;
  visibleColumns?: Array<keyof CityDto>;
  columnOrder?: string[];
  onColumnOrderChange?: (order: string[]) => void;
}

export function CityTable({
  cities,
  isLoading,
  onEdit,
  pageSize = 10,
  visibleColumns: propVisibleColumns,
  columnOrder: externalColumnOrder,
  onColumnOrderChange,
}: CityTableProps): ReactElement {
  const { t, i18n } = useTranslation();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedCity, setSelectedCity] = useState<CityDto | null>(null);
  const deleteCity = useDeleteCity();

  const [currentPage, setCurrentPage] = useState(1);

  const [sortConfig, setSortConfig] = useState<{ key: keyof CityDto; direction: 'asc' | 'desc' } | null>(null);

  const tableColumns = useMemo(() => getColumnsConfig(t), [t]);

  const [internalColumnOrder, setInternalColumnOrder] = useState<string[]>([]);

  useEffect(() => {
    if (externalColumnOrder) return;
    if (tableColumns.length > 0 && internalColumnOrder.length === 0) {
      setInternalColumnOrder(tableColumns.map((col) => col.key as string));
    }
  }, [tableColumns, internalColumnOrder.length, externalColumnOrder]);

  const columnOrder = externalColumnOrder ?? internalColumnOrder;

  const sensors = useSensors(
    useSensor(PointerSensor, {
        activationConstraint: {
            distance: 8,
        },
    }),
    useSensor(KeyboardSensor, {
        coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (active.id !== over?.id) {
      const reorder = (items: string[]) => {
        const oldIndex = items.indexOf(active.id as string);
        const newIndex = items.indexOf(over?.id as string);
        return arrayMove(items, oldIndex, newIndex);
      };
      if (onColumnOrderChange) {
        onColumnOrderChange(reorder([...columnOrder]));
      } else {
        setInternalColumnOrder((items) => reorder(items));
      }
    }
  };
  
  const visibleColumns = useMemo(() => {
    return propVisibleColumns || tableColumns.map(col => col.key);
  }, [propVisibleColumns, tableColumns]);

  const orderedColumns = useMemo(() => {
    if (columnOrder.length === 0) return tableColumns;
    
    return columnOrder
        .map(key => tableColumns.find(col => col.key === key))
        .filter((col): col is ColumnDef<CityDto> => 
            col !== undefined && visibleColumns.includes(col.key as keyof CityDto)
        );
  }, [columnOrder, tableColumns, visibleColumns]);

  const processedCities = useMemo(() => {
    const result = [...cities];

    if (sortConfig) {
      result.sort((a, b) => {
        const aRaw = a[sortConfig.key];
        const bRaw = b[sortConfig.key];
        const aValue = aRaw != null ? String(aRaw).toLowerCase() : '';
        const bValue = bRaw != null ? String(bRaw).toLowerCase() : '';

        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return result;
  }, [cities, sortConfig]);

  const totalPages = Math.ceil(processedCities.length / pageSize);
  const paginatedCities = processedCities.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleDeleteClick = (city: CityDto): void => {
    setSelectedCity(city);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async (): Promise<void> => {
    if (selectedCity) {
      try {
        await deleteCity.mutateAsync(selectedCity.id);
        toast.success(t('cityManagement.delete.success'));
        setDeleteDialogOpen(false);
        setSelectedCity(null);
      } catch {
        toast.error(t('cityManagement.delete.error'));
      }
    }
  };

  const handleSort = (key: keyof CityDto) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const renderCellContent = (item: CityDto, column: ColumnDef<CityDto>) => {
    const value = item[column.key];

    if (!value && value !== 0) return '-';

    switch (column.type) {
        case 'id':
            return <span className="font-mono text-xs text-slate-500 dark:text-slate-400">#{String(value)}</span>;
        case 'country':
            return (
                <div className="flex items-center gap-1.5">
                    <Map size={14} className="text-slate-400 shrink-0" />
                    <span className="truncate max-w-[150px]" title={String(value)}>
                        {String(value)}
                    </span>
                </div>
            );
        case 'date':
            return <div className="flex items-center gap-2 text-xs"><Calendar size={14} className="text-slate-400" />{new Date(String(value)).toLocaleDateString(i18n.language)}</div>;
        case 'user':
            return (
                <div className="flex items-center gap-2">
                    <div className="h-6 w-6 rounded-full bg-linear-to-tr from-pink-500/20 to-orange-500/20 flex items-center justify-center text-[10px] font-bold text-pink-600 dark:text-pink-400">
                        {String(value).charAt(0).toUpperCase()}
                    </div>
                    <span className="text-xs">{String(value)}</span>
                </div>
            );
        default:
            return String(value);
    }
  };

  const SortIcon = ({ column }: { column: keyof CityDto }): ReactElement => {
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
             {t('cityManagement.loading')}
           </div>
        </div>
      </div>
    );
  }

  if (cities.length === 0) {
    return (
      <div className="flex items-center justify-center py-20 min-h-[400px]">
        <div className="text-muted-foreground bg-slate-50 dark:bg-white/5 px-8 py-6 rounded-xl border border-dashed border-slate-200 dark:border-white/10 text-sm font-medium">
          {t('cityManagement.noData')}
        </div>
      </div>
    );
  }

  const headStyle = "cursor-pointer select-none text-slate-500 dark:text-slate-400 hover:text-pink-600 dark:hover:text-pink-400 transition-colors py-1.5 font-bold text-xs uppercase tracking-wider whitespace-nowrap";
  const cellStyle = "text-slate-600 dark:text-slate-400 text-sm py-1.5 border-b border-slate-100 dark:border-white/5 align-middle";

  return (
    <div className="flex flex-col gap-4">
      
      <div className="rounded-xl border border-slate-200 dark:border-white/10 overflow-hidden bg-white/50 dark:bg-transparent">
        <DndContext 
            sensors={sensors} 
            collisionDetection={closestCenter} 
            onDragEnd={handleDragEnd}
        >
            <div className="w-full overflow-x-auto">
                <Table>
                    <TableHeader className="bg-slate-50/50 dark:bg-white/5">
                    <TableRow className="border-b border-slate-200 dark:border-white/10 hover:bg-transparent">
                        <SortableContext 
                            items={orderedColumns.map(col => col.key as string)}
                            strategy={horizontalListSortingStrategy}
                        >
                            {orderedColumns.map((col) => (
                                <DraggableTableHead 
                                    key={col.key} 
                                    id={col.key as string}
                                    onClick={() => handleSort(col.key as keyof CityDto)} 
                                    className={headStyle}
                                >
                                    <div className="flex items-center gap-2">
                                        {col.label}
                                        <SortIcon column={col.key as keyof CityDto} />
                                    </div>
                                </DraggableTableHead>
                            ))}
                        </SortableContext>
                        <TableHead className={`${headStyle} text-right w-[100px]`}>
                        {t('cityManagement.actions')}
                        </TableHead>
                    </TableRow>
                    </TableHeader>
                    <TableBody>
                    {paginatedCities.map((city: CityDto, index: number) => (
                        <TableRow 
                        key={city.id || `city-${index}`}
                        className="border-b border-slate-100 dark:border-white/5 transition-colors duration-200 hover:bg-pink-50/40 dark:hover:bg-pink-500/5 group last:border-0"
                        >
                        {orderedColumns.map((col) => (
                            <TableCell key={`${city.id}-${col.key}`} className={`${cellStyle} ${col.className || ''}`}>
                                {renderCellContent(city, col)}
                            </TableCell>
                        ))}

                        <TableCell className={`${cellStyle} text-right`}>
                            <div className="flex justify-end gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-500/10" onClick={() => onEdit(city)}><Edit2 size={16} /></Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10" onClick={() => handleDeleteClick(city)}><Trash2 size={16} /></Button>
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
          {t('cityManagement.table.showing', {
            from: (currentPage - 1) * pageSize + 1,
            to: Math.min(currentPage * pageSize, processedCities.length),
            total: processedCities.length,
          })}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage <= 1} className="bg-white dark:bg-transparent border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/5">{t('common.previous')}</Button>
          <div className="flex items-center px-4 text-sm font-medium text-slate-700 dark:text-slate-200">{t('cityManagement.table.page', { current: currentPage, total: totalPages || 1 })}</div>
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
                {t('cityManagement.delete.confirmTitle')}
                </DialogTitle>
                <DialogDescription className="text-slate-500 dark:text-slate-400 max-w-[280px] mx-auto text-sm leading-relaxed">
                {t('cityManagement.delete.confirmMessage', {
                    name: selectedCity?.name || '',
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
              disabled={deleteCity.isPending}
              className="flex-1 h-12 rounded-xl bg-linear-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white border-0 shadow-lg shadow-red-500/20 transition-all hover:scale-[1.02] font-bold"
            >
              {deleteCity.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {t('common.delete.action')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

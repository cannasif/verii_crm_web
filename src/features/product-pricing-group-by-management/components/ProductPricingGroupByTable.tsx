import { type ReactElement, useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
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
    DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import { useDeleteProductPricingGroupBy } from '../hooks/useDeleteProductPricingGroupBy';
import type { ProductPricingGroupByDto } from '../types/product-pricing-group-by-types';
import { formatPrice } from '../types/product-pricing-group-by-types';
import { 
    Edit2, 
    Trash2, 
    ArrowUpDown, 
    ArrowUp, 
    ArrowDown, 
    ChevronDown,
    EyeOff,
    Loader2
} from 'lucide-react';
import { Alert02Icon } from 'hugeicons-react';

export interface ColumnDef<T> {
  key: keyof T | 'actions';
  label: string;
  className?: string;
}

interface ProductPricingGroupByTableProps {
  items: ProductPricingGroupByDto[];
  isLoading: boolean;
  onEdit: (item: ProductPricingGroupByDto) => void;
}

export function ProductPricingGroupByTable({
  items,
  isLoading,
  onEdit,
}: ProductPricingGroupByTableProps): ReactElement {
  const { t } = useTranslation();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<ProductPricingGroupByDto | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
  const [sortConfig, setSortConfig] = useState<{ key: keyof ProductPricingGroupByDto; direction: 'asc' | 'desc' } | null>(null);

  const deleteMutation = useDeleteProductPricingGroupBy();

  const getColumnsConfig = (t: TFunction): ColumnDef<ProductPricingGroupByDto>[] => [
    { key: 'erpGroupCode', label: t('productPricingGroupByManagement.erpGroupCode'), className: 'min-w-[150px]' },
    { key: 'currency', label: t('productPricingGroupByManagement.currency'), className: 'w-[100px]' },
    { key: 'listPrice', label: t('productPricingGroupByManagement.listPrice'), className: 'w-[120px]' },
    { key: 'costPrice', label: t('productPricingGroupByManagement.costPrice'), className: 'w-[120px]' },
    { key: 'discount1', label: t('productPricingGroupByManagement.discount1'), className: 'w-[100px]' },
    { key: 'discount2', label: t('productPricingGroupByManagement.discount2'), className: 'w-[100px]' },
    { key: 'discount3', label: t('productPricingGroupByManagement.discount3'), className: 'w-[100px]' },
  ];

  const tableColumns = useMemo(() => getColumnsConfig(t), [t]);
  
  type ColumnKey = keyof ProductPricingGroupByDto | 'actions';
  const [visibleColumns, setVisibleColumns] = useState<ColumnKey[]>(
    [...tableColumns.map(col => col.key), 'actions']
  );

  const processedItems = useMemo(() => {
    const result = [...items];

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
  }, [items, sortConfig]);

  const totalPages = Math.ceil(processedItems.length / pageSize);
  const paginatedItems = processedItems.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const handleDeleteClick = (item: ProductPricingGroupByDto): void => {
    setSelectedItem(item);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async (): Promise<void> => {
    if (selectedItem) {
      await deleteMutation.mutateAsync(selectedItem.id);
      setDeleteDialogOpen(false);
      setSelectedItem(null);
    }
  };

  const handleSort = (key: keyof ProductPricingGroupByDto) => {
    setSortConfig(current => ({
      key,
      direction: current?.key === key && current.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const toggleColumn = (key: keyof ProductPricingGroupByDto | 'actions') => {
    setVisibleColumns(current => 
      current.includes(key)
        ? current.filter(c => c !== key)
        : [...current, key]
    );
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

  if (items.length === 0) {
    return (
      <div className="flex items-center justify-center py-20 min-h-[400px]">
        <div className="text-muted-foreground bg-slate-50 dark:bg-white/5 px-8 py-6 rounded-xl border border-dashed border-slate-200 dark:border-white/10 text-sm font-medium">
          {t('common.noData')}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end p-2 sm:p-0">
         <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
                variant="outline" 
                size="sm" 
                className="ml-auto h-9 lg:flex border-dashed border-slate-300 dark:border-white/20 bg-transparent hover:bg-slate-50 dark:hover:bg-white/5 text-xs sm:text-sm"
            >
              <EyeOff className="mr-2 h-4 w-4" />
              {t('common.editColumns')}
              <ChevronDown className="ml-2 h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent 
            align="end" 
            className="w-56 max-h-[400px] overflow-y-auto bg-white/95 dark:bg-[#1a1025]/95 backdrop-blur-xl border border-slate-200 dark:border-white/10 shadow-xl rounded-xl p-2 z-50"
          >
            <DropdownMenuLabel className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider px-2 py-1.5">
              {t('common.visibleColumns')}
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-slate-200 dark:bg-white/10 my-1" />
            {tableColumns.map((column) => (
              <DropdownMenuCheckboxItem
                key={column.key as string}
                checked={visibleColumns.includes(column.key)}
                onCheckedChange={() => toggleColumn(column.key)}
                onSelect={(e) => e.preventDefault()}
                className="text-sm text-slate-700 dark:text-slate-200 focus:bg-pink-50 dark:focus:bg-pink-500/10 focus:text-pink-600 dark:focus:text-pink-400 cursor-pointer rounded-lg px-2 py-1.5 pl-8 relative"
              >
                {column.label}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="rounded-xl border border-slate-200 dark:border-white/10 overflow-hidden bg-white/50 dark:bg-transparent">
        <Table>
          <TableHeader className="bg-slate-50/50 dark:bg-white/5">
            <TableRow className="border-b border-slate-200 dark:border-white/10 hover:bg-transparent">
              {tableColumns.map((column) => (
                visibleColumns.includes(column.key) && (
                  <TableHead 
                    key={column.key as string}
                    className={`${headStyle} ${column.className}`}
                    onClick={() => column.key !== 'actions' && handleSort(column.key as keyof ProductPricingGroupByDto)}
                  >
                    <div className="flex items-center gap-2">
                      {column.label}
                      <SortIcon column={column.key as string} />
                    </div>
                  </TableHead>
                )
              ))}
              <TableHead className={`${headStyle} text-right w-[100px]`}>
                  {t('common.actions')}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedItems.map((item) => (
                <TableRow 
                  key={item.id}
                  className="border-b border-slate-100 dark:border-white/5 transition-colors duration-200 hover:bg-pink-50/40 dark:hover:bg-pink-500/5 group last:border-0"
                >
                  {visibleColumns.includes('erpGroupCode') && (
                    <TableCell className={`${cellStyle} font-medium`}>
                      {item.erpGroupCode}
                    </TableCell>
                  )}
                  {visibleColumns.includes('currency') && (
                    <TableCell className={cellStyle}>
                      <span className="inline-flex items-center px-2 py-1 rounded-md bg-slate-100 dark:bg-white/10 text-xs font-medium text-slate-700 dark:text-slate-300">
                        {item.currency}
                      </span>
                    </TableCell>
                  )}
                  {visibleColumns.includes('listPrice') && (
                    <TableCell className={`${cellStyle} font-mono`}>
                      {formatPrice(item.listPrice, item.currency)}
                    </TableCell>
                  )}
                  {visibleColumns.includes('costPrice') && (
                    <TableCell className={`${cellStyle} font-mono`}>
                      {formatPrice(item.costPrice, item.currency)}
                    </TableCell>
                  )}
                  {visibleColumns.includes('discount1') && (
                    <TableCell className={`${cellStyle} text-center`}>
                      {item.discount1 ? `%${item.discount1}` : '-'}
                    </TableCell>
                  )}
                  {visibleColumns.includes('discount2') && (
                    <TableCell className={`${cellStyle} text-center`}>
                      {item.discount2 ? `%${item.discount2}` : '-'}
                    </TableCell>
                  )}
                  {visibleColumns.includes('discount3') && (
                    <TableCell className={`${cellStyle} text-center`}>
                      {item.discount3 ? `%${item.discount3}` : '-'}
                    </TableCell>
                  )}
                  
                  <TableCell className={`${cellStyle} text-right`}>
                    <div className="flex items-center justify-end gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onEdit(item)}
                        className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-500/10"
                      >
                        <Edit2 size={16} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteClick(item)}
                        className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10"
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

      <div className="flex flex-col sm:flex-row items-center justify-between py-4 gap-4">
        <div className="text-sm text-slate-500 dark:text-slate-400">
          {t('common.table.showing', {
            from: (currentPage - 1) * pageSize + 1,
            to: Math.min(currentPage * pageSize, processedItems.length),
            total: processedItems.length,
          })}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage <= 1} className="bg-white dark:bg-transparent border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/5">{t('common.previous')}</Button>
          <div className="flex items-center px-4 text-sm font-medium text-slate-700 dark:text-slate-200">{t('common.table.page', { current: currentPage, total: totalPages || 1 })}</div>
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
                {t('common.delete.confirmTitle')}
                </DialogTitle>
                <DialogDescription className="text-slate-500 dark:text-slate-400 max-w-[280px] mx-auto text-sm leading-relaxed">
                {t('common.delete.confirmMessage', {
                    name: selectedItem?.erpGroupCode || '',
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
              disabled={deleteMutation.isPending}
              className="flex-1 h-12 rounded-xl bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white border-0 shadow-lg shadow-red-500/20 transition-all hover:scale-[1.02] font-bold"
            >
              {deleteMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {t('common.delete.action')}
            </Button>
          </DialogFooter>

        </DialogContent>
      </Dialog>
    </div>
  );
}

import { type ReactElement, useState, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import {
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
import { useDeleteCustomer } from '../hooks/useDeleteCustomer';
import type { CustomerDto } from '../types/customer-types';
import { 
  Edit2, 
  Trash2, 
  ArrowUpDown, 
  ArrowUp, 
  ArrowDown,
  Calendar,
  User,
  Tag,
  MapPin,
  Mail,
  Phone,
  Globe,
  CreditCard,
  Hash,
  LayoutGrid
} from 'lucide-react';
import { Alert02Icon } from 'hugeicons-react';

export interface ColumnDef<T> {
  key: keyof T;
  label: string;
  type: 'text' | 'date' | 'user' | 'badge' | 'email' | 'phone' | 'location' | 'money' | 'link' | 'code';
  className?: string;
}

export interface CustomerTableProps {
  customers: CustomerDto[];
  isLoading: boolean;
  onEdit: (customer: CustomerDto) => void;
  visibleColumns: Array<keyof CustomerDto>;
  columnOrder?: string[];
}

export const getColumnsConfig = (t: TFunction): ColumnDef<CustomerDto>[] => [
    { key: 'id', label: t('customerManagement.table.id'), type: 'text', className: 'font-medium w-[48px] md:w-[60px]' },
    { key: 'customerCode', label: t('customerManagement.table.customerCode'), type: 'code', className: 'font-mono text-xs' },
    { key: 'name', label: t('customerManagement.table.name'), type: 'text', className: 'font-bold text-slate-900 dark:text-white min-w-[160px] md:min-w-[200px]' },
    { key: 'customerTypeName', label: t('customerManagement.table.customerType'), type: 'badge', className: 'min-w-[120px] md:min-w-[140px]' },
    { key: 'email', label: t('customerManagement.table.email'), type: 'email', className: 'min-w-[150px] md:min-w-[180px]' },
    { key: 'phone', label: t('customerManagement.table.phone'), type: 'phone', className: 'whitespace-nowrap' },
    { key: 'cityName', label: t('customerManagement.table.city'), type: 'location', className: 'min-w-[96px] md:min-w-[120px]' },
    { key: 'districtName', label: t('customerManagement.table.district'), type: 'text', className: 'text-slate-500' },
    { key: 'countryName', label: t('customerManagement.table.country'), type: 'text', className: 'text-slate-500' },
    { key: 'creditLimit', label: t('customerManagement.table.creditLimit'), type: 'money', className: 'font-medium' },
    { key: 'defaultShippingAddressId', label: t('customerManagement.table.defaultShippingAddressId'), type: 'code', className: 'font-mono text-xs' },
    { key: 'salesRepCode', label: t('customerManagement.table.salesRep'), type: 'user', className: 'whitespace-nowrap' },
    { key: 'tcknNumber', label: t('customerManagement.table.tckn'), type: 'code', className: 'font-mono text-xs' },
    { key: 'taxNumber', label: t('customerManagement.table.tax'), type: 'code', className: 'font-mono text-xs' },
    { key: 'website', label: t('customerManagement.table.website'), type: 'link', className: 'text-blue-500' },
    { key: 'createdDate', label: t('customerManagement.table.createdDate'), type: 'date', className: 'whitespace-nowrap' },
];

export function CustomerTable({
  customers,
  isLoading,
  onEdit,
  visibleColumns,
  columnOrder,
}: CustomerTableProps): ReactElement {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerDto | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
  const [sortConfig, setSortConfig] = useState<{ key: keyof CustomerDto; direction: 'asc' | 'desc' } | null>(null);

  // Drag to Scroll Logic
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [startY, setStartY] = useState(0);
  const [scrollTop, setScrollTop] = useState(0);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!scrollRef.current) return;
    setIsDragging(true);
    setStartX(e.pageX - scrollRef.current.offsetLeft);
    setScrollLeft(scrollRef.current.scrollLeft);
    setStartY(e.pageY - scrollRef.current.offsetTop);
    setScrollTop(scrollRef.current.scrollTop);
    scrollRef.current.style.cursor = 'grabbing';
    scrollRef.current.style.userSelect = 'none';
  };

  const handleMouseUpOrLeave = () => {
    setIsDragging(false);
    if (scrollRef.current) {
        scrollRef.current.style.cursor = 'grab';
        scrollRef.current.style.removeProperty('user-select');
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !scrollRef.current) return;
    e.preventDefault();
    const x = e.pageX - scrollRef.current.offsetLeft;
    const y = e.pageY - scrollRef.current.offsetTop;
    const walkX = (x - startX) * 2;
    const walkY = (y - startY) * 2;
    scrollRef.current.scrollLeft = scrollLeft - walkX;
    scrollRef.current.scrollTop = scrollTop - walkY;
  };

  const tableColumns = useMemo(() => getColumnsConfig(t), [t]);
  const displayedColumns = useMemo(() => {
    const visible = tableColumns.filter((col) => visibleColumns.includes(col.key));
    if (!columnOrder || columnOrder.length === 0) return visible;
    const orderMap = new Map(columnOrder.map((k, i) => [k, i]));
    return [...visible].sort((a, b) => (orderMap.get(a.key) ?? 999) - (orderMap.get(b.key) ?? 999));
  }, [tableColumns, visibleColumns, columnOrder]);

  const deleteCustomer = useDeleteCustomer();

  const processedData = useMemo(() => {
    const safeData = customers || [];
    const result = [...safeData];
    
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
  }, [customers, sortConfig]);

  const totalPages = Math.ceil(processedData.length / pageSize);
  const paginatedData = processedData.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleDeleteClick = (customer: CustomerDto): void => {
    setSelectedCustomer(customer);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async (): Promise<void> => {
    if (selectedCustomer) {
      await deleteCustomer.mutateAsync(selectedCustomer.id);
      setDeleteDialogOpen(false);
      setSelectedCustomer(null);
    }
  };

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === (key as keyof CustomerDto) && sortConfig.direction === 'asc') {
        direction = 'desc';
    }
    setSortConfig({ key: key as keyof CustomerDto, direction });
  };

  const renderCellContent = (item: CustomerDto, column: ColumnDef<CustomerDto>) => {
    const value = item[column.key];
    if (!value && value !== 0) return '-';

    switch (column.type) {
        case 'badge':
            return <div className="flex items-center gap-2"><Tag size={14} className="text-pink-500" />{String(value)}</div>;
        case 'email':
            return <div className="flex items-center gap-2 text-xs truncate max-w-[180px]" title={String(value)}><Mail size={14} className="text-blue-500 shrink-0" />{String(value)}</div>;
        case 'phone':
            return <div className="flex items-center gap-2 text-xs"><Phone size={14} className="text-orange-500 shrink-0" />{String(value)}</div>;
        case 'location':
            return <div className="flex items-center gap-2 text-xs"><MapPin size={14} className="text-green-500 shrink-0" />{String(value)}</div>;
        case 'money':
            return <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-mono"><CreditCard size={14} className="shrink-0" />{Number(value).toLocaleString(i18n.language, { minimumFractionDigits: 2 })} ₺</div>;
        case 'user':
            return <div className="flex items-center gap-2 text-xs"><User size={14} className="text-indigo-500/50 shrink-0" />{String(value)}</div>;
        case 'link':
            return <div className="flex items-center gap-2 text-xs text-blue-600 hover:underline"><Globe size={14} className="shrink-0" /><a href={String(value).startsWith('http') ? String(value) : `https://${value}`} target="_blank" rel="noreferrer">{String(value)}</a></div>;
        case 'code':
            return <div className="flex items-center gap-1 bg-slate-100 dark:bg-white/10 px-1.5 py-0.5 rounded text-[11px] font-mono text-slate-600 dark:text-slate-300"><Hash size={12} className="opacity-50" />{String(value)}</div>;
        case 'date':
            return <div className="flex items-center gap-2 text-xs"><Calendar size={14} className="text-pink-500/50" />{new Date(String(value)).toLocaleDateString(i18n.language)}</div>;
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
             {t('customerManagement.loading')}
           </div>
        </div>
      </div>
    );
  }

  if (!customers || customers.length === 0) {
    return (
      <div className="flex items-center justify-center py-20 min-h-[400px]">
        <div className="text-muted-foreground bg-slate-50 dark:bg-white/5 px-8 py-6 rounded-xl border border-dashed border-slate-200 dark:border-white/10 text-sm font-medium">
          {t('customerManagement.noData')}
        </div>
      </div>
    );
  }

  const headStyle = "cursor-pointer select-none text-slate-500 dark:text-slate-400 hover:text-pink-600 dark:hover:text-pink-400 transition-colors py-4 font-bold text-xs uppercase tracking-wider whitespace-nowrap";
  const cellStyle = "text-slate-600 dark:text-slate-400 text-sm py-4 border-b border-slate-100 dark:border-white/5 align-middle";

  return (
    <div className="flex flex-col gap-4">
      
      <div className="rounded-xl border border-slate-200 dark:border-white/10 overflow-hidden bg-white/50 dark:bg-transparent">
        <div 
          ref={scrollRef}
          className="relative w-full overflow-auto custom-scrollbar cursor-grab active:cursor-grabbing h-[600px] border border-white/5 rounded-2xl"
          onMouseDown={handleMouseDown}
          onMouseLeave={handleMouseUpOrLeave}
          onMouseUp={handleMouseUpOrLeave}
          onMouseMove={handleMouseMove}
        >
          <table className="w-full min-w-[680px] sm:min-w-[820px] lg:min-w-[1100px] caption-bottom text-sm">
            <TableHeader className="bg-slate-50 dark:bg-[#151025] sticky top-0 z-10 shadow-sm">
              <TableRow className="border-b border-slate-200 dark:border-white/10 hover:bg-transparent">
                {displayedColumns.map((col) => (
                    <TableHead 
                        key={col.key} 
                        onClick={() => handleSort(col.key as string)} 
                        className={headStyle}
                    >
                        <div className="flex items-center gap-2">
                            {col.label}
                            <SortIcon column={col.key as string} />
                        </div>
                    </TableHead>
                ))}
                <TableHead className={`${headStyle} text-right w-[84px] md:w-[100px]`}>
                  {t('customerManagement.actions')}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedData.map((customer: CustomerDto, index: number) => (
                <TableRow 
                  key={customer.id || `customer-${index}`}
                  className="border-b border-slate-100 dark:border-white/5 transition-colors duration-200 hover:bg-pink-50/40 dark:hover:bg-pink-500/5 group last:border-0"
                >
                  {displayedColumns.map((col) => (
                      <TableCell key={`${customer.id}-${col.key}`} className={`${cellStyle} ${col.className || ''}`}>
                          {renderCellContent(customer, col)}
                      </TableCell>
                  ))}

                  <TableCell className={`${cellStyle} text-right`}>
                    <div className="flex justify-end gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-violet-600 hover:text-violet-700 hover:bg-violet-50 dark:text-violet-400 dark:hover:bg-violet-500/10" onClick={() => navigate(`/customer-360/${customer.id}`)} title={t('customer360.button')}><LayoutGrid size={16} /></Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-500/10" onClick={() => onEdit(customer)}><Edit2 size={16} /></Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10" onClick={() => handleDeleteClick(customer)}><Trash2 size={16} /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </table>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-between py-4 gap-4">
        <div className="text-sm text-slate-500 dark:text-slate-400">
          {t('customerManagement.table.showing', {
            from: (currentPage - 1) * pageSize + 1,
            to: Math.min(currentPage * pageSize, processedData.length),
            total: processedData.length,
          })}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage <= 1} className="bg-white dark:bg-transparent border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/5">{t('customerManagement.previous')}</Button>
          <div className="flex items-center px-4 text-sm font-medium text-slate-700 dark:text-slate-200">{t('customerManagement.table.page', { current: currentPage, total: totalPages || 1 })}</div>
          <Button variant="outline" size="sm" onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} disabled={currentPage >= totalPages} className="bg-white dark:bg-transparent border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/5">{t('customerManagement.next')}</Button>
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
                {t('customerManagement.delete.confirmTitle')}
                </DialogTitle>
                <DialogDescription className="text-slate-500 dark:text-slate-400 max-w-[280px] mx-auto text-sm leading-relaxed">
                {t('customerManagement.delete.confirmMessage', {
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
              disabled={deleteCustomer.isPending}
              className="flex-1 h-12 rounded-xl border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-white/5 font-semibold"
            >
              {t('customerManagement.cancel')}
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={deleteCustomer.isPending}
              className="flex-1 h-12 rounded-xl bg-linear-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white border-0 shadow-lg shadow-red-500/20 transition-all hover:scale-[1.02] font-bold"
            >
              {deleteCustomer.isPending
                ? t('customerManagement.loading')
                : t('customerManagement.delete.action')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

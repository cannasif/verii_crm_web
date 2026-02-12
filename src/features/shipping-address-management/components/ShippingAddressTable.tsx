import { type ReactElement, useCallback, useState, useMemo } from 'react';
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
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useDeleteShippingAddress } from '../hooks/useDeleteShippingAddress';
import type { ShippingAddressDto } from '../types/shipping-address-types';
import { Edit2, Trash2, ArrowUpDown, ArrowUp, ArrowDown, ChevronDown, EyeOff, Calendar, CheckCircle2, XCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { toast } from 'sonner';
import { Alert02Icon } from 'hugeicons-react';

interface ShippingAddressTableProps {
  data: ShippingAddressDto[];
  isLoading: boolean;
  onEdit: (shippingAddress: ShippingAddressDto) => void;
}

type SortConfig = {
  key: keyof ShippingAddressDto | '';
  direction: 'asc' | 'desc';
};

interface ColumnConfig {
  key: string;
  label: string;
  className?: string;
  visible: boolean;
}

export function ShippingAddressTable({
  data,
  isLoading,
  onEdit,
}: ShippingAddressTableProps): ReactElement {
  const { t } = useTranslation();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedShippingAddress, setSelectedShippingAddress] = useState<ShippingAddressDto | null>(null);
  
  // Client-side pagination & sorting
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'id', direction: 'desc' });
  const [visibleColumns, setVisibleColumns] = useState<string[]>([
    'customerName', 'name', 'address', 'contactPerson', 'phone', 'isDefault', 'isActive', 'createdDate'
  ]);

  const deleteShippingAddress = useDeleteShippingAddress();

  const getColumnsConfig = useCallback(
    (): ColumnConfig[] => [
      { key: 'customerName', label: t('shippingAddressManagement.customerName'), visible: true },
      { key: 'name', label: t('shippingAddressManagement.name'), visible: true },
      { key: 'address', label: t('shippingAddressManagement.address'), visible: true },
      { key: 'postalCode', label: t('shippingAddressManagement.postalCode'), visible: false },
      { key: 'contactPerson', label: t('shippingAddressManagement.contactPerson'), visible: true },
      { key: 'phone', label: t('shippingAddressManagement.phone'), visible: true },
      { key: 'location', label: t('shippingAddressManagement.location'), visible: false }, // Composite column
      { key: 'isDefault', label: t('shippingAddressManagement.isDefaultShort'), visible: true },
      { key: 'isActive', label: t('common.status'), visible: true },
      { key: 'createdDate', label: t('shippingAddressManagement.createdDate'), visible: true },
    ],
    [t]
  );

  const tableColumns = useMemo(() => getColumnsConfig(), [getColumnsConfig]);

  const handleDeleteClick = (shippingAddress: ShippingAddressDto): void => {
    setSelectedShippingAddress(shippingAddress);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async (): Promise<void> => {
    if (selectedShippingAddress) {
      try {
        await deleteShippingAddress.mutateAsync(selectedShippingAddress.id);
        toast.success(t('common.deleteSuccess'));
        setDeleteDialogOpen(false);
        setSelectedShippingAddress(null);
      } catch {
        toast.error(t('common.deleteError'));
      }
    }
  };

  const handleSort = (key: string) => {
    setSortConfig((current) => ({
      key: key as keyof ShippingAddressDto,
      direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  const sortedData = useMemo(() => {
    const sorted = [...data].sort((a, b) => {
      if (!sortConfig.key) return 0;
      
      const aValue = a[sortConfig.key];
      const bValue = b[sortConfig.key];

      if (aValue === bValue) return 0;
      
      // Handle null/undefined
      if (aValue === null || aValue === undefined) return 1;
      if (bValue === null || bValue === undefined) return -1;

      return sortConfig.direction === 'asc' 
        ? (aValue > bValue ? 1 : -1)
        : (aValue < bValue ? 1 : -1);
    });
    return sorted;
  }, [data, sortConfig]);

  const totalPages = Math.ceil(sortedData.length / pageSize);
  const paginatedData = sortedData.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const SortIcon = ({ column }: { column: string }): ReactElement => {
    if (sortConfig.key !== column) {
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

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center py-20 min-h-[400px]">
        <div className="text-muted-foreground bg-slate-50 dark:bg-white/5 px-8 py-6 rounded-xl border border-dashed border-slate-200 dark:border-white/10 text-sm font-medium">
          {t('shippingAddressManagement.noData')}
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
                key={column.key}
                className="text-sm text-slate-700 dark:text-slate-200 focus:bg-pink-50 dark:focus:bg-pink-500/10 focus:text-pink-600 dark:focus:text-pink-400 cursor-pointer rounded-lg px-2 py-1.5 pl-8 relative"
                checked={visibleColumns.includes(column.key)}
                onSelect={(e) => e.preventDefault()}
                onCheckedChange={(checked) => {
                    if (checked) {
                        setVisibleColumns([...visibleColumns, column.key]);
                    } else {
                        setVisibleColumns(visibleColumns.filter((col) => col !== column.key));
                    }
                }}
              >
                {column.label}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="w-full overflow-x-auto rounded-xl border border-slate-200 dark:border-white/10">
        <Table>
          <TableHeader className="bg-slate-50/50 dark:bg-white/5">
            <TableRow className="border-b border-slate-200 dark:border-white/10 hover:bg-transparent">
              {tableColumns
                .filter(col => visibleColumns.includes(col.key))
                .map((column) => (
                  <TableHead
                    key={column.key}
                    className={headStyle}
                    onClick={() => handleSort(column.key)}
                  >
                    <div className="flex items-center gap-2 group">
                      {column.label}
                      <SortIcon column={column.key} />
                    </div>
                  </TableHead>
              ))}
              <TableHead className={`text-right ${headStyle} w-[100px]`}>
                {t('common.actions')}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedData.map((row) => (
              <TableRow
                key={row.id}
                className="border-b border-slate-100 dark:border-white/5 transition-colors duration-200 hover:bg-pink-50/40 dark:hover:bg-pink-500/5 group"
              >
                {visibleColumns.includes('customerName') && (
                  <TableCell className={cellStyle + " font-medium text-slate-700 dark:text-slate-300"}>
                    {row.customerName || '-'}
                  </TableCell>
                )}
                {visibleColumns.includes('name') && (
                  <TableCell className={cellStyle}>
                    {row.name || '-'}
                  </TableCell>
                )}
                {visibleColumns.includes('address') && (
                  <TableCell className={cellStyle + " max-w-xs truncate"} title={row.address}>
                    {row.address}
                  </TableCell>
                )}
                {visibleColumns.includes('postalCode') && (
                  <TableCell className={cellStyle}>
                    {row.postalCode || '-'}
                  </TableCell>
                )}
                {visibleColumns.includes('contactPerson') && (
                  <TableCell className={cellStyle}>
                    {row.contactPerson || '-'}
                  </TableCell>
                )}
                {visibleColumns.includes('phone') && (
                  <TableCell className={cellStyle}>
                    {row.phone || '-'}
                  </TableCell>
                )}
                {visibleColumns.includes('location') && (
                  <TableCell className={cellStyle}>
                    {[
                      row.countryName,
                      row.cityName,
                      row.districtName,
                    ].filter(Boolean).join(' / ')}
                  </TableCell>
                )}
                {visibleColumns.includes('isDefault') && (
                  <TableCell className={cellStyle}>
                    {row.isDefault ? (
                      <Badge variant="secondary" className="bg-pink-100 text-pink-700 dark:bg-pink-500/20 dark:text-pink-300">
                        {t('shippingAddressManagement.defaultBadge')}
                      </Badge>
                    ) : (
                      '-'
                    )}
                  </TableCell>
                )}
                {visibleColumns.includes('isActive') && (
                  <TableCell className={cellStyle}>
                    <Badge
                      variant="outline"
                      className={`gap-1.5 pl-1.5 pr-2.5 py-0.5 border ${
                        row.isActive 
                          ? 'bg-green-50 dark:bg-green-500/10 text-green-700 dark:text-green-400 border-green-200 dark:border-green-500/20' 
                          : 'bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400 border-red-200 dark:border-red-500/20'
                      }`}
                    >
                        {row.isActive ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                        {row.isActive ? t('status.active') : t('status.inactive')}
                    </Badge>
                  </TableCell>
                )}
                {visibleColumns.includes('createdDate') && (
                  <TableCell className={cellStyle}>
                    <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                      <Calendar size={14} className="text-slate-400" />
                      {row.createdDate ? format(new Date(row.createdDate), 'dd MMMM yyyy', { locale: tr }) : '-'}
                    </div>
                  </TableCell>
                )}
                <TableCell className={`text-right ${cellStyle}`}>
                  <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-500/10"
                      onClick={() => onEdit(row)}
                    >
                      <Edit2 size={16} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10"
                      onClick={() => handleDeleteClick(row)}
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

      {totalPages > 1 && (
        <div className="flex items-center justify-end gap-2 mt-4">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="text-sm text-slate-500 dark:text-slate-400">
            {currentPage} / {totalPages}
          </div>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="bg-white dark:bg-[#130822] border border-slate-100 dark:border-white/10 text-slate-900 dark:text-white w-[90%] sm:w-full max-w-md rounded-2xl shadow-2xl overflow-hidden p-0 gap-0">
          
          <DialogHeader className="flex flex-col items-center gap-4 text-center pb-6 pt-10 px-6">
            <div className="h-20 w-20 rounded-full bg-red-50 dark:bg-red-500/10 flex items-center justify-center mb-2 animate-in zoom-in duration-300">
               <Alert02Icon size={36} className="text-red-600 dark:text-red-500" />
            </div>
            
            <div className="space-y-2">
                <DialogTitle className="text-2xl font-bold text-slate-900 dark:text-white">
                {t('common.deleteConfirmTitle')}
                </DialogTitle>
                <DialogDescription className="text-slate-500 dark:text-slate-400 max-w-[280px] mx-auto text-sm leading-relaxed">
                {t('shippingAddressManagement.deleteConfirmDescription')}
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
              className="flex-1 h-12 rounded-xl bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white border-0 shadow-lg shadow-red-500/20 transition-all hover:scale-[1.02] font-bold"
            >
              {t('common.delete')}
            </Button>
          </DialogFooter>

        </DialogContent>
      </Dialog>
    </div>
  );
}

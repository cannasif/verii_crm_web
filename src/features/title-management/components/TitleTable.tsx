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
import { useDeleteTitle } from '../hooks/useDeleteTitle';
import type { TitleDto } from '../types/title-types';
import { 
  Edit2, 
  Trash2, 
  ArrowUpDown, 
  ArrowUp, 
  ArrowDown, 
  Calendar,
  EyeOff,
  ChevronDown,
  User,
  Loader2
} from 'lucide-react';
import { Alert02Icon } from 'hugeicons-react';

export interface ColumnDef<T> {
  key: keyof T | 'actions';
  label: string;
  type: 'text' | 'date' | 'user' | 'id';
  className?: string;
}

interface TitleTableProps {
  titles: TitleDto[];
  isLoading: boolean;
  onEdit: (title: TitleDto) => void;
}

const getColumnsConfig = (t: TFunction): ColumnDef<TitleDto>[] => [
    { key: 'id', label: t('titleManagement.table.id'), type: 'id', className: 'w-[100px]' },
    { key: 'titleName', label: t('titleManagement.table.name'), type: 'text', className: 'min-w-[200px] font-medium' },
    { key: 'code', label: t('titleManagement.table.code'), type: 'text', className: 'w-[140px]' },
    { key: 'createdDate', label: t('titleManagement.table.createdDate'), type: 'date', className: 'w-[160px]' },
    { key: 'createdByFullUser', label: t('titleManagement.table.createdBy'), type: 'user', className: 'w-[160px]' },
];

export function TitleTable({
  titles,
  isLoading,
  onEdit,
}: TitleTableProps): ReactElement {
  const { t, i18n } = useTranslation();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedTitle, setSelectedTitle] = useState<TitleDto | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
  const [sortConfig, setSortConfig] = useState<{ key: keyof TitleDto; direction: 'asc' | 'desc' } | null>(null);

  const deleteTitle = useDeleteTitle();

  const tableColumns = useMemo(() => getColumnsConfig(t), [t]);
  
  const [visibleColumns, setVisibleColumns] = useState<Array<keyof TitleDto | 'actions'>>(
    tableColumns.map(col => col.key)
  );

  const processedTitles = useMemo(() => {
    const result = [...titles];

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
  }, [titles, sortConfig]);

  const totalPages = Math.ceil(processedTitles.length / pageSize);
  const paginatedTitles = processedTitles.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleDeleteClick = (title: TitleDto): void => {
    setSelectedTitle(title);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async (): Promise<void> => {
    if (selectedTitle) {
      await deleteTitle.mutateAsync(selectedTitle.id);
      setDeleteDialogOpen(false);
      setSelectedTitle(null);
    }
  };

  const handleSort = (column: string): void => {
    const newDirection =
      sortConfig?.key === column && sortConfig.direction === 'asc' ? 'desc' : 'asc';
    setSortConfig({ key: column as keyof TitleDto, direction: newDirection });
  };

  const toggleColumn = (key: keyof TitleDto | 'actions') => {
    setVisibleColumns(prev => 
      prev.includes(key) 
        ? prev.filter(c => c !== key)
        : [...prev, key]
    );
  };

  const renderCellContent = (item: TitleDto, column: ColumnDef<TitleDto>) => {
    if (column.key === 'actions') return '-';
    const value = item[column.key];

    if (!value && value !== 0) return '-';

    switch (column.type) {
        case 'id':
            return <span className="font-mono text-xs bg-slate-100 dark:bg-white/10 px-2 py-1 rounded text-slate-700 dark:text-slate-300">#{String(value)}</span>;
        case 'user':
            return (
                <div className="flex items-center gap-1.5">
                    <User size={14} className="text-slate-400 shrink-0" />
                    <span className="truncate max-w-[150px]" title={String(value)}>
                        {String(value)}
                    </span>
                </div>
            );
        case 'date':
            return <div className="flex items-center gap-2 text-xs"><Calendar size={14} className="text-slate-400" />{new Date(String(value)).toLocaleDateString(i18n.language)}</div>;
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
      <div className="flex justify-center items-center py-20 min-h-[400px]">
        <div className="flex flex-col items-center gap-2">
           <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-current text-pink-500" />
           <div className="text-sm text-muted-foreground animate-pulse">
             {t('common.loading')}
           </div>
        </div>
      </div>
    );
  }

  if (titles.length === 0) {
    return (
      <div className="flex items-center justify-center py-20 min-h-[400px]">
        <div className="text-muted-foreground bg-slate-50 dark:bg-white/5 px-8 py-6 rounded-xl border border-dashed border-slate-200 dark:border-white/10 text-sm font-medium">
          {t('titleManagement.noData')}
        </div>
      </div>
    );
  }

  const headStyle = "cursor-pointer select-none text-slate-500 dark:text-slate-400 hover:text-pink-600 dark:hover:text-pink-400 transition-colors py-4 font-bold text-xs uppercase tracking-wider whitespace-nowrap";
  const cellStyle = "text-slate-600 dark:text-slate-400 text-sm py-4 border-b border-slate-100 dark:border-white/5 align-middle";

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
              {tableColumns.filter(col => visibleColumns.includes(col.key)).map((column) => (
                <TableHead 
                  key={column.key}
                  onClick={() => handleSort(column.key as string)}
                  className={headStyle}
                >
                  <div className="flex items-center gap-2">
                    {column.label}
                    <SortIcon column={column.key as string} />
                  </div>
                </TableHead>
              ))}
              <TableHead className={`${headStyle} text-right w-[100px]`}>
                {t('common.actions')}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedTitles.map((title: TitleDto, index: number) => (
              <TableRow 
                key={title.id || `title-${index}`}
                className="border-b border-slate-100 dark:border-white/5 transition-colors duration-200 hover:bg-pink-50/40 dark:hover:bg-pink-500/5 group last:border-0"
              >
                {tableColumns.filter(col => visibleColumns.includes(col.key)).map((column) => (
                  <TableCell key={`${title.id}-${column.key}`} className={`${cellStyle} ${column.className || ''}`}>
                    {renderCellContent(title, column)}
                  </TableCell>
                ))}
                <TableCell className={`${cellStyle} text-right`}>
                  <div className="flex justify-end gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onEdit(title)}
                      className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-500/10"
                    >
                      <Edit2 size={16} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteClick(title)}
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
            to: Math.min(currentPage * pageSize, processedTitles.length),
            total: processedTitles.length,
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
                {t('titleManagement.delete.title')}
                </DialogTitle>
                <DialogDescription className="text-slate-500 dark:text-slate-400 max-w-[280px] mx-auto text-sm leading-relaxed">
                {t('titleManagement.delete.confirm', {
                    name: selectedTitle?.titleName || '',
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
              disabled={deleteTitle.isPending}
              className="flex-1 h-12 rounded-xl bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white border-0 shadow-lg shadow-red-500/20 transition-all hover:scale-[1.02] font-bold"
            >
              {deleteTitle.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {t('common.delete')}
            </Button>
          </DialogFooter>

        </DialogContent>
      </Dialog>
    </div>
  );
}

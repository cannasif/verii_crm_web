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
import { Badge } from '@/components/ui/badge';
import { useDeleteContact } from '../hooks/useDeleteContact';
import type { ContactDto } from '../types/contact-types';
import { 
  Edit2, 
  Trash2, 
  ArrowUpDown, 
  ArrowUp, 
  ArrowDown, 
  Mail, 
  Phone, 
  Smartphone, 
  Calendar,
  User,
  Building2,
  Briefcase,
  GripVertical
} from 'lucide-react';
import { Alert02Icon } from 'hugeicons-react';

export interface ColumnDef<T> {
  key: keyof T;
  label: string;
  type: 'text' | 'email' | 'phone' | 'mobile' | 'date' | 'user' | 'customer' | 'title' | 'status' | 'salutation';
  className?: string;
}

interface ContactTableProps {
  contacts: ContactDto[];
  isLoading: boolean;
  onEdit: (contact: ContactDto) => void;
  visibleColumns: Array<keyof ContactDto>;
  pageSize: number;
}

export const getColumnsConfig = (t: TFunction): ColumnDef<ContactDto>[] => [
    { key: 'id', label: t('contactManagement.table.id', 'ID'), type: 'text', className: 'font-medium w-[60px] md:w-[80px]' },
    { key: 'salutation', label: t('contactManagement.table.salutation', 'Hitap'), type: 'salutation', className: 'w-[96px] md:w-[120px]' },
    { key: 'fullName', label: t('contactManagement.table.fullName', 'Ad Soyad'), type: 'text', className: 'font-semibold text-slate-900 dark:text-white min-w-[160px] md:min-w-[200px]' },
    { key: 'email', label: t('contactManagement.table.email', 'E-posta'), type: 'email', className: 'min-w-[160px] md:min-w-[200px] break-all' },
    { key: 'phone', label: t('contactManagement.table.phone', 'Telefon'), type: 'phone', className: 'whitespace-nowrap' },
    { key: 'mobile', label: t('contactManagement.table.mobile', 'Mobil'), type: 'mobile', className: 'whitespace-nowrap' },
    { key: 'customerName', label: t('contactManagement.table.customer', 'Müşteri'), type: 'customer', className: 'min-w-[160px] md:min-w-[200px]' },
    { key: 'titleName', label: t('contactManagement.table.title', 'Ünvan'), type: 'title', className: 'min-w-[120px] md:min-w-[150px]' },
    { key: 'createdDate', label: t('contactManagement.table.createdDate', 'Oluşturulma'), type: 'date', className: 'whitespace-nowrap' },
    { key: 'createdByFullUser', label: t('contactManagement.table.createdBy', 'Oluşturan'), type: 'user', className: 'whitespace-nowrap' },
    { key: 'status', label: t('contactManagement.table.status', 'Durum'), type: 'status', className: 'w-[84px] md:w-[100px]' },
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

export function ContactTable({
  contacts,
  isLoading,
  onEdit,
  visibleColumns,
  pageSize,
}: ContactTableProps): ReactElement {
  const { t, i18n } = useTranslation();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedContact, setSelectedContact] = useState<ContactDto | null>(null);
  
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    setCurrentPage(1);
  }, [pageSize, contacts]);

  const [sortConfig, setSortConfig] = useState<{ key: keyof ContactDto; direction: 'asc' | 'desc' } | null>(null);

  const tableColumns = useMemo(() => getColumnsConfig(t), [t]);

  // Column Order State
  const [columnOrder, setColumnOrder] = useState<string[]>(tableColumns.map(c => c.key));

  // Sync columnOrder with tableColumns when language changes or columns definition updates
  useEffect(() => {
    setColumnOrder((prevOrder) => {
      // Keep existing order for known keys, append new keys
      const newKeys = tableColumns.map(c => c.key);
      const existingKeys = prevOrder.filter(key => newKeys.includes(key as keyof ContactDto));
      const addedKeys = newKeys.filter(key => !prevOrder.includes(key));
      return [...existingKeys, ...addedKeys];
    });
  }, [tableColumns]);

  const orderedColumns = useMemo(() => {
    return columnOrder
      .filter(key => visibleColumns.includes(key as keyof ContactDto))
      .map(key => tableColumns.find(col => col.key === key))
      .filter((col): col is ColumnDef<ContactDto> => !!col);
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
      setColumnOrder((items) => {
        const oldIndex = items.indexOf(active.id as string);
        const newIndex = items.indexOf(over.id as string);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };
  
  const processedContacts = useMemo(() => {
    const result = [...contacts];

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
  }, [contacts, sortConfig]);

  const totalPages = Math.ceil(processedContacts.length / pageSize);
  const paginatedContacts = processedContacts.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const deleteContact = useDeleteContact();

  const handleDeleteClick = (contact: ContactDto): void => {
    setSelectedContact(contact);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async (): Promise<void> => {
    if (selectedContact) {
      await deleteContact.mutateAsync(selectedContact.id);
      setDeleteDialogOpen(false);
      setSelectedContact(null);
    }
  };

  const handleSort = (key: keyof ContactDto) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const renderCellContent = (item: ContactDto, column: ColumnDef<ContactDto>) => {
    const value = item[column.key];
    if (column.key === 'fullName') {
      const composedFullName = [item.firstName, item.middleName, item.lastName].filter(Boolean).join(' ').trim();
      if (composedFullName) {
        return composedFullName;
      }
    }
    
    if (!value && value !== 0) return '-';

    switch (column.type) {
        case 'email':
            return <div className="flex items-start gap-2"><Mail size={14} className="text-blue-500 mt-0.5 shrink-0" />{String(value)}</div>;
        case 'phone':
            return <div className="flex items-center gap-2"><Phone size={14} className="text-orange-500" />{String(value)}</div>;
        case 'mobile':
            return <div className="flex items-center gap-2"><Smartphone size={14} className="text-green-500" />{String(value)}</div>;
        case 'customer':
            return <div className="flex items-start gap-2"><Building2 size={14} className="text-slate-400 mt-0.5 shrink-0" />{String(value)}</div>;
        case 'title':
            return <div className="flex items-start gap-2"><Briefcase size={14} className="text-slate-400 mt-0.5 shrink-0" />{String(value)}</div>;
        case 'date':
            return <div className="flex items-center gap-2 text-xs"><Calendar size={14} className="text-pink-500/50" />{new Date(String(value)).toLocaleDateString(i18n.language)}</div>;
        case 'user':
            return <div className="flex items-center gap-2 text-xs"><User size={14} className="text-indigo-500/50" />{String(value)}</div>;
        case 'status':
            return (
                <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border-emerald-100 dark:border-emerald-500/20 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 shadow-none font-medium">
                    {value ? String(value) : t('common.active', 'Aktif')}
                </Badge>
            );
        case 'salutation': {
            const salutationValue = Number(value);
            const salutationText =
              salutationValue === 1
                ? t('contactManagement.form.salutationMr', 'Bay')
                : salutationValue === 2
                  ? t('contactManagement.form.salutationMs', 'Bayan')
                  : salutationValue === 3
                    ? t('contactManagement.form.salutationMrs', 'Sayın')
                    : salutationValue === 4
                      ? t('contactManagement.form.salutationDr', 'Dr.')
                      : t('contactManagement.form.salutationNone', 'Yok');
            return (
              <Badge variant="outline" className="text-xs font-medium">
                {salutationText}
              </Badge>
            );
        }
        default:
            return String(value);
    }
  };

  const SortIcon = ({ column }: { column: keyof ContactDto }): ReactElement => {
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
             {t('contactManagement.loading', 'Yükleniyor...')}
           </div>
        </div>
      </div>
    );
  }

  if (contacts.length === 0) {
    return (
      <div className="flex items-center justify-center py-20 min-h-[400px]">
        <div className="text-muted-foreground bg-slate-50 dark:bg-white/5 px-8 py-6 rounded-xl border border-dashed border-slate-200 dark:border-white/10 text-sm font-medium">
          {t('contactManagement.noData', 'Veri yok')}
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
        <div className="overflow-x-auto">
        <Table className="min-w-[900px] lg:min-w-[1100px]">
            <TableHeader className="bg-slate-50/50 dark:bg-white/5">
              <TableRow className="border-b border-slate-200 dark:border-white/10 hover:bg-transparent">
                <SortableContext 
                  items={orderedColumns.map(col => col.key)} 
                  strategy={horizontalListSortingStrategy}
                >
                  {orderedColumns.map((col) => (
                      <DraggableTableHead 
                          key={col.key} 
                          id={col.key as string}
                          onClick={() => handleSort(col.key)} 
                          className={headStyle}
                      >
                          <div className="flex items-center gap-2">
                              {col.label}
                              <SortIcon column={col.key} />
                          </div>
                      </DraggableTableHead>
                  ))}
                </SortableContext>
                <TableHead className={`${headStyle} text-right w-[84px] md:w-[100px]`}>
                  {t('contactManagement.actions', 'İşlemler')}
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedContacts.map((contact: ContactDto, index: number) => (
                <TableRow 
                  key={contact.id || `contact-${index}`}
                  className="border-b border-slate-100 dark:border-white/5 transition-colors duration-200 hover:bg-pink-50/40 dark:hover:bg-pink-500/5 group last:border-0 cursor-pointer"
                  onDoubleClick={() => onEdit(contact)}
                >
                  {orderedColumns.map((col) => (
                      <TableCell key={`${contact.id}-${col.key}`} className={`${cellStyle} ${col.className || ''}`}>
                          {renderCellContent(contact, col)}
                      </TableCell>
                  ))}

                  <TableCell className={`${cellStyle} text-right`}>
                    <div className="flex justify-end gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-500/10" onClick={() => onEdit(contact)}><Edit2 size={16} /></Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10" onClick={() => handleDeleteClick(contact)}><Trash2 size={16} /></Button>
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
          {t('contactManagement.table.showing', '{{from}}-{{to}} / {{total}} gösteriliyor', {
            from: (currentPage - 1) * pageSize + 1,
            to: Math.min(currentPage * pageSize, processedContacts.length),
            total: processedContacts.length,
          })}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))} disabled={currentPage <= 1} className="bg-white dark:bg-transparent border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/5">{t('contactManagement.previous', 'Önceki')}</Button>
          <div className="flex items-center px-4 text-sm font-medium text-slate-700 dark:text-slate-200">{t('contactManagement.table.page', 'Sayfa {{current}} / {{total}}', { current: currentPage, total: totalPages || 1 })}</div>
          <Button variant="outline" size="sm" onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))} disabled={currentPage >= totalPages} className="bg-white dark:bg-transparent border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/5">{t('contactManagement.next', 'Sonraki')}</Button>
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
                {t('contactManagement.delete.confirmTitle', 'İletişimi Sil')}
                </DialogTitle>
                <DialogDescription className="text-slate-500 dark:text-slate-400 max-w-[280px] mx-auto text-sm leading-relaxed">
                {t('contactManagement.delete.confirmMessage', '{{name}} iletişimini silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.', {
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
              disabled={deleteContact.isPending}
              className="flex-1 h-12 rounded-xl border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-white/5 font-semibold"
            >
              {t('contactManagement.cancel', 'Vazgeç')}
            </Button>
            
            <Button
              type="button"
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={deleteContact.isPending}
              className="flex-1 h-12 rounded-xl bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white border-0 shadow-lg shadow-red-500/20 transition-all hover:scale-[1.02] font-bold"
            >
              {deleteContact.isPending
                ? t('contactManagement.loading', 'Siliniyor...')
                : t('contactManagement.delete.action', 'Evet, Sil')}
            </Button>
          </DialogFooter>

        </DialogContent>
      </Dialog>
    </div>
  );
}

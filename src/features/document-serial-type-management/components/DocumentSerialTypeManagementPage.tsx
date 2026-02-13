import { type ReactElement, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useUIStore } from '@/stores/ui-store';
import { Button } from '@/components/ui/button';
import { DocumentSerialTypeTable } from './DocumentSerialTypeTable';
import { DocumentSerialTypeForm } from './DocumentSerialTypeForm';
import { useCreateDocumentSerialType } from '../hooks/useCreateDocumentSerialType';
import { useUpdateDocumentSerialType } from '../hooks/useUpdateDocumentSerialType';
import type { DocumentSerialTypeDto } from '../types/document-serial-type-types';
import type { DocumentSerialTypeFormSchema } from '../types/document-serial-type-types';
import { PricingRuleType } from '@/features/pricing-rule/types/pricing-rule-types';
import { Plus } from 'lucide-react';
import { PageToolbar } from '@/components/shared';
import { useQueryClient } from '@tanstack/react-query';
import { DOCUMENT_SERIAL_TYPE_QUERY_KEYS } from '../utils/query-keys';
import type { PagedFilter } from '@/types/api';

export function DocumentSerialTypeManagementPage(): ReactElement {
  const { t } = useTranslation();
  const { setPageTitle } = useUIStore();
  const [formOpen, setFormOpen] = useState(false);
  const [editingDocumentSerialType, setEditingDocumentSerialType] = useState<DocumentSerialTypeDto | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [pageSize] = useState(20);
  const [sortBy, setSortBy] = useState('Id');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<Record<string, unknown>>({});

  const createDocumentSerialType = useCreateDocumentSerialType();
  const updateDocumentSerialType = useUpdateDocumentSerialType();
  const queryClient = useQueryClient();

  useEffect(() => {
    setPageTitle(t('documentSerialTypeManagement.menu'));
    return () => {
      setPageTitle(null);
    };
  }, [t, setPageTitle]);

  useEffect(() => {
    const newFilters: PagedFilter[] = [];
    if (searchTerm) {
      newFilters.push(
        { column: 'serialPrefix', operator: 'contains', value: searchTerm },
        { column: 'customerTypeName', operator: 'contains', value: searchTerm },
        { column: 'salesRepFullName', operator: 'contains', value: searchTerm }
      );
    }
    setFilters(newFilters.length > 0 ? { filters: newFilters } : {});
    setPageNumber(1);
  }, [searchTerm]);

  const handleAddClick = (): void => {
    setEditingDocumentSerialType(null);
    setFormOpen(true);
  };

  const handleEdit = (documentSerialType: DocumentSerialTypeDto): void => {
    setEditingDocumentSerialType(documentSerialType);
    setFormOpen(true);
  };

  const handleFormSubmit = async (data: DocumentSerialTypeFormSchema): Promise<void> => {
    if (editingDocumentSerialType) {
      await updateDocumentSerialType.mutateAsync({
        id: editingDocumentSerialType.id,
        data: { 
          ruleType: data.ruleType as PricingRuleType, 
          customerTypeId: data.customerTypeId,
          salesRepId: data.salesRepId,
          serialPrefix: data.serialPrefix,
          serialLength: data.serialLength,
          serialStart: data.serialStart,
          serialCurrent: data.serialCurrent,
          serialIncrement: data.serialIncrement,
        },
      });
    } else {
      await createDocumentSerialType.mutateAsync({ 
        ruleType: data.ruleType as PricingRuleType, 
        customerTypeId: data.customerTypeId,
        salesRepId: data.salesRepId,
        serialPrefix: data.serialPrefix,
        serialLength: data.serialLength,
        serialStart: data.serialStart,
        serialCurrent: data.serialCurrent,
        serialIncrement: data.serialIncrement,
      });
    }
    setFormOpen(false);
    setEditingDocumentSerialType(null);
  };

  const handleSortChange = (newSortBy: string, newSortDirection: 'asc' | 'desc'): void => {
    setSortBy(newSortBy);
    setSortDirection(newSortDirection);
    setPageNumber(1);
  };

  const handleRefresh = async (): Promise<void> => {
    await queryClient.invalidateQueries({
      queryKey: [DOCUMENT_SERIAL_TYPE_QUERY_KEYS.LIST],
    });
  };

  return (
    <div className="relative min-h-screen space-y-6 p-4 md:p-8 overflow-hidden">
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-pink-500/10 blur-[120px] pointer-events-none dark:block hidden" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-orange-500/10 blur-[120px] pointer-events-none dark:block hidden" />

      <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-6 pb-2">
        <div className="space-y-1">
          <h1 className="text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-foreground">
            {t('documentSerialTypeManagement.menu')}
          </h1>
          <div className="flex flex-col gap-1">
            <p className="text-zinc-500 dark:text-muted-foreground text-sm flex items-center gap-2 font-medium">
              <span className="w-2 h-2 rounded-full bg-pink-500 animate-pulse shadow-[0_0_8px_rgba(236,72,153,0.6)]" />
              {t('documentSerialTypeManagement.description')}
            </p>
          </div>
        </div>

        <div className="w-full md:w-auto flex flex-col md:flex-row items-center gap-3">
          <div className="w-full md:flex-1">
            <PageToolbar
              searchPlaceholder={t('documentSerialTypeManagement.search')}
              searchValue={searchTerm}
              onSearchChange={setSearchTerm}
              onRefresh={handleRefresh}
            />
          </div>
          <Button
            onClick={handleAddClick}
            className="px-6 py-2 bg-gradient-to-r from-pink-600 to-orange-600 rounded-lg text-white text-sm font-bold shadow-lg shadow-pink-500/20 hover:scale-105 transition-transform border-0 hover:text-white shrink-0"
          >
            <Plus size={18} className="mr-2" />
            {t('documentSerialTypeManagement.addButton')}
          </Button>
        </div>
      </div>

      <div className="relative z-10 bg-white/50 dark:bg-card/30 backdrop-blur-xl border border-white/20 dark:border-border/50 rounded-2xl shadow-sm dark:shadow-2xl overflow-hidden">
        <DocumentSerialTypeTable
          onEdit={handleEdit}
          pageNumber={pageNumber}
          pageSize={pageSize}
          sortBy={sortBy}
          sortDirection={sortDirection}
          filters={filters}
          onPageChange={setPageNumber}
          onSortChange={handleSortChange}
        />
      </div>

      <DocumentSerialTypeForm
        open={formOpen}
        onOpenChange={setFormOpen}
        onSubmit={handleFormSubmit}
        documentSerialType={editingDocumentSerialType}
        isLoading={createDocumentSerialType.isPending || updateDocumentSerialType.isPending}
      />
    </div>
  );
}

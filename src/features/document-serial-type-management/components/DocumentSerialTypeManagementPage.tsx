import { type ReactElement, useState, useEffect, useMemo } from 'react';
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
import { Plus, Filter } from 'lucide-react';
import { PageToolbar, AdvancedFilter } from '@/components/shared';
import { useQueryClient } from '@tanstack/react-query';
import { DOCUMENT_SERIAL_TYPE_QUERY_KEYS } from '../utils/query-keys';
import type { PagedFilter } from '@/types/api';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  documentSerialTypeRowsToBackendFilters,
  DOCUMENT_SERIAL_TYPE_FILTER_COLUMNS,
} from '../types/document-serial-type-filter.types';
import type { FilterRow } from '@/lib/advanced-filter-types';

function buildSearchFilters(searchTerm: string): PagedFilter[] {
  const trimmed = searchTerm.trim();
  if (!trimmed) return [];
  return [
    { column: 'serialPrefix', operator: 'Contains', value: trimmed },
    { column: 'customerTypeName', operator: 'Contains', value: trimmed },
    { column: 'salesRepFullName', operator: 'Contains', value: trimmed },
  ];
}

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
  const [showFilters, setShowFilters] = useState(false);
  const [draftFilterRows, setDraftFilterRows] = useState<FilterRow[]>([]);
  const [appliedAdvancedFilters, setAppliedAdvancedFilters] = useState<PagedFilter[]>([]);

  const createDocumentSerialType = useCreateDocumentSerialType();
  const updateDocumentSerialType = useUpdateDocumentSerialType();
  const queryClient = useQueryClient();

  const searchFilters = useMemo(() => buildSearchFilters(searchTerm), [searchTerm]);
  const apiFilters = useMemo<PagedFilter[]>(
    () => [...searchFilters, ...appliedAdvancedFilters],
    [searchFilters, appliedAdvancedFilters]
  );
  const filtersParam = useMemo(
    () => (apiFilters.length > 0 ? { filters: apiFilters } : {}),
    [apiFilters]
  );

  useEffect(() => {
    setPageTitle(t('documentSerialTypeManagement.menu'));
    return () => {
      setPageTitle(null);
    };
  }, [t, setPageTitle]);

  useEffect(() => {
    setPageNumber(1);
  }, [searchTerm, appliedAdvancedFilters]);

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

  const handleAdvancedSearch = (): void => {
    setAppliedAdvancedFilters(documentSerialTypeRowsToBackendFilters(draftFilterRows));
    setSearchTerm('');
    setShowFilters(false);
  };

  const handleAdvancedClear = (): void => {
    setDraftFilterRows([]);
    setAppliedAdvancedFilters([]);
  };

  const hasFiltersActive = appliedAdvancedFilters.length > 0;

  return (
    <div className="w-full space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 pt-2">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white transition-colors">
            {t('documentSerialTypeManagement.menu')}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium transition-colors">
            {t('documentSerialTypeManagement.description')}
          </p>
        </div>

        <Button
          onClick={handleAddClick}
          className="px-6 py-2 bg-linear-to-r from-pink-600 to-orange-600 rounded-lg text-white text-sm font-bold shadow-lg shadow-pink-500/20 hover:scale-105 transition-transform border-0 hover:text-white"
        >
          <Plus size={18} className="mr-2" />
          {t('documentSerialTypeManagement.addButton')}
        </Button>
      </div>

      <div className="bg-white/70 dark:bg-[#1a1025]/60 backdrop-blur-xl border border-white/60 dark:border-white/5 shadow-sm rounded-2xl p-5 transition-all duration-300">
        <PageToolbar
          searchPlaceholder={t('documentSerialTypeManagement.search')}
          searchValue={searchTerm}
          onSearchChange={setSearchTerm}
          onRefresh={handleRefresh}
          rightSlot={
            <Popover open={showFilters} onOpenChange={setShowFilters}>
              <PopoverTrigger asChild>
                <Button
                  variant={hasFiltersActive ? 'default' : 'outline'}
                  size="sm"
                  className={`h-9 border-dashed border-slate-300 dark:border-white/20 text-xs sm:text-sm ${
                    hasFiltersActive
                      ? 'bg-pink-500/20 text-pink-700 dark:text-pink-300 border-pink-500/30 hover:bg-pink-500/30'
                      : 'bg-transparent hover:bg-slate-50 dark:hover:bg-white/5'
                  }`}
                >
                  <Filter className="mr-2 h-4 w-4" />
                  {t('common.filters')}
                  {hasFiltersActive && (
                    <span className="ml-2 h-2 w-2 rounded-full bg-pink-500" />
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-[420px] p-0 bg-[#151025] border border-white/10 shadow-2xl rounded-2xl overflow-hidden">
                <AdvancedFilter
                  columns={DOCUMENT_SERIAL_TYPE_FILTER_COLUMNS}
                  defaultColumn="serialPrefix"
                  draftRows={draftFilterRows}
                  onDraftRowsChange={setDraftFilterRows}
                  onSearch={handleAdvancedSearch}
                  onClear={handleAdvancedClear}
                  translationNamespace="documentSerialTypeManagement"
                  embedded
                />
              </PopoverContent>
            </Popover>
          }
        />
      </div>

      <div className="flex-1 overflow-hidden rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0b0713] shadow-sm">
        <DocumentSerialTypeTable
          onEdit={handleEdit}
          pageNumber={pageNumber}
          pageSize={pageSize}
          sortBy={sortBy}
          sortDirection={sortDirection}
          filters={filtersParam}
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

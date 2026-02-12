import { type ReactElement, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useUIStore } from '@/stores/ui-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search, RefreshCw, X } from 'lucide-react';
import { SalesTypeTable } from './SalesTypeTable';
import { SalesTypeForm } from './SalesTypeForm';
import { useCreateSalesType } from '../hooks/useCreateSalesType';
import { useUpdateSalesType } from '../hooks/useUpdateSalesType';
import { useSalesTypeList } from '../hooks/useSalesTypeList';
import type { SalesTypeGetDto } from '../types/sales-type-types';
import type { SalesTypeFormSchema } from '../types/sales-type-types';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../utils/query-keys';

const DEFAULT_PAGE_SIZE = 10;

export function SalesTypeManagementPage(): ReactElement {
  const { t } = useTranslation();
  const { setPageTitle } = useUIStore();
  const [formOpen, setFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<SalesTypeGetDto | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');

  const queryClient = useQueryClient();
  const createSalesType = useCreateSalesType();
  const updateSalesType = useUpdateSalesType();

  const { data: apiResponse, isLoading } = useSalesTypeList({
    pageNumber,
    pageSize: DEFAULT_PAGE_SIZE,
    ...(searchTerm.trim() ? { filters: [{ column: 'name', operator: 'contains', value: searchTerm.trim() }] } : {}),
  });

  const items = apiResponse?.data ?? [];
  const totalCount = apiResponse?.totalCount ?? 0;

  useEffect(() => {
    setPageTitle(t('salesTypeManagement.menu'));
    return () => {
      setPageTitle(null);
    };
  }, [t, setPageTitle]);

  const handleAddClick = (): void => {
    setEditingItem(null);
    setFormOpen(true);
  };

  const handleEdit = (item: SalesTypeGetDto): void => {
    setEditingItem(item);
    setFormOpen(true);
  };

  const handleFormSubmit = async (data: SalesTypeFormSchema): Promise<void> => {
    if (editingItem) {
      await updateSalesType.mutateAsync({
        id: editingItem.id,
        data: { salesType: data.salesType, name: data.name.trim() },
      });
    } else {
      await createSalesType.mutateAsync({ salesType: data.salesType, name: data.name.trim() });
    }
    setFormOpen(false);
    setEditingItem(null);
  };

  const handleRefresh = async (): Promise<void> => {
    await queryClient.invalidateQueries({
      queryKey: queryKeys.list({ pageNumber, pageSize: DEFAULT_PAGE_SIZE }),
    });
  };

  const clearSearch = (): void => {
    setSearchTerm('');
    setPageNumber(1);
  };

  return (
    <div className="w-full space-y-6 relative">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-2">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white transition-colors">
            {t('salesTypeManagement.menu')}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium transition-colors mt-1">
            {t('salesTypeManagement.description')}
          </p>
        </div>
        <Button
          onClick={handleAddClick}
          className="px-6 py-2 bg-linear-to-r from-pink-600 to-orange-600 rounded-xl text-white text-sm font-bold shadow-lg shadow-pink-500/20 hover:scale-105 transition-transform border-0 hover:text-white h-11"
        >
          <Plus size={18} className="mr-2" />
          {t('salesTypeManagement.addButton')}
        </Button>
      </div>

      <div className="bg-white/70 dark:bg-[#1a1025]/60 backdrop-blur-xl border border-white/60 dark:border-white/5 shadow-sm rounded-2xl p-5 flex flex-col gap-5 transition-all duration-300">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto">
            <div className="relative group w-full sm:w-72 lg:w-96">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-pink-500 transition-colors" />
              <Input
                placeholder={t('salesTypeManagement.searchPlaceholder')}
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setPageNumber(1);
                }}
                className="pl-10 h-10 bg-white/50 dark:bg-card/50 border-slate-200 dark:border-white/10 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-pink-500 dark:focus-visible:border-pink-500 rounded-xl transition-all w-full"
              />
              {searchTerm && (
                <button
                  onClick={clearSearch}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-100 dark:hover:bg-white/10 rounded-full transition-colors"
                >
                  <X size={14} className="text-slate-400" />
                </button>
              )}
            </div>
            <div className="flex items-center gap-3">
              <div
                className="h-10 w-10 flex items-center justify-center bg-white/50 dark:bg-card/50 border border-slate-200 dark:border-white/10 rounded-xl cursor-pointer hover:border-pink-500/30 hover:bg-pink-50/50 dark:hover:bg-pink-500/10 transition-all shrink-0"
                onClick={handleRefresh}
              >
                <RefreshCw size={18} className="text-slate-500 dark:text-slate-400" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white/70 dark:bg-[#1a1025]/60 backdrop-blur-xl border border-white/60 dark:border-white/5 shadow-sm rounded-2xl p-0 sm:p-1 transition-all duration-300 overflow-hidden">
        <SalesTypeTable
          items={items}
          totalCount={totalCount}
          pageNumber={pageNumber}
          pageSize={DEFAULT_PAGE_SIZE}
          isLoading={isLoading}
          onEdit={handleEdit}
          onPageChange={setPageNumber}
        />
      </div>

      <SalesTypeForm
        open={formOpen}
        onOpenChange={setFormOpen}
        onSubmit={handleFormSubmit}
        salesType={editingItem}
        isLoading={createSalesType.isPending || updateSalesType.isPending}
      />
    </div>
  );
}

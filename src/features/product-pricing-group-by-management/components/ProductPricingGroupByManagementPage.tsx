import { type ReactElement, useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useUIStore } from '@/stores/ui-store';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { PageToolbar } from '@/components/shared';
import { ProductPricingGroupByTable } from './ProductPricingGroupByTable';
import { ProductPricingGroupByForm } from './ProductPricingGroupByForm';
import { useCreateProductPricingGroupBy } from '../hooks/useCreateProductPricingGroupBy';
import { useUpdateProductPricingGroupBy } from '../hooks/useUpdateProductPricingGroupBy';
import { useProductPricingGroupBys } from '../hooks/useProductPricingGroupBys';
import type { ProductPricingGroupByDto } from '../types/product-pricing-group-by-types';
import type { ProductPricingGroupByFormSchema } from '../types/product-pricing-group-by-types';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../utils/query-keys';

const EMPTY_ITEMS: ProductPricingGroupByDto[] = [];

export function ProductPricingGroupByManagementPage(): ReactElement {
  const { t } = useTranslation();
  const { setPageTitle } = useUIStore();
  const [formOpen, setFormOpen] = useState(false);
  const [editingProductPricingGroupBy, setEditingProductPricingGroupBy] = useState<ProductPricingGroupByDto | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');

  const createProductPricingGroupBy = useCreateProductPricingGroupBy();
  const updateProductPricingGroupBy = useUpdateProductPricingGroupBy();
  const queryClient = useQueryClient();

  const { data: apiResponse, isLoading } = useProductPricingGroupBys({
    pageNumber: 1,
    pageSize: 10000,
    sortBy: 'Id',
    sortDirection: 'desc',
  });

  const items = useMemo<ProductPricingGroupByDto[]>(
    () => apiResponse?.data ?? EMPTY_ITEMS,
    [apiResponse?.data]
  );

  const usedErpGroupCodes = useMemo((): string[] => {
    return [...new Set(items.map((x) => x.erpGroupCode))];
  }, [items]);

  const excludeGroupCodes = useMemo((): string[] => {
    if (!editingProductPricingGroupBy) return usedErpGroupCodes;
    return usedErpGroupCodes.filter((c) => c !== editingProductPricingGroupBy.erpGroupCode);
  }, [usedErpGroupCodes, editingProductPricingGroupBy]);

  useEffect(() => {
    setPageTitle(t('productPricingGroupByManagement.title'));
    return () => {
      setPageTitle(null);
    };
  }, [t, setPageTitle]);

  const filteredItems = useMemo(() => {
    let result: ProductPricingGroupByDto[] = [...items];

    if (searchTerm) {
      const lowerTerm = searchTerm.toLowerCase();
      result = result.filter((item) =>
        item.erpGroupCode?.toLowerCase().includes(lowerTerm)
      );
    }

    if (activeFilter === 'inactive') {
      result = [];
    }

    return result;
  }, [items, searchTerm, activeFilter]);

  const handleRefresh = async (): Promise<void> => {
    await queryClient.invalidateQueries({
      queryKey: queryKeys.list({ pageNumber: 1, pageSize: 10000, sortBy: 'Id', sortDirection: 'desc' }),
    });
  };

  const handleAddClick = (): void => {
    setEditingProductPricingGroupBy(null);
    setFormOpen(true);
  };

  const handleEdit = (productPricingGroupBy: ProductPricingGroupByDto): void => {
    setEditingProductPricingGroupBy(productPricingGroupBy);
    setFormOpen(true);
  };

  const handleFormSubmit = async (data: ProductPricingGroupByFormSchema): Promise<void> => {
    if (editingProductPricingGroupBy) {
      await updateProductPricingGroupBy.mutateAsync({
        id: editingProductPricingGroupBy.id,
        data: {
          erpGroupCode: data.erpGroupCode,
          currency: data.currency,
          listPrice: data.listPrice,
          costPrice: data.costPrice,
          discount1: data.discount1 || undefined,
          discount2: data.discount2 || undefined,
          discount3: data.discount3 || undefined,
        },
      });
    } else {
      await createProductPricingGroupBy.mutateAsync({
        erpGroupCode: data.erpGroupCode,
        currency: data.currency,
        listPrice: data.listPrice,
        costPrice: data.costPrice,
        discount1: data.discount1 || undefined,
        discount2: data.discount2 || undefined,
        discount3: data.discount3 || undefined,
      });
    }
    setFormOpen(false);
    setEditingProductPricingGroupBy(null);
  };

  return (
    <div className="w-full space-y-6 relative">
      
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-2">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white transition-colors">
            {t('productPricingGroupByManagement.title')}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium transition-colors mt-1">
            {t('productPricingGroupByManagement.description')}
          </p>
        </div>
        
        <Button 
          onClick={handleAddClick}
          className="px-6 py-2 bg-linear-to-r from-pink-600 to-orange-600 rounded-lg text-white text-sm font-bold shadow-lg shadow-pink-500/20 hover:scale-105 transition-transform border-0 hover:text-white"
        >
          <Plus size={18} className="mr-2" />
          {t('productPricingGroupByManagement.add')}
        </Button>
      </div>

      <div className="bg-white/70 dark:bg-[#1a1025]/60 backdrop-blur-xl border border-white/60 dark:border-white/5 shadow-sm rounded-2xl p-5 flex flex-col gap-5 transition-all duration-300">
        <PageToolbar
          searchPlaceholder={t('common.search')}
          searchValue={searchTerm}
          onSearchChange={setSearchTerm}
          onRefresh={handleRefresh}
          rightSlot={
            <div className="flex items-center gap-1 bg-slate-100/50 dark:bg-white/5 p-1 rounded-xl w-full lg:w-auto overflow-x-auto">
                {['all', 'active', 'inactive'].map((filter) => (
                    <button
                        key={filter}
                        onClick={() => setActiveFilter(filter)}
                        className={`
                            flex-1 lg:flex-none px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap
                            ${activeFilter === filter 
                                ? 'bg-white dark:bg-[#1a1025] text-pink-600 dark:text-pink-400 shadow-sm border border-slate-200 dark:border-white/10' 
                                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}
                        `}
                    >
                        {filter === 'all' ? t('common.all') : filter === 'active' ? t('status.active') : t('status.inactive')}
                    </button>
                ))}
            </div>
          }
        />
      </div>

      <div className="bg-white/70 dark:bg-[#1a1025]/60 backdrop-blur-xl border border-white/60 dark:border-white/5 shadow-sm rounded-2xl p-0 sm:p-1 transition-all duration-300 overflow-hidden">
        <ProductPricingGroupByTable 
          items={filteredItems}
          isLoading={isLoading}
          onEdit={handleEdit}
        />
      </div>

      <ProductPricingGroupByForm
        open={formOpen}
        onOpenChange={setFormOpen}
        onSubmit={handleFormSubmit}
        productPricingGroupBy={editingProductPricingGroupBy}
        isLoading={createProductPricingGroupBy.isPending || updateProductPricingGroupBy.isPending}
        excludeGroupCodes={excludeGroupCodes}
      />
    </div>
  );
}

import { type ReactElement, useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useUIStore } from '@/stores/ui-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Plus, RefreshCw, X } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { ProductPricingTable } from './ProductPricingTable';
import { ProductPricingForm } from './ProductPricingForm';
import { useCreateProductPricing } from '../hooks/useCreateProductPricing';
import { useUpdateProductPricing } from '../hooks/useUpdateProductPricing';
import { useDeleteProductPricing } from '../hooks/useDeleteProductPricing';
import { useProductPricings } from '../hooks/useProductPricings';
import type { ProductPricingGetDto } from '../types/product-pricing-types';
import type { ProductPricingFormSchema } from '../types/product-pricing-types';
import type { PagedFilter } from '@/types/api';

export function ProductPricingManagementPage(): ReactElement {
  const { t } = useTranslation();
  const { setPageTitle } = useUIStore();
  const [formOpen, setFormOpen] = useState(false);
  const [editingProductPricing, setEditingProductPricing] = useState<ProductPricingGetDto | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [pageSize] = useState(20);
  const [sortBy, setSortBy] = useState('Id');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [filters, setFilters] = useState<PagedFilter[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const queryClient = useQueryClient();
  const createProductPricing = useCreateProductPricing();
  const updateProductPricing = useUpdateProductPricing();
  const deleteProductPricing = useDeleteProductPricing();

  const { data: usedProductsData } = useProductPricings({
    pageNumber: 1,
    pageSize: 10000,
    sortBy: 'Id',
    sortDirection: 'desc',
  });

  const usedErpProductCodes = useMemo((): string[] => {
    const items = usedProductsData?.data ?? [];
    return [...new Set(items.map((x) => x.erpProductCode))];
  }, [usedProductsData]);

  const excludeProductCodes = useMemo((): string[] => {
    if (!editingProductPricing) return usedErpProductCodes;
    return usedErpProductCodes.filter((c) => c !== editingProductPricing.erpProductCode);
  }, [usedErpProductCodes, editingProductPricing]);

  useEffect(() => {
    setPageTitle(t('productPricingManagement.title'));
    return () => {
      setPageTitle(null);
    };
  }, [t, setPageTitle]);

  useEffect(() => {
    const newFilters: PagedFilter[] = [];

    if (searchQuery) {
      newFilters.push({
        column: 'ErpProductCode',
        operator: 'contains',
        value: searchQuery,
      });
    }

    if (activeFilter === 'active') {
      newFilters.push({ column: 'IsDeleted', operator: 'eq', value: 'false' });
    } else if (activeFilter === 'archive') {
      newFilters.push({ column: 'IsDeleted', operator: 'eq', value: 'true' });
    }

    setFilters(newFilters);
    setPageNumber(1);
  }, [searchQuery, activeFilter]);

  const handleAddClick = (): void => {
    setEditingProductPricing(null);
    setFormOpen(true);
  };

  const clearSearch = () => {
    setSearchQuery('');
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ['product-pricings'] });
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const handleEdit = (productPricing: ProductPricingGetDto): void => {
    setEditingProductPricing(productPricing);
    setFormOpen(true);
  };

  const handleFormSubmit = async (data: ProductPricingFormSchema): Promise<void> => {
    if (editingProductPricing) {
      await updateProductPricing.mutateAsync({
        id: editingProductPricing.id,
        data: {
          id: editingProductPricing.id,
          erpProductCode: data.erpProductCode,
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
      await createProductPricing.mutateAsync({
        erpProductCode: data.erpProductCode,
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
    setEditingProductPricing(null);
  };

  const handleDeleteClick = async (id: number): Promise<void> => {
      await deleteProductPricing.mutateAsync(id);
      setFormOpen(false);
      setEditingProductPricing(null);
  };

  const handleSortChange = (newSortBy: string, newSortDirection: 'asc' | 'desc'): void => {
    setSortBy(newSortBy);
    setSortDirection(newSortDirection);
    setPageNumber(1);
  };

  return (
    <div className="w-full space-y-6">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 pt-2">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white transition-colors">
            {t('productPricingManagement.title')}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium transition-colors">
            {t('productPricingManagement.description')}
          </p>
        </div>
        
        <Button 
          onClick={handleAddClick}
          className="px-6 py-2 bg-gradient-to-r from-pink-600 to-orange-600 rounded-lg text-white text-sm font-bold shadow-lg shadow-pink-500/20 hover:scale-105 transition-transform border-0 hover:text-white"
        >
          <Plus size={18} className="mr-2" />
          {t('productPricingManagement.create')}
        </Button>
      </div>

      {/* Filter Section */}
      <div className="bg-white/70 dark:bg-[#1a1025]/60 backdrop-blur-xl border border-white/60 dark:border-white/5 shadow-sm rounded-2xl p-5 flex flex-col md:flex-row items-center justify-between gap-5 transition-all duration-300">
          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="relative group w-full md:w-96">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-pink-500 transition-colors" />
              <Input
                placeholder={t('productPricingManagement.searchPlaceholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-10 bg-white/50 dark:bg-card/50 border-slate-200 dark:border-white/10 focus:border-pink-500/50 focus:ring-pink-500/20 rounded-xl transition-all"
              />
              {searchQuery && (
                <button
                  onClick={clearSearch}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-100 dark:hover:bg-white/10 rounded-full transition-colors"
                >
                  <X size={14} className="text-slate-400" />
                </button>
              )}
            </div>
            <div 
              className="h-10 w-10 flex items-center justify-center bg-white/50 dark:bg-card/50 border border-slate-200 dark:border-white/10 rounded-xl cursor-pointer hover:border-pink-500/30 hover:bg-pink-50/50 dark:hover:bg-pink-500/10 transition-all group shrink-0"
              onClick={handleRefresh}
            >
              <RefreshCw 
                size={18} 
                className={`text-slate-500 dark:text-slate-400 group-hover:text-pink-600 dark:group-hover:text-pink-400 transition-colors ${isRefreshing ? 'animate-spin' : ''}`} 
              />
            </div>
          </div>
          <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-2 md:pb-0 scrollbar-hide">
             {['all', 'active', 'archive'].map((filter) => (
               <Button
                 key={filter}
                 variant="ghost"
                 onClick={() => setActiveFilter(filter)}
                 className={`
                   rounded-lg px-4 h-9 text-xs font-bold uppercase tracking-wider transition-all
                   ${activeFilter === filter 
                     ? 'bg-pink-500/10 text-pink-600 dark:text-pink-400 border border-pink-500/20' 
                     : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white border border-transparent'}
                 `}
               >
                 {t(`productPricingManagement.filter.${filter}`, filter === 'all' ? 'Tümü' : filter === 'active' ? 'Aktif' : 'Arşiv')}
               </Button>
             ))}
          </div>
      </div>

      {/* Table Section */}
      <div className="bg-white/70 dark:bg-[#1a1025]/60 backdrop-blur-xl border border-white/60 dark:border-white/5 shadow-sm rounded-2xl p-6 transition-all duration-300">
        <ProductPricingTable
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

      <ProductPricingForm
        open={formOpen}
        onOpenChange={setFormOpen}
        onSubmit={handleFormSubmit}
        onDelete={handleDeleteClick}
        productPricing={editingProductPricing}
        isLoading={createProductPricing.isPending || updateProductPricing.isPending || deleteProductPricing.isPending}
        excludeProductCodes={excludeProductCodes}
      />
    </div>
  );
}
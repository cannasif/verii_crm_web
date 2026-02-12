import { type ReactElement, useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { useUIStore } from '@/stores/ui-store';
import { Plus, Search, RefreshCw, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useQueryClient } from '@tanstack/react-query';
import { ActivityTypeTable } from './ActivityTypeTable';
import { ActivityTypeForm } from './ActivityTypeForm';
import { useCreateActivityType } from '../hooks/useCreateActivityType';
import { useUpdateActivityType } from '../hooks/useUpdateActivityType';
import { useActivityTypeList } from '../hooks/useActivityTypeList';
import type { ActivityTypeDto, ActivityTypeFormSchema } from '../types/activity-type-types';

export function ActivityTypeManagementPage(): ReactElement {
  const { t } = useTranslation();
  const { setPageTitle } = useUIStore();
  const [searchParams, setSearchParams] = useSearchParams();
  
  const [formOpen, setFormOpen] = useState(false);
  const [editingActivityType, setEditingActivityType] = useState<ActivityTypeDto | null>(null);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const queryClient = useQueryClient();
  const createActivityType = useCreateActivityType();
  const updateActivityType = useUpdateActivityType();

  const { data: apiResponse, isLoading } = useActivityTypeList({ 
    pageNumber: 1, 
    pageSize: 10000,
    sortBy: 'Id',
    sortDirection: 'desc'
  });

  const allActivityTypes = useMemo(() => apiResponse?.data ?? [], [apiResponse]);

  useEffect(() => {
    setPageTitle(t('activityType.management.title'));
    return () => {
      setPageTitle(null);
    };
  }, [t, setPageTitle]);

  useEffect(() => {
    if (searchParams.get('new') === 'true') {
      setFormOpen(true);
      setEditingActivityType(null);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const filteredActivityTypes = useMemo<ActivityTypeDto[]>(() => {
    if (!allActivityTypes) return [];

    let result: ActivityTypeDto[] = [...allActivityTypes];

    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase();
      result = result.filter((item) => 
        (item.name && item.name.toLowerCase().includes(lowerSearch)) ||
        (item.description && item.description.toLowerCase().includes(lowerSearch)) ||
        (item.createdByFullUser && item.createdByFullUser.toLowerCase().includes(lowerSearch))
      );
    }

    return result;
  }, [allActivityTypes, searchTerm]);

  const clearSearch = () => setSearchTerm('');

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ['activity-types'] });
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const handleAddClick = () => {
    setEditingActivityType(null);
    setFormOpen(true);
  };

  const handleEditClick = (activityType: ActivityTypeDto) => {
    setEditingActivityType(activityType);
    setFormOpen(true);
  };

  const handleFormSubmit = async (data: ActivityTypeFormSchema) => {
    try {
      const payload = {
        ...data,
        description: data.description || undefined
      };

      if (editingActivityType) {
        await updateActivityType.mutateAsync({ 
          id: editingActivityType.id, 
          data: payload
        });
      } else {
        await createActivityType.mutateAsync(payload);
      }
      setFormOpen(false);
      setEditingActivityType(null);
    } catch (error) {
      console.error('Error saving activity type:', error);
    }
  };

  return (
    <div className="w-full space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 pt-2">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white transition-colors">
            {t('activityType.management.title')}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium transition-colors">
            {t('activityType.management.description')}
          </p>
        </div>
        
        <Button 
          onClick={handleAddClick}
          className="px-6 py-2 bg-gradient-to-r from-pink-600 to-orange-600 rounded-lg text-white text-sm font-bold shadow-lg shadow-pink-500/20 hover:scale-105 transition-transform border-0 hover:text-white"
        >
          <Plus size={18} className="mr-2" />
          {t('activityType.create')}
        </Button>
      </div>

      <div className="bg-white/70 dark:bg-[#1a1025]/60 backdrop-blur-xl border border-white/60 dark:border-white/5 shadow-sm rounded-2xl p-5 flex flex-col md:flex-row items-center justify-between gap-5 transition-all duration-300">
          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="relative group w-full md:w-96">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-pink-500 transition-colors" />
              <Input
                placeholder={t('common.search')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-10 bg-white/50 dark:bg-card/50 border-slate-200 dark:border-white/10 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-pink-500 dark:focus-visible:border-pink-500 rounded-xl transition-all"
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
            
            <div 
              className="h-10 w-10 flex items-center justify-center bg-white/50 dark:bg-card/50 border border-slate-200 dark:border-white/10 rounded-xl cursor-pointer hover:border-pink-500/30 hover:bg-pink-50/50 dark:hover:bg-pink-500/10 transition-all group shrink-0"
              onClick={handleRefresh}
              title={t('common.refresh')}
            >
              <RefreshCw 
                size={18} 
                className={`text-slate-500 dark:text-slate-400 group-hover:text-pink-600 dark:group-hover:text-pink-400 transition-colors ${isRefreshing ? 'animate-spin' : ''}`} 
              />
            </div>
          </div>
      </div>

      <div className="flex-1 overflow-hidden rounded-xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0b0713] shadow-sm">
        <ActivityTypeTable 
          activityTypes={filteredActivityTypes} 
          isLoading={isLoading} 
          onEdit={handleEditClick}
        />
      </div>

      <ActivityTypeForm
        open={formOpen}
        onOpenChange={setFormOpen}
        onSubmit={handleFormSubmit}
        activityType={editingActivityType}
        isLoading={createActivityType.isPending || updateActivityType.isPending}
      />
    </div>
  );
}

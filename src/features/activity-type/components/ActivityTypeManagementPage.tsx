import { type ReactElement, useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { useUIStore } from '@/stores/ui-store';
import { Plus, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useQueryClient } from '@tanstack/react-query';
import { PageToolbar, AdvancedFilter } from '@/components/shared';
import { ACTIVITY_TYPE_QUERY_KEYS } from '../utils/query-keys';
import { ActivityTypeTable } from './ActivityTypeTable';
import { ActivityTypeForm } from './ActivityTypeForm';
import { useCreateActivityType } from '../hooks/useCreateActivityType';
import { useUpdateActivityType } from '../hooks/useUpdateActivityType';
import { useActivityTypeList } from '../hooks/useActivityTypeList';
import type { ActivityTypeDto, ActivityTypeFormSchema } from '../types/activity-type-types';
import { applyActivityTypeFilters, ACTIVITY_TYPE_FILTER_COLUMNS } from '../types/activity-type-filter.types';
import type { FilterRow } from '@/lib/advanced-filter-types';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

export function ActivityTypeManagementPage(): ReactElement {
  const { t } = useTranslation();
  const { setPageTitle } = useUIStore();
  const [searchParams, setSearchParams] = useSearchParams();
  
  const [formOpen, setFormOpen] = useState(false);
  const [editingActivityType, setEditingActivityType] = useState<ActivityTypeDto | null>(null);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [draftFilterRows, setDraftFilterRows] = useState<FilterRow[]>([]);
  const [appliedFilterRows, setAppliedFilterRows] = useState<FilterRow[]>([]);

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

    result = applyActivityTypeFilters(result, appliedFilterRows);
    return result;
  }, [allActivityTypes, searchTerm, appliedFilterRows]);

  const handleAdvancedSearch = () => {
    setAppliedFilterRows(draftFilterRows);
    setSearchTerm('');
    setShowFilters(false);
  };

  const handleAdvancedClear = () => {
    setDraftFilterRows([]);
    setAppliedFilterRows([]);
  };

  const hasFiltersActive = appliedFilterRows.some((r) => r.value.trim() !== '');

  const handleRefresh = async (): Promise<void> => {
    await queryClient.invalidateQueries({ queryKey: [ACTIVITY_TYPE_QUERY_KEYS.LIST] });
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

      <div className="bg-white/70 dark:bg-[#1a1025]/60 backdrop-blur-xl border border-white/60 dark:border-white/5 shadow-sm rounded-2xl p-5 transition-all duration-300">
        <PageToolbar
          searchPlaceholder={t('common.search')}
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
                </Button>
              </PopoverTrigger>
              <PopoverContent side="bottom" align="end" className="w-[420px] p-0 bg-[#151025] border border-white/10 shadow-2xl rounded-2xl overflow-hidden">
                <AdvancedFilter
                  columns={ACTIVITY_TYPE_FILTER_COLUMNS}
                  defaultColumn="name"
                  draftRows={draftFilterRows}
                  onDraftRowsChange={setDraftFilterRows}
                  onSearch={handleAdvancedSearch}
                  onClear={handleAdvancedClear}
                  translationNamespace="activityType"
                  embedded
                />
              </PopoverContent>
            </Popover>
          }
        />
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

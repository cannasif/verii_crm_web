import { type ReactElement, useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useUIStore } from '@/stores/ui-store';
import { useAuthStore } from '@/stores/auth-store';
import { Button } from '@/components/ui/button';
import { Plus, Filter } from 'lucide-react';
import { PageToolbar, ColumnPreferencesPopover, AdvancedFilter } from '@/components/shared';
import { loadColumnPreferences, saveColumnPreferences } from '@/lib/column-preferences';
import { ApprovalFlowTable, getColumnsConfig } from './ApprovalFlowTable';
import { ApprovalFlowForm } from './ApprovalFlowForm';
import { useCreateApprovalFlow } from '../hooks/useCreateApprovalFlow';
import { useUpdateApprovalFlow } from '../hooks/useUpdateApprovalFlow';
import { useApprovalFlowList } from '../hooks/useApprovalFlowList';
import type { ApprovalFlowDto } from '../types/approval-flow-types';
import type { ApprovalFlowFormSchema } from '../types/approval-flow-types';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../utils/query-keys';
import type { FilterRow } from '@/lib/advanced-filter-types';
import { applyApprovalFlowFilters, APPROVAL_FLOW_FILTER_COLUMNS } from '../types/approval-flow-filter.types';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

const EMPTY_APPROVAL_FLOWS: ApprovalFlowDto[] = [];

export function ApprovalFlowManagementPage(): ReactElement {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const { setPageTitle } = useUIStore();
  const [formOpen, setFormOpen] = useState(false);
  const [editingApprovalFlow, setEditingApprovalFlow] = useState<ApprovalFlowDto | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  const [draftFilterRows, setDraftFilterRows] = useState<FilterRow[]>([]);
  const [appliedFilterRows, setAppliedFilterRows] = useState<FilterRow[]>([]);

  const createApprovalFlow = useCreateApprovalFlow();
  const updateApprovalFlow = useUpdateApprovalFlow();
  const queryClient = useQueryClient();

  const tableColumns = useMemo(() => getColumnsConfig(t), [t]);
  const defaultColumnKeys = useMemo(
    () => [...tableColumns.map((c) => c.key), 'actions'],
    [tableColumns]
  );
  const [columnOrder, setColumnOrder] = useState<string[]>(() => defaultColumnKeys);
  const [visibleColumns, setVisibleColumns] = useState<string[]>(() => defaultColumnKeys);

  const { data: apiResponse, isLoading } = useApprovalFlowList({
    pageNumber: 1,
    pageSize: 10000
  });

  const approvalFlows = useMemo<ApprovalFlowDto[]>(
    () => apiResponse?.data ?? EMPTY_APPROVAL_FLOWS,
    [apiResponse?.data]
  );

  useEffect(() => {
    const prefs = loadColumnPreferences('approval-flow-management', user?.id, defaultColumnKeys);
    setVisibleColumns(prefs.visibleKeys);
    setColumnOrder(prefs.order);
  }, [user?.id, defaultColumnKeys]);

  const filteredApprovalFlows = useMemo(() => {
    let result: ApprovalFlowDto[] = [...approvalFlows];
    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase();
      result = result.filter((flow) => 
        (flow.description && flow.description.toLowerCase().includes(lowerSearch)) ||
        (String(flow.id).includes(lowerSearch))
      );
    }
    if (activeFilter === 'active') {
      result = result.filter(flow => flow.isActive);
    } else if (activeFilter === 'inactive') {
      result = result.filter(flow => !flow.isActive);
    }
    return applyApprovalFlowFilters(result, appliedFilterRows);
  }, [approvalFlows, searchTerm, activeFilter, appliedFilterRows]);

  useEffect(() => {
    setPageTitle(t('approvalFlow.menu'));
    return () => {
      setPageTitle(null);
    };
  }, [t, setPageTitle]);

  const handleAddClick = (): void => {
    setEditingApprovalFlow(null);
    setFormOpen(true);
  };

  const handleEdit = (approvalFlow: ApprovalFlowDto): void => {
    setEditingApprovalFlow(approvalFlow);
    setFormOpen(true);
  };

  const handleFormSubmit = async (data: ApprovalFlowFormSchema): Promise<void> => {
    if (editingApprovalFlow) {
      await updateApprovalFlow.mutateAsync({
        id: editingApprovalFlow.id,
        data: {
          documentType: data.documentType,
          description: data.description || undefined,
          isActive: data.isActive,
        },
      });
    } else {
      await createApprovalFlow.mutateAsync({
        documentType: data.documentType,
        description: data.description || undefined,
        isActive: data.isActive,
      });
    }
    setFormOpen(false);
    setEditingApprovalFlow(null);
  };

  const handleRefresh = async (): Promise<void> => {
    await queryClient.invalidateQueries({ queryKey: queryKeys.list({ pageNumber: 1, pageSize: 10000 }) });
  };

  const handleAdvancedSearch = (): void => {
    setAppliedFilterRows(draftFilterRows);
    setSearchTerm('');
    setShowFilters(false);
  };

  const handleAdvancedClear = (): void => {
    setDraftFilterRows([]);
    setAppliedFilterRows([]);
  };

  const hasFiltersActive = appliedFilterRows.some((r) => r.value.trim() !== '');

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            {t('approvalFlow.menu')}
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {t('approvalFlow.description')}
          </p>
        </div>
        <Button 
          onClick={handleAddClick}
          className="px-6 py-2 bg-gradient-to-r from-pink-600 to-orange-600 rounded-lg text-white text-sm font-bold shadow-lg shadow-pink-500/20 hover:scale-105 transition-transform border-0 hover:text-white"
        >
          <Plus size={18} className="mr-2" />
          {t('approvalFlow.addButton')}
        </Button>
      </div>

      <div className="bg-white/70 dark:bg-[#1a1025]/60 backdrop-blur-xl border border-white/60 dark:border-white/5 shadow-sm rounded-2xl p-5 transition-all duration-300">
        <PageToolbar
          searchPlaceholder={t('common.search')}
          searchValue={searchTerm}
          onSearchChange={setSearchTerm}
          onRefresh={handleRefresh}
          rightSlot={
            <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto scrollbar-hide">
              {['all', 'active', 'inactive'].map((filter) => (
                <Button
                  key={filter}
                  variant="ghost"
                  onClick={() => setActiveFilter(filter)}
                  className={`
                    rounded-lg px-4 h-9 text-xs font-bold uppercase tracking-wider transition-all shrink-0
                    ${activeFilter === filter 
                      ? 'bg-pink-500/10 text-pink-600 dark:text-pink-400 border border-pink-500/20' 
                      : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white border border-transparent'}
                  `}
                >
                  {filter === 'all' ? t('common.all') : filter === 'active' ? t('approvalFlow.active') : t('approvalFlow.inactive')}
                </Button>
              ))}
              <Popover open={showFilters} onOpenChange={setShowFilters}>
                <PopoverTrigger asChild>
                  <Button
                    variant={hasFiltersActive ? 'default' : 'outline'}
                    size="sm"
                    className={`h-9 border-dashed border-slate-300 dark:border-white/20 text-xs sm:text-sm shrink-0 ${
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
                    columns={APPROVAL_FLOW_FILTER_COLUMNS}
                    defaultColumn="documentType"
                    draftRows={draftFilterRows}
                    onDraftRowsChange={setDraftFilterRows}
                    onSearch={handleAdvancedSearch}
                    onClear={handleAdvancedClear}
                    translationNamespace="approval-flow-management"
                    embedded
                  />
                </PopoverContent>
              </Popover>
              <ColumnPreferencesPopover
                pageKey="approval-flow-management"
                userId={user?.id}
                columns={[
                  ...tableColumns.map((c) => ({ key: c.key as string, label: c.label })),
                  { key: 'actions', label: t('approvalFlow.table.actions') },
                ]}
                visibleColumns={visibleColumns}
                columnOrder={columnOrder}
                onVisibleColumnsChange={(next) => {
                  setVisibleColumns(next);
                  saveColumnPreferences('approval-flow-management', user?.id, {
                    order: columnOrder,
                    visibleKeys: next,
                  });
                }}
                onColumnOrderChange={(next) => {
                  setColumnOrder(next);
                  saveColumnPreferences('approval-flow-management', user?.id, {
                    order: next,
                    visibleKeys: visibleColumns,
                  });
                }}
              />
            </div>
          }
        />
      </div>

      <div className="bg-white/70 dark:bg-[#1a1025]/60 backdrop-blur-xl border border-white/60 dark:border-white/5 shadow-sm rounded-2xl p-0 sm:p-1 transition-all duration-300 overflow-hidden">
        <ApprovalFlowTable
          approvalFlows={filteredApprovalFlows}
          isLoading={isLoading}
          onEdit={handleEdit}
          visibleColumns={visibleColumns}
          columnOrder={columnOrder}
        />
      </div>

      <ApprovalFlowForm
        open={formOpen}
        onOpenChange={setFormOpen}
        onSubmit={handleFormSubmit}
        approvalFlow={editingApprovalFlow}
        isLoading={createApprovalFlow.isPending || updateApprovalFlow.isPending}
      />
    </div>
  );
}

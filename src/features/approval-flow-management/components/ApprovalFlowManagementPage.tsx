import { type ReactElement, useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useUIStore } from '@/stores/ui-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search, RefreshCw, X } from 'lucide-react';
import { ApprovalFlowTable } from './ApprovalFlowTable';
import { ApprovalFlowForm } from './ApprovalFlowForm';
import { useCreateApprovalFlow } from '../hooks/useCreateApprovalFlow';
import { useUpdateApprovalFlow } from '../hooks/useUpdateApprovalFlow';
import { useApprovalFlowList } from '../hooks/useApprovalFlowList';
import type { ApprovalFlowDto } from '../types/approval-flow-types';
import type { ApprovalFlowFormSchema } from '../types/approval-flow-types';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../utils/query-keys';

const EMPTY_APPROVAL_FLOWS: ApprovalFlowDto[] = [];

export function ApprovalFlowManagementPage(): ReactElement {
  const { t } = useTranslation();
  const { setPageTitle } = useUIStore();
  const [formOpen, setFormOpen] = useState(false);
  const [editingApprovalFlow, setEditingApprovalFlow] = useState<ApprovalFlowDto | null>(null);
  
  // Client-side filtering state
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const createApprovalFlow = useCreateApprovalFlow();
  const updateApprovalFlow = useUpdateApprovalFlow();
  const queryClient = useQueryClient();

  // Fetch all approval flows for client-side filtering
  const { data: apiResponse, isLoading } = useApprovalFlowList({
    pageNumber: 1,
    pageSize: 10000
  });

  const approvalFlows = useMemo<ApprovalFlowDto[]>(
    () => apiResponse?.data ?? EMPTY_APPROVAL_FLOWS,
    [apiResponse?.data]
  );

  const filteredApprovalFlows = useMemo(() => {
    let result: ApprovalFlowDto[] = [...approvalFlows];

    // Filter by search term
    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase();
      result = result.filter((flow) => 
        (flow.description && flow.description.toLowerCase().includes(lowerSearch)) ||
        (String(flow.id).includes(lowerSearch))
      );
    }

    // Filter by status
    if (activeFilter === 'active') {
        result = result.filter(flow => flow.isActive);
    } else if (activeFilter === 'inactive') {
        result = result.filter(flow => !flow.isActive);
    }

    return result;
  }, [approvalFlows, searchTerm, activeFilter]);

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

  const clearSearch = () => {
    setSearchTerm('');
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: queryKeys.list({ pageNumber: 1, pageSize: 10000 }) });
    setTimeout(() => setIsRefreshing(false), 500);
  };

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

      <div className="bg-white/70 dark:bg-[#1a1025]/60 backdrop-blur-xl border border-white/60 dark:border-white/5 shadow-sm rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-4 transition-all duration-300">
        <div className="flex items-center gap-2 w-full md:w-auto">
          <div className="relative group w-full md:w-96">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-pink-500 transition-colors" />
            <Input
              placeholder={t('common.search')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-10 bg-white/50 dark:bg-card/50 border-slate-200 dark:border-white/10 focus:border-pink-500/50 focus:ring-pink-500/20 rounded-xl transition-all"
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
            className="h-10 w-10 flex items-center justify-center bg-white/50 dark:bg-card/50 border border-slate-200 dark:border-white/10 rounded-xl cursor-pointer hover:border-pink-500/30 hover:bg-pink-50/50 dark:hover:bg-pink-500/10 transition-all group"
            onClick={handleRefresh}
          >
            <RefreshCw 
              size={18} 
              className={`text-slate-500 dark:text-slate-400 group-hover:text-pink-600 dark:group-hover:text-pink-400 transition-colors ${isRefreshing ? 'animate-spin' : ''}`} 
            />
          </div>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-2 md:pb-0 scrollbar-hide">
           {['all', 'active', 'inactive'].map((filter) => (
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
               {filter === 'all' ? t('common.all') : filter === 'active' ? t('approvalFlow.active') : t('approvalFlow.inactive')}
             </Button>
           ))}
        </div>
      </div>

      <div className="bg-white/70 dark:bg-[#1a1025]/60 backdrop-blur-xl border border-white/60 dark:border-white/5 shadow-sm rounded-2xl p-6 transition-all duration-300">
        <ApprovalFlowTable
          approvalFlows={filteredApprovalFlows}
          isLoading={isLoading}
          onEdit={handleEdit}
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

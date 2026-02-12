import { type ReactElement, useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useUIStore } from '@/stores/ui-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Users, Activity, Calendar, Plus, Search, RefreshCw, X } from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { TitleTable } from './TitleTable';
import { TitleForm } from './TitleForm';
import { useCreateTitle } from '../hooks/useCreateTitle';
import { useUpdateTitle } from '../hooks/useUpdateTitle';
import { useTitleStats } from '../hooks/useTitleStats';
import { useTitleList } from '../hooks/useTitleList';
import type { TitleDto } from '../types/title-types';
import type { TitleFormSchema } from '../types/title-types';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../utils/query-keys';

const EMPTY_TITLES: TitleDto[] = [];

export function TitleManagementPage(): ReactElement {
  const { t } = useTranslation();
  const { setPageTitle } = useUIStore();
  const [formOpen, setFormOpen] = useState(false);
  const [editingTitle, setEditingTitle] = useState<TitleDto | null>(null);
  
  // Client-side filtering state
  const [searchTerm, setSearchTerm] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const createTitle = useCreateTitle();
  const updateTitle = useUpdateTitle();
  const { data: statsData } = useTitleStats();
  const queryClient = useQueryClient();

  // Fetch all titles for client-side filtering
  const { data: apiResponse, isLoading } = useTitleList({
    pageNumber: 1,
    pageSize: 10000
  });

  const titles = useMemo<TitleDto[]>(
    () => apiResponse?.data ?? EMPTY_TITLES,
    [apiResponse?.data]
  );

  const filteredTitles = useMemo(() => {
    if (!titles) return [];
    if (!searchTerm) return titles;
    
    const lowerSearch = searchTerm.toLowerCase();
    return titles.filter((title) => 
      (title.titleName && title.titleName.toLowerCase().includes(lowerSearch)) ||
      (title.code && title.code.toLowerCase().includes(lowerSearch))
    );
  }, [titles, searchTerm]);

  useEffect(() => {
    setPageTitle(t('titleManagement.menu'));
    return () => {
      setPageTitle(null);
    };
  }, [t, setPageTitle]);

  const handleAddClick = (): void => {
    setEditingTitle(null);
    setFormOpen(true);
  };

  const handleEdit = (title: TitleDto): void => {
    setEditingTitle(title);
    setFormOpen(true);
  };

  const handleFormSubmit = async (data: TitleFormSchema): Promise<void> => {
    if (editingTitle) {
      await updateTitle.mutateAsync({
        id: editingTitle.id,
        data: { titleName: data.titleName, code: data.code || undefined },
      });
    } else {
      await createTitle.mutateAsync({ titleName: data.titleName, code: data.code || undefined });
    }
    setFormOpen(false);
    setEditingTitle(null);
  };

  const clearSearch = () => {
    setSearchTerm('');
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: queryKeys.list({ pageNumber: 1, pageSize: 10000 }) });
    await queryClient.invalidateQueries({ queryKey: queryKeys.stats() });
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const cardStyle = `
    bg-white/60 dark:bg-[#1a1025]/40 
    hover:bg-white/90 dark:hover:bg-[#1a1025]/80
    border border-white/60 dark:border-white/5 
    shadow-sm hover:shadow-md 
    backdrop-blur-md 
    transition-all duration-300 
    hover:border-pink-500/30 
    group relative overflow-hidden
  `;
  
  const glowStyle = "absolute inset-0 bg-gradient-to-r from-pink-50/0 to-orange-50/0 dark:from-pink-500/0 dark:to-orange-500/0 group-hover:from-pink-50/50 group-hover:to-orange-50/50 dark:group-hover:from-pink-500/5 dark:group-hover:to-orange-500/5 transition-all duration-500 pointer-events-none";

  const stats = [
    {
      title: t('titleManagement.stats.totalTitles'),
      value: statsData?.totalTitles || 0,
      icon: Users,
      iconContainerClass: 'bg-pink-50 text-pink-600 dark:bg-pink-500/10 dark:text-pink-400 border-pink-100 dark:border-pink-500/20',
    },
    {
      title: t('titleManagement.stats.activeTitles'),
      value: statsData?.activeTitles || 0,
      icon: Activity,
      iconContainerClass: 'bg-orange-50 text-orange-600 dark:bg-orange-500/10 dark:text-orange-400 border-orange-100 dark:border-orange-500/20',
    },
    {
      title: t('titleManagement.stats.newThisMonth'),
      value: statsData?.newThisMonth || 0,
      icon: Calendar,
      iconContainerClass: 'bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400 border-blue-100 dark:border-blue-500/20',
    },
  ];

  return (
    <div className="w-full space-y-6 relative">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-2">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white transition-colors">
            {t('titleManagement.menu')}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium transition-colors mt-1">
            {t('titleManagement.description')}
          </p>
        </div>

        <Button 
          onClick={handleAddClick}
          className="px-6 py-2 bg-gradient-to-r from-pink-600 to-orange-600 rounded-xl text-white text-sm font-bold shadow-lg shadow-pink-500/20 hover:scale-105 transition-transform border-0 hover:text-white h-11"
        >
          <Plus size={18} className="mr-2" />
          {t('titleManagement.addButton')}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {stats.map((stat, index) => (
          <Card key={index} className={cardStyle}>
            <div className={glowStyle} />
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
              <CardTitle className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                {stat.title}
              </CardTitle>
              <div className={`p-2 rounded-lg shadow-sm border ${stat.iconContainerClass}`}>
                 <stat.icon size={18} />
              </div>
            </CardHeader>
            <CardContent className="relative z-10">
              <div className="text-3xl font-bold text-slate-800 dark:text-white">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="bg-white/70 dark:bg-[#1a1025]/60 backdrop-blur-xl border border-white/60 dark:border-white/5 shadow-sm rounded-2xl p-5 flex flex-col gap-5 transition-all duration-300">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto">
                <div className="relative group w-full sm:w-72 lg:w-96">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-pink-500 transition-colors" />
                    <Input
                        placeholder={t('titleManagement.search')}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
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
                        className="h-10 w-10 flex items-center justify-center bg-white/50 dark:bg-card/50 border border-slate-200 dark:border-white/10 rounded-xl cursor-pointer hover:border-pink-500/30 hover:bg-pink-50/50 dark:hover:bg-pink-500/10 transition-all group shrink-0"
                        onClick={handleRefresh}
                    >
                        <RefreshCw 
                            size={18} 
                            className={`text-slate-500 dark:text-slate-400 group-hover:text-pink-600 dark:group-hover:text-pink-400 transition-colors ${isRefreshing ? 'animate-spin' : ''}`} 
                        />
                    </div>
                </div>
            </div>
        </div>
      </div>

      <div className="bg-white/70 dark:bg-[#1a1025]/60 backdrop-blur-xl border border-white/60 dark:border-white/5 shadow-sm rounded-2xl p-0 sm:p-1 transition-all duration-300 overflow-hidden">
        <TitleTable
          titles={filteredTitles}
          isLoading={isLoading}
          onEdit={handleEdit}
        />
      </div>

      <TitleForm
        open={formOpen}
        onOpenChange={setFormOpen}
        onSubmit={handleFormSubmit}
        title={editingTitle}
        isLoading={createTitle.isPending || updateTitle.isPending}
      />
    </div>
  );
}

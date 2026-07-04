import { lazy, Suspense, type ReactElement, useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useUIStore } from '@/stores/ui-store';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Box, Image as ImageIcon, Layers, Info, PackageOpen, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useStockDetail } from '../hooks/useStockDetail';
import { getLocalizedStockName } from '../utils/localized-stock-name';
import { StockBasicInfo } from './StockBasicInfo';
import { StockWarehouseBalances } from './StockWarehouseBalances';
import { clearPerfMarks, perfMark, perfMeasureOnNextPaint } from '@/lib/perf-metrics';
import { useCrudPermissions } from '@/features/access-control/hooks/useCrudPermissions';

const StockDetailForm = lazy(() =>
  import('./StockDetailForm').then((module) => ({ default: module.StockDetailForm }))
);
const StockImageUpload = lazy(() =>
  import('./StockImageUpload').then((module) => ({ default: module.StockImageUpload }))
);
const StockImageList = lazy(() =>
  import('./StockImageList').then((module) => ({ default: module.StockImageList }))
);
const StockRelationForm = lazy(() =>
  import('./StockRelationForm').then((module) => ({ default: module.StockRelationForm }))
);
const StockRelationList = lazy(() =>
  import('./StockRelationList').then((module) => ({ default: module.StockRelationList }))
);

export function StockDetailPage(): ReactElement {
  const { t, i18n } = useTranslation(['stock', 'common']);
  const { canCreate, canUpdate } = useCrudPermissions('stock.stocks.view');
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { setPageTitle } = useUIStore();
  const [activeTab, setActiveTab] = useState('basic');
  const stockId = id ? parseInt(id, 10) : 0;
  const didMeasureDataReady = useRef(false);

  const { data: stock, isLoading } = useStockDetail(stockId);
  const canModify = canCreate || canUpdate;

  useEffect(() => {
    const startMark = 'stock-detail:mount:start';
    clearPerfMarks(startMark, 'stock-detail:mount_to_paint', 'stock-detail:mount_to_paint:end');
    perfMark(startMark);
    perfMeasureOnNextPaint('stock-detail:mount_to_paint', startMark);
  }, []);

  useEffect(() => {
    if (stock) {
      setPageTitle(t('detail.title'));
    }
    return () => setPageTitle(null);
  }, [stock, t, setPageTitle]);

  useEffect(() => {
    if (isLoading || !stock || didMeasureDataReady.current) return;
    didMeasureDataReady.current = true;
    perfMeasureOnNextPaint('stock-detail:mount_to_data_ready_paint', 'stock-detail:mount:start', `stockId=${stockId}`);
  }, [didMeasureDataReady, isLoading, stock, stockId]);

  useEffect(() => {
    const startMark = `stock-detail:tab:${activeTab}:start`;
    clearPerfMarks(startMark, `stock-detail:tab_switch_to_paint:${activeTab}`, `stock-detail:tab_switch_to_paint:${activeTab}:end`);
    perfMark(startMark);
    perfMeasureOnNextPaint(`stock-detail:tab_switch_to_paint:${activeTab}`, startMark);
  }, [activeTab]);

  if (isLoading) {
    return (
      <div className="w-full space-y-6 animate-pulse">
        <div className="flex items-center gap-4">
          <Skeleton className="h-12 w-12 rounded-xl" />
          <div className="space-y-2">
             <Skeleton className="h-6 w-48" />
             <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <Skeleton className="h-[500px] w-full rounded-3xl" />
      </div>
    );
  }

  if (!stock) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center space-y-6">
        <div className="relative">
            <div className="absolute inset-0 bg-primary blur-2xl opacity-20 rounded-full" />
            <div className="relative bg-white dark:bg-zinc-900 p-6 rounded-full border border-zinc-200 dark:border-white/10 shadow-xl">
                <PackageOpen className="h-12 w-12 text-primary" />
            </div>
        </div>
        <div className="space-y-2">
            <h2 className="text-2xl font-bold text-zinc-900 dark:text-white">{t('detail.notFound')}</h2>
            <p className="text-zinc-500 dark:text-zinc-400 max-w-md mx-auto">
                {t('detail.notFoundDesc')}
            </p>
        </div>
        <Button 
            onClick={() => navigate('/stocks')}
            className="bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200 rounded-full px-8"
        >
            {t('detail.backToStockList')}
        </Button>
      </div>
    );
  }

  return (
    <div className="w-full space-y-8 pb-10">
      
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-5">
            <Button
                variant="outline"
                size="icon"
                onClick={() => navigate('/stocks')}
                className="group h-12 w-12 rounded-2xl bg-white/80 dark:bg-zinc-900/50 border-zinc-200 dark:border-white/10 shadow-sm hover:border-primary/50 hover:shadow-primary/20 transition-all duration-300"
            >
                <ArrowLeft className="h-5 w-5 text-zinc-500 group-hover:text-primary transition-colors" />
            </Button>
            
            <div className="space-y-1">
                <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-white flex items-center gap-3">
                    {getLocalizedStockName(stock, i18n.language)}
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border border-green-200 dark:border-green-800">
                        <ShieldCheck className="w-3 h-3 mr-1" />
                        {t('common.active', { ns: 'common', defaultValue: 'Aktif' })}
                    </span>
                </h1>
                <div className="flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400 font-medium">
                    <Box className="w-4 h-4 text-primary" />
                    <span>{stock.erpStockCode || t('detail.noCode', { defaultValue: 'Kod Yok' })}</span>
                    <span className="w-1 h-1 rounded-full bg-zinc-300 dark:bg-zinc-700" />
                    <span>{t('detail.subtitle')}</span>
                </div>
            </div>
        </div>

        <div className="hidden md:flex gap-3">
        </div>
      </div>

      <div className="relative group">
        <div className="absolute -inset-0.5 bg-linear-to-r from-primary via-purple-500 to-orange-500 rounded-[20px] opacity-20 group-hover:opacity-40 blur transition duration-500"></div>
        
        <div className="relative bg-white/80 dark:bg-[#1a1025]/80 backdrop-blur-xl border border-white/60 dark:border-white/5 rounded-2xl shadow-xl overflow-hidden">
            
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <div className="border-b border-zinc-200/50 dark:border-white/5 px-6 pt-4">
                    <TabsList className="bg-transparent h-auto p-0 w-full justify-start gap-8">
                        <TabItem value="basic" icon={Info} label={t('detail.basicInfo')} />
                        <TabItem value="images" icon={ImageIcon} label={t('detail.images')} />
                        <TabItem value="relations" icon={Layers} label={t('detail.relations')} />
                    </TabsList>
                </div>

                <div className="p-6 md:p-8 min-h-[500px]">
                    
                    <TabsContent value="basic" className="mt-0 focus-visible:outline-none animate-in fade-in slide-in-from-bottom-2 duration-500">
                        <div className="grid gap-8 lg:grid-cols-12">
                            <div className="lg:col-span-4 space-y-6">
                                <div className="bg-zinc-50/80 dark:bg-white/5 rounded-xl p-6 border border-zinc-100 dark:border-white/5">
                                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                                        <Info className="w-5 h-5 text-primary" />
                                        {t('detail.summary')}
                                    </h3>
                                    <StockBasicInfo stock={stock} />
                                </div>
                                <div className="bg-zinc-50/80 dark:bg-white/5 rounded-xl p-6 border border-zinc-100 dark:border-white/5">
                                    <StockWarehouseBalances stockId={stockId} unit={stock.unit} />
                                </div>
                                <div className="p-4 rounded-xl bg-orange-50 dark:bg-orange-900/10 border border-orange-100 dark:border-orange-900/20 text-orange-800 dark:text-orange-200 text-sm">
                                    <p className="font-medium">{t('detail.tipTitle', { defaultValue: 'İpucu' })}</p>
                                    <p className="opacity-90 mt-1">{t('detail.tipDescription', { defaultValue: 'Stok bilgilerini güncelledikten sonra kaydetmeyi unutmayın. ERP entegrasyonu varsa veriler bir sonraki senkronizasyonda güncellenecektir.' })}</p>
                                </div>
                            </div>
                            
                            <div className="lg:col-span-8">
                                <Card className="border-none shadow-none bg-transparent">
                                    <CardContent className="p-0">
                                        <Suspense fallback={<Skeleton className="h-[420px] w-full rounded-xl" />}>
                                          {activeTab === 'basic' ? <StockDetailForm stockId={stockId} /> : null}
                                        </Suspense>
                                    </CardContent>
                                </Card>
                            </div>
                        </div>
                    </TabsContent>

                    <TabsContent value="images" className="mt-0 focus-visible:outline-none animate-in fade-in slide-in-from-bottom-2 duration-500">
                        <Suspense fallback={<StockTabSkeleton />}>
                            {activeTab === 'images' ? (
                                <div className="space-y-8">
                                    <div className="rounded-xl border-2 border-dashed border-zinc-200 bg-zinc-50/50 p-8 transition-colors hover:border-primary/30 hover:bg-accent/30 dark:border-white/10 dark:bg-white/5 dark:hover:border-primary/30 dark:hover:bg-primary/5">
                                        {canModify ? <StockImageUpload stockId={stockId} /> : null}
                                    </div>
                                    <div className="relative">
                                        <div className="absolute inset-0 flex items-center" aria-hidden="true">
                                            <div className="w-full border-t border-zinc-200 dark:border-white/10"></div>
                                        </div>
                                        <div className="relative flex justify-center">
                                            <span className="px-3 bg-white/0 text-sm text-muted-foreground bg-white dark:bg-[#1a1025]">{t('detail.gallery')}</span>
                                        </div>
                                    </div>
                                    <StockImageList stockId={stockId} />
                                </div>
                            ) : null}
                        </Suspense>
                    </TabsContent>

                    <TabsContent value="relations" className="mt-0 focus-visible:outline-none animate-in fade-in slide-in-from-bottom-2 duration-500">
                        <Suspense fallback={<StockTabSkeleton tall />}>
                            {activeTab === 'relations' ? (
                                <div className="grid gap-8 lg:grid-cols-12">
                                     <div className="lg:col-span-4">
                                        <div className="bg-gradient-to-br from-white to-zinc-50 dark:from-white/5 dark:to-transparent rounded-xl p-6 border border-zinc-100 dark:border-white/5 shadow-sm sticky top-6">
                                            <h3 className="font-semibold text-lg mb-2">{t('detail.addRelation')}</h3>
                                            <p className="text-sm text-muted-foreground mb-6">{t('detail.relationHint', { defaultValue: 'Bu stoka ait alt veya üst ürün tanımlayın.' })}</p>
                                            {canModify ? <StockRelationForm stockId={stockId} /> : null}
                                        </div>
                                     </div>
                                     <div className="lg:col-span-8">
                                        <StockRelationList stockId={stockId} />
                                     </div>
                                </div>
                            ) : null}
                        </Suspense>
                    </TabsContent>
                </div>
            </Tabs>
        </div>
      </div>
    </div>
  );
}

function StockTabSkeleton({ tall = false }: { tall?: boolean }): ReactElement {
  return (
    <div className="space-y-6">
      <Skeleton className={`w-full rounded-2xl ${tall ? 'h-[420px]' : 'h-[220px]'}`} />
      <Skeleton className="h-[220px] w-full rounded-2xl" />
    </div>
  );
}

function TabItem({ value, icon: Icon, label }: { value: string; icon: React.ElementType; label: string }): ReactElement {
  return (
    <TabsTrigger
      value={value}
      className={cn(
        'group relative rounded-none border-b-2 border-transparent bg-transparent pb-4 shadow-none transition-all duration-300',
        'text-zinc-500 hover:text-foreground dark:text-zinc-400 dark:hover:text-zinc-200',
        'data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:font-medium data-[state=active]:text-primary data-[state=active]:shadow-none',
        'hover:data-[state=active]:text-primary',
      )}
    >
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 transition-transform duration-300 group-data-[state=active]:scale-110 group-data-[state=active]:text-primary" />
        <span>{label}</span>
      </div>
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-primary opacity-0 shadow-[0_0_8px_var(--crm-brand-ring)] transition-opacity group-data-[state=active]:opacity-100 group-hover:group-data-[state=active]:shadow-[0_0_10px_var(--crm-brand-shadow)]"
      />
    </TabsTrigger>
  );
}

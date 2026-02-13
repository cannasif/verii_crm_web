import { type ReactElement, useEffect, useState } from 'react';
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
import { StockBasicInfo } from './StockBasicInfo';
import { StockDetailForm } from './StockDetailForm';
import { StockImageUpload } from './StockImageUpload';
import { StockImageList } from './StockImageList';
import { StockRelationForm } from './StockRelationForm';
import { StockRelationList } from './StockRelationList';

export function StockDetailPage(): ReactElement {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { setPageTitle } = useUIStore();
  const [activeTab, setActiveTab] = useState('basic');
  const stockId = id ? parseInt(id, 10) : 0;

  const { data: stock, isLoading } = useStockDetail(stockId);

  useEffect(() => {
    if (stock) {
      setPageTitle(t('stock.detail.title'));
    }
    return () => setPageTitle(null);
  }, [stock, t, setPageTitle]);

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
            <div className="absolute inset-0 bg-pink-500 blur-2xl opacity-20 rounded-full" />
            <div className="relative bg-white dark:bg-zinc-900 p-6 rounded-full border border-zinc-200 dark:border-white/10 shadow-xl">
                <PackageOpen className="h-12 w-12 text-pink-600" />
            </div>
        </div>
        <div className="space-y-2">
            <h2 className="text-2xl font-bold text-zinc-900 dark:text-white">{t('stock.detail.notFound')}</h2>
            <p className="text-zinc-500 dark:text-zinc-400 max-w-md mx-auto">
                {t('stock.detail.notFoundDesc')}
            </p>
        </div>
        <Button 
            onClick={() => navigate('/stocks')}
            className="bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200 rounded-full px-8"
        >
            {t('stock.detail.backToStockList')}
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
                className="group h-12 w-12 rounded-2xl bg-white/80 dark:bg-zinc-900/50 border-zinc-200 dark:border-white/10 shadow-sm hover:border-pink-500/50 hover:shadow-pink-500/20 transition-all duration-300"
            >
                <ArrowLeft className="h-5 w-5 text-zinc-500 group-hover:text-pink-600 transition-colors" />
            </Button>
            
            <div className="space-y-1">
                <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-white flex items-center gap-3">
                    {stock.stockName}
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border border-green-200 dark:border-green-800">
                        <ShieldCheck className="w-3 h-3 mr-1" />
                        Aktif
                    </span>
                </h1>
                <div className="flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400 font-medium">
                    <Box className="w-4 h-4 text-pink-500" />
                    <span>{stock.erpStockCode || 'Kod Yok'}</span>
                    <span className="w-1 h-1 rounded-full bg-zinc-300 dark:bg-zinc-700" />
                    <span>{t('stock.detail.subtitle')}</span>
                </div>
            </div>
        </div>

        <div className="hidden md:flex gap-3">
        </div>
      </div>

      <div className="relative group">
        <div className="absolute -inset-0.5 bg-linear-to-r from-pink-500 via-purple-500 to-orange-500 rounded-[20px] opacity-20 group-hover:opacity-40 blur transition duration-500"></div>
        
        <div className="relative bg-white/80 dark:bg-[#1a1025]/80 backdrop-blur-xl border border-white/60 dark:border-white/5 rounded-2xl shadow-xl overflow-hidden">
            
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <div className="border-b border-zinc-200/50 dark:border-white/5 px-6 pt-4">
                    <TabsList className="bg-transparent h-auto p-0 w-full justify-start gap-8">
                        <TabItem value="basic" icon={Info} label={t('stock.detail.basicInfo')} active={activeTab === 'basic'} />
                        <TabItem value="images" icon={ImageIcon} label={t('stock.detail.images')} active={activeTab === 'images'} />
                        <TabItem value="relations" icon={Layers} label={t('stock.detail.relations')} active={activeTab === 'relations'} />
                    </TabsList>
                </div>

                <div className="p-6 md:p-8 min-h-[500px]">
                    
                    <TabsContent value="basic" className="mt-0 focus-visible:outline-none animate-in fade-in slide-in-from-bottom-2 duration-500">
                        <div className="grid gap-8 lg:grid-cols-12">
                            <div className="lg:col-span-4 space-y-6">
                                <div className="bg-zinc-50/80 dark:bg-white/5 rounded-xl p-6 border border-zinc-100 dark:border-white/5">
                                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                                        <Info className="w-5 h-5 text-pink-600" />
                                        {t('stock.detail.summary')}
                                    </h3>
                                    <StockBasicInfo stock={stock} />
                                </div>
                                <div className="p-4 rounded-xl bg-orange-50 dark:bg-orange-900/10 border border-orange-100 dark:border-orange-900/20 text-orange-800 dark:text-orange-200 text-sm">
                                    <p className="font-medium">İpucu</p>
                                    <p className="opacity-90 mt-1">Stok bilgilerini güncelledikten sonra kaydetmeyi unutmayın. ERP entegrasyonu varsa veriler bir sonraki senkronizasyonda güncellenecektir.</p>
                                </div>
                            </div>
                            
                            <div className="lg:col-span-8">
                                <Card className="border-none shadow-none bg-transparent">
                                    <CardContent className="p-0">
                                        <StockDetailForm stockId={stockId} />
                                    </CardContent>
                                </Card>
                            </div>
                        </div>
                    </TabsContent>

                    <TabsContent value="images" className="mt-0 focus-visible:outline-none animate-in fade-in slide-in-from-bottom-2 duration-500">
                        <div className="space-y-8">
                            <div className="bg-zinc-50/50 dark:bg-white/5 border-2 border-dashed border-zinc-200 dark:border-white/10 rounded-xl p-8 hover:bg-zinc-50 dark:hover:bg-white/10 transition-colors">
                                <StockImageUpload stockId={stockId} />
                            </div>
                            <div className="relative">
                                <div className="absolute inset-0 flex items-center" aria-hidden="true">
                                    <div className="w-full border-t border-zinc-200 dark:border-white/10"></div>
                                </div>
                                <div className="relative flex justify-center">
                                    <span className="px-3 bg-white/0 text-sm text-muted-foreground bg-white dark:bg-[#1a1025]">{t('stock.detail.gallery')}</span>
                                </div>
                            </div>
                            <StockImageList stockId={stockId} />
                        </div>
                    </TabsContent>

                    <TabsContent value="relations" className="mt-0 focus-visible:outline-none animate-in fade-in slide-in-from-bottom-2 duration-500">
                        <div className="grid gap-8 lg:grid-cols-12">
                             <div className="lg:col-span-4">
                                <div className="bg-gradient-to-br from-white to-zinc-50 dark:from-white/5 dark:to-transparent rounded-xl p-6 border border-zinc-100 dark:border-white/5 shadow-sm sticky top-6">
                                    <h3 className="font-semibold text-lg mb-2">{t('stock.detail.addRelation')}</h3>
                                    <p className="text-sm text-muted-foreground mb-6">Bu stoka ait alt veya üst ürün tanımlayın.</p>
                                    <StockRelationForm stockId={stockId} />
                                </div>
                             </div>
                             <div className="lg:col-span-8">
                                <StockRelationList stockId={stockId} />
                             </div>
                        </div>
                    </TabsContent>
                </div>
            </Tabs>
        </div>
      </div>
    </div>
  );
}

function TabItem({ value, icon: Icon, label, active }: { value: string, icon: React.ElementType, label: string, active: boolean }) {
    return (
        <TabsTrigger 
            value={value} 
            className={cn(
                "relative pb-4 rounded-none bg-transparent shadow-none border-b-2 border-transparent transition-all duration-300 data-[state=active]:bg-transparent",
                "text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200",
                active && "text-pink-600 dark:text-pink-500 border-pink-600 dark:border-pink-500 font-medium"
            )}
        >
            <div className="flex items-center gap-2">
                <Icon className={cn("w-4 h-4 transition-transform duration-300", active ? "scale-110" : "")} />
                <span>{label}</span>
            </div>
            {active && (
                <div className="absolute bottom-[-2px] left-0 right-0 h-[2px] bg-pink-600 dark:bg-pink-500 shadow-[0_0_10px_rgba(219,39,119,0.5)]" />
            )}
        </TabsTrigger>
    );
}
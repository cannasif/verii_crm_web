import { type ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { 
  Info, 
  Copy, 
  Calendar, 
  Tag, 
  Box, 
  Layers, 
  Hash, 
  Building2, 
  GitBranch,
  CheckCircle2,
  ListFilter
} from 'lucide-react';
import { toast } from 'sonner'; 
import type { StockGetDto } from '../types';
import { cn } from '@/lib/utils';

interface StockBasicInfoProps {
  stock: StockGetDto;
}

export function StockBasicInfo({ stock }: StockBasicInfoProps): ReactElement {
  const { t, i18n } = useTranslation(['stock', 'common']);

  const specialCodes = [
    { id: 1, code: stock.kod1, name: stock.kod1Adi },
    { id: 2, code: stock.kod2, name: stock.kod2Adi },
    { id: 3, code: stock.kod3, name: stock.kod3Adi },
    { id: 4, code: stock.kod4, name: stock.kod4Adi },
    { id: 5, code: stock.kod5, name: stock.kod5Adi },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500 p-1">
      
      <Alert className="bg-zinc-50 border-zinc-200 text-zinc-800 dark:bg-white/5 dark:border-white/10 dark:text-zinc-300 shadow-sm">
        <Info className="h-4 w-4 text-zinc-500 dark:text-zinc-400" />
        <AlertDescription className="ml-2 text-xs font-medium">
          {t('stock.detail.basicInfoReadonly')}
        </AlertDescription>
      </Alert>

      <div className="space-y-4">
        <SectionHeader icon={Box} title={t('stock.detail.mainInfo')} />
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            
            <InfoItem 
                label={t('stock.detail.erpStockCode')} 
                value={stock.erpStockCode} 
                icon={Hash}
                copyable
                featured
                className="md:col-span-2"
            />

            <InfoItem 
                label={t('stock.detail.stockName')} 
                value={stock.stockName} 
                icon={Tag}
                featured
                className="md:col-span-2"
                multiline={true} 
            />

            <InfoItem 
                label={t('stock.detail.unit')} 
                value={stock.unit} 
                icon={Box}
            />

             <InfoItem 
                label={t('stock.detail.ureticiKodu')} 
                value={stock.ureticiKodu} 
                icon={Building2}
                copyable
            />
        </div>
      </div>

      <Separator className="bg-zinc-200 dark:bg-white/5" />

      <div className="space-y-4">
        <SectionHeader icon={Layers} title={t('stock.detail.groupInfo')} />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
             <InfoItem 
                label={t('stock.detail.grup')} 
                value={stock.grupKodu ? `${stock.grupKodu} - ${stock.grupAdi || ''}` : '-'} 
                icon={Layers}
            />
             <InfoItem 
                label={t('stock.detail.branchCode')} 
                value={stock.branchCode?.toString() ?? ''}
                icon={GitBranch}
            />
        </div>
      </div>

      <Separator className="bg-zinc-200 dark:bg-white/5" />

      <div className="space-y-4">
         <SectionHeader icon={ListFilter} title={t('stock.detail.specialCodes')} />
        
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {specialCodes.map((item) => (
                <div 
                    key={item.id} 
                    className="
                        group relative flex flex-col justify-center min-h-[60px] p-2.5
                        bg-white dark:bg-zinc-900/40 
                        border border-zinc-200 dark:border-white/10 rounded-lg shadow-sm
                        hover:border-pink-400 dark:hover:border-pink-500 
                        hover:shadow-[0_4px_12px_rgba(236,72,153,0.15)] 
                        hover:-translate-y-0.5
                        transition-all duration-300 ease-out cursor-default
                    "
                    title={`${item.code || ''} ${item.name ? '- ' + item.name : ''}`}
                >
                    <span className="text-[9px] uppercase tracking-wider text-zinc-400 font-bold mb-1 flex items-center gap-1 group-hover:text-pink-600 transition-colors">
                        <Tag className="w-2.5 h-2.5 opacity-50" />
                        {t(`stock.detail.kod${item.id}`, { defaultValue: `KOD ${item.id}` })}
                    </span>
                    
                    <div className="flex flex-col min-w-0">
                        <span className="text-xs font-bold text-zinc-900 dark:text-white truncate leading-tight">
                            {item.code || '-'}
                        </span>
                        {item.name && (
                            <span className="text-[10px] text-zinc-500 dark:text-zinc-400 truncate mt-0.5 font-medium">
                                {item.name}
                            </span>
                        )}
                    </div>
                </div>
            ))}
        </div>
      </div>
      
      <div className="flex flex-wrap gap-4 pt-2 border-t border-zinc-100 dark:border-white/5 mt-2">
         {stock.createdAt && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-50 dark:bg-white/5 text-xs text-zinc-500 border border-zinc-200 dark:border-white/5">
                <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                <span>{t('stock.detail.created')}: <span className="font-semibold text-zinc-700 dark:text-zinc-300">{new Date(stock.createdAt).toLocaleDateString(i18n.language)}</span></span>
            </div>
         )}
         {stock.updatedAt && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-50 dark:bg-white/5 text-xs text-zinc-500 border border-zinc-200 dark:border-white/5">
                <CheckCircle2 className="w-3.5 h-3.5 text-zinc-400" />
                <span>{t('stock.detail.updated')}: <span className="font-semibold text-zinc-700 dark:text-zinc-300">{new Date(stock.updatedAt).toLocaleDateString(i18n.language)}</span></span>
            </div>
         )}
      </div>

    </div>
  );
}

function SectionHeader({ icon: Icon, title }: { icon: React.ElementType, title: string }) {
    return (
        <h4 className="text-sm font-bold text-zinc-800 dark:text-zinc-100 flex items-center gap-2 mb-2">
            <div className="p-1.5 rounded-md bg-zinc-100 dark:bg-white/5 text-zinc-500 dark:text-zinc-400">
                <Icon className="w-4 h-4" />
            </div>
            {title}
        </h4>
    );
}

function InfoItem({ 
    label, 
    value, 
    icon: Icon, 
    copyable = false,
    featured = false,
    className,
    multiline = false
}: { 
    label: string, 
    value?: string | null, 
    icon?: React.ElementType,
    copyable?: boolean,
    featured?: boolean,
    className?: string,
    multiline?: boolean
}) {
    const { t } = useTranslation(['stock', 'common']);
    
    const handleCopy = () => {
        if (value) {
            navigator.clipboard.writeText(value);
            toast.success(t('stock.detail.copied'));
        }
    };

    return (
        <div className={cn(
            "group relative flex flex-col gap-1.5 p-4 rounded-xl transition-all duration-300 border",
            "bg-white dark:bg-zinc-900/40 border-zinc-300 dark:border-white/10 shadow-sm",
            "hover:shadow-md hover:border-pink-300 dark:hover:border-pink-500/50 hover:-translate-y-0.5",
            featured && "bg-zinc-50/50 dark:bg-white/5",
            className
        )}>
            <div className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400">
                {Icon && <Icon className={cn("w-4 h-4 opacity-70 group-hover:text-pink-600 transition-colors", featured && "text-pink-600 opacity-100")} />}
                <span className="text-xs font-bold uppercase tracking-wide opacity-90">{label}</span>
            </div>
            
            <div className={cn(
                "flex justify-between min-h-[28px]",
                multiline ? "items-start" : "items-center"
            )}>
                <span className={cn(
                    "text-base font-bold text-zinc-900 dark:text-white leading-snug flex-1 min-w-0",
                    multiline ? "whitespace-normal break-words" : "truncate pr-6",
                    !value && "text-zinc-400 font-normal italic"
                )} title={!multiline ? (value || '') : undefined}>
                    {value || '-'}
                </span>
                
                {copyable && value && (
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        className={cn(
                            "h-8 w-8 opacity-0 group-hover:opacity-100 transition-all duration-200",
                            "bg-zinc-100 dark:bg-zinc-800 text-zinc-500 hover:text-zinc-900 dark:hover:text-white shadow-sm shrink-0",
                            multiline ? "ml-2 mt-0.5" : "absolute right-2 top-1/2 -translate-y-1/2"
                        )}
                        onClick={handleCopy}
                        title={t('stock.detail.copy')}
                    >
                        <Copy className="h-4 w-4" />
                    </Button>
                )}
            </div>
        </div>
    );
}

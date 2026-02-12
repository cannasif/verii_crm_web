import { type ReactElement, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { RichTextEditor } from '@/components/ui/rich-text-editor';
import { Skeleton } from '@/components/ui/skeleton';
import { Save, FileText, Loader2 } from 'lucide-react';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import { useStockDetailQuery } from '../hooks/useStockDetailQuery';
import { useStockDetailCreate } from '../hooks/useStockDetailCreate';
import { useStockDetailUpdate } from '../hooks/useStockDetailUpdate';
import { stockDetailSchema, type StockDetailFormSchema } from '../types/schemas';

interface StockDetailFormProps {
  stockId: number;
}

export function StockDetailForm({ stockId }: StockDetailFormProps): ReactElement {
  const { t } = useTranslation();
  const { data: stockDetail, isLoading } = useStockDetailQuery(stockId);
  const createDetail = useStockDetailCreate();
  const updateDetail = useStockDetailUpdate();

  const isSaving = createDetail.isPending || updateDetail.isPending;

  const form = useForm<StockDetailFormSchema>({
    resolver: zodResolver(stockDetailSchema),
    defaultValues: {
      stockId,
      htmlDescription: '',
    },
  });

  useEffect(() => {
    if (stockDetail) {
      form.reset({
        stockId,
        htmlDescription: stockDetail.htmlDescription || '',
      });
    } else {
      form.setValue('stockId', stockId);
    }
  }, [stockDetail, stockId, form]);

  const handleSubmit = async (data: StockDetailFormSchema): Promise<void> => {
    if (stockDetail) {
      await updateDetail.mutateAsync({
        id: stockDetail.id,
        data: {
          stockId: data.stockId,
          htmlDescription: data.htmlDescription,
        },
      });
    } else {
      await createDetail.mutateAsync({
        stockId: data.stockId,
        htmlDescription: data.htmlDescription,
      });
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6 p-1">
        <div className="space-y-2">
            <div className="flex items-center gap-2">
                <Skeleton className="h-5 w-5 rounded-full" />
                <Skeleton className="h-5 w-40 rounded-lg" />
            </div>
            <Skeleton className="h-[300px] w-full rounded-xl" />
        </div>
        <div className="flex justify-end">
            <Skeleton className="h-10 w-32 rounded-lg" />
        </div>
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
        
        <FormField
          control={form.control}
          name="htmlDescription"
          render={({ field }) => (
            <FormItem>
              <div className="mb-3 space-y-1">
                  <FormLabel className="text-base font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                    <FileText className="w-4 h-4 text-pink-600 dark:text-pink-500" />
                    {t('stock.detail.htmlDescription')}
                  </FormLabel>
                  <FormDescription className="text-slate-500 dark:text-slate-400 text-xs">
                    {t('stock.detail.htmlDescriptionDesc')}
                  </FormDescription>
              </div>

              <FormControl>
                <div className="
                    min-h-[350px] 
                    rounded-xl 
                    border border-zinc-200 dark:border-white/10 
                    bg-white/50 dark:bg-zinc-900/50 
                    focus-within:ring-2 focus-within:ring-pink-500/20 focus-within:border-pink-500
                    transition-all duration-300
                    overflow-hidden
                    shadow-sm hover:shadow-md hover:border-pink-200 dark:hover:border-pink-900/30
                ">
                    <RichTextEditor
                      value={field.value || ''}
                      onChange={field.onChange}
                      placeholder={t('stock.detail.htmlDescriptionPlaceholder')}
                      className="border-0 bg-transparent min-h-[350px]"
                    />
                </div>
              </FormControl>
              <FormMessage className="text-red-500 font-medium text-xs mt-2" />
            </FormItem>
          )}
        />

        <div className="flex justify-end pt-2 border-t border-zinc-100 dark:border-white/5">
          <Button
            type="submit"
            disabled={isSaving}
            className="
                relative overflow-hidden
                px-8 py-2 h-11
                bg-gradient-to-r from-pink-600 to-orange-600 
                hover:from-pink-500 hover:to-orange-500
                text-white text-sm font-bold tracking-wide
                rounded-xl
                shadow-lg shadow-pink-500/25 
                hover:shadow-pink-500/40 hover:scale-[1.02] active:scale-[0.98]
                transition-all duration-300
                border-0 ring-0 outline-none
            "
          >
            {isSaving ? (
                <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t('stock.detail.saving')}
                </>
            ) : (
                <>
                    <Save className="mr-2 h-4 w-4" />
                    {t('stock.detail.save')}
                </>
            )}
          </Button>
        </div>

      </form>
    </Form>
  );
}
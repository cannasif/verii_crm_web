import { type ReactElement, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Check, ChevronsUpDown, PackagePlus, Box, FileText, Scale, AlertCircle, Loader2 } from 'lucide-react';
import { useStockRelationCreate } from '../hooks/useStockRelationCreate';
import { useStockList } from '../hooks/useStockList';
import { stockRelationSchema, type StockRelationFormSchema } from '../types/schemas';
import { cn } from '@/lib/utils';
import { isZodFieldRequired } from '@/lib/zod-required';

interface StockRelationFormProps {
  stockId: number;
}

export function StockRelationForm({ stockId }: StockRelationFormProps): ReactElement {
  const { t } = useTranslation();
  const createRelation = useStockRelationCreate();
  const [openCombobox, setOpenCombobox] = useState(false);
  
  const { data: stocksData } = useStockList({
    pageNumber: 1,
    pageSize: 100, 
    sortBy: 'StockName',
    sortDirection: 'asc',
  });

  const stocks = stocksData?.data || [];

  const form = useForm<StockRelationFormSchema>({
    resolver: zodResolver(stockRelationSchema),
    mode: 'onChange',
    reValidateMode: 'onChange',
    defaultValues: {
      stockId,
      relatedStockId: 0,
      quantity: 1,
      description: '',
      isMandatory: false,
    },
  });
  const isFormValid = form.formState.isValid;

  const handleSubmit = async (data: StockRelationFormSchema): Promise<void> => {
    await createRelation.mutateAsync({
      stockId: data.stockId,
      relatedStockId: data.relatedStockId,
      quantity: data.quantity,
      description: data.description,
      isMandatory: data.isMandatory,
    });
    
    form.reset({
      stockId,
      relatedStockId: 0,
      quantity: 1,
      description: '',
      isMandatory: false,
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
        
        <FormField
          control={form.control}
          name="relatedStockId"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel className="text-zinc-800 dark:text-zinc-200 font-semibold flex items-center gap-2 text-sm" required={isZodFieldRequired(stockRelationSchema, 'relatedStockId')}>
                 <Box className="w-4 h-4 text-pink-600" />
                 {t('stock.relations.relatedStock')}
              </FormLabel>
              
              <Popover open={openCombobox} onOpenChange={setOpenCombobox}>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={openCombobox}
                      className={cn(
                        "w-full justify-between h-12 rounded-xl border-zinc-200 dark:border-white/10",
                        "bg-white/50 dark:bg-zinc-900/50 backdrop-blur-sm", 
                        "hover:bg-white dark:hover:bg-zinc-800 hover:border-pink-500/50 hover:shadow-[0_0_15px_rgba(236,72,153,0.1)]", 
                        "transition-all duration-300",
                        !field.value && "text-muted-foreground font-normal"
                      )}
                    >
                      {field.value
                        ? stocks.find((stock) => stock.id === field.value)?.stockName
                        : t('stock.relations.selectStock')}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-[350px] p-0 rounded-xl shadow-xl border-zinc-200 dark:border-zinc-800 overflow-hidden">
                  <Command className="bg-white dark:bg-zinc-900">
                    <CommandInput placeholder={t('stock.relations.search')} className="h-11 border-none focus:ring-0" />
                    <CommandList>
                        <CommandEmpty className="py-6 text-center text-sm text-muted-foreground">
                            {t('stock.relations.noStockFound')}
                        </CommandEmpty>
                        <CommandGroup className="max-h-[240px] overflow-y-auto p-1">
                        {stocks
                            .filter(stock => stock.id !== stockId)
                            .map((stock) => (
                            <CommandItem
                                value={stock.stockName}
                                key={stock.id}
                                onSelect={() => {
                                    form.setValue("relatedStockId", stock.id);
                                    setOpenCombobox(false);
                                }}
                                className="flex items-center justify-between py-2.5 px-3 rounded-lg cursor-pointer aria-selected:bg-pink-50 dark:aria-selected:bg-pink-900/20 aria-selected:text-pink-900 dark:aria-selected:text-pink-100 mb-1"
                            >
                                <div className="flex flex-col gap-0.5">
                                    <span className="font-medium text-sm">{stock.stockName}</span>
                                    <span className="text-[10px] text-muted-foreground font-mono bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded w-fit">
                                        {stock.erpStockCode}
                                    </span>
                                </div>
                                <Check
                                    className={cn(
                                    "ml-2 h-4 w-4 text-pink-600",
                                    stock.id === field.value ? "opacity-100" : "opacity-0"
                                    )}
                                />
                            </CommandItem>
                        ))}
                        </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="quantity"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-zinc-800 dark:text-zinc-200 font-semibold flex items-center gap-2 text-sm" required={isZodFieldRequired(stockRelationSchema, 'quantity')}>
                <Scale className="w-4 h-4 text-orange-500" />
                {t('stock.relations.quantity')}
              </FormLabel>
              <FormControl>
                <div className="relative group">
                    <Input
                        type="number"
                        min="0.01"
                        step="0.000001"
                        className="
                            h-12 rounded-xl pl-4
                            bg-white/50 dark:bg-zinc-900/50 
                            border-zinc-200 dark:border-white/10
                            focus-visible:ring-2 focus-visible:ring-pink-500/20 focus-visible:border-pink-500
                            group-hover:border-pink-300 dark:group-hover:border-pink-700/50
                            transition-all duration-300
                        "
                        {...field}
                        value={field.value || ''}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                    />
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-zinc-800 dark:text-zinc-200 font-semibold flex items-center gap-2 text-sm">
                <FileText className="w-4 h-4 text-purple-500" />
                {t('stock.relations.description')}
              </FormLabel>
              <FormControl>
                <Textarea
                  {...field}
                  value={field.value || ''}
                  placeholder={t('stock.relations.descriptionPlaceholder')}
                  className="
                    min-h-[100px] rounded-xl resize-none
                    bg-white/50 dark:bg-zinc-900/50 
                    border-zinc-200 dark:border-white/10
                    focus-visible:ring-2 focus-visible:ring-pink-500/20 focus-visible:border-pink-500
                    hover:border-pink-300 dark:hover:border-pink-700/50
                    transition-all duration-300
                  "
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="isMandatory"
          render={({ field }) => (
            <FormItem 
                className={cn(
                    "group flex flex-row items-start space-x-3 space-y-0 rounded-xl border p-4 transition-all duration-300 cursor-pointer",
                    field.value 
                        ? "bg-pink-50/50 border-pink-200 dark:bg-pink-900/10 dark:border-pink-800" 
                        : "bg-white/40 dark:bg-white/5 border-zinc-200 dark:border-white/10 hover:border-pink-300 dark:hover:border-pink-700 hover:shadow-md"
                )}
            >
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  className="data-[state=checked]:bg-pink-600 data-[state=checked]:border-pink-600 border-zinc-400 dark:border-zinc-500 mt-1"
                />
              </FormControl>
              <div className="space-y-1 leading-none select-none">
                <FormLabel className="text-sm font-bold text-zinc-900 dark:text-white cursor-pointer flex items-center gap-2">
                  {t('stock.relations.isMandatory')}
                  {field.value && <AlertCircle className="w-3 h-3 text-pink-600 animate-pulse" />}
                </FormLabel>
                <FormDescription className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-2">
                  Bu seçenek işaretlendiğinde, ana ürün satıldığında bu alt ürünün de stoktan düşmesi zorunlu hale gelir.
                </FormDescription>
              </div>
            </FormItem>
          )}
        />

        <Button
          type="submit"
          disabled={createRelation.isPending || !isFormValid}
          className="
            w-full h-12 relative overflow-hidden
            bg-linear-to-r from-pink-600 to-orange-600 
            hover:from-pink-500 hover:to-orange-500
            text-white font-bold tracking-wide rounded-xl
            shadow-lg shadow-pink-500/25 
            hover:shadow-pink-500/40 hover:scale-[1.02] active:scale-[0.98]
            transition-all duration-300
            border-0 mt-2
          "
        >
          {createRelation.isPending ? (
            <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                {t('stock.relations.saving')}
            </>
          ) : (
            <>
                <PackagePlus className="mr-2 h-5 w-5" />
                {t('stock.relations.add')}
            </>
          )}
        </Button>
      </form>
    </Form>
  );
}

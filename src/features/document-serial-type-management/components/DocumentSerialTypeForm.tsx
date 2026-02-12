import { type ReactElement, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { documentSerialTypeFormSchema, type DocumentSerialTypeFormSchema } from '../types/document-serial-type-types';
import type { DocumentSerialTypeDto } from '../types/document-serial-type-types';
import { PricingRuleType } from '@/features/pricing-rule/types/pricing-rule-types';
import { useCustomerTypeOptions } from '../hooks/useCustomerTypeOptions';
import { useSalesRepOptions } from '../hooks/useSalesRepOptions';
import { FileText, Check, ChevronsUpDown, Mic, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { isZodFieldRequired } from '@/lib/zod-required';

interface DocumentSerialTypeFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: DocumentSerialTypeFormSchema) => void | Promise<void>;
  documentSerialType?: DocumentSerialTypeDto | null;
  isLoading?: boolean;
}

interface SearchableSelectProps {
  value: number | null;
  onChange: (value: number | null) => void;
  options: { id: number; name: string }[];
  placeholder: string;
  searchPlaceholder: string;
  emptyMessage: string;
}

function SearchableSelect({
  value,
  onChange,
  options,
  placeholder,
  searchPlaceholder,
  emptyMessage,
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [isListening, setIsListening] = useState(false);

  const startListening = () => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition =
        (window as Window & { webkitSpeechRecognition?: new () => SpeechRecognition }).SpeechRecognition ||
        (window as Window & { webkitSpeechRecognition?: new () => SpeechRecognition }).webkitSpeechRecognition;
      if (!SpeechRecognition) {
        alert('Tarayıcınız sesli aramayı desteklemiyor.');
        return;
      }
      const recognition = new SpeechRecognition();
      recognition.lang = 'tr-TR';
      recognition.continuous = false;
      recognition.interimResults = false;

      recognition.onstart = () => setIsListening(true);
      recognition.onend = () => setIsListening(false);
      
      recognition.onresult = (event: SpeechRecognitionEvent) => {
        const transcript = event.results[0][0].transcript;
        setSearch(transcript);
      };

      recognition.start();
    } else {
      alert('Tarayıcınız sesli aramayı desteklemiyor.');
    }
  };

  const selectedLabel = options.find((opt) => opt.id === value)?.name;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "w-full justify-between h-11 bg-white dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm hover:bg-zinc-50 dark:hover:bg-zinc-800",
            !value && "text-muted-foreground"
          )}
        >
          <span className="truncate">{selectedLabel || placeholder}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[calc(100vw-2rem)] sm:w-[400px] max-w-[400px] p-0" align="start">
        <Command>
          <CommandInput 
            placeholder={searchPlaceholder} 
            value={search}
            onValueChange={setSearch}
          >
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                startListening();
              }}
              className={cn(
                "p-2 rounded-full transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800",
                isListening ? "text-red-500 animate-pulse" : "text-zinc-500"
              )}
              title="Sesli Arama"
            >
              <Mic className="h-4 w-4" />
            </button>
          </CommandInput>
          <CommandList>
            <CommandEmpty>{emptyMessage}</CommandEmpty>
            <CommandGroup>
              <CommandItem
                value="sys_clear_selection"
                onSelect={() => {
                  onChange(null);
                  setOpen(false);
                }}
                className="text-muted-foreground italic"
              >
                <X className="mr-2 h-4 w-4" />
                Sechimi Temizle
              </CommandItem>
              {options.map((option) => (
                <CommandItem
                  key={option.id}
                  value={option.name}
                  onSelect={() => {
                    onChange(option.id);
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === option.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {option.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export function DocumentSerialTypeForm({
  open,
  onOpenChange,
  onSubmit,
  documentSerialType,
  isLoading = false,
}: DocumentSerialTypeFormProps): ReactElement {
  const { t } = useTranslation();
  const { data: customerTypeOptions = [] } = useCustomerTypeOptions();
  const { data: salesRepOptions = [] } = useSalesRepOptions();

  const form = useForm<DocumentSerialTypeFormSchema>({
    resolver: zodResolver(documentSerialTypeFormSchema),
    defaultValues: {
      ruleType: PricingRuleType.Demand,
      customerTypeId: null,
      salesRepId: null,
      serialPrefix: '',
      serialLength: 1,
      serialStart: 0,
      serialCurrent: 0,
      serialIncrement: 1,
    },
  });

  useEffect(() => {
    if (documentSerialType) {
      form.reset({
        ruleType: documentSerialType.ruleType,
        customerTypeId: documentSerialType.customerTypeId ?? null,
        salesRepId: documentSerialType.salesRepId ?? null,
        serialPrefix: documentSerialType.serialPrefix ?? '',
        serialLength: documentSerialType.serialLength ?? 1,
        serialStart: documentSerialType.serialStart ?? 0,
        serialCurrent: documentSerialType.serialCurrent ?? 0,
        serialIncrement: documentSerialType.serialIncrement ?? 1,
      });
    } else {
      form.reset({
        ruleType: PricingRuleType.Demand,
        customerTypeId: null,
        salesRepId: null,
        serialPrefix: '',
        serialLength: 1,
        serialStart: 0,
        serialCurrent: 0,
        serialIncrement: 1,
      });
    }
  }, [documentSerialType, form]);

  const handleSubmit = async (data: DocumentSerialTypeFormSchema): Promise<void> => {
    await onSubmit(data);
    if (!isLoading) {
      form.reset();
      onOpenChange(false);
    }
  };

  const inputClass = "h-11 bg-white dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-800 rounded-xl shadow-sm focus-visible:border-pink-500 focus-visible:ring-4 focus-visible:ring-pink-500/20 transition-all duration-300";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-1rem)] sm:w-[calc(100vw-2rem)] max-w-[600px] p-0 overflow-hidden border-0 shadow-2xl bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl ring-1 ring-zinc-200 dark:ring-zinc-800">
        <DialogHeader className="p-6 pb-2 space-y-1">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500/20 to-orange-500/20 flex items-center justify-center border border-pink-500/20">
              <FileText className="w-5 h-5 text-pink-600 dark:text-pink-400" />
            </div>
            <div className="space-y-1">
              <DialogTitle className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-foreground">
                {documentSerialType
                  ? t('documentSerialTypeManagement.form.editTitle')
                  : t('documentSerialTypeManagement.form.addTitle')}
              </DialogTitle>
              <DialogDescription className="text-zinc-500 dark:text-muted-foreground text-base">
                {documentSerialType
                  ? t('documentSerialTypeManagement.form.editDescription')
                  : t('documentSerialTypeManagement.form.addDescription')}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6 p-6 pt-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="ruleType"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <FormLabel className="text-sm font-semibold text-zinc-700 dark:text-zinc-300" required={isZodFieldRequired(documentSerialTypeFormSchema, 'ruleType')}>
                      {t('documentSerialTypeManagement.form.ruleType')}
                    </FormLabel>
                    <Select
                      onValueChange={(value) => field.onChange(parseInt(value))}
                      value={field.value?.toString()}
                    >
                      <FormControl>
                        <SelectTrigger className={inputClass}>
                          <SelectValue placeholder={t('documentSerialTypeManagement.form.selectRuleType')} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value={PricingRuleType.Demand.toString()}>
                          {t('pricingRule.ruleType.demand')}
                        </SelectItem>
                        <SelectItem value={PricingRuleType.Quotation.toString()}>
                          {t('pricingRule.ruleType.quotation')}
                        </SelectItem>
                        <SelectItem value={PricingRuleType.Order.toString()}>
                          {t('pricingRule.ruleType.order')}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="customerTypeId"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <FormLabel className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                      {t('documentSerialTypeManagement.form.customerType')}
                    </FormLabel>
                    <FormControl>
                      <SearchableSelect
                        value={field.value ?? null}
                        onChange={field.onChange}
                        options={customerTypeOptions.map(ct => ({ id: ct.id, name: ct.name }))}
                        placeholder={t('documentSerialTypeManagement.form.selectCustomerType')}
                        searchPlaceholder={t('documentSerialTypeManagement.form.searchCustomerType')}
                        emptyMessage={t('documentSerialTypeManagement.form.noCustomerTypeFound')}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="salesRepId"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <FormLabel className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                      {t('documentSerialTypeManagement.form.salesRep')}
                    </FormLabel>
                    <FormControl>
                      <SearchableSelect
                        value={field.value ?? null}
                        onChange={field.onChange}
                        options={salesRepOptions.map(sr => ({ id: sr.id, name: sr.fullName }))}
                        placeholder={t('documentSerialTypeManagement.form.selectSalesRep')}
                        searchPlaceholder={t('documentSerialTypeManagement.form.searchSalesRep')}
                        emptyMessage={t('documentSerialTypeManagement.form.noSalesRepFound')}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="serialPrefix"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <FormLabel className="text-sm font-semibold text-zinc-700 dark:text-zinc-300" required={isZodFieldRequired(documentSerialTypeFormSchema, 'serialPrefix')}>
                      {t('documentSerialTypeManagement.form.serialPrefix')}
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        value={field.value}
                        className={inputClass}
                        placeholder={t('documentSerialTypeManagement.form.serialPrefixPlaceholder')}
                        maxLength={50}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="serialLength"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <FormLabel className="text-sm font-semibold text-zinc-700 dark:text-zinc-300" required={isZodFieldRequired(documentSerialTypeFormSchema, 'serialLength')}>
                      {t('documentSerialTypeManagement.form.serialLength')}
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="1"
                        {...field}
                        value={field.value}
                        onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : 1)}
                        placeholder={t('documentSerialTypeManagement.form.serialLengthPlaceholder')}
                        className={inputClass}
                        min={1}
                        max={100}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="serialIncrement"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <FormLabel className="text-sm font-semibold text-zinc-700 dark:text-zinc-300" required={isZodFieldRequired(documentSerialTypeFormSchema, 'serialIncrement')}>
                      {t('documentSerialTypeManagement.form.serialIncrement')}
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="1"
                        {...field}
                        value={field.value}
                        onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : 1)}
                        placeholder={t('documentSerialTypeManagement.form.serialIncrementPlaceholder')}
                        className={inputClass}
                        min={1}
                        max={100}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="serialStart"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <FormLabel className="text-sm font-semibold text-zinc-700 dark:text-zinc-300" required={isZodFieldRequired(documentSerialTypeFormSchema, 'serialStart')}>
                      {t('documentSerialTypeManagement.form.serialStart')}
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="1"
                        {...field}
                        value={field.value}
                        onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : 0)}
                        placeholder={t('documentSerialTypeManagement.form.serialStartPlaceholder')}
                        className={inputClass}
                        min={0}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="serialCurrent"
                render={({ field }) => (
                  <FormItem className="space-y-2">
                    <FormLabel className="text-sm font-semibold text-zinc-700 dark:text-zinc-300" required={isZodFieldRequired(documentSerialTypeFormSchema, 'serialCurrent')}>
                      {t('documentSerialType.form.serialCurrent')}
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="1"
                        {...field}
                        value={field.value}
                        onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : 0)}
                        placeholder={t('documentSerialType.form.serialCurrentPlaceholder')}
                        className={inputClass}
                        min={0}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter className="gap-2 sm:gap-0 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isLoading}
                className="h-11 px-6 border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
              >
                {t('documentSerialTypeManagement.cancel')}
              </Button>
              <Button 
                type="submit" 
                disabled={isLoading}
                className="h-11 px-8 bg-gradient-to-r from-pink-600 to-orange-600 text-white font-semibold shadow-lg shadow-pink-500/20 hover:scale-[1.02] transition-transform"
              >
                {isLoading
                  ? t('documentSerialTypeManagement.saving')
                  : t('documentSerialTypeManagement.save')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

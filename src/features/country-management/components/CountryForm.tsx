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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { countryFormSchema, type CountryFormSchema } from '../types/country-types';
import type { CountryDto } from '../types/country-types';
import { useCreateCountry } from '../hooks/useCreateCountry';
import { useUpdateCountry } from '../hooks/useUpdateCountry';
import { Map, Hash, Globe, Loader2, FileText, Code } from 'lucide-react';
import { Cancel01Icon } from 'hugeicons-react';

interface CountryFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  country?: CountryDto | null;
}

const INPUT_STYLE = `
  h-12 rounded-xl
  bg-slate-50 dark:bg-[#0f0a18] 
  border border-slate-200 dark:border-white/10 
  text-slate-900 dark:text-white text-sm
  placeholder:text-slate-400 dark:placeholder:text-slate-600 
  
  focus-visible:bg-white dark:focus-visible:bg-[#1a1025]
  focus-visible:border-pink-500 dark:focus-visible:border-pink-500/70
  focus-visible:ring-2 focus-visible:ring-pink-500/10 focus-visible:ring-offset-0
  
  focus:ring-2 focus:ring-pink-500/10 focus:ring-offset-0 focus:border-pink-500
  
  transition-all duration-200
`;

const LABEL_STYLE = "text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide ml-1 mb-2 flex items-center gap-2";

export function CountryForm({
  open,
  onOpenChange,
  country,
}: CountryFormProps): ReactElement {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'header'>('header');

  const createMutation = useCreateCountry();
  const updateMutation = useUpdateCountry();

  const isLoading = createMutation.isPending || updateMutation.isPending;

  const form = useForm<CountryFormSchema>({
    resolver: zodResolver(countryFormSchema),
    mode: 'onChange',
    reValidateMode: 'onChange',
    defaultValues: {
      name: '',
      code: '',
      erpCode: '',
    },
  });
  const isFormValid = form.formState.isValid;

  useEffect(() => {
    if (country) {
      form.reset({
        name: country.name,
        code: country.code,
        erpCode: country.erpCode || '',
      });
    } else {
      form.reset({
        name: '',
        code: '',
        erpCode: '',
      });
    }
  }, [country, form, open]);

  // Reset tab when opening
  useEffect(() => {
    if (open) {
      setActiveTab('header');
    }
  }, [open]);

  const handleSubmit = async (data: CountryFormSchema): Promise<void> => {
    try {
      if (country) {
        await updateMutation.mutateAsync({ 
          id: country.id, 
          data: {
            name: data.name,
            code: data.code,
            erpCode: data.erpCode || undefined,
          } 
        });
      } else {
        await createMutation.mutateAsync({
          name: data.name,
          code: data.code,
          erpCode: data.erpCode || undefined,
        });
      }
      form.reset();
      onOpenChange(false);
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-1rem)] sm:w-[calc(100vw-2rem)] max-w-[96vw] xl:max-w-[1000px] max-h-[92vh] flex flex-col p-0 overflow-hidden bg-white dark:bg-[#130822] border border-slate-100 dark:border-white/10 shadow-2xl text-slate-900 dark:text-white sm:rounded-2xl transition-colors duration-300">
        
        <DialogHeader className="px-4 sm:px-6 py-3 border-b border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-[#1a1025]/50 backdrop-blur-sm shrink-0 flex-row items-center justify-between space-y-0 sticky top-0 z-10">
          <div className="flex items-center gap-4">
             <div className="h-10 w-10 rounded-xl bg-linear-to-br from-pink-500 to-orange-500 p-0.5 shadow-lg shadow-pink-500/20">
               <div className="h-full w-full bg-white dark:bg-[#130822] rounded-[10px] flex items-center justify-center">
                 <Globe size={20} className="text-pink-600 dark:text-pink-500" />
               </div>
             </div>
             <div className="space-y-1">
                <DialogTitle className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                  {country
                    ? t('countryManagement.form.editCountry')
                    : t('countryManagement.form.addCountry')}
                </DialogTitle>
                <DialogDescription className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">
                  {country
                    ? t('countryManagement.form.editDescription')
                    : t('countryManagement.form.addDescription')}
                </DialogDescription>
             </div>
          </div>
          <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-full">
            <Cancel01Icon size={20} />
          </Button>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="flex-1 flex flex-col min-h-0">
            <div className="flex-1 flex flex-col min-h-0">
              <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'header')} className="w-full flex-1 flex flex-col min-h-0">
                
                <div className="px-6 pt-4 pb-2 bg-slate-50/50 dark:bg-white/5 border-b border-slate-100 dark:border-white/5 flex justify-center">
                  <TabsList className="bg-slate-200/50 dark:bg-white/10 p-1 rounded-lg h-auto grid grid-cols-1 w-full max-w-md">
                    <TabsTrigger value="header" className="rounded-md data-[state=active]:bg-white dark:data-[state=active]:bg-[#1a1025] data-[state=active]:text-pink-600 dark:data-[state=active]:text-pink-400 data-[state=active]:shadow-sm py-2 text-xs font-medium transition-all">
                      <FileText size={14} className="mr-2" />
                      {t('countryManagement.form.tabs.header')}
                    </TabsTrigger>
                  </TabsList>
                </div>

                <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                  <TabsContent value="header" className="mt-0 h-full focus-visible:outline-none data-[state=inactive]:hidden">
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <FormField
                          control={form.control}
                          name="name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className={LABEL_STYLE}>
                                <Map size={12} className="text-pink-500" />
                                {t('countryManagement.form.name')} *
                              </FormLabel>
                              <FormControl>
                                <Input
                                  {...field}
                                  placeholder={t('countryManagement.form.namePlaceholder')}
                                  maxLength={100}
                                  className={INPUT_STYLE}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="code"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className={LABEL_STYLE}>
                                <Code size={12} className="text-pink-500" />
                                {t('countryManagement.form.code')} *
                              </FormLabel>
                              <FormControl>
                                <Input
                                  {...field}
                                  placeholder={t('countryManagement.form.codePlaceholder')}
                                  maxLength={5}
                                  className={INPUT_STYLE}
                                  onChange={(e) => {
                                    field.onChange(e.target.value.toUpperCase());
                                  }}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <FormField
                        control={form.control}
                        name="erpCode"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className={LABEL_STYLE}>
                              <Hash size={12} className="text-pink-500" />
                              {t('countryManagement.form.erpCode')}
                            </FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                value={field.value || ''}
                                placeholder={t('countryManagement.form.erpCodePlaceholder')}
                                maxLength={10}
                                className={INPUT_STYLE}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                    </div>
                  </TabsContent>
                </div>
              </Tabs>
            </div>

            <DialogFooter className="px-6 py-5 border-t border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-[#1a1025]/50 shrink-0 backdrop-blur-sm">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isLoading}
                className="h-11 rounded-xl border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/5"
              >
                {t('countryManagement.form.cancel')}
              </Button>
              <Button 
              type="submit" 
              disabled={isLoading || !isFormValid}
              className="h-11 rounded-xl bg-linear-to-r from-pink-600 to-orange-600 hover:from-pink-700 hover:to-orange-700 text-white shadow-lg shadow-pink-500/20 border-0"
            >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t('countryManagement.form.save')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

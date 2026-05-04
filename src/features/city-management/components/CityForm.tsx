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
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { VoiceSearchCombobox } from '@/components/shared/VoiceSearchCombobox';
import { useCountryOptionsInfinite } from '@/components/shared/dropdown/useDropdownEntityInfinite';
import { cityFormSchema, type CityFormSchema } from '../types/city-types';
import type { CityDto } from '../types/city-types';
import { useCreateCity } from '../hooks/useCreateCity';
import { useUpdateCity } from '../hooks/useUpdateCity';
import { Map, Loader2, X } from 'lucide-react';
import { isZodFieldRequired } from '@/lib/zod-required';

interface CityFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  city?: CityDto | null;
}

const INPUT_STYLE = `
  h-12 rounded-xl
  bg-slate-50 dark:bg-[#0c0516]
  border border-slate-200 dark:border-white/10
  text-slate-900 dark:text-white text-sm
  placeholder:text-slate-400 dark:placeholder:text-slate-600
  focus-visible:ring-0 focus-visible:ring-offset-0
  focus:bg-white focus:border-pink-500 focus:shadow-[0_0_0_3px_rgba(236,72,153,0.15)]
  dark:focus:bg-[#0c0516] dark:focus:border-pink-500/60 dark:focus:shadow-[0_0_0_3px_rgba(236,72,153,0.1)]
  transition-all duration-200
`;

const LABEL_STYLE =
  'text-[11px] text-slate-500 dark:text-slate-400 uppercase tracking-wider font-bold ml-1 mb-1.5 block';

export function CityForm({
  open,
  onOpenChange,
  city,
}: CityFormProps): ReactElement {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'header'>('header');
  const [countrySearchTerm, setCountrySearchTerm] = useState('');
  const countryDropdown = useCountryOptionsInfinite(countrySearchTerm, open);

  const createMutation = useCreateCity();
  const updateMutation = useUpdateCity();

  const isLoading = createMutation.isPending || updateMutation.isPending;

  const form = useForm<CityFormSchema>({
    resolver: zodResolver(cityFormSchema),
    mode: 'onChange',
    reValidateMode: 'onChange',
    defaultValues: {
      name: '',
      countryId: 0,
      erpCode: '',
    },
  });
  const isFormValid = form.formState.isValid;

  useEffect(() => {
    if (city) {
      form.reset({
        name: city.name,
        countryId: city.countryId,
        erpCode: city.erpCode || '',
      });
    } else {
      form.reset({
        name: '',
        countryId: 0,
        erpCode: '',
      });
    }
  }, [city, form, open]);

  // Reset tab when opening
  useEffect(() => {
    if (open) {
      setActiveTab('header');
    }
  }, [open]);

  const handleSubmit = async (data: CityFormSchema): Promise<void> => {
    try {
      if (city) {
        await updateMutation.mutateAsync({ id: city.id, data });
      } else {
        await createMutation.mutateAsync(data);
      }
      form.reset();
      onOpenChange(false);
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} className="w-[calc(100vw-1rem)] sm:w-[calc(50vw-2rem)] !max-w-[96vw] xl:max-w-[700px] max-h-[92vh] flex flex-col p-0 overflow-hidden bg-white/90 dark:bg-[#130822]/90 border border-slate-200/60 dark:border-white/10 shadow-2xl rounded-[2.5rem]">

        <DialogHeader className="px-6 sm:px-8 py-6 border-b border-slate-100 dark:border-white/5 shrink-0 flex-row items-center justify-between space-y-0 sticky top-0 z-10 backdrop-blur-sm">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-linear-to-br from-pink-500 to-orange-500 p-0.5 shadow-lg shadow-pink-500/20">
              <div className="h-full w-full bg-white dark:bg-[#130822] rounded-[14px] flex items-center justify-center">
                <Map size={24} className="text-pink-600 dark:text-pink-400" />
              </div>
            </div>
            <div>
              <DialogTitle className="text-xl font-bold text-slate-900 dark:text-white">
                {city
                  ? t('cityManagement.form.editCity')
                  : t('cityManagement.form.addCity')}
              </DialogTitle>
              <DialogDescription className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">
                {city
                  ? t('cityManagement.form.editDescription')
                  : t('cityManagement.form.addDescription')}
              </DialogDescription>
            </div>
          </div>
          <button
            onClick={() => onOpenChange(false)}
            className="group relative h-10 w-10 flex items-center justify-center rounded-full bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400 hover:bg-pink-500 hover:text-white transition-all duration-300 hover:rotate-90 shadow-sm"
          >
            <X size={20} className="relative z-10" />
            <div className="absolute inset-0 rounded-full bg-pink-500 opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="flex-1 flex flex-col min-h-0 overflow-hidden">
            <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
              <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'header')} className="w-full flex-1 flex flex-col min-h-0">



                <div className="flex-1 overflow-y-auto p-6 sm:p-8 custom-scrollbar">
                  <TabsContent value="header" className="mt-0 h-full focus-visible:outline-none data-[state=inactive]:hidden">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">

                      <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem className="space-y-0">
                            <FormLabel className={LABEL_STYLE} required={isZodFieldRequired(cityFormSchema, 'name')}>
                              {t('cityManagement.form.name')}
                            </FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                placeholder={t('cityManagement.form.namePlaceholder')}
                                maxLength={100}
                                className={INPUT_STYLE}
                              />
                            </FormControl>
                            <FormMessage className="text-red-500 text-[10px] mt-1" />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="countryId"
                        render={({ field }) => (
                          <FormItem className="space-y-0">
                            <FormLabel className={LABEL_STYLE} required={isZodFieldRequired(cityFormSchema, 'countryId')}>
                              {t('cityManagement.form.country')}
                            </FormLabel>
                            <VoiceSearchCombobox
                              options={countryDropdown.options}
                              value={field.value && field.value > 0 ? field.value.toString() : undefined}
                              onSelect={(value) => {
                                field.onChange(value ? Number(value) : 0);
                              }}
                              onDebouncedSearchChange={setCountrySearchTerm}
                              onFetchNextPage={countryDropdown.fetchNextPage}
                              hasNextPage={countryDropdown.hasNextPage}
                              isLoading={countryDropdown.isLoading}
                              isFetchingNextPage={countryDropdown.isFetchingNextPage}
                              placeholder={t('cityManagement.form.selectCountry')}
                              searchPlaceholder={t('cityManagement.form.searchCountry')}
                              className={INPUT_STYLE}
                              modal={true}
                            />
                            <FormMessage className="text-red-500 text-[10px] mt-1" />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="erpCode"
                        render={({ field }) => (
                          <FormItem className="md:col-span-2 space-y-0">
                            <FormLabel className={LABEL_STYLE}>
                              {t('cityManagement.form.erpCode')}
                            </FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                value={field.value || ''}
                                placeholder={t('cityManagement.form.erpCodePlaceholder')}
                                maxLength={10}
                                className={INPUT_STYLE}
                              />
                            </FormControl>
                            <FormMessage className="text-red-500 text-[10px] mt-1" />
                          </FormItem>
                        )}
                      />
                    </div>
                  </TabsContent>
                </div>
              </Tabs>
            </div>

            <DialogFooter className="px-6 sm:px-8 py-6 border-t border-slate-100 dark:border-white/5 shrink-0 flex flex-row justify-end gap-4 backdrop-blur-sm">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isLoading}
                className="h-12 px-8 rounded-2xl border-slate-200 dark:border-white/10 bg-white/50 dark:bg-white/5 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10 font-bold transition-all"
              >
                {t('cityManagement.form.cancel')}
              </Button>
              <Button
                type="submit"
                disabled={isLoading || !isFormValid}
                className="h-12 px-10 rounded-2xl bg-linear-to-r from-pink-600 to-orange-600 text-white font-black shadow-lg shadow-pink-500/20 ring-1 ring-pink-400/30 transition-all duration-300 hover:scale-[1.05] hover:from-pink-500 hover:to-orange-500 active:scale-[0.98] opacity-90 grayscale-[0] dark:opacity-100 dark:grayscale-0"
              >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t('cityManagement.form.save')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

import { type ReactElement, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { VoiceSearchCombobox, type ComboboxOption } from '@/components/shared/VoiceSearchCombobox';
import { districtFormSchema, type DistrictFormSchema } from '../types/district-types';
import type { DistrictDto } from '../types/district-types';
import { useCityOptions } from '@/features/city-management/hooks/useCityOptions';
import { MapPin } from 'lucide-react';
import { Cancel01Icon } from 'hugeicons-react';

interface DistrictFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: DistrictFormSchema) => void | Promise<void>;
  district?: DistrictDto | null;
  isLoading?: boolean;
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
  
  focus:ring-2 focus:ring-pink-500/10 focus-ring-offset-0 focus:border-pink-500
  
  transition-all duration-200
`;

const LABEL_STYLE = "text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide ml-1 mb-2 flex items-center gap-2";

export function DistrictForm({
  open,
  onOpenChange,
  onSubmit,
  district,
  isLoading = false,
}: DistrictFormProps): ReactElement {
  const { t } = useTranslation();
  const { data: cities, isLoading: citiesLoading } = useCityOptions();

  const cityOptions: ComboboxOption[] = cities?.map(city => ({
    value: city.id.toString(),
    label: city.name,
  })) || [];

  const form = useForm<DistrictFormSchema>({
    resolver: zodResolver(districtFormSchema),
    mode: 'onChange',
    reValidateMode: 'onChange',
    defaultValues: {
      name: '',
      erpCode: '',
      cityId: 0,
    },
  });
  const isFormValid = form.formState.isValid;

  useEffect(() => {
    if (district) {
      form.reset({
        name: district.name,
        erpCode: district.erpCode || '',
        cityId: district.cityId,
      });
    } else {
      form.reset({
        name: '',
        erpCode: '',
        cityId: 0,
      });
    }
  }, [district, form]);

  const handleSubmit = async (data: DistrictFormSchema): Promise<void> => {
    await onSubmit(data);
    if (!isLoading) {
       form.reset(); 
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-1rem)] sm:w-[calc(100vw-2rem)] max-w-[96vw] xl:max-w-[1000px] max-h-[92vh] flex flex-col p-0 bg-white dark:bg-[#130822] border border-slate-100 dark:border-white/10 text-slate-900 dark:text-white shadow-2xl overflow-hidden">
        <DialogHeader className="px-6 py-5 bg-slate-50/50 dark:bg-[#1a1025]/50 backdrop-blur-sm border-b border-slate-100 dark:border-white/5 shrink-0 flex flex-row items-center justify-between sticky top-0 z-10">
          <div className="flex flex-col items-center gap-4 flex-1">
             <div className="h-12 w-12 rounded-2xl bg-linear-to-br from-pink-500 to-orange-500 p-0.5 shadow-lg shadow-pink-500/20">
               <div className="h-full w-full bg-white dark:bg-[#130822] rounded-[14px] flex items-center justify-center">
                 <MapPin size={24} className="text-pink-600 dark:text-pink-500" />
               </div>
             </div>
             <div className="space-y-1 text-center">
                <DialogTitle className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                  {district
                    ? t('districtManagement.form.editDistrict')
                    : t('districtManagement.form.addDistrict')}
                </DialogTitle>
                <DialogDescription className="text-slate-500 dark:text-slate-400 text-xs mt-0.5">
                  {district
                    ? t('districtManagement.form.editDescription')
                    : t('districtManagement.form.addDescription')}
                </DialogDescription>
             </div>
          </div>
          <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-full absolute right-4 top-4">
            <Cancel01Icon size={20} />
          </Button>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-5">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem className="space-y-0">
                    <FormLabel className={LABEL_STYLE}>
                      {t('districtManagement.form.name')} *
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder={t('districtManagement.form.namePlaceholder')}
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
                name="cityId"
                render={({ field }) => (
                  <FormItem className="space-y-0">
                    <FormLabel className={LABEL_STYLE}>
                      {t('districtManagement.form.city')} *
                    </FormLabel>
                    <VoiceSearchCombobox
                      options={cityOptions}
                      value={field.value?.toString()}
                      onSelect={(value) => field.onChange(value ? Number(value) : 0)}
                      placeholder={t('districtManagement.form.selectCity')}
                      searchPlaceholder={t('districtManagement.form.searchCity')}
                      className={INPUT_STYLE}
                      modal={true}
                      disabled={citiesLoading}
                    />
                    <FormMessage className="text-red-500 text-[10px] mt-1" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="erpCode"
                render={({ field }) => (
                  <FormItem className="space-y-0">
                    <FormLabel className={LABEL_STYLE}>
                      {t('districtManagement.form.erpCode')}
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder={t('districtManagement.form.erpCodePlaceholder')}
                        maxLength={10}
                        className={INPUT_STYLE}
                      />
                    </FormControl>
                    <FormMessage className="text-red-500 text-[10px] mt-1" />
                  </FormItem>
                )}
              />

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-[#1a1025]/50 backdrop-blur-sm -mx-6 -mb-6 p-6 sticky bottom-0 z-10">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={isLoading}
                  className="h-12 px-6 rounded-xl border-slate-200 dark:border-white/10 hover:bg-white dark:hover:bg-white/5 text-slate-700 dark:text-slate-300 font-semibold"
                >
                  {t('districtManagement.cancel')}
                </Button>
                <Button 
                  type="submit" 
                  disabled={isLoading || !isFormValid}
                  className="h-12 px-8 rounded-xl bg-linear-to-r from-pink-600 to-orange-600 hover:from-pink-700 hover:to-orange-700 text-white font-bold shadow-lg shadow-pink-500/20 border-0 transition-all hover:scale-[1.02]"
                >
                  {isLoading
                    ? t('districtManagement.saving')
                    : t('districtManagement.save')}
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  );
}

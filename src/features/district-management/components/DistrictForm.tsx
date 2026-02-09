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
    defaultValues: {
      name: '',
      erpCode: '',
      cityId: 0,
    },
  });

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
      <DialogContent className="bg-white dark:bg-[#130822] border border-slate-100 dark:border-white/10 text-slate-900 dark:text-white w-[90%] sm:w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden p-0 gap-0">
        <DialogHeader className="px-6 py-5 bg-slate-50/50 dark:bg-[#1a1025]/50 backdrop-blur-sm border-b border-slate-100 dark:border-white/5 flex-shrink-0 flex-row items-center justify-between space-y-0 sticky top-0 z-10">
          <div className="flex items-center gap-4">
             <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-pink-500 to-orange-500 p-0.5 shadow-lg shadow-pink-500/20">
               <div className="h-full w-full bg-white dark:bg-[#130822] rounded-[14px] flex items-center justify-center">
                 <MapPin size={24} className="text-pink-600 dark:text-pink-500" />
               </div>
             </div>
             <div className="space-y-1">
                <DialogTitle className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                  {district
                    ? t('districtManagement.form.editDistrict', 'İlçe Düzenle')
                    : t('districtManagement.form.addDistrict', 'Yeni İlçe Ekle')}
                </DialogTitle>
                <DialogDescription className="text-slate-500 dark:text-slate-400 text-xs mt-0.5">
                  {district
                    ? t('districtManagement.form.editDescription', 'İlçe bilgilerini düzenleyin')
                    : t('districtManagement.form.addDescription', 'Yeni ilçe bilgilerini girin')}
                </DialogDescription>
             </div>
          </div>
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
                      {t('districtManagement.form.name', 'İlçe Adı')} *
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder={t('districtManagement.form.namePlaceholder', 'İlçe adını girin')}
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
                      {t('districtManagement.form.city', 'Şehir')} *
                    </FormLabel>
                    <VoiceSearchCombobox
                      options={cityOptions}
                      value={field.value?.toString()}
                      onSelect={(value) => field.onChange(value ? Number(value) : 0)}
                      placeholder={t('districtManagement.form.selectCity', 'Şehir seçin')}
                      searchPlaceholder={t('districtManagement.form.searchCity', 'Şehir ara...')}
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
                      {t('districtManagement.form.erpCode', 'ERP Kodu')}
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder={t('districtManagement.form.erpCodePlaceholder', 'ERP kodunu girin (opsiyonel)')}
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
                  {t('districtManagement.cancel', 'İptal')}
                </Button>
                <Button 
                  type="submit" 
                  disabled={isLoading}
                  className="h-12 px-8 rounded-xl bg-gradient-to-r from-pink-600 to-orange-600 hover:from-pink-700 hover:to-orange-700 text-white font-bold shadow-lg shadow-pink-500/20 border-0 transition-all hover:scale-[1.02]"
                >
                  {isLoading
                    ? t('districtManagement.saving', 'Kaydediliyor...')
                    : t('districtManagement.save', 'Kaydet')}
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  );
}

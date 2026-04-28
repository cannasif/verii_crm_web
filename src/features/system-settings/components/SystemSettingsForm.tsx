import { zodResolver } from '@hookform/resolvers/zod';
import { type ReactElement, useEffect, useMemo } from 'react';
import { type Resolver, type SubmitHandler, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Loader2 } from 'lucide-react';
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
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { isZodFieldRequired } from '@/lib/zod-required';
import {
  systemSettingsFormSchema,
  type SystemSettingsDto,
  type SystemSettingsFormSchema,
} from '../types/systemSettings';
import { useLineFormUiPreferencesStore } from '@/stores/line-form-ui-preferences-store';

interface SystemSettingsFormProps {
  data: SystemSettingsDto | undefined;
  isLoading: boolean;
  isSubmitting: boolean;
  onSubmit: (data: SystemSettingsFormSchema) => void | Promise<void>;
}

export function SystemSettingsForm({
  data,
  isLoading,
  isSubmitting,
  onSubmit,
}: SystemSettingsFormProps): ReactElement {
  const { t } = useTranslation();

  const numberFormatOptions = useMemo(
    () => [
      { value: 'tr-TR', label: t('systemSettings.NumberFormatOptions.trTR') },
      { value: 'en-US', label: t('systemSettings.NumberFormatOptions.enUS') },
      { value: 'de-DE', label: t('systemSettings.NumberFormatOptions.deDE') },
    ],
    [t]
  );

  const linePrefs = useLineFormUiPreferencesStore.getState();

  const form = useForm<SystemSettingsFormSchema>({
    resolver: zodResolver(systemSettingsFormSchema) as Resolver<SystemSettingsFormSchema>,
    mode: 'onChange',
    reValidateMode: 'onChange',
    defaultValues: {
      numberFormat: 'tr-TR',
      decimalPlaces: 2,
      restrictCustomersBySalesRepMatch: false,
      showDescriptionFieldsSection: linePrefs.showDescriptionFieldsSection,
      customDescriptionLabel1: linePrefs.customDescriptionLabel1,
      customDescriptionLabel2: linePrefs.customDescriptionLabel2,
      customDescriptionLabel3: linePrefs.customDescriptionLabel3,
    },
  });

  useEffect(() => {
    if (!data) return;
    const prefs = useLineFormUiPreferencesStore.getState();
    form.reset({
      numberFormat: data.numberFormat,
      decimalPlaces: data.decimalPlaces,
      restrictCustomersBySalesRepMatch: data.restrictCustomersBySalesRepMatch,
      showDescriptionFieldsSection: prefs.showDescriptionFieldsSection,
      customDescriptionLabel1: prefs.customDescriptionLabel1,
      customDescriptionLabel2: prefs.customDescriptionLabel2,
      customDescriptionLabel3: prefs.customDescriptionLabel3,
    });
  }, [data, form]);

  const handleSubmit: SubmitHandler<SystemSettingsFormSchema> = (values) => onSubmit(values);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-muted-foreground text-sm">{t('common.loading')}</p>
        </CardContent>
      </Card>
    );
  }

  const headerCardStyle = `
    overflow-hidden rounded-[2rem] border border-slate-200 dark:border-white/10 
    bg-white dark:bg-[#180F22] backdrop-blur-md px-2 py-6 shadow-xl 
    transition-all duration-300 relative
  `;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <Card className={headerCardStyle}>

          <CardContent className="grid gap-4 md:grid-cols-2">
            <FormField
              control={form.control}
              name="numberFormat"
              render={({ field }) => (
                <FormItem>
                  <FormLabel required={isZodFieldRequired(systemSettingsFormSchema, 'numberFormat')}>
                    {t('systemSettings.Fields.NumberFormat')}
                  </FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t('systemSettings.Placeholders.NumberFormat')} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {numberFormatOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="decimalPlaces"
              render={({ field }) => (
                <FormItem>
                  <FormLabel required={isZodFieldRequired(systemSettingsFormSchema, 'decimalPlaces')}>
                    {t('systemSettings.Fields.DecimalPlaces')}
                  </FormLabel>
                  <FormControl>
                    <Input
                      className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0C0516]"
                      type="number"
                      min={0}
                      max={6}
                      step={1}
                      {...field}
                      onChange={(e) => {
                        const rawValue = e.target.value;
                        if (rawValue === '') {
                          field.onChange(0);
                          return;
                        }

                        const numericValue = Number(rawValue);
                        const clampedValue = Number.isFinite(numericValue)
                          ? Math.min(6, Math.max(0, Math.trunc(numericValue)))
                          : 0;

                        field.onChange(clampedValue);
                      }}
                      onBlur={(e) => {
                        field.onBlur();
                        const rawValue = e.target.value;
                        const numericValue = rawValue === '' ? 0 : Number(rawValue);
                        const clampedValue = Number.isFinite(numericValue)
                          ? Math.min(6, Math.max(0, Math.trunc(numericValue)))
                          : 0;

                        form.setValue('decimalPlaces', clampedValue, {
                          shouldDirty: true,
                          shouldTouch: true,
                          shouldValidate: true,
                        });
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="restrictCustomersBySalesRepMatch"
              render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/[0.03]">
                    <FormControl>
                      <Checkbox checked={field.value} onCheckedChange={(checked) => field.onChange(Boolean(checked))} />
                    </FormControl>
                    <div className="space-y-1">
                      <FormLabel required={false}>
                        {t('systemSettings.Fields.RestrictCustomersBySalesRepMatch')}
                      </FormLabel>
                      <p className="text-muted-foreground text-sm">
                        {t('systemSettings.Descriptions.RestrictCustomersBySalesRepMatch')}
                      </p>
                    </div>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="md:col-span-2 space-y-1 border-t border-border pt-4">
              <h3 className="text-sm font-semibold">{t('systemSettings.LineFormSection.Title')}</h3>
              <p className="text-muted-foreground text-xs">{t('systemSettings.LineFormSection.Description')}</p>
            </div>

            <FormField
              control={form.control}
              name="showDescriptionFieldsSection"
              render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <div className="flex flex-row items-center justify-between gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/[0.03]">
                    <div className="space-y-1">
                      <FormLabel htmlFor="sys-line-show-pvd">{t('systemSettings.LineFormSection.ShowBlock')}</FormLabel>
                      <p className="text-muted-foreground text-xs">{t('systemSettings.LineFormSection.ShowBlockHint')}</p>
                    </div>
                    <FormControl>
                      <Switch id="sys-line-show-pvd" checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="customDescriptionLabel1"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('systemSettings.LineFormSection.CustomLabel1')}</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder={t('systemSettings.LineFormSection.CustomLabelPlaceholder')} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="customDescriptionLabel2"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('systemSettings.LineFormSection.CustomLabel2')}</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder={t('systemSettings.LineFormSection.CustomLabelPlaceholder')} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="customDescriptionLabel3"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('systemSettings.LineFormSection.CustomLabel3')}</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder={t('systemSettings.LineFormSection.CustomLabelPlaceholder')} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <div className="flex justify-end pt-4">
          <Button
            type="submit"
            disabled={isSubmitting || !form.formState.isValid}
            className="min-w-[120px] bg-linear-to-r from-pink-600 to-orange-600 px-8 font-bold text-white shadow-lg shadow-pink-500/20 ring-1 ring-pink-400/30 transition-all duration-300 hover:scale-[1.05] hover:from-pink-500 hover:to-orange-500 active:scale-[0.98] opacity-50 grayscale-[0] dark:opacity-100 dark:grayscale-0"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t('common.saving')}
              </>
            ) : t('common.save')}
          </Button>
        </div>
      </form>
    </Form>
  );
}

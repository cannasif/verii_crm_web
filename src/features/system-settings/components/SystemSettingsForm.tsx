import { zodResolver } from '@hookform/resolvers/zod';
import { type ReactElement, useEffect } from 'react';
import { type Resolver, type SubmitHandler, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
import { isZodFieldRequired } from '@/lib/zod-required';
import {
  systemSettingsFormSchema,
  type SystemSettingsDto,
  type SystemSettingsFormSchema,
} from '../types/systemSettings';

const languageOptions = [
  { value: 'tr', label: 'Türkçe' },
  { value: 'en', label: 'English' },
  { value: 'de', label: 'Deutsch' },
  { value: 'fr', label: 'Français' },
];

const currencyOptions = [
  { value: 'TRY', label: 'TRY - Türk Lirası' },
  { value: 'USD', label: 'USD - Amerikan Doları' },
  { value: 'EUR', label: 'EUR - Euro' },
  { value: 'GBP', label: 'GBP - İngiliz Sterlini' },
];

const timeZoneOptions = [
  { value: 'Europe/Istanbul', label: 'Europe/Istanbul (UTC+03:00)' },
  { value: 'UTC', label: 'UTC (UTC+00:00)' },
  { value: 'Europe/Berlin', label: 'Europe/Berlin' },
  { value: 'America/New_York', label: 'America/New_York' },
];

const dateFormatOptions = ['dd.MM.yyyy', 'yyyy-MM-dd', 'MM/dd/yyyy'];
const timeFormatOptions = ['HH:mm', 'HH:mm:ss', 'hh:mm a'];
const numberFormatOptions = [
  { value: 'tr-TR', label: 'Türkçe sayı biçimi (1.234,56)' },
  { value: 'en-US', label: 'US sayı biçimi (1,234.56)' },
  { value: 'de-DE', label: 'Almanca sayı biçimi (1.234,56)' },
];

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

  const form = useForm<SystemSettingsFormSchema>({
    resolver: zodResolver(systemSettingsFormSchema) as Resolver<SystemSettingsFormSchema>,
    mode: 'onChange',
    reValidateMode: 'onChange',
    defaultValues: {
      defaultLanguage: 'tr',
      defaultCurrencyCode: 'TRY',
      defaultTimeZone: 'Europe/Istanbul',
      dateFormat: 'dd.MM.yyyy',
      timeFormat: 'HH:mm',
      numberFormat: 'tr-TR',
      decimalPlaces: 2,
    },
  });

  useEffect(() => {
    if (!data) return;
    form.reset({
      defaultLanguage: data.defaultLanguage,
      defaultCurrencyCode: data.defaultCurrencyCode,
      defaultTimeZone: data.defaultTimeZone,
      dateFormat: data.dateFormat,
      timeFormat: data.timeFormat,
      numberFormat: data.numberFormat,
      decimalPlaces: data.decimalPlaces,
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

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>{t('systemSettings.PageTitle')}</CardTitle>
            <CardDescription>{t('systemSettings.PageDescription')}</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <FormField
              control={form.control}
              name="defaultLanguage"
              render={({ field }) => (
                <FormItem>
                  <FormLabel required={isZodFieldRequired(systemSettingsFormSchema, 'defaultLanguage')}>
                    {t('systemSettings.Fields.DefaultLanguage')}
                  </FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t('systemSettings.Placeholders.DefaultLanguage')} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {languageOptions.map((option) => (
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
              name="defaultCurrencyCode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel required={isZodFieldRequired(systemSettingsFormSchema, 'defaultCurrencyCode')}>
                    {t('systemSettings.Fields.DefaultCurrencyCode')}
                  </FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t('systemSettings.Placeholders.DefaultCurrencyCode')} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {currencyOptions.map((option) => (
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
              name="defaultTimeZone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel required={isZodFieldRequired(systemSettingsFormSchema, 'defaultTimeZone')}>
                    {t('systemSettings.Fields.DefaultTimeZone')}
                  </FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t('systemSettings.Placeholders.DefaultTimeZone')} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {timeZoneOptions.map((option) => (
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
              name="dateFormat"
              render={({ field }) => (
                <FormItem>
                  <FormLabel required={isZodFieldRequired(systemSettingsFormSchema, 'dateFormat')}>
                    {t('systemSettings.Fields.DateFormat')}
                  </FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t('systemSettings.Placeholders.DateFormat')} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {dateFormatOptions.map((option) => (
                        <SelectItem key={option} value={option}>
                          {option}
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
              name="timeFormat"
              render={({ field }) => (
                <FormItem>
                  <FormLabel required={isZodFieldRequired(systemSettingsFormSchema, 'timeFormat')}>
                    {t('systemSettings.Fields.TimeFormat')}
                  </FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t('systemSettings.Placeholders.TimeFormat')} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {timeFormatOptions.map((option) => (
                        <SelectItem key={option} value={option}>
                          {option}
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
                      type="number"
                      min={0}
                      max={6}
                      {...field}
                      onChange={(e) => field.onChange(e.target.value === '' ? 0 : Number(e.target.value))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" disabled={isSubmitting || !form.formState.isValid}>
            {isSubmitting ? t('common.saving') : t('common.save')}
          </Button>
        </div>
      </form>
    </Form>
  );
}

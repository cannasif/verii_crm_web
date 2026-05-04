import { type ReactElement, useEffect } from 'react';
import { type Resolver, type SubmitHandler, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { Card, CardContent } from '@/components/ui/card';
import {
  smtpSettingsFormSchema,
  type SmtpSettingsFormSchema,
  type SmtpSettingsDto,
} from '../types/smtpSettings';
import { useSendTestMailMutation } from '../hooks/useSendTestMailMutation';
import { isZodFieldRequired } from '@/lib/zod-required';

interface MailSettingsFormProps {
  data: SmtpSettingsDto | undefined;
  isLoading: boolean;
  onSubmit: (data: SmtpSettingsFormSchema) => void | Promise<void>;
  isSubmitting: boolean;
}

export function MailSettingsForm({
  data,
  isLoading,
  onSubmit,
  isSubmitting,
}: MailSettingsFormProps): ReactElement {
  const { t } = useTranslation();
  const testMailMutation = useSendTestMailMutation();

  const form = useForm<SmtpSettingsFormSchema>({
    resolver: zodResolver(smtpSettingsFormSchema) as Resolver<SmtpSettingsFormSchema>,
    mode: 'onChange',
    reValidateMode: 'onChange',
    defaultValues: {
      host: '',
      port: 587,
      enableSsl: true,
      username: '',
      password: '',
      fromEmail: '',
      fromName: '',
      timeout: 30,
    },
  });
  const isFormValid = form.formState.isValid;

  useEffect(() => {
    if (data) {
      form.reset({
        host: data.host,
        port: data.port,
        enableSsl: data.enableSsl,
        username: data.username,
        password: '',
        fromEmail: data.fromEmail,
        fromName: data.fromName,
        timeout: data.timeout,
      });
    }
  }, [data, form]);

  const handleSubmit: SubmitHandler<SmtpSettingsFormSchema> = (values) => {
    onSubmit(values);
  };

  if (isLoading) {
    return (
      <Card className="bg-white/70 dark:bg-[#190b20]/60 backdrop-blur-xl border-white/60 dark:border-white/5 shadow-sm rounded-2xl transition-all duration-300">
        <CardContent className="pt-6">
          <p className="text-muted-foreground text-sm font-medium">{t('common.loading')}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <Card className="bg-white/70 dark:bg-[#180F22]/60 backdrop-blur-xl border-white/60 dark:border-white/5 shadow-sm rounded-2xl transition-all duration-300">
          <CardContent className="space-y-6 pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="host"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium text-muted-foreground" required={isZodFieldRequired(smtpSettingsFormSchema, 'host')}>
                      {t('mailSettings.Fields.Host')}
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="text"
                        placeholder="smtp.gmail.com"
                        {...field}
                        className="bg-white border-slate-200 dark:bg-[#0C0516] dark:border-[#3b3142] text-foreground rounded-xl"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="port"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium text-muted-foreground" required={isZodFieldRequired(smtpSettingsFormSchema, 'port')}>
                      {t('mailSettings.Fields.Port')}
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={1}
                        max={65535}
                        {...field}
                        onChange={(e) => field.onChange(e.target.value === '' ? 0 : Number(e.target.value))}
                        className="bg-white border-slate-200 dark:bg-[#0C0516] dark:border-[#3b3142] text-foreground rounded-xl"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="enableSsl"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-xl border border-slate-200 dark:bg-[#180F22] dark:border-[#3b3142] p-4 px-3">
                  <div className="space-y-0.5">
                    <FormLabel className="text-sm font-medium">
                      {t('mailSettings.Fields.EnableSsl')}
                    </FormLabel>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium text-muted-foreground" required={isZodFieldRequired(smtpSettingsFormSchema, 'username')}>
                      {t('mailSettings.Fields.Username')}
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="text"
                        {...field}
                        className="bg-white border-slate-200 dark:bg-[#0C0516] dark:border-[#3b3142] text-foreground rounded-xl"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium text-muted-foreground">{t('mailSettings.Fields.Password')}</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder={t('mailSettings.Fields.PasswordPlaceholder')}
                        {...field}
                        className="bg-white border-slate-200 dark:bg-[#0C0516] dark:border-[#3b3142] text-foreground rounded-xl"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="fromName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium text-muted-foreground" required={isZodFieldRequired(smtpSettingsFormSchema, 'fromName')}>
                      {t('mailSettings.Fields.FromName')}
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="text"
                        readOnly
                        disabled
                        {...field}
                        className="bg-slate-50 border-slate-200 dark:bg-[#190b20] dark:border-[#3b3142] text-muted-foreground rounded-xl"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="fromEmail"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium text-muted-foreground" required={isZodFieldRequired(smtpSettingsFormSchema, 'fromEmail')}>
                      {t('mailSettings.Fields.FromEmail')}
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        {...field}
                        className="bg-white border-slate-200 dark:bg-[#0C0516] dark:border-[#3b3142] text-foreground rounded-xl"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="timeout"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm font-medium text-muted-foreground" required={isZodFieldRequired(smtpSettingsFormSchema, 'timeout')}>
                      {t('mailSettings.Fields.Timeout')}
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={1}
                        max={300}
                        {...field}
                        onChange={(e) => field.onChange(e.target.value === '' ? 0 : Number(e.target.value))}
                        className="bg-white border-slate-200 dark:bg-[#0C0516] dark:border-[#3b3142] text-foreground rounded-xl"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={() => testMailMutation.mutate({})}
            disabled={isSubmitting || testMailMutation.isPending}
            className="bg-linear-to-r from-purple-600 to-pink-600 text-white font-black hover:scale-[1.05] active:scale-[0.95] transition-all shadow-[0_10px_20px_-10px_rgba(219,39,119,0.5)] rounded-xl h-11 px-6
                opacity-90 grayscale-[0] 
                dark:opacity-100 dark:grayscale-0"
          >
            {testMailMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            {testMailMutation.isPending
              ? t('mailSettings.TestMail.Sending')
              : t('mailSettings.TestMail.Send')}
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting || !isFormValid}
            className="bg-linear-to-r from-pink-600 to-orange-600 text-white font-black hover:scale-[1.05] active:scale-[0.95] transition-all shadow-[0_10px_20px_-10px_rgba(219,39,119,0.5)] rounded-xl h-11 px-8
                opacity-90 grayscale-[0] 
                dark:opacity-100 dark:grayscale-0"
          >
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            {isSubmitting ? t('common.saving') : t('common.save')}
          </Button>
        </div>
      </form>
    </Form>
  );
}

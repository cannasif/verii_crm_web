import { type ReactElement, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from '@/components/ui/form';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  powerbiConfigurationFormSchema,
  type PowerBIConfigurationFormSchema,
  DEFAULT_API_BASE_URL,
  DEFAULT_SCOPE,
} from '../types/powerbiConfiguration.types';
import type { PowerBIConfigurationGetDto } from '../types/powerbiConfiguration.types';
import { Loader2, InfoIcon, Trash2, X } from 'lucide-react';
import * as DialogPrimitive from '@radix-ui/react-dialog';

interface PowerbiConfigurationFormProps {
  configuration: PowerBIConfigurationGetDto | null;
  onSubmit: (data: PowerBIConfigurationFormSchema) => void | Promise<void>;
  onDelete: (id: number) => void | Promise<void>;
  isSubmitting: boolean;
  isDeleting: boolean;
}

export function PowerbiConfigurationForm({
  configuration,
  onSubmit,
  onDelete,
  isSubmitting,
  isDeleting,
}: PowerbiConfigurationFormProps): ReactElement {
  const { t } = useTranslation();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const form = useForm<PowerBIConfigurationFormSchema>({
    resolver: zodResolver(powerbiConfigurationFormSchema),
    defaultValues: {
      tenantId: '',
      clientId: '',
      workspaceId: '',
      apiBaseUrl: DEFAULT_API_BASE_URL,
      scope: DEFAULT_SCOPE,
    },
  });

  useEffect(() => {
    if (configuration) {
      form.reset({
        tenantId: configuration.tenantId,
        clientId: configuration.clientId,
        workspaceId: configuration.workspaceId,
        apiBaseUrl: configuration.apiBaseUrl ?? DEFAULT_API_BASE_URL,
        scope: configuration.scope ?? DEFAULT_SCOPE,
      });
    } else {
      form.reset({
        tenantId: '',
        clientId: '',
        workspaceId: '',
        apiBaseUrl: DEFAULT_API_BASE_URL,
        scope: DEFAULT_SCOPE,
      });
    }
  }, [configuration, form]);

  const handleSubmit = (data: PowerBIConfigurationFormSchema): void => {
    void onSubmit({
      ...data,
      apiBaseUrl: data.apiBaseUrl || undefined,
      scope: data.scope || undefined,
    });
  };

  const handleDeleteConfirm = (): void => {
    if (configuration?.id) {
      void onDelete(configuration.id);
      setDeleteDialogOpen(false);
    }
  };

  return (
    <>
      <Card className="bg-white/70 dark:bg-[#180F22] backdrop-blur-xl border border-slate-300/80 dark:border-white/15 shadow-sm rounded-2xl transition-all duration-300">
        <CardContent className="space-y-5">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <FormField
                  control={form.control}
                  name="tenantId"
                  render={({ field }) => (
                    <FormItem>
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        {t('powerbiConfiguration.tenantId')}
                      </label>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                          className="h-12 rounded-xl bg-slate-50 dark:bg-[#1E1627] border-slate-200 dark:border-white/10 focus-visible:ring-pink-500/50 focus-visible:border-pink-500/50 transition-all font-mono text-sm"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="clientId"
                  render={({ field }) => (
                    <FormItem>
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        {t('powerbiConfiguration.clientId')}
                      </label>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                          className="h-12 rounded-xl bg-slate-50 dark:bg-[#1E1627] border-slate-200 dark:border-white/10 focus-visible:ring-pink-500/50 focus-visible:border-pink-500/50 transition-all font-mono text-sm"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="workspaceId"
                render={({ field }) => (
                  <FormItem>
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      {t('powerbiConfiguration.workspaceId')}
                    </label>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="00000000-0000-0000-0000-000000000000"
                        className="h-12 rounded-xl bg-slate-50 dark:bg-[#1E1627] border-slate-200 dark:border-white/10 focus-visible:ring-pink-500/50 focus-visible:border-pink-500/50 transition-all font-mono text-sm"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <FormField
                  control={form.control}
                  name="apiBaseUrl"
                  render={({ field }) => (
                    <FormItem>
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        {t('powerbiConfiguration.apiBaseUrl')}
                      </label>
                      <FormControl>
                        <Input
                          {...field}
                          value={field.value ?? ''}
                          type="url"
                          placeholder={DEFAULT_API_BASE_URL}
                          className="h-12 rounded-xl bg-slate-50 dark:bg-[#1E1627] border-slate-200 dark:border-white/10 focus-visible:ring-pink-500/50 focus-visible:border-pink-500/50 transition-all font-mono text-sm"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="scope"
                  render={({ field }) => (
                    <FormItem>
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        {t('powerbiConfiguration.scope')}
                      </label>
                      <FormControl>
                        <Input
                          {...field}
                          value={field.value ?? ''}
                          placeholder={DEFAULT_SCOPE}
                          className="h-12 rounded-xl bg-slate-50 dark:bg-[#1E1627] border-slate-200 dark:border-white/10 focus-visible:ring-pink-500/50 focus-visible:border-pink-500/50 transition-all font-mono text-sm"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="inline-flex items-start gap-3 rounded-2xl border border-pink-200 bg-pink-50 dark:border-[#4C3D68] dark:bg-[#2D1B4E] px-4 py-3 text-sm text-pink-600 dark:text-[#FB64B6]">
                <InfoIcon className="h-4 w-4 mt-0.5 shrink-0" />
                <span className="font-medium">{t('powerbiConfiguration.clientSecretInfo')}</span>
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="rounded-xl bg-linear-to-r from-pink-600 to-orange-600 text-white font-bold hover:scale-[1.02] active:scale-[0.98] transition-all shadow-[0_5px_15px_-5px_rgba(219,39,119,0.5)] disabled:opacity-50 disabled:hover:scale-100 h-11 px-8 gap-2
                  opacity-90 grayscale-[0] 
                dark:opacity-100 dark:grayscale-0"
                >
                  {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  {configuration
                    ? t('powerbiConfiguration.update')
                    : t('powerbiConfiguration.create')}
                </Button>
                {configuration && (
                  <Button
                    type="button"
                    onClick={() => setDeleteDialogOpen(true)}
                    disabled={isDeleting}
                    className="rounded-xl border border-red-200 dark:border-red-500/30 bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-500/20 font-bold transition-all disabled:opacity-50 h-11 px-6 gap-2"
                  >
                    {isDeleting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                    {t('powerbiConfiguration.delete')}
                  </Button>
                )}
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent showCloseButton={false} className="w-[calc(100vw-1rem)] sm:w-[calc(100vw-2rem)] max-w-[480px] p-0 overflow-hidden border-0 shadow-2xl bg-white dark:bg-[#180F22] rounded-3xl ring-1 ring-slate-200 dark:ring-white/10">
          <DialogPrimitive.Close className="absolute right-6 top-6 z-50 rounded-2xl bg-slate-100 p-2.5 text-slate-400 transition-all duration-200 hover:bg-red-600 hover:text-white active:scale-90 dark:bg-white/5 dark:text-white/40 dark:hover:bg-red-600 dark:hover:text-white">
            <X size={20} strokeWidth={2.5} />
          </DialogPrimitive.Close>
          <DialogHeader >
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-red-100 dark:bg-red-500/10 shadow-inner border border-red-200 dark:border-red-500/20">
                <Trash2 className="h-6 w-6 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                  {t('powerbiConfiguration.deleteConfirmTitle')}
                </DialogTitle>
                <DialogDescription className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1">
                  {t('powerbiConfiguration.deleteConfirmDescription')}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <DialogFooter >
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              className="rounded-xl border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 hover:bg-slate-50 dark:hover:bg-white/10 font-bold px-6 h-11"
            >
              {t('common.cancel')}
            </Button>
            <Button
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
              className="h-11 px-6 sm:px-10 rounded-xl bg-linear-to-r from-pink-600 to-orange-600 text-white font-black hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg shadow-pink-500/25 text-xs sm:text-sm
              opacity-90 grayscale-[0] 
              dark:opacity-100 dark:grayscale-0"
            >
              {isDeleting && <Loader2 className="h-4 w-4 animate-spin" />}
              {t('common.delete.action')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

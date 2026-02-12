import { type ReactElement, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
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
import { Loader2, InfoIcon } from 'lucide-react';

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
      <Card>
        <CardHeader>
          <CardTitle>
            {t('powerbiConfiguration.title')}
          </CardTitle>
          <CardDescription>
            {configuration
              ? t('powerbiConfiguration.editDescription')
              : t('powerbiConfiguration.createDescription')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="tenantId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('powerbiConfiguration.tenantId')}</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" />
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
                    <FormLabel>{t('powerbiConfiguration.clientId')}</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="workspaceId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('powerbiConfiguration.workspaceId')}</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="00000000-0000-0000-0000-000000000000" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="apiBaseUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('powerbiConfiguration.apiBaseUrl')}</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value ?? ''} type="url" placeholder={DEFAULT_API_BASE_URL} />
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
                    <FormLabel>{t('powerbiConfiguration.scope')}</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value ?? ''} placeholder={DEFAULT_SCOPE} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Alert className="border-amber-200 bg-amber-50 dark:border-amber-900/50 dark:bg-amber-950/20">
                <InfoIcon className="h-4 w-4 text-amber-600 dark:text-amber-500" />
                <AlertDescription>
                  {t('powerbiConfiguration.clientSecretInfo')}
                </AlertDescription>
              </Alert>
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {configuration
                    ? t('powerbiConfiguration.update')
                    : t('powerbiConfiguration.create')}
                </Button>
                {configuration && (
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={() => setDeleteDialogOpen(true)}
                    disabled={isDeleting}
                  >
                    {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {t('powerbiConfiguration.delete')}
                  </Button>
                )}
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('powerbiConfiguration.deleteConfirmTitle')}</DialogTitle>
            <DialogDescription>
              {t('powerbiConfiguration.deleteConfirmDescription')}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button variant="destructive" onClick={handleDeleteConfirm} disabled={isDeleting}>
              {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t('common.delete.action')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

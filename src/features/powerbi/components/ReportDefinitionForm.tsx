import { type ReactElement, useEffect } from 'react';
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
import { Switch } from '@/components/ui/switch';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import {
  powerbiReportDefinitionFormSchema,
  type PowerBIReportDefinitionFormSchema,
} from '../types/powerbiReportDefinition.types';
import type { PowerBIReportDefinitionGetDto } from '../types/powerbiReportDefinition.types';
import { Loader2 } from 'lucide-react';
import { isZodFieldRequired } from '@/lib/zod-required';

interface ReportDefinitionFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial: PowerBIReportDefinitionGetDto | null;
  onSubmit: (data: PowerBIReportDefinitionFormSchema) => void | Promise<void>;
  isSubmitting: boolean;
}

export function ReportDefinitionForm({
  open,
  onOpenChange,
  initial,
  onSubmit,
  isSubmitting,
}: ReportDefinitionFormProps): ReactElement {
  const { t } = useTranslation();
  const form = useForm<PowerBIReportDefinitionFormSchema>({
    resolver: zodResolver(powerbiReportDefinitionFormSchema),
    defaultValues: {
      name: '',
      description: '',
      workspaceId: '',
      reportId: '',
      datasetId: '',
      embedUrl: '',
      isActive: true,
      rlsRoles: '',
      allowedUserIds: '',
      allowedRoleIds: '',
    },
  });

  useEffect(() => {
    if (initial) {
      form.reset({
        name: initial.name,
        description: initial.description ?? '',
        workspaceId: initial.workspaceId,
        reportId: initial.reportId,
        datasetId: initial.datasetId ?? '',
        embedUrl: initial.embedUrl ?? '',
        isActive: initial.isActive,
        rlsRoles: initial.rlsRoles ?? '',
        allowedUserIds: initial.allowedUserIds ?? '',
        allowedRoleIds: initial.allowedRoleIds ?? '',
      });
    } else {
      form.reset({
        name: '',
        description: '',
        workspaceId: '',
        reportId: '',
        datasetId: '',
        embedUrl: '',
        isActive: true,
        rlsRoles: '',
        allowedUserIds: '',
        allowedRoleIds: '',
      });
    }
  }, [initial, form, open]);

  const handleSubmit = async (data: PowerBIReportDefinitionFormSchema): Promise<void> => {
    await onSubmit(data);
    if (!isSubmitting) {
      form.reset();
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-1rem)] sm:w-[calc(100vw-2rem)] max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {initial
              ? t('powerbi.reportDefinition.edit')
              : t('powerbi.reportDefinition.add')}
          </DialogTitle>
          <DialogDescription>
            {initial
              ? t('powerbi.reportDefinition.editDescription')
              : t('powerbi.reportDefinition.createDescription')}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel required={isZodFieldRequired(powerbiReportDefinitionFormSchema, 'name')}>{t('powerbi.reportDefinition.name')}</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder={t('powerbi.reportDefinition.namePlaceholder')} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('powerbi.reportDefinition.description')}</FormLabel>
                  <FormControl>
                    <Textarea {...field} value={field.value ?? ''} rows={2} />
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
                  <FormLabel required={isZodFieldRequired(powerbiReportDefinitionFormSchema, 'workspaceId')}>{t('powerbi.reportDefinition.workspaceId')}</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="00000000-0000-0000-0000-000000000000" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="reportId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel required={isZodFieldRequired(powerbiReportDefinitionFormSchema, 'reportId')}>{t('powerbi.reportDefinition.reportId')}</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="00000000-0000-0000-0000-000000000000" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="datasetId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('powerbi.reportDefinition.datasetId')}</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value ?? ''} placeholder="00000000-0000-0000-0000-000000000000" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="embedUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('powerbi.reportDefinition.embedUrl')}</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value ?? ''} type="url" placeholder="https://..." />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="isActive"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <FormLabel>{t('powerbi.reportDefinition.isActive')}</FormLabel>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="rlsRoles"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('powerbi.reportDefinition.rlsRoles')}</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value ?? ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="allowedUserIds"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('powerbi.reportDefinition.allowedUserIds')}</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value ?? ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="allowedRoleIds"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('powerbi.reportDefinition.allowedRoleIds')}</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value ?? ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
                {t('common.cancel')}
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t('common.save')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

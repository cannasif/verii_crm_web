import { type ReactElement, useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Copy, FileText, Info, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import {
  clonePermissionGroupSchema,
  type ClonePermissionGroupSchema,
} from '../schemas/permission-group-schema';
import type { PermissionGroupDto } from '../types/access-control.types';

interface ClonePermissionGroupDialogProps {
  source: PermissionGroupDto | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: ClonePermissionGroupSchema) => Promise<void>;
  isLoading: boolean;
}

const INPUT_CLASS = 'rounded-xl border-slate-200 bg-slate-50/70 focus-visible:border-primary focus-visible:ring-primary/20 dark:border-white/10 dark:bg-white/5';

export function ClonePermissionGroupDialog({
  source,
  open,
  onOpenChange,
  onSubmit,
  isLoading,
}: ClonePermissionGroupDialogProps): ReactElement {
  const { t } = useTranslation(['access-control', 'common']);
  const form = useForm<ClonePermissionGroupSchema>({
    resolver: zodResolver(clonePermissionGroupSchema),
    mode: 'onChange',
    defaultValues: { name: '', description: '' },
  });

  useEffect(() => {
    if (!open || !source) return;
    form.reset({
      name: `${source.name.replace(/^\[Sistem\]\s*/i, '')} - Kopya`,
      description: source.description ?? '',
    });
  }, [form, open, source]);

  const handleSubmit = async (data: ClonePermissionGroupSchema): Promise<void> => {
    await onSubmit(data);
  };

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !isLoading && onOpenChange(nextOpen)}>
      <DialogContent className="overflow-hidden rounded-2xl border-slate-200 bg-white p-0 shadow-2xl dark:border-white/10 dark:bg-[#130822] sm:max-w-lg">
        <DialogHeader className="border-b border-slate-100 px-6 py-5 dark:border-white/10">
          <div className="flex items-start gap-4">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-primary/15 bg-accent text-primary dark:bg-primary/10">
              <Copy className="size-5" aria-hidden />
            </div>
            <div className="space-y-1">
              <DialogTitle>{t('permissionGroups.clone.title')}</DialogTitle>
              <DialogDescription>
                {t('permissionGroups.clone.description', { name: source?.name ?? '' })}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <Form {...form}>
          <form id="clone-permission-group-form" onSubmit={form.handleSubmit(handleSubmit)} className="space-y-5 px-6 py-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2 font-semibold">
                    <FileText className="size-4 text-primary" aria-hidden />
                    {t('permissionGroups.form.name')}
                  </FormLabel>
                  <FormControl>
                    <Input {...field} maxLength={100} autoFocus className={INPUT_CLASS} />
                  </FormControl>
                  <p className="text-xs text-muted-foreground">{t('permissionGroups.clone.nameHint')}</p>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-2 font-semibold">
                    <Info className="size-4 text-primary" aria-hidden />
                    {t('permissionGroups.form.description')}
                  </FormLabel>
                  <FormControl>
                    <Textarea {...field} value={field.value ?? ''} maxLength={500} className={cn(INPUT_CLASS, 'min-h-24')} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </form>
        </Form>

        <DialogFooter className="border-t border-slate-100 bg-slate-50/70 px-6 py-4 dark:border-white/10 dark:bg-white/[0.03]">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" form="clone-permission-group-form" disabled={isLoading || !form.formState.isValid}>
            {isLoading ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Copy className="mr-2 size-4" />}
            {t('permissionGroups.clone.submit')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

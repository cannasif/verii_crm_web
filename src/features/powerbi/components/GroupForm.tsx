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
import { Textarea } from '@/components/ui/textarea';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  powerbiGroupFormSchema,
  type PowerBIGroupFormSchema,
} from '../types/powerbiGroup.types';
import type { PowerBIGroupGetDto } from '../types/powerbiGroup.types';
import { Loader2 } from 'lucide-react';
import { isZodFieldRequired } from '@/lib/zod-required';

interface GroupFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial: PowerBIGroupGetDto | null;
  onSubmit: (data: PowerBIGroupFormSchema) => void | Promise<void>;
  isSubmitting: boolean;
}

export function GroupForm({
  open,
  onOpenChange,
  initial,
  onSubmit,
  isSubmitting,
}: GroupFormProps): ReactElement {
  const { t } = useTranslation();
  const form = useForm<PowerBIGroupFormSchema>({
    resolver: zodResolver(powerbiGroupFormSchema),
    mode: 'onChange',
    reValidateMode: 'onChange',
    defaultValues: {
      name: '',
      description: '',
      isActive: true,
    },
  });
  const isFormValid = form.formState.isValid;

  useEffect(() => {
    if (initial) {
      form.reset({
        name: initial.name,
        description: initial.description ?? '',
        isActive: initial.isActive,
      });
    } else {
      form.reset({
        name: '',
        description: '',
        isActive: true,
      });
    }
  }, [initial, form, open]);

  const handleSubmit = async (data: PowerBIGroupFormSchema): Promise<void> => {
    await onSubmit(data);
    if (!isSubmitting) {
      form.reset();
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-1rem)] sm:w-[calc(100vw-2rem)] max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {initial
              ? t('powerbi.group.edit')
              : t('powerbi.group.add')}
          </DialogTitle>
          <DialogDescription>
            {initial
              ? t('powerbi.group.editDescription')
              : t('powerbi.group.createDescription')}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel required={isZodFieldRequired(powerbiGroupFormSchema, 'name')}>{t('powerbi.group.name')}</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder={t('powerbi.group.namePlaceholder')} />
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
                  <FormLabel>{t('powerbi.group.description')}</FormLabel>
                  <FormControl>
                    <Textarea {...field} value={field.value ?? ''} rows={2} />
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
                  <FormLabel>{t('powerbi.group.isActive')}</FormLabel>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
                {t('common.cancel')}
              </Button>
              <Button type="submit" disabled={isSubmitting || !isFormValid}>
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

import { type ReactElement, useEffect } from 'react';
import { useForm, type FieldErrors } from 'react-hook-form';
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
import { Textarea } from '@/components/ui/textarea';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { activityTypeFormSchema, type ActivityTypeFormSchema } from '../types/activity-type-types';
import type { ActivityTypeDto } from '../types/activity-type-types';
import { ListTodo, Type, FileText, X } from 'lucide-react';
import { isZodFieldRequired } from '@/lib/zod-required';
import { cn } from '@/lib/utils';
import { DOCUMENT_DIALOG_CLOSE_BUTTON_BASE_CLASS } from '@/lib/document-line-dialog-styles';

interface ActivityTypeFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: ActivityTypeFormSchema) => void | Promise<void>;
  activityType?: ActivityTypeDto | null;
  isLoading?: boolean;
}

const INPUT_STYLE = `
  h-12 rounded-xl
  bg-slate-50 dark:bg-[#0f0a18] 
  border border-slate-200 dark:border-white/10 
  text-slate-900 dark:text-white text-sm
  placeholder:text-slate-400 dark:placeholder:text-slate-600 
  
  focus-visible:bg-white dark:focus-visible:bg-[#1a1025]
  focus-visible:border-primary dark:focus-visible:border-primary/40
  focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:ring-offset-0 dark:focus-visible:ring-primary/25
  
  focus:ring-2 focus:ring-primary/20 focus:ring-offset-0 focus:border-primary
  
  transition-all duration-200
`;

const LABEL_STYLE = "text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide ml-1 mb-2 flex items-center gap-2";

export function ActivityTypeForm({
  open,
  onOpenChange,
  onSubmit,
  activityType,
  isLoading = false,
}: ActivityTypeFormProps): ReactElement {
  const { t } = useTranslation('activity-meeting-type-management');

  const form = useForm<ActivityTypeFormSchema>({
    resolver: zodResolver(activityTypeFormSchema),
    mode: 'onChange',
    reValidateMode: 'onChange',
    defaultValues: {
      name: '',
      description: '',
    },
  });

  useEffect(() => {
    if (activityType) {
      form.reset({
        name: activityType.name,
        description: activityType.description || '',
      });
    } else {
      form.reset({
        name: '',
        description: '',
      });
    }
  }, [activityType, form]);

  const handleSubmit = async (data: ActivityTypeFormSchema): Promise<void> => {
    await onSubmit(data);
    if (!isLoading) {
      form.reset();
      onOpenChange(false);
    }
  };

  const handleInvalidSubmit = (errors: FieldErrors<ActivityTypeFormSchema>): void => {
    const fieldNames = Object.keys(errors);
    const firstField = fieldNames[0] as keyof ActivityTypeFormSchema | undefined;
    if (firstField) {
      form.setFocus(firstField);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} className="w-[calc(100vw-1rem)] sm:w-[calc(50vw-2rem)] !max-w-[700px] max-h-[92vh] flex flex-col p-0 overflow-hidden bg-white dark:bg-[#130822] border border-slate-100 dark:border-white/10 shadow-2xl rounded-[2.5rem]">

        <DialogHeader className="px-6 py-5 border-b border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-[#1a1025]/50 flex flex-row items-center justify-between sticky top-0 z-10 backdrop-blur-sm">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-primary to-[var(--crm-brand-accent)] p-0.5 shadow-lg shadow-primary/20">
              <div className="h-full w-full bg-white dark:bg-[#130822] rounded-[14px] flex items-center justify-center">
                <ListTodo size={24} className="text-primary dark:text-primary" />
              </div>
            </div>
            <div className="space-y-1">
              <DialogTitle className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                {activityType
                  ? t('activityType.form.editTitle')
                  : t('activityType.form.addTitle')}
              </DialogTitle>
              <DialogDescription className="text-slate-500 dark:text-slate-400 text-sm">
                {activityType
                  ? t('activityType.form.editDescription')
                  : t('activityType.form.addDescription')}
              </DialogDescription>
            </div>
          </div>
          <button
            onClick={() => onOpenChange(false)}
            className={cn(
              'h-10 w-10 rounded-full shadow-sm active:scale-90',
              DOCUMENT_DIALOG_CLOSE_BUTTON_BASE_CLASS
            )}
          >
            <X size={20} />
          </button>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6 sm:p-8 custom-scrollbar">
          <Form {...form}>
            <form id="activity-type-form" onSubmit={form.handleSubmit(handleSubmit, handleInvalidSubmit)} className="space-y-6">

              <div className="grid grid-cols-1 gap-5">

                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={LABEL_STYLE} required={isZodFieldRequired(activityTypeFormSchema, 'name')}>
                        <Type size={16} className="text-primary" />
                        {t('activityType.form.name')}
                      </FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          className={INPUT_STYLE}
                          placeholder={t('activityType.form.namePlaceholder')}
                          maxLength={100}
                        />
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={LABEL_STYLE}>
                        <FileText size={16} className="text-primary" />
                        {t('activityType.form.description')}
                      </FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          value={field.value || ''}
                          className={`${INPUT_STYLE} min-h-[120px] h-auto py-3 resize-none`}
                          placeholder={t('activityType.form.descriptionPlaceholder')}
                          maxLength={500}
                        />
                      </FormControl>
                      <FormMessage className="text-xs" />
                    </FormItem>
                  )}
                />

              </div>

            </form>
          </Form>
        </div>

        <DialogFooter className="px-6 py-5 border-t border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-[#1a1025]/50 flex-col sm:flex-row gap-3 sticky bottom-0 z-10 backdrop-blur-sm">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
            className="w-full sm:w-auto h-11 border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/5"
          >
            {t('activityType.cancel')}
          </Button>
          <Button
            type="submit"
            form="activity-type-form"
            disabled={isLoading}
            className="w-full sm:w-auto h-11 bg-[image:var(--crm-brand-gradient)] hover:opacity-90 text-white font-semibold shadow-md hover:shadow-lg transition-all opacity-90 grayscale-[0] dark:opacity-100 dark:grayscale-0"

          >
            {isLoading
              ? t('activityType.saving')
              : t('activityType.save')}
          </Button>
        </DialogFooter>

      </DialogContent>
    </Dialog>
  );
}
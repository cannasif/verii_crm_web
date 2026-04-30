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

interface ActivityTypeFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: ActivityTypeFormSchema) => void | Promise<void>;
  activityType?: ActivityTypeDto | null;
  isLoading?: boolean;
}

// ContactForm ile BİREBİR AYNI Input Stili
const INPUT_STYLE = `
  h-12 rounded-xl
  bg-slate-50 dark:bg-[#0f0a18] 
  border border-slate-200 dark:border-white/10 
  text-slate-900 dark:text-white text-sm
  placeholder:text-slate-400 dark:placeholder:text-slate-600 
  
  focus-visible:bg-white dark:focus-visible:bg-[#1a1025]
  focus-visible:border-pink-500 dark:focus-visible:border-pink-500/70
  focus-visible:ring-2 focus-visible:ring-pink-500/10 focus-visible:ring-offset-0
  
  focus:ring-2 focus:ring-pink-500/10 focus:ring-offset-0 focus:border-pink-500
  
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
  const { t } = useTranslation();

  const form = useForm<ActivityTypeFormSchema>({
    resolver: zodResolver(activityTypeFormSchema),
    mode: 'onChange',
    reValidateMode: 'onChange',
    defaultValues: {
      name: '',
      description: '',
    },
  });
  const isFormValid = form.formState.isValid;

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} className="bg-white dark:bg-[#130822] border border-slate-100 dark:border-white/10 text-slate-900 dark:text-white !max-w-[800px] w-[95%] sm:w-full shadow-2xl sm:rounded-2xl p-0 overflow-hidden flex flex-col max-h-[90vh]">

        <DialogHeader className="px-6 py-5 border-b border-slate-100 dark:border-white/5 flex flex-row items-center justify-between sticky top-0 z-10 backdrop-blur-md bg-white/95 dark:bg-[#130822]/95">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-linear-to-br from-pink-500 to-orange-500 flex items-center justify-center shadow-lg shadow-pink-500/20 shrink-0">
              <ListTodo size={24} className="text-white" />
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
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onOpenChange(false)}
            className="group h-10 w-10 flex items-center justify-center rounded-full bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400 hover:bg-pink-500 hover:text-white transition-all duration-300 hover:scale-110 shadow-sm shrink-0"
          >
            <X size={20} className="relative z-10" />
          </Button>
        </DialogHeader>

        {/* BODY */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-8 custom-scrollbar">
          <Form {...form}>
            <form id="activity-type-form" onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">

              <div className="grid grid-cols-1 gap-5">

                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={LABEL_STYLE} required={isZodFieldRequired(activityTypeFormSchema, 'name')}>
                        <Type size={16} className="text-pink-500" />
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
                        <FileText size={16} className="text-pink-500" />
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

        {/* FOOTER: ContactForm ile Birebir Aynı Tasarım */}
        <DialogFooter className="px-6 py-5 border-t border-slate-100 dark:border-white/5 flex-col sm:flex-row gap-3 sticky bottom-0 z-10 backdrop-blur-md bg-white/95 dark:bg-[#130822]/95">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
            className="w-full sm:w-auto h-12 rounded-xl border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/5 font-semibold transition-all"
          >
            {t('activityType.cancel')}
          </Button>
          <Button
            type="submit"
            form="activity-type-form"
            disabled={isLoading || !isFormValid}
            className="w-full sm:w-auto h-12 px-8 bg-linear-to-r from-pink-600 to-orange-600 hover:from-pink-500 hover:to-orange-500 text-white font-black rounded-xl shadow-lg shadow-pink-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 border-0 opacity-75 grayscale-[0] dark:opacity-100 dark:grayscale-0"
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

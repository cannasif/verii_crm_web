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
import { Truck, Type, FileText, X, Loader2 } from 'lucide-react';
import { isZodFieldRequired } from '@/lib/zod-required';

interface ActivityTypeFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: ActivityTypeFormSchema) => void | Promise<void>;
  activityType?: ActivityTypeDto | null;
  isLoading?: boolean;
}

const INPUT_STYLE = `
  h-12 rounded-xl
  bg-slate-50 dark:bg-[#0c0516]
  border border-slate-200 dark:border-white/10
  text-slate-900 dark:text-white text-sm
  placeholder:text-slate-400 dark:placeholder:text-slate-600
  focus-visible:ring-0 focus-visible:ring-offset-0
  focus:bg-white focus:border-pink-500 focus:shadow-[0_0_0_3px_rgba(236,72,153,0.15)]
  dark:focus:bg-[#0c0516] dark:focus:border-pink-500/60 dark:focus:shadow-[0_0_0_3px_rgba(236,72,153,0.1)]
  transition-all duration-200
`;

const LABEL_STYLE =
  'text-[11px] text-slate-500 dark:text-slate-400 uppercase tracking-wider font-bold ml-1 mb-1.5 flex items-center gap-1.5';

export function ActivityTypeForm({
  open,
  onOpenChange,
  onSubmit,
  activityType,
  isLoading = false,
}: ActivityTypeFormProps): ReactElement {
  const { t } = useTranslation('activity-shipping-management');

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
      <DialogContent
        showCloseButton={false}
        className="w-[calc(100vw-1rem)] sm:w-[calc(50vw-2rem)] !max-w-[96vw] xl:max-w-[650px] max-h-[92vh] flex flex-col p-0 overflow-hidden bg-white/90 dark:bg-[#130822]/90 border border-slate-200/60 dark:border-white/10 shadow-2xl rounded-[2.5rem]"
      >
        <DialogHeader className="px-6 sm:px-8 py-6 border-b border-slate-100 dark:border-white/5 shrink-0 flex-row items-center justify-between space-y-0 sticky top-0 z-10 backdrop-blur-sm">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-linear-to-br from-pink-500 to-orange-500 p-0.5 shadow-lg shadow-pink-500/20">
              <div className="h-full w-full bg-white dark:bg-[#130822] rounded-[14px] flex items-center justify-center">
                <Truck size={22} className="text-pink-600 dark:text-pink-400" />
              </div>
            </div>
            <div>
              <DialogTitle className="text-xl font-bold text-slate-900 dark:text-white">
                {activityType
                  ? t('activityType.form.editTitle')
                  : t('activityType.form.addTitle')}
              </DialogTitle>
              <DialogDescription className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">
                {activityType
                  ? t('activityType.form.editDescription')
                  : t('activityType.form.addDescription')}
              </DialogDescription>
            </div>
          </div>
          <button
            onClick={() => onOpenChange(false)}
            className="group relative h-10 w-10 flex items-center justify-center rounded-full bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400 hover:bg-pink-500 hover:text-white transition-all duration-300 hover:rotate-90 shadow-sm"
          >
            <X size={20} className="relative z-10" />
            <div className="absolute inset-0 rounded-full bg-pink-500 opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6 sm:p-8 custom-scrollbar">
          <Form {...form}>
            <form
              id="activity-shipping-form"
              onSubmit={form.handleSubmit(handleSubmit)}
              className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500"
            >
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem className="space-y-0">
                    <FormLabel className={LABEL_STYLE} required={isZodFieldRequired(activityTypeFormSchema, 'name')}>
                      <Type size={12} className="text-pink-500 shrink-0" />
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
                    <FormMessage className="text-red-500 text-[10px] mt-1" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem className="space-y-0">
                    <FormLabel className={LABEL_STYLE}>
                      <FileText size={12} className="text-pink-500 shrink-0" />
                      {t('activityType.form.description')}
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        value={field.value || ''}
                        className={`${INPUT_STYLE} h-28 py-3 resize-none rounded-2xl`}
                        placeholder={t('activityType.form.descriptionPlaceholder')}
                        maxLength={500}
                      />
                    </FormControl>
                    <FormMessage className="text-red-500 text-[10px] mt-1" />
                  </FormItem>
                )}
              />
            </form>
          </Form>
        </div>

        <DialogFooter className="px-6 sm:px-8 py-6 border-t border-slate-100 dark:border-white/5 shrink-0 flex flex-row justify-end gap-4 backdrop-blur-sm">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
            className="h-12 px-8 rounded-2xl border-slate-200 dark:border-white/10 bg-white/50 dark:bg-white/5 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10 font-bold transition-all"
          >
            {t('activityType.cancel')}
          </Button>
          <Button
            type="submit"
            form="activity-shipping-form"
            disabled={isLoading || !isFormValid}
            className="h-12 px-10 rounded-2xl bg-linear-to-r from-pink-600 to-orange-600 text-white font-black shadow-lg shadow-pink-500/20 ring-1 ring-pink-400/30 transition-all duration-300 hover:scale-[1.05] hover:from-pink-500 hover:to-orange-500 active:scale-[0.98]"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t('activityType.saving')}
              </>
            ) : t('activityType.save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

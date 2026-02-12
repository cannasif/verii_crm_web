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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-white dark:bg-[#130822] border border-slate-100 dark:border-white/10 text-slate-900 dark:text-white max-w-2xl w-[95%] sm:w-full shadow-2xl sm:rounded-2xl p-0 overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* HEADER: ContactForm ile Birebir Aynı Tasarım */}
        <DialogHeader className="px-6 py-5 border-b border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-[#1a1025]/50 flex flex-row items-center justify-between sticky top-0 z-10 backdrop-blur-sm">
          <div className="flex items-center gap-4">
             {/* Gradient İkon Kutusu */}
             <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-pink-500 to-orange-500 p-0.5 shadow-lg shadow-pink-500/20">
               <div className="h-full w-full bg-white dark:bg-[#130822] rounded-[14px] flex items-center justify-center">
                 <ListTodo size={24} className="text-pink-600 dark:text-pink-500" />
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
          <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-full">
            <X size={20} />
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
                      <FormLabel className={LABEL_STYLE}>
                        <Type size={16} className="text-pink-500" />
                        {t('activityType.form.name')} <span className="text-red-500">*</span>
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
            className="w-full sm:w-auto h-11 bg-gradient-to-r from-pink-600 to-orange-600 hover:from-pink-700 hover:to-orange-700 text-white font-semibold shadow-md hover:shadow-lg transition-all"
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
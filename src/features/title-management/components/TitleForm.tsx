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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { titleFormSchema, type TitleFormSchema } from '../types/title-types';
import type { TitleDto } from '../types/title-types';
import { Users, X } from 'lucide-react';

interface TitleFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: TitleFormSchema) => void | Promise<void>;
  title?: TitleDto | null;
  isLoading?: boolean;
}

const INPUT_STYLE = `
  h-12 rounded-xl
  bg-slate-50 dark:bg-[#0f0a18] 
  border border-slate-200 dark:border-white/10 
  text-slate-900 dark:text-white text-sm
  placeholder:text-slate-400 dark:placeholder:text-slate-600 
  
  focus-visible:ring-0 focus-visible:ring-offset-0 
  
  focus:bg-white 
  focus:border-pink-500 
  focus:shadow-[0_0_0_3px_rgba(236,72,153,0.15)] 

  dark:focus:bg-[#0f0a18] 
  dark:focus:border-pink-500/60 
  dark:focus:shadow-[0_0_0_3px_rgba(236,72,153,0.1)]

  transition-all duration-200
`;

const LABEL_STYLE = "text-[11px] text-slate-500 dark:text-slate-400 uppercase tracking-wider font-bold ml-1 mb-1.5 block";

export function TitleForm({
  open,
  onOpenChange,
  onSubmit,
  title,
  isLoading = false,
}: TitleFormProps): ReactElement {
  const { t } = useTranslation();

  const form = useForm<TitleFormSchema>({
    resolver: zodResolver(titleFormSchema),
    defaultValues: {
      titleName: '',
      code: '',
    },
  });

  useEffect(() => {
    if (title) {
      form.reset({
        titleName: title.titleName,
        code: title.code || '',
      });
    } else {
      form.reset({
        titleName: '',
        code: '',
      });
    }
  }, [title, form]);

  const handleSubmit = async (data: TitleFormSchema): Promise<void> => {
    await onSubmit(data);
    if (!isLoading) {
      form.reset();
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} className="w-[calc(100vw-1rem)] sm:w-[calc(100vw-2rem)] max-w-[96vw] xl:max-w-[1000px] max-h-[92vh] flex flex-col p-0 overflow-hidden bg-white dark:bg-[#130822] border border-slate-100 dark:border-white/10 shadow-2xl transition-all duration-200">
        <DialogHeader className="sticky top-0 z-10 px-4 sm:px-6 py-3 border-b border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-[#1a1025]/50 backdrop-blur-sm flex-row items-center justify-between space-y-0">
          <div className="flex items-center gap-3">
             <div className="h-10 w-10 rounded-xl bg-linear-to-br from-pink-500 to-orange-500 p-0.5 shadow-lg shadow-pink-500/20">
                <div className="h-full w-full bg-white dark:bg-[#130822] rounded-[10px] flex items-center justify-center">
                  <Users size={20} className="text-pink-600 dark:text-pink-500" />
                </div>
              </div>
             <div>
                <DialogTitle className="text-base font-bold text-slate-900 dark:text-white">
                  {title
                    ? t('titleManagement.form.editTitle')
                    : t('titleManagement.form.addTitle')}
                </DialogTitle>
                <DialogDescription className="text-slate-500 dark:text-slate-400 text-[11px] mt-0.5">
                  {title
                    ? t('titleManagement.form.editDescription')
                    : t('titleManagement.form.addDescription')}
                </DialogDescription>
             </div>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => onOpenChange(false)}
            className="h-8 w-8 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-white transition-colors"
          >
            <X size={20} />
            <span className="sr-only">Close</span>
          </Button>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar bg-white dark:bg-[#130822]">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="titleName"
                render={({ field }) => (
                  <FormItem className="space-y-1">
                    <FormLabel className={LABEL_STYLE}>
                      {t('titleManagement.form.titleName')} *
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder={t('titleManagement.form.titleNamePlaceholder')}
                        maxLength={100}
                        className={INPUT_STYLE}
                      />
                    </FormControl>
                    <FormMessage className="text-red-500 text-[10px] mt-1" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="code"
                render={({ field }) => (
                  <FormItem className="space-y-1">
                    <FormLabel className={LABEL_STYLE}>
                      {t('titleManagement.form.code')}
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        value={field.value || ''}
                        placeholder={t('titleManagement.form.codePlaceholder')}
                        maxLength={10}
                        className={INPUT_STYLE}
                      />
                    </FormControl>
                    <FormMessage className="text-red-500 text-[10px] mt-1" />
                  </FormItem>
                )}
              />
            </form>
          </Form>
        </div>

        <DialogFooter className="sticky bottom-0 z-10 px-6 py-5 border-t border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-[#1a1025]/50 backdrop-blur-sm sm:justify-between sm:space-x-0">
          <div className="flex items-center gap-3 w-full justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
              className="bg-white dark:bg-transparent border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 h-11 px-6 rounded-xl transition-colors"
            >
              {t('titleManagement.form.cancel')}
            </Button>
            <Button 
              onClick={form.handleSubmit(handleSubmit)}
              disabled={isLoading}
              className="bg-linear-to-r from-pink-600 to-orange-600 hover:from-pink-700 hover:to-orange-700 text-white border-0 shadow-lg shadow-pink-500/20 h-11 px-8 rounded-xl font-bold tracking-wide transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              {isLoading
                ? t('titleManagement.saving')
                : t('titleManagement.save')}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

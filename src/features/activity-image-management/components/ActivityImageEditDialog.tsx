import { type ReactElement, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Image, X } from 'lucide-react';
import {
  activityImageUpdateSchema,
  type ActivityImageUpdateSchema,
  type ActivityImageDto,
} from '../types/activity-image-types';

interface ActivityImageEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: ActivityImageUpdateSchema) => void | Promise<void>;
  image?: ActivityImageDto | null;
  isLoading?: boolean;
}

const INPUT_STYLE = `
  min-h-[88px] py-3 resize-none rounded-lg
  bg-slate-50 dark:bg-white/5
  border border-slate-200 dark:border-white/10
  text-slate-900 dark:text-white text-sm
  placeholder:text-slate-400 dark:placeholder:text-slate-500
  focus-visible:bg-white dark:focus-visible:bg-white/5
  focus-visible:border-pink-500/70 focus-visible:ring-2 focus-visible:ring-pink-500/10 focus-visible:ring-offset-0
  transition-all duration-200 w-full
`;

const LABEL_STYLE = 'text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-2';

export function ActivityImageEditDialog({
  open,
  onOpenChange,
  onSubmit,
  image,
  isLoading = false,
}: ActivityImageEditDialogProps): ReactElement {
  const { t } = useTranslation();

  const form = useForm<ActivityImageUpdateSchema>({
    resolver: zodResolver(activityImageUpdateSchema),
    mode: 'onChange',
    defaultValues: {
      resimAciklama: '',
    },
  });

  const isFormValid = form.formState.isValid;
  const isSubmitting = isLoading;

  useEffect(() => {
    if (image) {
      form.reset({
        resimAciklama: image.resimAciklama || '',
      });
    } else {
      form.reset({
        resimAciklama: '',
      });
    }
  }, [image, form]);

  const handleSubmit = async (data: ActivityImageUpdateSchema): Promise<void> => {
    await onSubmit(data);
    if (!isLoading) {
      form.reset();
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-white dark:bg-[#0f0a18] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white max-w-2xl w-[95vw] sm:w-full max-h-[90vh] flex flex-col p-0 overflow-hidden rounded-2xl shadow-xl">
        <DialogHeader className="px-6 py-4 border-b border-slate-100 dark:border-white/5 flex flex-row items-center justify-between shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-10 w-10 rounded-xl bg-linear-to-br from-pink-500 to-orange-500 flex items-center justify-center shrink-0">
              <Image size={20} className="text-white" />
            </div>
            <div className="min-w-0">
              <DialogTitle className="text-lg font-semibold text-slate-900 dark:text-white truncate">
                {t('activity-image:editDescription', 'Açıklamayı Düzenle')}
              </DialogTitle>
              <DialogDescription className="text-slate-500 dark:text-slate-400 text-sm truncate">
                {t('activity-image:editDescriptionSubtitle', 'Resim açıklamasını güncelleyin')}
              </DialogDescription>
            </div>
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => onOpenChange(false)} 
            className="shrink-0 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-white" 
            aria-label={t('common.close', 'Kapat')}
          >
            <X size={20} />
          </Button>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-5 min-h-0">
          {image && (
            <div className="mb-6">
              <div className="rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-800 max-w-sm mx-auto">
                <img
                  src={image.resimUrl}
                  alt={image.resimAciklama || 'Activity image'}
                  className="w-full h-auto object-contain max-h-64"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                  }}
                />
              </div>
            </div>
          )}
          
          <Form {...form}>
            <form id="activity-image-edit-form" onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="resimAciklama"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className={LABEL_STYLE}>
                      <Image size={16} className="text-pink-500 shrink-0" />
                      {t('activity-image:description', 'Açıklama')}
                    </FormLabel>
                    <FormControl>
                      <Textarea 
                        {...field} 
                        className={INPUT_STYLE} 
                        placeholder={t('activity-image:descriptionPlaceholder', 'Resim hakkında açıklama girin...')}
                        maxLength={500}
                      />
                    </FormControl>
                    <div className="flex justify-between items-center">
                      <FormMessage className="text-xs text-red-500" />
                      <span className="text-xs text-slate-400">
                        {field.value?.length || 0}/500
                      </span>
                    </div>
                  </FormItem>
                )}
              />

              <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-2 border-t border-slate-100 dark:border-white/5">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => onOpenChange(false)} 
                  className="h-11 px-5 rounded-lg font-medium"
                >
                  {t('common.cancel', 'Vazgeç')}
                </Button>
                <Button 
                  type="submit" 
                  disabled={isSubmitting || !isFormValid} 
                  className="h-11 px-6 rounded-lg bg-linear-to-r from-pink-600 to-orange-600 hover:from-pink-700 hover:to-orange-700 text-white font-semibold shadow-md disabled:opacity-50 disabled:pointer-events-none"
                >
                  {isSubmitting 
                    ? t('common.saving', 'Kaydediliyor...') 
                    : t('common.update', 'Güncelle')
                  }
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  );
}

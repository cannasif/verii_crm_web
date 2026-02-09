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
import { approvalRoleGroupFormSchema, type ApprovalRoleGroupFormSchema } from '../types/approval-role-group-types';
import type { ApprovalRoleGroupDto } from '../types/approval-role-group-types';
import { ShieldCheck, Loader2 } from 'lucide-react';
import { Cancel01Icon } from 'hugeicons-react';

const INPUT_STYLE = "bg-zinc-50 dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-800 focus:ring-pink-500/20 focus:border-pink-500 transition-all duration-200";
const LABEL_STYLE = "text-zinc-700 dark:text-zinc-300 font-medium";

interface ApprovalRoleGroupFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: ApprovalRoleGroupFormSchema) => void | Promise<void>;
  group?: ApprovalRoleGroupDto | null;
  isLoading?: boolean;
}

export function ApprovalRoleGroupForm({
  open,
  onOpenChange,
  onSubmit,
  group,
  isLoading = false,
}: ApprovalRoleGroupFormProps): ReactElement {
  const { t } = useTranslation();

  const form = useForm<ApprovalRoleGroupFormSchema>({
    resolver: zodResolver(approvalRoleGroupFormSchema),
    defaultValues: {
      name: '',
    },
  });

  useEffect(() => {
    if (group) {
      form.reset({
        name: group.name,
      });
    } else {
      form.reset({
        name: '',
      });
    }
  }, [group, form]);

  const handleSubmit = async (data: ApprovalRoleGroupFormSchema): Promise<void> => {
    await onSubmit(data);
    if (!isLoading) {
      form.reset();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-1rem)] sm:w-[calc(100vw-2rem)] max-w-[500px] flex flex-col p-0 bg-white dark:bg-[#130822] border border-slate-100 dark:border-white/10 text-slate-900 dark:text-white shadow-2xl shadow-slate-200/50 dark:shadow-black/50 sm:rounded-2xl overflow-hidden transition-colors duration-300">
        
        <DialogHeader className="px-6 py-5 bg-slate-50/50 dark:bg-[#1a1025]/50 backdrop-blur-sm border-b border-slate-100 dark:border-white/5 flex-shrink-0 flex-row items-center justify-between space-y-0 sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-pink-500 to-orange-500 p-0.5 shadow-lg shadow-pink-500/20">
               <div className="h-full w-full bg-white dark:bg-[#130822] rounded-[14px] flex items-center justify-center">
                 <ShieldCheck size={24} className="text-pink-600 dark:text-pink-500" />
               </div>
            </div>
            <div className="space-y-1">
              <DialogTitle className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                {group
                  ? t('approvalRoleGroup.form.editTitle', 'Onay Rol Grubu Düzenle')
                  : t('approvalRoleGroup.form.addTitle', 'Yeni Onay Rol Grubu Ekle')}
              </DialogTitle>
              <DialogDescription className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">
                {group
                  ? t('approvalRoleGroup.form.editDescription', 'Onay rol grubu bilgilerini düzenleyin')
                  : t('approvalRoleGroup.form.addDescription', 'Yeni onay rol grubu bilgilerini girin')}
              </DialogDescription>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-full">
            <Cancel01Icon size={20} />
          </Button>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="flex-1 flex flex-col min-h-0">
            <div className="p-6 space-y-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className={LABEL_STYLE}>
                      {t('approvalRoleGroup.form.name', 'Grup Adı')}
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder={t('approvalRoleGroup.form.namePlaceholder', 'Grup adını girin')}
                        maxLength={100}
                        className={INPUT_STYLE}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter className="px-6 py-4 border-t border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-[#1a1025]/50 flex-shrink-0 backdrop-blur-sm">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isLoading}
                className="h-11 rounded-xl border-slate-200 dark:border-zinc-700 hover:bg-slate-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
              >
                {t('approvalRoleGroup.cancel', 'İptal')}
              </Button>
              <Button 
                type="submit" 
                disabled={isLoading}
                className="h-11 rounded-xl bg-gradient-to-r from-pink-600 to-orange-600 hover:from-pink-700 hover:to-orange-700 text-white shadow-lg shadow-pink-500/20 border-0"
              >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isLoading
                  ? t('approvalRoleGroup.saving', 'Kaydediliyor...')
                  : t('approvalRoleGroup.save', 'Kaydet')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

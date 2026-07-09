import { type ReactElement, useEffect, useState } from 'react';
import { useForm, type FieldErrors } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
import { VoiceSearchCombobox } from '@/components/shared/VoiceSearchCombobox';
import { Switch } from '@/components/ui/switch';
import { approvalFlowFormSchema, type ApprovalFlowFormSchema } from '../types/approval-flow-types';
import type { ApprovalFlowDto } from '../types/approval-flow-types';
import { ApprovalFlowStepList } from './ApprovalFlowStepList';
import { Package, X, Loader2 } from 'lucide-react';
import { isZodFieldRequired } from '@/lib/zod-required';
import { cn } from '@/lib/utils';
import { DOCUMENT_DIALOG_CLOSE_BUTTON_BASE_CLASS } from '@/lib/document-line-dialog-styles';
import { APPROVAL_DOCUMENT_TYPES, getApprovalDocumentTypeLabel } from '../utils/approval-document-types';

interface ApprovalFlowFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: ApprovalFlowFormSchema) => void | Promise<void>;
  approvalFlow?: ApprovalFlowDto | null;
  isLoading?: boolean;
}

const INPUT_STYLE = `
  h-12 rounded-xl
  bg-slate-50 dark:bg-[#0c0516]
  border border-slate-200 dark:border-white/10
  text-slate-900 dark:text-white text-sm
  placeholder:text-slate-400 dark:placeholder:text-slate-600
  focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:ring-offset-0 focus-visible:border-primary
  focus:bg-white dark:focus:bg-[#0c0516] dark:focus-visible:border-primary/40 dark:focus-visible:ring-primary/25
  transition-all duration-200
`;

const LABEL_STYLE =
  'text-[11px] text-slate-500 dark:text-slate-400 uppercase tracking-wider font-bold ml-1 mb-1.5 block';

export function ApprovalFlowForm({
  open,
  onOpenChange,
  onSubmit,
  approvalFlow,
  isLoading = false,
}: ApprovalFlowFormProps): ReactElement {
  const { t } = useTranslation();
  const [stepEditorOpen, setStepEditorOpen] = useState(false);

  const form = useForm<ApprovalFlowFormSchema>({
    resolver: zodResolver(approvalFlowFormSchema),
    mode: 'onChange',
    reValidateMode: 'onChange',
    defaultValues: {
      documentType: 0,
      description: '',
      isActive: true,
    },
  });

  useEffect(() => {
    if (approvalFlow) {
      form.reset({
        documentType: approvalFlow.documentType,
        description: approvalFlow.description || '',
        isActive: approvalFlow.isActive,
      });
    } else {
      form.reset({
        documentType: 0,
        description: '',
        isActive: true,
      });
    }
  }, [approvalFlow, form]);

  useEffect(() => {
    if (!open) {
      setStepEditorOpen(false);
    }
  }, [open]);

  const handleSubmit = async (data: ApprovalFlowFormSchema): Promise<void> => {
    await onSubmit(data);
    if (!isLoading) {
      form.reset();
      onOpenChange(false);
    }
  };

  const handleInvalidSubmit = (errors: FieldErrors<ApprovalFlowFormSchema>): void => {
    const fieldNames = Object.keys(errors);
    const firstField = fieldNames[0] as keyof ApprovalFlowFormSchema | undefined;
    if (firstField) {
      form.setFocus(firstField);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} className="w-[calc(100vw-1rem)] sm:w-[calc(100vw-2rem)] max-w-[96vw] xl:max-w-[850px] max-h-[92vh] flex flex-col p-0 overflow-hidden bg-white/90 dark:bg-[#130822]/90 border border-slate-200/60 dark:border-white/10 shadow-2xl rounded-[2.5rem]">

        <DialogHeader className="px-6 sm:px-8 py-6 border-b border-slate-100 dark:border-white/5 shrink-0 flex-row items-center justify-between space-y-0 sticky top-0 z-10 backdrop-blur-sm">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-primary/15 bg-accent text-primary ring-1 ring-inset ring-primary/15 dark:border-primary/25 dark:bg-primary/10">
              <Package size={24} />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold text-slate-900 dark:text-white">
                {approvalFlow
                  ? t('approvalFlow.form.editTitle')
                  : t('approvalFlow.form.addTitle')}
              </DialogTitle>
              <DialogDescription className="text-slate-500 dark:text-slate-400 text-sm mt-0.5">
                {approvalFlow
                  ? t('approvalFlow.form.editDescription')
                  : t('approvalFlow.form.addDescription')}
              </DialogDescription>
            </div>
          </div>
          <button
            type="button"
            disabled={stepEditorOpen}
            onClick={() => onOpenChange(false)}
            className={cn(
              'h-10 w-10 rounded-full shadow-sm active:scale-90 disabled:pointer-events-none disabled:opacity-40',
              DOCUMENT_DIALOG_CLOSE_BUTTON_BASE_CLASS
            )}
          >
            <X size={20} />
          </button>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6 sm:p-8 custom-scrollbar">
          <Form {...form}>
            <form id="approval-flow-form" onSubmit={form.handleSubmit(handleSubmit, handleInvalidSubmit)} className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <FormField
                control={form.control}
                name="documentType"
                render={({ field }) => (
                  <FormItem className="space-y-0">
                    <FormLabel className={LABEL_STYLE} required={isZodFieldRequired(approvalFlowFormSchema, 'documentType')}>
                      {t('approvalFlow.form.documentType')}
                    </FormLabel>
                    <VoiceSearchCombobox
                      value={field.value && field.value !== 0 ? field.value.toString() : ''}
                      onSelect={(value) => field.onChange(value ? Number(value) : 0)}
                      options={APPROVAL_DOCUMENT_TYPES.map((type) => ({
                        value: type.toString(),
                        label: getApprovalDocumentTypeLabel(t, type),
                      }))}
                      placeholder={t('approvalFlow.form.selectDocumentType')}
                      searchPlaceholder={t('common.search')}
                      className={INPUT_STYLE}
                    />
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
                      {t('approvalFlow.form.description')}
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        value={field.value || ''}
                        placeholder={t('approvalFlow.form.descriptionPlaceholder')}
                        maxLength={200}
                        className={`${INPUT_STYLE} h-24 py-3 resize-none rounded-2xl`}
                      />
                    </FormControl>
                    <FormMessage className="text-red-500 text-[10px] mt-1" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/5 p-4 transition-colors hover:bg-slate-100 dark:hover:bg-white/10">
                    <div className="space-y-1">
                      <FormLabel className="text-sm font-bold text-slate-700 dark:text-slate-200 cursor-pointer">
                        {t('approvalFlow.form.isActive')}
                      </FormLabel>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        {t('approvalFlow.form.isActiveDescription')}
                      </div>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              {approvalFlow && approvalFlow.id && (
                <div className="pt-6 animate-in fade-in duration-700">
                  <div className="mb-6 flex items-center gap-4">
                    <div className="h-[1px] flex-1 bg-slate-100 dark:bg-white/5" />
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">
                      {t('approvalFlow.steps', { ns: 'approval-flow-management', defaultValue: 'Akış Adımları' })}
                    </span>
                    <div className="h-[1px] flex-1 bg-slate-100 dark:bg-white/5" />
                  </div>
                  <ApprovalFlowStepList
                    approvalFlowId={approvalFlow.id}
                    onStepEditorOpenChange={setStepEditorOpen}
                  />
                </div>
              )}
            </form>
          </Form>
        </div>

        <DialogFooter className="px-6 sm:px-8 py-6 border-t border-slate-100 dark:border-white/5 shrink-0 flex flex-row justify-end gap-4 backdrop-blur-sm">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading || stepEditorOpen}
            className="h-12 px-8 rounded-2xl border-slate-200 dark:border-white/10 bg-white/50 dark:bg-white/5 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/10 font-bold transition-all"
          >
            {t('common.cancel')}
          </Button>
          <Button
            type="submit"
            form="approval-flow-form"
            disabled={isLoading || stepEditorOpen}
            className="h-12 px-10 rounded-2xl bg-[image:var(--crm-brand-gradient)] text-white font-black shadow-[0_10px_20px_-10px_var(--crm-brand-shadow)] ring-1 ring-primary/30 transition-all duration-300 hover:scale-[1.05] hover:from-primary hover:to-amber-500 active:scale-[0.98] opacity-90 grayscale-[0] dark:opacity-100 dark:grayscale-0"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t('common.saving')}
              </>
            ) : t('common.save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

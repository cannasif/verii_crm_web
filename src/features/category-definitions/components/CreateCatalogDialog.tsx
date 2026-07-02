import { type ReactElement, useEffect, useState } from 'react';
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
import { Library } from 'lucide-react';
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { ProductCatalogCreateDto, ProductCatalogDto } from '../types/category-definition-types';
import { cn } from '@/lib/utils';
import {
  DOCUMENT_DIALOG_CLOSE_BUTTON_BASE_CLASS,
  DOCUMENT_LINE_FORM_SAVE_BUTTON_CLASS,
} from '@/lib/document-line-dialog-styles';

const INPUT_STYLE = `
  h-12 rounded-xl
  bg-slate-50 dark:bg-[#1a1025]
  border border-slate-200 dark:border-white/10
  text-slate-900 dark:text-white text-sm
  placeholder:text-slate-400 dark:placeholder:text-slate-600
  focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:ring-offset-0 focus-visible:border-primary
  focus:bg-white dark:focus:bg-[#1a1025] dark:focus-visible:border-primary/40 dark:focus-visible:ring-primary/25
  transition-all duration-200 font-medium
`;

const SELECT_TRIGGER_STYLE = `
  h-12 rounded-xl w-full
  bg-slate-50 dark:bg-[#1a1025]
  border border-slate-200 dark:border-white/10
  text-slate-900 dark:text-white text-sm
  focus:ring-2 focus:ring-primary/20 focus:ring-offset-0 focus:border-primary
  dark:focus:border-primary/40 dark:focus:ring-primary/25
  transition-all duration-200 font-medium
`;

const SELECT_ITEM_STYLE =
  'font-medium focus:bg-accent focus:text-primary data-[highlighted]:bg-accent/80 data-[highlighted]:text-primary dark:focus:bg-primary/12 dark:data-[highlighted]:bg-primary/12';

interface CreateCatalogDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: ProductCatalogCreateDto) => Promise<void> | void;
  isLoading?: boolean;
  initialData?: ProductCatalogDto | null;
}

const DEFAULT_FORM: ProductCatalogCreateDto = {
  name: '',
  code: '',
  description: '',
  catalogType: 1,
  branchCode: null,
  sortOrder: 0,
};

export function CreateCatalogDialog({
  open,
  onOpenChange,
  onSubmit,
  isLoading = false,
  initialData,
}: CreateCatalogDialogProps): ReactElement {
  const { t } = useTranslation(['category-definitions', 'common']);
  const [form, setForm] = useState<ProductCatalogCreateDto>(DEFAULT_FORM);
  const requiredMark = <span className="ml-1 text-destructive">*</span>;

  useEffect(() => {
    if (open) {
      setForm(initialData ? {
        name: initialData.name,
        code: initialData.code,
        description: initialData.description ?? '',
        catalogType: initialData.catalogType,
        branchCode: initialData.branchCode ?? null,
        sortOrder: initialData.sortOrder,
      } : DEFAULT_FORM);
    }
  }, [initialData, open]);

  const handleSubmit = async (): Promise<void> => {
    await onSubmit({
      ...form,
      name: form.name.trim(),
      code: form.code.trim().toUpperCase(),
      description: form.description?.trim() || null,
      branchCode: form.branchCode == null || Number.isNaN(form.branchCode) ? null : Number(form.branchCode),
      sortOrder: Number(form.sortOrder) || 0,
    });
  };

  const isDisabled = isLoading || !form.name.trim() || !form.code.trim();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} className="w-[calc(100vw-1rem)] sm:w-[calc(100vw-2rem)] !max-w-[780px] p-0 overflow-hidden border-0 shadow-2xl bg-white dark:bg-[#1a1025] rounded-3xl ring-1 ring-slate-200 dark:ring-white/10 flex flex-col max-h-[92dvh]">
        <DialogPrimitive.Close
          className={cn(
            'absolute right-6 top-6 z-50 h-10 w-10 rounded-full shadow-sm active:scale-90',
            DOCUMENT_DIALOG_CLOSE_BUTTON_BASE_CLASS
          )}
        >
          <X size={20} strokeWidth={2.5} />
        </DialogPrimitive.Close>
        <DialogHeader className="p-8 pb-4 border-b border-slate-100 dark:border-white/5 text-left shrink-0">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-primary/15 bg-accent text-primary ring-1 ring-inset ring-primary/15 dark:border-primary/25 dark:bg-primary/10">
              <Library className="h-6 w-6" />
            </div>
            <div>
              <DialogTitle className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                {initialData ? t('categoryDefinitions.editCatalogTitle') : t('categoryDefinitions.createCatalogTitle')}
              </DialogTitle>
              <DialogDescription className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1">
                {initialData ? t('categoryDefinitions.editCatalogDescription') : t('categoryDefinitions.createCatalogDescription')}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-8 py-6 custom-scrollbar">
          <div className="space-y-6">
            <div className="grid gap-5 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  {t('categoryDefinitions.form.catalogName')}{requiredMark}
                </label>
                <Input
                  required
                  aria-required="true"
                  value={form.name}
                  onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                  placeholder={t('categoryDefinitions.form.catalogNamePlaceholder')}
                  className={INPUT_STYLE}
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  {t('categoryDefinitions.form.catalogCode')}{requiredMark}
                </label>
                <Input
                  required
                  aria-required="true"
                  value={form.code}
                  onChange={(event) => setForm((prev) => ({ ...prev, code: event.target.value.toUpperCase() }))}
                  placeholder={t('categoryDefinitions.form.catalogCodePlaceholder')}
                  className={`${INPUT_STYLE} font-mono uppercase tracking-wider font-semibold`}
                />
              </div>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  {t('categoryDefinitions.form.catalogType')}{requiredMark}
                </label>
                <Select
                  value={String(form.catalogType)}
                  onValueChange={(value) => setForm((prev) => ({ ...prev, catalogType: Number(value) }))}
                >
                  <SelectTrigger className={SELECT_TRIGGER_STYLE}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-slate-200 dark:border-white/10 bg-white dark:bg-[#1a1025] shadow-xl">
                    <SelectItem value="1" className={SELECT_ITEM_STYLE}>{t('categoryDefinitions.catalogTypes.b2b')}</SelectItem>
                    <SelectItem value="2" className={SELECT_ITEM_STYLE}>{t('categoryDefinitions.catalogTypes.b2c')}</SelectItem>
                    <SelectItem value="3" className={SELECT_ITEM_STYLE}>{t('categoryDefinitions.catalogTypes.dealer')}</SelectItem>
                    <SelectItem value="4" className={SELECT_ITEM_STYLE}>{t('categoryDefinitions.catalogTypes.custom')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  {t('categoryDefinitions.form.sortOrder')}
                </label>
                <Input
                  type="number"
                  value={form.sortOrder}
                  onChange={(event) => setForm((prev) => ({ ...prev, sortOrder: Number(event.target.value) }))}
                  className={INPUT_STYLE}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                {t('categoryDefinitions.form.branchCode')}
              </label>
              <Input
                type="number"
                value={form.branchCode ?? ''}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    branchCode: event.target.value ? Number(event.target.value) : null,
                  }))
                }
                placeholder={t('categoryDefinitions.form.branchCodePlaceholder')}
                className={INPUT_STYLE}
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                {t('categoryDefinitions.form.description')}
              </label>
              <Textarea
                value={form.description ?? ''}
                onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
                placeholder={t('categoryDefinitions.form.descriptionPlaceholder')}
                rows={3}
                className={`${INPUT_STYLE} resize-none`}
              />
            </div>
          </div>
        </div>

        <DialogFooter className="border-t border-slate-100 dark:border-white/5 px-8 py-4 shrink-0 flex-col sm:flex-row gap-3">
          <div className="flex-1 flex items-center text-xs font-semibold text-slate-400">
            <span className="text-primary mr-1">*</span> {t('required', { ns: 'common' })}
          </div>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
            className="rounded-xl border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 hover:bg-slate-50 dark:hover:bg-white/10 font-bold px-6 h-11"
          >
            {t('cancel', { ns: 'common' })}
          </Button>
          <Button
            onClick={() => void handleSubmit()}
            disabled={isDisabled}
            className={cn('rounded-xl px-8 h-11', DOCUMENT_LINE_FORM_SAVE_BUTTON_CLASS)}
          >
            {isLoading ? t('saving', { ns: 'common' }) : initialData ? t('update', { ns: 'common' }) : t('categoryDefinitions.actions.createCatalog')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


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
      <DialogContent showCloseButton={false} className="w-[calc(100vw-1rem)] sm:w-[calc(100vw-2rem)] !max-w-[780px] p-0 overflow-hidden border-0 shadow-2xl bg-white dark:bg-[#180F22] rounded-3xl ring-1 ring-slate-200 dark:ring-white/10 flex flex-col max-h-[92dvh]">
        <DialogPrimitive.Close className="absolute right-6 top-6 z-50 rounded-2xl bg-slate-100 p-2.5 text-slate-400 transition-all duration-200 hover:bg-red-600 hover:text-white active:scale-90 dark:bg-white/5 dark:text-white/40 dark:hover:bg-red-600 dark:hover:text-white">
          <X size={20} strokeWidth={2.5} />
        </DialogPrimitive.Close>
        <DialogHeader className="p-8 pb-4 border-b border-slate-100 dark:border-white/5 text-left shrink-0">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-pink-100 dark:bg-white/5 shadow-inner border border-pink-200 dark:border-white/10 relative overflow-hidden group">
              <div className="absolute inset-0 bg-linear-to-br from-pink-500/10 to-orange-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
              <Library className="h-6 w-6 text-pink-600 dark:text-pink-400 relative z-10" />
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
                  className="h-12 rounded-xl bg-slate-50 dark:bg-[#1E1627] border-slate-200 dark:border-white/10 focus-visible:ring-pink-500/50 focus-visible:border-pink-500/50 transition-all font-medium"
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
                  className="h-12 rounded-xl bg-slate-50 dark:bg-[#1E1627] border-slate-200 dark:border-white/10 focus-visible:ring-pink-500/50 focus-visible:border-pink-500/50 transition-all font-mono uppercase tracking-wider font-semibold"
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
                  <SelectTrigger className="h-12 rounded-xl bg-slate-50 dark:bg-[#1E1627] border-slate-200 dark:border-white/10 focus:ring-pink-500/50 focus:border-pink-500/50 transition-all font-medium">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-slate-200 dark:border-white/10 bg-white dark:bg-[#1E1627] shadow-xl">
                    <SelectItem value="1" className="font-medium focus:bg-pink-50 dark:focus:bg-pink-500/10 focus:text-pink-600 dark:focus:text-pink-400">{t('categoryDefinitions.catalogTypes.b2b')}</SelectItem>
                    <SelectItem value="2" className="font-medium focus:bg-pink-50 dark:focus:bg-pink-500/10 focus:text-pink-600 dark:focus:text-pink-400">{t('categoryDefinitions.catalogTypes.b2c')}</SelectItem>
                    <SelectItem value="3" className="font-medium focus:bg-pink-50 dark:focus:bg-pink-500/10 focus:text-pink-600 dark:focus:text-pink-400">{t('categoryDefinitions.catalogTypes.dealer')}</SelectItem>
                    <SelectItem value="4" className="font-medium focus:bg-pink-50 dark:focus:bg-pink-500/10 focus:text-pink-600 dark:focus:text-pink-400">{t('categoryDefinitions.catalogTypes.custom')}</SelectItem>
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
                  className="h-12 rounded-xl bg-slate-50 dark:bg-[#1E1627] border-slate-200 dark:border-white/10 focus-visible:ring-pink-500/50 focus-visible:border-pink-500/50 transition-all font-medium"
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
                className="h-12 rounded-xl bg-slate-50 dark:bg-[#1E1627] border-slate-200 dark:border-white/10 focus-visible:ring-pink-500/50 focus-visible:border-pink-500/50 transition-all font-medium"
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
                className="rounded-xl bg-slate-50 dark:bg-[#1E1627] border-slate-200 dark:border-white/10 focus-visible:ring-pink-500/50 focus-visible:border-pink-500/50 transition-all font-medium resize-none"
              />
            </div>
          </div>
        </div>

        <DialogFooter className="border-t border-slate-100 dark:border-white/5 px-8 py-4 shrink-0 flex-col sm:flex-row gap-3">
          <div className="flex-1 flex items-center text-xs font-semibold text-slate-400">
            <span className="text-pink-500 mr-1">*</span> {t('common.required')}
          </div>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
            className="rounded-xl border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 hover:bg-slate-50 dark:hover:bg-white/10 font-bold px-6 h-11"
          >
            {t('common.cancel')}
          </Button>
          <Button
            onClick={() => void handleSubmit()}
            disabled={isDisabled}
            className="rounded-xl bg-linear-to-r from-pink-600 to-orange-600 text-white font-bold hover:scale-[1.02] active:scale-[0.98] transition-all shadow-[0_5px_15px_-5px_rgba(219,39,119,0.5)] disabled:opacity-30 disabled:grayscale-[0] disabled:hover:scale-100 px-8 h-11"
          >
            {isLoading ? t('common.saving') : initialData ? t('common.update') : t('categoryDefinitions.actions.createCatalog')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

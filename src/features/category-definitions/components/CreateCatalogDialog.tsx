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
      <DialogContent className="w-[calc(100vw-1rem)] sm:w-[calc(100vw-2rem)] max-w-[620px] p-0 overflow-hidden border-0 shadow-2xl bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl ring-1 ring-zinc-200 dark:ring-zinc-800">
        <DialogHeader className="p-6 pb-3">
          <DialogTitle className="text-2xl font-bold tracking-tight">
            {initialData ? t('categoryDefinitions.editCatalogTitle') : t('categoryDefinitions.createCatalogTitle')}
          </DialogTitle>
          <DialogDescription className="text-base">
            {initialData ? t('categoryDefinitions.editCatalogDescription') : t('categoryDefinitions.createCatalogDescription')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 px-6 pb-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">{t('categoryDefinitions.form.catalogName')}{requiredMark}</label>
              <Input
                required
                aria-required="true"
                value={form.name}
                onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                placeholder={t('categoryDefinitions.form.catalogNamePlaceholder')}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">{t('categoryDefinitions.form.catalogCode')}{requiredMark}</label>
              <Input
                required
                aria-required="true"
                value={form.code}
                onChange={(event) => setForm((prev) => ({ ...prev, code: event.target.value.toUpperCase() }))}
                placeholder={t('categoryDefinitions.form.catalogCodePlaceholder')}
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">{t('categoryDefinitions.form.catalogType')}{requiredMark}</label>
              <Select
                value={String(form.catalogType)}
                onValueChange={(value) => setForm((prev) => ({ ...prev, catalogType: Number(value) }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">{t('categoryDefinitions.catalogTypes.b2b')}</SelectItem>
                  <SelectItem value="2">{t('categoryDefinitions.catalogTypes.b2c')}</SelectItem>
                  <SelectItem value="3">{t('categoryDefinitions.catalogTypes.dealer')}</SelectItem>
                  <SelectItem value="4">{t('categoryDefinitions.catalogTypes.custom')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">{t('categoryDefinitions.form.sortOrder')}</label>
              <Input
                type="number"
                value={form.sortOrder}
                onChange={(event) => setForm((prev) => ({ ...prev, sortOrder: Number(event.target.value) }))}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">{t('categoryDefinitions.form.branchCode')}</label>
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
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">{t('categoryDefinitions.form.description')}</label>
            <Textarea
              value={form.description ?? ''}
              onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
              placeholder={t('categoryDefinitions.form.descriptionPlaceholder')}
              rows={4}
            />
          </div>
        </div>

        <div className="px-6 pb-1 text-xs text-muted-foreground">
          <span className="text-destructive">*</span> {t('common.required')}
        </div>

        <DialogFooter className="border-t bg-slate-50/80 px-6 py-4 dark:border-white/10 dark:bg-white/5">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            {t('common.cancel')}
          </Button>
          <Button onClick={() => void handleSubmit()} disabled={isDisabled}>
            {isLoading ? t('common.saving') : initialData ? t('common.update') : t('categoryDefinitions.actions.createCatalog')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

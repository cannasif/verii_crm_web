import { type ChangeEvent, type ReactElement, useEffect, useRef, useState } from 'react';
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
import { Badge } from '@/components/ui/badge';
import { Button as UiButton } from '@/components/ui/button';
import { Combobox } from '@/components/ui/combobox';
import { categoryDefinitionsApi } from '../api/category-definitions-api';
import type { CatalogCategoryCreateDto, CatalogCategoryNodeDto } from '../types/category-definition-types';
import { getCategoryVisualPresetOption, getCategoryVisualPresetOptions } from '../lib/category-visual-presets';

interface CreateCategoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CatalogCategoryCreateDto) => Promise<void> | void;
  isLoading?: boolean;
  targetLabel: string;
  parentCatalogCategoryId?: number | null;
  initialData?: CatalogCategoryNodeDto | null;
}

const DEFAULT_FORM: Omit<CatalogCategoryCreateDto, 'parentCatalogCategoryId'> = {
  name: '',
  code: '',
  description: '',
  sortOrder: 0,
  isLeaf: true,
  visualPreset: 1,
  imageUrl: null,
};

export function CreateCategoryDialog({
  open,
  onOpenChange,
  onSubmit,
  isLoading = false,
  targetLabel,
  parentCatalogCategoryId,
  initialData,
}: CreateCategoryDialogProps): ReactElement {
  const { t } = useTranslation(['category-definitions', 'common']);
  const [form, setForm] = useState(DEFAULT_FORM);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [pendingImageFile, setPendingImageFile] = useState<File | null>(null);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const requiredMark = <span className="ml-1 text-destructive">*</span>;

  useEffect(() => {
    if (open) {
      setForm(initialData ? {
        name: initialData.name,
        code: initialData.code,
        description: initialData.description ?? '',
        sortOrder: initialData.sortOrder,
        isLeaf: initialData.isLeaf,
        visualPreset: initialData.visualPreset ?? 1,
        imageUrl: initialData.imageUrl ?? null,
      } : DEFAULT_FORM);
      setPendingImageFile(null);
      setPreviewImageUrl(initialData?.imageUrl ?? null);
    }
  }, [initialData, open]);

  useEffect(() => {
    return () => {
      if (previewImageUrl?.startsWith('blob:')) {
        URL.revokeObjectURL(previewImageUrl);
      }
    };
  }, [previewImageUrl]);

  const handleSubmit = async (): Promise<void> => {
    let imageUrl = form.imageUrl;

    if (pendingImageFile) {
      setIsUploadingImage(true);
      try {
        imageUrl = await categoryDefinitionsApi.uploadCategoryImage(pendingImageFile);
      } finally {
        setIsUploadingImage(false);
      }
    }

    await onSubmit({
      parentCatalogCategoryId: parentCatalogCategoryId ?? null,
      name: form.name.trim(),
      code: form.code.trim().toUpperCase(),
      description: form.description?.trim() || null,
      sortOrder: Number(form.sortOrder) || 0,
      isLeaf: form.isLeaf,
      visualPreset: form.visualPreset,
      imageUrl,
    });
  };

  const isDisabled = isLoading || isUploadingImage || !form.name.trim() || !form.code.trim();
  const visualPresetOptions = getCategoryVisualPresetOptions(t);
  const selectedPreset = getCategoryVisualPresetOption(t, form.visualPreset);
  const SelectedPresetIcon = selectedPreset.icon;

  const handleImageSelect = (event: ChangeEvent<HTMLInputElement>): void => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (previewImageUrl?.startsWith('blob:')) {
      URL.revokeObjectURL(previewImageUrl);
    }

    const objectUrl = URL.createObjectURL(file);
    setPendingImageFile(file);
    setPreviewImageUrl(objectUrl);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemoveImage = (): void => {
    if (previewImageUrl?.startsWith('blob:')) {
      URL.revokeObjectURL(previewImageUrl);
    }

    setPendingImageFile(null);
    setPreviewImageUrl(null);
    setForm((prev) => ({ ...prev, imageUrl: null }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-1rem)] sm:w-[calc(100vw-2rem)] max-w-[680px] max-h-[calc(100dvh-1.5rem)] p-0 border-0 shadow-2xl bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl ring-1 ring-zinc-200 dark:ring-zinc-800 flex flex-col overflow-hidden">
        <DialogHeader className="p-6 pb-3">
          <DialogTitle className="text-2xl font-bold tracking-tight">
            {initialData ? t('categoryDefinitions.editCategoryTitle') : t('categoryDefinitions.createCategoryTitle')}
          </DialogTitle>
          <DialogDescription className="text-base">
            {initialData
              ? t('categoryDefinitions.editCategoryDescription', { target: targetLabel })
              : t('categoryDefinitions.createCategoryDescription', { target: targetLabel })}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 pb-6">
          <div className="space-y-4">
          <div className="rounded-2xl border border-dashed px-4 py-3 text-sm text-muted-foreground">
            {t('categoryDefinitions.createCategoryTarget')}: <span className="font-medium text-foreground">{targetLabel}</span>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">{t('categoryDefinitions.form.categoryName')}{requiredMark}</label>
              <Input
                required
                aria-required="true"
                value={form.name}
                onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                placeholder={t('categoryDefinitions.form.categoryNamePlaceholder')}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">{t('categoryDefinitions.form.categoryCode')}{requiredMark}</label>
              <Input
                required
                aria-required="true"
                value={form.code}
                onChange={(event) => setForm((prev) => ({ ...prev, code: event.target.value.toUpperCase() }))}
                placeholder={t('categoryDefinitions.form.categoryCodePlaceholder')}
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">{t('categoryDefinitions.form.nodeType')}{requiredMark}</label>
              <Select
                value={form.isLeaf ? 'leaf' : 'branch'}
                onValueChange={(value) => setForm((prev) => ({ ...prev, isLeaf: value === 'leaf' }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="leaf">{t('categoryDefinitions.leaf')}</SelectItem>
                  <SelectItem value="branch">{t('categoryDefinitions.branch')}</SelectItem>
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
            <label className="text-sm font-medium">{t('categoryDefinitions.form.description')}</label>
            <Textarea
              value={form.description ?? ''}
              onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
              placeholder={t('categoryDefinitions.form.descriptionPlaceholder')}
              rows={4}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_220px]">
            <div className="space-y-2">
              <label className="text-sm font-medium">{t('categoryDefinitions.form.visualPreset')}{requiredMark}</label>
              <Combobox
                options={visualPresetOptions.map((option) => ({
                  value: String(option.value),
                  label: option.label,
                }))}
                value={String(form.visualPreset)}
                onValueChange={(value) => setForm((prev) => ({ ...prev, visualPreset: Number(value) }))}
                placeholder={t('categoryDefinitions.form.visualPresetPlaceholder')}
                searchPlaceholder={t('categoryDefinitions.form.visualPresetSearchPlaceholder')}
                emptyText={t('categoryDefinitions.form.visualPresetEmpty')}
                modal
              />
              <p className="text-xs text-muted-foreground">
                {t('categoryDefinitions.form.visualPresetHelp')}
              </p>

              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <label className="text-sm font-medium">{t('categoryDefinitions.form.categoryImage')}</label>
                  {previewImageUrl ? (
                    <UiButton type="button" variant="ghost" size="sm" onClick={handleRemoveImage}>
                      {t('categoryDefinitions.actions.removeCategoryImage')}
                    </UiButton>
                  ) : null}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(event) => void handleImageSelect(event)}
                />
                <UiButton
                  type="button"
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploadingImage}
                >
                  {isUploadingImage
                    ? t('categoryDefinitions.actions.uploadingCategoryImage')
                    : t('categoryDefinitions.actions.uploadCategoryImage')}
                </UiButton>
                <p className="text-xs text-muted-foreground">
                  {t('categoryDefinitions.form.categoryImageHelp')}
                </p>
              </div>
            </div>

            <div className="rounded-2xl border p-4">
              <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {t('categoryDefinitions.visualPreviewTitle')}
              </div>
              <div className="mt-3 flex items-center gap-3">
                {previewImageUrl ? (
                  <img
                    src={previewImageUrl}
                    alt={form.name.trim() || t('categoryDefinitions.visualPreviewFallback')}
                    className="h-12 w-12 rounded-2xl object-cover border"
                  />
                ) : (
                  <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${selectedPreset.colorClassName}`}>
                    <SelectedPresetIcon className="h-6 w-6" />
                  </div>
                )}
                <div className="min-w-0">
                  <div className="font-medium">{form.name.trim() || t('categoryDefinitions.visualPreviewFallback')}</div>
                  <Badge variant="outline" className={`mt-2 ${selectedPreset.badgeClassName}`}>
                    {selectedPreset.label}
                  </Badge>
                </div>
              </div>
            </div>
          </div>
          </div>
          <div className="text-xs text-muted-foreground">
            <span className="text-destructive">*</span> {t('common.required')}
          </div>
        </div>

        <DialogFooter className="border-t bg-slate-50/80 px-6 py-4 dark:border-white/10 dark:bg-white/5">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            {t('common.cancel')}
          </Button>
          <Button onClick={() => void handleSubmit()} disabled={isDisabled}>
            {isLoading ? t('common.saving') : initialData ? t('common.update') : t('categoryDefinitions.actions.createCategory')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

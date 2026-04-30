import { type ChangeEvent, type ReactElement, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FolderPlus, X } from 'lucide-react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
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
      <DialogContent showCloseButton={false} className="w-[calc(100vw-1rem)] sm:w-[calc(100vw-2rem)] !max-w-[840px] max-h-[calc(100dvh-1.5rem)] p-0 border-0 shadow-2xl bg-white dark:bg-[#180F22] rounded-3xl ring-1 ring-slate-200 dark:ring-white/10 flex flex-col overflow-hidden">
        <DialogPrimitive.Close className="absolute right-6 top-6 z-50 rounded-2xl bg-slate-100 p-2.5 text-slate-400 transition-all duration-200 hover:bg-red-600 hover:text-white active:scale-90 dark:bg-white/5 dark:text-white/40 dark:hover:bg-red-600 dark:hover:text-white">
          <X size={20} strokeWidth={2.5} />
        </DialogPrimitive.Close>
        <DialogHeader className="p-8 pb-4 border-b border-slate-100 dark:border-white/5 text-left shrink-0">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-pink-100 dark:bg-white/5 shadow-inner border border-pink-200 dark:border-white/10 relative overflow-hidden group">
              <div className="absolute inset-0 bg-linear-to-br from-pink-500/10 to-orange-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
              <FolderPlus className="h-6 w-6 text-pink-600 dark:text-pink-400 relative z-10" />
            </div>
            <div>
              <DialogTitle className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                {initialData ? t('categoryDefinitions.editCategoryTitle') : t('categoryDefinitions.createCategoryTitle')}
              </DialogTitle>
              <DialogDescription className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1">
                {initialData
                  ? t('categoryDefinitions.editCategoryDescription', { target: targetLabel })
                  : t('categoryDefinitions.createCategoryDescription', { target: targetLabel })}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-8 py-6 custom-scrollbar">
          <div className="space-y-6">
            <div className="rounded-2xl border border-dashed border-pink-200 dark:border-pink-500/30 bg-pink-50/50 dark:bg-pink-500/5 px-4 py-3 text-sm font-medium text-pink-600 dark:text-pink-400">
              {t('categoryDefinitions.createCategoryTarget')}: <span className="font-bold text-pink-700 dark:text-pink-300 ml-1">{targetLabel}</span>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  {t('categoryDefinitions.form.categoryName')}{requiredMark}
                </label>
                <Input
                  required
                  aria-required="true"
                  value={form.name}
                  onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                  placeholder={t('categoryDefinitions.form.categoryNamePlaceholder')}
                  className="h-12 rounded-xl bg-slate-50 dark:bg-[#1E1627] border-slate-200 dark:border-white/10 focus-visible:ring-pink-500/50 focus-visible:border-pink-500/50 transition-all font-medium"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  {t('categoryDefinitions.form.categoryCode')}{requiredMark}
                </label>
                <Input
                  required
                  aria-required="true"
                  value={form.code}
                  onChange={(event) => setForm((prev) => ({ ...prev, code: event.target.value.toUpperCase() }))}
                  placeholder={t('categoryDefinitions.form.categoryCodePlaceholder')}
                  className="h-12 rounded-xl bg-slate-50 dark:bg-[#1E1627] border-slate-200 dark:border-white/10 focus-visible:ring-pink-500/50 focus-visible:border-pink-500/50 transition-all font-mono uppercase tracking-wider font-semibold"
                />
              </div>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  {t('categoryDefinitions.form.nodeType')}{requiredMark}
                </label>
                <Select
                  value={form.isLeaf ? 'leaf' : 'branch'}
                  onValueChange={(value) => setForm((prev) => ({ ...prev, isLeaf: value === 'leaf' }))}
                >
                  <SelectTrigger className="h-12 rounded-xl bg-slate-50 dark:bg-[#1E1627] border-slate-200 dark:border-white/10 focus:ring-pink-500/50 focus:border-pink-500/50 transition-all font-medium">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-slate-200 dark:border-white/10 bg-white dark:bg-[#1E1627] shadow-xl">
                    <SelectItem value="leaf" className="font-medium focus:bg-pink-50 dark:focus:bg-pink-500/10 focus:text-pink-600 dark:focus:text-pink-400">{t('categoryDefinitions.leaf')}</SelectItem>
                    <SelectItem value="branch" className="font-medium focus:bg-pink-50 dark:focus:bg-pink-500/10 focus:text-pink-600 dark:focus:text-pink-400">{t('categoryDefinitions.branch')}</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs font-medium text-slate-400 dark:text-slate-500 mt-1">
                  {form.isLeaf
                    ? t('categoryDefinitions.form.nodeTypeLeafHelp')
                    : t('categoryDefinitions.form.nodeTypeBranchHelp')}
                </p>
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

            <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_220px]">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  {t('categoryDefinitions.form.visualPreset')}{requiredMark}
                </label>
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
                <p className="text-xs font-medium text-slate-400 dark:text-slate-500 mt-1">
                  {t('categoryDefinitions.form.visualPresetHelp')}
                </p>

                <div className="space-y-2 pt-2">
                  <div className="flex items-center justify-between gap-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      {t('categoryDefinitions.form.categoryImage')}
                    </label>
                    {previewImageUrl ? (
                      <UiButton type="button" variant="ghost" size="sm" onClick={handleRemoveImage} className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 h-7 text-xs px-2 rounded-lg">
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
                    className="w-full justify-start h-12 rounded-xl border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#1E1627] hover:bg-slate-100 dark:hover:bg-white/5 font-medium"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploadingImage}
                  >
                    {isUploadingImage
                      ? t('categoryDefinitions.actions.uploadingCategoryImage')
                      : t('categoryDefinitions.actions.uploadCategoryImage')}
                  </UiButton>
                  <p className="text-xs font-medium text-slate-400 dark:text-slate-500 mt-1">
                    {t('categoryDefinitions.form.categoryImageHelp')}
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-[#1E1627] p-5 shadow-sm transition-all hover:border-pink-500/30 group">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 group-hover:text-pink-500 dark:group-hover:text-pink-400 transition-colors">
                  {t('categoryDefinitions.visualPreviewTitle')}
                </div>
                <div className="mt-4 flex flex-col items-center gap-3 text-center">
                  {previewImageUrl ? (
                    <img
                      src={previewImageUrl}
                      alt={form.name.trim() || t('categoryDefinitions.visualPreviewFallback')}
                      className="h-16 w-16 rounded-2xl object-cover border border-slate-200 dark:border-white/10 shadow-sm"
                    />
                  ) : (
                    <div className={`flex h-16 w-16 items-center justify-center rounded-2xl shadow-sm ${selectedPreset.colorClassName}`}>
                      <SelectedPresetIcon className="h-8 w-8" />
                    </div>
                  )}
                  <div className="min-w-0 w-full">
                    <div className="font-bold text-slate-800 dark:text-white truncate">{form.name.trim() || t('categoryDefinitions.visualPreviewFallback')}</div>
                    <Badge variant="outline" className={`mt-2 ${selectedPreset.badgeClassName}`}>
                      {selectedPreset.label}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="border-t border-slate-100 dark:border-white/5 px-8 py-4 flex-col sm:flex-row gap-3 shrink-0">
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
            {isLoading ? t('common.saving') : initialData ? t('common.update') : t('categoryDefinitions.actions.createCategory')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

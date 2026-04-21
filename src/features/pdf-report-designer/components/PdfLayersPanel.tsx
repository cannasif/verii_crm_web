import type { ChangeEvent, ReactElement } from 'react';
import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { Eye, EyeOff, Lock, Unlock, ChevronUp, ChevronDown, Layers, ChevronRight, Trash2, Settings, Upload } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { usePdfReportDesignerStore } from '../store/usePdfReportDesignerStore';
import { isPdfTableElement } from '../types/pdf-report-template.types';
import { PdfElementTypeIcon, getPdfElementTypeKey } from './PdfElementTypeBadge';
import { uploadPdfTemplateImage } from '../utils/upload-pdf-template-image';
import { resolvePdfImageSrc } from '../utils/resolve-pdf-image-src';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface PdfLayersPanelProps {
  onNavigateToPage: (page: number) => void;
  templateId?: number | null;
  ruleType?: number;
}

const MAX_IMAGE_SIZE_BYTES = 2 * 1024 * 1024;

export function PdfLayersPanel({ onNavigateToPage, templateId, ruleType }: PdfLayersPanelProps): ReactElement {
  const { t } = useTranslation(['report-designer', 'common']);
  const elementOrder = usePdfReportDesignerStore((s) => s.elementOrder);
  const elementsById = usePdfReportDesignerStore((s) => s.elementsById);
  const selectedIds = usePdfReportDesignerStore((s) => s.selectedIds);
  const setSelectedIds = usePdfReportDesignerStore((s) => s.setSelectedIds);
  const setElementLocked = usePdfReportDesignerStore((s) => s.setElementLocked);
  const setElementHidden = usePdfReportDesignerStore((s) => s.setElementHidden);
  const bringForward = usePdfReportDesignerStore((s) => s.bringForward);
  const sendBackward = usePdfReportDesignerStore((s) => s.sendBackward);
  const setFlashingId = usePdfReportDesignerStore((s) => s.setFlashingId);
  const removeElement = usePdfReportDesignerStore((s) => s.removeElement);
  const updateReportElement = usePdfReportDesignerStore((s) => s.updateReportElement);
  const [deleteDialogElementId, setDeleteDialogElementId] = useState<string | null>(null);
  const settingsPanelRef = useRef<HTMLDivElement | null>(null);

  const elements = useMemo(
    () => elementOrder.map((id) => elementsById[id]).filter(Boolean),
    [elementOrder, elementsById]
  );
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    return window.matchMedia('(max-width: 1439px)').matches;
  });
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mql = window.matchMedia('(max-width: 1439px)');
    const handleChange = (event: MediaQueryListEvent): void => {
      setCollapsed(event.matches);
    };
    mql.addEventListener('change', handleChange);
    return () => mql.removeEventListener('change', handleChange);
  }, []);
  const selectedElement =
    selectedIds.length === 1 ? elementsById[selectedIds[0]] : null;

  const getLabel = (el: (typeof elements)[0]): string => {
    if (isPdfTableElement(el))
      return t('reportDesigner.layers.tableLabel', { count: el.columns.length });
    if (el.type === 'text') return el.text?.slice(0, 20) || t('reportDesigner.layers.textLabel');
    if (el.type === 'field') return el.value || t('reportDesigner.layers.fieldLabel');
    if (el.type === 'image') return t('reportDesigner.layers.imageLabel');
    if (el.type === 'shape') return t('reportDesigner.layers.shapeLabel');
    if (el.type === 'container') return t('reportDesigner.layers.containerLabel');
    if (el.type === 'note') return t('reportDesigner.layers.noteLabel');
    if (el.type === 'summary') return t('reportDesigner.layers.summaryLabel');
    if (el.type === 'quotationTotals') return t('reportDesigner.layers.quotationTotalsLabel');
    return el.type;
  };

  const handleFocusElement = useCallback(
    (id: string) => {
      const el = elementsById[id];
      if (!el) return;
      setSelectedIds([id]);
      const targetPage =
        el.pageNumbers && el.pageNumbers.length > 0 ? el.pageNumbers[0] : 1;
      onNavigateToPage(targetPage);
      setFlashingId(id);
      setTimeout(() => setFlashingId(null), 1600);
    },
    [elementsById, setSelectedIds, onNavigateToPage, setFlashingId]
  );

  const handleOpenSettings = useCallback(
    (id: string) => {
      handleFocusElement(id);
      requestAnimationFrame(() => {
        settingsPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      });
    },
    [handleFocusElement]
  );

  const handleSelectedImageUpload = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      if (selectedElement?.type !== 'image') return;
      const file = e.target.files?.[0];
      if (!file || !file.type.startsWith('image/')) return;
      if (file.size > MAX_IMAGE_SIZE_BYTES) {
        toast.error(t('common.imageMax2Mb'));
        e.target.value = '';
        return;
      }

      void uploadPdfTemplateImage(
        file,
        templateId ?? undefined,
        ruleType,
        selectedElement.id,
        selectedElement.pageNumbers?.[0] ?? 1
      )
        .then((relativeUrl) => {
          updateReportElement(selectedElement.id, { value: relativeUrl });
        })
        .catch((error: Error) => {
          toast.error(t('common.imageUploadFailed'), {
            description: error.message,
          });
        });
      e.target.value = '';
    },
    [selectedElement, t, updateReportElement, templateId, ruleType]
  );

  if (collapsed) {
    return (
      <TooltipProvider delayDuration={300}>
        <div className="flex min-h-0 w-8 shrink-0 flex-col items-center border-l border-slate-200 bg-slate-50/80 py-2 dark:border-slate-700 dark:bg-slate-900/30">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                className="rounded p-1.5 text-slate-500 hover:bg-slate-200 hover:text-slate-800 dark:hover:bg-slate-700"
                onClick={() => setCollapsed(false)}
              >
                <ChevronRight className="size-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="left">{t('reportDesigner.layers.title')}</TooltipContent>
          </Tooltip>
          <div className="mt-3 flex flex-col items-center">
            <Layers className="size-3.5 text-slate-300" />
          </div>
        </div>
      </TooltipProvider>
    );
  }

  return (
    <>
      <div className="flex min-h-0 w-52 shrink-0 flex-col border-l border-slate-200 bg-slate-50/80 dark:border-slate-700 dark:bg-slate-900/30">
      <div className="flex items-center justify-between border-b border-slate-200 px-3 py-2.5 dark:border-slate-700">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          {t('reportDesigner.layers.title')}
        </span>
        <TooltipProvider delayDuration={300}>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                className="rounded p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-700 dark:hover:bg-slate-700"
                onClick={() => setCollapsed(true)}
              >
                <ChevronRight className="size-3.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="left">{t('common.collapse', { defaultValue: 'Collapse' })}</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      <div className="flex flex-1 flex-col gap-0.5 overflow-y-auto p-2">
        {[...elementOrder].reverse().map((id, reverseIndex) => {
          const el = elementsById[id];
          if (!el) return null;
          const index = elementOrder.length - 1 - reverseIndex;
          const isSelected = selectedIds.includes(id);
          return (
            <div
              key={id}
              className={`group flex items-center gap-1 rounded-md border px-2 py-1.5 text-xs transition-colors ${
                isSelected
                  ? 'border-blue-400 bg-blue-50 dark:border-blue-600 dark:bg-blue-950/30'
                  : 'border-transparent hover:border-slate-200 hover:bg-slate-100 dark:hover:border-slate-700 dark:hover:bg-slate-800'
              }`}
            >
              <div className="flex flex-col">
                <button
                  type="button"
                  className="rounded p-0.5 text-slate-300 hover:bg-slate-200 hover:text-slate-600 disabled:opacity-30 dark:hover:bg-slate-700"
                  title={t('reportDesigner.layers.bringForward')}
                  disabled={index >= elementOrder.length - 1}
                  onClick={() => bringForward(id)}
                >
                  <ChevronUp className="size-3" />
                </button>
                <button
                  type="button"
                  className="rounded p-0.5 text-slate-300 hover:bg-slate-200 hover:text-slate-600 disabled:opacity-30 dark:hover:bg-slate-700"
                  title={t('reportDesigner.layers.sendBackward')}
                  disabled={index <= 0}
                  onClick={() => sendBackward(id)}
                >
                  <ChevronDown className="size-3" />
                </button>
              </div>
              <button
                type="button"
                className="flex min-w-0 flex-1 items-center gap-1.5 truncate text-left text-slate-700 dark:text-slate-300"
                onClick={() => handleFocusElement(id)}
                title={`${getLabel(el)}`}
              >
                <span
                  className={`flex size-4 shrink-0 items-center justify-center rounded ${
                    isSelected
                      ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-300'
                      : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                  }`}
                >
                  <PdfElementTypeIcon type={getPdfElementTypeKey(el)} className="size-3" />
                </span>
                <span className={`min-w-0 flex-1 truncate ${el.hidden ? 'opacity-50' : ''}`}>
                  {getLabel(el)}
                </span>
                {el.locked ? <Lock className="size-3 shrink-0 text-slate-400" /> : null}
                {el.hidden ? <EyeOff className="size-3 shrink-0 text-slate-400" /> : null}
              </button>
              <div className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                <button
                  type="button"
                  onClick={() => handleOpenSettings(id)}
                  className="rounded p-0.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700 dark:hover:bg-slate-700"
                  title={t('reportDesigner.actions.settings')}
                >
                  <Settings className="size-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setElementHidden(id, !el.hidden)}
                  className="rounded p-0.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700 dark:hover:bg-slate-700"
                  title={el.hidden ? t('reportDesigner.layers.show') : t('reportDesigner.layers.hide')}
                >
                  {el.hidden ? (
                    <EyeOff className="size-3.5" />
                  ) : (
                    <Eye className="size-3.5" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setElementLocked(id, !el.locked)}
                  className="rounded p-0.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700 dark:hover:bg-slate-700"
                  title={el.locked ? t('reportDesigner.layers.unlock') : t('reportDesigner.layers.lock')}
                >
                  {el.locked ? (
                    <Lock className="size-3.5" />
                  ) : (
                    <Unlock className="size-3.5" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDeleteDialogElementId(id);
                  }}
                  className="rounded p-0.5 text-slate-400 hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-900/30"
                  title={t('reportDesigner.actions.remove')}
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            </div>
          );
        })}

        {elements.length === 0 && (
          <div className="flex flex-1 items-center justify-center py-8">
            <p className="text-center text-xs text-slate-400 dark:text-slate-500">{t('reportDesigner.layers.noItems')}</p>
          </div>
        )}

        {selectedElement && !isPdfTableElement(selectedElement) && (
          <div
            ref={settingsPanelRef}
            className="mt-2 rounded-md border border-slate-200 bg-white p-2 dark:border-slate-700 dark:bg-slate-900/40"
          >
            <div className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
              {t('reportDesigner.actions.settings')}
            </div>
            <div className="flex flex-col gap-2">
              {selectedElement.type === 'image' ? (
                <>
                  <div className="flex flex-col gap-1">
                    <Label className="text-xs">{t('reportDesigner.properties.imageUrl')}</Label>
                    <Input
                      value={selectedElement.value ?? ''}
                      onChange={(e) =>
                        updateReportElement(selectedElement.id, { value: e.target.value })
                      }
                      className="h-8 text-xs"
                      placeholder={t('reportDesigner.properties.imageUrlPlaceholder')}
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <Label className="text-xs">{t('reportDesigner.properties.uploadFromFileMax2Mb')}</Label>
                    <input
                      id={`layer-image-upload-${selectedElement.id}`}
                      type="file"
                      accept="image/*"
                      className="sr-only"
                      onChange={handleSelectedImageUpload}
                    />
                    <Label
                      htmlFor={`layer-image-upload-${selectedElement.id}`}
                      className="flex cursor-pointer items-center justify-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-xs font-medium hover:bg-accent"
                    >
                      <Upload className="size-3.5" />
                      {t('common.selectImage')}
                    </Label>
                  </div>
                  {selectedElement.value ? (
                    <div className="overflow-hidden rounded-md border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/40">
                      <div className="flex h-24 items-center justify-center bg-white dark:bg-slate-900">
                        <img
                          src={resolvePdfImageSrc(selectedElement.value)}
                          alt=""
                          className="h-full w-full object-contain"
                        />
                      </div>
                      <div className="border-t border-slate-200 px-2 py-1 text-[10px] text-slate-500 dark:border-slate-700">
                        <span className="block truncate" title={selectedElement.value}>
                          {selectedElement.value}
                        </span>
                      </div>
                    </div>
                  ) : null}
                </>
              ) : null}
              {selectedElement.type !== 'image' ? (
                <>
                  <div className="flex flex-col gap-1">
                    <Label className="text-xs">{t('reportDesigner.properties.fontSize')}</Label>
                    <Select
                      value={String(selectedElement.fontSize ?? 14)}
                      onValueChange={(value) =>
                        updateReportElement(selectedElement.id, { fontSize: Number(value) })
                      }
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[10, 12, 14, 16, 18, 20, 24, 28, 32].map((size) => (
                          <SelectItem key={size} value={String(size)}>
                            {size} px
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <Label className="text-xs">{t('reportDesigner.properties.color')}</Label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={selectedElement.color ?? '#374151'}
                        onChange={(e) =>
                          updateReportElement(selectedElement.id, { color: e.target.value })
                        }
                        className="h-8 w-9 cursor-pointer rounded border border-slate-200 bg-white p-0.5"
                      />
                      <Input
                        value={selectedElement.color ?? ''}
                        onChange={(e) =>
                          updateReportElement(selectedElement.id, { color: e.target.value || undefined })
                        }
                        className="h-8 flex-1 text-xs"
                        placeholder={t('reportDesigner.properties.colorPlaceholder')}
                      />
                    </div>
                  </div>
                </>
              ) : null}
              {selectedElement.type === 'image' && (
                <div className="flex flex-col gap-1">
                  <Label className="text-xs">{t('reportDesigner.properties.imageFit')}</Label>
                  <Select
                    value={selectedElement.style?.imageFit ?? 'contain'}
                    onValueChange={(value: 'contain' | 'cover') =>
                      updateReportElement(selectedElement.id, {
                        style: {
                          ...selectedElement.style,
                          imageFit: value,
                        },
                      })
                    }
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="contain">{t('reportDesigner.properties.imageFitContain')}</SelectItem>
                      <SelectItem value="cover">{t('reportDesigner.properties.imageFitCover')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      </div>
      <AlertDialog
        open={deleteDialogElementId != null}
        onOpenChange={(open) => {
          if (!open) setDeleteDialogElementId(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('common.delete.confirmTitle', { ns: 'common' })}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('common.delete.confirmMessage', { ns: 'common' })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel', { ns: 'common' })}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteDialogElementId) removeElement(deleteDialogElementId);
                setDeleteDialogElementId(null);
              }}
            >
              {t('common.delete.action', { ns: 'common' })}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

import type { ReactElement } from 'react';
import { useState } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { usePdfReportDesignerStore } from '../store/usePdfReportDesignerStore';
import { isPdfTableElement } from '../types/pdf-report-template.types';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Upload, ChevronLeft, ChevronRight, Palette } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { FONT_FAMILIES, FONT_SIZES } from '../constants';
import { uploadPdfTemplateImage } from '../utils/upload-pdf-template-image';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export type PdfFieldPaletteType = 'text' | 'field' | 'table' | 'table-column' | 'image' | 'shape' | 'container' | 'note' | 'summary' | 'quotationTotals';

export interface PdfFieldPaletteItem {
  label: string;
  path: string;
  type: PdfFieldPaletteType;
  value?: string;
}

export interface PdfSidebarDragData {
  type: PdfFieldPaletteType;
  path: string;
  label: string;
  value?: string;
}

export interface PdfSidebarProps {
  headerFields?: PdfFieldPaletteItem[];
  lineFields?: PdfFieldPaletteItem[];
  exchangeRateFields?: PdfFieldPaletteItem[];
  imageFields?: PdfFieldPaletteItem[];
  templateId?: number | null;
}

const MAX_IMAGE_SIZE_BYTES = 2 * 1024 * 1024;

function DraggablePaletteItem({
  field,
  id,
}: {
  field: PdfFieldPaletteItem;
  id: string;
}): ReactElement {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id,
    data: {
      type: field.type,
      path: field.path,
      label: field.label,
      ...(field.value != null && { value: field.value }),
    } satisfies PdfSidebarDragData,
  });

  const style: React.CSSProperties | undefined = transform
    ? { transform: CSS.Translate.toString(transform) }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className="cursor-grab rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 shadow-sm transition-colors hover:border-slate-300 hover:bg-slate-50 active:cursor-grabbing dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 data-[dragging=true]:opacity-50"
      data-dragging={isDragging ?? undefined}
    >
      {field.label}
    </div>
  );
}

function Section({
  title,
  items,
  idPrefix,
}: {
  title: string;
  items: PdfFieldPaletteItem[];
  idPrefix: string;
}): ReactElement {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">
        {title}
      </span>
      <div className="flex flex-col gap-1">
        {items.map((field, index) => (
          <DraggablePaletteItem
            key={`${idPrefix}-${field.path || field.type}-${index}`}
            field={field}
            id={`${idPrefix}-${field.path || field.type}-${index}`}
          />
        ))}
      </div>
    </div>
  );
}

function TextPropertiesPanel(): ReactElement | null {
  const { t } = useTranslation();
  const getOrderedElements = usePdfReportDesignerStore((s) => s.getOrderedElements);
  const selectedIds = usePdfReportDesignerStore((s) => s.selectedIds);
  const updateReportElement = usePdfReportDesignerStore((s) => s.updateReportElement);
  const elements = getOrderedElements();
  const selectedElement = elements.find((el) => selectedIds.includes(el.id));
  if (
    !selectedElement ||
    isPdfTableElement(selectedElement) ||
    selectedElement.type !== 'text'
  ) {
    return null;
  }

  const fontSize = selectedElement.fontSize ?? 14;
  const fontFamily = selectedElement.fontFamily ?? 'Arial';

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900/50">
      <span className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
        {t('reportDesigner.properties.textTitle')}
      </span>
      <div className="flex flex-col gap-2">
        <Label className="text-xs">{t('reportDesigner.properties.text')}</Label>
        <Input
          value={selectedElement.text ?? ''}
          onChange={(e) => updateReportElement(selectedElement.id, { text: e.target.value })}
          className="min-h-[60px] text-sm"
          placeholder={t('reportDesigner.properties.textPlaceholder')}
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label className="text-xs">{t('reportDesigner.properties.fontSize')}</Label>
        <Select
          value={String(fontSize)}
          onValueChange={(v) =>
            updateReportElement(selectedElement.id, { fontSize: Number(v) })
          }
        >
          <SelectTrigger className="h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {FONT_SIZES.map((size) => (
              <SelectItem key={size} value={String(size)}>
                {size} px
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex flex-col gap-2">
        <Label className="text-xs">{t('reportDesigner.properties.fontFamily')}</Label>
        <Select
          value={fontFamily}
          onValueChange={(v) =>
            updateReportElement(selectedElement.id, { fontFamily: v })
          }
        >
          <SelectTrigger className="h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {FONT_FAMILIES.map((f) => (
              <SelectItem key={f.value} value={f.value}>
                {f.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex flex-col gap-2">
        <Label className="text-xs">{t('reportDesigner.properties.color')}</Label>
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={selectedElement.color ?? '#374151'}
            onChange={(e) =>
              updateReportElement(selectedElement.id, { color: e.target.value })
            }
            className="h-8 w-10 cursor-pointer rounded border border-slate-200 bg-white p-0.5"
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
    </div>
  );
}

function FieldPropertiesPanel(): ReactElement | null {
  const { t } = useTranslation();
  const getOrderedElements = usePdfReportDesignerStore((s) => s.getOrderedElements);
  const selectedIds = usePdfReportDesignerStore((s) => s.selectedIds);
  const updateReportElement = usePdfReportDesignerStore((s) => s.updateReportElement);
  const elements = getOrderedElements();
  const selectedElement = elements.find((el) => selectedIds.includes(el.id));
  if (
    !selectedElement ||
    isPdfTableElement(selectedElement) ||
    selectedElement.type !== 'field'
  ) {
    return null;
  }

  const fontSize = selectedElement.fontSize ?? 14;
  const fontFamily = selectedElement.fontFamily ?? 'Arial';

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900/50">
      <span className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
        {t('reportDesigner.properties.fieldTitle')}
      </span>
      <div className="flex flex-col gap-2">
        <Label className="text-xs">{t('reportDesigner.properties.valueLabel')}</Label>
        <Input
          value={selectedElement.value ?? ''}
          readOnly
          className="text-sm bg-slate-50 dark:bg-slate-800"
          placeholder={t('reportDesigner.properties.draggedFieldPlaceholder')}
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label className="text-xs">{t('reportDesigner.properties.fontSize')}</Label>
        <Select
          value={String(fontSize)}
          onValueChange={(v) =>
            updateReportElement(selectedElement.id, { fontSize: Number(v) })
          }
        >
          <SelectTrigger className="h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {FONT_SIZES.map((size) => (
              <SelectItem key={size} value={String(size)}>
                {size} px
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex flex-col gap-2">
        <Label className="text-xs">{t('reportDesigner.properties.fontFamily')}</Label>
        <Select
          value={fontFamily}
          onValueChange={(v) =>
            updateReportElement(selectedElement.id, { fontFamily: v })
          }
        >
          <SelectTrigger className="h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {FONT_FAMILIES.map((f) => (
              <SelectItem key={f.value} value={f.value}>
                {f.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex flex-col gap-2">
        <Label className="text-xs">{t('reportDesigner.properties.color')}</Label>
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={selectedElement.color ?? '#374151'}
            onChange={(e) =>
              updateReportElement(selectedElement.id, { color: e.target.value })
            }
            className="h-8 w-10 cursor-pointer rounded border border-slate-200 bg-white p-0.5"
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
    </div>
  );
}

function ImagePropertiesPanel({ templateId }: { templateId?: number | null }): ReactElement | null {
  const { t } = useTranslation();
  const getOrderedElements = usePdfReportDesignerStore((s) => s.getOrderedElements);
  const selectedIds = usePdfReportDesignerStore((s) => s.selectedIds);
  const updateReportElement = usePdfReportDesignerStore((s) => s.updateReportElement);
  const elements = getOrderedElements();
  const selectedElement = elements.find((el) => selectedIds.includes(el.id));
  if (
    !selectedElement ||
    isPdfTableElement(selectedElement) ||
    selectedElement.type !== 'image'
  ) {
    return null;
  }

  const isUrl =
    typeof selectedElement.value === 'string' &&
    (selectedElement.value.startsWith('http') ||
      selectedElement.value.startsWith('/') ||
      selectedElement.value.startsWith('data:'));

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;
    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      toast.error(t('common.imageMax2Mb'));
      e.target.value = '';
      return;
    }
    void uploadPdfTemplateImage(file, templateId ?? undefined)
      .then((relativeUrl) => {
        updateReportElement(selectedElement.id, { value: relativeUrl });
      })
      .catch((error: Error) => {
        toast.error(t('common.imageUploadFailed'), {
          description: error.message,
        });
      });
    e.target.value = '';
  };

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900/50">
      <span className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
        {t('reportDesigner.properties.imageTitle')}
      </span>
      <div className="flex flex-col gap-2">
        <Label className="text-xs">{t('reportDesigner.properties.imageUrl')}</Label>
        <Input
          value={selectedElement.value ?? ''}
          onChange={(e) => updateReportElement(selectedElement.id, { value: e.target.value })}
          className="text-sm"
          placeholder={t('reportDesigner.properties.imageUrlPlaceholder')}
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label className="text-xs">{t('reportDesigner.properties.uploadFromFile')}</Label>
        <input
          id={`pdf-report-designer-image-upload-${selectedElement.id}`}
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={handleFileChange}
        />
        <Label
          htmlFor={`pdf-report-designer-image-upload-${selectedElement.id}`}
          className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-xs font-medium ring-offset-background hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <Upload className="size-3.5" />
          {t('reportDesigner.properties.selectImageMax2Mb')}
        </Label>
      </div>
      {isUrl && (
        <div className="rounded border border-slate-200 bg-slate-50 p-2">
          <span className="text-xs text-slate-500">{t('reportDesigner.properties.preview')}</span>
          <img
            src={selectedElement.value}
            alt=""
            className="mt-1 max-h-20 w-full object-contain"
          />
        </div>
      )}
      <div className="flex flex-col gap-2">
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
    </div>
  );
}

export function PdfSidebar({
  headerFields,
  lineFields,
  exchangeRateFields,
  imageFields,
  templateId,
}: PdfSidebarProps = {}): ReactElement {
  const { t } = useTranslation();
  const [collapsed, setCollapsed] = useState(false);
  const fieldsItems = headerFields ?? [];
  const tableColumnsItems = lineFields ?? [];
  const exchangeRateColumnsItems = exchangeRateFields ?? [];
  const imageFieldsItems = imageFields ?? [];
  const textItem: PdfFieldPaletteItem = { label: t('reportDesigner.palette.text'), path: '', type: 'text' };
  const shapeItem: PdfFieldPaletteItem = { label: t('reportDesigner.palette.shape'), path: '', type: 'shape' };
  const containerItem: PdfFieldPaletteItem = { label: t('reportDesigner.palette.container'), path: '', type: 'container' };
  const noteItem: PdfFieldPaletteItem = { label: t('reportDesigner.palette.note'), path: '', type: 'note' };
  const summaryItem: PdfFieldPaletteItem = { label: t('reportDesigner.palette.summary'), path: '', type: 'summary' };
  const quotationTotalsItem: PdfFieldPaletteItem = { label: t('reportDesigner.palette.quotationTotals'), path: '', type: 'quotationTotals' };
  const addTableItem: PdfFieldPaletteItem = { label: t('reportDesigner.palette.addTable'), path: '', type: 'table' };
  const logoImageItem: PdfFieldPaletteItem = { label: t('reportDesigner.palette.logoImage'), path: '', type: 'image', value: 'Logo' };
  const allImageItems = [logoImageItem, ...imageFieldsItems];

  if (collapsed) {
    return (
      <TooltipProvider delayDuration={300}>
        <div className="flex min-h-0 w-8 shrink-0 flex-col items-center border-r border-slate-200 bg-slate-50 py-2 dark:border-slate-700 dark:bg-slate-900/30">
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
            <TooltipContent side="right">{t('reportDesigner.palette.title')}</TooltipContent>
          </Tooltip>
          <div className="mt-3">
            <Palette className="size-3.5 text-slate-300" />
          </div>
        </div>
      </TooltipProvider>
    );
  }

  return (
    <div className="flex min-h-0 w-64 shrink-0 flex-col overflow-hidden border-r border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-900/30">
      <div className="flex shrink-0 items-center justify-between border-b border-slate-200 px-4 py-2.5 dark:border-slate-700">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          {t('reportDesigner.palette.title')}
        </span>
        <TooltipProvider delayDuration={300}>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                className="rounded p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-700 dark:hover:bg-slate-700"
                onClick={() => setCollapsed(true)}
              >
                <ChevronLeft className="size-3.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">Daralt</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="flex flex-col gap-5 p-4">
          <Section title={t('reportDesigner.palette.text')} items={[textItem, shapeItem, containerItem, noteItem, summaryItem, quotationTotalsItem]} idPrefix="pdf-palette-text" />
          <Section title={t('reportDesigner.palette.fields')} items={fieldsItems} idPrefix="pdf-palette-fields" />
          <Section title={t('reportDesigner.palette.tableColumns')} items={tableColumnsItems} idPrefix="pdf-palette-table-columns" />
          {exchangeRateColumnsItems.length > 0 && (
            <Section
              title={t('reportDesigner.palette.exchangeRates')}
              items={exchangeRateColumnsItems}
              idPrefix="pdf-palette-exchange-rates"
            />
          )}
          <Section title={t('reportDesigner.palette.addTable')} items={[addTableItem]} idPrefix="pdf-palette-add-table" />
          <Section title={t('reportDesigner.palette.images')} items={allImageItems} idPrefix="pdf-palette-images" />
        </div>
        <div className="flex flex-col gap-3 border-t border-slate-200 p-4 dark:border-slate-700">
          <TextPropertiesPanel />
          <FieldPropertiesPanel />
            <ImagePropertiesPanel templateId={templateId} />
        </div>
      </div>
    </div>
  );
}

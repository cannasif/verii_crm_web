import type { MutableRefObject, ReactElement, RefObject } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { type RndDragCallback, type RndResizeCallback, Rnd } from 'react-rnd';
import { GripVertical, Settings, Trash2, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useReportStore } from '../store/useReportStore';
import { isTableElement, type CanvasElement, type ReportElement, type TableElement } from '../models/report-element';
import type { ReportSection } from '../models/report-element';
import {
  FONT_FAMILIES,
  FONT_SIZES,
  A4_CANVAS_WIDTH,
  A4_CANVAS_HEIGHT,
  A4_HEADER_HEIGHT,
  A4_FOOTER_HEIGHT,
  A4_CONTENT_TOP,
  A4_CONTENT_HEIGHT,
} from '../constants';

const MAX_IMAGE_SIZE_BYTES = 2 * 1024 * 1024;

export const A4_HEADER_DROPPABLE_ID = 'a4-header';
export const A4_CONTENT_DROPPABLE_ID = 'a4-content';
export const A4_FOOTER_DROPPABLE_ID = 'a4-footer';

export const SECTION_DROPPABLE_IDS = [
  A4_HEADER_DROPPABLE_ID,
  A4_CONTENT_DROPPABLE_ID,
  A4_FOOTER_DROPPABLE_ID,
] as const;

export function getSectionFromDroppableId(id: string): ReportSection | null {
  switch (id) {
    case A4_HEADER_DROPPABLE_ID:
      return 'header';
    case A4_CONTENT_DROPPABLE_ID:
      return 'content';
    case A4_FOOTER_DROPPABLE_ID:
      return 'footer';
    default:
      return null;
  }
}

export const TABLE_DROPPABLE_PREFIX = 'table-drop-';

export function getTableDroppableId(tableId: string): string {
  return `${TABLE_DROPPABLE_PREFIX}${tableId}`;
}

export function parseTableIdFromDroppableId(droppableId: string): string | null {
  if (typeof droppableId !== 'string' || !droppableId.startsWith(TABLE_DROPPABLE_PREFIX))
    return null;
  return droppableId.slice(TABLE_DROPPABLE_PREFIX.length);
}

export interface A4CanvasProps {
  canvasRef?: RefObject<HTMLDivElement | null>;
}

function TableElementBlock({ table }: { table: TableElement }): ReactElement {
  const { t } = useTranslation(['report-designer', 'common']);
  const { setNodeRef, isOver } = useDroppable({
    id: getTableDroppableId(table.id),
  });

  return (
    <div
      ref={setNodeRef}
      className={`flex h-full min-h-[2rem] w-full flex-row flex-wrap items-stretch gap-0 border border-slate-400 bg-slate-100 dark:bg-slate-800 ${
        isOver ? 'ring-2 ring-inset ring-blue-400' : ''
      }`}
    >
      {table.columns.length === 0 ? (
        <span className="flex flex-1 items-center justify-center px-2 py-1 text-xs text-slate-500">
          {t('reportDesigner.tableDropHint')}
        </span>
      ) : (
        table.columns.map((col) => (
          <div
            key={col.path}
            className="flex min-w-[4rem] flex-1 items-center justify-center border-r border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 last:border-r-0 dark:border-slate-600 dark:text-slate-300"
          >
            {col.label}
          </div>
        ))
      )}
    </div>
  );
}

const DEFAULT_FONT_SIZE = 14;
const DEFAULT_FONT_FAMILY = 'Arial';

function TextElementBlock({ element }: { element: ReportElement }): ReactElement | null {
  const { t } = useTranslation(['report-designer', 'common']);
  const updateElementText = useReportStore((s) => s.updateElementText);
  const setSelectedElement = useReportStore((s) => s.setSelectedElement);
  if (element.type !== 'text') return null;
  const fontSize = element.fontSize ?? DEFAULT_FONT_SIZE;
  const fontFamily = element.fontFamily ?? DEFAULT_FONT_FAMILY;
  const color = element.color ?? undefined;

  return (
    <textarea
      key={element.id}
      data-text-edit
      value={element.text ?? ''}
      onChange={(e) => updateElementText(element.id, e.target.value)}
      onFocus={() => setSelectedElement(element.id)}
      className="relative z-[1] h-full w-full resize-none border-0 bg-transparent p-2 text-slate-700 outline-none focus:ring-0"
      placeholder={t('reportDesigner.properties.textPlaceholder')}
      style={{
        fontSize: `${fontSize}px`,
        fontFamily: fontFamily || DEFAULT_FONT_FAMILY,
        ...(color && { color }),
      }}
    />
  );
}

function ImageElementBlock({ element }: { element: ReportElement }): ReactElement {
  const { t } = useTranslation(['report-designer', 'common']);
  const updateReportElement = useReportStore((s) => s.updateReportElement);
  const setSelectedElement = useReportStore((s) => s.setSelectedElement);
  const isUrl =
    typeof element.value === 'string' &&
    (element.value.startsWith('http') ||
      element.value.startsWith('/') ||
      element.value.startsWith('data:'));

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;
    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      toast.error(t('common.imageMax2Mb'));
      e.target.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result;
      if (typeof dataUrl === 'string') updateReportElement(element.id, { value: dataUrl });
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  if (isUrl) {
    return (
      <div className="flex h-full w-full items-center justify-center overflow-hidden bg-slate-100">
        <img src={element.value} alt="" className="h-full w-full object-contain" />
      </div>
    );
  }

  return (
    <div
      data-image-upload
      className="flex h-full w-full flex-col items-center justify-center gap-1 overflow-hidden bg-slate-100 p-2"
      onClick={(e) => e.stopPropagation()}
    >
      <input
        id={`report-image-upload-${element.id}`}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={handleFileChange}
      />
      <label
        htmlFor={`report-image-upload-${element.id}`}
        className="flex cursor-pointer flex-col items-center justify-center gap-1 rounded border-2 border-dashed border-slate-300 bg-white px-3 py-4 text-center text-xs text-slate-600 transition-colors hover:border-slate-400 hover:bg-slate-50"
        onClick={() => setSelectedElement(element.id)}
      >
        <Upload className="size-6 text-slate-400" />
        <span>{t('common.selectImage')}</span>
        <span className="text-[10px] text-slate-400">{t('reportDesigner.properties.max2MbNote')}</span>
      </label>
    </div>
  );
}

function FieldElementBlock({ element }: { element: ReportElement }): ReactElement {
  if (element.type === 'text') {
    return <TextElementBlock element={element} />;
  }
  if (element.type === 'image') {
    return <ImageElementBlock element={element} />;
  }
  const fontSize = element.fontSize ?? DEFAULT_FONT_SIZE;
  const fontFamily = element.fontFamily ?? DEFAULT_FONT_FAMILY;
  const color = element.color ?? undefined;

  return (
    <div
      className="flex h-full w-full select-none items-center justify-center text-slate-700"
      style={{
        fontSize: `${fontSize}px`,
        fontFamily,
        ...(color && { color }),
      }}
      contentEditable={false}
      suppressContentEditableWarning
    >
      {element.type === 'field' && element.value ? element.value : element.type}
    </div>
  );
}

function ElementSettingsPopover({ element }: { element: CanvasElement }): ReactElement | null {
  const { t } = useTranslation(['report-designer', 'common']);
  const updateReportElement = useReportStore((s) => s.updateReportElement);

  if (isTableElement(element)) {
    return (
      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            data-element-settings
            className="absolute right-8 top-1 z-10 rounded p-1 text-slate-500 hover:bg-slate-200 hover:text-slate-700"
            title={t('reportDesigner.actions.settings')}
            onClick={(e) => e.stopPropagation()}
          >
            <Settings className="size-3.5" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-64" align="end" side="bottom">
          <div className="text-xs text-slate-500">
            {t('reportDesigner.tableSettingsHint')}
          </div>
        </PopoverContent>
      </Popover>
    );
  }

  const el = element as ReportElement;
  const fontSize = el.fontSize ?? 14;
  const fontFamily = el.fontFamily ?? 'Arial';

  const commonFields = (
    <>
      <div className="flex flex-col gap-2">
        <Label className="text-xs">{t('reportDesigner.properties.fontSize')}</Label>
        <Select
          value={String(fontSize)}
          onValueChange={(v) => updateReportElement(el.id, { fontSize: Number(v) })}
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
          onValueChange={(v) => updateReportElement(el.id, { fontFamily: v })}
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
            value={el.color ?? '#374151'}
            onChange={(e) => updateReportElement(el.id, { color: e.target.value })}
            className="h-8 w-10 cursor-pointer rounded border border-slate-200 bg-white p-0.5"
          />
          <Input
            value={el.color ?? ''}
            onChange={(e) =>
              updateReportElement(el.id, { color: e.target.value || undefined })
            }
            className="h-8 flex-1 text-xs"
            placeholder={t('reportDesigner.properties.colorPlaceholder')}
          />
        </div>
      </div>
    </>
  );

  if (el.type === 'text') {
    return (
      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            data-element-settings
            className="absolute right-8 top-1 z-10 rounded p-1 text-slate-500 hover:bg-slate-200 hover:text-slate-700"
            title={t('reportDesigner.actions.settings')}
            onClick={(e) => e.stopPropagation()}
          >
            <Settings className="size-3.5" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-64" align="end" side="bottom">
          <div className="flex flex-col gap-3">
            <span className="text-xs font-medium text-slate-600">{t('reportDesigner.properties.textSettings')}</span>
            <div className="flex flex-col gap-2">
              <Label className="text-xs">{t('reportDesigner.properties.text')}</Label>
              <Input
                value={el.text ?? ''}
                onChange={(e) => updateReportElement(el.id, { text: e.target.value })}
                className="min-h-[60px] text-sm"
                placeholder={t('reportDesigner.properties.textPlaceholder')}
              />
            </div>
            {commonFields}
          </div>
        </PopoverContent>
      </Popover>
    );
  }

  if (el.type === 'field') {
    return (
      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            data-element-settings
            className="absolute right-8 top-1 z-10 rounded p-1 text-slate-500 hover:bg-slate-200 hover:text-slate-700"
            title={t('reportDesigner.actions.settings')}
            onClick={(e) => e.stopPropagation()}
          >
            <Settings className="size-3.5" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-64" align="end" side="bottom">
          <div className="flex flex-col gap-3">
            <span className="text-xs font-medium text-slate-600">{t('reportDesigner.properties.fieldSettings')}</span>
            <div className="flex flex-col gap-2">
              <Label className="text-xs">{t('reportDesigner.properties.valueLabel')}</Label>
              <Input
                value={el.value ?? ''}
                readOnly
                className="text-sm bg-slate-50 dark:bg-slate-800"
                placeholder={t('reportDesigner.properties.draggedFieldPlaceholder')}
              />
            </div>
            {commonFields}
          </div>
        </PopoverContent>
      </Popover>
    );
  }

  if (el.type === 'image') {
    const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
      const file = e.target.files?.[0];
      if (!file || !file.type.startsWith('image/')) return;
      if (file.size > MAX_IMAGE_SIZE_BYTES) {
        toast.error(t('common.imageMax2Mb'));
        e.target.value = '';
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result;
        if (typeof dataUrl === 'string') updateReportElement(el.id, { value: dataUrl });
      };
      reader.readAsDataURL(file);
      e.target.value = '';
    };
    return (
      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            data-element-settings
            className="absolute right-8 top-1 z-10 rounded p-1 text-slate-500 hover:bg-slate-200 hover:text-slate-700"
            title={t('reportDesigner.actions.settings')}
            onClick={(e) => e.stopPropagation()}
          >
            <Settings className="size-3.5" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-64" align="end" side="bottom">
          <div className="flex flex-col gap-3">
            <span className="text-xs font-medium text-slate-600">{t('reportDesigner.properties.imageSettings')}</span>
            <div className="flex flex-col gap-2">
              <Label className="text-xs">{t('reportDesigner.properties.imageUrl')}</Label>
              <Input
                value={el.value ?? ''}
                onChange={(e) => updateReportElement(el.id, { value: e.target.value })}
                className="text-sm"
                placeholder={t('reportDesigner.properties.imageUrlPlaceholder')}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label className="text-xs">{t('reportDesigner.properties.uploadFromFileMax2Mb')}</Label>
              <input
                id={`settings-image-upload-${el.id}`}
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={handleImageFileChange}
              />
              <Label
                htmlFor={`settings-image-upload-${el.id}`}
                className="flex cursor-pointer items-center justify-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-xs font-medium hover:bg-accent"
              >
                <Upload className="size-3.5" />
                {t('common.selectImage')}
              </Label>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    );
  }

  return null;
}

function DroppableSection({
  setNodeRef,
  isOver,
  children,
  className,
  style,
}: {
  setNodeRef: (node: HTMLDivElement | null) => void;
  isOver: boolean;
  children?: React.ReactNode;
  className: string;
  style?: React.CSSProperties;
}): ReactElement {

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`${className} ${isOver ? 'ring-2 ring-inset ring-blue-400' : ''}`}
    >
      {children}
    </div>
  );
}

export function A4Canvas({ canvasRef }: A4CanvasProps): ReactElement {
  const { t } = useTranslation(['report-designer', 'common']);
  const elements = useReportStore((s) => s.elements);
  const updateElementPosition = useReportStore((s) => s.updateElementPosition);
  const updateElementSize = useReportStore((s) => s.updateElementSize);
  const makeElementDragStop = (id: string): RndDragCallback => (_e, d) => {
    updateElementPosition(id, d.x, d.y);
  };

  const makeElementResizeStop = (id: string): RndResizeCallback => (_e, _direction, ref, _delta, position) => {
    updateElementSize(id, ref.offsetWidth, ref.offsetHeight, position.x, position.y);
  };
  const removeElement = useReportStore((s) => s.removeElement);
  const setSelectedElement = useReportStore((s) => s.setSelectedElement);

  const headerDroppable = useDroppable({ id: A4_HEADER_DROPPABLE_ID });
  const contentDroppable = useDroppable({ id: A4_CONTENT_DROPPABLE_ID });
  const footerDroppable = useDroppable({ id: A4_FOOTER_DROPPABLE_ID });

  const setPaperRef = (node: HTMLDivElement | null): void => {
    if (canvasRef) {
      (canvasRef as MutableRefObject<HTMLDivElement | null>).current = node;
    }
  };

  return (
    <div className="flex flex-1 items-start justify-center overflow-auto bg-slate-200/80 p-8">
      <div
        ref={setPaperRef}
        className="relative shrink-0 bg-white shadow-lg"
        style={{ width: A4_CANVAS_WIDTH, height: A4_CANVAS_HEIGHT }}
        onClick={() => setSelectedElement(null)}
        role="presentation"
      >
        <DroppableSection
          setNodeRef={headerDroppable.setNodeRef}
          isOver={headerDroppable.isOver ?? false}
          className="absolute left-0 top-0 z-0 flex items-center justify-center border-b border-slate-200 bg-slate-50/50 text-xs text-slate-400"
          style={{ width: A4_CANVAS_WIDTH, height: A4_HEADER_HEIGHT }}
        >
          {t('reportDesigner.sections.header')}
        </DroppableSection>
        <DroppableSection
          setNodeRef={contentDroppable.setNodeRef}
          isOver={contentDroppable.isOver ?? false}
          className="absolute left-0 z-0 flex items-center justify-center border-b border-slate-200 bg-white/50 text-xs text-slate-400"
          style={{ width: A4_CANVAS_WIDTH, height: A4_CONTENT_HEIGHT, top: A4_CONTENT_TOP }}
        >
          {t('reportDesigner.sections.content')}
        </DroppableSection>
        <DroppableSection
          setNodeRef={footerDroppable.setNodeRef}
          isOver={footerDroppable.isOver ?? false}
          className="absolute bottom-0 left-0 z-0 flex items-center justify-center border-t border-slate-200 bg-slate-50/50 text-xs text-slate-400"
          style={{ width: A4_CANVAS_WIDTH, height: A4_FOOTER_HEIGHT }}
        >
          {t('reportDesigner.sections.footer')}
        </DroppableSection>
        {elements.map((el) => (
          <Rnd
            key={el.id}
            position={{ x: el.x, y: el.y }}
            size={{ width: el.width, height: el.height }}
            onDragStop={makeElementDragStop(el.id)}
            onResizeStop={makeElementResizeStop(el.id)}
            bounds="parent"
            cancel="[data-delete-element], [data-text-edit], [data-image-upload], [data-element-settings]"
            dragHandleClassName="report-element-drag-handle"
            className="relative z-10 flex flex-col overflow-hidden border border-slate-300 bg-slate-50"
          >
            <div
              data-element-select
              className="absolute inset-0 z-0"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedElement(el.id);
              }}
              onMouseDown={(e) => e.stopPropagation()}
              role="presentation"
            />
            <div
              data-drag-handle
              className="report-element-drag-handle relative z-10 flex h-5 shrink-0 cursor-grab items-center justify-center border-b border-slate-200 bg-slate-100/80 active:cursor-grabbing"
              onClick={(e) => e.stopPropagation()}
              role="presentation"
            >
              <GripVertical className="size-3.5 text-slate-500" />
            </div>
            <ElementSettingsPopover element={el} />
            <button
              type="button"
              data-delete-element
              onClick={(e) => {
                e.stopPropagation();
                removeElement(el.id);
              }}
              className="absolute right-1 top-1 z-10 rounded p-1 text-slate-500 hover:bg-red-100 hover:text-red-600"
              title={t('reportDesigner.actions.remove')}
            >
              <Trash2 className="size-3.5" />
            </button>
            <div className="relative z-[1] min-h-0 flex-1 overflow-hidden">
              {isTableElement(el) ? (
                <TableElementBlock table={el} />
              ) : (
                <FieldElementBlock element={el} />
              )}
            </div>
          </Rnd>
        ))}
      </div>
    </div>
  );
}

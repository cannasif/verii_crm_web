import type { ReactElement } from 'react';
import { useEffect, useCallback, useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import quotationTotalsLayoutSpecJson from '../specs/quotation-totals-layout-spec.json';
import { type RndDragCallback, type RndResizeCallback, Rnd } from 'react-rnd';
import { GripVertical, Settings, Trash2, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { usePdfReportDesignerStore } from '../store/usePdfReportDesignerStore';
import type { FieldDefinitionDto } from '@/features/pdf-report';
import {
  isPdfTableElement,
  type PdfCanvasElement,
  type PdfReportElement,
  type PdfTableElement,
  type PdfReportSection,
  type PdfSummaryItem,
  type PdfVisibilityRule,
} from '../types/pdf-report-template.types';
import {
  FONT_FAMILIES,
  FONT_SIZES,
  A4_CANVAS_WIDTH,
  A4_CANVAS_HEIGHT,
  A4_HEADER_HEIGHT,
  A4_CONTENT_TOP,
  A4_CONTENT_HEIGHT,
  A4_FOOTER_TOP,
  A4_FOOTER_HEIGHT,
  SNAP_GRID_SIZE,
  KEYBOARD_MOVE_STEP,
  KEYBOARD_MOVE_STEP_SHIFT,
} from '../constants';
import { clampElementToSection } from '../utils/dto-to-canvas';
import { uploadPdfTemplateImage } from '../utils/upload-pdf-template-image';

const MAX_IMAGE_SIZE_BYTES = 2 * 1024 * 1024;

export const A4_HEADER_DROPPABLE_ID = 'a4-header';
export const A4_CONTENT_DROPPABLE_ID = 'a4-content';
export const A4_FOOTER_DROPPABLE_ID = 'a4-footer';
export const A4_PAGE_DROPPABLE_ID = 'a4-page';

export const SECTION_DROPPABLE_IDS = [
  A4_PAGE_DROPPABLE_ID,
  A4_HEADER_DROPPABLE_ID,
  A4_CONTENT_DROPPABLE_ID,
  A4_FOOTER_DROPPABLE_ID,
] as const;

export function getSectionFromDroppableId(id: string): PdfReportSection | null {
  switch (id) {
    case A4_PAGE_DROPPABLE_ID:
      return 'page';
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

function getCanvasTextStyle(element: PdfReportElement): React.CSSProperties {
  const style = element.style ?? {};
  return {
    fontSize: `${element.fontSize ?? DEFAULT_FONT_SIZE}px`,
    fontFamily: element.fontFamily ?? DEFAULT_FONT_FAMILY,
    color: element.color ?? undefined,
    fontWeight: style.fontWeight ?? undefined,
    lineHeight: style.lineHeight ?? undefined,
    letterSpacing:
      typeof style.letterSpacing === 'number' ? `${style.letterSpacing}px` : undefined,
    textAlign: style.textAlign ?? undefined,
  };
}

export const TABLE_DROPPABLE_PREFIX = 'table-drop-';
export const CONTAINER_DROPPABLE_PREFIX = 'container-drop-';

export function getTableDroppableId(tableId: string): string {
  return `${TABLE_DROPPABLE_PREFIX}${tableId}`;
}

export function parseTableIdFromDroppableId(droppableId: string): string | null {
  if (typeof droppableId !== 'string' || !droppableId.startsWith(TABLE_DROPPABLE_PREFIX))
    return null;
  return droppableId.slice(TABLE_DROPPABLE_PREFIX.length);
}

export function getContainerDroppableId(containerId: string): string {
  return `${CONTAINER_DROPPABLE_PREFIX}${containerId}`;
}

export function parseContainerIdFromDroppableId(droppableId: string): string | null {
  if (typeof droppableId !== 'string' || !droppableId.startsWith(CONTAINER_DROPPABLE_PREFIX))
    return null;
  return droppableId.slice(CONTAINER_DROPPABLE_PREFIX.length);
}

function snapToGrid(value: number, enabled: boolean): number {
  if (!enabled) return Math.round(value);
  return Math.round(value / SNAP_GRID_SIZE) * SNAP_GRID_SIZE;
}

export interface PdfA4CanvasProps {
  currentPage: number;
  pageCount: number;
  templateId?: number | null;
  fieldDefinitions?: FieldDefinitionDto[];
  onPageRef?: (page: number, el: HTMLDivElement | null) => void;
  onPageChange?: (page: number) => void;
}

function shouldRenderOnPage(element: PdfCanvasElement, currentPage: number): boolean {
  if (element.pageNumbers == null || element.pageNumbers.length === 0) return true;
  return element.pageNumbers.includes(currentPage);
}

function evaluateVisibilityRule(
  rule: PdfReportElement['visibilityRule'],
  sampleValue?: string,
): boolean {
  if (!rule?.fieldPath || !rule.operator) return true;
  const currentValue = sampleValue ?? '';
  if (rule.operator === 'isEmpty') return currentValue.trim().length === 0;
  if (rule.operator === 'isNotEmpty') return currentValue.trim().length > 0;
  if (rule.value == null) return true;
  if (rule.operator === 'equals') return currentValue === rule.value;
  if (rule.operator === 'notEquals') return currentValue !== rule.value;
  return true;
}

function evaluateVisibilityRules(
  rules: PdfVisibilityRule[] | undefined,
  logic: 'all' | 'any',
  getSampleValue: (fieldPath?: string) => string | undefined,
): boolean {
  const normalizedRules = (rules ?? []).filter((rule) => rule.fieldPath || rule.operator || rule.value);
  if (normalizedRules.length === 0) return true;
  const results = normalizedRules.map((rule) => evaluateVisibilityRule(rule, getSampleValue(rule.fieldPath)));
  return logic === 'any' ? results.some(Boolean) : results.every(Boolean);
}

interface ResolvedCanvasElement {
  element: PdfCanvasElement;
  absoluteX: number;
  absoluteY: number;
}

function getElementPadding(style: PdfReportElement['style']): number {
  const rawPadding = style?.padding;
  if (typeof rawPadding === 'number') return rawPadding;
  if (typeof rawPadding === 'string') {
    const parsed = Number.parseFloat(rawPadding);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function resolveCanvasElements(elements: PdfCanvasElement[], currentPage: number): ResolvedCanvasElement[] {
  const elementMap = new Map(elements.map((element) => [element.id, element]));
  const resolved = new Map<string, ResolvedCanvasElement>();
  const resolving = new Set<string>();

  const resolve = (element: PdfCanvasElement): ResolvedCanvasElement | null => {
    if (!shouldRenderOnPage(element, currentPage)) return null;
    const cached = resolved.get(element.id);
    if (cached) return cached;
    if (resolving.has(element.id)) {
      return { element, absoluteX: element.x, absoluteY: element.y };
    }

    resolving.add(element.id);
    let absoluteX = element.x;
    let absoluteY = element.y;

    if ('parentId' in element && element.parentId) {
      const parent = elementMap.get(element.parentId);
      if (parent) {
        const resolvedParent = resolve(parent);
        if (resolvedParent) {
          const parentPadding = !isPdfTableElement(parent) ? getElementPadding(parent.style) : 0;
          absoluteX += resolvedParent.absoluteX + parentPadding;
          absoluteY += resolvedParent.absoluteY + parentPadding;
        }
      }
    }

    const value = { element, absoluteX, absoluteY };
    resolving.delete(element.id);
    resolved.set(element.id, value);
    return value;
  };

  return elements
    .map((element) => resolve(element))
    .filter((element): element is ResolvedCanvasElement => element != null);
}

function formatSummaryValue(rawValue: string, format?: PdfSummaryItem['format']): string {
  if (!format || format === 'text') return rawValue;
  if ((format === 'number' || format === 'currency') && !Number.isNaN(Number(rawValue))) {
    const numericValue = Number(rawValue);
    return format === 'currency'
      ? new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(numericValue)
      : new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 0 }).format(numericValue);
  }
  if (format === 'date') {
    const date = new Date(rawValue);
    if (!Number.isNaN(date.getTime())) {
      return new Intl.DateTimeFormat('tr-TR').format(date);
    }
  }
  return rawValue;
}

function getQuotationTotalsPreviewRows(element: PdfReportElement): Array<{ label: string; value: string; emphasize?: boolean }> {
  const options = element.quotationTotalsOptions ?? {};
  const currencySuffix = options.currencyMode === 'code' ? ' USD' : '';
  const rows: Array<{ label: string; value: string; emphasize?: boolean }> = [];

  if (options.showGross !== false) {
    rows.push({ label: options.grossLabel || 'Brut Toplam', value: `12.500,00${currencySuffix}` });
  }
  if (options.showDiscount !== false) {
    rows.push({ label: options.discountLabel || 'Iskonto', value: `750,00${currencySuffix}` });
  }

  rows.push({ label: options.netLabel || 'Net Toplam', value: `11.750,00${currencySuffix}` });

  if (options.showVat !== false) {
    rows.push({ label: options.vatLabel || 'KDV', value: `2.115,00${currencySuffix}` });
  }

  rows.push({
    label: options.grandLabel || 'Genel Toplam',
    value: `13.865,00${currencySuffix}`,
    emphasize: options.emphasizeGrandTotal !== false,
  });

  return rows;
}

function normalizeImageSrc(value: string): string {
  if (value.startsWith('http') || value.startsWith('data:') || value.startsWith('/')) return value;
  return `/${value}`;
}

const quotationTotalsLayoutSpec = quotationTotalsLayoutSpecJson.quotationTotals;

const DEFAULT_FONT_SIZE = 14;
const DEFAULT_FONT_FAMILY = 'Arial';

function TableElementBlock({ table }: { table: PdfTableElement }): ReactElement {
  const { t } = useTranslation();
  const { setNodeRef, isOver } = useDroppable({
    id: getTableDroppableId(table.id),
  });
  const detailColumnPath = table.tableOptions?.detailColumnPath;
  const detailPaths = table.tableOptions?.detailPaths ?? [];
  const detailLineFontSize = table.tableOptions?.detailLineFontSize ?? 10;
  const detailLineColor = table.tableOptions?.detailLineColor ?? '#64748b';
  const showGroupFooter = table.tableOptions?.showGroupFooter === true;
  const groupHeaderLabel = table.tableOptions?.groupHeaderLabel ?? 'Group';
  const groupFooterLabel = table.tableOptions?.groupFooterLabel ?? 'Toplam';

  return (
    <div
      ref={setNodeRef}
      className={`flex h-full min-h-8 w-full flex-col overflow-hidden border border-slate-400 bg-white ${
        isOver ? 'ring-2 ring-inset ring-blue-400' : ''
      }`}
    >
      {table.columns.length === 0 ? (
        <span className="flex flex-1 items-center justify-center px-2 py-1 text-xs text-slate-500">
          {t('reportDesigner.tableDropHint')}
        </span>
      ) : (
        <>
          <div className="flex flex-row items-stretch border-b border-slate-300 bg-slate-100">
            {table.columns.map((col) => (
              <div
                key={col.path}
                className="flex min-w-16 items-center border-r border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 last:border-r-0"
                style={{
                  width: col.width != null ? `${col.width}px` : undefined,
                  flex: col.width != null ? '0 0 auto' : '1 1 0%',
                  justifyContent:
                    col.align === 'right'
                      ? 'flex-end'
                      : col.align === 'center'
                        ? 'center'
                        : 'flex-start',
                }}
              >
                {col.label}
              </div>
            ))}
          </div>
          <div className="border-b border-slate-200 bg-blue-50 px-2 py-1 text-[11px] font-semibold text-slate-600">
            {groupHeaderLabel}: PRJ-01
          </div>
          {[0, 1].map((rowIndex) => (
            <div
              key={`sample-row-${rowIndex}`}
              className={`flex flex-row items-stretch border-b border-slate-200 text-xs ${
                rowIndex % 2 === 0 ? 'bg-white' : 'bg-slate-50'
              }`}
            >
              {table.columns.map((col) => {
                const isDetailColumn = detailColumnPath != null && col.path === detailColumnPath;
                return (
                  <div
                    key={`${col.path}-${rowIndex}`}
                    className="flex min-w-16 border-r border-slate-200 px-2 py-2 last:border-r-0"
                    style={{
                      width: col.width != null ? `${col.width}px` : undefined,
                      flex: col.width != null ? '0 0 auto' : '1 1 0%',
                      justifyContent:
                        col.align === 'right'
                          ? 'flex-end'
                          : col.align === 'center'
                            ? 'center'
                            : 'flex-start',
                    }}
                  >
                    {col.format === 'image' ? (
                      <div className="flex h-10 w-10 items-center justify-center rounded border border-slate-200 bg-slate-100 text-[10px] text-slate-400">
                        IMG
                      </div>
                    ) : isDetailColumn ? (
                      <div className="flex w-full flex-col gap-1">
                        <div className="font-medium text-slate-700">{col.label} degeri</div>
                        {detailPaths.slice(0, 3).map((path) => (
                          <div key={path} style={{ fontSize: `${detailLineFontSize}px`, color: detailLineColor }}>
                            {path}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-slate-600">{col.label} degeri</div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
          {showGroupFooter ? (
            <div className="flex flex-row items-center justify-between border-t border-slate-300 bg-slate-100 px-3 py-2 text-[11px] font-semibold text-slate-700">
              <span>{groupFooterLabel}</span>
              <span>3.600,00</span>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}

function TextElementBlock({ element }: { element: PdfReportElement }): ReactElement | null {
  const { t } = useTranslation();
  const updateElementText = usePdfReportDesignerStore((s) => s.updateElementText);
  const setSelectedIds = usePdfReportDesignerStore((s) => s.setSelectedIds);
  if (element.type !== 'text') return null;

  return (
    <textarea
      key={element.id}
      data-text-edit
      value={element.text ?? ''}
      onChange={(e) => updateElementText(element.id, e.target.value)}
      onFocus={() => setSelectedIds([element.id])}
      className="relative z-10 h-full w-full resize-none border-0 bg-transparent p-2 text-slate-700 outline-none focus:ring-0"
      placeholder={t('reportDesigner.properties.textPlaceholder')}
      style={getCanvasTextStyle(element)}
    />
  );
}

function ImageElementBlock({
  element,
  templateId,
}: {
  element: PdfReportElement;
  templateId?: number | null;
}): ReactElement {
  const { t } = useTranslation();
  const updateReportElement = usePdfReportDesignerStore((s) => s.updateReportElement);
  const setSelectedIds = usePdfReportDesignerStore((s) => s.setSelectedIds);
  const imageValue = typeof element.value === 'string' ? element.value : '';
  const isUrl = imageValue.trim().length > 0;

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
        updateReportElement(element.id, { value: relativeUrl });
      })
      .catch((error: Error) => {
        toast.error(t('common.imageUploadFailed'), {
          description: error.message,
        });
      });
    e.target.value = '';
  };

  if (isUrl) {
    return (
      <div className="relative flex h-full w-full items-center justify-center overflow-hidden bg-slate-100">
        <img
          src={normalizeImageSrc(imageValue)}
          alt=""
          className="h-full w-full"
          style={{ objectFit: element.style?.imageFit ?? 'contain' }}
        />
        <div className="absolute inset-x-0 bottom-0 bg-slate-900/65 px-2 py-1 text-[10px] text-white">
          <span className="block truncate" title={imageValue}>
            {imageValue}
          </span>
        </div>
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
        id={`pdf-report-image-upload-${element.id}`}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={handleFileChange}
      />
      <label
        htmlFor={`pdf-report-image-upload-${element.id}`}
        className="flex cursor-pointer flex-col items-center justify-center gap-1 rounded border-2 border-dashed border-slate-300 bg-white px-3 py-4 text-center text-xs text-slate-600 transition-colors hover:border-slate-400 hover:bg-slate-50"
        onClick={() => setSelectedIds([element.id])}
      >
        <Upload className="size-6 text-slate-400" />
        <span>{t('common.selectImage')}</span>
        <span className="text-[10px] text-slate-400">{t('reportDesigner.properties.max2MbNote')}</span>
      </label>
    </div>
  );
}

function FieldElementBlock({
  element,
  templateId,
}: {
  element: PdfReportElement;
  templateId?: number | null;
}): ReactElement {
  if (element.type === 'shape') {
    const style = element.style ?? {};
    return (
      <div
        className="flex h-full w-full items-center justify-center text-[10px] uppercase tracking-[0.24em] text-slate-400"
        style={{
          background: style.background ?? '#ffffff',
          border: style.border ?? '1px solid #cbd5e1',
          borderRadius: style.radius != null ? `${style.radius}px` : '0px',
        }}
      >
        Shape
      </div>
    );
  }

  if (element.type === 'text') {
    return <TextElementBlock element={element} />;
  }
  if (element.type === 'image') {
    return <ImageElementBlock element={element} templateId={templateId} />;
  }
  if (element.type === 'note') {
    return (
      <div className="flex h-full w-full flex-col gap-2 overflow-hidden bg-white p-3 text-slate-700">
        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
          {element.text || 'NOTE'}
        </div>
        <div className="text-xs leading-5 text-slate-600">
          {element.value || element.path || 'Bagli not veya aciklama alani'}
        </div>
      </div>
    );
  }
  if (element.type === 'summary') {
    return (
      <div className="flex h-full w-full flex-col gap-2 overflow-hidden bg-white p-3 text-slate-700">
        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
          {element.text || 'SUMMARY'}
        </div>
        <div className="flex flex-col gap-1">
          {(element.summaryItems ?? []).map((item, index) => (
            <div key={`${item.label}-${index}`} className="flex items-center justify-between gap-2 text-xs">
              <span className="text-slate-500">{item.label}</span>
              <span className="font-medium text-slate-700">
                {formatSummaryValue(item.path || '0', item.format)}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  if (element.type === 'quotationTotals') {
    const rows = getQuotationTotalsPreviewRows(element);
    const options = element.quotationTotalsOptions ?? {};
    const noteText = options.noteText || (options.notePath ? '{{' + options.notePath + '}}' : '');
    const showNote = options.showNote === true && !(options.hideEmptyNote !== false && noteText.trim().length === 0);
    const leftRows = options.layout === 'two-column' ? rows.filter((_, index) => index % 2 === 0) : rows;
    const rightRows = options.layout === 'two-column' ? rows.filter((_, index) => index % 2 === 1) : [];
    const renderRows = (items: typeof rows) => (
      <div className="flex flex-col" style={{ gap: `${quotationTotalsLayoutSpec.rowGap}px` }}>
        {items.map((row, index) => (
          <div
            key={`${row.label}-${index}`}
            className={`flex items-center justify-between rounded border ${
              row.emphasize ? 'bg-slate-900 font-semibold text-white border-slate-900' : 'bg-white border-slate-200 text-slate-700'
            }`}
            style={{
              minHeight: `${quotationTotalsLayoutSpec.rowHeight}px`,
              paddingLeft: `${quotationTotalsLayoutSpec.rowPaddingX}px`,
              paddingRight: `${quotationTotalsLayoutSpec.rowPaddingX}px`,
              paddingTop: `${quotationTotalsLayoutSpec.rowPaddingTop}px`,
              paddingBottom: `${quotationTotalsLayoutSpec.rowPaddingBottom}px`,
            }}
          >
            <span
              style={{
                fontSize: `${quotationTotalsLayoutSpec.rowLabelFontSize}px`,
                color: row.emphasize ? quotationTotalsLayoutSpec.rowLabelEmphasisColor : quotationTotalsLayoutSpec.rowLabelColor,
              }}
            >
              {row.label}
            </span>
            <span
              className="font-semibold"
              style={{
                fontSize: `${quotationTotalsLayoutSpec.rowValueFontSize}px`,
                color: row.emphasize ? quotationTotalsLayoutSpec.rowValueEmphasisColor : quotationTotalsLayoutSpec.rowValueColor,
              }}
            >
              {row.value}
            </span>
          </div>
        ))}
      </div>
    );
    return (
      <div
        className="flex h-full w-full flex-col overflow-hidden bg-white text-slate-700"
        style={{
          paddingLeft: `${quotationTotalsLayoutSpec.outerPaddingX}px`,
          paddingRight: `${quotationTotalsLayoutSpec.outerPaddingX}px`,
          paddingTop: `${quotationTotalsLayoutSpec.outerPaddingTop}px`,
        }}
      >
        <div
          style={{
            fontSize: `${quotationTotalsLayoutSpec.titleFontSize}px`,
            fontWeight: 600,
            color: quotationTotalsLayoutSpec.titleColor,
            marginBottom: `${quotationTotalsLayoutSpec.titleBottomGap}px`,
          }}
        >
          {element.text || 'TEKLIF TOPLAMLARI'}
        </div>
        <div
          className={options.layout === 'two-column' ? 'grid grid-cols-2' : ''}
          style={options.layout === 'two-column' ? { columnGap: `${quotationTotalsLayoutSpec.columnGap}px` } : undefined}
        >
          {renderRows(leftRows)}
          {rightRows.length > 0 ? renderRows(rightRows) : null}
        </div>
        {showNote ? (
          <div
            className="border border-slate-200 bg-slate-50 text-slate-600"
            style={{
              marginTop: `${quotationTotalsLayoutSpec.noteTopGap}px`,
              paddingLeft: `${quotationTotalsLayoutSpec.notePaddingX}px`,
              paddingRight: `${quotationTotalsLayoutSpec.notePaddingX}px`,
              paddingTop: `${quotationTotalsLayoutSpec.notePaddingTop}px`,
              paddingBottom: `${quotationTotalsLayoutSpec.notePaddingBottom}px`,
            }}
          >
            <div
              style={{
                fontSize: `${quotationTotalsLayoutSpec.noteTitleFontSize}px`,
                fontWeight: 600,
                color: quotationTotalsLayoutSpec.titleColor,
              }}
            >
              {options.noteTitle || 'Not'}
            </div>
            <div
              style={{
                marginTop: '8px',
                fontSize: `${quotationTotalsLayoutSpec.noteTextFontSize}px`,
                lineHeight: String(quotationTotalsLayoutSpec.noteTextLineHeight),
                color: '#475569',
              }}
            >
              {noteText}
            </div>
          </div>
        ) : null}
      </div>
    );
  }
  return (
    <div
      className="flex h-full w-full select-none items-center justify-center text-slate-700"
      style={getCanvasTextStyle(element)}
      contentEditable={false}
      suppressContentEditableWarning
    >
      {element.type === 'field' && element.value ? element.value : element.type}
    </div>
  );
}

function ContainerElementBlock({ element }: { element: PdfReportElement }): ReactElement {
  const { setNodeRef, isOver } = useDroppable({
    id: getContainerDroppableId(element.id),
  });
  const style = element.style ?? {};

  return (
    <div
      ref={setNodeRef}
      className={`flex h-full w-full items-center justify-center text-[10px] uppercase tracking-[0.24em] text-slate-400 ${
        isOver ? 'ring-2 ring-inset ring-blue-400' : ''
      }`}
      style={{
        background: style.background ?? '#ffffff',
        border: style.border ?? '1px solid #cbd5e1',
        borderRadius: style.radius != null ? `${style.radius}px` : '0px',
      }}
    >
      Container
    </div>
  );
}

function TextSettingsPopover({
  element,
  commonFields,
}: {
  element: PdfReportElement;
  commonFields: React.ReactNode;
}): ReactElement {
  const { t } = useTranslation();
  const updateReportElement = usePdfReportDesignerStore((s) => s.updateReportElement);
  const [open, setOpen] = useState(false);
  const [localText, setLocalText] = useState(element.text ?? '');

  const syncTextToStore = useCallback(() => {
    const trimmed = localText.trim();
    if (trimmed !== (element.text ?? '')) {
      updateReportElement(element.id, { text: trimmed || undefined });
    }
  }, [element.id, element.text, localText, updateReportElement]);

  useEffect(() => {
    if (open) {
      setLocalText(element.text ?? '');
    }
  }, [open, element.id, element.text]);

  const handleOpenChange = useCallback(
    (next: boolean) => {
      if (!next) syncTextToStore();
      setOpen(next);
    },
    [syncTextToStore]
  );

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
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
      <PopoverContent
        className="w-64"
        align="end"
        side="bottom"
        onCloseAutoFocus={(e) => e.preventDefault()}
      >
        <div className="flex flex-col gap-3">
          <span className="text-xs font-medium text-slate-600">{t('reportDesigner.properties.textSettings')}</span>
          <div className="flex flex-col gap-2">
            <Label className="text-xs">{t('reportDesigner.properties.text')}</Label>
            <Textarea
              value={localText}
              onChange={(e) => setLocalText(e.target.value)}
              onBlur={syncTextToStore}
              className="min-h-24 resize-y text-sm"
              placeholder={t('reportDesigner.properties.textPlaceholder')}
              rows={4}
            />
          </div>
          {commonFields}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function ElementSettingsPopover({
  element,
  templateId,
}: {
  element: PdfCanvasElement;
  templateId?: number | null;
}): ReactElement | null {
  const { t } = useTranslation();
  const updateReportElement = usePdfReportDesignerStore((s) => s.updateReportElement);

  if (isPdfTableElement(element)) {
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

  const el = element as PdfReportElement;
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

  if (el.type === 'shape') {
    return null;
  }

  if (el.type === 'text') {
    return (
      <TextSettingsPopover element={el} commonFields={commonFields} />
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
      void uploadPdfTemplateImage(file, templateId ?? undefined)
        .then((relativeUrl) => {
          updateReportElement(el.id, { value: relativeUrl });
        })
        .catch((error: Error) => {
          toast.error(t('common.imageUploadFailed'), {
            description: error.message,
          });
        });
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
            {el.value ? (
              <div className="overflow-hidden rounded-md border border-slate-200 bg-slate-50">
                <div className="flex h-28 items-center justify-center bg-white">
                  <img
                    src={normalizeImageSrc(el.value)}
                    alt=""
                    className="h-full w-full object-contain"
                  />
                </div>
                <div className="border-t border-slate-200 px-2 py-1 text-[10px] text-slate-500">
                  <span className="block truncate" title={el.value}>
                    {el.value}
                  </span>
                </div>
              </div>
            ) : null}
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

export function PdfA4Canvas({ currentPage, pageCount, templateId, fieldDefinitions = [], onPageRef, onPageChange }: PdfA4CanvasProps): ReactElement {
  const { t } = useTranslation();
  const [previewVisibilityRules, setPreviewVisibilityRules] = useState(true);
  const getOrderedElements = usePdfReportDesignerStore((s) => s.getOrderedElements);
  const elements = getOrderedElements();
  const updateElementPosition = usePdfReportDesignerStore((s) => s.updateElementPosition);
  const updateElementSize = usePdfReportDesignerStore((s) => s.updateElementSize);
  const updateElementsPosition = usePdfReportDesignerStore((s) => s.updateElementsPosition);
  const getSelectedEditableIds = usePdfReportDesignerStore((s) => s.getSelectedEditableIds);
  const pushHistory = usePdfReportDesignerStore((s) => s.pushHistory);
  const selectedIds = usePdfReportDesignerStore((s) => s.selectedIds);
  const setSelectedIds = usePdfReportDesignerStore((s) => s.setSelectedIds);
  const removeElement = usePdfReportDesignerStore((s) => s.removeElement);
  const snapEnabled = usePdfReportDesignerStore((s) => s.snapEnabled);
  const flashingId = usePdfReportDesignerStore((s) => s.flashingId);
  const [deleteDialogElementId, setDeleteDialogElementId] = useState<string | null>(null);

  const makeElementDragStop = useCallback(
    (id: string): RndDragCallback =>
      (_e, d) => {
        const el = usePdfReportDesignerStore.getState().elementsById[id];
        if (!el) return;
        const parent = 'parentId' in el && el.parentId
          ? usePdfReportDesignerStore.getState().elementsById[el.parentId]
          : null;
        const parentPadding = parent && !isPdfTableElement(parent) ? getElementPadding(parent.style) : 0;
        const parentResolved = parent
          ? resolveCanvasElements(Object.values(usePdfReportDesignerStore.getState().elementsById), currentPage)
              .find((resolved) => resolved.element.id === parent.id)
          : null;
        const x = snapToGrid(d.x, snapEnabled);
        const y = snapToGrid(d.y, snapEnabled);
        const relativeX = parentResolved ? x - parentResolved.absoluteX - parentPadding : x;
        const relativeY = parentResolved ? y - parentResolved.absoluteY - parentPadding : y;
        const clamped = clampElementToSection(el.section, relativeX, relativeY, el.width, el.height);
        updateElementPosition(id, clamped.x, clamped.y);
        pushHistory();
      },
    [currentPage, snapEnabled, updateElementPosition, pushHistory]
  );

  const makeElementResizeStop = useCallback(
    (id: string): RndResizeCallback =>
      (_e, _direction, ref, _delta, position) => {
        const el = usePdfReportDesignerStore.getState().elementsById[id];
        if (!el) return;
        const parent = 'parentId' in el && el.parentId
          ? usePdfReportDesignerStore.getState().elementsById[el.parentId]
          : null;
        const parentPadding = parent && !isPdfTableElement(parent) ? getElementPadding(parent.style) : 0;
        const parentResolved = parent
          ? resolveCanvasElements(Object.values(usePdfReportDesignerStore.getState().elementsById), currentPage)
              .find((resolved) => resolved.element.id === parent.id)
          : null;
        const x = snapToGrid(position.x, snapEnabled);
        const y = snapToGrid(position.y, snapEnabled);
        const width = snapToGrid(ref.offsetWidth, snapEnabled);
        const height = snapToGrid(ref.offsetHeight, snapEnabled);
        const relativeX = parentResolved ? x - parentResolved.absoluteX - parentPadding : x;
        const relativeY = parentResolved ? y - parentResolved.absoluteY - parentPadding : y;
        const clamped = clampElementToSection(el.section, relativeX, relativeY, width, height);
        updateElementSize(id, clamped.width, clamped.height, clamped.x, clamped.y);
        pushHistory();
      },
    [currentPage, snapEnabled, updateElementSize, pushHistory]
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent): void => {
      const editableIds = getSelectedEditableIds();
      if (editableIds.length === 0) return;
      const step = e.shiftKey ? KEYBOARD_MOVE_STEP_SHIFT : KEYBOARD_MOVE_STEP;
      let dx = 0;
      let dy = 0;
      if (e.key === 'ArrowLeft') dx = -step;
      else if (e.key === 'ArrowRight') dx = step;
      else if (e.key === 'ArrowUp') dy = -step;
      else if (e.key === 'ArrowDown') dy = step;
      if (dx !== 0 || dy !== 0) {
        e.preventDefault();
        updateElementsPosition(editableIds, dx, dy);
        pushHistory();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [getSelectedEditableIds, updateElementsPosition, pushHistory]);

  const headerDroppable = useDroppable({ id: A4_HEADER_DROPPABLE_ID });
  const contentDroppable = useDroppable({ id: A4_CONTENT_DROPPABLE_ID });
  const footerDroppable = useDroppable({ id: A4_FOOTER_DROPPABLE_ID });
  const pageDroppable = useDroppable({ id: A4_PAGE_DROPPABLE_ID });

  return (
    <div className="flex min-h-0 flex-1 flex-col items-center gap-10 overflow-y-auto bg-slate-200/80 px-8 py-10">
      {Array.from({ length: pageCount }, (_, i) => i + 1).map((pageNum) => {
        const isActivePage = pageNum === currentPage;
        const resolvedForPage = resolveCanvasElements(elements, pageNum);

        return (
          <div key={pageNum} id={`pdf-canvas-page-${pageNum}`} className="flex flex-col items-center gap-2">
            <div className={`flex items-center gap-2 text-[11px] font-semibold uppercase tracking-widest ${isActivePage ? 'text-blue-500' : 'text-slate-400'}`}>
              <div className={`h-px w-8 ${isActivePage ? 'bg-blue-400' : 'bg-slate-300'}`} />
              {t('pdfReportDesigner.pageNumber', { page: pageNum })}
              {isActivePage && <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[10px] text-blue-600 dark:bg-blue-900/40 dark:text-blue-400">aktif</span>}
              <div className={`h-px w-8 ${isActivePage ? 'bg-blue-400' : 'bg-slate-300'}`} />
            </div>

            <div
              ref={(el) => onPageRef?.(pageNum, el)}
              className={`relative shrink-0 bg-white transition-all duration-200 ${
                isActivePage
                  ? 'shadow-xl ring-2 ring-blue-400 ring-offset-2'
                  : 'cursor-pointer shadow-md opacity-70 hover:opacity-90 hover:shadow-lg'
              }`}
              style={{ width: A4_CANVAS_WIDTH, height: A4_CANVAS_HEIGHT }}
              onClick={() => {
                setSelectedIds([]);
                if (!isActivePage) onPageChange?.(pageNum);
              }}
              role="presentation"
            >
              {isActivePage ? (
                <button
                  type="button"
                  className="absolute right-3 top-3 z-20 rounded-md border bg-white/90 px-2 py-1 text-[11px] font-medium text-slate-600 shadow-sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    setPreviewVisibilityRules((current) => !current);
                  }}
                >
                  {previewVisibilityRules
                    ? t('pdfReportDesigner.visibilityPreviewOn')
                    : t('pdfReportDesigner.visibilityPreviewOff')}
                </button>
              ) : null}
              {isActivePage && (
                <>
                  <DroppableSection
                    setNodeRef={pageDroppable.setNodeRef}
                    isOver={pageDroppable.isOver ?? false}
                    className="absolute left-0 top-0 z-0 border border-dashed border-slate-200 bg-transparent"
                    style={{ width: A4_CANVAS_WIDTH, height: A4_CANVAS_HEIGHT }}
                  />
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
                    style={{ width: A4_CANVAS_WIDTH, height: A4_FOOTER_HEIGHT, top: A4_FOOTER_TOP }}
                  >
                    {t('reportDesigner.sections.footer')}
                  </DroppableSection>
                </>
              )}

              {!isActivePage && (
                <>
                  <div className="absolute left-0 top-0 z-0 border-b border-slate-200 bg-slate-50/50" style={{ width: A4_CANVAS_WIDTH, height: A4_HEADER_HEIGHT }} />
                  <div className="absolute left-0 z-0 border-b border-slate-200 bg-white/50" style={{ width: A4_CANVAS_WIDTH, height: A4_CONTENT_HEIGHT, top: A4_CONTENT_TOP }} />
                  <div className="absolute bottom-0 left-0 z-0 border-t border-slate-200 bg-slate-50/50" style={{ width: A4_CANVAS_WIDTH, height: A4_FOOTER_HEIGHT, top: A4_FOOTER_TOP }} />
                </>
              )}

              {resolvedForPage
                .filter(({ element }) => {
                  if (element.hidden) return false;
                  if (!previewVisibilityRules || isPdfTableElement(element) || element.type === 'container') return true;
                  const rules = element.visibilityRules ?? (element.visibilityRule ? [element.visibilityRule] : []);
                  return evaluateVisibilityRules(
                    rules,
                    element.visibilityLogic ?? 'all',
                    (fieldPath) => fieldDefinitions.find((field) => field.path === fieldPath)?.exampleValue,
                  );
                })
                .map(({ element: el, absoluteX, absoluteY }) => {
                  const isFlashing = flashingId === el.id;
                  const isSelected = selectedIds.includes(el.id);

                  if (!isActivePage) {
                    return (
                      <div
                        key={el.id}
                        className={`absolute overflow-hidden border ${isSelected ? 'border-blue-400 ring-1 ring-blue-400' : 'border-slate-200'}`}
                        style={{
                          left: absoluteX,
                          top: absoluteY,
                          width: el.width,
                          height: el.height,
                          zIndex: 10,
                          opacity: el.style?.opacity ?? 1,
                          transform: el.rotation ? `rotate(${el.rotation}deg)` : undefined,
                          borderRadius: el.style?.radius != null ? `${el.style.radius}px` : undefined,
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedIds([el.id]);
                          onPageChange?.(pageNum);
                        }}
                        role="presentation"
                      >
                        <div className="pointer-events-none h-full w-full overflow-hidden">
                          {isPdfTableElement(el) ? (
                            <TableElementBlock table={el} />
                          ) : el.type === 'container' ? (
                            <ContainerElementBlock element={el} />
                          ) : (
                            <FieldElementBlock element={el as PdfReportElement} templateId={templateId} />
                          )}
                        </div>
                      </div>
                    );
                  }

                  return (
                    <Rnd
                      key={el.id}
                      position={{ x: absoluteX, y: absoluteY }}
                      size={{ width: el.width, height: el.height }}
                      onDragStop={makeElementDragStop(el.id)}
                      onResizeStop={makeElementResizeStop(el.id)}
                      bounds="parent"
                      disableDragging={el.locked ?? false}
                      enableResizing={!el.locked}
                      cancel="[data-delete-element], [data-text-edit], [data-image-upload], [data-element-settings]"
                      dragHandleClassName="pdf-element-drag-handle"
                      className={`relative z-10 flex flex-col overflow-hidden border bg-slate-50 transition-shadow ${
                        isFlashing
                          ? 'border-amber-400 ring-4 ring-amber-400 ring-offset-1 animate-pulse'
                          : isSelected
                          ? 'border-blue-500 ring-1 ring-blue-500'
                          : 'border-slate-300'
                      }`}
                      style={{
                        opacity: el.style?.opacity ?? 1,
                        transform: el.rotation ? `rotate(${el.rotation}deg)` : undefined,
                        borderRadius: el.style?.radius != null ? `${el.style.radius}px` : undefined,
                        background: el.type === 'shape' ? el.style?.background : undefined,
                      }}
                    >
                      <div
                        data-element-select
                        className="absolute inset-0 z-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedIds([el.id]);
                        }}
                        onMouseDown={(e) => e.stopPropagation()}
                        role="presentation"
                      />
                      <div
                        data-drag-handle
                        className="pdf-element-drag-handle relative z-10 flex h-5 shrink-0 cursor-grab items-center justify-center border-b border-slate-200 bg-slate-100/80 active:cursor-grabbing"
                        onClick={(e) => e.stopPropagation()}
                        role="presentation"
                      >
                        <GripVertical className="size-3.5 text-slate-500" />
                      </div>
                      <ElementSettingsPopover element={el} templateId={templateId} />
                      <button
                        type="button"
                        data-delete-element
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteDialogElementId(el.id);
                        }}
                        className="absolute right-1 top-1 z-10 rounded p-1 text-slate-500 hover:bg-red-100 hover:text-red-600"
                        title={t('reportDesigner.actions.remove')}
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                      <div className="relative z-1 min-h-0 flex-1 overflow-hidden">
                        {isPdfTableElement(el) ? (
                          <TableElementBlock table={el} />
                        ) : el.type === 'container' ? (
                          <ContainerElementBlock element={el} />
                        ) : (
                          <FieldElementBlock element={el} templateId={templateId} />
                        )}
                      </div>
                    </Rnd>
                  );
                })}
            </div>
          </div>
        );
      })}
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
    </div>
  );
}

import { useCallback, useRef, type ReactElement, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Type,
  Tag,
  Table as TableIcon,
  Image as ImageIcon,
  Square,
  LayoutGrid,
  StickyNote,
  Sigma,
  Receipt,
  Plus,
  Sparkles,
} from 'lucide-react';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import type { FieldDefinitionDto } from '@/features/pdf-report';
import { A4_HEADER_HEIGHT, A4_FOOTER_TOP, SNAP_GRID_SIZE } from '../constants';
import {
  resolveSectionFromY,
  type PdfCreatableElementType,
} from '../utils/create-pdf-element';

const MAX_FIELDS_IN_SUBMENU = 40;

export interface PdfCanvasContextAddPayload {
  type: PdfCreatableElementType;
  section: 'header' | 'content' | 'footer';
  x: number;
  y: number;
  field?: { label: string; path: string };
}

export interface PdfCanvasContextMenuProps {
  children: ReactNode;
  pageRef: React.RefObject<HTMLDivElement | null>;
  onAdd: (payload: PdfCanvasContextAddPayload) => void;
  onApplyPreset?: (preset: 'commercialStarter' | 'compactSummary' | 'lineFocused' | 'signatureReady') => void;
  headerFields?: FieldDefinitionDto[];
  lineFields?: FieldDefinitionDto[];
  allowTable?: boolean;
  allowPresets?: boolean;
}

export function PdfCanvasContextMenu({
  children,
  pageRef,
  onAdd,
  onApplyPreset,
  headerFields = [],
  lineFields = [],
  allowTable = true,
  allowPresets = false,
}: PdfCanvasContextMenuProps): ReactElement {
  const { t } = useTranslation(['report-designer', 'common']);
  const pointRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const handleContextMenu = useCallback(
    (e: React.MouseEvent<HTMLDivElement>): void => {
      const rect = pageRef.current?.getBoundingClientRect();
      if (!rect) return;
      const rawX = e.clientX - rect.left;
      const rawY = e.clientY - rect.top;
      pointRef.current = {
        x: Math.max(0, Math.round(rawX / SNAP_GRID_SIZE) * SNAP_GRID_SIZE),
        y: Math.max(0, Math.round(rawY / SNAP_GRID_SIZE) * SNAP_GRID_SIZE),
      };
    },
    [pageRef]
  );

  const dispatch = useCallback(
    (type: PdfCreatableElementType, field?: { label: string; path: string }): void => {
      const { x, y } = pointRef.current;
      const section = resolveSectionFromY(y, A4_HEADER_HEIGHT, A4_FOOTER_TOP);
      onAdd({ type, section, x, y, field });
    },
    [onAdd]
  );

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div onContextMenu={handleContextMenu} className="contents">
          {children}
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent className="w-64">
        <ContextMenuLabel className="flex items-center gap-1.5 text-[10.5px] uppercase tracking-wider">
          <Plus className="size-3" />
          {t('pdfReportDesigner.contextMenu.addElement', { defaultValue: 'Add element' })}
        </ContextMenuLabel>

        <ContextMenuItem onSelect={() => dispatch('text')} className="gap-2">
          <Type className="size-3.5 text-slate-500" />
          {t('pdfReportDesigner.elementTypes.text', { defaultValue: 'Text' })}
        </ContextMenuItem>

        {(headerFields.length > 0 || lineFields.length > 0) ? (
          <ContextMenuSub>
            <ContextMenuSubTrigger className="gap-2">
              <Tag className="size-3.5 text-slate-500" />
              {t('pdfReportDesigner.elementTypes.field', { defaultValue: 'Field' })}
            </ContextMenuSubTrigger>
            <ContextMenuSubContent className="max-h-80 w-64 overflow-y-auto">
              {headerFields.length > 0 ? (
                <>
                  <ContextMenuLabel className="text-[10px] uppercase tracking-wider">
                    {t('reportDesigner.palette.headerFields', {
                      defaultValue: 'Document fields',
                    })}
                  </ContextMenuLabel>
                  {headerFields.slice(0, MAX_FIELDS_IN_SUBMENU).map((f) => (
                    <ContextMenuItem
                      key={`h-${f.path}`}
                      onSelect={() => dispatch('field', { label: f.label, path: f.path })}
                      className="text-xs"
                    >
                      {f.label}
                    </ContextMenuItem>
                  ))}
                </>
              ) : null}
              {lineFields.length > 0 ? (
                <>
                  <ContextMenuSeparator />
                  <ContextMenuLabel className="text-[10px] uppercase tracking-wider">
                    {t('reportDesigner.palette.lineFields', {
                      defaultValue: 'Line fields',
                    })}
                  </ContextMenuLabel>
                  {lineFields.slice(0, MAX_FIELDS_IN_SUBMENU).map((f) => (
                    <ContextMenuItem
                      key={`l-${f.path}`}
                      onSelect={() => dispatch('field', { label: f.label, path: f.path })}
                      className="text-xs"
                    >
                      {f.label}
                    </ContextMenuItem>
                  ))}
                </>
              ) : null}
            </ContextMenuSubContent>
          </ContextMenuSub>
        ) : null}

        {allowTable ? (
          <ContextMenuItem onSelect={() => dispatch('table')} className="gap-2">
            <TableIcon className="size-3.5 text-slate-500" />
            {t('pdfReportDesigner.elementTypes.table', { defaultValue: 'Table' })}
          </ContextMenuItem>
        ) : null}

        <ContextMenuItem onSelect={() => dispatch('image')} className="gap-2">
          <ImageIcon className="size-3.5 text-slate-500" />
          {t('pdfReportDesigner.elementTypes.image', { defaultValue: 'Image' })}
        </ContextMenuItem>

        <ContextMenuSeparator />

        <ContextMenuSub>
          <ContextMenuSubTrigger className="gap-2">
            <LayoutGrid className="size-3.5 text-slate-500" />
            {t('pdfReportDesigner.contextMenu.moreBlocks', { defaultValue: 'More blocks' })}
          </ContextMenuSubTrigger>
          <ContextMenuSubContent className="w-56">
            <ContextMenuItem onSelect={() => dispatch('shape')} className="gap-2">
              <Square className="size-3.5 text-slate-500" />
              {t('pdfReportDesigner.elementTypes.shape', { defaultValue: 'Card / Shape' })}
            </ContextMenuItem>
            <ContextMenuItem onSelect={() => dispatch('container')} className="gap-2">
              <LayoutGrid className="size-3.5 text-slate-500" />
              {t('pdfReportDesigner.elementTypes.container', { defaultValue: 'Container' })}
            </ContextMenuItem>
            <ContextMenuItem onSelect={() => dispatch('note')} className="gap-2">
              <StickyNote className="size-3.5 text-slate-500" />
              {t('pdfReportDesigner.elementTypes.note', { defaultValue: 'Note block' })}
            </ContextMenuItem>
            <ContextMenuItem onSelect={() => dispatch('summary')} className="gap-2">
              <Sigma className="size-3.5 text-slate-500" />
              {t('pdfReportDesigner.elementTypes.summary', { defaultValue: 'Summary block' })}
            </ContextMenuItem>
            {allowTable ? (
              <ContextMenuItem onSelect={() => dispatch('quotationTotals')} className="gap-2">
                <Receipt className="size-3.5 text-slate-500" />
                {t('pdfReportDesigner.elementTypes.quotationTotals', {
                  defaultValue: 'Quotation totals',
                })}
              </ContextMenuItem>
            ) : null}
          </ContextMenuSubContent>
        </ContextMenuSub>

        {allowPresets && onApplyPreset ? (
          <>
            <ContextMenuSeparator />
            <ContextMenuSub>
              <ContextMenuSubTrigger className="gap-2">
                <Sparkles className="size-3.5 text-slate-500" />
                {t('pdfReportDesigner.contextMenu.applyPreset', {
                  defaultValue: 'Apply ready layout',
                })}
              </ContextMenuSubTrigger>
              <ContextMenuSubContent className="w-56">
                <ContextMenuItem onSelect={() => onApplyPreset('commercialStarter')}>
                  {t('pdfReportDesigner.presetGallery.commercialStarter', {
                    defaultValue: 'Commercial starter',
                  })}
                </ContextMenuItem>
                <ContextMenuItem onSelect={() => onApplyPreset('compactSummary')}>
                  {t('pdfReportDesigner.presetGallery.compactSummary', {
                    defaultValue: 'Compact summary',
                  })}
                </ContextMenuItem>
                <ContextMenuItem onSelect={() => onApplyPreset('lineFocused')}>
                  {t('pdfReportDesigner.presetGallery.lineFocused', {
                    defaultValue: 'Line focused',
                  })}
                </ContextMenuItem>
                <ContextMenuItem onSelect={() => onApplyPreset('signatureReady')}>
                  {t('pdfReportDesigner.presetGallery.signatureReady', {
                    defaultValue: 'Signature ready',
                  })}
                </ContextMenuItem>
              </ContextMenuSubContent>
            </ContextMenuSub>
          </>
        ) : null}
      </ContextMenuContent>
    </ContextMenu>
  );
}

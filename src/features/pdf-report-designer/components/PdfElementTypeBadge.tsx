import type { ReactElement } from 'react';
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
} from 'lucide-react';
import type { PdfCanvasElement } from '../types/pdf-report-template.types';

export type PdfElementTypeKey =
  | 'text'
  | 'field'
  | 'table'
  | 'image'
  | 'shape'
  | 'container'
  | 'note'
  | 'summary'
  | 'quotationTotals';

export function getPdfElementTypeKey(element: PdfCanvasElement): PdfElementTypeKey {
  return element.type as PdfElementTypeKey;
}

export function PdfElementTypeIcon({
  type,
  className,
}: {
  type: PdfElementTypeKey;
  className?: string;
}): ReactElement {
  const resolved = className ?? 'size-3.5';
  switch (type) {
    case 'text':
      return <Type className={resolved} />;
    case 'field':
      return <Tag className={resolved} />;
    case 'table':
      return <TableIcon className={resolved} />;
    case 'image':
      return <ImageIcon className={resolved} />;
    case 'shape':
      return <Square className={resolved} />;
    case 'container':
      return <LayoutGrid className={resolved} />;
    case 'note':
      return <StickyNote className={resolved} />;
    case 'summary':
      return <Sigma className={resolved} />;
    case 'quotationTotals':
      return <Receipt className={resolved} />;
    default:
      return <Tag className={resolved} />;
  }
}

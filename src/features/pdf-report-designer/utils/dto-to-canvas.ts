import type { ReportTemplateElementDto } from '@/features/pdf-report';
import type { PdfCanvasElement, PdfReportElement, PdfTableElement, PdfReportSection } from '../types/pdf-report-template.types';
import {
  A4_CANVAS_WIDTH,
  A4_CANVAS_HEIGHT,
  A4_HEADER_HEIGHT,
  A4_CONTENT_TOP,
  A4_CONTENT_HEIGHT,
  A4_FOOTER_TOP,
  A4_FOOTER_HEIGHT,
} from '../constants';

function toSection(s: string): PdfReportSection {
  if (s === 'header' || s === 'content' || s === 'footer') return s;
  return 'content';
}

function clampYToSection(section: PdfReportSection, y: number, elementHeight: number): number {
  const safeH = Math.max(0, elementHeight);
  switch (section) {
    case 'header':
      return Math.max(0, Math.min(y, A4_HEADER_HEIGHT - safeH));
    case 'content':
      return Math.max(A4_CONTENT_TOP, Math.min(y, A4_CONTENT_TOP + A4_CONTENT_HEIGHT - safeH));
    case 'footer':
      return Math.max(A4_FOOTER_TOP, Math.min(y, A4_CANVAS_HEIGHT - safeH));
    default:
      return Math.max(0, Math.min(y, A4_CANVAS_HEIGHT - safeH));
  }
}

function clampX(x: number, width: number): number {
  return Math.max(0, Math.min(x, A4_CANVAS_WIDTH - Math.max(0, width)));
}

export function clampElementToSection(
  section: PdfReportSection,
  x: number,
  y: number,
  width: number,
  height: number
): { x: number; y: number; width: number; height: number } {
  const w = Math.max(0, width);
  const h = Math.max(0, height);
  const cx = clampX(x, w);
  const cy = clampYToSection(section, y, h);
  const maxW = A4_CANVAS_WIDTH;
  let maxH = A4_CANVAS_HEIGHT;
  switch (section) {
    case 'header':
      maxH = A4_HEADER_HEIGHT;
      break;
    case 'content':
      maxH = A4_CONTENT_HEIGHT;
      break;
    case 'footer':
      maxH = A4_FOOTER_HEIGHT;
      break;
    default:
      break;
  }
  const clampedW = Math.min(w, maxW);
  const clampedH = Math.min(h, maxH);
  const finalY = clampYToSection(section, cy, clampedH);
  return { x: cx, y: finalY, width: clampedW, height: clampedH };
}

export function dtoToPdfCanvasElements(dtoElements: ReportTemplateElementDto[]): PdfCanvasElement[] {
  return dtoElements.map((dto): PdfCanvasElement => {
    const section = toSection(dto.section);
    const w = typeof dto.width === 'number' ? dto.width : 200;
    const h = typeof dto.height === 'number' ? dto.height : 30;
    const x = clampX(dto.x, w);
    const y = clampYToSection(section, dto.y, h);
    const base = {
      id: dto.id,
      section,
      x,
      y,
      width: w,
      height: h,
      zIndex: dto.zIndex,
      rotation: dto.rotation,
      locked: dto.locked,
      hidden: dto.hidden,
      style: dto.style,
      value: dto.value,
      text: dto.text,
      path: dto.path,
      fontSize: dto.fontSize,
      fontFamily: dto.fontFamily,
      color: dto.color,
    };
    if (dto.type === 'table' && Array.isArray(dto.columns)) {
      const table: PdfTableElement = {
        ...base,
        type: 'table',
        columns: dto.columns.map((c) => ({ label: c.label, path: c.path })),
      };
      return table;
    }
    const type = dto.type === 'text' || dto.type === 'field' || dto.type === 'image' ? dto.type : 'text';
    const el: PdfReportElement = { ...base, type };
    return el;
  });
}

export function pdfCanvasElementsToDto(elements: PdfCanvasElement[]): ReportTemplateElementDto[] {
  return elements.map((el) => {
    const base = {
      id: el.id,
      type: el.type,
      section: el.section,
      x: el.x,
      y: el.y,
      width: el.width,
      height: el.height,
      zIndex: el.zIndex,
      rotation: el.rotation,
      locked: el.locked,
      hidden: el.hidden,
      style: el.style,
      value: el.value,
      text: el.text,
      path: el.path,
      fontSize: el.fontSize,
      fontFamily: el.fontFamily,
      color: el.color,
    };
    if (el.type === 'table') {
      return { ...base, columns: el.columns };
    }
    return base;
  });
}

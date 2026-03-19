import type { PdfCanvasElement, PdfElementStyle, PdfReportSection } from '../types/pdf-report-template.types';
import { A4_CANVAS_HEIGHT, A4_CANVAS_WIDTH } from '../constants';

type CreateId = () => string;

function image(
  createId: CreateId,
  pageNumber: number,
  section: PdfReportSection,
  x: number,
  y: number,
  width: number,
  height: number,
  style?: PdfElementStyle
): PdfCanvasElement {
  return {
    id: createId(),
    type: 'image',
    section,
    x,
    y,
    width,
    height,
    locked: false,
    pageNumbers: [pageNumber],
    style,
  };
}

function text(
  createId: CreateId,
  pageNumber: number,
  section: PdfReportSection,
  x: number,
  y: number,
  width: number,
  height: number,
  value: string,
  fontSize: number,
  color: string,
  style?: PdfElementStyle
): PdfCanvasElement {
  return {
    id: createId(),
    type: 'text',
    section,
    x,
    y,
    width,
    height,
    text: value,
    fontSize,
    color,
    fontFamily: 'Outfit',
    pageNumbers: [pageNumber],
    style,
  };
}

function shape(
  createId: CreateId,
  pageNumber: number,
  section: PdfReportSection,
  x: number,
  y: number,
  width: number,
  height: number,
  style: PdfElementStyle
): PdfCanvasElement {
  return {
    id: createId(),
    type: 'shape',
    section,
    x,
    y,
    width,
    height,
    pageNumbers: [pageNumber],
    style,
  };
}

export function createWindoVisualBrochureStarter(createId: CreateId): PdfCanvasElement[] {
  return [
    image(createId, 1, 'page', 0, 0, A4_CANVAS_WIDTH, A4_CANVAS_HEIGHT, {
      imageFit: 'cover',
    }),

    image(createId, 2, 'page', 0, 0, A4_CANVAS_WIDTH, A4_CANVAS_HEIGHT, {
      imageFit: 'cover',
    }),

    shape(createId, 2, 'page', 36, 46, 280, 110, {
      background: 'rgba(255,255,255,0.75)',
      radius: 18,
      padding: 16,
      border: '1px solid rgba(226,232,240,0.9)',
    }),
    text(createId, 2, 'page', 64, 78, 220, 38, 'WINDOFORM', 28, '#1e4d9b', {
      fontWeight: 700,
      letterSpacing: 0.4,
    }),
    text(createId, 2, 'page', 64, 112, 220, 24, 'DOOR AND WINDOW ACCESSORIES', 11, '#475569', {
      fontWeight: 500,
      letterSpacing: 1.1,
    }),

    image(createId, 3, 'page', 0, 0, A4_CANVAS_WIDTH, A4_CANVAS_HEIGHT, {
      imageFit: 'cover',
    }),
    shape(createId, 3, 'page', 30, 32, 228, 72, {
      background: 'rgba(255,255,255,0.84)',
      radius: 999,
      border: '1px solid rgba(226,232,240,0.95)',
    }),
    text(createId, 3, 'page', 62, 50, 172, 24, 'Takip zaman cizelgesi', 16, '#0f3f6d', {
      fontWeight: 700,
      lineHeight: 1.1,
    }),
  ];
}

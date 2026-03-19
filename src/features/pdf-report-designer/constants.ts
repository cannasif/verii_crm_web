export const FONT_SIZES = [10, 12, 14, 16, 18, 20, 24, 28, 32];

export const A4_MM_WIDTH = 210;
export const A4_MM_HEIGHT = 297;
export const A4_CANVAS_WIDTH = 794;
export const A4_CANVAS_HEIGHT = 1123;
export const A4_HEADER_HEIGHT = Math.round(A4_CANVAS_HEIGHT * 0.15);
export const A4_FOOTER_HEIGHT = Math.round(A4_CANVAS_HEIGHT * 0.15);
export const A4_CONTENT_TOP = A4_HEADER_HEIGHT;
export const A4_CONTENT_HEIGHT = A4_CANVAS_HEIGHT - A4_HEADER_HEIGHT - A4_FOOTER_HEIGHT;
export const A4_FOOTER_TOP = A4_CANVAS_HEIGHT - A4_FOOTER_HEIGHT;

export const FONT_FAMILIES = [
  { value: 'Arial', label: 'Arial' },
  { value: 'Inter', label: 'Inter' },
  { value: 'Times New Roman', label: 'Times New Roman' },
  { value: 'Georgia', label: 'Georgia' },
  { value: 'Verdana', label: 'Verdana' },
  { value: 'Outfit', label: 'Outfit' },
];

export const SNAP_GRID_SIZE = 8;
export const KEYBOARD_MOVE_STEP = 1;
export const KEYBOARD_MOVE_STEP_SHIFT = 10;

export const PDF_REPORT_DRAFT_STORAGE_KEY = 'pdf-report-designer-draft';

const MM_TO_CANVAS_X_RATIO = A4_CANVAS_WIDTH / A4_MM_WIDTH;
const MM_TO_CANVAS_Y_RATIO = A4_CANVAS_HEIGHT / A4_MM_HEIGHT;

export function mmToCanvasX(value: number): number {
  return value * MM_TO_CANVAS_X_RATIO;
}

export function mmToCanvasY(value: number): number {
  return value * MM_TO_CANVAS_Y_RATIO;
}

export function canvasToMmX(value: number): number {
  return value / MM_TO_CANVAS_X_RATIO;
}

export function canvasToMmY(value: number): number {
  return value / MM_TO_CANVAS_Y_RATIO;
}

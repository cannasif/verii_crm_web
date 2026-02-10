import { create } from 'zustand';
import type { PdfCanvasElement, PdfReportElement, PdfTableColumn, PdfTableElement } from '../types/pdf-report-template.types';

const MAX_HISTORY = 50;

interface PdfReportDesignerState {
  elementsById: Record<string, PdfCanvasElement>;
  elementOrder: string[];
  selectedIds: string[];
  history: { elementsById: Record<string, PdfCanvasElement>; elementOrder: string[] }[];
  historyIndex: number;
  setElements: (elements: PdfCanvasElement[]) => void;
  addElement: (element: PdfReportElement | PdfTableElement) => void;
  removeElement: (id: string) => void;
  updateElement: (id: string, patch: Partial<PdfCanvasElement>) => void;
  updateElementPosition: (id: string, x: number, y: number) => void;
  updateElementSize: (id: string, width: number, height: number, x: number, y: number) => void;
  updateElementsPosition: (ids: string[], dx: number, dy: number) => void;
  updateElementsSize: (ids: string[], dWidth: number, dHeight: number) => void;
  getSelectedEditableIds: () => string[];
  updateElementText: (id: string, text: string) => void;
  updateReportElement: (
    id: string,
    updates: Partial<Pick<PdfReportElement, 'text' | 'value' | 'path' | 'fontSize' | 'fontFamily' | 'color' | 'style'>>
  ) => void;
  addColumnToTable: (tableId: string, column: PdfTableColumn) => void;
  setSelectedIds: (ids: string[]) => void;
  toggleSelection: (id: string) => void;
  reorderElements: (fromIndex: number, toIndex: number) => void;
  setElementLocked: (id: string, locked: boolean) => void;
  setElementHidden: (id: string, hidden: boolean) => void;
  bringForward: (id: string) => void;
  sendBackward: (id: string) => void;
  undo: () => void;
  redo: () => void;
  pushHistory: () => void;
  getOrderedElements: () => PdfCanvasElement[];
  snapEnabled: boolean;
  setSnapEnabled: (enabled: boolean) => void;
}

function snapshot(
  elementsById: Record<string, PdfCanvasElement>,
  elementOrder: string[]
): { elementsById: Record<string, PdfCanvasElement>; elementOrder: string[] } {
  return {
    elementsById: JSON.parse(JSON.stringify(elementsById)),
    elementOrder: [...elementOrder],
  };
}

export const usePdfReportDesignerStore = create<PdfReportDesignerState>((set, get) => ({
  elementsById: {},
  elementOrder: [],
  selectedIds: [],
  history: [],
  historyIndex: -1,
  snapEnabled: true,
  setSnapEnabled: (enabled) => set({ snapEnabled: enabled }),

  setElements: (elements) => {
    const byId: Record<string, PdfCanvasElement> = {};
    const order: string[] = [];
    elements.forEach((el) => {
      byId[el.id] = el;
      order.push(el.id);
    });
    set({
      elementsById: byId,
      elementOrder: order,
      selectedIds: [],
      history: [snapshot(byId, order)],
      historyIndex: 0,
    });
  },

  addElement: (element) => {
    set((s) => {
      const byId = { ...s.elementsById, [element.id]: element };
      const order = [...s.elementOrder, element.id];
      return {
        elementsById: byId,
        elementOrder: order,
        selectedIds: [element.id],
      };
    });
    get().pushHistory();
  },

  removeElement: (id) => {
    set((s) => ({
      elementsById: (() => {
        const next = { ...s.elementsById };
        delete next[id];
        return next;
      })(),
      elementOrder: s.elementOrder.filter((i) => i !== id),
      selectedIds: s.selectedIds.filter((i) => i !== id),
    }));
    get().pushHistory();
  },

  updateElement: (id, patch) => {
    set((s) => {
      const el = s.elementsById[id];
      if (!el) return s;
      const next = { ...el, ...patch };
      return { elementsById: { ...s.elementsById, [id]: next as PdfCanvasElement } };
    });
  },

  updateElementPosition: (id, x, y) => {
    set((s) => {
      const el = s.elementsById[id];
      if (!el) return s;
      return {
        elementsById: {
          ...s.elementsById,
          [id]: { ...el, x, y } as PdfCanvasElement,
        },
      };
    });
  },

  updateElementSize: (id, width, height, x, y) => {
    set((s) => {
      const el = s.elementsById[id];
      if (!el) return s;
      return {
        elementsById: {
          ...s.elementsById,
          [id]: { ...el, width, height, x, y } as PdfCanvasElement,
        },
      };
    });
  },

  updateElementsPosition: (ids, dx, dy) => {
    if (ids.length === 0) return;
    set((s) => {
      const next = { ...s.elementsById };
      for (const id of ids) {
        const el = next[id];
        if (!el || el.locked || el.hidden) continue;
        next[id] = { ...el, x: el.x + dx, y: el.y + dy } as PdfCanvasElement;
      }
      return { elementsById: next };
    });
  },

  updateElementsSize: (ids, dWidth, dHeight) => {
    if (ids.length === 0) return;
    set((s) => {
      const next = { ...s.elementsById };
      for (const id of ids) {
        const el = next[id];
        if (!el || el.locked || el.hidden) continue;
        next[id] = {
          ...el,
          width: Math.max(8, el.width + dWidth),
          height: Math.max(8, el.height + dHeight),
        } as PdfCanvasElement;
      }
      return { elementsById: next };
    });
  },

  getSelectedEditableIds: () => {
    const { selectedIds, elementsById } = get();
    return selectedIds.filter((id) => {
      const el = elementsById[id];
      return el && !el.locked && !el.hidden;
    });
  },

  updateElementText: (id, text) => {
    set((s) => {
      const el = s.elementsById[id];
      if (!el || el.type === 'table') return s;
      return {
        elementsById: {
          ...s.elementsById,
          [id]: { ...el, text } as PdfCanvasElement,
        },
      };
    });
  },

  updateReportElement: (id, updates) => {
    set((s) => {
      const el = s.elementsById[id];
      if (!el || el.type === 'table') return s;
      return {
        elementsById: {
          ...s.elementsById,
          [id]: { ...el, ...updates } as PdfCanvasElement,
        },
      };
    });
  },

  addColumnToTable: (tableId, column) => {
    set((s) => {
      const el = s.elementsById[tableId];
      if (!el || el.type !== 'table') return s;
      if (el.columns.some((c) => c.path === column.path)) return s;
      return {
        elementsById: {
          ...s.elementsById,
          [tableId]: { ...el, columns: [...el.columns, column] } as PdfCanvasElement,
        },
      };
    });
    get().pushHistory();
  },

  setSelectedIds: (ids) => set({ selectedIds: ids }),

  toggleSelection: (id) => {
    set((s) => {
      const has = s.selectedIds.includes(id);
      const next = has ? s.selectedIds.filter((i) => i !== id) : [...s.selectedIds, id];
      return { selectedIds: next };
    });
  },

  reorderElements: (fromIndex, toIndex) => {
    set((s) => {
      const order = [...s.elementOrder];
      const [removed] = order.splice(fromIndex, 1);
      order.splice(toIndex, 0, removed);
      return { elementOrder: order };
    });
    get().pushHistory();
  },

  setElementLocked: (id, locked) => {
    get().updateElement(id, { locked });
  },

  setElementHidden: (id, hidden) => {
    get().updateElement(id, { hidden });
  },

  bringForward: (id) => {
    const { elementOrder } = get();
    const i = elementOrder.indexOf(id);
    if (i < 0 || i >= elementOrder.length - 1) return;
    get().reorderElements(i, i + 1);
  },

  sendBackward: (id) => {
    const { elementOrder } = get();
    const i = elementOrder.indexOf(id);
    if (i <= 0) return;
    get().reorderElements(i, i - 1);
  },

  undo: () => {
    const { history, historyIndex } = get();
    if (historyIndex <= 0) return;
    const next = historyIndex - 1;
    const snap = history[next];
    set({
      elementsById: snap.elementsById,
      elementOrder: snap.elementOrder,
      historyIndex: next,
    });
  },

  redo: () => {
    const { history, historyIndex } = get();
    if (historyIndex >= history.length - 1) return;
    const next = historyIndex + 1;
    const snap = history[next];
    set({
      elementsById: snap.elementsById,
      elementOrder: snap.elementOrder,
      historyIndex: next,
    });
  },

  pushHistory: () => {
    const { elementsById, elementOrder, history, historyIndex } = get();
    const newSnap = snapshot(elementsById, elementOrder);
    const trimmed = history.slice(0, historyIndex + 1);
    const next = [...trimmed, newSnap].slice(-MAX_HISTORY);
    set({
      history: next,
      historyIndex: next.length - 1,
    });
  },

  getOrderedElements: () => {
    const { elementsById, elementOrder } = get();
    return elementOrder
      .map((id) => elementsById[id])
      .filter((el): el is PdfCanvasElement => el != null);
  },
}));

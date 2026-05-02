import type { MyReportDashboardItem, MyReportDashboardLayout } from '../types';
import { clampGridSpan } from './grid-occupancy';

const STORAGE_PREFIX = 'report-builder:my-dashboard-layout';
export const DASHBOARD_CANVAS_WIDTH = 1200;
export const DASHBOARD_ITEM_MIN_WIDTH = 280;
export const DASHBOARD_ITEM_MIN_HEIGHT = 180;
export const DASHBOARD_ITEM_DEFAULT_WIDTH = 360;
export const DASHBOARD_ITEM_DEFAULT_HEIGHT = 240;
export const DASHBOARD_GRID_SIZE = 12;

const DEFAULT_MAX_COLS = 3;
const DEFAULT_MAX_ROWS = 2;
const ABS_MAX_COLS = 6;
const ABS_MAX_ROWS = 4;

function getStorageKey(userId: number | undefined): string {
  return `${STORAGE_PREFIX}:user-${userId ?? 'anonymous'}`;
}

function isDashboardItem(value: unknown): value is MyReportDashboardItem {
  if (typeof value !== 'object' || value == null) return false;
  const item = value as Record<string, unknown>;
  return Number.isFinite(Number(item.reportId))
    && (item.widgetId == null || typeof item.widgetId === 'string')
    && (item.widgetTitle == null || typeof item.widgetTitle === 'string')
    && Number.isFinite(Number(item.x))
    && Number.isFinite(Number(item.y))
    && Number.isFinite(Number(item.w))
    && Number.isFinite(Number(item.h))
    && Number.isFinite(Number(item.order));
}

function normalizeItem(item: MyReportDashboardItem): MyReportDashboardItem {
  const maxX = Math.max(0, DASHBOARD_CANVAS_WIDTH - DASHBOARD_ITEM_MIN_WIDTH);
  const colSpan = clampGridSpan(Math.round(Number(item.colSpan) || 1), 1, ABS_MAX_COLS);
  const rowSpan = clampGridSpan(Math.round(Number(item.rowSpan) || 1), 1, ABS_MAX_ROWS);
  return {
    reportId: item.reportId,
    widgetId: item.widgetId?.trim() || undefined,
    widgetTitle: item.widgetTitle?.trim() || undefined,
    colSpan,
    rowSpan,
    x: Math.max(0, Math.min(maxX, Math.round(item.x))),
    y: Math.max(0, Math.round(item.y)),
    w: Math.max(DASHBOARD_ITEM_MIN_WIDTH, Math.round(item.w)),
    h: Math.max(DASHBOARD_ITEM_MIN_HEIGHT, Math.round(item.h)),
    order: Math.max(0, Math.round(item.order)),
    hidden: Boolean(item.hidden),
    hideChrome: Boolean(item.hideChrome),
  };
}

function migrateLayoutFromV1(
  items: MyReportDashboardItem[],
  rawMaxCols: unknown,
  rawMaxRows: unknown,
): MyReportDashboardLayout {
  const maxCols = clampGridSpan(Math.round(Number(rawMaxCols) || DEFAULT_MAX_COLS), 1, ABS_MAX_COLS);
  const maxRows = clampGridSpan(Math.round(Number(rawMaxRows) || DEFAULT_MAX_ROWS), 1, ABS_MAX_ROWS);
  const normalizedItems = items
    .map((item) => normalizeItem({
      ...item,
      colSpan: item.colSpan ?? 1,
      rowSpan: item.rowSpan ?? 1,
    }))
    .map((item, index) => ({
      ...item,
      colSpan: clampGridSpan(item.colSpan, 1, maxCols),
      rowSpan: clampGridSpan(item.rowSpan, 1, maxRows),
      order: index,
    }));
  return {
    version: 2,
    maxCols,
    maxRows,
    updatedAt: new Date().toISOString(),
    items: normalizedItems,
  };
}

export function loadMyDashboardLayout(userId: number | undefined): MyReportDashboardLayout {
  if (typeof window === 'undefined') {
    return {
      version: 2,
      maxCols: DEFAULT_MAX_COLS,
      maxRows: DEFAULT_MAX_ROWS,
      updatedAt: new Date().toISOString(),
      items: [],
    };
  }

  try {
    const raw = window.localStorage.getItem(getStorageKey(userId));
    if (!raw) {
      return {
        version: 2,
        maxCols: DEFAULT_MAX_COLS,
        maxRows: DEFAULT_MAX_ROWS,
        updatedAt: new Date().toISOString(),
        items: [],
      };
    }

    const parsed = JSON.parse(raw) as {
      version?: number;
      maxCols?: number;
      maxRows?: number;
      updatedAt?: string;
      items?: unknown[];
    };
    const items = Array.isArray(parsed.items)
      ? parsed.items.filter(isDashboardItem).map((row) => row as MyReportDashboardItem)
      : [];

    if (parsed.version !== 2) {
      return migrateLayoutFromV1(items, parsed.maxCols, parsed.maxRows);
    }

    const maxCols = clampGridSpan(Math.round(Number(parsed.maxCols) || DEFAULT_MAX_COLS), 1, ABS_MAX_COLS);
    const maxRows = clampGridSpan(Math.round(Number(parsed.maxRows) || DEFAULT_MAX_ROWS), 1, ABS_MAX_ROWS);
    const normalizedItems = items
      .map((item) => normalizeItem({
        ...item,
        colSpan: item.colSpan ?? 1,
        rowSpan: item.rowSpan ?? 1,
      }))
      .map((item) => ({
        ...item,
        colSpan: clampGridSpan(item.colSpan, 1, maxCols),
        rowSpan: clampGridSpan(item.rowSpan, 1, maxRows),
      }))
      .sort((a, b) => a.order - b.order)
      .map((item, index) => ({ ...item, order: index }));

    return {
      version: 2,
      maxCols,
      maxRows,
      updatedAt: typeof parsed.updatedAt === 'string' ? parsed.updatedAt : new Date().toISOString(),
      items: normalizedItems,
    };
  } catch {
    return {
      version: 2,
      maxCols: DEFAULT_MAX_COLS,
      maxRows: DEFAULT_MAX_ROWS,
      updatedAt: new Date().toISOString(),
      items: [],
    };
  }
}

export function saveMyDashboardLayout(userId: number | undefined, layout: MyReportDashboardLayout): void {
  if (typeof window === 'undefined') return;
  const maxCols = clampGridSpan(layout.maxCols, 1, ABS_MAX_COLS);
  const maxRows = clampGridSpan(layout.maxRows, 1, ABS_MAX_ROWS);
  window.localStorage.setItem(
    getStorageKey(userId),
    JSON.stringify({
      version: 2,
      maxCols,
      maxRows,
      updatedAt: new Date().toISOString(),
      items: layout.items.map((item) => normalizeItem({
        ...item,
        colSpan: clampGridSpan(item.colSpan, 1, maxCols),
        rowSpan: clampGridSpan(item.rowSpan, 1, maxRows),
      })).sort((a, b) => a.order - b.order),
    }),
  );
}

export function sanitizeMyDashboardLayout(
  layout: MyReportDashboardLayout,
  allowedReportIds: number[],
): MyReportDashboardLayout {
  const allowed = new Set(allowedReportIds);
  const deduped = new Set<string>();
  const maxCols = clampGridSpan(layout.maxCols ?? DEFAULT_MAX_COLS, 1, ABS_MAX_COLS);
  const maxRows = clampGridSpan(layout.maxRows ?? DEFAULT_MAX_ROWS, 1, ABS_MAX_ROWS);
  const items = layout.items
    .filter((item) => allowed.has(item.reportId))
    .filter((item) => {
      const key = `${item.reportId}:${item.widgetId ?? '__report__'}`;
      if (deduped.has(key)) return false;
      deduped.add(key);
      return true;
    })
    .map((item) => normalizeItem({
      ...item,
      colSpan: clampGridSpan(item.colSpan ?? 1, 1, maxCols),
      rowSpan: clampGridSpan(item.rowSpan ?? 1, 1, maxRows),
    }))
    .sort((a, b) => a.order - b.order)
    .map((item, index) => ({ ...item, order: index }));

  return {
    version: 2,
    maxCols,
    maxRows,
    updatedAt: new Date().toISOString(),
    items,
  };
}

export function createDashboardItem(
  reportId: number,
  existingItems: MyReportDashboardItem[],
  options?: { widgetId?: string; widgetTitle?: string },
): MyReportDashboardItem {
  const index = existingItems.length;
  const column = index % 3;
  const row = Math.floor(index / 3);
  const gap = 24;

  return {
    reportId,
    widgetId: options?.widgetId?.trim() || undefined,
    widgetTitle: options?.widgetTitle?.trim() || undefined,
    colSpan: 1,
    rowSpan: 1,
    x: column * (DASHBOARD_ITEM_DEFAULT_WIDTH + gap),
    y: row * (DASHBOARD_ITEM_DEFAULT_HEIGHT + gap),
    w: DASHBOARD_ITEM_DEFAULT_WIDTH,
    h: DASHBOARD_ITEM_DEFAULT_HEIGHT,
    order: existingItems.length,
    hidden: false,
    hideChrome: false,
  };
}

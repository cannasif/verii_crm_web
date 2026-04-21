import type { MyReportDashboardItem, MyReportDashboardLayout } from '../types';

const STORAGE_PREFIX = 'report-builder:my-dashboard-layout';
export const DASHBOARD_CANVAS_WIDTH = 1200;
export const DASHBOARD_ITEM_MIN_WIDTH = 280;
export const DASHBOARD_ITEM_MIN_HEIGHT = 180;
export const DASHBOARD_ITEM_DEFAULT_WIDTH = 360;
export const DASHBOARD_ITEM_DEFAULT_HEIGHT = 240;
export const DASHBOARD_GRID_SIZE = 12;

function getStorageKey(userId: number | undefined): string {
  return `${STORAGE_PREFIX}:user-${userId ?? 'anonymous'}`;
}

function isDashboardItem(value: unknown): value is MyReportDashboardItem {
  if (typeof value !== 'object' || value == null) return false;
  const item = value as Record<string, unknown>;
  return Number.isFinite(Number(item.reportId))
    && Number.isFinite(Number(item.x))
    && Number.isFinite(Number(item.y))
    && Number.isFinite(Number(item.w))
    && Number.isFinite(Number(item.h))
    && Number.isFinite(Number(item.order));
}

function normalizeItem(item: MyReportDashboardItem): MyReportDashboardItem {
  const maxX = Math.max(0, DASHBOARD_CANVAS_WIDTH - DASHBOARD_ITEM_MIN_WIDTH);
  return {
    reportId: item.reportId,
    x: Math.max(0, Math.min(maxX, Math.round(item.x))),
    y: Math.max(0, Math.round(item.y)),
    w: Math.max(DASHBOARD_ITEM_MIN_WIDTH, Math.round(item.w)),
    h: Math.max(DASHBOARD_ITEM_MIN_HEIGHT, Math.round(item.h)),
    order: Math.max(0, Math.round(item.order)),
    hidden: Boolean(item.hidden),
  };
}

export function loadMyDashboardLayout(userId: number | undefined): MyReportDashboardLayout {
  if (typeof window === 'undefined') return { version: 1, updatedAt: new Date().toISOString(), items: [] };

  try {
    const raw = window.localStorage.getItem(getStorageKey(userId));
    if (!raw) return { version: 1, updatedAt: new Date().toISOString(), items: [] };

    const parsed = JSON.parse(raw) as { version?: number; updatedAt?: string; items?: unknown[] };
    const items = Array.isArray(parsed.items)
      ? parsed.items.filter(isDashboardItem).map(normalizeItem)
      : [];

    return {
      version: 1,
      updatedAt: typeof parsed.updatedAt === 'string' ? parsed.updatedAt : new Date().toISOString(),
      items: items.sort((a, b) => a.order - b.order),
    };
  } catch {
    return { version: 1, updatedAt: new Date().toISOString(), items: [] };
  }
}

export function saveMyDashboardLayout(userId: number | undefined, layout: MyReportDashboardLayout): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(
    getStorageKey(userId),
    JSON.stringify({
      version: 1,
      updatedAt: new Date().toISOString(),
      items: layout.items.map(normalizeItem).sort((a, b) => a.order - b.order),
    }),
  );
}

export function sanitizeMyDashboardLayout(
  layout: MyReportDashboardLayout,
  allowedReportIds: number[],
): MyReportDashboardLayout {
  const allowed = new Set(allowedReportIds);
  const deduped = new Set<number>();
  const items = layout.items
    .filter((item) => allowed.has(item.reportId))
    .filter((item) => {
      if (deduped.has(item.reportId)) return false;
      deduped.add(item.reportId);
      return true;
    })
    .map(normalizeItem)
    .sort((a, b) => a.order - b.order)
    .map((item, index) => ({ ...item, order: index }));

  return {
    version: 1,
    updatedAt: new Date().toISOString(),
    items,
  };
}

export function createDashboardItem(reportId: number, existingItems: MyReportDashboardItem[]): MyReportDashboardItem {
  const index = existingItems.length;
  const column = index % 3;
  const row = Math.floor(index / 3);
  const gap = 24;

  return {
    reportId,
    x: column * (DASHBOARD_ITEM_DEFAULT_WIDTH + gap),
    y: row * (DASHBOARD_ITEM_DEFAULT_HEIGHT + gap),
    w: DASHBOARD_ITEM_DEFAULT_WIDTH,
    h: DASHBOARD_ITEM_DEFAULT_HEIGHT,
    order: existingItems.length,
    hidden: false,
  };
}

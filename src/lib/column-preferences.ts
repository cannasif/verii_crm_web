const COLUMN_STORAGE_PREFIX = 'page-columns';

export interface ColumnPreferences {
  visibleKeys: string[];
  order: string[];
}

export function getColumnStorageKey(pageKey: string, userId: number | undefined): string {
  const uid = userId ?? 'anonymous';
  return `${COLUMN_STORAGE_PREFIX}:${pageKey}:${uid}`;
}

export function loadColumnPreferences(
  pageKey: string,
  userId: number | undefined,
  defaultOrder: string[],
  idColumnKey = 'id'
): ColumnPreferences {
  const key = getColumnStorageKey(pageKey, userId);
  try {
    const raw = localStorage.getItem(key);
    if (!raw) {
      return { visibleKeys: [...defaultOrder], order: [...defaultOrder] };
    }
    const parsed = JSON.parse(raw) as { visibleKeys?: string[]; order?: string[] };
    const storedOrder = Array.isArray(parsed.order) ? parsed.order : [...defaultOrder];
    const storedVisible = Array.isArray(parsed.visibleKeys) ? parsed.visibleKeys : [...defaultOrder];
    const validOrder = storedOrder.filter((k) => defaultOrder.includes(k));
    const missingOrder = defaultOrder.filter((k) => !validOrder.includes(k));
    const order = validOrder.length > 0 ? [...validOrder, ...missingOrder] : [...defaultOrder];
    const visibleKeys = storedVisible.filter((k) => defaultOrder.includes(k));
    const visibleWithDefaults = visibleKeys.length > 0 ? visibleKeys : [...defaultOrder];
    const idFirst =
      order[0] === idColumnKey ? order : [idColumnKey, ...order.filter((k) => k !== idColumnKey)];
    return { visibleKeys: visibleWithDefaults, order: idFirst };
  } catch {
    return { visibleKeys: [...defaultOrder], order: [...defaultOrder] };
  }
}

export function saveColumnPreferences(
  pageKey: string,
  userId: number | undefined,
  prefs: ColumnPreferences
): void {
  const key = getColumnStorageKey(pageKey, userId);
  try {
    localStorage.setItem(key, JSON.stringify(prefs));
  } catch {
    // Ignore localStorage write failures (quota/private mode)
  }
}

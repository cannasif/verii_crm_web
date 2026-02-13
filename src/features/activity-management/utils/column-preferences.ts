import {
  loadColumnPreferences as loadFromLib,
  saveColumnPreferences as saveToLib,
  type ColumnPreferences,
} from '@/lib/column-preferences';

const PAGE_KEY = 'activity-management';

export type { ColumnPreferences };

export function loadColumnPreferences(userId: number | undefined, defaultOrder: string[]): ColumnPreferences {
  return loadFromLib(PAGE_KEY, userId, defaultOrder, 'id');
}

export function saveColumnPreferences(userId: number | undefined, prefs: ColumnPreferences): void {
  saveToLib(PAGE_KEY, userId, prefs);
}

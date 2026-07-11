import type { DataTableGridColumn } from '@/components/shared';
import type { GridExportColumn } from '@/lib/grid-export';
import type { Salesmen360ErpMovementDto } from '../types/salesmen360.types';

type TranslateFn = (key: string, opts?: Record<string, unknown>) => string;

export type SalesmenErpMovementColumnKey =
  | 'tarih'
  | 'vadeTarihi'
  | 'belgeNo'
  | 'cariKod'
  | 'aciklama'
  | 'paraBirimi'
  | 'borc'
  | 'alacak'
  | 'tarihSiraliTlBakiye'
  | 'vadeSiraliTlBakiye'
  | 'dovizBorc'
  | 'dovizAlacak'
  | 'tarihSiraliDovizBakiye'
  | 'vadeSiraliDovizBakiye';

export type SalesmenErpMovementGridRow = Salesmen360ErpMovementDto & {
  gridRowId: string;
};

export const SALESMEN_ERP_MOVEMENT_NUMBER_COLUMN_KEYS = new Set<SalesmenErpMovementColumnKey>([
  'borc',
  'alacak',
  'tarihSiraliTlBakiye',
  'vadeSiraliTlBakiye',
  'dovizBorc',
  'dovizAlacak',
  'tarihSiraliDovizBakiye',
  'vadeSiraliDovizBakiye',
]);

const ERP_MOVEMENT_COLUMN_KEYS: SalesmenErpMovementColumnKey[] = [
  'tarih',
  'vadeTarihi',
  'belgeNo',
  'cariKod',
  'aciklama',
  'paraBirimi',
  'borc',
  'alacak',
  'tarihSiraliTlBakiye',
  'vadeSiraliTlBakiye',
  'dovizBorc',
  'dovizAlacak',
  'tarihSiraliDovizBakiye',
  'vadeSiraliDovizBakiye',
];

const ERP_MOVEMENT_COLUMN_LABEL_KEYS: Record<SalesmenErpMovementColumnKey, string> = {
  tarih: 'salesman360.erpMovements.columns.date',
  vadeTarihi: 'salesman360.erpMovements.columns.dueDate',
  belgeNo: 'salesman360.erpMovements.columns.documentNo',
  cariKod: 'salesman360.erpMovements.columns.customerCode',
  aciklama: 'salesman360.erpMovements.columns.description',
  paraBirimi: 'salesman360.erpMovements.columns.currency',
  borc: 'salesman360.erpMovements.columns.debit',
  alacak: 'salesman360.erpMovements.columns.credit',
  tarihSiraliTlBakiye: 'salesman360.erpMovements.columns.tlBalanceByDate',
  vadeSiraliTlBakiye: 'salesman360.erpMovements.columns.tlBalanceByDueDate',
  dovizBorc: 'salesman360.erpMovements.columns.fxDebit',
  dovizAlacak: 'salesman360.erpMovements.columns.fxCredit',
  tarihSiraliDovizBakiye: 'salesman360.erpMovements.columns.fxBalanceByDate',
  vadeSiraliDovizBakiye: 'salesman360.erpMovements.columns.fxBalanceByDueDate',
};

export function buildSalesmenErpMovementGridRows(
  movements: Salesmen360ErpMovementDto[]
): SalesmenErpMovementGridRow[] {
  return movements.map((movement, index) => ({
    ...movement,
    gridRowId: `${index}-${movement.belgeNo ?? ''}-${movement.tarih ?? ''}-${movement.cariKod}`,
  }));
}

export function buildSalesmenErpMovementGridColumns(
  t: TranslateFn
): DataTableGridColumn<SalesmenErpMovementColumnKey>[] {
  return ERP_MOVEMENT_COLUMN_KEYS.map((key) => ({
    key,
    label: t(ERP_MOVEMENT_COLUMN_LABEL_KEYS[key]),
    sortable: true,
    headClassName: SALESMEN_ERP_MOVEMENT_NUMBER_COLUMN_KEYS.has(key) ? 'text-right' : undefined,
    cellClassName: SALESMEN_ERP_MOVEMENT_NUMBER_COLUMN_KEYS.has(key)
      ? 'text-right tabular-nums font-medium text-slate-700 dark:text-slate-200'
      : 'font-medium text-slate-700 dark:text-slate-200 whitespace-nowrap',
    defaultWidth: key === 'aciklama' ? 220 : SALESMEN_ERP_MOVEMENT_NUMBER_COLUMN_KEYS.has(key) ? 140 : 130,
  }));
}

export function buildSalesmenErpMovementExportColumns(t: TranslateFn): GridExportColumn[] {
  return ERP_MOVEMENT_COLUMN_KEYS.map((key) => ({
    key,
    label: t(ERP_MOVEMENT_COLUMN_LABEL_KEYS[key]),
  }));
}

export function buildSalesmenErpMovementExportRows(
  movements: Salesmen360ErpMovementDto[],
  formatDate: (value?: string | null) => string
): Record<string, unknown>[] {
  return movements.map((row) => ({
    tarih: formatDate(row.tarih),
    vadeTarihi: formatDate(row.vadeTarihi),
    belgeNo: row.belgeNo ?? '-',
    cariKod: row.cariKod ?? '-',
    aciklama: row.aciklama ?? '-',
    paraBirimi: row.paraBirimi ?? row.dovizTuru ?? '-',
    borc: row.borc ?? 0,
    alacak: row.alacak ?? 0,
    tarihSiraliTlBakiye: row.tarihSiraliTlBakiye ?? 0,
    vadeSiraliTlBakiye: row.vadeSiraliTlBakiye ?? 0,
    dovizBorc: row.dovizBorc ?? 0,
    dovizAlacak: row.dovizAlacak ?? 0,
    tarihSiraliDovizBakiye: row.tarihSiraliDovizBakiye ?? 0,
    vadeSiraliDovizBakiye: row.vadeSiraliDovizBakiye ?? 0,
  }));
}

function normalizeSortValue(value: unknown): string | number {
  if (typeof value === 'number') {
    return value;
  }
  if (value == null) {
    return '';
  }
  return String(value).toLocaleLowerCase('tr-TR');
}

export function sortSalesmenErpMovementRows(
  rows: SalesmenErpMovementGridRow[],
  sortBy: SalesmenErpMovementColumnKey,
  sortDirection: 'asc' | 'desc'
): SalesmenErpMovementGridRow[] {
  return [...rows].sort((left, right) => {
    const leftValue =
      sortBy === 'paraBirimi'
        ? normalizeSortValue(left.paraBirimi ?? left.dovizTuru)
        : normalizeSortValue(left[sortBy]);
    const rightValue =
      sortBy === 'paraBirimi'
        ? normalizeSortValue(right.paraBirimi ?? right.dovizTuru)
        : normalizeSortValue(right[sortBy]);

    const compare =
      typeof leftValue === 'number' && typeof rightValue === 'number'
        ? leftValue - rightValue
        : String(leftValue).localeCompare(String(rightValue), 'tr-TR');

    return sortDirection === 'asc' ? compare : -compare;
  });
}

import { type DragEvent, type ReactElement, useEffect, useMemo, useState } from 'react';
import {
  ArrowDownAZ,
  ArrowDownZA,
  ChevronDown,
  ChevronRight,
  Columns3,
  FileDown,
  Filter,
  GripVertical,
  Rows3,
  Save,
  Search,
  Sigma,
  Trash2,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useAuthStore } from '@/stores/auth-store';
import { exportSheetsToXlsx, type ExcelRow } from '@/lib/xlsx-export';
import { cn } from '@/lib/utils';
import type { Salesmen360SalesMovementDto } from '../../types/salesmen360.types';

type DimensionKey =
  | 'salesman'
  | 'customerSalesman'
  | 'customerSalesmanCode'
  | 'customer'
  | 'customerCode'
  | 'customerName'
  | 'customerSource'
  | 'contactStatus'
  | 'stock'
  | 'stockCode'
  | 'stockName'
  | 'documentType'
  | 'documentNumber'
  | 'status'
  | 'documentStatus'
  | 'conversionStatus'
  | 'activityType'
  | 'activityStatus'
  | 'activityPriority'
  | 'activityDueState'
  | 'day'
  | 'week'
  | 'month'
  | 'quarter'
  | 'year'
  | 'currency'
  | 'erpStatus';
type MeasureKey =
  | 'documentCount'
  | 'demandCount'
  | 'quotationCount'
  | 'orderCount'
  | 'erpOrderCount'
  | 'activityCount'
  | 'completedActivityCount'
  | 'customerCount'
  | 'demandQuantity'
  | 'quotationQuantity'
  | 'orderQuantity'
  | 'demandAmount'
  | 'quotationAmount'
  | 'orderAmount'
  | 'erpOrderAmount'
  | 'quantity'
  | 'amount';
type DropZone = 'rows' | 'columns' | 'filters';

interface DimensionDefinition {
  key: DimensionKey;
  label: string;
  group: 'Genel' | 'Cari' | 'Belge' | 'Aktivite' | 'Tarih';
  value: (row: Salesmen360SalesMovementDto) => string;
}

interface PivotAggregate {
  amount: number;
  quantity: number;
  documentIds: Set<string>;
  demandIds: Set<number>;
  quotationIds: Set<number>;
  orderIds: Set<number>;
  erpOrderIds: Set<number>;
  activityIds: Set<number>;
  completedActivityIds: Set<number>;
  customerIds: Set<number>;
  demandQuantity: number;
  quotationQuantity: number;
  orderQuantity: number;
  demandAmount: number;
  quotationAmount: number;
  orderAmount: number;
  erpOrderAmount: number;
}

interface PivotLayout {
  rows: DimensionKey[];
  columns: DimensionKey[];
  filters: DimensionKey[];
  filterValues: Partial<Record<DimensionKey, string[]>>;
  measures: MeasureKey[];
}

interface PivotTreeNode {
  key: string;
  label: string;
  values: string[];
  depth: number;
  children: PivotTreeNode[];
}

interface PivotSort {
  kind: 'label' | 'measure';
  direction: 'asc' | 'desc';
  measure?: MeasureKey;
  columnKey?: string;
}

function weekLabel(value: string): string {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  const utc = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = utc.getUTCDay() || 7;
  utc.setUTCDate(utc.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(utc.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((utc.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${utc.getUTCFullYear()} · ${String(week).padStart(2, '0')}. hafta`;
}

function dueState(row: Salesmen360SalesMovementDto): string {
  if (row.documentType !== 'activity') return 'Aktivite dışı';
  if (row.status.toLowerCase() === 'completed') return 'Tamamlandı';
  if (row.status.toLowerCase() === 'cancelled') return 'İptal';
  if (!row.dueDate) return 'Vade yok';
  const due = new Date(row.dueDate);
  if (Number.isNaN(due.getTime())) return 'Vade yok';
  return due.getTime() < Date.now() ? 'Gecikmiş' : 'Planlı';
}

const DIMENSIONS: readonly DimensionDefinition[] = [
  { key: 'salesman', label: 'Satışçı', group: 'Genel', value: (row) => row.salesmanName || '-' },
  { key: 'customerSalesman', label: 'Cari satışçısı', group: 'Cari', value: (row) => row.customerSalesmanName || 'Cari satışçısı yok' },
  { key: 'customerSalesmanCode', label: 'Cari plasiyer kodu', group: 'Cari', value: (row) => row.customerSalesmanCode || 'Plasiyer kodu yok' },
  { key: 'documentType', label: 'Hareket türü', group: 'Genel', value: (row) => ({ demand: 'Talep', quotation: 'Teklif', order: 'Sipariş', activity: 'Aktivite', customer: 'Cari açılışı' }[row.documentType] ?? row.documentType) },
  { key: 'erpStatus', label: 'ERP durumu', group: 'Genel', value: (row) => row.isErpIntegrated ? 'ERP kaydı var' : 'Yalnız CRM' },
  { key: 'customer', label: 'Cari (kod + unvan)', group: 'Cari', value: (row) => [row.customerCode, row.customerName].filter(Boolean).join(' · ') || 'Tanımsız cari' },
  { key: 'customerCode', label: 'Cari kodu', group: 'Cari', value: (row) => row.customerCode || 'Cari kodu yok' },
  { key: 'customerName', label: 'Cari unvanı', group: 'Cari', value: (row) => row.customerName || 'Tanımsız cari' },
  { key: 'customerSource', label: 'Cari kayıt kaynağı', group: 'Cari', value: (row) => row.documentType === 'customer' ? (row.customerSource || 'Manuel kayıt') : 'Cari açılışı dışı' },
  { key: 'contactStatus', label: 'Cari iletişim durumu', group: 'Cari', value: (row) => row.documentType === 'customer' ? (row.hasContactInfo ? 'İletişim bilgisi var' : 'İletişim bilgisi yok') : 'Cari açılışı dışı' },
  { key: 'stock', label: 'Stok (kod + ad)', group: 'Belge', value: (row) => [row.stockCode, row.stockName].filter(Boolean).join(' · ') || 'Stoksuz hareket' },
  { key: 'stockCode', label: 'Stok kodu', group: 'Belge', value: (row) => row.stockCode || 'Stok kodu yok' },
  { key: 'stockName', label: 'Stok adı', group: 'Belge', value: (row) => row.stockName || 'Stoksuz hareket' },
  { key: 'documentNumber', label: 'Belge no / konu', group: 'Belge', value: (row) => row.documentNumber || `#${row.documentId}` },
  { key: 'status', label: 'Genel durum', group: 'Belge', value: (row) => row.status || '-' },
  { key: 'documentStatus', label: 'Belge durumu', group: 'Belge', value: (row) => ['demand', 'quotation', 'order'].includes(row.documentType) ? (row.status || '-') : 'Belge dışı' },
  { key: 'conversionStatus', label: 'Dönüşüm durumu', group: 'Belge', value: (row) => row.conversionStatus || 'Dönüşüm dışı' },
  { key: 'currency', label: 'Döviz', group: 'Belge', value: (row) => row.currency || 'Para birimi yok' },
  { key: 'activityType', label: 'Aktivite türü', group: 'Aktivite', value: (row) => row.activityType || 'Aktivite dışı' },
  { key: 'activityStatus', label: 'Aktivite durumu', group: 'Aktivite', value: (row) => row.documentType === 'activity' ? (row.status || '-') : 'Aktivite dışı' },
  { key: 'activityPriority', label: 'Aktivite önceliği', group: 'Aktivite', value: (row) => row.documentType === 'activity' ? (row.activityPriority || 'Öncelik yok') : 'Aktivite dışı' },
  { key: 'activityDueState', label: 'Aktivite vade durumu', group: 'Aktivite', value: dueState },
  { key: 'day', label: 'Gün', group: 'Tarih', value: (row) => row.date ? row.date.slice(0, 10) : '-' },
  { key: 'week', label: 'Hafta', group: 'Tarih', value: (row) => weekLabel(row.date) },
  { key: 'month', label: 'Ay', group: 'Tarih', value: (row) => row.date ? row.date.slice(0, 7) : '-' },
  { key: 'quarter', label: 'Çeyrek', group: 'Tarih', value: (row) => row.date ? `${row.date.slice(0, 4)} · Q${Math.floor((Number(row.date.slice(5, 7)) - 1) / 3) + 1}` : '-' },
  { key: 'year', label: 'Yıl', group: 'Tarih', value: (row) => row.date ? row.date.slice(0, 4) : '-' },
];

const MEASURES: readonly { key: MeasureKey; label: string }[] = [
  { key: 'demandCount', label: 'Talep' },
  { key: 'quotationCount', label: 'Teklif' },
  { key: 'orderCount', label: 'Sipariş' },
  { key: 'erpOrderCount', label: 'ERP sipariş' },
  { key: 'activityCount', label: 'Aktivite' },
  { key: 'completedActivityCount', label: 'Tamamlanan aktivite' },
  { key: 'customerCount', label: 'Açılan cari' },
  { key: 'demandQuantity', label: 'Talep stok miktarı' },
  { key: 'quotationQuantity', label: 'Teklif stok miktarı' },
  { key: 'orderQuantity', label: 'Sipariş stok miktarı' },
  { key: 'demandAmount', label: 'Talep tutarı' },
  { key: 'quotationAmount', label: 'Teklif tutarı' },
  { key: 'orderAmount', label: 'Sipariş tutarı' },
  { key: 'erpOrderAmount', label: 'ERP sipariş tutarı' },
  { key: 'documentCount', label: 'Toplam hareket' },
  { key: 'quantity', label: 'Miktar' },
  { key: 'amount', label: 'Tutar' },
];

const EMPTY_LAYOUT: PivotLayout = { rows: [], columns: [], filters: [], filterValues: {}, measures: [] };
const PIVOT_LAYOUT_STORAGE_PREFIX = 'salesmen360:sales-movement-pivot:v2';
const dimensionMap = new Map(DIMENSIONS.map((field) => [field.key, field]));
const measureMap = new Map(MEASURES.map((field) => [field.key, field]));

function cloneLayout(layout: PivotLayout): PivotLayout {
  return {
    rows: [...layout.rows],
    columns: [...layout.columns],
    filters: [...layout.filters],
    filterValues: Object.fromEntries(Object.entries(layout.filterValues).map(([key, values]) => [key, [...(values ?? [])]])),
    measures: [...layout.measures],
  };
}

function sanitizeLayout(value: unknown): PivotLayout {
  if (!value || typeof value !== 'object') return cloneLayout(EMPTY_LAYOUT);
  const parsed = value as Partial<PivotLayout>;
  const validDimensions = new Set(DIMENSIONS.map((field) => field.key));
  const validMeasures = new Set(MEASURES.map((field) => field.key));
  const dimensions = (items: DimensionKey[] | undefined): DimensionKey[] => Array.from(new Set((items ?? []).filter((item) => validDimensions.has(item))));
  const rows = dimensions(parsed.rows);
  const columns = dimensions(parsed.columns).filter((item) => !rows.includes(item));
  const filters = dimensions(parsed.filters);
  const filterValues = Object.fromEntries(filters.map((field) => [field, Array.from(new Set(parsed.filterValues?.[field] ?? []))]));
  return {
    rows,
    columns,
    filters,
    filterValues,
    measures: Array.from(new Set((parsed.measures ?? []).filter((item) => validMeasures.has(item)))),
  };
}

function createAggregate(): PivotAggregate {
  return {
    amount: 0,
    quantity: 0,
    documentIds: new Set(),
    demandIds: new Set(),
    quotationIds: new Set(),
    orderIds: new Set(),
    erpOrderIds: new Set(),
    activityIds: new Set(),
    completedActivityIds: new Set(),
    customerIds: new Set(),
    demandQuantity: 0,
    quotationQuantity: 0,
    orderQuantity: 0,
    demandAmount: 0,
    quotationAmount: 0,
    orderAmount: 0,
    erpOrderAmount: 0,
  };
}

function addMovement(target: PivotAggregate, movement: Salesmen360SalesMovementDto): void {
  target.amount += movement.amount ?? 0;
  target.quantity += movement.quantity ?? 0;
  target.documentIds.add(`${movement.documentType}:${movement.documentId}`);
  if (movement.documentType === 'demand') {
    target.demandIds.add(movement.documentId);
    target.demandQuantity += movement.quantity ?? 0;
    target.demandAmount += movement.amount ?? 0;
  }
  if (movement.documentType === 'quotation') {
    target.quotationIds.add(movement.documentId);
    target.quotationQuantity += movement.quantity ?? 0;
    target.quotationAmount += movement.amount ?? 0;
  }
  if (movement.documentType === 'order') {
    target.orderIds.add(movement.documentId);
    target.orderQuantity += movement.quantity ?? 0;
    target.orderAmount += movement.amount ?? 0;
    if (movement.isErpIntegrated) {
      target.erpOrderIds.add(movement.documentId);
      target.erpOrderAmount += movement.amount ?? 0;
    }
  }
  if (movement.documentType === 'activity') {
    target.activityIds.add(movement.documentId);
    if (movement.status.toLowerCase() === 'completed') target.completedActivityIds.add(movement.documentId);
  }
  if (movement.documentType === 'customer') target.customerIds.add(movement.documentId);
}

function aggregateValue(aggregate: PivotAggregate | undefined, measure: MeasureKey): number {
  if (!aggregate) return 0;
  if (measure === 'documentCount') return aggregate.documentIds.size;
  if (measure === 'demandCount') return aggregate.demandIds.size;
  if (measure === 'quotationCount') return aggregate.quotationIds.size;
  if (measure === 'orderCount') return aggregate.orderIds.size;
  if (measure === 'erpOrderCount') return aggregate.erpOrderIds.size;
  if (measure === 'activityCount') return aggregate.activityIds.size;
  if (measure === 'completedActivityCount') return aggregate.completedActivityIds.size;
  if (measure === 'customerCount') return aggregate.customerIds.size;
  return aggregate[measure];
}

function buildKey(values: string[]): string {
  return JSON.stringify(values);
}

function compareText(left: string, right: string): number {
  return left.localeCompare(right, 'tr', { numeric: true, sensitivity: 'base' });
}

function FieldChip({ label, onRemove }: { label: string; onRemove?: () => void }): ReactElement {
  return (
    <span className="inline-flex cursor-grab items-center gap-1 rounded-md border border-primary/25 bg-primary/8 px-2 py-1 text-[11px] font-bold text-slate-700 active:cursor-grabbing dark:text-slate-200">
      <GripVertical className="size-3 text-primary" />{label}
      {onRemove ? <button type="button" onClick={onRemove} className="rounded p-0.5 hover:bg-primary/15" aria-label={`${label} alanını kaldır`}><X className="size-3" /></button> : null}
    </span>
  );
}

export function SalesMovementPivot({ movements, locale }: { movements: Salesmen360SalesMovementDto[]; locale: string }): ReactElement {
  const userId = useAuthStore((state) => state.user?.id ?? 0);
  const storageKey = `${PIVOT_LAYOUT_STORAGE_PREFIX}:${userId || 'anonymous'}`;
  const [initialLayout] = useState<PivotLayout>(() => {
    try {
      return sanitizeLayout(JSON.parse(window.localStorage.getItem(storageKey) ?? 'null'));
    } catch {
      return cloneLayout(EMPTY_LAYOUT);
    }
  });
  const [draftLayout, setDraftLayout] = useState<PivotLayout>(() => cloneLayout(initialLayout));
  const [appliedLayout, setAppliedLayout] = useState<PivotLayout>(() => cloneLayout(initialLayout));
  const [savedLayout, setSavedLayout] = useState<PivotLayout>(() => cloneLayout(initialLayout));
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [isExporting, setIsExporting] = useState(false);
  const [fieldSearch, setFieldSearch] = useState('');
  const [movementSearch, setMovementSearch] = useState('');
  const [showDecimals, setShowDecimals] = useState(true);
  const [sort, setSort] = useState<PivotSort>({ kind: 'label', direction: 'asc' });
  const hasAppliedDesign = appliedLayout.rows.length > 0 && appliedLayout.measures.length > 0;
  const isDirty = JSON.stringify(draftLayout) !== JSON.stringify(savedLayout);
  const visibleDimensions = useMemo(() => {
    const search = fieldSearch.trim().toLocaleLowerCase('tr');
    return search ? DIMENSIONS.filter((field) => `${field.label} ${field.group}`.toLocaleLowerCase('tr').includes(search)) : DIMENSIONS;
  }, [fieldSearch]);

  useEffect(() => {
    setAppliedLayout(cloneLayout(draftLayout));
    setExpandedNodes(new Set());
  }, [draftLayout]);

  const valuesByDimension = useMemo(() => Object.fromEntries(DIMENSIONS.map((field) => [
    field.key,
    Array.from(new Set(movements.map(field.value))).sort(compareText),
  ])) as Record<DimensionKey, string[]>, [movements]);

  const filteredMovements = useMemo(() => {
    if (!hasAppliedDesign) return [];
    const search = movementSearch.trim().toLocaleLowerCase('tr-TR');
    return movements.filter((movement) => {
      const matchesFilters = appliedLayout.filters.every((fieldKey) => {
        const selected = appliedLayout.filterValues[fieldKey];
        return !selected || selected.length === 0 || selected.includes(dimensionMap.get(fieldKey)!.value(movement));
      });
      if (!matchesFilters || !search) return matchesFilters;

      const searchableText = [
        ...DIMENSIONS.map((field) => field.value(movement)),
        movement.documentId,
        movement.quantity,
        movement.amount,
      ].join(' ').toLocaleLowerCase('tr-TR');
      return searchableText.includes(search);
    });
  }, [appliedLayout, hasAppliedDesign, movementSearch, movements]);

  const pivot = useMemo(() => {
    const rootNodes = new Map<string, PivotTreeNode>();
    const nodes = new Map<string, PivotTreeNode>();
    const columns = new Map<string, string[]>();
    const cells = new Map<string, PivotAggregate>();
    const rowTotals = new Map<string, PivotAggregate>();
    const columnTotals = new Map<string, PivotAggregate>();
    const grandTotal = createAggregate();

    for (const movement of filteredMovements) {
      const columnValues = appliedLayout.columns.map((field) => dimensionMap.get(field)!.value(movement));
      const columnKey = buildKey(columnValues);
      columns.set(columnKey, columnValues);
      const path: string[] = [];
      let parent: PivotTreeNode | undefined;

      for (let depth = 0; depth < appliedLayout.rows.length; depth += 1) {
        path.push(dimensionMap.get(appliedLayout.rows[depth])!.value(movement));
        const nodeKey = buildKey(path);
        let node = nodes.get(nodeKey);
        if (!node) {
          node = { key: nodeKey, label: path[path.length - 1], values: [...path], depth, children: [] };
          nodes.set(nodeKey, node);
          if (parent) parent.children.push(node); else rootNodes.set(nodeKey, node);
        }
        const cellKey = `${nodeKey}\u0001${columnKey}`;
        const cell = cells.get(cellKey) ?? createAggregate();
        addMovement(cell, movement);
        cells.set(cellKey, cell);
        const total = rowTotals.get(nodeKey) ?? createAggregate();
        addMovement(total, movement);
        rowTotals.set(nodeKey, total);
        parent = node;
      }

      const columnTotal = columnTotals.get(columnKey) ?? createAggregate();
      addMovement(columnTotal, movement);
      columnTotals.set(columnKey, columnTotal);
      addMovement(grandTotal, movement);
    }

    const sortNodes = (items: PivotTreeNode[]): PivotTreeNode[] => items
      .sort((left, right) => {
        const comparison = sort.kind === 'label'
          ? compareText(left.label, right.label)
          : aggregateValue(
              sort.columnKey ? cells.get(`${left.key}\u0001${sort.columnKey}`) : rowTotals.get(left.key),
              sort.measure!,
            ) - aggregateValue(
              sort.columnKey ? cells.get(`${right.key}\u0001${sort.columnKey}`) : rowTotals.get(right.key),
              sort.measure!,
            );
        return sort.direction === 'asc' ? comparison : -comparison;
      })
      .map((item) => ({ ...item, children: sortNodes(item.children) }));
    return {
      roots: sortNodes(Array.from(rootNodes.values())),
      columns: Array.from(columns.entries()).sort((left, right) => compareText(left[1].join(' / '), right[1].join(' / '))),
      cells,
      rowTotals,
      columnTotals,
      grandTotal,
    };
  }, [appliedLayout.columns, appliedLayout.rows, filteredMovements, sort]);

  const visibleRows = useMemo(() => {
    const result: PivotTreeNode[] = [];
    const revealSearchResults = movementSearch.trim().length > 0;
    const visit = (node: PivotTreeNode): void => {
      result.push(node);
      if (revealSearchResults || expandedNodes.has(node.key)) node.children.forEach(visit);
    };
    pivot.roots.forEach(visit);
    return result;
  }, [expandedNodes, movementSearch, pivot.roots]);

  const pivotColumns = appliedLayout.columns.length > 0 ? pivot.columns : [[buildKey([]), []] as [string, string[]]];
  const format = (value: number, measure: MeasureKey): string => new Intl.NumberFormat(locale, {
    minimumFractionDigits: showDecimals && ['demandAmount', 'quotationAmount', 'orderAmount', 'erpOrderAmount', 'amount'].includes(measure) ? 2 : 0,
    maximumFractionDigits: ['documentCount', 'demandCount', 'quotationCount', 'orderCount', 'erpOrderCount', 'activityCount', 'completedActivityCount', 'customerCount'].includes(measure) || !showDecimals ? 0 : 2,
  }).format(value);

  const toggleSort = (next: Omit<PivotSort, 'direction'>): void => setSort((current) => {
    const sameColumn = current.kind === next.kind && current.measure === next.measure && current.columnKey === next.columnKey;
    return { ...next, direction: sameColumn && current.direction === 'asc' ? 'desc' : 'asc' };
  });

  const SortIcon = ({ active }: { active: boolean }): ReactElement => active && sort.direction === 'desc'
    ? <ArrowDownZA className="size-3" />
    : <ArrowDownAZ className={cn('size-3', !active && 'opacity-35')} />;

  const moveField = (field: DimensionKey, zone: DropZone): void => setDraftLayout((current) => {
    const next = cloneLayout(current);
    if (zone === 'rows') {
      next.rows = next.rows.filter((item) => item !== field);
      next.columns = next.columns.filter((item) => item !== field);
    } else if (zone === 'columns') {
      next.columns = next.columns.filter((item) => item !== field);
      next.rows = next.rows.filter((item) => item !== field);
    } else {
      next.filters = next.filters.filter((item) => item !== field);
    }
    if (!next[zone].includes(field)) next[zone].push(field);
    return next;
  });

  const removeField = (field: DimensionKey, zone: DropZone): void => setDraftLayout((current) => ({
    ...current,
    [zone]: current[zone].filter((item) => item !== field),
    filterValues: zone === 'filters' ? { ...current.filterValues, [field]: undefined } : current.filterValues,
  }));

  const handleDragStart = (event: DragEvent, field: DimensionKey): void => {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('application/x-sales-pivot-field', field);
  };

  const handleDrop = (event: DragEvent, zone: DropZone): void => {
    event.preventDefault();
    const field = event.dataTransfer.getData('application/x-sales-pivot-field') as DimensionKey;
    if (dimensionMap.has(field)) moveField(field, zone);
  };

  const save = (): void => {
    if (draftLayout.rows.length === 0 || draftLayout.measures.length === 0) {
      toast.error('Kaydetmek için en az bir satır kırılımı ve bir değer kolonu seçin.');
      return;
    }
    window.localStorage.setItem(storageKey, JSON.stringify(draftLayout));
    setSavedLayout(cloneLayout(draftLayout));
    toast.success('Pivot görünümü kullanıcı hesabınız için kaydedildi.');
  };

  const clear = (): void => {
    const empty = cloneLayout(EMPTY_LAYOUT);
    setDraftLayout(empty);
    setAppliedLayout(cloneLayout(empty));
    setSavedLayout(cloneLayout(empty));
    setExpandedNodes(new Set());
    window.localStorage.removeItem(storageKey);
  };

  const exportPivot = async (): Promise<void> => {
    setIsExporting(true);
    try {
      const header: ExcelRow = [
        ...appliedLayout.rows.map((field) => dimensionMap.get(field)!.label),
        ...pivotColumns.flatMap(([, values]) => appliedLayout.measures.map((measure) => `${values.length ? `${values.join(' / ')} · ` : ''}${measureMap.get(measure)!.label}`)),
      ];
      const leaves = (nodes: PivotTreeNode[]): PivotTreeNode[] => nodes.flatMap((node) => node.children.length ? leaves(node.children) : [node]);
      const rows: ExcelRow[] = leaves(pivot.roots).map((node) => [
        ...node.values,
        ...pivotColumns.flatMap(([columnKey]) => appliedLayout.measures.map((measure) => aggregateValue(pivot.cells.get(`${node.key}\u0001${columnKey}`), measure))),
      ]);
      await exportSheetsToXlsx('donem-ici-satis-hareketleri-pivot', [{ name: 'Satış Hareketleri Pivot', rows: [header, ...rows] }]);
    } finally {
      setIsExporting(false);
    }
  };

  const renderZone = (zone: DropZone, title: string, Icon: typeof Rows3): ReactElement => {
    const fields = draftLayout[zone];
    return (
      <div className="min-h-14 rounded-lg border border-dashed border-slate-300 bg-slate-50/80 p-2 dark:border-white/15 dark:bg-white/3" onDragOver={(event) => event.preventDefault()} onDrop={(event) => handleDrop(event, zone)}>
        <p className="mb-1 flex items-center gap-1 text-[9px] font-black uppercase tracking-wider text-slate-500"><Icon className="size-3" />{title}</p>
        <div className="flex min-h-6 flex-wrap gap-1.5">
          {fields.map((field) => zone === 'filters' ? (
            <Popover key={field}>
              <PopoverTrigger asChild>
                <button type="button" draggable onDragStart={(event) => handleDragStart(event, field)} className="inline-flex items-center gap-1 rounded-md border border-primary/25 bg-primary/8 px-2 py-1 text-[11px] font-bold">
                  <GripVertical className="size-3 text-primary" />{dimensionMap.get(field)!.label}
                  {(draftLayout.filterValues[field]?.length ?? 0) > 0 ? <span className="rounded-full bg-primary px-1.5 text-[9px] text-white">{draftLayout.filterValues[field]!.length}</span> : null}
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-72 p-2" align="start">
                <div className="mb-2 flex items-center justify-between"><b className="text-sm">{dimensionMap.get(field)!.label}</b><Button variant="ghost" size="sm" onClick={() => setDraftLayout((current) => ({ ...current, filterValues: { ...current.filterValues, [field]: [] } }))}>Temizle</Button></div>
                <div className="max-h-64 space-y-1 overflow-y-auto">
                  {valuesByDimension[field].map((value) => {
                    const selected = draftLayout.filterValues[field]?.includes(value) ?? false;
                    return <label key={value} className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-slate-100 dark:hover:bg-white/5"><Checkbox checked={selected} onCheckedChange={() => setDraftLayout((current) => ({ ...current, filterValues: { ...current.filterValues, [field]: selected ? (current.filterValues[field] ?? []).filter((item) => item !== value) : [...(current.filterValues[field] ?? []), value] } }))} /><span className="truncate text-xs">{value}</span></label>;
                  })}
                </div>
                <Button variant="ghost" size="sm" className="mt-2 w-full" onClick={() => removeField(field, 'filters')}>Filtre alanını kaldır</Button>
              </PopoverContent>
            </Popover>
          ) : <span key={field} draggable onDragStart={(event) => handleDragStart(event, field)}><FieldChip label={dimensionMap.get(field)!.label} onRemove={() => removeField(field, zone)} /></span>)}
          {fields.length === 0 ? <span className="text-[11px] text-slate-400">Alan sürükleyin</span> : null}
        </div>
      </div>
    );
  };

  return (
    <div className="relative">
      <div className="sticky top-0 z-40 border-b border-slate-200 bg-white/97 p-3 shadow-sm backdrop-blur dark:border-white/10 dark:bg-[#160d20]/97">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <div className="min-w-48 flex-1"><h4 className="text-sm font-black">Pivot tasarımı</h4><p className="text-[11px] text-slate-500">Her alan, filtre ve değer değişikliği tabloya anında uygulanır.</p></div>
          {isDirty ? <span className="rounded-full bg-amber-100 px-2 py-1 text-[10px] font-bold text-amber-700">Kaydedilmemiş görünüm</span> : null}
          <Button variant="outline" size="sm" className="h-8" onClick={clear}><Trash2 className="mr-1 size-3.5" />Temizle</Button>
          <Button size="sm" className="h-8" onClick={save}><Save className="mr-1 size-3.5" />Görünümü kaydet</Button>
        </div>

        <div className="mb-2 flex items-center gap-1.5 overflow-x-auto pb-1">
          <span className="mr-1 shrink-0 text-[9px] font-black uppercase text-slate-400">Alanlar</span>
          <label className="sticky left-0 z-10 flex h-7 w-44 shrink-0 items-center gap-1 rounded-md border border-slate-200 bg-white px-2 dark:border-white/10 dark:bg-[#160d20]"><Search className="size-3 text-slate-400" /><input value={fieldSearch} onChange={(event) => setFieldSearch(event.target.value)} placeholder="Alan ara..." className="min-w-0 flex-1 bg-transparent text-[11px] outline-none" /></label>
          {visibleDimensions.map((field, index) => <span key={field.key} className="flex shrink-0 items-center gap-1" draggable onDragStart={(event) => handleDragStart(event, field.key)}>{index === 0 || visibleDimensions[index - 1].group !== field.group ? <span className="ml-1 text-[9px] font-black uppercase text-primary/70">{field.group}</span> : null}<FieldChip label={field.label} /></span>)}
        </div>
        <div className="grid gap-2 lg:grid-cols-3">
          {renderZone('rows', 'Satırlar / açılım sırası', Rows3)}
          {renderZone('columns', 'Kolon kırılımı', Columns3)}
          {renderZone('filters', 'Filtreler', Filter)}
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50/80 p-2 dark:border-white/10 dark:bg-white/3">
          <span className="mr-1 flex items-center gap-1 text-[9px] font-black uppercase text-slate-500"><Sigma className="size-3" />Değer kolonları</span>
          {MEASURES.map((measure) => {
            const selected = draftLayout.measures.includes(measure.key);
            return <button key={measure.key} type="button" onClick={() => setDraftLayout((current) => ({ ...current, measures: selected ? current.measures.filter((item) => item !== measure.key) : [...current.measures, measure.key] }))} className={cn('rounded-md border px-2 py-1 text-[11px] font-bold', selected ? 'border-primary bg-primary text-primary-foreground' : 'border-slate-200 bg-white text-slate-600 dark:border-white/10 dark:bg-white/3 dark:text-slate-300')}>{measure.label}</button>;
          })}
        </div>
      </div>

      {!hasAppliedDesign ? (
        <div className="m-4 rounded-xl border border-dashed border-slate-300 p-12 text-center dark:border-white/15">
          <Sigma className="mx-auto mb-3 size-8 text-slate-300" />
          <h5 className="font-black">Pivot henüz oluşturulmadı</h5>
          <p className="mx-auto mt-1 max-w-xl text-xs text-slate-500">Satışçı, cari ve stok alanlarını Satırlara; istediğiniz adet, miktar ve tutarları Değer kolonlarına eklediğiniz anda tablo oluşur.</p>
        </div>
      ) : (
        <div className="p-4">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
              <p className="shrink-0 text-xs font-semibold text-slate-500">{filteredMovements.length} hareket · {pivot.roots.length} ana grup · Satırlar `+ / −` ile açılır</p>
              <label className="flex h-9 min-w-60 max-w-md flex-1 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 shadow-sm dark:border-white/10 dark:bg-white/3">
                <Search className="size-4 shrink-0 text-slate-400" />
                <input
                  value={movementSearch}
                  onChange={(event) => setMovementSearch(event.target.value)}
                  placeholder="Satışçı, cari, stok, belge veya durum ara..."
                  aria-label="Pivot hareketlerinde ara"
                  className="min-w-0 flex-1 bg-transparent text-xs outline-none placeholder:text-slate-400"
                />
                {movementSearch ? <button type="button" onClick={() => setMovementSearch('')} className="rounded p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-white/10" aria-label="Aramayı temizle"><X className="size-3.5" /></button> : null}
              </label>
            </div>
            <div className="flex items-center gap-2"><Button variant="outline" size="sm" onClick={() => setShowDecimals((current) => !current)}>Ondalık: {showDecimals ? 'Açık' : 'Kapalı'}</Button><Button variant="outline" size="sm" disabled={isExporting || pivot.roots.length === 0} onClick={() => void exportPivot()}><FileDown className="mr-1.5 size-4" />Excel'e aktar</Button></div>
          </div>
          <div className="max-h-[42rem] overflow-auto rounded-xl border border-slate-200 dark:border-white/10">
            <table className="min-w-max w-full border-collapse text-xs">
              <thead className="sticky top-0 z-30 bg-slate-100 dark:bg-[#20152d]">
                <tr>
                  <th rowSpan={2} className="sticky left-0 z-40 min-w-72 border-b border-r border-slate-200 px-3 py-2 text-left font-black dark:border-white/10 dark:bg-[#20152d]"><button type="button" className="flex w-full items-center gap-1 text-left" onClick={() => toggleSort({ kind: 'label' })}>{appliedLayout.rows.map((field) => dimensionMap.get(field)!.label).join(' → ')}<SortIcon active={sort.kind === 'label'} /></button></th>
                  {pivotColumns.map(([columnKey, values]) => <th key={columnKey} colSpan={appliedLayout.measures.length} className="border-b border-r border-slate-200 px-3 py-2 text-center font-black dark:border-white/10">{values.length ? values.join(' / ') : 'Değerler'}</th>)}
                </tr>
                <tr>{pivotColumns.flatMap(([columnKey]) => appliedLayout.measures.map((measure) => <th key={`${columnKey}-${measure}`} className="min-w-28 border-b border-r border-slate-200 px-3 py-2 text-right text-[10px] font-black uppercase dark:border-white/10"><button type="button" className="flex w-full items-center justify-end gap-1" onClick={() => toggleSort({ kind: 'measure', measure, columnKey })}>{measureMap.get(measure)!.label}<SortIcon active={sort.kind === 'measure' && sort.measure === measure && sort.columnKey === columnKey} /></button></th>))}</tr>
              </thead>
              <tbody>
                {visibleRows.map((node) => {
                  const expanded = expandedNodes.has(node.key);
                  return <tr key={node.key} className={cn('hover:bg-primary/5', node.children.length > 0 && 'font-bold')}>
                    <td className="sticky left-0 z-10 border-b border-r border-slate-200 bg-white px-3 py-2 dark:border-white/10 dark:bg-[#160d20]">
                      <div className="flex items-center" style={{ paddingLeft: `${node.depth * 18}px` }}>
                        {node.children.length ? <button type="button" className="mr-1 rounded p-0.5 hover:bg-primary/10" onClick={() => setExpandedNodes((current) => { const next = new Set(current); if (expanded) next.delete(node.key); else next.add(node.key); return next; })} aria-label={expanded ? 'Grubu daralt' : 'Grubu genişlet'}>{expanded ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}</button> : <span className="mr-1 w-5" />}
                        <span className="max-w-80 truncate" title={node.label}>{node.label}</span>
                        <span className="ml-2 text-[9px] font-semibold uppercase text-slate-400">{dimensionMap.get(appliedLayout.rows[node.depth])!.label}</span>
                      </div>
                    </td>
                    {pivotColumns.flatMap(([columnKey]) => appliedLayout.measures.map((measure) => <td key={`${columnKey}-${measure}`} className="border-b border-r border-slate-200 px-3 py-2 text-right tabular-nums dark:border-white/10">{format(aggregateValue(pivot.cells.get(`${node.key}\u0001${columnKey}`), measure), measure)}</td>))}
                  </tr>;
                })}
              </tbody>
            </table>
            {pivot.roots.length === 0 ? <div className="p-10 text-center text-sm text-slate-500">Seçilen kırılım ve filtrelerde hareket bulunamadı.</div> : null}
          </div>
        </div>
      )}
    </div>
  );
}

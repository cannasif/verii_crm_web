import { type DragEvent, type ReactElement, useEffect, useMemo, useState } from 'react';
import { Columns3, FileDown, Filter, GripVertical, RotateCcw, Rows3, Sigma, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { exportSheetsToXlsx, type ExcelRow } from '@/lib/xlsx-export';
import { cn } from '@/lib/utils';
import type { Salesmen360SalesMovementDto } from '../../types/salesmen360.types';

type DimensionKey = 'salesman' | 'customer' | 'stock' | 'documentType' | 'status' | 'month' | 'currency' | 'erpStatus';
type MeasureKey = 'documentCount' | 'quantity' | 'amount';
type DropZone = 'rows' | 'columns' | 'filters';

interface DimensionDefinition {
  key: DimensionKey;
  label: string;
  value: (row: Salesmen360SalesMovementDto) => string;
}

interface PivotAggregate {
  amount: number;
  quantity: number;
  documentIds: Set<string>;
}

const DIMENSIONS: readonly DimensionDefinition[] = [
  { key: 'salesman', label: 'Satışçı', value: (row) => row.salesmanName || '-' },
  { key: 'customer', label: 'Cari', value: (row) => [row.customerCode, row.customerName].filter(Boolean).join(' · ') || 'Tanımsız cari' },
  { key: 'stock', label: 'Stok', value: (row) => [row.stockCode, row.stockName].filter(Boolean).join(' · ') || 'Tanımsız stok' },
  { key: 'documentType', label: 'Belge türü', value: (row) => ({ demand: 'Talep', quotation: 'Teklif', order: 'Sipariş' }[row.documentType] ?? row.documentType) },
  { key: 'status', label: 'Durum', value: (row) => row.status || '-' },
  { key: 'month', label: 'Ay', value: (row) => row.date ? row.date.slice(0, 7) : '-' },
  { key: 'currency', label: 'Döviz', value: (row) => row.currency || '-' },
  { key: 'erpStatus', label: 'ERP durumu', value: (row) => row.isErpIntegrated ? 'ERP kaydı var' : 'Yalnız CRM' },
];

const MEASURES: readonly { key: MeasureKey; label: string }[] = [
  { key: 'documentCount', label: 'Belge adedi' },
  { key: 'quantity', label: 'Miktar' },
  { key: 'amount', label: 'Tutar' },
];

const DEFAULT_ROWS: DimensionKey[] = ['customer', 'stock'];
const DEFAULT_COLUMNS: DimensionKey[] = ['documentType', 'currency'];
const DEFAULT_MEASURES: MeasureKey[] = ['documentCount', 'quantity', 'amount'];
const PIVOT_LAYOUT_STORAGE_KEY = 'salesmen360:sales-movement-pivot:v1';
const dimensionMap = new Map(DIMENSIONS.map((field) => [field.key, field]));

interface StoredPivotLayout {
  rows: DimensionKey[];
  columns: DimensionKey[];
  filters: DimensionKey[];
  measures: MeasureKey[];
}

function loadStoredLayout(): StoredPivotLayout {
  const fallback: StoredPivotLayout = { rows: DEFAULT_ROWS, columns: DEFAULT_COLUMNS, filters: [], measures: DEFAULT_MEASURES };
  try {
    const parsed = JSON.parse(window.localStorage.getItem(PIVOT_LAYOUT_STORAGE_KEY) ?? '') as Partial<StoredPivotLayout>;
    const validDimensions = new Set(DIMENSIONS.map((field) => field.key));
    const validMeasures = new Set(MEASURES.map((field) => field.key));
    const sanitizeDimensions = (values: DimensionKey[] | undefined): DimensionKey[] => Array.from(new Set((values ?? []).filter((value) => validDimensions.has(value))));
    const sanitizedMeasures = Array.from(new Set((parsed.measures ?? []).filter((value) => validMeasures.has(value))));
    return {
      rows: sanitizeDimensions(parsed.rows),
      columns: sanitizeDimensions(parsed.columns),
      filters: sanitizeDimensions(parsed.filters),
      measures: sanitizedMeasures.length > 0 ? sanitizedMeasures : DEFAULT_MEASURES,
    };
  } catch {
    return fallback;
  }
}

function aggregateValue(aggregate: PivotAggregate | undefined, measure: MeasureKey): number {
  if (!aggregate) return 0;
  if (measure === 'documentCount') return aggregate.documentIds.size;
  return aggregate[measure];
}

function buildKey(values: string[]): string {
  return JSON.stringify(values);
}

function compareValues(left: string[], right: string[]): number {
  return left.join('\u0000').localeCompare(right.join('\u0000'), 'tr', { numeric: true, sensitivity: 'base' });
}

function FieldChip({ label, onRemove, draggable = true }: { label: string; onRemove?: () => void; draggable?: boolean }): ReactElement {
  return (
    <span
      className="inline-flex cursor-grab items-center gap-1.5 rounded-lg border border-primary/25 bg-primary/8 px-2.5 py-1.5 text-xs font-bold text-slate-700 active:cursor-grabbing dark:text-slate-200"
      draggable={draggable}
    >
      {draggable ? <GripVertical className="size-3.5 text-primary" /> : null}
      {label}
      {onRemove ? (
        <button type="button" onClick={onRemove} className="rounded p-0.5 hover:bg-primary/15" aria-label={`${label} alanını kaldır`}>
          <X className="size-3" />
        </button>
      ) : null}
    </span>
  );
}

export function SalesMovementPivot({ movements, locale }: { movements: Salesmen360SalesMovementDto[]; locale: string }): ReactElement {
  const [initialLayout] = useState(loadStoredLayout);
  const [rowFields, setRowFields] = useState<DimensionKey[]>(initialLayout.rows);
  const [columnFields, setColumnFields] = useState<DimensionKey[]>(initialLayout.columns);
  const [filterFields, setFilterFields] = useState<DimensionKey[]>(initialLayout.filters);
  const [filterValues, setFilterValues] = useState<Partial<Record<DimensionKey, string[]>>>({});
  const [measures, setMeasures] = useState<MeasureKey[]>(initialLayout.measures);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    window.localStorage.setItem(PIVOT_LAYOUT_STORAGE_KEY, JSON.stringify({
      rows: rowFields,
      columns: columnFields,
      filters: filterFields,
      measures,
    } satisfies StoredPivotLayout));
  }, [columnFields, filterFields, measures, rowFields]);

  const valuesByDimension = useMemo(() => Object.fromEntries(DIMENSIONS.map((field) => [
    field.key,
    Array.from(new Set(movements.map(field.value))).sort((a, b) => a.localeCompare(b, 'tr', { numeric: true })),
  ])) as Record<DimensionKey, string[]>, [movements]);

  const filteredMovements = useMemo(() => movements.filter((movement) => filterFields.every((fieldKey) => {
    const selected = filterValues[fieldKey];
    if (!selected || selected.length === 0) return true;
    return selected.includes(dimensionMap.get(fieldKey)!.value(movement));
  })), [filterFields, filterValues, movements]);

  const currencies = useMemo(() => new Set(filteredMovements.map((row) => row.currency || '-')), [filteredMovements]);
  const stocks = useMemo(() => new Set(filteredMovements.map((row) => row.stockCode || row.stockName)), [filteredMovements]);
  const effectiveColumnFields = useMemo(() => {
    if (!measures.includes('amount') || currencies.size <= 1 || rowFields.includes('currency') || columnFields.includes('currency')) return columnFields;
    return [...columnFields, 'currency' as const];
  }, [columnFields, currencies.size, measures, rowFields]);
  const effectiveRowFields = useMemo(() => {
    if (!measures.includes('quantity') || stocks.size <= 1 || rowFields.includes('stock') || effectiveColumnFields.includes('stock')) return rowFields;
    return [...rowFields, 'stock' as const];
  }, [effectiveColumnFields, measures, rowFields, stocks.size]);

  const pivot = useMemo(() => {
    const rows = new Map<string, string[]>();
    const columns = new Map<string, string[]>();
    const cells = new Map<string, PivotAggregate>();
    const rowTotals = new Map<string, PivotAggregate>();
    const columnTotals = new Map<string, PivotAggregate>();
    const grandTotal: PivotAggregate = { amount: 0, quantity: 0, documentIds: new Set() };

    for (const movement of filteredMovements) {
      const rowValues = effectiveRowFields.map((field) => dimensionMap.get(field)!.value(movement));
      const columnValues = effectiveColumnFields.map((field) => dimensionMap.get(field)!.value(movement));
      const rowKey = buildKey(rowValues);
      const columnKey = buildKey(columnValues);
      rows.set(rowKey, rowValues);
      columns.set(columnKey, columnValues);
      const documentKey = `${movement.documentType}:${movement.documentId}`;
      const add = (target: PivotAggregate): void => {
        target.amount += movement.amount ?? 0;
        target.quantity += movement.quantity ?? 0;
        target.documentIds.add(documentKey);
      };
      const cellKey = `${rowKey}\u0001${columnKey}`;
      const cell = cells.get(cellKey) ?? { amount: 0, quantity: 0, documentIds: new Set<string>() };
      add(cell);
      cells.set(cellKey, cell);
      const rowTotal = rowTotals.get(rowKey) ?? { amount: 0, quantity: 0, documentIds: new Set<string>() };
      add(rowTotal);
      rowTotals.set(rowKey, rowTotal);
      const columnTotal = columnTotals.get(columnKey) ?? { amount: 0, quantity: 0, documentIds: new Set<string>() };
      add(columnTotal);
      columnTotals.set(columnKey, columnTotal);
      add(grandTotal);
    }

    return {
      rows: Array.from(rows.entries()).sort((a, b) => compareValues(a[1], b[1])),
      columns: Array.from(columns.entries()).sort((a, b) => compareValues(a[1], b[1])),
      cells,
      rowTotals,
      columnTotals,
      grandTotal,
    };
  }, [effectiveColumnFields, effectiveRowFields, filteredMovements]);
  const visiblePivotColumns = effectiveColumnFields.length > 0 ? pivot.columns : [];
  const hasRowDimensions = effectiveRowFields.length > 0;

  const format = (value: number, measure: MeasureKey): string => new Intl.NumberFormat(locale, {
    maximumFractionDigits: measure === 'documentCount' ? 0 : 2,
  }).format(value);

  const moveField = (field: DimensionKey, zone: DropZone): void => {
    setRowFields((current) => current.filter((item) => item !== field));
    setColumnFields((current) => current.filter((item) => item !== field));
    setFilterFields((current) => current.filter((item) => item !== field));
    const setter = zone === 'rows' ? setRowFields : zone === 'columns' ? setColumnFields : setFilterFields;
    setter((current) => current.includes(field) ? current : [...current, field]);
  };

  const handleDragStart = (event: DragEvent, field: DimensionKey): void => {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('application/x-sales-pivot-field', field);
  };

  const handleDrop = (event: DragEvent, zone: DropZone): void => {
    event.preventDefault();
    const field = event.dataTransfer.getData('application/x-sales-pivot-field') as DimensionKey;
    if (dimensionMap.has(field)) moveField(field, zone);
  };

  const removeField = (field: DimensionKey): void => {
    setRowFields((current) => current.filter((item) => item !== field));
    setColumnFields((current) => current.filter((item) => item !== field));
    setFilterFields((current) => current.filter((item) => item !== field));
    setFilterValues((current) => ({ ...current, [field]: undefined }));
  };

  const reset = (): void => {
    setRowFields(DEFAULT_ROWS);
    setColumnFields(DEFAULT_COLUMNS);
    setFilterFields([]);
    setFilterValues({});
    setMeasures(DEFAULT_MEASURES);
  };

  const exportPivot = async (): Promise<void> => {
    setIsExporting(true);
    try {
      const header: ExcelRow = [
        ...(hasRowDimensions ? effectiveRowFields.map((field) => dimensionMap.get(field)!.label) : ['Kırılım']),
        ...visiblePivotColumns.flatMap(([, values]) => measures.map((measure) => `${values.join(' / ')} · ${MEASURES.find((item) => item.key === measure)!.label}`)),
        ...measures.map((measure) => `Genel toplam · ${MEASURES.find((item) => item.key === measure)!.label}`),
      ];
      const rows: ExcelRow[] = pivot.rows.map(([rowKey, values]) => [
        ...(hasRowDimensions ? values : ['Tümü']),
        ...visiblePivotColumns.flatMap(([columnKey]) => measures.map((measure) => aggregateValue(pivot.cells.get(`${rowKey}\u0001${columnKey}`), measure))),
        ...measures.map((measure) => aggregateValue(pivot.rowTotals.get(rowKey), measure)),
      ]);
      await exportSheetsToXlsx('donem-ici-satis-hareketleri-pivot', [{ name: 'Satış Hareketleri Pivot', rows: [header, ...rows] }]);
    } finally {
      setIsExporting(false);
    }
  };

  const renderZone = (zone: DropZone, title: string, Icon: typeof Rows3, fields: DimensionKey[]): ReactElement => (
    <div
      className="min-h-20 rounded-xl border border-dashed border-slate-300 bg-slate-50/70 p-3 dark:border-white/15 dark:bg-white/3"
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => handleDrop(event, zone)}
    >
      <p className="mb-2 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-slate-500"><Icon className="size-3.5" />{title}</p>
      <div className="flex flex-wrap gap-2">
        {fields.map((field) => zone === 'filters' ? (
          <Popover key={field}>
            <PopoverTrigger asChild>
              <button type="button" draggable onDragStart={(event) => handleDragStart(event, field)} className="inline-flex items-center gap-1.5 rounded-lg border border-primary/25 bg-primary/8 px-2.5 py-1.5 text-xs font-bold">
                <GripVertical className="size-3.5 text-primary" />{dimensionMap.get(field)!.label}
                {(filterValues[field]?.length ?? 0) > 0 ? <span className="rounded-full bg-primary px-1.5 text-[9px] text-white">{filterValues[field]!.length}</span> : null}
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-72 p-2" align="start">
              <div className="mb-2 flex items-center justify-between"><b className="text-sm">{dimensionMap.get(field)!.label}</b><Button variant="ghost" size="sm" onClick={() => setFilterValues((current) => ({ ...current, [field]: [] }))}>Temizle</Button></div>
              <div className="max-h-64 space-y-1 overflow-y-auto">
                {valuesByDimension[field].map((value) => {
                  const selected = filterValues[field]?.includes(value) ?? false;
                  return <label key={value} className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-slate-100 dark:hover:bg-white/5"><Checkbox checked={selected} onCheckedChange={() => setFilterValues((current) => ({ ...current, [field]: selected ? (current[field] ?? []).filter((item) => item !== value) : [...(current[field] ?? []), value] }))} /><span className="truncate text-xs">{value}</span></label>;
                })}
              </div>
              <Button variant="ghost" size="sm" className="mt-2 w-full" onClick={() => removeField(field)}>Filtre alanını kaldır</Button>
            </PopoverContent>
          </Popover>
        ) : (
          <span key={field} draggable onDragStart={(event) => handleDragStart(event, field)}><FieldChip label={dimensionMap.get(field)!.label} onRemove={() => removeField(field)} /></span>
        ))}
        {fields.length === 0 ? <span className="text-xs text-slate-400">Alanı buraya sürükleyin</span> : null}
      </div>
    </div>
  );

  return (
    <div className="space-y-3 p-4">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <h4 className="font-black text-slate-900 dark:text-white">Dönem içi satış hareketleri pivotu</h4>
          <p className="text-xs text-slate-500">Cari, stok, satışçı ve belge alanlarını satır/sütun bölgelerine sürükleyerek analizi yeniden kurun.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={reset}><RotateCcw className="mr-1.5 size-4" />Varsayılana dön</Button>
          <Button variant="outline" size="sm" disabled={isExporting || pivot.rows.length === 0} onClick={() => void exportPivot()}><FileDown className="mr-1.5 size-4" />Excel'e aktar</Button>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-3 dark:border-white/10 dark:bg-[#160d20]">
        <p className="mb-2 text-[10px] font-black uppercase tracking-wider text-slate-500">Kullanılabilir alanlar</p>
        <div className="flex flex-wrap gap-2">
          {DIMENSIONS.map((field) => <span key={field.key} draggable onDragStart={(event) => handleDragStart(event, field.key)}><FieldChip label={field.label} /></span>)}
        </div>
      </div>

      <div className="grid gap-3 xl:grid-cols-3">
        {renderZone('rows', 'Satırlar', Rows3, rowFields)}
        {renderZone('columns', 'Sütunlar', Columns3, columnFields)}
        {renderZone('filters', 'Filtreler', Filter, filterFields)}
      </div>

      <div className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white p-3 sm:flex-row sm:items-center dark:border-white/10 dark:bg-[#160d20]">
        <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-slate-500"><Sigma className="size-3.5" />Değerler</span>
        <div className="flex flex-wrap gap-2">
          {MEASURES.map((measure) => {
            const selected = measures.includes(measure.key);
            return <button key={measure.key} type="button" onClick={() => setMeasures((current) => selected ? (current.length > 1 ? current.filter((item) => item !== measure.key) : current) : [...current, measure.key])} className={cn('rounded-lg border px-2.5 py-1.5 text-xs font-bold', selected ? 'border-primary bg-primary text-primary-foreground' : 'border-slate-200 bg-white text-slate-600 dark:border-white/10 dark:bg-white/3 dark:text-slate-300')}>{measure.label}</button>;
          })}
        </div>
        <span className="sm:ml-auto text-xs font-semibold text-slate-500">{filteredMovements.length} hareket · {pivot.rows.length} satır grubu</span>
      </div>

      {effectiveColumnFields.length !== columnFields.length ? <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">Farklı para birimleri birbirine eklenmesin diye Döviz alanı otomatik olarak sütunlara uygulandı.</p> : null}
      {effectiveRowFields.length !== rowFields.length ? <p className="rounded-lg bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 dark:bg-blue-500/10 dark:text-blue-300">Farklı stok miktarları anlamsız biçimde toplanmasın diye Stok alanı otomatik olarak satırlara uygulandı.</p> : null}

      <div className="max-h-[38rem] overflow-auto rounded-xl border border-slate-200 dark:border-white/10">
        <table className="min-w-max w-full border-collapse text-xs">
          <thead className="sticky top-0 z-30 bg-slate-100 dark:bg-[#20152d]">
            <tr>
              {hasRowDimensions ? effectiveRowFields.map((field, index) => <th key={field} rowSpan={2} className={cn('sticky z-40 min-w-44 border-b border-r border-slate-200 px-3 py-2 text-left font-black dark:border-white/10 dark:bg-[#20152d]', index === 0 ? 'left-0' : '')}>{dimensionMap.get(field)!.label}</th>) : <th rowSpan={2} className="sticky left-0 z-40 min-w-44 border-b border-r border-slate-200 px-3 py-2 text-left font-black dark:border-white/10 dark:bg-[#20152d]">Kırılım</th>}
              {visiblePivotColumns.map(([columnKey, values]) => <th key={columnKey} colSpan={measures.length} className="border-b border-r border-slate-200 px-3 py-2 text-center font-black dark:border-white/10">{values.join(' / ')}</th>)}
              <th colSpan={measures.length} className="border-b border-r border-slate-200 px-3 py-2 text-center font-black text-primary dark:border-white/10">Genel toplam</th>
            </tr>
            <tr>{[...visiblePivotColumns, ['__total__', []] as [string, string[]]].flatMap(([columnKey]) => measures.map((measure) => <th key={`${columnKey}-${measure}`} className="min-w-28 border-b border-r border-slate-200 px-3 py-2 text-right text-[10px] font-black uppercase dark:border-white/10">{MEASURES.find((item) => item.key === measure)!.label}</th>))}</tr>
          </thead>
          <tbody>
            {pivot.rows.map(([rowKey, values]) => <tr key={rowKey} className="hover:bg-primary/5">
              {hasRowDimensions ? values.map((value, index) => <td key={effectiveRowFields[index]} className={cn('border-b border-r border-slate-200 bg-white px-3 py-2 font-semibold dark:border-white/10 dark:bg-[#160d20]', index === 0 ? 'sticky left-0 z-10' : '')}>{value}</td>) : <td className="sticky left-0 z-10 border-b border-r border-slate-200 bg-white px-3 py-2 font-semibold dark:border-white/10 dark:bg-[#160d20]">Tümü</td>}
              {visiblePivotColumns.flatMap(([columnKey]) => measures.map((measure) => <td key={`${columnKey}-${measure}`} className="border-b border-r border-slate-200 px-3 py-2 text-right tabular-nums dark:border-white/10">{format(aggregateValue(pivot.cells.get(`${rowKey}\u0001${columnKey}`), measure), measure)}</td>))}
              {measures.map((measure) => <td key={`total-${measure}`} className="border-b border-r border-slate-200 bg-primary/5 px-3 py-2 text-right font-black tabular-nums dark:border-white/10">{format(aggregateValue(pivot.rowTotals.get(rowKey), measure), measure)}</td>)}
            </tr>)}
            {pivot.rows.length > 0 ? <tr className="sticky bottom-0 z-20 bg-slate-100 font-black dark:bg-[#20152d]">
              <td colSpan={Math.max(effectiveRowFields.length, 1)} className="sticky left-0 border-r border-t border-slate-200 px-3 py-2 dark:border-white/10">Genel toplam</td>
              {visiblePivotColumns.flatMap(([columnKey]) => measures.map((measure) => <td key={`${columnKey}-${measure}`} className="border-r border-t border-slate-200 px-3 py-2 text-right tabular-nums dark:border-white/10">{format(aggregateValue(pivot.columnTotals.get(columnKey), measure), measure)}</td>))}
              {measures.map((measure) => <td key={measure} className="border-r border-t border-slate-200 px-3 py-2 text-right text-primary tabular-nums dark:border-white/10">{format(aggregateValue(pivot.grandTotal, measure), measure)}</td>)}
            </tr> : null}
          </tbody>
        </table>
        {pivot.rows.length === 0 ? <div className="p-10 text-center text-sm text-slate-500">Seçilen kırılım ve filtrelerde hareket bulunamadı.</div> : null}
      </div>
    </div>
  );
}

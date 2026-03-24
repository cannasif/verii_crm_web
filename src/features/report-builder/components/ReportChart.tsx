import type { ReactElement } from 'react';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import type { ChartType } from '../types';
import { useRechartsModule } from '@/lib/useRechartsModule';

type ColumnItem = string | { name: string; sqlType?: string; dotNetType?: string; isNullable?: boolean };

interface ReportChartProps {
  columns: string[] | ColumnItem[];
  rows: unknown[][];
  chartType: ChartType;
  className?: string;
}

const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7c7c', '#8dd1e1', '#a4de6c'];

function ensureRowArray(row: unknown): unknown[] {
  if (Array.isArray(row)) return row;
  if (row !== null && typeof row === 'object') return Object.values(row);
  return [];
}

function columnToLabel(col: ColumnItem): string {
  return typeof col === 'string' ? col : (col?.name ?? '');
}

function normalizeColumns(cols: ColumnItem[]): string[] {
  return (cols ?? []).map((c) => columnToLabel(c));
}

export function ReportChart({ columns, rows, chartType, className }: ReportChartProps): ReactElement {
  const { t } = useTranslation('common');
  const recharts = useRechartsModule();
  const Recharts = recharts;
  const columnLabels = useMemo(() => normalizeColumns(columns), [columns]);
  const normalizedRows = useMemo(
    () => (Array.isArray(rows) ? rows.map(ensureRowArray) : []),
    [rows]
  );

  const tableData = useMemo(() => {
    return normalizedRows.map((row) => {
      const obj: Record<string, unknown> = {};
      columnLabels.forEach((col, i) => {
        obj[col] = row[i];
      });
      return obj;
    });
  }, [columnLabels, normalizedRows]);

  const [labelKey, valueKeys] = useMemo(() => {
    if (columnLabels.length === 0) return [undefined, [] as string[]];
    if (chartType === 'pie' || chartType === 'donut') {
      const valueCol =
        columnLabels.find((_, i) => {
          const sample = normalizedRows[0]?.[i];
          return typeof sample === 'number' || (typeof sample === 'string' && !Number.isNaN(Number(sample)));
        }) ?? columnLabels[0];
      const labelCol = columnLabels.find((c) => c !== valueCol) ?? columnLabels[0];
      return [labelCol, [valueCol]];
    }
    const labelCol = columnLabels[0];
    const valueCols = columnLabels.slice(1);
    return [labelCol, valueCols];
  }, [columnLabels, normalizedRows, chartType]);

  const matrixData = useMemo(() => {
    if (chartType !== 'matrix' || columnLabels.length < 3) return null;

    const rowKey = columnLabels[0];
    const legendKey = columnLabels[1];
    const metricKeys = columnLabels.slice(2);
    const rowLabels: string[] = [];
    const columnHeaders: string[] = [];
    const grid = new Map<string, Record<string, number | string>>();

    tableData.forEach((item) => {
      const rowLabel = String(item[rowKey] ?? '');
      const legendLabel = String(item[legendKey] ?? '');
      if (!rowLabels.includes(rowLabel)) rowLabels.push(rowLabel);

      metricKeys.forEach((metricKey) => {
        const header = metricKeys.length > 1 ? `${legendLabel} · ${metricKey}` : legendLabel;
        if (!columnHeaders.includes(header)) columnHeaders.push(header);
        const currentRow = grid.get(rowLabel) ?? {};
        currentRow[header] = (item[metricKey] as number | string | undefined) ?? '';
        grid.set(rowLabel, currentRow);
      });
    });

    return { rowKey, rowLabels, columnHeaders, grid };
  }, [chartType, columnLabels, tableData]);

  if (columnLabels.length === 0 || normalizedRows.length === 0) {
    return (
        <div className={cn('flex h-48 items-center justify-center text-muted-foreground text-sm', className)}>
        {t('common.noData')}
      </div>
    );
  }

  if (chartType === 'table') {
    return (
      <div className={cn('max-h-[400px] space-y-2', className)}>
        <div
          className="max-h-[360px] overflow-x-auto overflow-y-auto pb-2"
          style={{ scrollbarGutter: 'stable both-edges' }}
        >
          <Table className="w-full table-fixed text-xs">
            <TableHeader>
              <TableRow>
                {columnLabels.map((col, i) => (
                  <TableHead key={col || i} className="whitespace-normal wrap-break-word align-top">
                    {col}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {normalizedRows.slice(0, 5000).map((row, ri) => (
                <TableRow key={ri}>
                  {row.map((cell, ci) => (
                    <TableCell key={ci} className="whitespace-normal wrap-break-word align-top">
                      {String(cell ?? '')}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    );
  }

  if (chartType === 'matrix' && matrixData) {
    return (
      <div className={cn('max-h-[400px] space-y-2', className)}>
        <div
          className="max-h-[360px] overflow-x-auto overflow-y-auto pb-2"
          style={{ scrollbarGutter: 'stable both-edges' }}
        >
          <Table className="w-full table-fixed text-xs">
            <TableHeader>
              <TableRow>
                <TableHead className="whitespace-normal wrap-break-word align-top">{matrixData.rowKey}</TableHead>
                {matrixData.columnHeaders.map((header) => (
                  <TableHead key={header} className="whitespace-normal wrap-break-word align-top">
                    {header}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {matrixData.rowLabels.map((rowLabel) => {
                const cells = matrixData.grid.get(rowLabel) ?? {};
                return (
                  <TableRow key={rowLabel}>
                    <TableCell className="font-medium whitespace-normal wrap-break-word align-top">{rowLabel}</TableCell>
                    {matrixData.columnHeaders.map((header) => (
                      <TableCell key={`${rowLabel}-${header}`} className="whitespace-normal wrap-break-word align-top">
                        {String(cells[header] ?? '')}
                      </TableCell>
                    ))}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>
    );
  }

  if (!Recharts) {
    return (
        <div className={cn('flex h-48 items-center justify-center text-muted-foreground text-sm', className)}>
        {t('common.reportBuilder.loadingChart')}
      </div>
    );
  }

  if (chartType === 'kpi') {
    const numericCells = normalizedRows.flat().filter((value) => typeof value === 'number' || (typeof value === 'string' && !Number.isNaN(Number(value))));
    const primaryValue = numericCells.length > 0 ? Number(numericCells[0]) : 0;
    const secondaryValue = numericCells.length > 1 ? Number(numericCells[1]) : null;
    const secondaryDiff = secondaryValue != null && secondaryValue !== 0
      ? (((primaryValue - secondaryValue) / Math.abs(secondaryValue)) * 100).toFixed(1)
      : null;

    return (
      <div className={cn('grid h-full min-h-[220px] gap-4 md:grid-cols-2', className)}>
        <div className="rounded-xl border bg-linear-to-br from-primary/10 to-background p-6">
          <div className="text-muted-foreground text-xs uppercase tracking-[0.2em]">{t('common.reportBuilder.primaryKpi')}</div>
          <div className="mt-4 text-4xl font-bold tracking-tight">{primaryValue.toLocaleString()}</div>
          <div className="text-muted-foreground mt-2 text-sm">{columnLabels.find(Boolean) ?? t('common.reportBuilder.value')}</div>
        </div>
        <div className="rounded-xl border bg-card p-6">
          <div className="text-muted-foreground text-xs uppercase tracking-[0.2em]">{t('common.reportBuilder.comparison')}</div>
          <div className="mt-4 text-2xl font-semibold">
            {secondaryValue != null ? secondaryValue.toLocaleString() : t('common.reportBuilder.emptyDash')}
          </div>
          <div className="mt-2 text-sm font-medium text-primary">
            {secondaryDiff != null ? t('common.reportBuilder.deltaSuffix', { value: secondaryDiff }) : t('common.reportBuilder.noComparisonValue')}
          </div>
        </div>
      </div>
    );
  }

  if ((chartType === 'pie' || chartType === 'donut') && labelKey && valueKeys.length > 0) {
    const data = tableData.map((r) => ({
      name: String(r[labelKey] ?? ''),
      value: Number(r[valueKeys[0]]) || 0,
    }));
    return (
      <div className={cn('h-[300px] w-full', className)}>
        <Recharts.ResponsiveContainer width="100%" height="100%">
          <Recharts.PieChart>
            <Recharts.Pie
              data={data}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={80}
              innerRadius={chartType === 'donut' ? 45 : 0}
              label
            >
              {data.map((_, i) => (
                <Recharts.Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Recharts.Pie>
            <Recharts.Tooltip />
            <Recharts.Legend />
          </Recharts.PieChart>
        </Recharts.ResponsiveContainer>
      </div>
    );
  }

  if ((chartType === 'bar' || chartType === 'stackedBar' || chartType === 'line') && labelKey) {
    const ChartComponent =
      chartType === 'line'
        ? Recharts.LineChart
        : Recharts.BarChart;
    return (
      <div className={cn('h-[300px] w-full', className)}>
        <Recharts.ResponsiveContainer width="100%" height="100%">
          <ChartComponent data={tableData}>
            <Recharts.CartesianGrid strokeDasharray="3 3" />
            <Recharts.XAxis dataKey={labelKey} />
            <Recharts.YAxis />
            <Recharts.Tooltip />
            <Recharts.Legend />
            {valueKeys.map((key, i) =>
              chartType === 'bar' || chartType === 'stackedBar' ? (
                <Recharts.Bar
                  key={key}
                  dataKey={key}
                  fill={COLORS[i % COLORS.length]}
                  stackId={chartType === 'stackedBar' ? 'stack' : undefined}
                />
              ) : (
                <Recharts.Line key={key} type="monotone" dataKey={key} stroke={COLORS[i % COLORS.length]} />
              )
            )}
          </ChartComponent>
        </Recharts.ResponsiveContainer>
      </div>
    );
  }

  return (
      <div className={cn('flex h-48 items-center justify-center text-muted-foreground text-sm', className)}>
      {t('common.noData')}
    </div>
  );
}

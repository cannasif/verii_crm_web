import type { ReactElement } from 'react';
import { useMemo } from 'react';
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
    if (chartType === 'pie') {
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

  if (columnLabels.length === 0 || normalizedRows.length === 0) {
    return (
      <div className={cn('flex h-48 items-center justify-center text-muted-foreground text-sm', className)}>
        No data
      </div>
    );
  }

  if (chartType === 'table') {
    return (
      <div className={cn('max-h-[400px] overflow-auto', className)}>
        <Table>
          <TableHeader>
            <TableRow>
              {columnLabels.map((col, i) => (
                <TableHead key={col || i}>{col}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {normalizedRows.slice(0, 5000).map((row, ri) => (
              <TableRow key={ri}>
                {row.map((cell, ci) => (
                  <TableCell key={ci}>{String(cell ?? '')}</TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  }

  if (!Recharts) {
    return (
      <div className={cn('flex h-48 items-center justify-center text-muted-foreground text-sm', className)}>
        Loading chart...
      </div>
    );
  }

  if (chartType === 'pie' && labelKey && valueKeys.length > 0) {
    const data = tableData.map((r) => ({
      name: String(r[labelKey] ?? ''),
      value: Number(r[valueKeys[0]]) || 0,
    }));
    return (
      <div className={cn('h-[300px] w-full', className)}>
        <Recharts.ResponsiveContainer width="100%" height="100%">
          <Recharts.PieChart>
            <Recharts.Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
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

  if ((chartType === 'bar' || chartType === 'line') && labelKey) {
    const ChartComponent = chartType === 'bar' ? Recharts.BarChart : Recharts.LineChart;
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
              chartType === 'bar' ? (
                <Recharts.Bar key={key} dataKey={key} fill={COLORS[i % COLORS.length]} />
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
      No data
    </div>
  );
}

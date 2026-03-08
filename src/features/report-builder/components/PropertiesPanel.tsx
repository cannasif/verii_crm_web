import type { ReactElement } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useReportBuilderStore } from '../store';
import type { ChartType, Aggregation, DateGrouping } from '../types';
import { getOperatorsForField } from '../utils';
import type { Field } from '../types';
import { GripVertical, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const CHART_TYPES: { value: ChartType; label: string }[] = [
  { value: 'table', label: 'Table' },
  { value: 'bar', label: 'Bar' },
  { value: 'line', label: 'Line' },
  { value: 'pie', label: 'Pie' },
];

const AGGREGATIONS: { value: Aggregation; label: string }[] = [
  { value: 'sum', label: 'Sum' },
  { value: 'count', label: 'Count' },
  { value: 'avg', label: 'Avg' },
  { value: 'min', label: 'Min' },
  { value: 'max', label: 'Max' },
];

const DATE_GROUPINGS: { value: DateGrouping; label: string }[] = [
  { value: 'day', label: 'Day' },
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month' },
  { value: 'year', label: 'Year' },
];

interface PropertiesPanelProps {
  schema: Field[];
  slotError: string | null;
  disabled?: boolean;
}

export function PropertiesPanel({ schema, slotError: _slotError, disabled }: PropertiesPanelProps): ReactElement {
  const { t } = useTranslation('common');
  const {
    config,
    setChartType,
    setDateGrouping,
    setSorting,
    setAggregation,
    removeFromSlot,
    updateFilter,
    removeFilter,
  } = useReportBuilderStore();

  const axisField = config.axis?.field;
  const axisSchema = schema.find((f) => f.name === axisField);

  if (disabled) {
    return (
      <div className="space-y-4">
        <p className="text-muted-foreground text-sm">{t('common.reportBuilder.checkFirst')}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 overflow-y-auto">
      <div className="space-y-2">
        <Label>{t('common.reportBuilder.chartType')}</Label>
        <Select value={config.chartType} onValueChange={(v) => setChartType(v as ChartType)}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CHART_TYPES.map((t) => (
              <SelectItem key={t.value} value={t.value}>
                {t.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {config.axis &&
        axisSchema &&
        (axisSchema.dotNetType?.includes('DateTime') ?? axisSchema.sqlType?.toLowerCase().includes('date')) && (
          <div className="space-y-2">
            <Label>{t('common.reportBuilder.dateGrouping')}</Label>
            <Select
              value={config.axis.dateGrouping ?? 'day'}
              onValueChange={(v) => setDateGrouping(v as DateGrouping)}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DATE_GROUPINGS.map((g) => (
                  <SelectItem key={g.value} value={g.value}>
                    {g.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

      <div className="space-y-2">
        <Label>{t('common.reportBuilder.sorting')}</Label>
        <div className="flex gap-2">
          <Select
            value={config.sorting?.by ?? 'axis'}
            onValueChange={(by) =>
              setSorting({
                by: by as 'axis' | 'value',
                direction: config.sorting?.direction ?? 'asc',
                valueField: config.sorting?.valueField,
              })
            }
          >
            <SelectTrigger className="flex-1">
              <SelectValue placeholder={t('common.reportBuilder.sortBy')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="axis">{t('common.reportBuilder.axis')}</SelectItem>
              <SelectItem value="value">{t('common.reportBuilder.value')}</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={config.sorting?.direction ?? 'asc'}
            onValueChange={(direction) =>
              setSorting({
                by: config.sorting?.by ?? 'axis',
                direction: direction as 'asc' | 'desc',
                valueField: config.sorting?.valueField,
              })
            }
          >
            <SelectTrigger className="w-24">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="asc">{t('common.reportBuilder.asc')}</SelectItem>
              <SelectItem value="desc">{t('common.reportBuilder.desc')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {config.values.length > 0 && (
        <div className="space-y-2">
          <Label>{t('common.reportBuilder.valuesAggregation')}</Label>
          <div className="space-y-1">
            {config.values.map((v, i) => (
              <div key={`${v.field}-${i}`} className="flex items-center gap-1 rounded bg-muted/50 px-2 py-1 text-sm">
                <GripVertical className="size-3.5 text-muted-foreground" />
                <span className="flex-1 truncate">{v.field}</span>
                <Select value={v.aggregation} onValueChange={(agg) => setAggregation(i, agg as Aggregation)}>
                  <SelectTrigger className="h-7 w-20 border-0 bg-transparent px-1 shadow-none">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {AGGREGATIONS.map((a) => (
                      <SelectItem key={a.value} value={a.value}>
                        {a.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button type="button" variant="ghost" size="icon-sm" onClick={() => removeFromSlot('values', i)} aria-label="Remove">
                  <X className="size-3" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {config.filters.length > 0 && (
        <div className="space-y-2">
          <Label>{t('common.reportBuilder.filtersOperator')}</Label>
          <div className="space-y-1">
            {config.filters.map((f, i) => {
              const fieldSchema = schema.find((s) => s.name === f.field);
              const operators = fieldSchema ? getOperatorsForField(fieldSchema) : ['eq', 'ne'];
              return (
                <div key={`${f.field}-${i}`} className="flex items-center gap-1 rounded bg-muted/50 px-2 py-1 text-sm">
                  <GripVertical className="size-3.5 text-muted-foreground" />
                  <span className="flex-1 truncate">{f.field}</span>
                  <Select value={f.operator} onValueChange={(op) => updateFilter(i, { operator: op })}>
                    <SelectTrigger className="h-7 w-24 border-0 bg-transparent px-1 shadow-none">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {operators.map((op) => (
                        <SelectItem key={op} value={op}>
                          {op}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button type="button" variant="ghost" size="icon-sm" onClick={() => removeFilter(i)} aria-label="Remove">
                    <X className="size-3" />
                  </Button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

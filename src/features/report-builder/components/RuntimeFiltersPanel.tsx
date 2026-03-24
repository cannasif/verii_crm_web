import type { ReactElement } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useReportBuilderStore } from '../store';
import type { Field } from '../types';
import { getFieldSemanticType, getOperatorsForField } from '../utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Filter, RefreshCw, RotateCcw } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const OPERATOR_LABELS: Record<string, string> = {
  eq: '=',
  ne: '!=',
  gt: '>',
  gte: '>=',
  lt: '<',
  lte: '<=',
  between: 'Between',
  contains: 'Contains',
  startsWith: 'Starts with',
  endsWith: 'Ends with',
  in: 'In list',
  isNull: 'Is empty',
  isNotNull: 'Has value',
};

function getInputType(field?: Field): 'text' | 'number' | 'date' {
  if (!field) return 'text';
  const semanticType = getFieldSemanticType(field);
  if (semanticType === 'number') return 'number';
  if (semanticType === 'date') return 'date';
  return 'text';
}

interface RuntimeFiltersPanelProps {
  schema: Field[];
  loading?: boolean;
  onApply: () => void;
  onReset: () => void;
}

export function RuntimeFiltersPanel({
  schema,
  loading,
  onApply,
  onReset,
}: RuntimeFiltersPanelProps): ReactElement {
  const { t } = useTranslation('common');
  const { config, updateFilter } = useReportBuilderStore();
  const hasRuntimeFilters = config.filters.length > 0;

  if (!hasRuntimeFilters) {
    return <></>;
  }

  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Filter className="size-4 text-muted-foreground" />
          <div>
            <h3 className="text-sm font-semibold">{t('common.reportBuilder.runtimeFilters')}</h3>
            <p className="text-muted-foreground text-xs">{t('common.reportBuilder.runtimeFiltersDescription')}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={onReset}>
            <RotateCcw className="mr-2 size-4" />
            {t('common.reset')}
          </Button>
          <Button size="sm" onClick={onApply} disabled={loading}>
            <RefreshCw className="mr-2 size-4" />
            {t('common.apply')}
          </Button>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {config.filters.map((filter, index) => {
          const field = schema.find((item) => item.name === filter.field);
          const operators = field ? getOperatorsForField(field) : ['eq', 'ne'];
          const inputType = getInputType(field);
          const isUnary = filter.operator === 'isNull' || filter.operator === 'isNotNull';
          const isBetween = filter.operator === 'between';
          const isList = filter.operator === 'in';

          return (
            <div key={`${filter.field}-${index}`} className="rounded-md border bg-muted/30 p-3">
              <div className="mb-2 flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">{filter.field}</div>
                  <div className="text-muted-foreground text-xs">{field?.dotNetType ?? field?.sqlType ?? t('common.reportBuilder.field')}</div>
                </div>
                <Select
                  value={filter.operator}
                  onValueChange={(operator) =>
                    updateFilter(index, { operator, value: undefined, values: undefined, from: undefined, to: undefined })
                  }
                >
                  <SelectTrigger className="h-8 w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {operators.map((operator) => (
                      <SelectItem key={operator} value={operator}>
                        {OPERATOR_LABELS[operator] ?? operator}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {!isUnary && (
                <div className="space-y-2">
                  {isBetween && (
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label className="text-xs">{t('common.reportBuilder.from')}</Label>
                        <Input
                          type={inputType}
                          value={String(filter.from ?? '')}
                          onChange={(e) => updateFilter(index, { from: e.target.value })}
                          className="h-8"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">{t('common.reportBuilder.to')}</Label>
                        <Input
                          type={inputType}
                          value={String(filter.to ?? '')}
                          onChange={(e) => updateFilter(index, { to: e.target.value })}
                          className="h-8"
                        />
                      </div>
                    </div>
                  )}

                  {isList && (
                    <div className="space-y-1">
                      <Label className="text-xs">{t('common.reportBuilder.values')}</Label>
                      <Input
                        value={Array.isArray(filter.values) ? filter.values.map((item) => String(item ?? '')).join(', ') : ''}
                        onChange={(e) =>
                          updateFilter(index, {
                            values: e.target.value.split(',').map((item) => item.trim()).filter(Boolean),
                          })
                        }
                        placeholder={t('common.reportBuilder.valuesListPlaceholder')}
                        className="h-8"
                      />
                    </div>
                  )}

                  {!isBetween && !isList && (
                    <div className="space-y-1">
                      <Label className="text-xs">{t('common.reportBuilder.value')}</Label>
                      <Input
                        type={inputType}
                        value={String(filter.value ?? '')}
                        onChange={(e) => updateFilter(index, { value: e.target.value })}
                        className="h-8"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

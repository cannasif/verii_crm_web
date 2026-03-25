import { type ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { FilterRow, FilterColumnConfig } from '@/lib/advanced-filter-types';
import {
  getOperatorsForColumn,
  getDefaultOperatorForColumn,
} from '@/lib/advanced-filter-types';
import { Plus, Search, Trash2 } from 'lucide-react';

export interface AdvancedFilterProps {
  columns: readonly FilterColumnConfig[];
  defaultColumn: string;
  draftRows: FilterRow[];
  onDraftRowsChange: (rows: FilterRow[]) => void;
  filterLogic?: 'and' | 'or';
  onFilterLogicChange?: (value: 'and' | 'or') => void;
  onSearch: () => void;
  onClear: () => void;
  translationNamespace?: string;
  embedded?: boolean;
}

const OPERATOR_LABEL_KEY_MAP: Record<string, string> = {
  contains: 'Contains',
  startsWith: 'StartsWith',
  endsWith: 'EndsWith',
  equals: 'Equals',
  '>': '>',
  '>=': '>=',
  '<': '<',
  '<=': '<=',
};

const OPERATOR_LABEL_TR_FALLBACK: Record<string, string> = {
  contains: 'İçerir',
  startsWith: 'Şununla başlar',
  endsWith: 'Şununla biter',
  equals: 'Eşittir',
  '>': '>',
  '>=': '>=',
  '<': '<',
  '<=': '<=',
};

function generateId(): string {
  return `filter-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function AdvancedFilter({
  columns,
  defaultColumn,
  draftRows,
  onDraftRowsChange,
  filterLogic = 'and',
  onFilterLogicChange,
  onSearch,
  onClear,
  translationNamespace = 'common',
  embedded = false,
}: AdvancedFilterProps): ReactElement {
  const { t } = useTranslation([translationNamespace, 'common']);
  const MISSING_TRANSLATION = 'Çeviri eksik';

  const addRow = (): void => {
    onDraftRowsChange([
      ...draftRows,
      { id: generateId(), column: defaultColumn, operator: getDefaultOperatorForColumn(defaultColumn, columns), value: '' },
    ]);
  };

  const removeRow = (id: string): void => {
    onDraftRowsChange(draftRows.filter((r) => r.id !== id));
  };

  const updateRow = (id: string, patch: Partial<Omit<FilterRow, 'id'>>): void => {
    onDraftRowsChange(
      draftRows.map((r) => {
        if (r.id !== id) return r;
        const next = { ...r, ...patch };
        if (patch.column !== undefined) {
          next.operator = getDefaultOperatorForColumn(patch.column, columns);
        }
        return next;
      })
    );
  };

  const getLabel = (key: string, fallback?: string): string => {
    const commonVal = t(`advancedFilter.${key}`, { ns: 'common' });
    if (commonVal && commonVal !== MISSING_TRANSLATION && commonVal !== `advancedFilter.${key}`) return commonVal;
    const nsVal = t(`advancedFilter.${key}`, { ns: translationNamespace });
    if (nsVal && nsVal !== MISSING_TRANSLATION && nsVal !== `advancedFilter.${key}`) return nsVal;
    return fallback ?? key;
  };

  const getOperatorLabel = (operator: string): string => {
    const mapped = OPERATOR_LABEL_KEY_MAP[operator] ?? operator;
    const key = `advancedFilter.operator${mapped}`;

    const commonVal = t(key, { ns: 'common' });
    if (commonVal && commonVal !== MISSING_TRANSLATION && commonVal !== key) return commonVal;

    const nsVal = t(key, { ns: translationNamespace });
    if (nsVal && nsVal !== MISSING_TRANSLATION && nsVal !== key) return nsVal;

    const opLower = operator.toLowerCase();
    let trFallback: string | undefined = OPERATOR_LABEL_TR_FALLBACK[operator];
    if (!trFallback) {
      switch (opLower) {
        case 'contains':
          trFallback = 'İçerir';
          break;
        case 'startswith':
          trFallback = 'Şununla başlar';
          break;
        case 'endswith':
          trFallback = 'Şununla biter';
          break;
        case 'equals':
          trFallback = 'Eşittir';
          break;
        default:
          break;
      }
    }
    if (trFallback) return trFallback;

    return operator;
  };

  return (
    <div className={embedded ? 'p-4 space-y-4' : 'rounded-xl border border-slate-200 dark:border-white/10 bg-white/50 dark:bg-card/50 p-4 space-y-4'}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
          {getLabel('title', 'Gelişmiş Filtre')}
        </h3>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" onClick={addRow}>
            <Plus className="h-4 w-4 mr-1" />
            {getLabel('add', 'Filtre Ekle')}
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={onClear}>
            {getLabel('clear', 'Temizle')}
          </Button>
          <Button type="button" size="sm" onClick={onSearch}>
            <Search className="h-4 w-4 mr-1" />
            {getLabel('search', 'Ara')}
          </Button>
        </div>
      </div>
      {onFilterLogicChange && (
        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
          <span className="text-sm font-medium text-slate-600 dark:text-slate-300">
            {getLabel('logic', 'Koşul')}
          </span>
          <Select value={filterLogic} onValueChange={(value: 'and' | 'or') => onFilterLogicChange(value)}>
            <SelectTrigger className="w-full sm:w-[140px]">
              <SelectValue placeholder={getLabel('logic')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="and">{getLabel('logicAnd', 'AND')}</SelectItem>
              <SelectItem value="or">{getLabel('logicOr', 'OR')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}
      {draftRows.length > 0 && (
        <div className="space-y-2">
          {draftRows.map((row) => {
            const colConfig = columns.find((c) => c.value === row.column);
            const inputType = colConfig?.type === 'date' ? 'date' : colConfig?.type === 'number' ? 'number' : 'text';
            return (
              <div key={row.id} className="flex flex-wrap items-center gap-2">
                <Select
                  value={row.column}
                  onValueChange={(v) => updateRow(row.id, { column: v })}
                >
                  <SelectTrigger className="w-full sm:w-[160px]">
                    <SelectValue placeholder={getLabel('column')} />
                  </SelectTrigger>
                  <SelectContent>
                    {columns.map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        {t(c.labelKey, { ns: translationNamespace, defaultValue: c.value })}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={row.operator}
                  onValueChange={(v) => updateRow(row.id, { operator: v })}
                >
                  <SelectTrigger className="w-full sm:w-[130px]">
                    <SelectValue placeholder={getLabel('operator')} />
                  </SelectTrigger>
                  <SelectContent>
                    {getOperatorsForColumn(row.column, columns).map((op) => (
                      <SelectItem key={op} value={op}>
                        {getOperatorLabel(op)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {colConfig?.type === 'boolean' ? (
                  <Select
                    value={row.value.toLowerCase() === 'true' ? 'true' : row.value.toLowerCase() === 'false' ? 'false' : '_none'}
                    onValueChange={(v) => updateRow(row.id, { value: v === '_none' ? '' : v })}
                  >
                    <SelectTrigger className="w-full sm:w-[160px]">
                      <SelectValue placeholder={getLabel('value')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_none">{getLabel('value')}</SelectItem>
                      <SelectItem value="true">{t('advancedFilter.true', { ns: 'common' })}</SelectItem>
                      <SelectItem value="false">{t('advancedFilter.false', { ns: 'common' })}</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    type={inputType}
                    placeholder={getLabel('value')}
                    value={row.value}
                    onChange={(e) => updateRow(row.id, { value: e.target.value })}
                    className="w-full sm:w-[160px]"
                  />
                )}
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="shrink-0 text-slate-500 hover:text-destructive"
                  onClick={() => removeRow(row.id)}
                  aria-label={getLabel('remove')}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

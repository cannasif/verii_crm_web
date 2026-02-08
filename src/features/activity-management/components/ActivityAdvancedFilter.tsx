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
import type { ActivityFilterRow } from '../types/activity-filter.types';
import {
  ACTIVITY_FILTER_COLUMNS,
  getOperatorsForColumn,
  getDefaultOperatorForColumn,
  isBoolColumn,
} from '../types/activity-filter.types';
import { Plus, Search, Trash2 } from 'lucide-react';

const BOOL_SELECT_VALUE_TRUE = '__true__';
const BOOL_SELECT_VALUE_FALSE = '__false__';
const BOOL_SELECT_VALUE_NONE = '__none__';

export interface ActivityAdvancedFilterProps {
  draftRows: ActivityFilterRow[];
  onDraftRowsChange: (rows: ActivityFilterRow[]) => void;
  onSearch: () => void;
  onClear: () => void;
}

function generateId(): string {
  return `filter-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function ActivityAdvancedFilter({
  draftRows,
  onDraftRowsChange,
  onSearch,
  onClear,
}: ActivityAdvancedFilterProps): ReactElement {
  const { t } = useTranslation(['activity-management']);

  const addRow = (): void => {
    onDraftRowsChange([
      ...draftRows,
      { id: generateId(), column: 'Subject', operator: 'Contains', value: '' },
    ]);
  };

  const removeRow = (id: string): void => {
    onDraftRowsChange(draftRows.filter((r) => r.id !== id));
  };

  const updateRow = (id: string, patch: Partial<Omit<ActivityFilterRow, 'id'>>): void => {
    onDraftRowsChange(
      draftRows.map((r) => {
        if (r.id !== id) return r;
        const next = { ...r, ...patch };
        if (patch.column !== undefined) {
          next.operator = getDefaultOperatorForColumn(patch.column);
          if (patch.column !== r.column && isBoolColumn(patch.column)) next.value = '';
          else if (!isBoolColumn(patch.column) && isBoolColumn(r.column)) next.value = '';
        }
        return next;
      })
    );
  };

  return (
    <div className="rounded-xl border border-slate-200 dark:border-white/10 bg-white/50 dark:bg-card/50 p-4 space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
          {t('advancedFilter.title', 'Advanced Filter')}
        </h3>
        <div className="flex gap-2">
          <Button type="button" variant="outline" size="sm" onClick={addRow}>
            <Plus className="h-4 w-4 mr-1" />
            {t('advancedFilter.add', 'Add Filter')}
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={onClear}>
            {t('advancedFilter.clear', 'Clear')}
          </Button>
          <Button type="button" size="sm" onClick={onSearch}>
            <Search className="h-4 w-4 mr-1" />
            {t('advancedFilter.search', 'Search')}
          </Button>
        </div>
      </div>
      {draftRows.length > 0 && (
        <div className="space-y-2">
          {draftRows.map((row) => (
            <div key={row.id} className="flex flex-wrap items-center gap-2">
              <Select
                value={row.column}
                onValueChange={(v) => updateRow(row.id, { column: v })}
              >
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder={t('advancedFilter.column', 'Column')} />
                </SelectTrigger>
                <SelectContent>
                  {ACTIVITY_FILTER_COLUMNS.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {t(c.labelKey, c.value)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={row.operator}
                onValueChange={(v) => updateRow(row.id, { operator: v })}
              >
                <SelectTrigger className="w-[130px]">
                  <SelectValue placeholder={t('advancedFilter.operator', 'Operator')} />
                </SelectTrigger>
                <SelectContent>
                  {getOperatorsForColumn(row.column).map((op) => (
                    <SelectItem key={op} value={op}>
                      {t(`advancedFilter.operator${op}`, op)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {isBoolColumn(row.column) ? (
                <Select
                  value={
                    row.value.toLowerCase() === 'true'
                      ? BOOL_SELECT_VALUE_TRUE
                      : row.value.toLowerCase() === 'false'
                        ? BOOL_SELECT_VALUE_FALSE
                        : BOOL_SELECT_VALUE_NONE
                  }
                  onValueChange={(v) =>
                    updateRow(row.id, {
                      value:
                        v === BOOL_SELECT_VALUE_TRUE ? 'true' : v === BOOL_SELECT_VALUE_FALSE ? 'false' : '',
                    })
                  }
                >
                  <SelectTrigger className="w-[120px]">
                    <SelectValue placeholder={t('advancedFilter.value', 'Value')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={BOOL_SELECT_VALUE_NONE}>
                      {t('advancedFilter.value', 'Value')}
                    </SelectItem>
                    <SelectItem value={BOOL_SELECT_VALUE_TRUE}>
                      {t('advancedFilter.true', 'True')}
                    </SelectItem>
                    <SelectItem value={BOOL_SELECT_VALUE_FALSE}>
                      {t('advancedFilter.false', 'False')}
                    </SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  type={row.column === 'DueDate' ? 'date' : 'text'}
                  placeholder={t('advancedFilter.value', 'Value')}
                  value={row.value}
                  onChange={(e) => updateRow(row.id, { value: e.target.value })}
                  className="w-[160px]"
                />
              )}
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="shrink-0 text-slate-500 hover:text-destructive"
                onClick={() => removeRow(row.id)}
                aria-label={t('advancedFilter.remove', 'Remove row')}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

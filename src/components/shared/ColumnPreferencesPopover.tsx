import { type ReactElement, useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Columns3, EyeOff, Eye, ArrowUp, ArrowDown } from 'lucide-react';
import { saveColumnPreferences } from '@/lib/column-preferences';

const ID_COLUMN_KEY = 'id';

export interface ColumnDef {
  key: string;
  label: string;
}

interface ColumnPreferencesPopoverProps {
  pageKey: string;
  userId?: number;
  columns: ColumnDef[];
  visibleColumns: string[];
  columnOrder: string[];
  onVisibleColumnsChange: (visible: string[]) => void;
  onColumnOrderChange: (order: string[]) => void;
}

export function ColumnPreferencesPopover({
  pageKey,
  userId,
  columns,
  visibleColumns,
  columnOrder,
  onVisibleColumnsChange,
  onColumnOrderChange,
}: ColumnPreferencesPopoverProps): ReactElement {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const columnMap = useMemo(() => new Map(columns.map((c) => [c.key, c])), [columns]);

  const displayColumns = columnOrder.filter((k) => visibleColumns.includes(k));
  const hiddenColumns = columnOrder.filter((k) => !visibleColumns.includes(k));

  const toggleColumn = (key: string): void => {
    if (key === ID_COLUMN_KEY) return;
    const next = visibleColumns.includes(key)
      ? visibleColumns.filter((k) => k !== key)
      : [...visibleColumns, key].sort((a, b) => columnOrder.indexOf(a) - columnOrder.indexOf(b));
    onVisibleColumnsChange(next);
    saveColumnPreferences(pageKey, userId, { order: columnOrder, visibleKeys: next });
  };

  const moveColumn = (key: string, direction: 'up' | 'down'): void => {
    if (key === ID_COLUMN_KEY) return;
    const visibleOrdered = columnOrder.filter((k) => visibleColumns.includes(k));
    const idx = visibleOrdered.indexOf(key);
    if (idx < 0) return;
    const newIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (newIdx < 0 || newIdx >= visibleOrdered.length) return;
    const next = [...visibleOrdered];
    [next[idx], next[newIdx]] = [next[newIdx], next[idx]];
    const hidden = columnOrder.filter((k) => !visibleColumns.includes(k));
    const newOrder = [...next, ...hidden];
    onColumnOrderChange(newOrder);
    onVisibleColumnsChange(next);
    saveColumnPreferences(pageKey, userId, { order: newOrder, visibleKeys: next });
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-9 border-dashed border-slate-300 dark:border-white/20 bg-transparent hover:bg-slate-50 dark:hover:bg-white/5 text-xs sm:text-sm"
        >
          <Columns3 className="mr-2 h-4 w-4" />
          {t('common.editColumns')}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 p-0 bg-white/95 dark:bg-[#1a1025]/95 backdrop-blur-xl border border-slate-200 dark:border-white/10 shadow-xl rounded-xl z-50">
        <div className="p-2 space-y-2">
          <div className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider px-2 py-1.5">
            {t('activityManagement.columnCustomization.visibleColumns')}
          </div>
          <div className="space-y-1 max-h-48 overflow-y-auto">
            {displayColumns.map((key) => {
              const col = columnMap.get(key);
              if (!col) return null;
              const isId = key === ID_COLUMN_KEY;
              const idx = displayColumns.indexOf(key);
              return (
                <div
                  key={key}
                  className="flex items-center gap-1 rounded-lg px-2 py-1.5 hover:bg-slate-50 dark:hover:bg-white/5 group"
                >
                  <div className="flex items-center gap-1 flex-1 min-w-0">
                    {!isId && (
                      <>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 shrink-0 opacity-0 group-hover:opacity-100"
                          onClick={() => moveColumn(key, 'up')}
                          disabled={idx <= 1}
                        >
                          <ArrowUp className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 shrink-0 opacity-0 group-hover:opacity-100"
                          onClick={() => moveColumn(key, 'down')}
                          disabled={idx >= displayColumns.length - 1}
                        >
                          <ArrowDown className="h-3.5 w-3.5" />
                        </Button>
                      </>
                    )}
                    <span className="text-sm truncate">{col.label}</span>
                  </div>
                  {!isId && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 shrink-0 text-slate-400 hover:text-destructive"
                      onClick={() => toggleColumn(key)}
                      title={t('activityManagement.columnCustomization.hiddenColumns')}
                    >
                      <EyeOff className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
          {hiddenColumns.length > 0 && (
            <>
              <div className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider px-2 py-1.5 pt-2 border-t border-slate-100 dark:border-white/10">
                {t('activityManagement.columnCustomization.hiddenColumns')}
              </div>
              <div className="space-y-1">
                {hiddenColumns.map((key) => {
                  const col = columnMap.get(key);
                  if (!col) return null;
                  return (
                    <div
                      key={key}
                      className="flex items-center justify-between rounded-lg px-2 py-1.5 hover:bg-slate-50 dark:hover:bg-white/5"
                    >
                      <span className="text-sm text-slate-500 dark:text-slate-400 truncate">
                        {col.label}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 shrink-0"
                        onClick={() => toggleColumn(key)}
                        title={t('activityManagement.columnCustomization.visibleColumns')}
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

import { type ReactElement, useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { usePermissionDefinitionsQuery } from '../hooks/usePermissionDefinitionsQuery';
import { getPermissionDisplayMeta, getPermissionModuleDisplayMeta, isLeafPermissionCode } from '../utils/permission-config';

interface PermissionDefinitionMultiSelectProps {
  value: number[];
  onChange: (ids: number[]) => void;
  disabled?: boolean;
}

export function PermissionDefinitionMultiSelect({
  value,
  onChange,
  disabled = false,
}: PermissionDefinitionMultiSelectProps): ReactElement {
  const { t } = useTranslation(['access-control', 'common']);
  const { data, isLoading } = usePermissionDefinitionsQuery({
    pageNumber: 1,
    pageSize: 1000,
    sortBy: 'code',
    sortDirection: 'asc',
  });

  const items = (data?.data ?? []).filter((d) => d.isActive && isLeafPermissionCode(d.code));
  const [search, setSearch] = useState('');

  const getDisplayLabel = useCallback(
    (code: string, name: string | null | undefined): string => {
      const trimmedName = (name ?? '').trim();
      if (trimmedName) return trimmedName;
      const meta = getPermissionDisplayMeta(code);
      if (meta) return t(meta.key, meta.fallback);
      return code;
    },
    [t]
  );

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter((item) => {
      const display = getDisplayLabel(item.code, item.name);
      return (item.code ?? '').toLowerCase().includes(q) || (item.name ?? '').toLowerCase().includes(q) || display.toLowerCase().includes(q);
    });
  }, [items, search, getDisplayLabel]);

  const groupedItems = useMemo(() => {
    const buckets = new Map<string, typeof filteredItems>();
    for (const item of filteredItems) {
      const prefix = (item.code ?? '').split('.').filter(Boolean)[0] ?? 'other';
      const meta = getPermissionModuleDisplayMeta(prefix);
      const groupLabel = meta ? t(meta.key, meta.fallback) : prefix;
      const existing = buckets.get(groupLabel);
      if (existing) {
        existing.push(item);
      } else {
        buckets.set(groupLabel, [item]);
      }
    }

    const sorted = Array.from(buckets.entries()).sort((a, b) => a[0].localeCompare(b[0]));
    return sorted.map(([groupLabel, groupItems]) => ({
      groupLabel,
      items: groupItems.sort((a, b) => (a.code ?? '').localeCompare(b.code ?? '')),
    }));
  }, [filteredItems, t]);

  const handleToggle = (id: number): void => {
    if (value.includes(id)) {
      onChange(value.filter((x) => x !== id));
    } else {
      onChange([...value, id]);
    }
  };

  const handleSelectAll = (checked: boolean): void => {
    if (checked) {
      const ids = new Set<number>(value);
      for (const item of filteredItems) ids.add(item.id);
      onChange(Array.from(ids));
    } else {
      const filteredIds = new Set<number>(filteredItems.map((i) => i.id));
      onChange(value.filter((id) => !filteredIds.has(id)));
    }
  };

  const allFilteredSelected = useMemo(() => {
    if (filteredItems.length === 0) return false;
    const selected = new Set<number>(value);
    return filteredItems.every((i) => selected.has(i.id));
  }, [filteredItems, value]);

  if (isLoading) {
    return <div className="text-sm text-slate-500 py-4">{t('common.loading')}</div>;
  }

  return (
    <div className="space-y-2">
      <Input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder={t('permissionGroups.search')}
        disabled={disabled}
      />
      <div className="flex items-center gap-2">
        <Checkbox
          id="select-all-permissions"
          checked={allFilteredSelected}
          onCheckedChange={(c) => handleSelectAll(!!c)}
          disabled={disabled || filteredItems.length === 0}
        />
        <label htmlFor="select-all-permissions" className="text-sm font-medium cursor-pointer">
          {t('permissionGroups.selectAll')}
        </label>
      </div>
      <div className="max-h-[200px] overflow-y-auto border rounded-lg p-2 space-y-2">
        {filteredItems.length === 0 ? (
          <p className="text-sm text-slate-500 py-2">{t('permissionGroups.noDefinitions')}</p>
        ) : (
          groupedItems.map(({ groupLabel, items: group }) => (
            <div key={groupLabel} className="space-y-2">
              <div className="text-xs font-semibold text-slate-600 dark:text-slate-300 px-1">
                {groupLabel}
              </div>
              {group.map((item) => {
                const display = getDisplayLabel(item.code, item.name);
                return (
                  <div key={item.id} className="flex items-center gap-2">
                    <Checkbox
                      id={`perm-${item.id}`}
                      checked={value.includes(item.id)}
                      onCheckedChange={() => handleToggle(item.id)}
                      disabled={disabled}
                    />
                    <label htmlFor={`perm-${item.id}`} className="text-sm cursor-pointer flex-1">
                      <div className="flex items-center justify-between gap-3">
                        <span className="truncate">{display}</span>
                        <span className="font-mono text-xs text-slate-500 dark:text-slate-400">{item.code}</span>
                      </div>
                    </label>
                  </div>
                );
              })}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

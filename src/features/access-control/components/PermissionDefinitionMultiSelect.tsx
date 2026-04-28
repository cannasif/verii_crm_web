import { type ReactElement, useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { usePermissionDefinitionsQuery } from '../hooks/usePermissionDefinitionsQuery';
import { getPermissionDisplayLabel, getPermissionModuleDisplayMeta, isLeafPermissionCode } from '../utils/permission-config';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

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

  const actionMeta = useMemo(
    () => ({
      create: { label: t('permissionGroups.permissionsPanel.actions.create'), aliases: ['create', 'add', 'new', 'insert'] },
      read: { label: t('permissionGroups.permissionsPanel.actions.read'), aliases: ['read', 'view', 'list', 'overview'] },
      update: { label: t('permissionGroups.permissionsPanel.actions.update'), aliases: ['update', 'edit', 'write'] },
      delete: { label: t('permissionGroups.permissionsPanel.actions.delete'), aliases: ['delete', 'remove'] },
      other: { label: t('permissionGroups.permissionsPanel.actions.other'), aliases: [] },
    } as const),
    [t]
  );

  const getDisplayLabel = useCallback(
    (code: string, name: string | null | undefined): string => {
      const trimmedName = (name ?? '').trim();
      if (trimmedName) return trimmedName;
      return getPermissionDisplayLabel(code, (key, fallback) => t(key, fallback));
    },
    [t]
  );

  const getSubjectLabel = useCallback(
    (code: string): string => {
      const parts = code.split('.').filter(Boolean);
      if (parts.length <= 1) return code;
      const subjectParts = parts.slice(1, -1);
      const subject = (subjectParts.join(' ') || parts[parts.length - 2] || code)
        .replace(/[-_]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      if (!subject) return code;
      return subject
        .split(' ')
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ');
    },
    []
  );

  const getActionKey = useCallback(
    (code: string): keyof typeof actionMeta => {
      const parts = code.split('.').filter(Boolean);
      const action = (parts[parts.length - 1] ?? '').toLowerCase();
      const matched = (Object.keys(actionMeta) as Array<keyof typeof actionMeta>).find(
        (key) => key !== 'other' && (actionMeta[key].aliases as readonly string[]).includes(action)
      );
      return matched ?? 'other';
    },
    [actionMeta]
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
    type PermissionMatrixRow = {
      key: string;
      label: string;
      actions: Partial<Record<keyof typeof actionMeta, { id: number; code: string; display: string }>>;
      allIds: number[];
    };

    const moduleBuckets = new Map<
      string,
      {
        moduleLabel: string;
        rows: Map<string, PermissionMatrixRow>;
      }
    >();

    for (const item of filteredItems) {
      const prefix = (item.code ?? '').split('.').filter(Boolean)[0] ?? 'other';
      const meta = getPermissionModuleDisplayMeta(prefix);
      const moduleLabel = meta ? t(meta.key, meta.fallback) : prefix;
      const subjectLabel = getSubjectLabel(item.code);
      const actionKey = getActionKey(item.code);
      const display = getDisplayLabel(item.code, item.name);

      const moduleEntry = moduleBuckets.get(moduleLabel) ?? {
        moduleLabel,
        rows: new Map<string, PermissionMatrixRow>(),
      };

      const rowKey = `${prefix}:${subjectLabel.toLowerCase()}`;
      const currentRow = moduleEntry.rows.get(rowKey) ?? {
        key: rowKey,
        label: subjectLabel,
        actions: {},
        allIds: [],
      };

      currentRow.actions[actionKey] = { id: item.id, code: item.code, display };
      currentRow.allIds = Array.from(new Set([...currentRow.allIds, item.id]));
      moduleEntry.rows.set(rowKey, currentRow);
      moduleBuckets.set(moduleLabel, moduleEntry);
    }

    return Array.from(moduleBuckets.values())
      .sort((a, b) => a.moduleLabel.localeCompare(b.moduleLabel))
      .map((moduleEntry) => ({
        moduleLabel: moduleEntry.moduleLabel,
        rows: Array.from(moduleEntry.rows.values()).sort((a, b) => a.label.localeCompare(b.label)),
      }));
  }, [filteredItems, getActionKey, getDisplayLabel, getSubjectLabel, t, actionMeta]);

  const toggleMany = useCallback(
    (ids: number[], checked: boolean): void => {
      const next = new Set<number>(value);
      if (checked) {
        ids.forEach((id) => next.add(id));
      } else {
        ids.forEach((id) => next.delete(id));
      }
      onChange(Array.from(next));
    },
    [onChange, value]
  );

  const handleToggle = (id: number): void => {
    if (value.includes(id)) {
      onChange(value.filter((x) => x !== id));
    } else {
      onChange([...value, id]);
    }
  };



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

      <div className="max-h-[420px] overflow-y-auto rounded-2xl border border-slate-200 bg-white/80 p-2 dark:border-white/10 dark:bg-white/[0.03]">
        {filteredItems.length === 0 ? (
          <p className="text-sm text-slate-500 py-2">{t('permissionGroups.noDefinitions')}</p>
        ) : (
          <Accordion type="multiple" className="space-y-3">
            {groupedItems.map(({ moduleLabel, rows }) => {
              const moduleIds = rows.flatMap((row) => row.allIds);
              const moduleSelected = moduleIds.length > 0 && moduleIds.every((id) => value.includes(id));

              return (
                <AccordionItem
                  key={moduleLabel}
                  value={moduleLabel}
                  className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50/70 px-0 dark:border-white/10 dark:bg-white/[0.03]"
                >
                  <AccordionTrigger className="px-4 py-3 hover:no-underline">
                    <div className="flex w-full items-center justify-between gap-4 pr-3">
                      <div className="min-w-0 text-left">
                        <p className="text-sm font-black text-slate-900 dark:text-white">{moduleLabel}</p>
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                          {rows.length} {t('permissionGroups.permissionsPanel.groupedRows')}
                        </p>
                      </div>
                      <div
                        className="flex items-center gap-2"
                        onClick={(event) => event.stopPropagation()}
                      >
                        <Checkbox
                          id={`module-${moduleLabel}`}
                          checked={moduleSelected}
                          onCheckedChange={(checked) => toggleMany(moduleIds, !!checked)}
                          disabled={disabled || moduleIds.length === 0}
                        />
                        <label
                          htmlFor={`module-${moduleLabel}`}
                          className="text-xs font-semibold text-slate-600 dark:text-slate-300"
                        >
                          {t('permissionGroups.selectAll')}
                        </label>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-4 pb-4">
                    <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-white/10 custom-scrollbar">
                      <div className="max-h-[300px] overflow-y-auto bg-slate-200 dark:bg-white/10 min-w-[700px]">
                        <div className="sticky top-0 z-20 grid grid-cols-[minmax(180px,2fr)_repeat(5,minmax(88px,1fr))] border-b border-slate-200 dark:border-white/10 bg-slate-200 text-xs font-black uppercase tracking-[0.18em] text-slate-500 dark:bg-white/10 dark:text-slate-400">
                          <div className="bg-slate-50 px-3 py-3 dark:bg-[#1E1627] border-r border-slate-200 dark:border-white/10">
                            {t('permissionGroups.permissionsPanel.screen')}
                          </div>
                          {(['create', 'read', 'update', 'delete', 'other'] as const).map((actionKey, idx) => (
                            <div
                              key={actionKey}
                              className={cn(
                                "bg-slate-50 px-2 py-3 text-center dark:bg-[#1E1627]",
                                idx < 4 && "border-r border-slate-200 dark:border-white/10"
                              )}
                            >
                              {actionMeta[actionKey].label}
                            </div>
                          ))}
                        </div>
                        <div className="flex flex-col gap-px">
                          {rows.map((row) => (
                            <div
                              key={row.key}
                              className="grid grid-cols-[minmax(180px,2fr)_repeat(5,minmax(88px,1fr))] border-t border-slate-200 first:border-t-0 dark:border-white/10"
                            >
                              <div className="bg-white px-3 py-8 dark:bg-[#130822] border-r border-slate-200 dark:border-white/10">
                                <div className="min-w-0">
                                  <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">{row.label}</p>
                                  <div className="mt-1 flex flex-wrap gap-1">
                                    {row.allIds.length > 1 ? (
                                      <Badge variant="secondary" className="rounded-full">
                                        {row.allIds.length} {t('permissionGroups.permissionsPanel.actionsMapped')}
                                      </Badge>
                                    ) : null}
                                  </div>
                                </div>
                              </div>
                              {(['create', 'read', 'update', 'delete', 'other'] as const).map((actionKey, idx) => {
                                const actionItem = row.actions[actionKey];
                                return (
                                  <div
                                    key={`${row.key}-${actionKey}`}
                                    className={cn(
                                      'flex min-h-16 items-center justify-center bg-white px-2 py-3 dark:bg-[#130822]',
                                      !actionItem && 'bg-slate-50/80 dark:bg-white/[0.02]',
                                      idx < 4 && "border-r border-slate-200 dark:border-white/10"
                                    )}
                                  >
                                    {actionItem ? (
                                      <label
                                        htmlFor={`perm-${actionItem.id}`}
                                        className="flex w-full cursor-pointer flex-col items-center gap-2 text-center"
                                      >
                                        <Checkbox
                                          id={`perm-${actionItem.id}`}
                                          checked={value.includes(actionItem.id)}
                                          onCheckedChange={() => handleToggle(actionItem.id)}
                                          disabled={disabled}
                                        />
                                        <span className="line-clamp-2 text-[11px] font-medium leading-4 text-slate-600 dark:text-slate-300">
                                          {actionItem.display}
                                        </span>
                                        <span className="line-clamp-1 font-mono text-[10px] text-slate-400 dark:text-slate-500">
                                          {actionItem.code}
                                        </span>
                                      </label>
                                    ) : (
                                      <span className="text-xs text-slate-300 dark:text-slate-600">-</span>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        )}
      </div>
    </div>
  );
}

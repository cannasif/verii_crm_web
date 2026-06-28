import { type ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { KeyRound, ShieldCheck } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { usePermissionGroupsQuery } from '../hooks/usePermissionGroupsQuery';

interface PermissionGroupMultiSelectProps {
  value: number[];
  onChange: (ids: number[]) => void;
  disabled?: boolean;
}

const CHECKBOX_CLASSNAME =
  'h-5 w-5 rounded-md border-2 border-slate-300 bg-white shadow-sm transition-all data-[state=checked]:border-rose-500 data-[state=checked]:bg-rose-500 data-[state=checked]:text-white dark:border-white/25 dark:bg-white/[0.04] dark:data-[state=checked]:border-rose-500 dark:data-[state=checked]:bg-rose-500';

export function PermissionGroupMultiSelect({
  value,
  onChange,
  disabled = false,
}: PermissionGroupMultiSelectProps): ReactElement {
  const { t } = useTranslation(['access-control', 'common']);
  const { data, isLoading } = usePermissionGroupsQuery({
    pageNumber: 1,
    pageSize: 1000,
    sortBy: 'name',
    sortDirection: 'asc',
  });

  const items = (data?.data ?? []).filter((d) => d.isActive);
  const allSelected = items.length > 0 && value.length === items.length;
  const someSelected = value.length > 0 && !allSelected;

  const handleToggle = (id: number): void => {
    if (value.includes(id)) {
      onChange(value.filter((x) => x !== id));
    } else {
      onChange([...value, id]);
    }
  };

  const handleSelectAll = (checked: boolean): void => {
    if (checked) {
      onChange(items.map((i) => i.id));
    } else {
      onChange([]);
    }
  };

  if (isLoading) {
    return <div className="py-6 text-center text-sm text-slate-500 dark:text-slate-400">{t('common.loading')}</div>;
  }

  return (
    <div className="space-y-3">
      <div
        className={cn(
          'flex items-center gap-3 rounded-xl border px-3.5 py-3 transition-all',
          allSelected || someSelected
            ? 'border-rose-200/80 bg-rose-50/80 dark:border-rose-500/30 dark:bg-rose-500/10'
            : 'border-slate-200/80 bg-slate-50/60 dark:border-white/10 dark:bg-white/[0.03]',
          !disabled && 'cursor-pointer hover:border-slate-300 dark:hover:border-white/20'
        )}
        onClick={() => !disabled && items.length > 0 && handleSelectAll(!allSelected)}
      >
        <Checkbox
          id="select-all-groups"
          checked={allSelected ? true : someSelected ? 'indeterminate' : false}
          onCheckedChange={(c) => handleSelectAll(!!c)}
          disabled={disabled || items.length === 0}
          className={CHECKBOX_CLASSNAME}
          onClick={(event) => event.stopPropagation()}
        />
        <label
          htmlFor="select-all-groups"
          className="flex-1 cursor-pointer text-sm font-semibold text-slate-800 dark:text-slate-100"
        >
          {t('userGroupAssignments.selectAll')}
        </label>
        <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
          {value.length}/{items.length}
        </span>
      </div>

      <div className="max-h-[280px] space-y-1.5 overflow-y-auto p-0.5">
        {items.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-500 dark:text-slate-400">{t('userGroupAssignments.noGroups')}</p>
        ) : (
          items.map((item) => {
            const isChecked = value.includes(item.id);

            return (
              <div
                key={item.id}
                className={cn(
                  'flex items-center gap-3 rounded-xl border px-3.5 py-3 transition-all duration-150',
                  isChecked
                    ? 'border-rose-300/80 bg-rose-500/10 shadow-sm dark:border-rose-500/35 dark:bg-rose-500/12'
                    : 'border-slate-200/70 bg-white/70 dark:border-white/8 dark:bg-white/[0.02]',
                  !disabled && 'cursor-pointer hover:border-slate-300 hover:bg-slate-50/90 dark:hover:border-white/15 dark:hover:bg-white/[0.05]'
                )}
                onClick={() => !disabled && handleToggle(item.id)}
              >
                <Checkbox
                  id={`group-${item.id}`}
                  checked={isChecked}
                  onCheckedChange={() => handleToggle(item.id)}
                  disabled={disabled}
                  className={CHECKBOX_CLASSNAME}
                  onClick={(event) => event.stopPropagation()}
                />
                <label htmlFor={`group-${item.id}`} className="flex min-w-0 flex-1 cursor-pointer items-center gap-2">
                  <span
                    className={cn(
                      'flex size-8 shrink-0 items-center justify-center rounded-lg border',
                      item.isSystemAdmin
                        ? 'border-violet-200/80 bg-violet-50 text-violet-600 dark:border-violet-500/25 dark:bg-violet-500/10 dark:text-violet-300'
                        : 'border-sky-200/80 bg-sky-50 text-sky-600 dark:border-sky-500/25 dark:bg-sky-500/10 dark:text-sky-300'
                    )}
                  >
                    {item.isSystemAdmin ? <ShieldCheck className="size-4" /> : <KeyRound className="size-4" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className={cn('block text-sm font-semibold', isChecked ? 'text-rose-900 dark:text-rose-100' : 'text-slate-800 dark:text-slate-100')}>
                      {item.name}
                    </span>
                    {item.description && (
                      <span className="mt-0.5 block truncate text-xs text-slate-500 dark:text-slate-400">{item.description}</span>
                    )}
                  </span>
                  {item.isSystemAdmin && (
                    <Badge
                      variant="outline"
                      className="shrink-0 rounded-full border-violet-200/80 bg-violet-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-violet-700 dark:border-violet-500/30 dark:bg-violet-500/15 dark:text-violet-200"
                    >
                      {t('permissionGroups.table.isSystemAdmin')}
                    </Badge>
                  )}
                </label>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

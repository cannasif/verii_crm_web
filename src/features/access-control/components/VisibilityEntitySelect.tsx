import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { VISIBILITY_ENTITY_OPTIONS } from '../utils/visibility-options';
import { getVisibilityEntityAccentClasses, getVisibilityEntityIcon } from '../utils/visibility-entity-visuals';

const ENTITY_SELECT_TRIGGER_CLASSNAME =
  'h-10 w-full rounded-xl border border-slate-200/90 bg-slate-50/90 px-3 text-sm font-medium text-slate-900 shadow-sm transition-all duration-200 dark:border-white/10 dark:bg-white/[0.04] dark:text-white dark:shadow-none hover:border-slate-300 dark:hover:border-white/20 focus-visible:border-rose-500/60 focus-visible:ring-2 focus-visible:ring-rose-500/15 focus-visible:ring-offset-0 data-[placeholder]:text-slate-400 dark:data-[placeholder]:text-slate-500';

const ENTITY_SELECT_CONTENT_CLASSNAME =
  'overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-[0_12px_40px_-16px_rgba(15,23,42,0.35)] dark:border-white/12 dark:bg-[#1a1028] dark:shadow-black/50 [&_[data-slot=select-scroll-up-button]+div]:p-2';

const ENTITY_SELECT_ITEM_CLASSNAME =
  'mb-1.5 last:mb-0 rounded-lg border border-transparent py-2.5 pl-3 pr-9 text-sm text-slate-700 transition-all duration-150 dark:text-slate-200 focus:border-slate-200/90 focus:bg-slate-50 dark:focus:border-white/12 dark:focus:bg-white/[0.06] data-[state=checked]:border-rose-300/80 data-[state=checked]:bg-rose-500/10 data-[state=checked]:font-semibold data-[state=checked]:text-rose-700 data-[state=checked]:shadow-sm dark:data-[state=checked]:border-rose-500/35 dark:data-[state=checked]:bg-rose-500/15 dark:data-[state=checked]:text-rose-300 [&_svg]:text-rose-600 dark:[&_svg]:text-rose-400';

type VisibilityEntitySelectProps = {
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
};

export function VisibilityEntitySelect({
  value,
  onValueChange,
  placeholder,
}: VisibilityEntitySelectProps): ReactElement {
  const { t } = useTranslation(['access-control', 'common']);
  const selectedMeta = VISIBILITY_ENTITY_OPTIONS.find((item) => item.value === value);
  const selectedLabel = selectedMeta
    ? t(selectedMeta.labelKey, { defaultValue: selectedMeta.fallback })
    : value;
  const SelectedIcon = getVisibilityEntityIcon(value);
  const selectedAccent = getVisibilityEntityAccentClasses(value);

  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger className={ENTITY_SELECT_TRIGGER_CLASSNAME}>
        <div className="flex min-w-0 items-center gap-2.5">
          {value && (
            <span className={cn('flex size-7 shrink-0 items-center justify-center rounded-lg border', selectedAccent.iconWrap)}>
              <SelectedIcon className={cn('size-3.5', selectedAccent.icon)} />
            </span>
          )}
          <SelectValue placeholder={placeholder ?? t('visibilitySimulator.selectEntityPlaceholder')}>
            {value ? selectedLabel : undefined}
          </SelectValue>
        </div>
      </SelectTrigger>
      <SelectContent position="popper" sideOffset={6} className={cn(ENTITY_SELECT_CONTENT_CLASSNAME, 'max-h-72')}>
        {VISIBILITY_ENTITY_OPTIONS.map((entity) => {
          const EntityIcon = getVisibilityEntityIcon(entity.value);
          const accent = getVisibilityEntityAccentClasses(entity.value);
          const label = t(entity.labelKey, { defaultValue: entity.fallback });

          return (
            <SelectItem key={entity.value} value={entity.value} className={ENTITY_SELECT_ITEM_CLASSNAME}>
              <span className="flex items-center gap-2.5">
                <span className={cn('flex size-7 shrink-0 items-center justify-center rounded-lg border', accent.iconWrap)}>
                  <EntityIcon className={cn('size-3.5', accent.icon)} />
                </span>
                <span className="truncate">{label}</span>
              </span>
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
}

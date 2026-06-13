import type { ReactElement } from 'react';
import { cn } from '@/lib/utils';
import {
  getVisibilityEntityAccentClasses,
  getVisibilityEntityIcon,
} from '../utils/visibility-entity-visuals';

type VisibilityEntityCellProps = {
  entityType: string;
  label?: string;
};

export function VisibilityEntityCell({ entityType, label }: VisibilityEntityCellProps): ReactElement {
  const EntityIcon = getVisibilityEntityIcon(entityType);
  const accent = getVisibilityEntityAccentClasses(entityType);

  return (
    <div className="flex items-center gap-3">
      <div className={cn('shrink-0 rounded-lg border p-2', accent.iconWrap)}>
        <EntityIcon className={cn('size-4', accent.icon)} />
      </div>
      {label != null && <span className="font-medium text-slate-800 dark:text-slate-100">{label}</span>}
    </div>
  );
}

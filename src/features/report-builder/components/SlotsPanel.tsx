import type { ReactElement } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Filter, Palette, Sigma, X } from 'lucide-react';

export type SlotType = 'axis' | 'values' | 'legend' | 'filters';

interface SlotProps {
  id: string;
  label: string;
  description?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  invalid?: boolean;
  errorMessage?: string;
}

function Slot({ id, label, description, icon, children, invalid, errorMessage }: SlotProps): ReactElement {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div className="space-y-1">
      <div className="flex items-start gap-2">
        <div className="mt-0.5 text-primary">{icon}</div>
        <div>
          <span className="text-muted-foreground text-xs font-medium">{label}</span>
          {description ? (
            <p className="text-muted-foreground mt-0.5 text-[11px]">{description}</p>
          ) : null}
        </div>
      </div>
      <div
        ref={setNodeRef}
        className={cn(
          'min-h-[3rem] w-full rounded-md border-2 border-dashed p-2 transition-colors',
          isOver && 'border-primary bg-primary/10',
          invalid && 'border-destructive bg-destructive/5',
          !invalid && !isOver && 'border-muted-foreground/40'
        )}
      >
        {children}
        {invalid && errorMessage && (
          <p className="text-destructive mt-1 text-xs">{errorMessage}</p>
        )}
      </div>
    </div>
  );
}

interface SlotsPanelProps {
  axis?: { field: string };
  values: Array<{ field: string; aggregation: string }>;
  legend?: { field: string };
  filters: Array<{ field: string; operator: string }>;
  slotError: string | null;
  onRemoveAxis: () => void;
  onRemoveValue: (index: number) => void;
  onRemoveLegend: () => void;
  onRemoveFilter: (index: number) => void;
  disabled?: boolean;
}

export function SlotsPanel({
  axis,
  values,
  legend,
  filters,
  slotError,
  onRemoveAxis,
  onRemoveValue,
  onRemoveLegend,
  onRemoveFilter,
  disabled,
}: SlotsPanelProps): ReactElement {
  const { t } = useTranslation('common');

  return (
    <div className="space-y-4">
      <Slot
        id="slot-axis"
        label={t('common.reportBuilder.axis')}
        description={t('common.reportBuilder.axisDescription')}
        icon={<Palette className="size-4" />}
        invalid={!!slotError}
        errorMessage={slotError ?? undefined}
      >
        {disabled ? (
          <span className="text-muted-foreground text-xs">{t('common.reportBuilder.checkRequired')}</span>
        ) : axis ? (
          <div className="flex items-center justify-between gap-1 rounded bg-muted/50 px-2 py-1 text-sm">
            <span>{axis.field}</span>
            <Button type="button" variant="ghost" size="icon-sm" onClick={onRemoveAxis} aria-label={t('advancedFilter.remove')}>
              <X className="size-3" />
            </Button>
          </div>
        ) : (
          <div className="space-y-1">
            <span className="text-muted-foreground text-xs">{t('common.reportBuilder.dropField')}</span>
            <p className="text-[11px] text-muted-foreground">{t('common.reportBuilder.slotAxisTip')}</p>
          </div>
        )}
      </Slot>

      <Slot
        id="slot-values"
        label={t('common.reportBuilder.value')}
        description={t('common.reportBuilder.valuesDescription')}
        icon={<Sigma className="size-4" />}
        invalid={!!slotError}
        errorMessage={slotError ?? undefined}
      >
        {disabled ? (
          <span className="text-muted-foreground text-xs">{t('common.reportBuilder.checkRequired')}</span>
        ) : values.length === 0 ? (
          <div className="space-y-1">
            <span className="text-muted-foreground text-xs">{t('common.reportBuilder.dropNumericField')}</span>
            <p className="text-[11px] text-muted-foreground">{t('common.reportBuilder.slotValuesTip')}</p>
          </div>
        ) : (
          <div className="space-y-1">
            {values.map((v, i) => (
              <div key={`${v.field}-${i}`} className="flex items-center justify-between gap-1 rounded bg-muted/50 px-2 py-1 text-sm">
                <span>{v.field}</span>
                <Button type="button" variant="ghost" size="icon-sm" onClick={() => onRemoveValue(i)} aria-label={t('advancedFilter.remove')}>
                  <X className="size-3" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </Slot>

      <Slot
        id="slot-legend"
        label={t('common.reportBuilder.legend')}
        description={t('common.reportBuilder.legendDescription')}
        icon={<Palette className="size-4" />}
        invalid={!!slotError}
        errorMessage={slotError ?? undefined}
      >
        {disabled ? (
          <span className="text-muted-foreground text-xs">{t('common.reportBuilder.checkRequired')}</span>
        ) : legend ? (
          <div className="flex items-center justify-between gap-1 rounded bg-muted/50 px-2 py-1 text-sm">
            <span>{legend.field}</span>
            <Button type="button" variant="ghost" size="icon-sm" onClick={onRemoveLegend} aria-label={t('advancedFilter.remove')}>
              <X className="size-3" />
            </Button>
          </div>
        ) : (
          <div className="space-y-1">
            <span className="text-muted-foreground text-xs">{t('common.reportBuilder.dropField')}</span>
            <p className="text-[11px] text-muted-foreground">{t('common.reportBuilder.slotLegendTip')}</p>
          </div>
        )}
      </Slot>

      <Slot
        id="slot-filters"
        label={t('common.filters')}
        description={t('common.reportBuilder.filtersDescription')}
        icon={<Filter className="size-4" />}
        invalid={!!slotError}
        errorMessage={slotError ?? undefined}
      >
        {disabled ? (
          <span className="text-muted-foreground text-xs">{t('common.reportBuilder.checkRequired')}</span>
        ) : filters.length === 0 ? (
          <div className="space-y-1">
            <span className="text-muted-foreground text-xs">{t('common.reportBuilder.dropField')}</span>
            <p className="text-[11px] text-muted-foreground">{t('common.reportBuilder.slotFiltersTip')}</p>
          </div>
        ) : (
          <div className="space-y-1">
            {filters.map((f, i) => (
              <div key={`${f.field}-${i}`} className="flex items-center justify-between gap-1 rounded bg-muted/50 px-2 py-1 text-sm">
                <span>{f.field}</span>
                <Button type="button" variant="ghost" size="icon-sm" onClick={() => onRemoveFilter(i)} aria-label={t('advancedFilter.remove')}>
                  <X className="size-3" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </Slot>
    </div>
  );
}

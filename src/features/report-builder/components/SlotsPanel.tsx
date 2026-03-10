import type { ReactElement } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { X } from 'lucide-react';

export type SlotType = 'axis' | 'values' | 'legend' | 'filters';

interface SlotProps {
  id: string;
  label: string;
  children: React.ReactNode;
  invalid?: boolean;
  errorMessage?: string;
}

function Slot({ id, label, children, invalid, errorMessage }: SlotProps): ReactElement {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div className="space-y-1">
      <span className="text-muted-foreground text-xs font-medium">{label}</span>
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
      <Slot id="slot-axis" label={t('reportBuilder.axis')} invalid={!!slotError} errorMessage={slotError ?? undefined}>
        {disabled ? (
          <span className="text-muted-foreground text-xs">Kontrol gerekli</span>
        ) : axis ? (
          <div className="flex items-center justify-between gap-1 rounded bg-muted/50 px-2 py-1 text-sm">
            <span>{axis.field}</span>
            <Button type="button" variant="ghost" size="icon-sm" onClick={onRemoveAxis} aria-label={t('advancedFilter.remove')}>
              <X className="size-3" />
            </Button>
          </div>
        ) : (
          <span className="text-muted-foreground text-xs">Alan bırakın</span>
        )}
      </Slot>

      <Slot id="slot-values" label={t('reportBuilder.value')} invalid={!!slotError} errorMessage={slotError ?? undefined}>
        {disabled ? (
          <span className="text-muted-foreground text-xs">Kontrol gerekli</span>
        ) : values.length === 0 ? (
          <span className="text-muted-foreground text-xs">Sayısal alan bırakın</span>
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

      <Slot id="slot-legend" label="Lejant" invalid={!!slotError} errorMessage={slotError ?? undefined}>
        {disabled ? (
          <span className="text-muted-foreground text-xs">Kontrol gerekli</span>
        ) : legend ? (
          <div className="flex items-center justify-between gap-1 rounded bg-muted/50 px-2 py-1 text-sm">
            <span>{legend.field}</span>
            <Button type="button" variant="ghost" size="icon-sm" onClick={onRemoveLegend} aria-label={t('advancedFilter.remove')}>
              <X className="size-3" />
            </Button>
          </div>
        ) : (
          <span className="text-muted-foreground text-xs">Alan bırakın</span>
        )}
      </Slot>

      <Slot id="slot-filters" label="Filtreler" invalid={!!slotError} errorMessage={slotError ?? undefined}>
        {disabled ? (
          <span className="text-muted-foreground text-xs">Kontrol gerekli</span>
        ) : filters.length === 0 ? (
          <span className="text-muted-foreground text-xs">Alan bırakın</span>
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

import type { ReactElement } from 'react';
import { useMemo } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';
import type { CalculatedField, Field } from '../types';
import { getFieldSemanticLabel, getFieldSemanticType } from '../utils';

interface FieldItemProps {
  field: Field;
  mode?: 'basic' | 'advanced';
  onUseAsAxis?: (field: Field) => void;
  onUseAsValue?: (field: Field) => void;
  onUseAsLegend?: (field: Field) => void;
  onUseAsFilter?: (field: Field) => void;
}

function FieldItem({
  field,
  mode = 'advanced',
  onUseAsAxis,
  onUseAsValue,
  onUseAsLegend,
  onUseAsFilter,
}: FieldItemProps): ReactElement {
  const { t } = useTranslation('common');
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `field:${field.name}`,
    data: { type: 'field', field },
  });
  const semanticType = getFieldSemanticType(field);
  const isBasicMode = mode === 'basic';
  const canUseAsAxis = semanticType === 'text' || semanticType === 'date';
  const canUseAsValue = semanticType === 'number';
  const canUseAsLegend = semanticType === 'text';

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={cn(
        'cursor-grab rounded border border-transparent px-2 py-1.5 text-sm hover:border-muted-foreground/30 hover:bg-muted/50 active:cursor-grabbing',
        isDragging && 'opacity-50'
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-medium">{field.displayName || field.name}</span>
        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
          {getFieldSemanticLabel(field)}
        </span>
      </div>
      {isBasicMode ? (
        <div className="text-muted-foreground ml-0.5 text-xs">
          {semanticType === 'date'
            ? t('common.reportBuilder.fieldHintDate')
            : semanticType === 'number'
              ? t('common.reportBuilder.fieldHintMetric')
              : semanticType === 'boolean'
                ? t('common.reportBuilder.fieldHintStatus')
                : t('common.reportBuilder.fieldHintDimension')}
        </div>
      ) : (
        <div className="text-muted-foreground ml-0.5 flex items-center gap-2 text-xs">
          <span>{field.name}</span>
          <span>•</span>
          <span>{field.dotNetType ?? field.sqlType}</span>
        </div>
      )}
      <div className="mt-2 flex flex-wrap gap-1">
        {canUseAsAxis ? (
          <Button type="button" variant="outline" size="sm" className="h-7 text-[11px]" onClick={() => onUseAsAxis?.(field)}>
            {t('common.reportBuilder.useAsAxis')}
          </Button>
        ) : null}
        {canUseAsValue ? (
          <Button type="button" variant="outline" size="sm" className="h-7 text-[11px]" onClick={() => onUseAsValue?.(field)}>
            {t('common.reportBuilder.useAsValue')}
          </Button>
        ) : null}
        {canUseAsLegend ? (
          <Button type="button" variant="outline" size="sm" className="h-7 text-[11px]" onClick={() => onUseAsLegend?.(field)}>
            {t('common.reportBuilder.useAsLegend')}
          </Button>
        ) : null}
        <Button type="button" variant="ghost" size="sm" className="h-7 text-[11px]" onClick={() => onUseAsFilter?.(field)}>
          {t('common.reportBuilder.useAsFilter')}
        </Button>
      </div>
    </div>
  );
}

interface FieldsPanelProps {
  schema: Field[];
  calculatedFields?: CalculatedField[];
  search: string;
  onSearchChange: (v: string) => void;
  onUseAsAxis?: (field: Field) => void;
  onUseAsValue?: (field: Field) => void;
  onUseAsLegend?: (field: Field) => void;
  onUseAsFilter?: (field: Field) => void;
  disabled?: boolean;
  mode?: 'basic' | 'advanced';
}

export function FieldsPanel({
  schema,
  calculatedFields = [],
  search,
  onSearchChange,
  onUseAsAxis,
  onUseAsValue,
  onUseAsLegend,
  onUseAsFilter,
  disabled,
  mode = 'advanced',
}: FieldsPanelProps): ReactElement {
  const { t } = useTranslation('common');
  const mergedFields = useMemo(
    () => [
      ...schema,
      ...calculatedFields.map<Field>((field) => ({
        name: field.name,
        displayName: field.label || field.name,
        semanticType: 'number',
        defaultAggregation: 'sum',
        sqlType: 'decimal',
        dotNetType: 'Decimal',
        isNullable: true,
      })),
    ],
    [schema, calculatedFields]
  );

  const filtered = useMemo(() => {
    if (!search.trim()) return mergedFields;
    const q = search.trim().toLowerCase();
    return mergedFields.filter(
      (f) =>
        f.name.toLowerCase().includes(q) ||
        (f.displayName ?? '').toLowerCase().includes(q) ||
        (f.dotNetType ?? f.sqlType ?? '').toLowerCase().includes(q) ||
        (f.semanticType ?? '').toLowerCase().includes(q)
    );
  }, [mergedFields, search]);

  const semanticCounts = useMemo(() => {
    return filtered.reduce<Record<string, number>>((acc, field) => {
      const key = field.semanticType ?? 'text';
      acc[key] = (acc[key] ?? 0) + 1;
      return acc;
    }, {});
  }, [filtered]);

  return (
    <div className="flex h-full flex-col gap-2">
      <div className="space-y-2">
        <div>
          <Label>{t('common.reportBuilder.fields')}</Label>
          <p className="text-muted-foreground mt-1 text-xs">
            {t('common.reportBuilder.fieldsDescription')}
          </p>
          <div className="mt-2 rounded-xl border bg-muted/30 px-3 py-2 text-[11px] text-muted-foreground">
            {t('common.reportBuilder.fieldsTip')}
          </div>
        </div>
        <Input
          placeholder={t('common.reportBuilder.searchFields')}
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="h-8"
          disabled={disabled}
        />
      </div>
      {!disabled && filtered.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {Object.entries(semanticCounts).map(([key, count]) => (
            <span
              key={key}
              className="rounded-full border bg-background px-2.5 py-1 text-[11px] font-medium text-muted-foreground"
            >
              {getFieldSemanticLabel({ name: '', sqlType: '', dotNetType: '', isNullable: true, semanticType: key })} · {count}
            </span>
          ))}
        </div>
      ) : null}
      <div
        className={cn(
          'flex-1 space-y-1 overflow-y-auto rounded border border-muted-foreground/20 p-2',
          disabled ? 'bg-muted/30 opacity-60' : 'bg-muted/20'
        )}
      >
        {disabled && (
          <p className="text-muted-foreground py-4 text-center text-sm">{t('common.reportBuilder.checkFirst')}</p>
        )}
        {!disabled && filtered.length === 0 && (
          <p className="text-muted-foreground py-4 text-center text-sm">{t('common.reportBuilder.noFields')}</p>
        )}
        {!disabled &&
          filtered.map((f) => (
            <FieldItem
              key={f.name}
              field={f}
              mode={mode}
              onUseAsAxis={onUseAsAxis}
              onUseAsValue={onUseAsValue}
              onUseAsLegend={onUseAsLegend}
              onUseAsFilter={onUseAsFilter}
            />
          ))}
      </div>
    </div>
  );
}

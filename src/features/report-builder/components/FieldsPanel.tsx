import type { ReactElement } from 'react';
import { useMemo } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';
import type { CalculatedField, Field } from '../types';
import { getFieldSemanticLabel } from '../utils';

interface FieldItemProps {
  field: Field;
}

function FieldItem({ field }: FieldItemProps): ReactElement {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `field:${field.name}`,
    data: { type: 'field', field },
  });

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
      <div className="text-muted-foreground ml-0.5 flex items-center gap-2 text-xs">
        <span>{field.name}</span>
        <span>•</span>
        <span>{field.dotNetType ?? field.sqlType}</span>
      </div>
    </div>
  );
}

interface FieldsPanelProps {
  schema: Field[];
  calculatedFields?: CalculatedField[];
  search: string;
  onSearchChange: (v: string) => void;
  disabled?: boolean;
}

export function FieldsPanel({ schema, calculatedFields = [], search, onSearchChange, disabled }: FieldsPanelProps): ReactElement {
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

  return (
    <div className="flex h-full flex-col gap-2">
      <div className="space-y-1">
        <Label>{t('common.reportBuilder.fields')}</Label>
        <Input
          placeholder={t('common.reportBuilder.searchFields')}
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="h-8"
          disabled={disabled}
        />
      </div>
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
            <FieldItem key={f.name} field={f} />
          ))}
      </div>
    </div>
  );
}

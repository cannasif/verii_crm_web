import type { ReactElement } from 'react';
import { useMemo } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';
import type { Field } from '../types';

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
      <span className="font-medium">{field.name}</span>
      <span className="text-muted-foreground ml-1 text-xs">({field.dotNetType ?? field.sqlType})</span>
    </div>
  );
}

interface FieldsPanelProps {
  schema: Field[];
  search: string;
  onSearchChange: (v: string) => void;
  disabled?: boolean;
}

export function FieldsPanel({ schema, search, onSearchChange, disabled }: FieldsPanelProps): ReactElement {
  const { t } = useTranslation('common');
  const filtered = useMemo(() => {
    if (!search.trim()) return schema;
    const q = search.trim().toLowerCase();
    return schema.filter(
      (f) => f.name.toLowerCase().includes(q) || (f.dotNetType ?? f.sqlType ?? '').toLowerCase().includes(q)
    );
  }, [schema, search]);

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

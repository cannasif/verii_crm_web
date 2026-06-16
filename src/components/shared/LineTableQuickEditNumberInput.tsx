import { type ReactElement, type KeyboardEventHandler } from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface LineTableQuickEditNumberInputProps {
  value: string;
  onChange: (value: string) => void;
  onKeyDown?: KeyboardEventHandler<HTMLInputElement>;
  className?: string;
  min?: number;
  max?: number;
  step?: string | number;
}

export function LineTableQuickEditNumberInput({
  value,
  onChange,
  onKeyDown,
  className,
  min,
  max,
  step,
}: LineTableQuickEditNumberInputProps): ReactElement {
  return (
    <Input
      type="number"
      step={step}
      min={min}
      max={max}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={cn(className)}
      autoFocus
      onFocus={(e) => e.currentTarget.select()}
      onWheel={(e) => e.preventDefault()}
      onKeyDown={onKeyDown}
    />
  );
}

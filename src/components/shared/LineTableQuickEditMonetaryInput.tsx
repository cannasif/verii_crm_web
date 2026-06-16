import { type ReactElement, type KeyboardEventHandler } from 'react';
import { Input } from '@/components/ui/input';
import { sanitizeMonetaryTrTyping } from '@/lib/monetary-input-tr';
import { getSystemDecimalPlaces } from '@/lib/system-settings';
import { cn } from '@/lib/utils';

interface LineTableQuickEditMonetaryInputProps {
  value: string;
  onChange: (value: string) => void;
  onKeyDown?: KeyboardEventHandler<HTMLInputElement>;
  className?: string;
}

export function LineTableQuickEditMonetaryInput({
  value,
  onChange,
  onKeyDown,
  className,
}: LineTableQuickEditMonetaryInputProps): ReactElement {
  const maxFractionDigits = getSystemDecimalPlaces();

  return (
    <Input
      type="text"
      inputMode="decimal"
      autoComplete="off"
      value={value}
      onChange={(e) => onChange(sanitizeMonetaryTrTyping(e.target.value, maxFractionDigits))}
      className={cn(className)}
      autoFocus
      onFocus={(e) => e.currentTarget.select()}
      onWheel={(e) => e.preventDefault()}
      onKeyDown={onKeyDown}
    />
  );
}

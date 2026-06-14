import { useCallback, useState } from 'react';
import { cn } from '@/lib/utils';

export function useFieldShake(): {
  triggerShake: (fieldName: string) => void;
  isShaking: (fieldName: string) => boolean;
} {
  const [shakingFields, setShakingFields] = useState<ReadonlySet<string>>(new Set());

  const triggerShake = useCallback((fieldName: string) => {
    setShakingFields((prev) => new Set(prev).add(fieldName));
    window.setTimeout(() => {
      setShakingFields((prev) => {
        const next = new Set(prev);
        next.delete(fieldName);
        return next;
      });
    }, 480);
  }, []);

  const isShaking = useCallback(
    (fieldName: string) => shakingFields.has(fieldName),
    [shakingFields]
  );

  return { triggerShake, isShaking };
}

export function sanitizePhoneValue(
  raw: string,
  maxLength: number
): { next: string; overflowAttempt: boolean } {
  let result = '';
  const cleaned = raw.replace(/[^\d+]/g, '');

  for (const char of cleaned) {
    if (char === '+') {
      if (result.length === 0) {
        result += char;
      }
      continue;
    }
    result += char;
  }

  const overflowAttempt = result.length > maxLength;
  return {
    next: result.slice(0, maxLength),
    overflowAttempt,
  };
}

export function buildContactInputClassName(
  baseClass: string,
  hasError: boolean,
  shaking: boolean
): string {
  return cn(
    baseClass,
    hasError &&
      'border-red-500 bg-red-500/[0.06] focus-visible:border-red-500 focus:border-red-500 focus-visible:bg-red-500/[0.08] dark:border-red-500/80 dark:bg-red-500/10 dark:focus-visible:bg-red-500/[0.12] aria-invalid:border-red-500',
    shaking && 'animate-field-shake'
  );
}

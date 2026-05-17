import { useCallback, useState } from 'react';
import { cn } from '@/lib/utils';
import type { CustomerFormData } from '../types/customer-types';

export function useFieldShake(): {
  triggerShake: (fieldName: keyof CustomerFormData | string) => void;
  isShaking: (fieldName: keyof CustomerFormData | string) => boolean;
} {
  const [shakingFields, setShakingFields] = useState<ReadonlySet<string>>(new Set());

  const triggerShake = useCallback((fieldName: keyof CustomerFormData | string) => {
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
    (fieldName: keyof CustomerFormData | string) => shakingFields.has(fieldName),
    [shakingFields]
  );

  return { triggerShake, isShaking };
}

export function buildCustomerInputClassName(
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

export function sanitizeDigitsValue(
  raw: string,
  maxLength: number
): { next: string; overflowAttempt: boolean } {
  const digitsOnly = raw.replace(/\D/g, '');
  const overflowAttempt = digitsOnly.length > maxLength;
  return {
    next: digitsOnly.slice(0, maxLength),
    overflowAttempt,
  };
}

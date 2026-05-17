import { cn } from '@/lib/utils';

export const DOCUMENT_SAVE_BUTTON_DISABLED_CLASS =
  'opacity-40 saturate-[0.85] cursor-not-allowed pointer-events-none shadow-none hover:opacity-40 hover:scale-100 active:scale-100';

export function documentSaveButtonClassName(canSave: boolean, className?: string): string {
  return cn(
    className,
    canSave
      ? 'opacity-90 grayscale-0 dark:opacity-100 dark:grayscale-0'
      : DOCUMENT_SAVE_BUTTON_DISABLED_CLASS,
  );
}

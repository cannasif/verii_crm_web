import type { ComponentProps, ReactElement } from 'react';
import { DialogContent } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

export type SelectionDialogSize = 'customer' | 'compact' | 'medium' | 'catalog';

export const SELECTION_DIALOG_SIZE_CLASSNAMES: Record<SelectionDialogSize, string> = {
  customer:
    'h-[calc(100dvh-1rem)] max-h-[calc(100dvh-1rem)] sm:h-[min(88dvh,820px)] sm:max-h-[min(88dvh,820px)] lg:h-[min(82dvh,800px)] lg:max-h-[min(82dvh,800px)]',
  compact: 'h-[min(72dvh,520px)] max-h-[min(72dvh,520px)]',
  medium: 'h-[min(76dvh,640px)] max-h-[min(76dvh,640px)]',
  catalog:
    'h-[calc(100dvh-1rem)] max-h-[calc(100dvh-1rem)] sm:h-[min(82dvh,720px)] sm:max-h-[min(82dvh,720px)]',
};

type SelectionDialogContentProps = ComponentProps<typeof DialogContent> & {
  size: SelectionDialogSize;
};

export function SelectionDialogContent({
  size,
  className,
  ...props
}: SelectionDialogContentProps): ReactElement {
  return (
    <DialogContent
      data-selection-dialog-size={size}
      className={cn(
        'flex min-h-0 flex-col overflow-hidden',
        SELECTION_DIALOG_SIZE_CLASSNAMES[size],
        className
      )}
      {...props}
    />
  );
}

import * as React from 'react';
import { GripVertical } from 'lucide-react';
import { Group, Panel, Separator } from 'react-resizable-panels';

import { cn } from '@/lib/utils';

function ResizablePanelGroup({
  className,
  direction = 'horizontal',
  ...props
}: React.ComponentProps<typeof Group> & {
  direction?: 'horizontal' | 'vertical';
}): React.ReactElement {
  return <Group orientation={direction} className={cn('flex h-full w-full', className)} {...props} />;
}

function ResizablePanel({ ...props }: React.ComponentProps<typeof Panel>): React.ReactElement {
  return <Panel {...props} />;
}

function ResizableHandle({
  withHandle,
  className,
  ...props
}: React.ComponentProps<typeof Separator> & {
  withHandle?: boolean;
}): React.ReactElement {
  return (
    <Separator
      className={cn(
        'relative mx-1 flex w-2 shrink-0 items-center justify-center bg-transparent after:absolute after:inset-y-0 after:left-1/2 after:w-1 after:-translate-x-1/2 after:rounded-full after:bg-border/70 after:transition-colors hover:after:bg-border data-[separator]:cursor-col-resize',
        className,
      )}
      {...props}
    >
      {withHandle ? (
        <div className="z-10 flex h-7 w-4 items-center justify-center rounded-md border border-border/80 bg-background shadow-sm">
          <GripVertical className="size-3.5 text-muted-foreground" />
        </div>
      ) : null}
    </Separator>
  );
}

export { ResizablePanelGroup, ResizablePanel, ResizableHandle };

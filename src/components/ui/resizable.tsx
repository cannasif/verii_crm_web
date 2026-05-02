import * as React from 'react';
import { GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';

type DivProps = React.HTMLAttributes<HTMLDivElement>;

interface ResizablePanelGroupProps extends DivProps {
  direction?: 'horizontal' | 'vertical';
}

function ResizablePanelGroup({
  className,
  direction = 'horizontal',
  children,
  ...props
}: ResizablePanelGroupProps): React.ReactElement {
  return (
    <div
      className={cn(
        'flex h-full w-full',
        direction === 'vertical' ? 'flex-col' : 'flex-row',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

function ResizablePanel({ className, children, ...props }: DivProps): React.ReactElement {
  return (
    <div className={cn('min-w-0 flex-1', className)} {...props}>
      {children}
    </div>
  );
}

interface ResizableHandleProps extends DivProps {
  withHandle?: boolean;
}

function ResizableHandle({
  withHandle,
  className,
  children,
  ...props
}: ResizableHandleProps): React.ReactElement {
  return (
    <div
      className={cn(
        'relative mx-1 flex w-2 shrink-0 items-center justify-center bg-transparent',
        'after:absolute after:inset-y-0 after:left-1/2 after:w-1 after:-translate-x-1/2 after:rounded-full after:bg-border/70',
        className
      )}
      {...props}
    >
      {withHandle ? (
        <div className="z-10 flex h-7 w-4 items-center justify-center rounded-md border border-border/80 bg-background shadow-sm">
          <GripVertical className="size-3.5 text-muted-foreground" />
        </div>
      ) : (
        children
      )}
    </div>
  );
}

export { ResizablePanelGroup, ResizablePanel, ResizableHandle };

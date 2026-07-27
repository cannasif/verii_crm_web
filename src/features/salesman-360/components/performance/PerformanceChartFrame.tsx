import { type ReactElement, type ReactNode, useEffect, useRef, useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

export function PerformanceChartFrame({
  children,
  heightClassName = 'h-64',
}: {
  children: (size: { width: number; height: number }) => ReactNode;
  heightClassName?: string;
}): ReactElement {
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    const update = (): void => {
      const bounds = element.getBoundingClientRect();
      if (bounds.width > 0 && bounds.height > 0) {
        setSize({
          width: Math.floor(bounds.width),
          height: Math.floor(bounds.height),
        });
      }
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={containerRef} className={`${heightClassName} min-w-0`}>
      {size.width > 0 && size.height > 0
        ? children(size)
        : <Skeleton className="h-full w-full rounded-xl" />}
    </div>
  );
}

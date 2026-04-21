import { type ReactElement, type ReactNode, useEffect, useRef, useState } from 'react';

interface DeferOnViewProps {
  children: ReactNode;
  fallback?: ReactNode;
  rootMargin?: string;
}

export function DeferOnView({
  children,
  fallback = null,
  rootMargin = '200px',
}: DeferOnViewProps): ReactElement {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isVisible) return;
    const element = containerRef.current;
    if (!element) return;

    if (typeof window === 'undefined' || !('IntersectionObserver' in window)) {
      setIsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [isVisible, rootMargin]);

  return <div ref={containerRef}>{isVisible ? children : fallback}</div>;
}

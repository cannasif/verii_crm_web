import { type ReactElement, useId, useMemo } from 'react';

interface SparklineProps {
  values: number[];
  className?: string;
  strokeClassName?: string;
  fillClassName?: string;
  width?: number;
  height?: number;
}

/**
 * Tiny dependency-free trend line for KPI cards — deliberately not routed
 * through recharts (async chunk) since it only needs to paint a handful of
 * points inline with the number it annotates.
 */
export function Sparkline({
  values,
  className,
  strokeClassName = 'text-primary',
  fillClassName = 'text-primary',
  width = 96,
  height = 28,
}: SparklineProps): ReactElement | null {
  const gradientId = useId();

  const path = useMemo(() => {
    if (values.length < 2) return null;
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;
    const stepX = width / (values.length - 1);
    const points = values.map((value, index) => {
      const x = index * stepX;
      const y = height - ((value - min) / range) * (height - 4) - 2;
      return { x, y };
    });
    const line = points.map((point, index) => `${index === 0 ? 'M' : 'L'}${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(' ');
    const area = `${line} L${width},${height} L0,${height} Z`;
    return { line, area };
  }, [values, width, height]);

  if (!path) return null;

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className={className}
      width={width}
      height={height}
      preserveAspectRatio="none"
      aria-hidden
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="currentColor" stopOpacity={0.35} />
          <stop offset="100%" stopColor="currentColor" stopOpacity={0} />
        </linearGradient>
      </defs>
      <path d={path.area} fill={`url(#${gradientId})`} className={fillClassName} />
      <path
        d={path.line}
        fill="none"
        className={strokeClassName}
        stroke="currentColor"
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function computeTrendDelta(values: number[]): number | null {
  if (values.length < 2) return null;
  const previous = values[values.length - 2];
  const current = values[values.length - 1];
  if (previous === 0) return current === 0 ? 0 : null;
  return ((current - previous) / Math.abs(previous)) * 100;
}

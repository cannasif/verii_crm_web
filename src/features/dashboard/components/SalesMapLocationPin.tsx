import { cn } from '@/lib/utils';

interface SalesMapLocationPinProps {
  color: string;
  label?: string;
  selected?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const SIZE_MAP = {
  sm: { width: 24, height: 32, font: 9, circle: 5.2 },
  md: { width: 30, height: 40, font: 11, circle: 6.4 },
  lg: { width: 36, height: 48, font: 13, circle: 7.4 },
} as const;

export function SalesMapLocationPin({
  color,
  label,
  selected = false,
  size = 'md',
  className,
}: SalesMapLocationPinProps) {
  const dims = SIZE_MAP[size];
  const badge = label && label.length > 4 ? label.slice(0, 4) : label;

  return (
    <span className={cn('pointer-events-none relative inline-flex flex-col items-center', className)}>
      <svg
        width={selected ? dims.width + 4 : dims.width}
        height={selected ? dims.height + 4 : dims.height}
        viewBox="0 0 28 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="drop-shadow-lg"
        aria-hidden="true"
      >
        <path
          d="M14 2C8.48 2 4 6.48 4 12C4 20.5 14 38 14 38C14 38 24 20.5 24 12C24 6.48 19.52 2 14 2Z"
          fill={color}
          stroke="#ffffff"
          strokeWidth={selected ? 2.6 : 2.1}
          strokeLinejoin="round"
        />
        <circle cx="14" cy="12" r={dims.circle} fill="#ffffff" />
        {badge ? (
          <text
            x="14"
            y="13"
            textAnchor="middle"
            dominantBaseline="middle"
            fill={color}
            fontSize={badge.length > 2 ? dims.font - 2 : dims.font}
            fontWeight={800}
            fontFamily="ui-sans-serif, system-ui, sans-serif"
          >
            {badge}
          </text>
        ) : (
          <circle cx="14" cy="12" r={dims.circle * 0.35} fill={color} />
        )}
      </svg>
    </span>
  );
}

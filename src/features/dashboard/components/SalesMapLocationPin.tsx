import { cn } from '@/lib/utils';

interface SalesMapLocationPinProps {
  color: string;
  label?: string;
  selected?: boolean;
  className?: string;
}

export function SalesMapLocationPin({
  color,
  label,
  selected = false,
  className,
}: SalesMapLocationPinProps) {
  return (
    <span className={cn('pointer-events-none relative inline-flex flex-col items-center', className)}>
      {label ? (
        <span
          className={cn(
            'absolute -top-1 left-[18px] z-10 whitespace-nowrap rounded border border-white/90 bg-orange-500 px-1.5 py-0.5 text-[10px] font-bold leading-none text-white shadow-md',
            selected && 'ring-2 ring-amber-300',
          )}
          style={{ backgroundColor: color }}
        >
          {label}
        </span>
      ) : null}
      <svg
        width={selected ? 26 : 22}
        height={selected ? 34 : 30}
        viewBox="0 0 24 36"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="drop-shadow-md"
        aria-hidden="true"
      >
        <path
          d="M12 1.75C7.44 1.75 3.75 5.44 3.75 10C3.75 17.4 12 34.25 12 34.25C12 34.25 20.25 17.4 20.25 10C20.25 5.44 16.56 1.75 12 1.75Z"
          fill={color}
          stroke="#ffffff"
          strokeWidth={selected ? 2.4 : 2}
          strokeLinejoin="round"
        />
        <circle cx="12" cy="10" r="4.6" fill="#ffffff" />
      </svg>
    </span>
  );
}

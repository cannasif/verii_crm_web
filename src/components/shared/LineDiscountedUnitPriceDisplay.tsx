import { type ReactElement } from 'react';
import { cn } from '@/lib/utils';
import { getLineUnitDiscountBreakdown } from '@/lib/line-discount-display';
import { formatSystemCurrency } from '@/lib/system-settings';

interface LineDiscountedUnitPriceDisplayProps {
  unitPrice: number;
  discountRate1?: number;
  discountRate2?: number;
  discountRate3?: number;
  currencyCode: string;
  className?: string;
  singlePriceClassName?: string;
  strikethroughClassName?: string;
  discountedClassName?: string;
  align?: 'start' | 'center' | 'end';
}

export function LineDiscountedUnitPriceDisplay({
  unitPrice,
  discountRate1 = 0,
  discountRate2 = 0,
  discountRate3 = 0,
  currencyCode,
  className,
  singlePriceClassName,
  strikethroughClassName,
  discountedClassName,
  align = 'end',
}: LineDiscountedUnitPriceDisplayProps): ReactElement {
  const breakdown = getLineUnitDiscountBreakdown(
    unitPrice,
    discountRate1,
    discountRate2,
    discountRate3,
  );

  const alignClass =
    align === 'start' ? 'items-start' : align === 'center' ? 'items-center' : 'items-end';

  if (!breakdown.hasDiscount) {
    return (
      <span className={singlePriceClassName}>
        {formatSystemCurrency(breakdown.originalUnitPrice, currencyCode)}
      </span>
    );
  }

  return (
    <div className={cn('flex flex-col gap-0.5', alignClass, className)}>
      <span
        className={cn(
          'line-through text-zinc-400 dark:text-zinc-500 text-xs tabular-nums font-mono',
          strikethroughClassName,
        )}
      >
        {formatSystemCurrency(breakdown.originalUnitPrice, currencyCode)}
      </span>
      <span className={cn('font-mono tabular-nums', discountedClassName)}>
        {formatSystemCurrency(breakdown.discountedUnitPrice, currencyCode)}
      </span>
    </div>
  );
}

import { type ReactElement, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { z } from 'zod';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { getZodValidationMessages } from '@/lib/zod-validation-hint';
import { cn } from '@/lib/utils';

interface FormSubmitTooltipWrapProps {
  schema: z.ZodTypeAny;
  /** Şema ile aynı şekil (ör. `{ quotation: … }`, `{ demand: … }`) */
  value: unknown;
  isValid: boolean;
  isPending: boolean;
  /** Önce gösterilir: müşteri, para birimi, ödeme tipi, teklif tipi, seri no vb. */
  manualHintLines?: string[];
  children: ReactElement<{ disabled?: boolean; className?: string }>;
  triggerClassName?: string;
}

export function FormSubmitTooltipWrap({
  schema,
  value,
  isValid,
  isPending,
  manualHintLines,
  children,
  triggerClassName,
}: FormSubmitTooltipWrapProps): ReactElement {
  const { t } = useTranslation('common');
  const disabled = isPending || !isValid;

  const issueLines = useMemo(() => {
    if (isPending || isValid) return [];
    if (manualHintLines && manualHintLines.length > 0) {
      return manualHintLines;
    }
    return getZodValidationMessages(schema, value);
  }, [isPending, isValid, schema, value, manualHintLines]);

  if (!disabled) {
    return children;
  }

  return (
    <Tooltip delayDuration={250}>
      <TooltipTrigger asChild>
        <span
          className={cn(
            'inline-flex w-full sm:w-auto rounded-md outline-none',
            !isPending ? 'cursor-help' : 'cursor-wait',
            triggerClassName,
          )}
          tabIndex={0}
        >
          {children}
        </span>
      </TooltipTrigger>
      <TooltipContent
        side="top"
        align="end"
        className="max-w-sm border bg-popover px-3 py-2.5 text-left text-popover-foreground shadow-md"
      >
        {isPending ? (
          <p className="text-sm">{t('disabledActionHints.savingInProgress')}</p>
        ) : (
          <div className="space-y-2">
            <p className="text-sm font-medium leading-snug">{t('disabledActionHints.saveTitle')}</p>
            <p className="text-xs text-muted-foreground">{t('disabledActionHints.saveIssuesIntro')}</p>
            {issueLines.length > 0 ? (
              <ul className="list-disc space-y-1 pl-4 text-xs leading-relaxed text-foreground/95">
                {issueLines.map((line, idx) => (
                  <li key={`${idx}-${line}`}>{line}</li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-muted-foreground">{t('disabledActionHints.genericFormInvalid')}</p>
            )}
          </div>
        )}
      </TooltipContent>
    </Tooltip>
  );
}

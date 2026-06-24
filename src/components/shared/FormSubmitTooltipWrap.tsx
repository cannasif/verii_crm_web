import { cloneElement, isValidElement, type ReactElement, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { z } from 'zod';
import { documentSaveButtonClassName } from '@/lib/document-save-button';
import { getZodValidationMessages } from '@/lib/zod-validation-hint';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface FormSubmitTooltipWrapProps {
  schema: z.ZodTypeAny;
  value: unknown;
  isValid: boolean;
  isPending: boolean;
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

  const wrappedChild = useMemo(() => {
    if (!isValidElement(children)) {
      return children;
    }
    return cloneElement(children, {
      disabled: disabled || children.props.disabled,
      className: documentSaveButtonClassName(isValid && !isPending, children.props.className),
    });
  }, [children, disabled, isPending, isValid]);

  if (!disabled) {
    return wrappedChild;
  }

  const issuesToRender = issueLines.length > 0 ? issueLines : [t('disabledActionHints.genericFormInvalid')];

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className={cn(
              'inline-flex w-full rounded-md outline-none cursor-not-allowed sm:w-auto',
              triggerClassName,
            )}
            tabIndex={0}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
            }}
          >
            {wrappedChild}
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-80 text-sm font-medium leading-relaxed p-3 z-50">
          {isPending ? (
            <div className="font-bold">{t('disabledActionHints.savingInProgress')}</div>
          ) : (
            <div className="flex flex-col gap-2">
              <span className="font-bold">
                {t('disabledActionHints.saveTitle')}
                <br />
                {t('disabledActionHints.saveIssuesIntro')}
              </span>
              <ul className="list-disc pl-5 space-y-1">
                {issuesToRender.map((hint, idx) => (
                  <li key={idx}>{hint}</li>
                ))}
              </ul>
            </div>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

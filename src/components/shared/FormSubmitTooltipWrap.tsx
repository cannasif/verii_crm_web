import { cloneElement, isValidElement, type ReactElement, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { z } from 'zod';
import { documentSaveButtonClassName } from '@/lib/document-save-button';
import { getZodValidationMessages } from '@/lib/zod-validation-hint';
import { cn } from '@/lib/utils';

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

  const disabledHint = isPending
    ? t('disabledActionHints.savingInProgress')
    : [
      t('disabledActionHints.saveTitle'),
      t('disabledActionHints.saveIssuesIntro'),
      ...(issueLines.length > 0 ? issueLines : [t('disabledActionHints.genericFormInvalid')]),
    ].join('\n');

  return (
    <span
      className={cn(
        'inline-flex w-full rounded-md outline-none cursor-not-allowed sm:w-auto',
        triggerClassName,
      )}
      tabIndex={0}
      title={disabledHint}
      aria-label={disabledHint}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
      }}
    >
      {wrappedChild}
    </span>
  );
}

import { type ReactElement, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { AiAssistantErrorContext } from '../lib/ai-assistant-error-context';

type AiAssistantLastErrorButtonProps = {
  latestErrorContext: AiAssistantErrorContext | null;
  isAssistantBusy: boolean;
  onAskLatestError: () => void | Promise<void>;
  fillHeight?: boolean;
  compact?: boolean;
  cardClassName?: string;
  wrapperClassName?: string;
  buttonClassName?: string;
};

function formatCapturedAt(value: string, locale: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString(locale === 'tr' ? 'tr-TR' : 'en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

export function AiAssistantLastErrorButton({
  latestErrorContext,
  isAssistantBusy,
  onAskLatestError,
  fillHeight = false,
  compact = false,
  cardClassName,
  wrapperClassName,
  buttonClassName,
}: AiAssistantLastErrorButtonProps): ReactElement {
  const { t, i18n } = useTranslation('ai-assistant');
  const [isOpen, setIsOpen] = useState(false);

  const handleAskLatestError = (): void => {
    setIsOpen(false);
    void onAskLatestError();
  };

  return (
    <>
      <div
        className={cn(
          'relative',
          cardClassName ? 'w-auto shrink-0' : 'w-full',
          fillHeight && 'h-full',
          cardClassName,
          wrapperClassName
        )}
      >
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={!latestErrorContext}
          aria-label={latestErrorContext ? t('lastErrorTitle') : t('lastErrorButton')}
          className={cn(
            'w-full rounded-2xl border border-slate-300 text-xs font-black uppercase dark:border-white/20',
            fillHeight && 'h-full min-h-0 items-center justify-center',
            compact && 'px-3 whitespace-nowrap',
            buttonClassName
          )}
          onClick={() => setIsOpen(true)}
        >
          <AlertTriangle size={15} className="me-1.5 shrink-0" />
          {t('lastErrorButton')}
        </Button>
        {latestErrorContext && (
          <span
            aria-hidden
            className="pointer-events-none absolute -right-1 -top-1 z-10 flex h-3.5 w-3.5 rounded-full bg-amber-500 ring-2 ring-white dark:ring-[#180F22]"
          />
        )}
      </div>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-lg rounded-[1.75rem] border-amber-400/30 sm:rounded-[1.75rem]">
          <DialogHeader>
            <DialogTitle className="text-base font-black text-amber-800 dark:text-amber-200">
              {t('lastErrorTitle')}
            </DialogTitle>
            <DialogDescription className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              {latestErrorContext
                ? t('lastErrorCapturedAt', {
                    time: formatCapturedAt(latestErrorContext.capturedAt, i18n.language),
                  })
                : t('lastErrorNoContext')}
            </DialogDescription>
          </DialogHeader>

          {latestErrorContext ? (
            <div className="space-y-3 rounded-2xl border border-amber-400/25 bg-amber-400/10 p-4">
              <p className="text-sm font-semibold leading-6 text-amber-950 dark:text-amber-100">
                {latestErrorContext.httpStatusCode ? `${latestErrorContext.httpStatusCode} · ` : ''}
                {latestErrorContext.message}
              </p>
              {latestErrorContext.errorCode && (
                <p className="text-xs font-bold text-amber-800/80 dark:text-amber-200/80">
                  {t('lastErrorCode', { code: latestErrorContext.errorCode })}
                </p>
              )}
              {(latestErrorContext.requestMethod || latestErrorContext.requestUrl) && (
                <p className="break-all text-xs font-semibold text-amber-900/70 dark:text-amber-100/70">
                  {[latestErrorContext.requestMethod, latestErrorContext.requestUrl].filter(Boolean).join(' ')}
                </p>
              )}
              {latestErrorContext.currentPath && (
                <p className="break-all text-xs font-semibold text-amber-900/70 dark:text-amber-100/70">
                  {latestErrorContext.currentPath}
                </p>
              )}
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-semibold text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
              {t('lastErrorNoContext')}
            </div>
          )}

          <DialogFooter className="gap-2 sm:justify-start">
            {latestErrorContext && (
              <Button
                type="button"
                disabled={isAssistantBusy}
                className="rounded-2xl bg-[image:var(--crm-brand-gradient)] text-xs font-black text-white hover:opacity-90"
                onClick={handleAskLatestError}
              >
                {t('askLastError')}
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              className="rounded-2xl text-xs font-black"
              onClick={() => setIsOpen(false)}
            >
              {t('lastErrorClose')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

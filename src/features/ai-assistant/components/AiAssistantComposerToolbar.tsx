import { type ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { aiAssistantLanguageOptions } from '../lib/ai-assistant-language';
import type { AiAssistantErrorContext } from '../lib/ai-assistant-error-context';
import type { AiAssistantLanguagePreference } from '../types/ai-assistant.types';
import { AiAssistantLastErrorButton } from './AiAssistantLastErrorButton';
import { AiAssistantWidgetToggleButton } from './AiAssistantWidgetToggleButton';

export const aiAssistantComposerToolbarCardClassName =
  'rounded-2xl border border-slate-300 bg-slate-50/80 px-3 py-1.5 dark:border-white/20 dark:bg-white/[0.04]';
export const aiAssistantComposerToolbarInnerActionClassName =
  'h-7 shrink-0 border-0 bg-transparent px-0 text-xs font-black uppercase shadow-none hover:bg-slate-100/80 dark:bg-transparent dark:hover:bg-white/10';
export const aiAssistantComposerToolbarGradientCardClassName =
  'rounded-2xl border border-white/20 bg-[image:var(--crm-brand-gradient)] px-3 py-1.5 shadow-[0_8px_18px_-14px_var(--crm-brand-shadow)] dark:border-white/20';
export const aiAssistantComposerToolbarGradientInnerActionClassName =
  'h-7 w-auto shrink-0 border-0 bg-[image:var(--crm-brand-gradient)] px-0 text-xs font-black uppercase text-white shadow-none hover:bg-[image:var(--crm-brand-gradient)] hover:text-white hover:opacity-90 dark:bg-[image:var(--crm-brand-gradient)] dark:hover:bg-[image:var(--crm-brand-gradient)]';

type AiAssistantComposerToolbarProps = {
  layout: 'inline' | 'menu' | 'measure';
  latestErrorContext: AiAssistantErrorContext | null;
  isAssistantBusy: boolean;
  onAskLatestError: () => void | Promise<void>;
  languagePreference: AiAssistantLanguagePreference;
  onChangeLanguagePreference: (value: AiAssistantLanguagePreference) => void;
  onClearChat: () => void;
};

export function AiAssistantComposerToolbar({
  layout,
  latestErrorContext,
  isAssistantBusy,
  onAskLatestError,
  languagePreference,
  onChangeLanguagePreference,
  onClearChat,
}: AiAssistantComposerToolbarProps): ReactElement {
  const { t } = useTranslation('ai-assistant');
  const isMenuLayout = layout === 'menu';

  const lastErrorControl = (
    <AiAssistantLastErrorButton
      latestErrorContext={latestErrorContext}
      isAssistantBusy={isAssistantBusy}
      onAskLatestError={onAskLatestError}
      compact
      cardClassName={aiAssistantComposerToolbarCardClassName}
      buttonClassName={aiAssistantComposerToolbarInnerActionClassName}
      wrapperClassName={isMenuLayout ? 'w-full' : undefined}
    />
  );

  const widgetToggleControl = (
    <div className={cn(isMenuLayout && 'w-full', aiAssistantComposerToolbarGradientCardClassName)}>
      <AiAssistantWidgetToggleButton
        toolbarStyle
        buttonClassName={aiAssistantComposerToolbarGradientInnerActionClassName}
        className={isMenuLayout ? 'w-full justify-center' : undefined}
      />
    </div>
  );

  const languageControl = (
    <div
      className={cn(
        'flex min-w-0 items-center justify-between gap-2',
        isMenuLayout && 'w-full flex-col items-stretch gap-2',
        aiAssistantComposerToolbarCardClassName
      )}
    >
      <span className="shrink-0 text-[0.68rem] font-black uppercase tracking-wide text-slate-500 dark:text-slate-400">
        {t('responseLanguage')}
      </span>
      <div className="flex min-w-[8.75rem] shrink-0 rounded-full border border-slate-300 bg-white p-0.5 dark:border-white/20 dark:bg-black/20">
        {aiAssistantLanguageOptions.map((option) => (
          <button
            key={option.value}
            type="button"
            disabled={isAssistantBusy}
            title={option.value === 'auto' ? t('responseLanguageAuto') : option.label}
            onClick={() => onChangeLanguagePreference(option.value)}
            className={`inline-flex h-7 min-w-[2.5rem] flex-1 items-center justify-center rounded-full px-2 text-center text-[0.62rem] font-black uppercase transition ${languagePreference === option.value
              ? 'border border-primary/40 bg-[image:var(--crm-brand-gradient)] text-white shadow-sm'
              : 'border border-transparent text-slate-500 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/10'
              } disabled:cursor-not-allowed disabled:opacity-60`}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );

  const newChatControl = (
    <div className={cn(isMenuLayout && 'w-full', aiAssistantComposerToolbarCardClassName)}>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className={cn(aiAssistantComposerToolbarInnerActionClassName, isMenuLayout && 'w-full justify-center')}
        onClick={onClearChat}
      >
        <Plus size={15} className="me-1.5" />
        {t('newChat')}
      </Button>
    </div>
  );

  if (isMenuLayout) {
    return (
      <div className="flex min-w-56 flex-col-reverse gap-2.5 uppercase">
        {lastErrorControl}
        {widgetToggleControl}
        {languageControl}
        {newChatControl}
      </div>
    );
  }

  return (
    <div
      className={cn(
        'flex flex-nowrap items-center justify-between gap-2 uppercase',
        layout === 'inline' ? 'min-w-0 flex-1' : 'w-max shrink-0'
      )}
    >
      <div className="flex shrink-0 flex-nowrap items-center gap-2">{lastErrorControl}</div>
      <div className="flex shrink-0 flex-nowrap items-center gap-2">
        {widgetToggleControl}
        {languageControl}
        {newChatControl}
      </div>
    </div>
  );
}

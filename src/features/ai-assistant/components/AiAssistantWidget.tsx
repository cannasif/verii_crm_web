import { type FormEvent, type ReactElement, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Bot, MessageCircle, SendHorizontal, Sparkles, X } from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useAskAiAssistantMutation } from '../hooks/useAskAiAssistantMutation';
import { useAiAssistantGreetingQuery } from '../hooks/useAiAssistantGreetingQuery';
import { AiAssistantAnswerCard } from './AiAssistantAnswerCard';
import { AiAssistantThinkingIndicator } from './AiAssistantThinkingIndicator';
import {
  getLatestAiAssistantErrorContext,
  subscribeAiAssistantErrorContext,
  type AiAssistantErrorContext,
} from '../lib/ai-assistant-error-context';
import type { AiAssistantActionItemDto } from '../types/ai-assistant.types';

const actionItemClassNameBySeverity: Record<string, string> = {
  danger: 'border-red-400/30 bg-red-400/10 text-red-950 dark:text-red-100',
  warning: 'border-amber-400/30 bg-amber-400/10 text-amber-950 dark:text-amber-100',
  success: 'border-emerald-400/30 bg-emerald-400/10 text-emerald-950 dark:text-emerald-100',
  info: 'border-sky-400/30 bg-sky-400/10 text-sky-950 dark:text-sky-100',
};

const minimumThinkingDurationMs = 900;

function waitForMinimumThinkingDuration(): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, minimumThinkingDurationMs);
  });
}

export function AiAssistantWidget(): ReactElement {
  const { t } = useTranslation('ai-assistant');
  const { user } = useAuthStore();
  const { data: greeting, isLoading } = useAiAssistantGreetingQuery();
  const askMutation = useAskAiAssistantMutation();
  const [isOpen, setIsOpen] = useState(false);
  const [question, setQuestion] = useState('');
  const [lastQuestion, setLastQuestion] = useState<string | null>(null);
  const [lastAnswer, setLastAnswer] = useState<string | null>(null);
  const [lastActionItems, setLastActionItems] = useState<AiAssistantActionItemDto[]>([]);
  const [dynamicSuggestions, setDynamicSuggestions] = useState<string[]>([]);
  const [isThinking, setIsThinking] = useState(false);
  const [latestErrorContext, setLatestErrorContext] = useState<AiAssistantErrorContext | null>(
    () => getLatestAiAssistantErrorContext()
  );
  const [questionError, setQuestionError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => subscribeAiAssistantErrorContext(setLatestErrorContext), []);

  useEffect(() => {
    if (!isOpen) return;

    const focusTimer = window.setTimeout(() => {
      textareaRef.current?.focus();
    }, 80);

    return () => window.clearTimeout(focusTimer);
  }, [isOpen]);

  const fallbackName = user?.name || user?.email || t('fallbackName');
  const displayName = greeting?.fullName?.trim() || fallbackName;
  const fallbackSuggestions = [1, 2, 3, 4].map((index) => t(`suggestions.${index}`));
  const suggestionItems = dynamicSuggestions.length > 0 ? dynamicSuggestions : fallbackSuggestions;
  const isAssistantBusy = askMutation.isPending || isThinking;

  const askQuestion = async (value: string, errorContext?: AiAssistantErrorContext | null): Promise<void> => {
    const trimmedQuestion = value.trim();
    if (!trimmedQuestion) {
      setQuestionError(t('emptyQuestion'));
      return;
    }

    setQuestionError(null);
    setLastQuestion(trimmedQuestion);
    setLastAnswer(null);
    setLastActionItems([]);
    setIsThinking(true);

    try {
      const [result] = await Promise.all([
        askMutation.mutateAsync({
          question: trimmedQuestion,
          currentPath: window.location.pathname,
          errorMessage: errorContext
            ? `${errorContext.message}${errorContext.requestMethod || errorContext.requestUrl ? ` | ${errorContext.requestMethod ?? ''} ${errorContext.requestUrl ?? ''}` : ''}`
            : undefined,
          errorCode: errorContext?.errorCode ?? undefined,
          httpStatusCode: errorContext?.httpStatusCode ?? undefined,
        }),
        waitForMinimumThinkingDuration(),
      ]);
      setLastAnswer(result.answer);
      setLastActionItems(result.actionItems ?? []);
      setDynamicSuggestions(result.suggestedQuestions?.length ? result.suggestedQuestions : fallbackSuggestions);
      setQuestion('');
    } finally {
      setIsThinking(false);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    await askQuestion(question);
  };

  const askLatestError = async (): Promise<void> => {
    if (!latestErrorContext) return;
    await askQuestion(t('askLastErrorQuestion'), latestErrorContext);
  };

  return (
    <div
      className="fixed bottom-4 z-50 print:hidden md:bottom-6"
      style={{ insetInlineEnd: '1rem' }}
    >
      {isOpen ? (
        <section className="flex w-[calc(100vw-2rem)] max-w-[430px] flex-col overflow-hidden rounded-[2rem] border border-white/20 bg-white/95 shadow-2xl shadow-pink-950/20 backdrop-blur-2xl dark:border-white/10 dark:bg-slate-950/95">
          <header className="flex items-center justify-between gap-3 border-b border-slate-200/80 bg-[radial-gradient(circle_at_top_left,rgba(236,72,153,0.20),transparent_36%),radial-gradient(circle_at_bottom_right,rgba(249,115,22,0.16),transparent_34%)] p-4 dark:border-white/10">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-linear-to-br from-pink-600 to-orange-500 text-white shadow-lg shadow-pink-500/25">
                <Bot size={22} />
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-black text-slate-950 dark:text-white">
                  {t('pageTitle')}
                </p>
                <p className="truncate text-xs font-semibold text-slate-500 dark:text-slate-400">
                  {isLoading ? t('loadingGreeting') : t('greeting', { name: displayName })}
                </p>
              </div>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-10 w-10 rounded-2xl"
              aria-label={t('closeChat')}
              onClick={() => setIsOpen(false)}
            >
              <X size={18} />
            </Button>
          </header>

          <div className="max-h-[min(60dvh,520px)] space-y-4 overflow-y-auto p-4">
            <div className="rounded-3xl border border-pink-500/15 bg-pink-500/5 p-4">
              <div className="mb-2 inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-pink-600 dark:text-pink-300">
                <Sparkles size={14} />
                {t('eyebrow')}
              </div>
              <p className="text-sm font-medium leading-6 text-slate-600 dark:text-slate-300">
                {t('chatDescription')}
              </p>
            </div>

            {lastQuestion && (
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 text-sm font-semibold text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-200">
                <div className="mb-1 text-xs font-black uppercase tracking-[0.2em] text-slate-400">
                  {t('lastQuestion')}
                </div>
                {lastQuestion}
              </div>
            )}

            {isAssistantBusy && <AiAssistantThinkingIndicator />}

            {lastAnswer && (
              <AiAssistantAnswerCard
                title={t('answerTitle')}
                answer={lastAnswer}
              />
            )}

            {lastActionItems.length > 0 && (
              <div className="rounded-3xl border border-slate-200 bg-white/70 p-4 dark:border-white/10 dark:bg-white/5">
                <div className="mb-3 text-xs font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-300">
                  {t('actionItemsTitle')}
                </div>
                <div className="grid gap-2">
                  {lastActionItems.map((item) => (
                    <div
                      key={`${item.title}-${item.description}`}
                      className={`rounded-2xl border p-3 ${actionItemClassNameBySeverity[item.severity] ?? actionItemClassNameBySeverity.info}`}
                    >
                      <div className="text-xs font-black">{item.title}</div>
                      <p className="mt-1 text-xs font-semibold leading-5 opacity-85">{item.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {latestErrorContext && (
              <div className="rounded-3xl border border-amber-400/30 bg-amber-400/10 p-4">
                <div className="mb-1 text-xs font-black uppercase tracking-[0.2em] text-amber-700 dark:text-amber-300">
                  {t('lastErrorTitle')}
                </div>
                <p className="line-clamp-2 text-xs font-semibold leading-5 text-amber-950 dark:text-amber-100">
                  {latestErrorContext.httpStatusCode ? `${latestErrorContext.httpStatusCode} · ` : ''}
                  {latestErrorContext.message}
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isAssistantBusy}
                  className="mt-3 h-9 rounded-2xl border-amber-300/60 bg-white/70 text-xs font-black text-amber-800 hover:bg-amber-50 dark:bg-white/5 dark:text-amber-100"
                  onClick={() => void askLatestError()}
                >
                  {t('askLastError')}
                </Button>
              </div>
            )}

            <div className="grid gap-2">
              {suggestionItems.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  disabled={isAssistantBusy}
                  onClick={() => void askQuestion(suggestion)}
                  className="rounded-2xl border border-slate-200 bg-white/70 p-3 text-start text-xs font-bold text-slate-700 transition hover:border-pink-300 hover:bg-pink-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:border-pink-400/60 dark:hover:bg-pink-500/10"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>

          <form
            className="border-t border-slate-200/80 bg-slate-50/80 p-4 dark:border-white/10 dark:bg-black/20"
            onSubmit={handleSubmit}
          >
            <Textarea
              ref={textareaRef}
              rows={2}
              placeholder={t('inputPlaceholder')}
              className="max-h-28 resize-none rounded-2xl bg-white text-sm dark:bg-white/5"
              value={question}
              onChange={(event) => {
                setQuestion(event.target.value);
                if (questionError) {
                  setQuestionError(null);
                }
              }}
            />
            <div className="mt-3 flex items-center justify-between gap-3">
              <p className="min-w-0 flex-1 truncate text-xs font-medium text-slate-500 dark:text-slate-400">
                {questionError || askMutation.error?.message || t('chatHint')}
              </p>
              <Button
                type="submit"
                disabled={isAssistantBusy}
                className="shrink-0 rounded-2xl bg-linear-to-r from-pink-600 to-orange-600 text-white"
              >
                <SendHorizontal size={16} className="me-2" />
                {isAssistantBusy ? t('sending') : t('send')}
              </Button>
            </div>
          </form>
        </section>
      ) : (
        <button
          type="button"
          aria-label={t('openChat')}
          onClick={() => setIsOpen(true)}
          className="group flex items-center gap-3 rounded-full border border-white/20 bg-linear-to-r from-pink-600 to-orange-500 px-4 py-3 text-sm font-black text-white shadow-2xl shadow-pink-950/25 transition hover:scale-[1.02] hover:shadow-pink-600/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-400 focus-visible:ring-offset-2 dark:ring-offset-slate-950"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20">
            <MessageCircle size={20} />
          </span>
          <span className="hidden sm:inline">{t('pageTitle')}</span>
        </button>
      )}
    </div>
  );
}

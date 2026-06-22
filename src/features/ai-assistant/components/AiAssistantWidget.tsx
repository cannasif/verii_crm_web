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

type AiAssistantChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  actionItems?: AiAssistantActionItemDto[];
};

function waitForMinimumThinkingDuration(): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, minimumThinkingDurationMs);
  });
}

function createMessageId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function AiAssistantWidget(): ReactElement {
  const { t } = useTranslation('ai-assistant');
  const { user } = useAuthStore();
  const { data: greeting, isLoading } = useAiAssistantGreetingQuery();
  const askMutation = useAskAiAssistantMutation();
  const [isOpen, setIsOpen] = useState(false);
  const [question, setQuestion] = useState('');
  const [messages, setMessages] = useState<AiAssistantChatMessage[]>([]);
  const [dynamicSuggestions, setDynamicSuggestions] = useState<string[]>([]);
  const [isThinking, setIsThinking] = useState(false);
  const [latestErrorContext, setLatestErrorContext] = useState<AiAssistantErrorContext | null>(
    () => getLatestAiAssistantErrorContext()
  );
  const [questionError, setQuestionError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

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

  useEffect(() => {
    if (!isOpen) return;

    messagesEndRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'end',
    });
  }, [isOpen, messages, isAssistantBusy]);

  const askQuestion = async (value: string, errorContext?: AiAssistantErrorContext | null): Promise<void> => {
    const trimmedQuestion = value.trim();
    if (!trimmedQuestion) {
      setQuestionError(t('emptyQuestion'));
      return;
    }

    setQuestionError(null);
    setMessages((currentMessages) => [
      ...currentMessages,
      {
        id: createMessageId(),
        role: 'user',
        content: trimmedQuestion,
      },
    ]);
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
      setMessages((currentMessages) => [
        ...currentMessages,
        {
          id: createMessageId(),
          role: 'assistant',
          content: result.answer,
          actionItems: result.actionItems ?? [],
        },
      ]);
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
        <section className="flex h-[min(82dvh,760px)] w-[calc(100vw-1.25rem)] max-w-[500px] flex-col overflow-hidden rounded-[2rem] border border-white/20 bg-[radial-gradient(circle_at_20%_0%,rgba(236,72,153,0.20),transparent_32%),radial-gradient(circle_at_100%_10%,rgba(249,115,22,0.16),transparent_28%),linear-gradient(180deg,rgba(255,255,255,0.96),rgba(248,250,252,0.92))] shadow-2xl shadow-pink-950/25 backdrop-blur-2xl dark:border-white/10 dark:bg-[radial-gradient(circle_at_20%_0%,rgba(236,72,153,0.18),transparent_32%),radial-gradient(circle_at_100%_10%,rgba(249,115,22,0.14),transparent_28%),linear-gradient(180deg,rgba(2,6,23,0.98),rgba(15,23,42,0.94))]">
          <header className="flex items-center justify-between gap-3 border-b border-slate-200/70 bg-white/55 p-4 backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.03]">
            <div className="flex min-w-0 items-center gap-3">
              <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-linear-to-br from-pink-600 via-rose-500 to-orange-500 text-white shadow-lg shadow-pink-500/25">
                <Bot size={22} />
                <span className="absolute -bottom-0.5 -end-0.5 h-3.5 w-3.5 rounded-full border-2 border-white bg-emerald-400 dark:border-slate-950" />
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

          <div className="flex-1 space-y-4 overflow-y-auto px-4 py-5">
            {messages.length === 0 && (
              <div className="flex items-start gap-3">
                <div className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-linear-to-br from-emerald-400 to-cyan-500 text-white shadow-lg shadow-emerald-950/20">
                  <Sparkles size={17} />
                </div>
                <div className="max-w-[86%] rounded-[1.6rem] rounded-ss-md border border-pink-500/15 bg-white/80 p-4 shadow-sm backdrop-blur-xl dark:bg-white/[0.06]">
                  <div className="mb-2 inline-flex items-center gap-2 text-[0.68rem] font-black uppercase tracking-[0.22em] text-pink-600 dark:text-pink-300">
                    {t('eyebrow')}
                  </div>
                  <p className="text-sm font-semibold leading-6 text-slate-600 dark:text-slate-200">
                    {t('chatDescription')}
                  </p>
                </div>
              </div>
            )}

            {messages.map((message) => (
              <div
                key={message.id}
                className={message.role === 'user' ? 'flex justify-end' : 'space-y-3'}
              >
                {message.role === 'user' ? (
                  <div className="max-w-[82%] rounded-[1.45rem] rounded-ee-md bg-linear-to-r from-pink-600 via-rose-500 to-orange-500 px-4 py-3 text-sm font-black leading-6 text-white shadow-lg shadow-pink-950/20">
                    {message.content}
                  </div>
                ) : (
                  <>
                    <div className="flex items-start gap-3">
                      <div className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-linear-to-br from-emerald-400 to-cyan-500 text-white shadow-lg shadow-emerald-950/20">
                        <Bot size={17} />
                      </div>
                      <div className="max-w-[86%] flex-1">
                        <AiAssistantAnswerCard
                          title={t('answerTitle')}
                          answer={message.content}
                        />
                      </div>
                    </div>

                    {message.actionItems && message.actionItems.length > 0 && (
                      <div className="ms-12 rounded-3xl border border-slate-200 bg-white/70 p-4 shadow-sm dark:border-white/10 dark:bg-white/5">
                        <div className="mb-3 text-[0.68rem] font-black uppercase tracking-[0.22em] text-slate-500 dark:text-slate-300">
                          {t('actionItemsTitle')}
                        </div>
                        <div className="grid gap-2">
                          {message.actionItems.map((item) => (
                            <div
                              key={`${message.id}-${item.title}-${item.description}`}
                              className={`rounded-2xl border p-3 ${actionItemClassNameBySeverity[item.severity] ?? actionItemClassNameBySeverity.info}`}
                            >
                              <div className="text-xs font-black">{item.title}</div>
                              <p className="mt-1 text-xs font-semibold leading-5 opacity-85">{item.description}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            ))}

            {isAssistantBusy && <AiAssistantThinkingIndicator />}

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

            <div className="flex flex-wrap gap-2">
              {suggestionItems.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  disabled={isAssistantBusy}
                  onClick={() => void askQuestion(suggestion)}
                  className="rounded-full border border-slate-200 bg-white/70 px-3.5 py-2 text-start text-xs font-black text-slate-700 shadow-sm transition hover:border-pink-300 hover:bg-pink-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:border-pink-400/60 dark:hover:bg-pink-500/10"
                >
                  {suggestion}
                </button>
              ))}
            </div>

            <div ref={messagesEndRef} />
          </div>

          <form className="border-t border-slate-200/80 bg-white/75 p-4 backdrop-blur-xl dark:border-white/10 dark:bg-black/30" onSubmit={handleSubmit}>
            <Textarea
              ref={textareaRef}
              rows={2}
              placeholder={t('inputPlaceholder')}
              className="max-h-28 resize-none rounded-[1.4rem] border-slate-200 bg-white/90 px-4 py-3 text-sm font-semibold shadow-sm dark:border-white/10 dark:bg-white/[0.06]"
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
                className="shrink-0 rounded-full bg-linear-to-r from-pink-600 via-rose-500 to-orange-500 px-5 text-white shadow-lg shadow-pink-950/20"
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

import { type FormEvent, type ReactElement, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Bot, MessageCircle, SendHorizontal, Sparkles, X } from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useAskAiAssistantMutation } from '../hooks/useAskAiAssistantMutation';
import { useAiAssistantGreetingQuery } from '../hooks/useAiAssistantGreetingQuery';

export function AiAssistantWidget(): ReactElement {
  const { t } = useTranslation('ai-assistant');
  const { user } = useAuthStore();
  const { data: greeting, isLoading } = useAiAssistantGreetingQuery();
  const askMutation = useAskAiAssistantMutation();
  const [isOpen, setIsOpen] = useState(false);
  const [question, setQuestion] = useState('');
  const [lastQuestion, setLastQuestion] = useState<string | null>(null);
  const [lastAnswer, setLastAnswer] = useState<string | null>(null);
  const [dynamicSuggestions, setDynamicSuggestions] = useState<string[]>([]);
  const [questionError, setQuestionError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

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

  const askQuestion = async (value: string): Promise<void> => {
    const trimmedQuestion = value.trim();
    if (!trimmedQuestion) {
      setQuestionError(t('emptyQuestion'));
      return;
    }

    setQuestionError(null);
    setLastQuestion(trimmedQuestion);
    const result = await askMutation.mutateAsync({
      question: trimmedQuestion,
      currentPath: window.location.pathname,
    });
    setLastAnswer(result.answer);
    setDynamicSuggestions(result.suggestedQuestions?.length ? result.suggestedQuestions : fallbackSuggestions);
    setQuestion('');
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    await askQuestion(question);
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

            {lastAnswer && (
              <div className="rounded-3xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm font-semibold leading-6 text-emerald-950 dark:text-emerald-100">
                <div className="mb-1 text-xs font-black uppercase tracking-[0.2em] text-emerald-700 dark:text-emerald-300">
                  {t('answerTitle')}
                </div>
                {lastAnswer}
              </div>
            )}

            <div className="grid gap-2">
              {suggestionItems.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  disabled={askMutation.isPending}
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
                disabled={askMutation.isPending}
                className="shrink-0 rounded-2xl bg-linear-to-r from-pink-600 to-orange-600 text-white"
              >
                <SendHorizontal size={16} className="me-2" />
                {askMutation.isPending ? t('sending') : t('send')}
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

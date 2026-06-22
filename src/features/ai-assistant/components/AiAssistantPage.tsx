import { type ChangeEvent, type FormEvent, type KeyboardEvent, type ReactElement, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Bot, Check, Copy, ExternalLink, FileImage, ImagePlus, MessageCircle, Plus, SendHorizontal, Sparkles, X } from 'lucide-react';
import { useUIStore } from '@/stores/ui-store';
import { useAuthStore } from '@/stores/auth-store';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
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
import {
  createAiAssistantChatHistoryKey,
  readAiAssistantChatHistory,
  writeAiAssistantChatHistory,
  type AiAssistantChatMessage,
} from '../lib/ai-assistant-chat-history';
import {
  aiAssistantAllowedImageTypes,
  aiAssistantMaxImageSizeBytes,
  aiAssistantMaxImageSizeMb,
  createAttachmentMetadata,
  createAttachmentRequest,
  formatAttachmentSize,
  readFileAsBase64,
  type AiAssistantSelectedAttachment,
} from '../lib/ai-assistant-attachments';
import { copyTextToClipboard } from '../lib/ai-assistant-clipboard';

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

function createMessageId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function AiAssistantPage(): ReactElement {
  const { t } = useTranslation('ai-assistant');
  const navigate = useNavigate();
  const { setPageTitle } = useUIStore();
  const { user } = useAuthStore();
  const { data: greeting, isLoading } = useAiAssistantGreetingQuery();
  const askMutation = useAskAiAssistantMutation();
  const chatHistoryKey = createAiAssistantChatHistoryKey(user);
  const [question, setQuestion] = useState('');
  const [messages, setMessages] = useState<AiAssistantChatMessage[]>(() =>
    readAiAssistantChatHistory(chatHistoryKey)
  );
  const [dynamicSuggestions, setDynamicSuggestions] = useState<string[]>([]);
  const [isThinking, setIsThinking] = useState(false);
  const [latestErrorContext, setLatestErrorContext] = useState<AiAssistantErrorContext | null>(
    () => getLatestAiAssistantErrorContext()
  );
  const [questionError, setQuestionError] = useState<string | null>(null);
  const [selectedAttachment, setSelectedAttachment] = useState<AiAssistantSelectedAttachment | null>(null);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const sendButtonRef = useRef<HTMLButtonElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const loadedChatHistoryKeyRef = useRef(chatHistoryKey);
  const skipNextHistoryWriteRef = useRef(false);

  useEffect(() => {
    setPageTitle(t('pageTitle'));
    return () => setPageTitle(null);
  }, [setPageTitle, t]);

  useEffect(() => subscribeAiAssistantErrorContext(setLatestErrorContext), []);

  useEffect(() => {
    if (loadedChatHistoryKeyRef.current !== chatHistoryKey) {
      skipNextHistoryWriteRef.current = true;
      loadedChatHistoryKeyRef.current = chatHistoryKey;
    }

    setMessages(readAiAssistantChatHistory(chatHistoryKey));
  }, [chatHistoryKey]);

  useEffect(() => {
    if (skipNextHistoryWriteRef.current) {
      skipNextHistoryWriteRef.current = false;
      return;
    }

    writeAiAssistantChatHistory(chatHistoryKey, messages);
  }, [chatHistoryKey, messages]);

  const fallbackName = user?.name || user?.email || t('fallbackName');
  const displayName = greeting?.fullName?.trim() || fallbackName;
  const fallbackSuggestions = [1, 2, 3, 4].map((index) => t(`suggestions.${index}`));
  const suggestionItems = dynamicSuggestions.length > 0 ? dynamicSuggestions : fallbackSuggestions;
  const isAssistantBusy = askMutation.isPending || isThinking;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'end',
    });
  }, [messages, isAssistantBusy]);

  const clearSelectedAttachment = (): void => {
    setSelectedAttachment(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleAttachmentChange = async (event: ChangeEvent<HTMLInputElement>): Promise<void> => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    if (!aiAssistantAllowedImageTypes.has(file.type)) {
      setQuestionError(t('imageUnsupported'));
      clearSelectedAttachment();
      return;
    }

    if (file.size > aiAssistantMaxImageSizeBytes) {
      setQuestionError(t('imageTooLarge', { size: aiAssistantMaxImageSizeMb }));
      clearSelectedAttachment();
      return;
    }

    const base64Content = await readFileAsBase64(file);
    setSelectedAttachment({
      fileName: file.name,
      contentType: file.type,
      size: file.size,
      base64Content,
    });
    setQuestionError(null);
  };

  const askQuestion = async (value: string, errorContext?: AiAssistantErrorContext | null): Promise<void> => {
    const trimmedQuestion = value.trim();
    const activeAttachment = selectedAttachment;
    if (!trimmedQuestion && !activeAttachment) {
      setQuestionError(t('emptyQuestion'));
      return;
    }

    const finalQuestion = trimmedQuestion || t('imageDefaultQuestion');
    setQuestionError(null);
    setMessages((currentMessages) => [
      ...currentMessages,
      {
        id: createMessageId(),
        role: 'user',
        content: finalQuestion,
        createdAt: new Date().toISOString(),
        attachments: activeAttachment ? [createAttachmentMetadata(activeAttachment)] : undefined,
      },
    ]);
    setIsThinking(true);

    try {
      const [result] = await Promise.all([
        askMutation.mutateAsync({
          question: finalQuestion,
          currentPath: window.location.pathname,
          errorMessage: errorContext
            ? `${errorContext.message}${errorContext.requestMethod || errorContext.requestUrl ? ` | ${errorContext.requestMethod ?? ''} ${errorContext.requestUrl ?? ''}` : ''}`
            : undefined,
          errorCode: errorContext?.errorCode ?? undefined,
          httpStatusCode: errorContext?.httpStatusCode ?? undefined,
          attachments: activeAttachment ? [createAttachmentRequest(activeAttachment)] : [],
        }),
        waitForMinimumThinkingDuration(),
      ]);
      setMessages((currentMessages) => [
        ...currentMessages,
        {
          id: createMessageId(),
          role: 'assistant',
          content: result.answer,
          createdAt: new Date().toISOString(),
          actionItems: result.actionItems ?? [],
          sources: result.sources ?? [],
          intent: result.intent,
        },
      ]);
      setDynamicSuggestions(result.suggestedQuestions?.length ? result.suggestedQuestions : fallbackSuggestions);
      setQuestion('');
      clearSelectedAttachment();
    } finally {
      setIsThinking(false);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    await askQuestion(question);
  };

  const handleQuestionKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>): void => {
    if (event.key !== 'Tab' || event.shiftKey) {
      return;
    }

    event.preventDefault();
    sendButtonRef.current?.focus();
  };

  const askLatestError = async (): Promise<void> => {
    if (!latestErrorContext) return;
    await askQuestion(t('askLastErrorQuestion'), latestErrorContext);
  };

  const clearChat = (): void => {
    setMessages([]);
    setDynamicSuggestions([]);
    setQuestionError(null);
    clearSelectedAttachment();
  };

  const openActionUrl = (actionUrl: string): void => {
    if (actionUrl.startsWith('http')) {
      window.open(actionUrl, '_blank', 'noopener,noreferrer');
      return;
    }

    navigate(actionUrl);
  };

  const copyAssistantMessage = async (message: AiAssistantChatMessage): Promise<void> => {
    await copyTextToClipboard(message.content);
    setCopiedMessageId(message.id);
    window.setTimeout(() => {
      setCopiedMessageId((current) => (current === message.id ? null : current));
    }, 1600);
  };

  return (
    <div className="min-h-[calc(100vh-7rem)] w-full overflow-hidden rounded-[2rem] border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(236,72,153,0.20),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(14,165,233,0.16),transparent_30%)] p-4 md:p-8">
      <div className="mx-auto flex max-w-5xl flex-col gap-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-pink-500/30 bg-pink-500/10 px-4 py-2 text-sm font-semibold text-pink-600 dark:text-pink-200">
              <Sparkles size={16} />
              {t('eyebrow')}
            </div>
            <div>
              <h1 className="text-3xl font-black tracking-tight text-slate-950 dark:text-white md:text-5xl">
                {isLoading ? t('loadingGreeting') : t('greeting', { name: displayName })}
              </h1>
              <p className="mt-3 max-w-2xl text-sm font-medium leading-6 text-slate-600 dark:text-slate-300 md:text-base">
                {t('subtitle')}
              </p>
            </div>
          </div>

          <div className="hidden h-28 w-28 items-center justify-center rounded-[2rem] border border-white/15 bg-white/20 shadow-2xl shadow-pink-500/20 backdrop-blur-xl dark:bg-white/5 md:flex">
            <Bot className="text-pink-500" size={48} />
          </div>
        </div>

        <Card className="overflow-hidden border-white/15 bg-[radial-gradient(circle_at_12%_0%,rgba(236,72,153,0.14),transparent_30%),linear-gradient(180deg,rgba(255,255,255,0.90),rgba(248,250,252,0.78))] shadow-2xl shadow-slate-950/5 backdrop-blur-xl dark:bg-[radial-gradient(circle_at_12%_0%,rgba(236,72,153,0.16),transparent_30%),linear-gradient(180deg,rgba(2,6,23,0.86),rgba(15,23,42,0.70))]">
          <CardContent className="space-y-5 p-5 md:p-7">
            <div className="flex items-center gap-3">
              <div className="relative flex h-11 w-11 items-center justify-center rounded-2xl bg-linear-to-br from-pink-500 via-rose-500 to-orange-500 text-white shadow-lg shadow-pink-500/25">
                <MessageCircle size={22} />
                <span className="absolute -bottom-0.5 -end-0.5 h-3.5 w-3.5 rounded-full border-2 border-white bg-emerald-400 dark:border-slate-950" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-950 dark:text-white">{t('chatTitle')}</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">{t('chatDescription')}</p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="ms-auto rounded-2xl text-xs font-black"
                onClick={clearChat}
              >
                <Plus size={15} className="me-1.5" />
                {t('newChat')}
              </Button>
            </div>

            <div
              className="max-h-[min(58dvh,660px)] space-y-5 overflow-y-auto rounded-[2rem] border border-slate-200 bg-white/55 p-4 shadow-inner shadow-slate-950/5 backdrop-blur-xl dark:border-white/10 dark:bg-black/25"
              role="log"
              aria-live="polite"
              aria-relevant="additions text"
            >
              {messages.length === 0 && (
                <div className="flex items-start gap-3">
                  <div className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-linear-to-br from-emerald-400 to-cyan-500 text-white shadow-lg shadow-emerald-950/20">
                    <Sparkles size={18} />
                  </div>
                  <div className="max-w-2xl rounded-[1.6rem] rounded-ss-md border border-pink-500/15 bg-white/80 p-5 shadow-sm backdrop-blur-xl dark:bg-white/[0.06]">
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
                    <div className="max-w-[78%] rounded-[1.45rem] rounded-ee-md bg-linear-to-r from-pink-600 via-rose-500 to-orange-500 px-5 py-3 text-sm font-black leading-6 text-white shadow-lg shadow-pink-950/20">
                      <p>{message.content}</p>
                      {message.attachments?.map((attachment) => (
                        <div
                          key={`${message.id}-${attachment.fileName}-${attachment.size}`}
                          className="mt-2 flex items-center gap-2 rounded-2xl bg-white/15 px-3 py-2 text-xs font-bold"
                        >
                          <FileImage size={14} />
                          <span className="min-w-0 truncate">{attachment.fileName}</span>
                          <span className="shrink-0 opacity-80">{formatAttachmentSize(attachment.size)}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <>
                      <div className="flex items-start gap-3">
                        <div className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-linear-to-br from-emerald-400 to-cyan-500 text-white shadow-lg shadow-emerald-950/20">
                          <Bot size={18} />
                        </div>
                        <div className="max-w-3xl flex-1">
                          <AiAssistantAnswerCard
                            title={t('answerTitle')}
                            answer={message.content}
                          />
                          <div className="mt-2 flex justify-end">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-8 rounded-xl px-3 text-xs font-black text-slate-500 hover:text-pink-600 dark:text-slate-300"
                              onClick={() => void copyAssistantMessage(message)}
                            >
                              {copiedMessageId === message.id ? (
                                <Check size={13} className="me-1.5" />
                              ) : (
                                <Copy size={13} className="me-1.5" />
                              )}
                              {copiedMessageId === message.id ? t('copied') : t('copyAnswer')}
                            </Button>
                          </div>
                          {message.sources && message.sources.length > 0 && (
                            <div className="mt-3 rounded-2xl border border-slate-200/80 bg-white/70 p-3 dark:border-white/10 dark:bg-white/[0.04]">
                              <div className="mb-2 text-[0.62rem] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-300">
                                {t('sourceTitle')}
                              </div>
                              <div className="grid gap-2 md:grid-cols-2">
                                {message.sources.map((source) => (
                                  <div
                                    key={`${message.id}-${source.label}-${source.module ?? ''}-${source.period ?? ''}`}
                                    className="rounded-xl bg-slate-950/[0.03] px-3 py-2 text-xs font-semibold leading-5 text-slate-600 dark:bg-white/[0.04] dark:text-slate-300"
                                  >
                                    <span className="font-black text-slate-900 dark:text-white">{source.label}</span>
                                    {source.module ? <span> · {source.module}</span> : null}
                                    {source.period ? <span> · {source.period}</span> : null}
                                    <p className="mt-0.5 opacity-80">{source.description}</p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>

                      {message.actionItems && message.actionItems.length > 0 && (
                        <div className="ms-14 rounded-3xl border border-slate-200 bg-white/70 p-4 shadow-sm dark:border-white/10 dark:bg-white/5">
                          <div className="mb-3 text-[0.68rem] font-black uppercase tracking-[0.22em] text-slate-500 dark:text-slate-300">
                            {t('actionItemsTitle')}
                          </div>
                          <div className="grid gap-3 md:grid-cols-2">
                            {message.actionItems.map((item) => (
                              <div
                                key={`${message.id}-${item.title}-${item.description}`}
                                className={`rounded-2xl border p-4 ${actionItemClassNameBySeverity[item.severity] ?? actionItemClassNameBySeverity.info}`}
                              >
                                <div className="text-sm font-black">{item.title}</div>
                                <p className="mt-2 text-sm font-semibold leading-6 opacity-85">{item.description}</p>
                                {item.actionUrl && (
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    className="mt-3 h-9 rounded-xl bg-white/70 px-3 text-xs font-black dark:bg-white/10"
                                    onClick={() => openActionUrl(item.actionUrl!)}
                                  >
                                    <ExternalLink size={13} className="me-1.5" />
                                    {item.actionLabel || t('openAction')}
                                  </Button>
                                )}
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
              <div ref={messagesEndRef} />
            </div>

            {latestErrorContext && (
              <div className="rounded-3xl border border-amber-400/30 bg-amber-400/10 p-4">
                <div className="mb-1 text-xs font-black uppercase tracking-[0.2em] text-amber-700 dark:text-amber-300">
                  {t('lastErrorTitle')}
                </div>
                <p className="text-sm font-semibold leading-6 text-amber-950 dark:text-amber-100">
                  {latestErrorContext.httpStatusCode ? `${latestErrorContext.httpStatusCode} · ` : ''}
                  {latestErrorContext.message}
                </p>
                <Button
                  type="button"
                  variant="outline"
                  disabled={isAssistantBusy}
                  className="mt-3 rounded-2xl border-amber-300/60 bg-white/70 text-amber-800 hover:bg-amber-50 dark:bg-white/5 dark:text-amber-100"
                  onClick={() => void askLatestError()}
                >
                  {t('askLastError')}
                </Button>
              </div>
            )}

            <form
              className="rounded-[2rem] border border-slate-200 bg-white/80 p-4 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-black/25"
              onSubmit={handleSubmit}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={(event) => void handleAttachmentChange(event)}
              />
              <div className="mb-4 flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isAssistantBusy}
                  className="h-9 rounded-2xl border-slate-200 bg-white/80 px-3 text-xs font-black dark:border-white/10 dark:bg-white/[0.06]"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <ImagePlus size={14} className="me-1.5" />
                  {t('attachImage')}
                </Button>
                {selectedAttachment && (
                  <div className="flex min-w-0 max-w-full items-center gap-2 rounded-2xl border border-pink-400/30 bg-pink-500/10 px-3 py-2 text-xs font-black text-pink-700 dark:text-pink-100">
                    <FileImage size={14} className="shrink-0" />
                    <span className="min-w-0 truncate">{selectedAttachment.fileName}</span>
                    <span className="shrink-0 opacity-75">{formatAttachmentSize(selectedAttachment.size)}</span>
                    <button
                      type="button"
                      className="ms-1 rounded-full p-0.5 hover:bg-pink-500/15"
                      aria-label={t('removeImage')}
                      onClick={clearSelectedAttachment}
                    >
                      <X size={13} />
                    </button>
                  </div>
                )}
              </div>
              <Textarea
                ref={textareaRef}
                rows={4}
                placeholder={t('inputPlaceholder')}
                className="resize-none border-0 bg-transparent p-0 text-base font-semibold shadow-none focus-visible:ring-0"
                value={question}
                onChange={(event) => {
                  setQuestion(event.target.value);
                  if (questionError) {
                    setQuestionError(null);
                  }
                }}
                onKeyDown={handleQuestionKeyDown}
              />
              <div className="mt-4 flex flex-col gap-3 border-t border-slate-200 pt-4 dark:border-white/10 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  {questionError || askMutation.error?.message || (selectedAttachment ? t('imageContextHint') : t('chatHint'))}
                </p>
                <Button
                  ref={sendButtonRef}
                  type="submit"
                  disabled={isAssistantBusy || (!question.trim() && !selectedAttachment)}
                  className="rounded-full bg-linear-to-r from-pink-600 via-rose-500 to-orange-500 px-5 text-white shadow-lg shadow-pink-950/20"
                >
                  <SendHorizontal size={16} className="me-2" />
                  {isAssistantBusy ? t('sending') : t('send')}
                </Button>
              </div>
            </form>

            <div className="flex flex-wrap gap-2">
              {suggestionItems.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  disabled={isAssistantBusy}
                  onClick={() => void askQuestion(suggestion)}
                  className="rounded-full border border-slate-200 bg-white/70 px-4 py-2.5 text-start text-sm font-black text-slate-700 shadow-sm transition hover:border-pink-300 hover:bg-pink-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:border-pink-400/60 dark:hover:bg-pink-500/10"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

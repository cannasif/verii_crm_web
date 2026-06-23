import { type ChangeEvent, type FormEvent, type KeyboardEvent, type ReactElement, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Bot, Check, Copy, ExternalLink, FileImage, ImagePlus, Maximize2, MessageCircle, Minimize2, Plus, SendHorizontal, Sparkles, X } from 'lucide-react';
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
const missingTranslationText = 'Çeviri eksik';

const aiAssistantTextFallbacks: Record<string, string> = {
  pageTitle: 'AI Asistan',
  openChat: 'AI sohbeti aç',
  closeChat: 'AI sohbeti kapat',
  fallbackName: 'değerli kullanıcı',
  loadingGreeting: 'Kişiselleştirme hazırlanıyor...',
  newChat: 'Yeni sohbet',
  emptyQuestion: 'Lütfen bir soru yazın.',
  askLastErrorQuestion: 'Son hatayı açıklar mısın?',
  answerTitle: 'AI Yanıtı',
  sourceTitle: 'Kaynak',
  actionItemsTitle: 'Önerilen kontroller',
  openAction: 'Aç',
  copyAnswer: 'Yanıtı kopyala',
  copied: 'Kopyalandı',
  lastErrorTitle: 'Son hata yakalandı',
  askLastError: 'Bu hatayı açıkla',
  eyebrow: 'CRM AI Asistan',
  chatDescription: 'Talep, teklif, sipariş, aktivite ve ERP özetlerinizi sorabilirsiniz.',
  inputPlaceholder: 'Örn. Bu ay kaç teklif oluşturdum?',
  chatHint: 'Performans, adet, oran, ERP aktarımı ve hata açıklaması sorabilirsiniz.',
  attachImage: 'Görsel ekle',
  removeImage: 'Görseli kaldır',
  imageTooLarge: 'Görsel en fazla {{size}} MB olabilir.',
  imageUnsupported: 'Sadece PNG, JPG/JPEG veya WEBP görsel ekleyebilirsiniz.',
  imageDefaultQuestion: 'Bu ekran görüntünü yorumlar mısın?',
  imageContextHint: 'Ekran görüntüsü eklendi. Hata metnini de yazarsanız daha net yorumlarım.',
  sending: 'Düşünüyor',
  send: 'Gönder',
  expandPanel: 'Paneli genişlet',
  collapsePanel: 'Paneli küçült',
};

const defaultSuggestions = [
  'Bu ay kaç teklif oluşturdum?',
  'Onaylanan siparişlerimin oranı nedir?',
  "ERP'ye aktarılan satış kayıtlarım kaç adet?",
  'Bugünkü aktivitelerimi özetle.',
];

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
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { data: greeting, isLoading } = useAiAssistantGreetingQuery();
  const askMutation = useAskAiAssistantMutation();
  const chatHistoryKey = createAiAssistantChatHistoryKey(user);
  const [isOpen, setIsOpen] = useState(false);
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
  const [isActionsMenuOpen, setIsActionsMenuOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const sendButtonRef = useRef<HTMLButtonElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const loadedChatHistoryKeyRef = useRef(chatHistoryKey);
  const skipNextHistoryWriteRef = useRef(false);
  const readText = (key: string, fallback?: string, options?: Record<string, unknown>): string => {
    const value = t(key, { defaultValue: fallback ?? aiAssistantTextFallbacks[key] ?? key, ...options });
    if (!value || value === key || value === missingTranslationText) {
      return fallback ?? aiAssistantTextFallbacks[key] ?? key;
    }

    return value;
  };

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

  useEffect(() => subscribeAiAssistantErrorContext(setLatestErrorContext), []);

  useEffect(() => {
    if (!isOpen) return;

    const focusTimer = window.setTimeout(() => {
      textareaRef.current?.focus();
      messagesEndRef.current?.scrollIntoView({
        behavior: 'auto',
        block: 'end',
      });
    }, 80);

    return () => window.clearTimeout(focusTimer);
  }, [isOpen]);

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
      setQuestionError(readText('imageUnsupported'));
      clearSelectedAttachment();
      return;
    }

    if (file.size > aiAssistantMaxImageSizeBytes) {
      setQuestionError(readText('imageTooLarge', undefined, { size: aiAssistantMaxImageSizeMb }));
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

  const fallbackName = user?.name || user?.email || readText('fallbackName');
  const displayName = greeting?.fullName?.trim() || fallbackName;
  const fallbackSuggestions = defaultSuggestions.map((suggestion, index) =>
    readText(`suggestions.${index + 1}`, suggestion)
  );
  const suggestionItems = dynamicSuggestions.length > 0 ? dynamicSuggestions : fallbackSuggestions;
  const isAssistantBusy = askMutation.isPending || isThinking;

  useEffect(() => {
    if (!isOpen) return;

    const lastMessage = messages[messages.length - 1];
    if (messages.length === 0 || lastMessage?.role === 'user' || isAssistantBusy) {
      messagesEndRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'end',
      });
    }
  }, [isOpen, messages, isAssistantBusy]);

  const askQuestion = async (value: string, errorContext?: AiAssistantErrorContext | null): Promise<void> => {
    const trimmedQuestion = value.trim();
    const activeAttachment = selectedAttachment;
    if (!trimmedQuestion && !activeAttachment) {
      setQuestionError(readText('emptyQuestion'));
      return;
    }

    const finalQuestion = trimmedQuestion || readText('imageDefaultQuestion');
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
    if (event.key !== 'Tab' || event.shiftKey || !isOpen) {
      return;
    }

    event.preventDefault();
    sendButtonRef.current?.focus();
  };

  const askLatestError = async (): Promise<void> => {
    if (!latestErrorContext) return;
    await askQuestion(readText('askLastErrorQuestion'), latestErrorContext);
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
    setIsOpen(false);
  };

  const copyAssistantMessage = async (message: AiAssistantChatMessage): Promise<void> => {
    await copyTextToClipboard(message.content);
    setCopiedMessageId(message.id);
    window.setTimeout(() => {
      setCopiedMessageId((current) => (current === message.id ? null : current));
    }, 1600);
  };

  return (
    <div
      className="fixed bottom-4 z-50 print:hidden md:bottom-6"
      style={{ insetInlineEnd: '1rem' }}
    >
      <style>{`
        .ai-widget-container.is-expanded .text-sm {
          font-size: 1rem !important;
        }
        .ai-widget-container.is-expanded .text-xs {
          font-size: 0.875rem !important;
        }
        .ai-widget-container.is-expanded textarea {
          font-size: 1rem !important;
        }
        .ai-widget-container.is-expanded .text-\\[0\\.68rem\\] {
          font-size: 0.8rem !important;
        }
        .ai-widget-container.is-expanded .text-\\[0\\.62rem\\] {
          font-size: 0.75rem !important;
        }
      `}</style>
      {isOpen ? (
        <section className={`ai-widget-container flex w-[calc(100vw-1.25rem)] transition-all duration-300 ease-in-out flex-col overflow-hidden rounded-[2rem] border border-pink-100 bg-[radial-gradient(circle_at_20%_0%,rgba(236,72,153,0.20),transparent_32%),radial-gradient(circle_at_100%_10%,rgba(249,115,22,0.16),transparent_28%),linear-gradient(180deg,rgba(255,255,255,0.96),rgba(248,250,252,0.92))] shadow-2xl shadow-pink-950/25 backdrop-blur-2xl dark:border-white/10 dark:bg-[radial-gradient(circle_at_20%_0%,rgba(236,72,153,0.18),transparent_32%),radial-gradient(circle_at_100%_10%,rgba(249,115,22,0.14),transparent_28%),linear-gradient(180deg,rgba(2,6,23,0.98),rgba(15,23,42,0.94))] ${isExpanded
          ? 'is-expanded sm:max-w-[850px] h-[min(92dvh,850px)]'
          : 'max-w-[500px] h-[min(80dvh,700px)]'
          }`}>
          <header className="flex items-center justify-between gap-3 border-b border-slate-200/70 bg-white/55 p-4 backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.03]">
            <div className="flex min-w-0 items-center gap-3">
              <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-linear-to-br from-pink-600 via-rose-500 to-orange-500 text-white shadow-lg shadow-pink-500/25">
                <Bot size={22} />
                <span className="absolute -bottom-0.5 -end-0.5 h-3.5 w-3.5 rounded-full border-2 border-white bg-emerald-400 dark:border-slate-950" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-black text-slate-950 dark:text-white">
                  {readText('pageTitle')}
                </p>

              </div>
            </div>
            <div className="flex items-center gap-1 sm:gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="hidden h-10 rounded-2xl px-3 text-xs font-black sm:inline-flex"
                onClick={clearChat}
              >
                <Plus size={15} className="me-1.5" />
                {readText('newChat')}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="hidden h-10 w-10 rounded-2xl sm:inline-flex"
                aria-label={isExpanded ? readText('collapsePanel') : readText('expandPanel')}
                onClick={() => setIsExpanded(!isExpanded)}
              >
                {isExpanded ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-10 w-10 rounded-2xl"
                aria-label={readText('closeChat')}
                onClick={() => setIsOpen(false)}
              >
                <X size={18} />
              </Button>
            </div>
          </header>

          <div
            className="flex-1 space-y-4 overflow-y-auto px-4 py-5"
            role="log"
            aria-live="polite"
            aria-relevant="additions text"
          >
            {messages.length === 0 && (
              <div className="flex items-start gap-3">
                <div className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-linear-to-br from-emerald-400 to-cyan-500 text-white shadow-lg shadow-emerald-950/20">
                  <Sparkles size={17} />
                </div>
                <div className="max-w-[86%] rounded-[1.6rem] rounded-ss-md border border-pink-500/15 bg-white/80 p-4 shadow-sm backdrop-blur-xl dark:bg-white/[0.06]">
                  <div className="mb-2 inline-flex items-center gap-2 text-[0.68rem] font-black uppercase tracking-[0.22em] text-pink-600 dark:text-pink-300">
                    {readText('eyebrow')}
                  </div>
                  <p className="text-sm font-semibold leading-6 text-slate-600 dark:text-slate-200">
                    {isLoading
                      ? readText('loadingGreeting')
                      : readText('greeting', `Merhaba ${displayName}, size nasıl yardımcı olabilirim?`, { name: displayName })}{' '}
                    {readText('chatDescription')}
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
                      <div className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-linear-to-br from-emerald-400 to-cyan-500 text-white shadow-lg shadow-emerald-950/20">
                        <Bot size={17} />
                      </div>
                      <div className="max-w-[86%] flex-1">
                        <AiAssistantAnswerCard
                          title={readText('answerTitle')}
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
                            {copiedMessageId === message.id ? readText('copied') : readText('copyAnswer')}
                          </Button>
                        </div>
                        {message.sources && message.sources.length > 0 && (
                          <div className="mt-3 rounded-2xl border border-slate-200/80 bg-white/70 p-3 dark:border-white/10 dark:bg-white/[0.04]">
                            <div className="mb-2 text-[0.62rem] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-300">
                              {readText('sourceTitle')}
                            </div>
                            <div className="grid gap-2">
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
                      <div className="ms-12 rounded-3xl border border-slate-200 bg-white/70 p-4 shadow-sm dark:border-white/10 dark:bg-white/5">
                        <div className="mb-3 text-[0.68rem] font-black uppercase tracking-[0.22em] text-slate-500 dark:text-slate-300">
                          {readText('actionItemsTitle')}
                        </div>
                        <div className="grid gap-2">
                          {message.actionItems.map((item) => (
                            <div
                              key={`${message.id}-${item.title}-${item.description}`}
                              className={`rounded-2xl border p-3 ${actionItemClassNameBySeverity[item.severity] ?? actionItemClassNameBySeverity.info}`}
                            >
                              <div className="text-xs font-black">{item.title}</div>
                              <p className="mt-1 text-xs font-semibold leading-5 opacity-85">{item.description}</p>
                              {item.actionUrl && (
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  className="mt-3 h-8 rounded-xl bg-white/70 px-3 text-xs font-black dark:bg-white/10"
                                  onClick={() => openActionUrl(item.actionUrl!)}
                                >
                                  <ExternalLink size={13} className="me-1.5" />
                                  {item.actionLabel || readText('openAction')}
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

            {latestErrorContext && (
              <div className="rounded-3xl border border-amber-400/30 bg-amber-400/10 p-4">
                <div className="mb-1 text-xs font-black uppercase tracking-[0.2em] text-amber-700 dark:text-amber-300">
                  {readText('lastErrorTitle')}
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
                  {readText('askLastError')}
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
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={(event) => void handleAttachmentChange(event)}
            />
            {selectedAttachment && (
              <div className="mb-3 flex min-w-0 max-w-full items-center gap-2 rounded-2xl border border-pink-400/30 bg-pink-500/10 px-3 py-2 text-xs font-black text-pink-700 dark:text-pink-100">
                <FileImage size={14} className="shrink-0" />
                <span className="min-w-0 truncate">{selectedAttachment.fileName}</span>
                <span className="shrink-0 opacity-75">{formatAttachmentSize(selectedAttachment.size)}</span>
                <button
                  type="button"
                  className="ms-1 rounded-full p-0.5 hover:bg-pink-500/15"
                  aria-label={readText('removeImage')}
                  onClick={clearSelectedAttachment}
                >
                  <X size={13} />
                </button>
              </div>
            )}
            {(questionError || askMutation.error?.message) && (
              <div className="mb-3 flex min-w-0 max-w-full items-center gap-2 rounded-2xl border border-red-400/30 bg-red-500/10 px-3 py-2 text-xs font-black text-red-700 dark:text-red-100">
                <span className="min-w-0 truncate">{questionError || askMutation.error?.message}</span>
              </div>
            )}
            <div className="flex flex-col rounded-[1.6rem] border border-slate-200 bg-white/90 shadow-sm dark:border-white/10 dark:bg-white/[0.06] overflow-hidden focus-within:ring-2 focus-within:ring-pink-500/25 dark:focus-within:ring-pink-500/20 transition-all duration-200">
              <div className="px-4 pt-3 pb-1">
                <Textarea
                  ref={textareaRef}
                  rows={2}
                  placeholder={readText('inputPlaceholder')}
                  className="min-h-[44px] max-h-28 resize-none border-0 bg-transparent p-0 text-sm font-semibold shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-slate-400 dark:placeholder:text-slate-500"
                  value={question}
                  onChange={(event) => {
                    setQuestion(event.target.value);
                    if (questionError) {
                      setQuestionError(null);
                    }
                  }}
                  onKeyDown={handleQuestionKeyDown}
                />
              </div>
              <div className="border-t border-slate-100 dark:border-white/5" />
              <div className="flex items-center justify-between gap-3 px-4 py-2.5 bg-slate-50/50 dark:bg-white/[0.02]">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    disabled={isAssistantBusy}
                    className={`h-9 w-9 shrink-0 rounded-full border transition-all duration-200 ${isActionsMenuOpen
                      ? 'rotate-45 border-pink-400/50 bg-pink-50 text-pink-600 dark:bg-pink-500/10 dark:text-pink-400 dark:border-pink-500/30'
                      : 'border-slate-200 dark:border-white/10 hover:border-pink-300 dark:hover:border-pink-500/30'
                      }`}
                    aria-expanded={isActionsMenuOpen}
                    onClick={() => setIsActionsMenuOpen(!isActionsMenuOpen)}
                  >
                    <Plus size={18} />
                  </Button>

                  {isActionsMenuOpen && (
                    <div className="flex items-center gap-2 animate-in fade-in slide-in-from-left-2 duration-200">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={isAssistantBusy}
                        className="h-9 rounded-2xl border-slate-200 bg-white/80 px-3 text-xs font-black dark:border-white/10 dark:bg-white/[0.06] hover:border-pink-300 hover:bg-pink-50 dark:hover:bg-pink-500/10 transition-colors"
                        onClick={() => {
                          fileInputRef.current?.click();
                          setIsActionsMenuOpen(false);
                        }}
                      >
                        <ImagePlus size={14} className="me-1.5" />
                        {readText('attachImage')}
                      </Button>
                    </div>
                  )}
                </div>
                <Button
                  ref={sendButtonRef}
                  type="submit"
                  disabled={isAssistantBusy || (!question.trim() && !selectedAttachment)}
                  className="shrink-0 rounded-full bg-linear-to-r from-pink-600 via-rose-500 to-orange-500 px-5 text-white shadow-lg shadow-pink-950/20"
                >
                  <SendHorizontal size={16} className="me-2" />
                  {isAssistantBusy ? readText('sending') : readText('send')}
                </Button>
              </div>
            </div>
          </form>
        </section>
      ) : (
        <button
          type="button"
          aria-label={readText('openChat')}
          onClick={() => setIsOpen(true)}
          className="group flex items-center gap-3 rounded-full border border-white/20 bg-linear-to-r from-pink-600 to-orange-500 px-4 py-3 text-sm font-black text-white shadow-2xl shadow-pink-950/25 transition hover:scale-[1.02] hover:shadow-pink-600/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-400 focus-visible:ring-offset-2 dark:ring-offset-slate-950"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20">
            <MessageCircle size={20} />
          </span>
          <span className="hidden sm:inline">{readText('pageTitle')}</span>
        </button>
      )}
    </div>
  );
}

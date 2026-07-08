import { type ChangeEvent, type FormEvent, type KeyboardEvent, type ReactElement, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Navigate, useNavigate } from 'react-router-dom';
import { Bot, Check, Copy, ExternalLink, FileImage, ImagePlus, Plus, SendHorizontal, X } from 'lucide-react';
import { useUIStore } from '@/stores/ui-store';
import { useAuthStore } from '@/stores/auth-store';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { createClientId } from '@/lib/create-client-id';
import { aiAssistantApi } from '../api/ai-assistant-api';
import {
  downloadBlobAsPdf,
  extractCustomerDossierId,
  extractSalesRepDossierId,
  isCustomerDossierPdfActionUrl,
  isSalesRepDossierPdfActionUrl,
} from '../lib/ai-assistant-download';
import { useAskAiAssistantMutation } from '../hooks/useAskAiAssistantMutation';
import { useAiAssistantChatPageBoundary } from '../hooks/useAiAssistantChatPageBoundary';
import { useAiAssistantMessagesViewportClip } from '../hooks/useAiAssistantMessagesViewportClip';
import { useAiAssistantAnalyticsQuery, useAiAssistantGreetingQuery } from '../hooks/useAiAssistantGreetingQuery';
import { AiAssistantAnswerCard } from './AiAssistantAnswerCard';
import { AiAssistantThinkingIndicator } from './AiAssistantThinkingIndicator';
import { AiAssistantComposerToolbar } from './AiAssistantComposerToolbar';
import { useAiAssistantComposerToolbarOverflow } from '../hooks/useAiAssistantComposerToolbarOverflow';
import {
  getLatestAiAssistantErrorContext,
  subscribeAiAssistantErrorContext,
  type AiAssistantErrorContext,
} from '../lib/ai-assistant-error-context';
import {
  createAiAssistantActionItemsFromToolActions,
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
import {
  showReportDraftReadyToast,
} from '../lib/ai-assistant-report-draft-toast';
import {
  readAiAssistantLanguagePreference,
  writeAiAssistantLanguagePreference,
} from '../lib/ai-assistant-language';
import type { AiAssistantLanguagePreference } from '../types/ai-assistant.types';

const actionItemClassNameBySeverity: Record<string, string> = {
  danger: 'border-red-400/30 bg-red-400/10 text-red-950 dark:text-red-100',
  warning: 'border-amber-400/30 bg-amber-400/10 text-amber-950 dark:text-amber-100',
  success: 'border-emerald-400/30 bg-emerald-400/10 text-emerald-950 dark:text-emerald-100',
  info: 'border-sky-400/30 bg-sky-400/10 text-sky-950 dark:text-sky-100',
};

const minimumThinkingDurationMs = 900;
const pageSessionStorageKey = 'crm-ai-assistant-page-session-key';
const aiAssistantSidePanelBorder = 'border-slate-300 dark:border-white/20';

function isAiAssistantDialogTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) {
    return false;
  }

  return Boolean(target.closest('[data-slot="dialog-overlay"], [data-slot="dialog-content"]'));
}

function waitForMinimumThinkingDuration(): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, minimumThinkingDurationMs);
  });
}

function createMessageId(): string {
  return createClientId();
}

function createSessionKey(): string {
  return `page-${createMessageId()}`;
}

function readAssistantSessionKey(): string {
  if (typeof window === 'undefined' || !window.localStorage) {
    return createSessionKey();
  }

  const existingKey = window.localStorage.getItem(pageSessionStorageKey);
  if (existingKey) return existingKey;

  const nextKey = createSessionKey();
  window.localStorage.setItem(pageSessionStorageKey, nextKey);
  return nextKey;
}

function createRouteEntityContext(pathname: string): {
  routeTitle: string;
  entityType?: string;
  entityId?: number;
  customerId?: number;
} {
  const segments = pathname.split('/').filter(Boolean);
  const numericSegment = [...segments].reverse().find((segment) => /^\d+$/.test(segment));
  const entityId = numericSegment ? Number(numericSegment) : undefined;
  const firstSegment = segments[0];
  const entityTypeByRoute: Record<string, string> = {
    customers: 'customer',
    quotations: 'quotation',
    demands: 'demand',
    orders: 'order',
    activities: 'activity',
    stocks: 'stock',
    reports: 'report',
    'report-builder': 'report',
    'customer-360': 'customer',
    'salesmen-360': 'salesmen360',
  };
  const routeTitle = segments.length
    ? segments
        .slice(0, 3)
        .map((segment) => segment.replace(/-/g, ' '))
        .join(' / ')
    : 'Genel CRM';
  const entityType = firstSegment ? entityTypeByRoute[firstSegment] ?? firstSegment : undefined;

  return {
    routeTitle,
    entityType,
    entityId,
    customerId: entityType === 'customer' ? entityId : undefined,
  };
}

export function AiAssistantPage(): ReactElement {
  const { t } = useTranslation('ai-assistant');
  const navigate = useNavigate();
  const { setPageTitle, setAiAssistantWidgetVisible, isAiAssistantWidgetVisible, isSidebarOpen } = useUIStore();
  const { user } = useAuthStore();
  const { data: greeting, isLoading } = useAiAssistantGreetingQuery();
  const { data: analytics } = useAiAssistantAnalyticsQuery();
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
  const [languagePreference, setLanguagePreference] = useState<AiAssistantLanguagePreference>(() =>
    readAiAssistantLanguagePreference()
  );
  const [questionError, setQuestionError] = useState<string | null>(null);
  const [selectedAttachment, setSelectedAttachment] = useState<AiAssistantSelectedAttachment | null>(null);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [isActionsMenuOpen, setIsActionsMenuOpen] = useState(false);
  const [isComposerToolbarOpen, setIsComposerToolbarOpen] = useState(true);
  const [isComposerToolbarMenuOpen, setIsComposerToolbarMenuOpen] = useState(false);
  const [sessionKey, setSessionKey] = useState<string>(() => readAssistantSessionKey());
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const sendButtonRef = useRef<HTMLButtonElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const messagesClipRef = useRef<HTMLDivElement | null>(null);
  const composerRef = useRef<HTMLDivElement | null>(null);
  const inputBoxRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const composerToolbarAnchorRef = useRef<HTMLDivElement | null>(null);
  const loadedChatHistoryKeyRef = useRef(chatHistoryKey);
  const skipNextHistoryWriteRef = useRef(false);
  const { toolbarRowRef, toolbarMeasureRef, isCollapsedToMenu } = useAiAssistantComposerToolbarOverflow();

  useEffect(() => {
    setPageTitle(t('pageTitle'));
    return () => setPageTitle(null);
  }, [setPageTitle, t]);

  useEffect(() => {
    if (isAiAssistantWidgetVisible) return;
    setAiAssistantWidgetVisible(false);
  }, [isAiAssistantWidgetVisible, setAiAssistantWidgetVisible]);

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

  const chatBoundaryRecalculateToken = [
    isSidebarOpen,
    askMutation.error?.message,
    isActionsMenuOpen,
    isComposerToolbarOpen,
    isComposerToolbarMenuOpen,
    isCollapsedToMenu,
    isAssistantBusy,
    questionError,
    selectedAttachment?.fileName,
    suggestionItems.length,
  ].join('|');

  const chatPageScrollReserve = useAiAssistantChatPageBoundary(
    composerRef,
    inputBoxRef,
    chatBoundaryRecalculateToken,
  );

  useAiAssistantMessagesViewportClip(
    messagesClipRef,
    composerRef,
    chatBoundaryRecalculateToken,
  );

  const changeLanguagePreference = (nextLanguagePreference: AiAssistantLanguagePreference): void => {
    setLanguagePreference(nextLanguagePreference);
    writeAiAssistantLanguagePreference(nextLanguagePreference);
  };

  useEffect(() => {
    if (!isCollapsedToMenu) {
      setIsComposerToolbarMenuOpen(false);
    }
  }, [isCollapsedToMenu]);

  useEffect(() => {
    if (!isComposerToolbarMenuOpen) {
      return;
    }

    const handlePointerDown = (event: MouseEvent): void => {
      if (isAiAssistantDialogTarget(event.target)) {
        return;
      }

      if (composerToolbarAnchorRef.current?.contains(event.target as Node)) {
        return;
      }

      setIsComposerToolbarMenuOpen(false);
    };

    document.addEventListener('mousedown', handlePointerDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
    };
  }, [isComposerToolbarMenuOpen]);

  useEffect(() => {
    const endMarker = messagesEndRef.current;
    if (!endMarker) {
      return;
    }

    endMarker.scrollIntoView({ behavior: 'smooth', block: 'end' });
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
      const routeContext = createRouteEntityContext(window.location.pathname);
      const currentPath = `${window.location.pathname}${window.location.search}${window.location.hash}`;
      const [result] = await Promise.all([
        askMutation.mutateAsync({
          sessionKey,
          question: finalQuestion,
          currentPath,
          routeTitle: routeContext.routeTitle,
          entityType: routeContext.entityType,
          entityId: routeContext.entityId,
          customerId: routeContext.customerId,
          errorMessage: errorContext
            ? `${errorContext.message}${errorContext.requestMethod || errorContext.requestUrl ? ` | ${errorContext.requestMethod ?? ''} ${errorContext.requestUrl ?? ''}` : ''}`
            : undefined,
          errorCode: errorContext?.errorCode ?? undefined,
          httpStatusCode: errorContext?.httpStatusCode ?? undefined,
          preferredLanguage: languagePreference,
          attachments: activeAttachment ? [createAttachmentRequest(activeAttachment)] : [],
        }),
        waitForMinimumThinkingDuration(),
      ]);
      if (result.sessionKey && result.sessionKey !== sessionKey) {
        setSessionKey(result.sessionKey);
        window.localStorage.setItem(pageSessionStorageKey, result.sessionKey);
      }
      setMessages((currentMessages) => [
        ...currentMessages,
        {
          id: createMessageId(),
          role: 'assistant',
          content: result.answer,
          createdAt: new Date().toISOString(),
          actionItems: result.actionItems?.length
            ? result.actionItems
            : createAiAssistantActionItemsFromToolActions(result.toolActions),
          toolActions: result.toolActions ?? [],
          sources: result.sources ?? [],
          context: result.context ?? null,
          intent: result.intent,
        },
      ]);
      showReportDraftReadyToast(result, openActionUrl);
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
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      if (isAssistantBusy) {
        return;
      }

      event.currentTarget.form?.requestSubmit();
      return;
    }

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
    const nextSessionKey = createSessionKey();
    setSessionKey(nextSessionKey);
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(pageSessionStorageKey, nextSessionKey);
    }
    setMessages([]);
    setDynamicSuggestions([]);
    setQuestionError(null);
    clearSelectedAttachment();
    setIsComposerToolbarMenuOpen(false);
  };

  const handleComposerToolbarIconClick = (): void => {
    if (isCollapsedToMenu) {
      setIsComposerToolbarMenuOpen((open) => !open);
      return;
    }

    setIsComposerToolbarOpen((open) => !open);
    setIsComposerToolbarMenuOpen(false);
  };

  const showInlineComposerToolbar = isComposerToolbarOpen && !isCollapsedToMenu;
  const isComposerToolbarActive = isCollapsedToMenu ? isComposerToolbarMenuOpen : isComposerToolbarOpen;
  const composerToolbarProps = {
    latestErrorContext,
    isAssistantBusy,
    onAskLatestError: askLatestError,
    languagePreference,
    onChangeLanguagePreference: changeLanguagePreference,
    onClearChat: clearChat,
  };

  const openActionUrl = async (actionUrl?: string | null, toolActionId?: number | null, confirmationRequired = false): Promise<void> => {
    if (confirmationRequired) {
      const confirmed = window.confirm('AI önerisini onaylayıp ilgili ekrana geçmek istiyor musunuz?');
      if (!confirmed) return;
    }

    let confirmationResult: Awaited<ReturnType<typeof aiAssistantApi.confirmAction>> | null = null;
    if (toolActionId) {
      confirmationResult = await aiAssistantApi.confirmAction(toolActionId);
    }

    if (!actionUrl) {
      if (confirmationResult?.resultMessage) {
        window.alert(confirmationResult.resultMessage);
      }
      return;
    }

    if (actionUrl.startsWith('http')) {
      window.open(actionUrl, '_blank', 'noopener,noreferrer');
      return;
    }

    if (isCustomerDossierPdfActionUrl(actionUrl)) {
      const customerId = extractCustomerDossierId(actionUrl);
      if (!customerId) {
        return;
      }

      const blob = await aiAssistantApi.downloadCustomerDossierPdf(customerId);
      downloadBlobAsPdf(blob, `cari-dosya-${customerId}.pdf`);
      return;
    }

    if (isSalesRepDossierPdfActionUrl(actionUrl)) {
      const userId = extractSalesRepDossierId(actionUrl);
      if (!userId) {
        return;
      }

      const blob = await aiAssistantApi.downloadSalesRepDossierPdf(userId);
      downloadBlobAsPdf(blob, `temsilci-dosya-${userId}.pdf`);
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

  if (isAiAssistantWidgetVisible) {
    return <Navigate to="/" replace />;
  }

  return (
    <>
    <div className="mt-8 grid w-full gap-4 lg:grid-cols-[minmax(0,1fr)_14rem] lg:items-start lg:gap-6 xl:grid-cols-[minmax(0,1fr)_15rem]">
        <div className="flex min-w-0 flex-col">
            <div
              ref={messagesClipRef}
              className="space-y-5 py-1 pe-1"
              role="log"
              aria-live="polite"
              aria-relevant="additions text"
            >
              {messages.length === 0 && (
                <div className="flex items-start gap-3">
                  <div className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-linear-to-br from-emerald-400 to-cyan-500 text-white shadow-lg shadow-emerald-950/20">
                    <Bot size={18} />
                  </div>
                  <div className="max-w-2xl rounded-[1.6rem] rounded-ss-md border border-primary/15 bg-white/80 p-5 shadow-sm backdrop-blur-xl dark:bg-white/[0.06]">
                    <div className="mb-2 inline-flex items-center gap-2 text-[0.68rem] font-black uppercase tracking-[0.22em] text-primary">
                      {t('eyebrow')}
                    </div>
                    <p className="text-sm font-semibold leading-6 text-slate-600 dark:text-slate-200">
                      {isLoading ? t('loadingGreeting') : t('greeting', { name: displayName })}{' '}
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
                    <div className="max-w-[78%] rounded-[1.45rem] rounded-ee-md bg-linear-to-r from-primary via-primary to-orange-500 px-5 py-3 text-sm font-black leading-6 text-white shadow-lg shadow-primary/20">
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
                            answer={message.content}
                            headerAction={(
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-8 rounded-xl px-3 text-xs font-black text-slate-500 hover:text-primary dark:text-slate-300"
                                onClick={() => void copyAssistantMessage(message)}
                              >
                                {copiedMessageId === message.id ? (
                                  <Check size={13} className="me-1.5" />
                                ) : (
                                  <Copy size={13} className="me-1.5" />
                                )}
                                {copiedMessageId === message.id ? t('copied') : t('copyAnswer')}
                              </Button>
                            )}
                          />
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
                                {(item.actionUrl || item.toolActionId) && (
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    className="mt-3 h-9 rounded-xl bg-white/70 px-3 text-xs font-black dark:bg-white/10"
                                    onClick={() => {
                                      void openActionUrl(
                                        item.actionUrl,
                                        item.toolActionId,
                                        item.confirmationRequired || Boolean(item.toolActionId)
                                      );
                                    }}
                                  >
                                    {item.actionUrl ? <ExternalLink size={13} className="me-1.5" /> : <Check size={13} className="me-1.5" />}
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

              <div className="flex items-start gap-3">
                <div className="h-10 w-10 shrink-0" aria-hidden />
                <div className="flex min-w-0 flex-1 flex-wrap gap-2">
                  {suggestionItems.map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      disabled={isAssistantBusy}
                      onClick={() => void askQuestion(suggestion)}
                      className="rounded-full border border-slate-200 bg-white px-4 py-2.5 text-start text-sm font-black text-slate-700 shadow-sm transition hover:border-primary/30 hover:bg-accent disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10 dark:bg-slate-950 dark:text-slate-200 dark:hover:border-primary/40 dark:hover:bg-primary/10"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>

              <div ref={messagesEndRef} />
            </div>
        </div>

        <div className="hidden flex-col gap-3 self-start lg:sticky lg:top-4 lg:flex">
          <div className={`rounded-3xl border bg-white/75 p-4 shadow-lg shadow-slate-950/5 dark:bg-white/5 ${aiAssistantSidePanelBorder}`}>
            <div className="text-[0.68rem] font-black uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
              {t('analytics.sessions')}
            </div>
            <div className="mt-2 text-2xl font-black text-slate-950 dark:text-white">
              {analytics?.totalSessions ?? 0}
            </div>
            <p className="mt-1 text-xs font-semibold text-emerald-600 dark:text-emerald-300">
              {analytics?.completedSessions ?? 0} {t('analytics.completed')}
            </p>
          </div>
          <div className={`rounded-3xl border bg-white/75 p-4 shadow-lg shadow-slate-950/5 dark:bg-white/5 ${aiAssistantSidePanelBorder}`}>
            <div className="text-[0.68rem] font-black uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
              {t('analytics.problemSessions')}
            </div>
            <div className="mt-2 text-2xl font-black text-slate-950 dark:text-white">
              {(analytics?.failedSessions ?? 0) + (analytics?.abandonedSessions ?? 0)}
            </div>
            <p className="mt-1 text-xs font-semibold text-amber-600 dark:text-amber-300">
              {analytics?.abandonedSessions ?? 0} {t('analytics.abandoned')}
            </p>
          </div>
          <div className={`rounded-3xl border bg-white/75 p-4 shadow-lg shadow-slate-950/5 dark:bg-white/5 ${aiAssistantSidePanelBorder}`}>
            <div className="text-[0.68rem] font-black uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
              {t('analytics.averageLatency')}
            </div>
            <div className="mt-2 text-2xl font-black text-slate-950 dark:text-white">
              {Math.round(analytics?.averageLatencyMs ?? 0)} ms
            </div>
            <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
              {analytics?.assistantMessages ?? 0} {t('analytics.answers')}
            </p>
          </div>
          <div className={`rounded-3xl border bg-white/75 p-4 shadow-lg shadow-slate-950/5 dark:bg-white/5 ${aiAssistantSidePanelBorder}`}>
            <div className="text-[0.68rem] font-black uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
              {t('analytics.toolRate')}
            </div>
            <div className="mt-2 text-2xl font-black text-slate-950 dark:text-white">
              %{analytics?.toolConfirmationRate ?? 0}
            </div>
            <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
              {analytics?.executedToolActions ?? 0}/{analytics?.proposedToolActions ?? 0} {t('analytics.executed')}
            </p>
          </div>
        </div>
      </div>

    <div
      aria-hidden
      data-ai-assistant-chat-page-boundary=""
      className="pointer-events-none"
      style={{ height: chatPageScrollReserve }}
    />

    <div
      ref={composerRef}
      className={`pointer-events-none fixed bottom-0 left-0 right-0 z-40 transition-[left] duration-300 ${isSidebarOpen ? 'lg:left-72' : 'lg:left-20'}`}
    >
      <div className="mx-auto max-w-[1920px] px-4 md:px-6">
        <div className="grid lg:grid-cols-[minmax(0,1fr)_14rem] lg:gap-6 xl:grid-cols-[minmax(0,1fr)_15rem]">
          <div className="pointer-events-auto space-y-3 pb-4 md:pb-6">
            <div ref={toolbarRowRef} className="relative flex w-full max-w-full items-center gap-2">
              <div ref={composerToolbarAnchorRef} className="relative shrink-0">
                {isComposerToolbarMenuOpen && isCollapsedToMenu ? (
                  <div
                    className="absolute bottom-full start-0 z-20 mb-3 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl animate-in fade-in slide-in-from-bottom-2 duration-200 dark:border-white/10 dark:bg-slate-900"
                    role="menu"
                  >
                    <AiAssistantComposerToolbar layout="menu" {...composerToolbarProps} />
                  </div>
                ) : null}
                <button
                  type="button"
                  aria-label={t('pageTitle')}
                  aria-expanded={isComposerToolbarActive}
                  onClick={handleComposerToolbarIconClick}
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border bg-white/20 shadow-lg shadow-primary/15 backdrop-blur-xl transition dark:bg-white/5 ${isComposerToolbarActive
                    ? 'border-primary/40 ring-2 ring-primary/20'
                    : aiAssistantSidePanelBorder
                    }`}
                >
                  <Bot className="text-primary" size={22} />
                </button>
              </div>

              {showInlineComposerToolbar ? (
                <div className="min-w-0 flex-1 animate-in fade-in slide-in-from-left-2 duration-200">
                  <AiAssistantComposerToolbar layout="inline" {...composerToolbarProps} />
                </div>
              ) : null}

              <div
                aria-hidden
                className="pointer-events-none absolute left-0 top-0 -z-10 h-0 w-full overflow-hidden opacity-0"
              >
                <div ref={toolbarMeasureRef} className="inline-block w-max max-w-none">
                  <AiAssistantComposerToolbar layout="measure" {...composerToolbarProps} />
                </div>
              </div>
            </div>

            <form className="space-y-3" onSubmit={handleSubmit}>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={(event) => void handleAttachmentChange(event)}
              />
              {selectedAttachment && (
                <div className="flex min-w-0 max-w-full items-center gap-2 rounded-2xl border border-primary/30 bg-primary/10 px-3 py-2 text-xs font-black text-primary dark:text-primary-foreground">
                  <FileImage size={14} className="shrink-0" />
                  <span className="min-w-0 truncate">{selectedAttachment.fileName}</span>
                  <span className="shrink-0 opacity-75">{formatAttachmentSize(selectedAttachment.size)}</span>
                  <button
                    type="button"
                    className="ms-1 rounded-full p-0.5 hover:bg-primary/15"
                    aria-label={t('removeImage')}
                    onClick={clearSelectedAttachment}
                  >
                    <X size={13} />
                  </button>
                </div>
              )}
              {(questionError || askMutation.error?.message) && (
                <div className="flex min-w-0 max-w-full items-center gap-2 rounded-2xl border border-red-400/30 bg-red-500/10 px-3 py-2 text-xs font-black text-red-700 dark:text-red-100">
                  <span className="min-w-0 truncate">{questionError || askMutation.error?.message}</span>
                </div>
              )}
              <div
                ref={inputBoxRef}
                className="overflow-hidden rounded-[1.6rem] border border-slate-200 bg-white shadow-sm transition-all duration-200 focus-within:ring-2 focus-within:ring-primary/25 dark:border-white/10 dark:bg-slate-950 dark:focus-within:ring-primary/20"
              >
                <div className="bg-white px-4 pt-3 pb-1 dark:bg-slate-950">
                  <Textarea
                    ref={textareaRef}
                    rows={2}
                    placeholder={t('inputPlaceholder')}
                    className="min-h-[44px] max-h-28 resize-none border-0 bg-white p-0 text-sm font-semibold shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-slate-400 dark:bg-slate-950 dark:placeholder:text-slate-500"
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
                <div className="flex items-center justify-between gap-3 bg-slate-50 px-4 py-2.5 dark:bg-slate-900">
                  <div className="relative flex min-w-0 flex-1 items-center gap-2">
                    {isActionsMenuOpen && (
                      <div
                        className="absolute bottom-full start-0 z-20 mb-2 flex min-w-48 flex-col gap-1 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-xl animate-in fade-in slide-in-from-bottom-2 duration-200 dark:border-white/10 dark:bg-slate-900"
                        role="menu"
                      >
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          disabled={isAssistantBusy}
                          className="h-9 w-full justify-start rounded-xl px-3 text-xs font-black transition-colors hover:bg-accent dark:hover:bg-primary/10"
                          onClick={() => {
                            fileInputRef.current?.click();
                            setIsActionsMenuOpen(false);
                          }}
                        >
                          <ImagePlus size={14} className="me-1.5" />
                          {t('attachImage')}
                        </Button>
                      </div>
                    )}
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      disabled={isAssistantBusy}
                      className={`h-9 w-9 shrink-0 rounded-full border transition-all duration-200 ${isActionsMenuOpen
                        ? 'rotate-45 border-primary/40 bg-accent text-primary dark:border-primary/30 dark:bg-primary/10 dark:text-primary'
                        : 'border-slate-200 dark:border-white/10 hover:border-primary/30 dark:hover:border-primary/30'
                        }`}
                      aria-expanded={isActionsMenuOpen}
                      onClick={() => setIsActionsMenuOpen(!isActionsMenuOpen)}
                    >
                      <Plus size={18} />
                    </Button>
                  </div>
                  <Button
                    ref={sendButtonRef}
                    type="submit"
                    disabled={isAssistantBusy || (!question.trim() && !selectedAttachment)}
                    className="shrink-0 rounded-full bg-linear-to-r from-primary via-primary to-orange-500 px-5 text-white shadow-lg shadow-primary/20"
                  >
                    <SendHorizontal size={16} className="me-2" />
                    {isAssistantBusy ? t('sending') : t('send')}
                  </Button>
                </div>
              </div>
            </form>
          </div>
          <div className="hidden lg:block" />
        </div>
      </div>
    </div>
    </>
  );
}

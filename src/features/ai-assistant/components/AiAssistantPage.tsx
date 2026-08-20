import { type ChangeEvent, type FormEvent, type KeyboardEvent, type ReactElement, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Navigate, useNavigate } from 'react-router-dom';
import { Archive, Bot, Check, Copy, ExternalLink, FileImage, History, ImagePlus, LoaderCircle, Plus, SendHorizontal, X } from 'lucide-react';
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
import { useAiAssistantAnalyticsQuery, useAiAssistantCapabilitiesQuery, useAiAssistantConversationsQuery, useAiAssistantGreetingQuery } from '../hooks/useAiAssistantGreetingQuery';
import { AiAssistantAnswerCard } from './AiAssistantAnswerCard';
import { AiAssistantThinkingIndicator } from './AiAssistantThinkingIndicator';
import { AiAssistantComposerToolbar } from './AiAssistantComposerToolbar';
import { AiAssistantExportMenu } from './AiAssistantExportMenu';
import { AiAssistantCapabilityStrip } from './AiAssistantCapabilityStrip';
import { AiAssistantEvidencePanel } from './AiAssistantEvidencePanel';
import { useAiAssistantComposerToolbarOverflow } from '../hooks/useAiAssistantComposerToolbarOverflow';
import {
  getLatestAiAssistantErrorContext,
  subscribeAiAssistantErrorContext,
  type AiAssistantErrorContext,
} from '../lib/ai-assistant-error-context';
import {
  createAiAssistantActionItemsFromToolActions,
  createAiAssistantChatMessagesFromServer,
  createAiAssistantChatHistoryKey,
  createAiAssistantSessionStorageKey,
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

function formatConversationDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  return new Intl.DateTimeFormat(undefined, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function readAssistantSessionKey(storageKey: string): string {
  if (typeof window === 'undefined' || !window.localStorage) {
    return createSessionKey();
  }

  const existingKey = window.localStorage.getItem(storageKey);
  if (existingKey) return existingKey;

  const nextKey = createSessionKey();
  window.localStorage.setItem(storageKey, nextKey);
  return nextKey;
}

function findPrecedingUserQuestion(messages: AiAssistantChatMessage[], messageIndex: number): string {
  for (let index = messageIndex - 1; index >= 0; index -= 1) {
    if (messages[index]?.role === 'user') return messages[index].content;
  }
  return '';
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
  if (firstSegment === 'ai-assistant') {
    return { routeTitle: '' };
  }

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
  const setPageTitle = useUIStore((s) => s.setPageTitle);
  const setAiAssistantWidgetVisible = useUIStore((s) => s.setAiAssistantWidgetVisible);
  const isAiAssistantWidgetVisible = useUIStore((s) => s.isAiAssistantWidgetVisible);
  const { user, branch } = useAuthStore();
  const { data: greeting, isLoading } = useAiAssistantGreetingQuery();
  const { data: analytics } = useAiAssistantAnalyticsQuery();
  const { data: capabilities } = useAiAssistantCapabilitiesQuery();
  const branchKey = branch?.code || branch?.id || 'no-branch';
  const conversationsQuery = useAiAssistantConversationsQuery(branchKey);
  const askMutation = useAskAiAssistantMutation();
  const chatHistoryKey = createAiAssistantChatHistoryKey(user, branch);
  const sessionStorageKey = createAiAssistantSessionStorageKey('page', user, branch);
  const [question, setQuestion] = useState('');
  const [messages, setMessages] = useState<AiAssistantChatMessage[]>(() =>
    readAiAssistantChatHistory(chatHistoryKey)
  );
  const [dynamicSuggestions, setDynamicSuggestions] = useState<string[]>([]);
  const [isThinking, setIsThinking] = useState(false);
  const [pendingToolActionId, setPendingToolActionId] = useState<number | null>(null);
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
  const [loadingConversationKey, setLoadingConversationKey] = useState<string | null>(null);
  const [archivingConversationKey, setArchivingConversationKey] = useState<string | null>(null);
  const [sessionKey, setSessionKey] = useState<string>(() => readAssistantSessionKey(sessionStorageKey));
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const sendButtonRef = useRef<HTMLButtonElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const composerToolbarAnchorRef = useRef<HTMLDivElement | null>(null);
  const loadedChatHistoryKeyRef = useRef(chatHistoryKey);
  const loadedSessionStorageKeyRef = useRef(sessionStorageKey);
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
    if (loadedSessionStorageKeyRef.current === sessionStorageKey) return;

    loadedSessionStorageKeyRef.current = sessionStorageKey;
    setSessionKey(readAssistantSessionKey(sessionStorageKey));
  }, [sessionStorageKey]);

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
  const suggestionItems = dynamicSuggestions.length > 0
    ? dynamicSuggestions
    : capabilities?.exampleQuestions.length
      ? capabilities.exampleQuestions
      : fallbackSuggestions;
  const isAssistantBusy = askMutation.isPending || isThinking;

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
        window.localStorage.setItem(sessionStorageKey, result.sessionKey);
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
          structuredResult: result.structuredResult ?? null,
          interpretations: result.interpretations ?? [],
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
      window.localStorage.setItem(sessionStorageKey, nextSessionKey);
    }
    setMessages([]);
    setDynamicSuggestions([]);
    setQuestionError(null);
    clearSelectedAttachment();
    setIsComposerToolbarMenuOpen(false);
  };

  const openConversation = async (conversationSessionKey: string): Promise<void> => {
    if (loadingConversationKey || conversationSessionKey === sessionKey) return;

    setLoadingConversationKey(conversationSessionKey);
    try {
      const history = await aiAssistantApi.getConversationHistory(conversationSessionKey);
      const serverMessages = createAiAssistantChatMessagesFromServer(history.messages);
      setSessionKey(history.sessionKey);
      window.localStorage.setItem(sessionStorageKey, history.sessionKey);
      setMessages(serverMessages);
      writeAiAssistantChatHistory(chatHistoryKey, serverMessages);
      setDynamicSuggestions([]);
      setQuestionError(null);
    } catch (error) {
      window.alert(error instanceof Error ? error.message : t('apiErrors.history'));
    } finally {
      setLoadingConversationKey(null);
    }
  };

  const archiveConversation = async (conversationSessionKey: string): Promise<void> => {
    if (archivingConversationKey) return;

    setArchivingConversationKey(conversationSessionKey);
    try {
      await aiAssistantApi.setConversationArchived(conversationSessionKey, true);
      if (conversationSessionKey === sessionKey) {
        clearChat();
      }
      await conversationsQuery.refetch();
    } catch (error) {
      window.alert(error instanceof Error ? error.message : t('apiErrors.history'));
    } finally {
      setArchivingConversationKey(null);
    }
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

  const openActionUrl = async (actionUrl?: string | null, toolActionId?: number | null, _confirmationRequired = false): Promise<void> => {
    if (toolActionId && pendingToolActionId === toolActionId) return;

    let confirmationResult: Awaited<ReturnType<typeof aiAssistantApi.confirmAction>> | null = null;
    try {
      if (toolActionId) {
        setPendingToolActionId(toolActionId);
        confirmationResult = await aiAssistantApi.confirmAction(toolActionId);
      }

    const resolvedActionUrl = confirmationResult?.actionUrl || actionUrl;

    if (!resolvedActionUrl) {
      if (confirmationResult?.resultMessage) {
        window.alert(confirmationResult.resultMessage);
      }
      return;
    }

    if (resolvedActionUrl.startsWith('http')) {
      window.open(resolvedActionUrl, '_blank', 'noopener,noreferrer');
      return;
    }

    if (isCustomerDossierPdfActionUrl(resolvedActionUrl)) {
      const customerId = extractCustomerDossierId(resolvedActionUrl);
      if (!customerId) {
        return;
      }

      const blob = await aiAssistantApi.downloadCustomerDossierPdf(customerId);
      downloadBlobAsPdf(blob, `cari-dosya-${customerId}.pdf`);
      return;
    }

    if (isSalesRepDossierPdfActionUrl(resolvedActionUrl)) {
      const userId = extractSalesRepDossierId(resolvedActionUrl);
      if (!userId) {
        return;
      }

      const blob = await aiAssistantApi.downloadSalesRepDossierPdf(userId);
      downloadBlobAsPdf(blob, `temsilci-dosya-${userId}.pdf`);
      return;
    }

      navigate(resolvedActionUrl);
    } catch (error) {
      window.alert(error instanceof Error ? error.message : t('actionFailed'));
    } finally {
      if (toolActionId) setPendingToolActionId(null);
    }
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
    <main className="mx-auto flex w-full max-w-[1600px] flex-col xl:h-[calc(100dvh-10rem)] xl:min-h-[620px]">
      <section className="grid min-h-0 flex-1 gap-4 xl:grid-cols-[18rem_minmax(0,1fr)]">
        <aside className="order-2 flex min-h-0 max-h-[30rem] flex-col rounded-lg border border-slate-200 bg-white p-3 shadow-sm dark:border-white/10 dark:bg-slate-950 xl:order-1 xl:max-h-none">
          <Button type="button" variant="outline" className="h-11 w-full justify-start rounded-lg" onClick={clearChat}>
            <Plus size={16} className="me-2" />
            {t('newChat')}
          </Button>

          <div className="mt-4 flex items-center gap-2 px-2 text-xs font-black uppercase text-slate-500 dark:text-slate-400">
            <History size={15} className="text-primary" />
            {t('conversations.title')}
          </div>

          <div className="mt-2 min-h-0 flex-1 space-y-1 overflow-y-auto pe-1">
            {conversationsQuery.isLoading ? (
              <div className="flex items-center gap-2 px-2 py-4 text-xs font-semibold text-slate-500">
                <LoaderCircle size={14} className="animate-spin" />
                {t('conversations.loading')}
              </div>
            ) : conversationsQuery.data?.length ? (
              conversationsQuery.data.map((conversation) => {
                const isActive = conversation.sessionKey === sessionKey;
                return (
                  <div
                    key={conversation.sessionKey}
                    className={`group flex items-start rounded-lg transition-colors ${isActive
                      ? 'bg-primary/10 text-primary'
                      : 'text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-white/5'
                      }`}
                  >
                    <button
                      type="button"
                      className="min-w-0 flex-1 px-3 py-2.5 text-start"
                      disabled={loadingConversationKey === conversation.sessionKey}
                      onClick={() => void openConversation(conversation.sessionKey)}
                    >
                      <span className="flex items-center gap-2">
                        {loadingConversationKey === conversation.sessionKey ? (
                          <LoaderCircle size={13} className="shrink-0 animate-spin" />
                        ) : null}
                        <span className="line-clamp-2 text-sm font-bold leading-5">{conversation.title}</span>
                      </span>
                      <span className="mt-1 block text-[0.68rem] font-semibold text-slate-400">
                        {conversation.messageCount} {t('conversations.messages')} · {formatConversationDate(conversation.lastMessageAt)}
                      </span>
                    </button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="me-1 mt-1.5 h-8 w-8 shrink-0 opacity-70 hover:bg-slate-200 group-hover:opacity-100 dark:hover:bg-white/10 xl:opacity-0 xl:focus-visible:opacity-100"
                      disabled={archivingConversationKey === conversation.sessionKey}
                      onClick={() => void archiveConversation(conversation.sessionKey)}
                      title={t('conversations.archive')}
                    >
                      {archivingConversationKey === conversation.sessionKey ? (
                        <LoaderCircle size={14} className="animate-spin" />
                      ) : (
                        <Archive size={14} />
                      )}
                    </Button>
                  </div>
                );
              })
            ) : (
              <p className="px-2 py-4 text-sm font-semibold text-slate-500">{t('conversations.empty')}</p>
            )}
          </div>

          <details className="mt-3 border-t border-slate-200 pt-3 dark:border-white/10">
            <summary className="flex cursor-pointer list-none items-center justify-between rounded-lg px-2 py-2 text-xs font-black uppercase text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-white/5">
              <span>{t('analytics.sessions')}</span>
              <span className="text-base text-slate-900 dark:text-white">{analytics?.totalSessions ?? 0}</span>
            </summary>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <div className="rounded-lg bg-emerald-50 p-2 dark:bg-emerald-500/10">
                <div className="text-base font-black text-emerald-700 dark:text-emerald-300">{analytics?.completedSessions ?? 0}</div>
                <div className="text-[0.65rem] font-bold text-emerald-700/80 dark:text-emerald-300/80">{t('analytics.completed')}</div>
              </div>
              <div className="rounded-lg bg-amber-50 p-2 dark:bg-amber-500/10">
                <div className="text-base font-black text-amber-700 dark:text-amber-300">{(analytics?.failedSessions ?? 0) + (analytics?.abandonedSessions ?? 0)}</div>
                <div className="text-[0.65rem] font-bold text-amber-700/80 dark:text-amber-300/80">{t('analytics.problemSessions')}</div>
              </div>
              <div className="rounded-lg bg-slate-100 p-2 dark:bg-white/5">
                <div className="text-base font-black text-slate-900 dark:text-white">{Math.round(analytics?.averageLatencyMs ?? 0)} ms</div>
                <div className="text-[0.65rem] font-bold text-slate-500">{t('analytics.averageLatency')}</div>
              </div>
              <div className="rounded-lg bg-primary/10 p-2">
                <div className="text-base font-black text-primary">%{analytics?.toolConfirmationRate ?? 0}</div>
                <div className="text-[0.65rem] font-bold text-primary/80">{t('analytics.toolRate')}</div>
              </div>
            </div>
          </details>
        </aside>

        <section className="order-1 flex h-[calc(100dvh-8rem)] min-h-[38rem] min-w-0 flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-slate-950 xl:order-2 xl:h-auto xl:min-h-0">
          <header className="flex flex-col justify-between gap-3 border-b border-slate-200 px-4 py-3 dark:border-white/10 sm:flex-row sm:items-center">
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Bot size={20} />
              </span>
              <div className="min-w-0">
                <p className="text-[0.68rem] font-black uppercase text-primary">{t('eyebrow')}</p>
                <h1 className="truncate text-base font-black text-slate-950 dark:text-white">{t('chatTitle')}</h1>
              </div>
            </div>
            <div className="min-w-0 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
              <span className="text-slate-400">{t('contextTitle')}:</span>{' '}
              <span className="break-words">{createRouteEntityContext(window.location.pathname).routeTitle || t('contextHome')}</span>
            </div>
          </header>

          <AiAssistantCapabilityStrip capabilities={capabilities} />

          <div
            className="min-h-0 flex-1 overflow-y-auto px-3 py-4 sm:px-5"
            role="log"
            aria-live="polite"
            aria-relevant="additions text"
          >
            {messages.length === 0 ? (
              <div className="mx-auto flex h-full max-w-3xl flex-col justify-center py-8 text-center">
                <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-lg bg-primary/10 text-primary ring-1 ring-primary/15">
                  <Bot size={30} />
                </span>
                <h2 className="mt-5 text-xl font-black text-slate-950 dark:text-white sm:text-2xl">
                  {isLoading ? t('loadingGreeting') : t('greeting', { name: displayName })}
                </h2>
                <p className="mx-auto mt-2 max-w-2xl text-sm font-semibold leading-6 text-slate-600 dark:text-slate-300">
                  {t('chatDescription')}
                </p>
                <div className="mt-6 grid gap-2 sm:grid-cols-2">
                  {suggestionItems.map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      disabled={isAssistantBusy}
                      onClick={() => void askQuestion(suggestion)}
                      className="min-h-14 rounded-lg border border-slate-200 bg-white px-4 py-3 text-start text-sm font-bold leading-5 text-slate-700 transition hover:border-primary/40 hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:border-primary/40 dark:hover:bg-primary/10"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="mx-auto max-w-5xl space-y-4">
                {messages.map((message, messageIndex) => (
                  <article key={message.id} className={message.role === 'user' ? 'flex justify-end' : 'space-y-3'}>
                    {message.role === 'user' ? (
                      <div className="max-w-[90%] rounded-2xl rounded-ee-md bg-primary px-4 py-3 text-sm font-bold leading-6 text-white shadow-sm sm:max-w-[78%]">
                        <p className="whitespace-pre-wrap">{message.content}</p>
                        {message.attachments?.map((attachment) => (
                          <div key={`${message.id}-${attachment.fileName}-${attachment.size}`} className="mt-2 flex items-center gap-2 rounded-lg bg-white/15 px-3 py-2 text-xs font-bold">
                            <FileImage size={14} />
                            <span className="min-w-0 truncate">{attachment.fileName}</span>
                            <span className="shrink-0 opacity-80">{formatAttachmentSize(attachment.size)}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <>
                        <div className="flex items-start gap-3">
                          <span className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                            <Bot size={17} />
                          </span>
                          <div className="min-w-0 max-w-4xl flex-1">
                            <AiAssistantAnswerCard
                              answer={message.content}
                              headerAction={(
                                <div className="flex flex-wrap items-center justify-end gap-1">
                                  {message.structuredResult && (message.structuredResult.rows.length > 0 || message.structuredResult.sections?.length) ? (
                                    <AiAssistantExportMenu
                                      result={message.structuredResult}
                                      question={findPrecedingUserQuestion(messages, messageIndex)}
                                      answer={message.content}
                                      language={languagePreference === 'auto' ? 'tr' : languagePreference}
                                      labels={{
                                        action: t('export.action'),
                                        excel: t('export.excel'),
                                        pdf: t('export.pdf'),
                                        success: t('export.success'),
                                        error: t('export.error'),
                                      }}
                                    />
                                  ) : null}
                                  <Button type="button" variant="ghost" size="sm" className="h-8 rounded-lg px-2 text-xs font-black text-slate-500 hover:text-primary dark:text-slate-300" onClick={() => void copyAssistantMessage(message)}>
                                    {copiedMessageId === message.id ? <Check size={13} className="me-1.5" /> : <Copy size={13} className="me-1.5" />}
                                    {copiedMessageId === message.id ? t('copied') : t('copyAnswer')}
                                  </Button>
                                </div>
                              )}
                            />
                          </div>
                        </div>

                        <AiAssistantEvidencePanel
                          intent={message.intent}
                          context={message.context}
                          interpretations={message.interpretations}
                          result={message.structuredResult}
                          sources={message.sources}
                        />

                        {message.actionItems && message.actionItems.length > 0 ? (
                          <div className="ms-12 rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/5">
                            <div className="mb-3 text-[0.68rem] font-black uppercase text-slate-500 dark:text-slate-300">{t('actionItemsTitle')}</div>
                            <div className="grid gap-3 md:grid-cols-2">
                              {message.actionItems.map((item) => (
                                <div key={`${message.id}-${item.title}-${item.description}`} className={`rounded-lg border p-4 ${actionItemClassNameBySeverity[item.severity] ?? actionItemClassNameBySeverity.info}`}>
                                  <div className="text-sm font-black">{item.title}</div>
                                  <p className="mt-2 text-sm font-semibold leading-6 opacity-85">{item.description}</p>
                                  {(item.actionUrl || item.toolActionId) ? (
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant="outline"
                                      disabled={Boolean(item.toolActionId && pendingToolActionId === item.toolActionId)}
                                      className="mt-3 h-9 rounded-lg bg-white/70 px-3 text-xs font-black dark:bg-white/10"
                                      onClick={() => void openActionUrl(item.actionUrl, item.toolActionId, item.confirmationRequired || Boolean(item.toolActionId))}
                                    >
                                      {item.actionUrl ? <ExternalLink size={13} className="me-1.5" /> : <Check size={13} className="me-1.5" />}
                                      {item.actionLabel || t('openAction')}
                                    </Button>
                                  ) : null}
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : null}
                      </>
                    )}
                  </article>
                ))}

                {isAssistantBusy ? <AiAssistantThinkingIndicator /> : null}

                <div className="ms-12 grid gap-2 sm:grid-cols-2">
                  {suggestionItems.map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      disabled={isAssistantBusy}
                      onClick={() => void askQuestion(suggestion)}
                      className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-start text-xs font-bold leading-5 text-slate-700 transition hover:border-primary/30 hover:bg-primary/5 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:border-primary/40 dark:hover:bg-primary/10"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          <footer className="border-t border-slate-200 bg-slate-50/80 p-3 dark:border-white/10 dark:bg-white/[0.03] sm:p-4">
            <div ref={toolbarRowRef} className="relative mb-3 flex w-full max-w-full items-center gap-2">
              <div ref={composerToolbarAnchorRef} className="relative shrink-0">
                {isComposerToolbarMenuOpen && isCollapsedToMenu ? (
                  <div className="absolute bottom-full start-0 z-20 mb-2 rounded-lg border border-slate-200 bg-white p-2 shadow-xl animate-in fade-in slide-in-from-bottom-2 duration-200 dark:border-white/10 dark:bg-slate-900" role="menu">
                    <AiAssistantComposerToolbar layout="menu" {...composerToolbarProps} />
                  </div>
                ) : null}
                <button
                  type="button"
                  aria-label={t('pageTitle')}
                  aria-expanded={isComposerToolbarActive}
                  onClick={handleComposerToolbarIconClick}
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border bg-white transition dark:bg-white/5 ${isComposerToolbarActive ? 'border-primary/40 ring-2 ring-primary/15' : 'border-slate-300 dark:border-white/20'}`}
                >
                  <Bot className="text-primary" size={20} />
                </button>
              </div>

              {showInlineComposerToolbar ? (
                <div className="min-w-0 flex-1 animate-in fade-in slide-in-from-left-2 duration-200">
                  <AiAssistantComposerToolbar layout="inline" {...composerToolbarProps} />
                </div>
              ) : null}

              <div aria-hidden className="pointer-events-none absolute left-0 top-0 -z-10 h-0 w-full overflow-hidden opacity-0">
                <div ref={toolbarMeasureRef} className="inline-block w-max max-w-none">
                  <AiAssistantComposerToolbar layout="measure" {...composerToolbarProps} />
                </div>
              </div>
            </div>

            <form className="space-y-2" onSubmit={handleSubmit}>
              <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(event) => void handleAttachmentChange(event)} />
              {selectedAttachment ? (
                <div className="flex min-w-0 max-w-full items-center gap-2 rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-xs font-black text-primary dark:text-primary-foreground">
                  <FileImage size={14} className="shrink-0" />
                  <span className="min-w-0 truncate">{selectedAttachment.fileName}</span>
                  <span className="shrink-0 opacity-75">{formatAttachmentSize(selectedAttachment.size)}</span>
                  <button type="button" className="ms-1 rounded-full p-0.5 hover:bg-primary/15" aria-label={t('removeImage')} onClick={clearSelectedAttachment}>
                    <X size={13} />
                  </button>
                </div>
              ) : null}
              {(questionError || askMutation.error?.message) ? (
                <div className="flex min-w-0 max-w-full items-center gap-2 rounded-lg border border-red-400/30 bg-red-500/10 px-3 py-2 text-xs font-black text-red-700 dark:text-red-100">
                  <span className="min-w-0 break-words">{questionError || askMutation.error?.message}</span>
                </div>
              ) : null}

              <div className="flex items-end gap-2 rounded-lg border border-slate-300 bg-white p-2 transition focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/10 dark:border-white/15 dark:bg-slate-950">
                <div className="relative shrink-0">
                  {isActionsMenuOpen ? (
                    <div className="absolute bottom-full start-0 z-20 mb-2 min-w-48 rounded-lg border border-slate-200 bg-white p-1.5 shadow-xl animate-in fade-in slide-in-from-bottom-2 duration-200 dark:border-white/10 dark:bg-slate-900" role="menu">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={isAssistantBusy}
                        className="h-9 w-full justify-start rounded-lg px-3 text-xs font-black hover:bg-primary/5"
                        onClick={() => {
                          fileInputRef.current?.click();
                          setIsActionsMenuOpen(false);
                        }}
                      >
                        <ImagePlus size={14} className="me-1.5" />
                        {t('attachImage')}
                      </Button>
                    </div>
                  ) : null}
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    disabled={isAssistantBusy}
                    className={`h-10 w-10 rounded-lg border transition ${isActionsMenuOpen ? 'border-primary/40 bg-primary/10 text-primary' : 'border-slate-200 dark:border-white/10'}`}
                    aria-expanded={isActionsMenuOpen}
                    onClick={() => setIsActionsMenuOpen(!isActionsMenuOpen)}
                    title={t('attachImage')}
                  >
                    <ImagePlus size={17} />
                  </Button>
                </div>
                <Textarea
                  ref={textareaRef}
                  rows={2}
                  placeholder={t('inputPlaceholder')}
                  className="max-h-32 min-h-11 flex-1 resize-none border-0 bg-transparent px-2 py-2 text-sm font-semibold shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-slate-400 dark:bg-transparent dark:placeholder:text-slate-500"
                  value={question}
                  onChange={(event) => {
                    setQuestion(event.target.value);
                    if (questionError) setQuestionError(null);
                  }}
                  onKeyDown={handleQuestionKeyDown}
                />
                <Button
                  ref={sendButtonRef}
                  type="submit"
                  size="icon"
                  disabled={isAssistantBusy || (!question.trim() && !selectedAttachment)}
                  className="h-11 w-11 shrink-0 rounded-lg bg-primary text-white shadow-sm hover:bg-primary/90"
                  title={isAssistantBusy ? t('sending') : t('send')}
                  aria-label={isAssistantBusy ? t('sending') : t('send')}
                >
                  {isAssistantBusy ? <LoaderCircle size={18} className="animate-spin" /> : <SendHorizontal size={18} />}
                </Button>
              </div>
            </form>
          </footer>
        </section>
      </section>
    </main>
  );
}

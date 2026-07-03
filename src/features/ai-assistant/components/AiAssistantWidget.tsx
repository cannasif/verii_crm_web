import { type ChangeEvent, type FormEvent, type KeyboardEvent, type PointerEvent, type ReactElement, useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';
import { Bot, Check, Copy, ExternalLink, FileImage, GripVertical, ImagePlus, Maximize2, MessageCircle, Minimize2, Plus, SendHorizontal, Sparkles, Wand2, X } from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { aiAssistantApi } from '../api/ai-assistant-api';
import { useAskAiAssistantMutation } from '../hooks/useAskAiAssistantMutation';
import { useAiAssistantConversationHistoryQuery, useAiAssistantGreetingQuery } from '../hooks/useAiAssistantGreetingQuery';
import { AiAssistantAnswerCard } from './AiAssistantAnswerCard';
import { AiAssistantThinkingIndicator } from './AiAssistantThinkingIndicator';
import {
  getLatestAiAssistantErrorContext,
  subscribeAiAssistantErrorContext,
  type AiAssistantErrorContext,
} from '../lib/ai-assistant-error-context';
import {
  createAiAssistantActionItemsFromToolActions,
  createAiAssistantChatMessagesFromServer,
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
import { showReportDraftReadyToast } from '../lib/ai-assistant-report-draft-toast';

const actionItemClassNameBySeverity: Record<string, string> = {
  danger: 'border-red-400/30 bg-red-400/10 text-red-950 dark:text-red-100',
  warning: 'border-amber-400/30 bg-amber-400/10 text-amber-950 dark:text-amber-100',
  success: 'border-emerald-400/30 bg-emerald-400/10 text-emerald-950 dark:text-emerald-100',
  info: 'border-sky-400/30 bg-sky-400/10 text-sky-950 dark:text-sky-100',
};

const minimumThinkingDurationMs = 900;
const missingTranslationText = 'Çeviri eksik';
const widgetPositionStorageKey = 'crm-ai-assistant-widget-position';
const widgetSessionStorageKey = 'crm-ai-assistant-session-key';
const widgetViewportPadding = 16;
const widgetDefaultWidth = 500;
const widgetDefaultHeight = 700;

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
  dragPanel: 'Paneli sürükle',
  dockedChat: 'AI Asistan',
  contextTitle: 'Bağlam',
  contextHome: 'Genel CRM',
  promptGuideTitle: 'Nereden başlayalım?',
  promptGuideDescription: 'Bir öneri seçebilir ya da doğrudan kendi cümlenizle yazabilirsiniz.',
  enterToSend: 'Enter gönderir, Shift+Enter yeni satır açar.',
  reportMode: 'Rapor oluştur',
  errorMode: 'Hata açıkla',
  salesMode: 'Satış özeti',
  erpMode: 'ERP kontrolü',
};

const defaultSuggestions = [
  'Bu ay kaç teklif oluşturdum?',
  'Onaylanan siparişlerimin oranı nedir?',
  "ERP'ye aktarılan satış kayıtlarım kaç adet?",
  'Bugünkü aktivitelerimi özetle.',
];

const assistantCapabilityPrompts = [
  {
    key: 'reportMode',
    fallback: 'Rapor oluştur',
    prompt: 'Satış temsilcisi bazında KPI ve grafik içeren rapor oluştur.',
  },
  {
    key: 'salesMode',
    fallback: 'Satış özeti',
    prompt: 'Bu ay talep, teklif ve sipariş performansımı özetle.',
  },
  {
    key: 'erpMode',
    fallback: 'ERP kontrolü',
    prompt: "ERP'ye aktarılmamış satış kayıtlarımı kontrol eder misin?",
  },
  {
    key: 'errorMode',
    fallback: 'Hata açıkla',
    prompt: 'Son hatayı anlaşılır şekilde açıkla ve kontrol adımlarını yaz.',
  },
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

function createSessionKey(): string {
  return `web-${createMessageId()}`;
}

function readAssistantSessionKey(): string {
  if (typeof window === 'undefined' || !window.localStorage) {
    return createSessionKey();
  }

  const existingKey = window.localStorage.getItem(widgetSessionStorageKey);
  if (existingKey) return existingKey;

  const nextKey = createSessionKey();
  window.localStorage.setItem(widgetSessionStorageKey, nextKey);
  return nextKey;
}

type WidgetPosition = {
  x: number;
  y: number;
};

type DragState = {
  pointerId: number;
  offsetX: number;
  offsetY: number;
};

function clampWidgetPosition(position: WidgetPosition, element?: HTMLElement | null): WidgetPosition {
  if (typeof window === 'undefined') {
    return position;
  }

  const width = element?.offsetWidth || widgetDefaultWidth;
  const height = element?.offsetHeight || widgetDefaultHeight;
  const maxX = Math.max(widgetViewportPadding, window.innerWidth - width - widgetViewportPadding);
  const maxY = Math.max(widgetViewportPadding, window.innerHeight - height - widgetViewportPadding);

  return {
    x: Math.min(Math.max(position.x, widgetViewportPadding), maxX),
    y: Math.min(Math.max(position.y, widgetViewportPadding), maxY),
  };
}

function createDefaultWidgetPosition(): WidgetPosition {
  if (typeof window === 'undefined') {
    return { x: widgetViewportPadding, y: widgetViewportPadding };
  }

  return clampWidgetPosition({
    x: window.innerWidth - widgetDefaultWidth - 24,
    y: window.innerHeight - widgetDefaultHeight - 24,
  });
}

function readWidgetPosition(): WidgetPosition {
  if (typeof window === 'undefined' || !window.localStorage) {
    return createDefaultWidgetPosition();
  }

  const rawPosition = window.localStorage.getItem(widgetPositionStorageKey);
  if (!rawPosition) {
    return createDefaultWidgetPosition();
  }

  try {
    const parsed = JSON.parse(rawPosition) as Partial<WidgetPosition>;
    if (typeof parsed.x !== 'number' || typeof parsed.y !== 'number') {
      return createDefaultWidgetPosition();
    }

    return clampWidgetPosition({ x: parsed.x, y: parsed.y });
  } catch {
    return createDefaultWidgetPosition();
  }
}

function writeWidgetPosition(position: WidgetPosition): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  window.localStorage.setItem(widgetPositionStorageKey, JSON.stringify(position));
}

function createReadableRouteContext(pathname: string): string {
  if (!pathname || pathname === '/') return aiAssistantTextFallbacks.contextHome;

  const cleanPath = pathname
    .split('/')
    .filter(Boolean)
    .slice(0, 3)
    .map((segment) => segment.replace(/-/g, ' '))
    .join(' / ');

  return cleanPath || aiAssistantTextFallbacks.contextHome;
}

function createRouteEntityContext(pathname: string): {
  routeTitle: string;
  entityType?: string;
  entityId?: number;
  customerId?: number;
} {
  const routeTitle = createReadableRouteContext(pathname);
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
  const entityType = firstSegment ? entityTypeByRoute[firstSegment] ?? firstSegment : undefined;

  return {
    routeTitle,
    entityType,
    entityId,
    customerId: entityType === 'customer' ? entityId : undefined,
  };
}

export function AiAssistantWidget(): ReactElement {
  const { t } = useTranslation('ai-assistant');
  const navigate = useNavigate();
  const location = useLocation();
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
  const [widgetPosition, setWidgetPosition] = useState<WidgetPosition>(() => readWidgetPosition());
  const [sessionKey, setSessionKey] = useState<string>(() => readAssistantSessionKey());
  const conversationHistoryQuery = useAiAssistantConversationHistoryQuery(sessionKey, isOpen);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const sendButtonRef = useRef<HTMLButtonElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const widgetContainerRef = useRef<HTMLDivElement | null>(null);
  const dragStateRef = useRef<DragState | null>(null);
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
    if (!isOpen || !conversationHistoryQuery.data) {
      return;
    }

    const serverMessages = createAiAssistantChatMessagesFromServer(conversationHistoryQuery.data.messages);
    if (serverMessages.length === 0) {
      return;
    }

    skipNextHistoryWriteRef.current = true;
    setMessages(serverMessages);
    writeAiAssistantChatHistory(chatHistoryKey, serverMessages);
  }, [chatHistoryKey, conversationHistoryQuery.data, isOpen]);

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
  const currentRouteContext = createReadableRouteContext(location.pathname);
  const fallbackSuggestions = defaultSuggestions.map((suggestion, index) =>
    readText(`suggestions.${index + 1}`, suggestion)
  );
  const suggestionItems = dynamicSuggestions.length > 0 ? dynamicSuggestions : fallbackSuggestions;
  const isAssistantBusy = askMutation.isPending || isThinking;

  useEffect(() => {
    if (!isOpen) return;

    messagesEndRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'end',
    });
  }, [isOpen, messages, isAssistantBusy]);

  useEffect(() => {
    if (!isOpen) return;

    const handleResize = (): void => {
      setWidgetPosition((currentPosition) => {
        const nextPosition = clampWidgetPosition(currentPosition, widgetContainerRef.current);
        writeWidgetPosition(nextPosition);
        return nextPosition;
      });
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isOpen, isExpanded]);

  const handleDragStart = useCallback((event: PointerEvent<HTMLElement>): void => {
    if (event.button !== 0) return;

    const target = event.target as HTMLElement;
    if (target.closest('[data-ai-drag-ignore="true"]')) {
      return;
    }

    const widgetElement = widgetContainerRef.current;
    if (!widgetElement) return;

    const rect = widgetElement.getBoundingClientRect();
    dragStateRef.current = {
      pointerId: event.pointerId,
      offsetX: event.clientX - rect.left,
      offsetY: event.clientY - rect.top,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  }, []);

  const handleDragMove = useCallback((event: PointerEvent<HTMLElement>): void => {
    const dragState = dragStateRef.current;
    if (!dragState || dragState.pointerId !== event.pointerId) return;

    const nextPosition = clampWidgetPosition(
      {
        x: event.clientX - dragState.offsetX,
        y: event.clientY - dragState.offsetY,
      },
      widgetContainerRef.current
    );

    setWidgetPosition(nextPosition);
  }, []);

  const handleDragEnd = useCallback((event: PointerEvent<HTMLElement>): void => {
    const dragState = dragStateRef.current;
    if (!dragState || dragState.pointerId !== event.pointerId) return;

    dragStateRef.current = null;
    const nextPosition = clampWidgetPosition(widgetPosition, widgetContainerRef.current);
    setWidgetPosition(nextPosition);
    writeWidgetPosition(nextPosition);
    event.currentTarget.releasePointerCapture(event.pointerId);
  }, [widgetPosition]);

  const askQuestion = async (value: string, errorContext?: AiAssistantErrorContext | null): Promise<void> => {
    const trimmedQuestion = value.trim();
    const activeAttachment = selectedAttachment;
    if (!trimmedQuestion && !activeAttachment) {
      setQuestionError(readText('emptyQuestion'));
      return;
    }

    const finalQuestion = trimmedQuestion || readText('imageDefaultQuestion');
    setQuestionError(null);
    setQuestion('');
    clearSelectedAttachment();
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
          attachments: activeAttachment ? [createAttachmentRequest(activeAttachment)] : [],
        }),
        waitForMinimumThinkingDuration(),
      ]);
      if (result.sessionKey && result.sessionKey !== sessionKey) {
        setSessionKey(result.sessionKey);
        window.localStorage.setItem(widgetSessionStorageKey, result.sessionKey);
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
          intent: result.intent,
        },
      ]);
      showReportDraftReadyToast(result, openActionUrl);
      setDynamicSuggestions(result.suggestedQuestions?.length ? result.suggestedQuestions : fallbackSuggestions);
    } catch (error) {
      const fallbackErrorMessage =
        error instanceof Error
          ? error.message
          : readText('apiErrors.answer', 'AI asistan yanıtı alınamadı.');

      setMessages((currentMessages) => [
        ...currentMessages,
        {
          id: createMessageId(),
          role: 'assistant',
          content: `Yanıtı hazırlarken bir sorun yaşadım.\n\n${fallbackErrorMessage}\n\nSoruyu biraz daha kısa yazıp tekrar deneyebilir ya da ekrandaki son hatayı açıklamamı isteyebilirsiniz.`,
          createdAt: new Date().toISOString(),
          actionItems: [
            {
              title: 'Tekrar deneyin',
              description: 'Soru gönderildi ancak AI yanıtı tamamlanamadı. Ağ bağlantısı veya API servisi geçici olarak yanıt vermemiş olabilir.',
              severity: 'warning',
            },
          ],
          sources: [],
          intent: 'assistant-error',
        },
      ]);
      setQuestionError(fallbackErrorMessage);
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
    const nextSessionKey = createSessionKey();
    setSessionKey(nextSessionKey);
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(widgetSessionStorageKey, nextSessionKey);
    }
    setMessages([]);
    setDynamicSuggestions([]);
    setQuestionError(null);
    clearSelectedAttachment();
  };

  const openActionUrl = async (actionUrl: string, toolActionId?: number | null, confirmationRequired = false): Promise<void> => {
    if (confirmationRequired) {
      const confirmed = window.confirm('AI önerisini onaylayıp ilgili ekrana geçmek istiyor musunuz?');
      if (!confirmed) return;
    }

    if (toolActionId) {
      await aiAssistantApi.confirmAction(toolActionId);
    }

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
      ref={widgetContainerRef}
      className={isOpen ? 'fixed z-50 print:hidden' : 'fixed end-0 top-1/2 z-50 -translate-y-1/2 print:hidden'}
      style={isOpen ? { left: `${widgetPosition.x}px`, top: `${widgetPosition.y}px` } : undefined}
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
        <section className={`ai-widget-container relative flex min-h-0 w-[calc(100vw-1.25rem)] transition-all duration-300 ease-in-out flex-col overflow-hidden rounded-[2rem] border border-primary/15 bg-background/98 shadow-2xl shadow-[0_24px_60px_-24px_var(--crm-brand-shadow)] backdrop-blur-2xl dark:border-primary/20 dark:bg-slate-950/98 ${isExpanded
          ? 'is-expanded sm:max-w-[850px] h-[min(92dvh,850px)]'
          : 'max-w-[500px] h-[min(80dvh,700px)]'
          }`}>
          <div className="pointer-events-none absolute inset-0 bg-[image:var(--crm-brand-gradient-soft)] opacity-35 dark:opacity-20" />
          <header
            className="relative flex cursor-move touch-none select-none items-center justify-between gap-3 border-b border-slate-200/70 bg-white/55 p-4 backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.03]"
            aria-label={readText('dragPanel')}
            onPointerDown={handleDragStart}
            onPointerMove={handleDragMove}
            onPointerUp={handleDragEnd}
            onPointerCancel={handleDragEnd}
          >
            <div className="flex min-w-0 items-center gap-3">
              <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[image:var(--crm-brand-gradient)] text-white shadow-[0_10px_20px_-10px_var(--crm-brand-shadow)]">
                <Bot size={22} />
                <span className="absolute -bottom-0.5 -end-0.5 h-3.5 w-3.5 rounded-full border-2 border-white bg-emerald-400 dark:border-slate-950" />
              </div>
              <div className="min-w-0">
                <div className="flex min-w-0 items-center gap-2">
                  <p className="truncate text-sm font-black text-slate-950 dark:text-white">
                    {readText('pageTitle')}
                  </p>
                  <GripVertical size={14} className="hidden text-slate-400 sm:block" aria-hidden="true" />
                </div>
                <div className="mt-1 flex min-w-0 items-center gap-2 text-[0.68rem] font-black uppercase tracking-[0.14em] text-slate-500 dark:text-slate-300">
                  <span>{readText('contextTitle')}</span>
                  <span className="min-w-0 truncate rounded-full border border-primary/15 bg-primary/10 px-2 py-0.5 text-primary">
                    {currentRouteContext}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1 sm:gap-2" data-ai-drag-ignore="true">
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
            className="relative min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-4 py-5"
            role="log"
            aria-live="polite"
            aria-relevant="additions text"
          >
            {messages.length === 0 && (
              <div className="flex items-start gap-3">
                <div className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border border-primary/15 bg-accent text-primary shadow-sm dark:border-primary/25 dark:bg-primary/10">
                  <Sparkles size={17} />
                </div>
                <div className="max-w-[86%] rounded-[1.6rem] rounded-ss-md border border-primary/15 bg-white/80 p-4 shadow-sm backdrop-blur-xl dark:bg-white/[0.06]">
                  <div className="mb-2 inline-flex items-center gap-2 text-[0.68rem] font-black uppercase tracking-[0.22em] text-primary">
                    {readText('eyebrow')}
                  </div>
                  <p className="text-sm font-semibold leading-6 text-slate-600 dark:text-slate-200">
                    {isLoading
                      ? readText('loadingGreeting')
                      : readText('greeting', `Merhaba ${displayName}, size nasıl yardımcı olabilirim?`, { name: displayName })}{' '}
                    {readText('chatDescription')}
                  </p>
                  <div className="mt-4 rounded-2xl border border-primary/10 bg-slate-50/80 p-3 dark:border-primary/15 dark:bg-white/[0.04]">
                    <div className="mb-1 flex items-center gap-2 text-xs font-black text-slate-900 dark:text-white">
                      <Wand2 size={15} className="text-primary" />
                      {readText('promptGuideTitle')}
                    </div>
                    <p className="text-xs font-semibold leading-5 text-slate-500 dark:text-slate-300">
                      {readText('promptGuideDescription')}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {messages.map((message) => {
              const messageActionItems = message.actionItems?.length
                ? message.actionItems
                : createAiAssistantActionItemsFromToolActions(message.toolActions);

              return (
              <div
                key={message.id}
                className={message.role === 'user' ? 'flex justify-end' : 'space-y-3'}
              >
                {message.role === 'user' ? (
                  <div className="max-w-[82%] rounded-[1.45rem] rounded-ee-md bg-[image:var(--crm-brand-gradient)] px-4 py-3 text-sm font-black leading-6 text-white shadow-[0_10px_20px_-10px_var(--crm-brand-shadow)]">
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
                      <div className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border border-primary/15 bg-accent text-primary shadow-sm dark:border-primary/25 dark:bg-primary/10">
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
                            className="h-8 rounded-xl px-3 text-xs font-black text-slate-500 hover:text-primary dark:text-slate-300"
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

                    {messageActionItems.length > 0 && (
                      <div className="ms-12 rounded-3xl border border-slate-200 bg-white/70 p-4 shadow-sm dark:border-white/10 dark:bg-white/5">
                        <div className="mb-3 text-[0.68rem] font-black uppercase tracking-[0.22em] text-slate-500 dark:text-slate-300">
                          {readText('actionItemsTitle')}
                        </div>
                        <div className="grid gap-2">
                          {messageActionItems.map((item) => (
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
                                  onClick={() => {
                                    void openActionUrl(
                                      item.actionUrl!,
                                      item.toolActionId,
                                      item.confirmationRequired || Boolean(item.toolActionId)
                                    );
                                  }}
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
              );
            })}

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

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {assistantCapabilityPrompts.map((capability) => (
                <button
                  key={capability.key}
                  type="button"
                  disabled={isAssistantBusy}
                  onClick={() => void askQuestion(capability.prompt)}
                  className="group rounded-2xl border border-primary/10 bg-white/70 px-3.5 py-3 text-start shadow-sm transition hover:border-primary/30 hover:bg-accent disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10 dark:bg-white/5 dark:hover:border-primary/30 dark:hover:bg-primary/10"
                >
                  <span className="mb-1 flex items-center gap-2 text-xs font-black text-slate-950 dark:text-white">
                    <Sparkles size={14} className="text-primary" />
                    {readText(capability.key, capability.fallback)}
                  </span>
                  <span className="line-clamp-2 text-xs font-semibold leading-5 text-slate-500 dark:text-slate-300">
                    {capability.prompt}
                  </span>
                </button>
              ))}
            </div>

            <div className="flex flex-wrap gap-2">
              {suggestionItems.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  disabled={isAssistantBusy}
                  onClick={() => void askQuestion(suggestion)}
                  className="rounded-full border border-slate-200 bg-white/70 px-3.5 py-2 text-start text-xs font-black text-slate-700 shadow-sm transition hover:border-primary/25 hover:bg-accent disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:border-primary/30 dark:hover:bg-primary/10"
                >
                  {suggestion}
                </button>
              ))}
            </div>

            <div ref={messagesEndRef} />
          </div>

          <form className="relative shrink-0 border-t border-slate-200/80 bg-white/75 p-4 backdrop-blur-xl dark:border-white/10 dark:bg-black/30" onSubmit={handleSubmit}>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={(event) => void handleAttachmentChange(event)}
            />
            {selectedAttachment && (
              <div className="mb-3 flex min-w-0 max-w-full items-center gap-2 rounded-2xl border border-primary/30 bg-primary/10 px-3 py-2 text-xs font-black text-primary dark:text-primary-foreground">
                <FileImage size={14} className="shrink-0" />
                <span className="min-w-0 truncate">{selectedAttachment.fileName}</span>
                <span className="shrink-0 opacity-75">{formatAttachmentSize(selectedAttachment.size)}</span>
                <button
                  type="button"
                  className="ms-1 rounded-full p-0.5 hover:bg-primary/15"
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
            <div className="flex flex-col rounded-[1.6rem] border border-slate-200 bg-white/90 shadow-sm dark:border-white/10 dark:bg-white/[0.06] overflow-hidden focus-within:ring-2 focus-within:ring-primary/25 dark:focus-within:ring-primary/20 transition-all duration-200">
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
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' && !event.shiftKey && !isAssistantBusy) {
                      event.preventDefault();
                      void askQuestion(question);
                      return;
                    }

                    handleQuestionKeyDown(event);
                  }}
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
                      ? 'rotate-45 border-primary/40 bg-accent text-primary dark:bg-primary/10 dark:text-primary dark:border-primary/30'
                      : 'border-slate-200 dark:border-white/10 hover:border-primary/30 dark:hover:border-primary/30'
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
                        className="h-9 rounded-2xl border-slate-200 bg-white/80 px-3 text-xs font-black dark:border-white/10 dark:bg-white/[0.06] hover:border-primary/30 hover:bg-accent dark:hover:bg-primary/10 transition-colors"
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
                <span className="hidden min-w-0 text-[0.68rem] font-bold text-slate-400 sm:block">
                  {readText('enterToSend')}
                </span>
                <Button
                  ref={sendButtonRef}
                  type="submit"
                  disabled={isAssistantBusy || (!question.trim() && !selectedAttachment)}
                  className="shrink-0 rounded-full bg-[image:var(--crm-brand-gradient)] px-5 text-white shadow-[0_10px_20px_-10px_var(--crm-brand-shadow)]"
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
          className="group flex items-center gap-2 rounded-s-3xl border border-e-0 border-white/20 bg-[image:var(--crm-brand-gradient)] px-3 py-4 text-sm font-black text-white shadow-[0_10px_20px_-10px_var(--crm-brand-shadow)] transition hover:translate-x-[-2px] hover:shadow-[0_14px_28px_-10px_var(--crm-brand-shadow)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 dark:ring-offset-slate-950"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-white/20">
            <MessageCircle size={20} />
          </span>
          <span className="hidden max-w-20 text-start leading-4 sm:inline">{readText('dockedChat')}</span>
        </button>
      )}
    </div>
  );
}

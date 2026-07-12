import { type ChangeEvent, type FormEvent, type KeyboardEvent, type PointerEvent, type ReactElement, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';
import { Bot, Check, ChevronsLeft, Copy, ExternalLink, FileImage, GripVertical, Headphones, ImagePlus, Maximize2, MessageCircle, Mic, MicOff, Minimize2, Plus, SendHorizontal, Sparkles, Volume2, VolumeX, X } from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';
import { useUIStore } from '@/stores/ui-store';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { createClientId } from '@/lib/create-client-id';
import { useAskAiAssistantMutation } from '../hooks/useAskAiAssistantMutation';
import { useAiAssistantGreetingQuery } from '../hooks/useAiAssistantGreetingQuery';
import { AiAssistantAnswerCard } from './AiAssistantAnswerCard';
import { AiAssistantThinkingIndicator } from './AiAssistantThinkingIndicator';
import { AiAssistantDockDialog } from './AiAssistantDockDialog';
import { AiAssistantLastErrorButton } from './AiAssistantLastErrorButton';
import {
  clampToContentBounds,
  consumeAiAssistantWidgetPlacementResetOnShow,
  createBottomRightRailPlacement,
  getLeftEdgeAttachedPosition,
  getRightAlignedPosition,
  getRightEdgeAttachedPosition,
  hasAiAssistantWidgetPlacementResetPending,
  isNearContentRightEdge,
  isNearSidebarRightEdge,
  readInitialWidgetPlacement,
  readViewportBounds,
  readWidgetContentBounds,
  resolveWidgetDragPosition,
  type WidgetContentBounds,
  type WidgetEdgeAttachment,
  type WidgetPosition,
  type WidgetSize,
} from '../lib/ai-assistant-widget-placement';
import { useAiAssistantWidgetBounds } from '../hooks/useAiAssistantWidgetBounds';
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
  aiAssistantLanguageOptions,
  readAiAssistantLanguagePreference,
  writeAiAssistantLanguagePreference,
} from '../lib/ai-assistant-language';
import {
  getLatestAiAssistantErrorContext,
  subscribeAiAssistantErrorContext,
  type AiAssistantErrorContext,
} from '../lib/ai-assistant-error-context';
import { aiAssistantApi } from '../api/ai-assistant-api';
import {
  downloadBlobAsPdf,
  extractCustomerDossierId,
  extractSalesRepDossierId,
  isCustomerDossierPdfActionUrl,
  isSalesRepDossierPdfActionUrl,
} from '../lib/ai-assistant-download';
import type { AiAssistantLanguagePreference } from '../types/ai-assistant.types';

const actionItemClassNameBySeverity: Record<string, string> = {
  danger: 'border-red-400/30 bg-red-400/10 text-red-950 dark:text-red-100',
  warning: 'border-amber-400/30 bg-amber-400/10 text-amber-950 dark:text-amber-100',
  success: 'border-emerald-400/30 bg-emerald-400/10 text-emerald-950 dark:text-emerald-100',
  info: 'border-sky-400/30 bg-sky-400/10 text-sky-950 dark:text-sky-100',
};

const minimumThinkingDurationMs = 900;
const missingTranslationText = 'Çeviri eksik';
const widgetPositionStorageKey = 'crm-ai-assistant-widget-position';
const edgeAttachmentStorageKey = 'crm-ai-assistant-edge-attachment';
const widgetSessionStorageKey = 'crm-ai-assistant-widget-session-key';
const dragActivationThresholdPx = 8;
const widgetDefaultWidth = 500;
const widgetDefaultHeight = 700;
const cyberPanelClip = 'polygon(14px 0, 100% 0, 100% calc(100% - 14px), calc(100% - 14px) 100%, 0 100%, 0 14px)';
const cyberChipClip = 'polygon(7px 0, 100% 0, 100% calc(100% - 7px), calc(100% - 7px) 100%, 0 100%, 0 7px)';

type VoicePersona = 'female' | 'male';

type SpeechWindow = Window & {
  SpeechRecognition?: new () => SpeechRecognition;
  webkitSpeechRecognition?: new () => SpeechRecognition;
};

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
  dockPanel: 'Kenara al',
  dockDialogTitle: 'Tam sayfa modu',
  sidebarLinkLabel: 'Tam sayfa modu (sidebar kısayolu)',
  sidebarLinkDescription: 'Açıkken sol menüde AI Asistan linki görünür ve yüzen panel devre dışı kalır.',
  sidebarLinkEnabledNotice: 'Onayladığınızda yüzen panel kapanacak. AI Asistan\'a yalnızca sidebar linki veya tam sayfa üzerinden erişebilirsiniz.',
  dockDialogCancel: 'İptal',
  dockDialogConfirm: 'Onayla',
  openFromRail: 'AI asistanı kenar çubuğundan aç',
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
  responseLanguage: 'Yanıt dili',
  responseLanguageAuto: 'Otomatik dil algılama',
  voiceSessionTitle: 'AI sesli sohbet',
  voiceSessionDescription: 'Konuşun; CRM asistanı yazıya çevirip yanıtını seslendirsin.',
  startVoiceChat: 'Konuşmaya başla',
  stopVoiceChat: 'Dinlemeyi durdur',
  closeVoiceChat: 'Sesli sohbeti kapat',
  voiceListening: 'Dinliyorum ve metne çeviriyorum.',
  voiceSpeaking: 'Yanıt seslendiriliyor.',
  voiceReady: 'Hazır. Konuşmaya başlamak için dokunun.',
  voiceContinue: 'Devam et ve dinle',
  voiceContinueHint: 'Mobil Safari için tekrar dinlemek üzere devam et’e dokunun.',
  voiceUnsupported: 'Tarayıcı sesli sohbeti desteklemiyor.',
  voiceFemale: 'Kadın sesi',
  voiceMale: 'Erkek sesi',
  voiceOutputOn: 'Sesli cevap açık',
  voiceOutputOff: 'Sesli cevap kapalı',
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
  return createClientId();
}

function createSessionKey(): string {
  return `widget-${createMessageId()}`;
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

type DragState = {
  pointerId: number;
  offsetX: number;
  offsetY: number;
  startClientX: number;
  startClientY: number;
  mode: 'panel' | 'closed';
  didActivate: boolean;
  edgeAttachmentStart: WidgetEdgeAttachment;
};

function adjustWidgetPositionForSizeChange(
  position: WidgetPosition,
  previousSize: { width: number; height: number },
  nextSize: { width: number; height: number }
): WidgetPosition {
  return {
    x: position.x + previousSize.width - nextSize.width,
    y: position.y + previousSize.height - nextSize.height,
  };
}

function getTargetPanelSize(expanded: boolean, bounds?: WidgetContentBounds): WidgetSize {
  const contentBounds = bounds ?? readWidgetContentBounds();
  const contentWidth = Math.max(0, contentBounds.right - contentBounds.left);

  if (typeof window === 'undefined') {
    return expanded
      ? { width: 850, height: 850 }
      : { width: widgetDefaultWidth, height: widgetDefaultHeight };
  }

  if (expanded) {
    return {
      width: Math.min(850, contentWidth),
      height: Math.min(850, window.innerHeight * 0.92),
    };
  }

  return {
    width: Math.min(500, contentWidth),
    height: Math.min(700, window.innerHeight * 0.8),
  };
}

function readWidgetPanelSize(element: HTMLElement | null): WidgetSize {
  if (!element) {
    return { width: widgetDefaultWidth, height: widgetDefaultHeight };
  }

  const panelElement = element.querySelector('section');
  return {
    width: panelElement?.offsetWidth ?? element.offsetWidth,
    height: panelElement?.offsetHeight ?? element.offsetHeight,
  };
}

function writeWidgetPosition(position: WidgetPosition): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  window.localStorage.setItem(widgetPositionStorageKey, JSON.stringify(position));
}

function writeEdgeAttachment(attachment: WidgetEdgeAttachment): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  window.localStorage.setItem(edgeAttachmentStorageKey, attachment);
}

function readClosedWidgetSize(element: HTMLElement | null): WidgetSize {
  const railElement = element?.querySelector('button');
  if (!railElement) {
    return { width: 120, height: 72 };
  }

  const rect = railElement.getBoundingClientRect();
  return {
    width: rect.width,
    height: rect.height,
  };
}

function resolveDisplayPosition(
  position: WidgetPosition,
  size: WidgetSize,
  bounds: WidgetContentBounds,
  edgeAttachment: WidgetEdgeAttachment,
  isOpen: boolean
): WidgetPosition {
  if (edgeAttachment === 'right') {
    return isOpen
      ? getRightAlignedPosition(position.y, size, bounds)
      : getRightEdgeAttachedPosition(position.y, size, bounds);
  }

  if (edgeAttachment === 'left') {
    return getLeftEdgeAttachedPosition(position.y, size, bounds);
  }

  return clampToContentBounds(position, size, bounds);
}

function resolveEdgeClosedPosition(
  position: WidgetPosition,
  edgeClosedAnchorY: number | null
): WidgetPosition {
  if (edgeClosedAnchorY === null) {
    return position;
  }

  return {
    ...position,
    y: edgeClosedAnchorY,
  };
}

function resolveEdgePositionSource(
  position: WidgetPosition,
  edgeAnchorY: number | null,
  isOpen: boolean,
  isExpanded: boolean
): WidgetPosition {
  if (edgeAnchorY === null) {
    return position;
  }

  if (!isOpen || !isExpanded) {
    return resolveEdgeClosedPosition(position, edgeAnchorY);
  }

  return position;
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

export function AiAssistantWidget(): ReactElement | null {
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
  const [pendingToolActionId, setPendingToolActionId] = useState<number | null>(null);
  const [latestErrorContext, setLatestErrorContext] = useState<AiAssistantErrorContext | null>(
    () => getLatestAiAssistantErrorContext()
  );
  const [questionError, setQuestionError] = useState<string | null>(null);
  const [selectedAttachment, setSelectedAttachment] = useState<AiAssistantSelectedAttachment | null>(null);
  const [isActionsMenuOpen, setIsActionsMenuOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [isVoiceSessionOpen, setIsVoiceSessionOpen] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceOutputEnabled, setVoiceOutputEnabled] = useState(false);
  const [voicePersona, setVoicePersona] = useState<VoicePersona>('female');
  const [speechSupported, setSpeechSupported] = useState(false);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [awaitingVoiceContinue, setAwaitingVoiceContinue] = useState(false);
  const [requiresManualVoiceTurn, setRequiresManualVoiceTurn] = useState(false);
  const [voiceStatusMessage, setVoiceStatusMessage] = useState<string | null>(null);
  const initialWidgetPlacement = useRef(readInitialWidgetPlacement());
  const [widgetPosition, setWidgetPosition] = useState<WidgetPosition>(
    () => initialWidgetPlacement.current.position
  );
  const [edgeAttachment, setEdgeAttachment] = useState<WidgetEdgeAttachment>(
    () => initialWidgetPlacement.current.edgeAttachment
  );
  const [isPlacementTransitionEnabled, setIsPlacementTransitionEnabled] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const placementTransitionEnableTimeoutRef = useRef<number | null>(null);
  const [isDockDialogOpen, setIsDockDialogOpen] = useState(false);
  const isAiAssistantInSidebar = useUIStore((state) => state.isAiAssistantInSidebar);
  const setAiAssistantInSidebar = useUIStore((state) => state.setAiAssistantInSidebar);
  const isAiAssistantWidgetVisible = useUIStore((state) => state.isAiAssistantWidgetVisible);
  const setAiAssistantWidgetVisible = useUIStore((state) => state.setAiAssistantWidgetVisible);
  const [sessionKey, setSessionKey] = useState<string>(() => readAssistantSessionKey());
  const [languagePreference, setLanguagePreference] = useState<AiAssistantLanguagePreference>(() =>
    readAiAssistantLanguagePreference()
  );
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const sendButtonRef = useRef<HTMLButtonElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const widgetContainerRef = useRef<HTMLDivElement | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const isListeningRef = useRef(false);
  const isOpenRef = useRef(isOpen);
  const isVoiceSessionOpenRef = useRef(isVoiceSessionOpen);
  const requiresManualVoiceTurnRef = useRef(false);
  const isAssistantBusyRef = useRef(false);
  const askQuestionRef = useRef<(value: string, errorContext?: AiAssistantErrorContext | null) => Promise<void>>(
    async () => undefined
  );
  const latestTranscriptRef = useRef('');
  const voiceTimeoutRef = useRef<number | null>(null);
  const voiceFinalFallbackRef = useRef<number | null>(null);
  const lastSpokenAnswerRef = useRef('');
  const panelSizeRef = useRef({ width: widgetDefaultWidth, height: widgetDefaultHeight });
  const widgetPositionRef = useRef(widgetPosition);
  const edgeAttachmentRef = useRef(edgeAttachment);
  const edgeClosedAnchorYRef = useRef<number | null>(initialWidgetPlacement.current.position.y);
  const dragStateRef = useRef<DragState | null>(null);
  const contentBounds = useAiAssistantWidgetBounds();
  const contentBoundsRef = useRef(contentBounds);
  widgetPositionRef.current = widgetPosition;
  edgeAttachmentRef.current = edgeAttachment;
  contentBoundsRef.current = contentBounds;
  const loadedChatHistoryKeyRef = useRef(chatHistoryKey);
  const skipNextHistoryWriteRef = useRef(false);
  const readText = useCallback((key: string, fallback?: string, options?: Record<string, unknown>): string => {
    const value = t(key, { defaultValue: fallback ?? aiAssistantTextFallbacks[key] ?? key, ...options });
    if (!value || value === key || value === missingTranslationText) {
      return fallback ?? aiAssistantTextFallbacks[key] ?? key;
    }

    return value;
  }, [t]);

  const changeLanguagePreference = (nextLanguagePreference: AiAssistantLanguagePreference): void => {
    setLanguagePreference(nextLanguagePreference);
    writeAiAssistantLanguagePreference(nextLanguagePreference);
  };

  const resolveSpeechLanguage = useCallback((): string => {
    if (languagePreference === 'en') return 'en-US';
    return 'tr-TR';
  }, [languagePreference]);

  const cleanSpeechText = useCallback((value: string): string =>
    value
      .replace(/https?:\/\/\S+/g, '')
      .replace(/[#*_`>|-]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim(),
  []);

  const selectPreferredVoice = useCallback((persona = voicePersona): SpeechSynthesisVoice | null => {
    const languagePrefix = resolveSpeechLanguage().startsWith('en') ? 'en' : 'tr';
    const localizedVoices = availableVoices.filter((voice) =>
      voice.lang.toLowerCase().startsWith(languagePrefix)
    );
    const femaleSignals = /female|woman|zira|seda|yelda|aylin|filiz|elif|google türkçe|google turkce/i;
    const maleSignals = /male|man|cem|tolga|murat|kaan|ahmet|mehmet|emre|erkek/i;
    const personaSignals = persona === 'female' ? femaleSignals : maleSignals;

    return (
      localizedVoices.find((voice) => personaSignals.test(voice.name)) ??
      localizedVoices[persona === 'male' ? 1 : 0] ??
      localizedVoices[0] ??
      availableVoices.find((voice) => voice.default) ??
      null
    );
  }, [availableVoices, resolveSpeechLanguage, voicePersona]);

  const getVoiceProfile = useCallback((persona = voicePersona): { pitch: number; rate: number } => {
    if (persona === 'male') {
      return { pitch: 0.72, rate: 0.92 };
    }

    return { pitch: 1.06, rate: 0.98 };
  }, [voicePersona]);

  const clearVoiceTimers = useCallback((): void => {
    if (voiceTimeoutRef.current !== null) {
      window.clearTimeout(voiceTimeoutRef.current);
      voiceTimeoutRef.current = null;
    }

    if (voiceFinalFallbackRef.current !== null) {
      window.clearTimeout(voiceFinalFallbackRef.current);
      voiceFinalFallbackRef.current = null;
    }
  }, []);

  const stopListening = useCallback((): void => {
    clearVoiceTimers();
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    latestTranscriptRef.current = '';
    isListeningRef.current = false;
    setIsListening(false);
  }, [clearVoiceTimers]);

  const stopSpeaking = useCallback((): void => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
  }, []);

  const startVoiceListening = useCallback((): void => {
    const SpeechRecognition = (window as SpeechWindow).SpeechRecognition || (window as SpeechWindow).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setVoiceStatusMessage(readText('voiceUnsupported'));
      return;
    }

    if (isListeningRef.current || isAssistantBusyRef.current) return;

    clearVoiceTimers();
    stopSpeaking();
    setAwaitingVoiceContinue(false);
    setVoiceStatusMessage(null);
    latestTranscriptRef.current = '';

    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    recognition.lang = resolveSpeechLanguage();
    recognition.continuous = false;
    recognition.interimResults = true;

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let transcript = '';
      let finalTranscript = '';

      for (let index = 0; index < event.results.length; index += 1) {
        const result = event.results[index];
        transcript += result[0].transcript;
        if (result.isFinal) {
          finalTranscript += result[0].transcript;
        }
      }

      const nextQuestion = transcript.trim();
      latestTranscriptRef.current = nextQuestion;
      setQuestion(nextQuestion);

      if (finalTranscript.trim()) {
        stopListening();
        void askQuestionRef.current(finalTranscript.trim());
        return;
      }

      if (nextQuestion) {
        if (voiceFinalFallbackRef.current !== null) {
          window.clearTimeout(voiceFinalFallbackRef.current);
        }

        voiceFinalFallbackRef.current = window.setTimeout(() => {
          const stableTranscript = latestTranscriptRef.current.trim();
          stopListening();
          if (stableTranscript) {
            void askQuestionRef.current(stableTranscript);
          }
        }, 1400);
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      setVoiceStatusMessage(event.error === 'not-allowed' ? readText('voiceUnsupported') : null);
      stopListening();
    };

    recognition.onend = () => {
      clearVoiceTimers();
      isListeningRef.current = false;
      setIsListening(false);
    };

    try {
      isListeningRef.current = true;
      setIsListening(true);
      recognition.start();
      voiceTimeoutRef.current = window.setTimeout(() => {
        const stableTranscript = latestTranscriptRef.current.trim();
        stopListening();
        if (stableTranscript) {
          void askQuestionRef.current(stableTranscript);
        }
      }, 12000);
    } catch {
      stopListening();
      setVoiceStatusMessage(readText('voiceUnsupported'));
    }
  }, [clearVoiceTimers, readText, resolveSpeechLanguage, stopListening, stopSpeaking]);

  const finishVoiceTurn = useCallback((): void => {
    setIsSpeaking(false);

    if (!isVoiceSessionOpenRef.current || !isOpenRef.current) return;

    if (requiresManualVoiceTurnRef.current) {
      setAwaitingVoiceContinue(true);
      return;
    }

    window.setTimeout(() => startVoiceListening(), 250);
  }, [startVoiceListening]);

  const speakAnswer = useCallback((value: string, persona = voicePersona, force = false): void => {
    if ((!voiceOutputEnabled && !force) || !('speechSynthesis' in window)) return;

    const cleaned = cleanSpeechText(value);
    if (!cleaned) return;

    stopListening();
    window.speechSynthesis.cancel();
    lastSpokenAnswerRef.current = value;

    const voiceProfile = getVoiceProfile(persona);
    const utterance = new SpeechSynthesisUtterance(cleaned);
    utterance.lang = resolveSpeechLanguage();
    utterance.rate = voiceProfile.rate;
    utterance.pitch = voiceProfile.pitch;
    utterance.voice = selectPreferredVoice(persona);
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = finishVoiceTurn;
    utterance.onerror = () => {
      setIsSpeaking(false);
      if (requiresManualVoiceTurnRef.current) {
        setAwaitingVoiceContinue(true);
      }
    };
    window.speechSynthesis.speak(utterance);
  }, [cleanSpeechText, finishVoiceTurn, getVoiceProfile, resolveSpeechLanguage, selectPreferredVoice, stopListening, voiceOutputEnabled, voicePersona]);

  useEffect(() => {
    if (loadedChatHistoryKeyRef.current !== chatHistoryKey) {
      skipNextHistoryWriteRef.current = true;
      loadedChatHistoryKeyRef.current = chatHistoryKey;
    }

    setMessages(readAiAssistantChatHistory(chatHistoryKey));
  }, [chatHistoryKey]);

  useEffect(() => {
    const SpeechRecognition = (window as SpeechWindow).SpeechRecognition || (window as SpeechWindow).webkitSpeechRecognition;
    setSpeechSupported(Boolean(SpeechRecognition && 'speechSynthesis' in window));

    const userAgent = window.navigator.userAgent;
    const isIos = /iPad|iPhone|iPod/.test(userAgent) || (userAgent.includes('Mac') && navigator.maxTouchPoints > 1);
    const isSafari = /^((?!chrome|android|crios|fxios|edgios).)*safari/i.test(userAgent);
    setRequiresManualVoiceTurn(isIos && isSafari);
  }, []);

  useEffect(() => {
    if (!('speechSynthesis' in window)) return;

    const loadVoices = (): void => setAvailableVoices(window.speechSynthesis.getVoices());
    loadVoices();
    window.speechSynthesis.addEventListener('voiceschanged', loadVoices);
    return () => window.speechSynthesis.removeEventListener('voiceschanged', loadVoices);
  }, []);

  useEffect(() => {
    isListeningRef.current = isListening;
  }, [isListening]);

  useEffect(() => {
    isOpenRef.current = isOpen;
  }, [isOpen]);

  useEffect(() => {
    isVoiceSessionOpenRef.current = isVoiceSessionOpen;
  }, [isVoiceSessionOpen]);

  useEffect(() => {
    requiresManualVoiceTurnRef.current = requiresManualVoiceTurn;
  }, [requiresManualVoiceTurn]);

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
  isAssistantBusyRef.current = isAssistantBusy;

  const schedulePlacementTransitionEnable = useCallback((delayMs = 200): void => {
    if (placementTransitionEnableTimeoutRef.current !== null) {
      window.clearTimeout(placementTransitionEnableTimeoutRef.current);
    }

    placementTransitionEnableTimeoutRef.current = window.setTimeout(() => {
      placementTransitionEnableTimeoutRef.current = null;
      setIsPlacementTransitionEnabled(true);
    }, delayMs);
  }, []);

  const suppressPlacementTransition = useCallback((): void => {
    if (placementTransitionEnableTimeoutRef.current !== null) {
      window.clearTimeout(placementTransitionEnableTimeoutRef.current);
      placementTransitionEnableTimeoutRef.current = null;
    }

    setIsPlacementTransitionEnabled(false);
  }, []);

  const applyBottomRightRailPlacement = useCallback((): void => {
    suppressPlacementTransition();
    const { position, edgeAttachment: nextEdgeAttachment } = createBottomRightRailPlacement();
    edgeAttachmentRef.current = nextEdgeAttachment;
    edgeClosedAnchorYRef.current = position.y;
    widgetPositionRef.current = position;
    setEdgeAttachment(nextEdgeAttachment);
    setWidgetPosition(position);
    writeWidgetPosition(position);
    writeEdgeAttachment(nextEdgeAttachment);
    setIsExpanded(false);
    setIsOpen(false);
    schedulePlacementTransitionEnable();
  }, [schedulePlacementTransitionEnable, suppressPlacementTransition]);

  useLayoutEffect(() => {
    if (!isAiAssistantWidgetVisible || location.pathname.startsWith('/ai-assistant')) {
      return;
    }

    if (!hasAiAssistantWidgetPlacementResetPending()) {
      return;
    }

    consumeAiAssistantWidgetPlacementResetOnShow();
    applyBottomRightRailPlacement();
  }, [applyBottomRightRailPlacement, isAiAssistantWidgetVisible, location.pathname]);

  useEffect(() => {
    suppressPlacementTransition();
    schedulePlacementTransitionEnable();

    return () => {
      if (placementTransitionEnableTimeoutRef.current !== null) {
        window.clearTimeout(placementTransitionEnableTimeoutRef.current);
        placementTransitionEnableTimeoutRef.current = null;
      }
    };
  }, [contentBounds, schedulePlacementTransitionEnable, suppressPlacementTransition]);

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

  useLayoutEffect(() => {
    const element = widgetContainerRef.current;
    if (!element || isDragging) return;

    const activeBounds = isOpen ? readViewportBounds() : contentBounds;
    const size = isOpen ? readWidgetPanelSize(element) : readClosedWidgetSize(element);
    panelSizeRef.current = size;

    setWidgetPosition((currentPosition) => {
      const positionSource =
        edgeAttachment !== 'none'
          ? resolveEdgePositionSource(
              currentPosition,
              edgeClosedAnchorYRef.current,
              isOpen,
              isExpanded
            )
          : currentPosition;

      const nextPosition = resolveDisplayPosition(
        positionSource,
        size,
        activeBounds,
        edgeAttachment,
        isOpen
      );

      if (!isOpen && edgeAttachment !== 'none') {
        edgeClosedAnchorYRef.current = nextPosition.y;
      }

      if (nextPosition.x === currentPosition.x && nextPosition.y === currentPosition.y) {
        return currentPosition;
      }

      widgetPositionRef.current = nextPosition;
      writeWidgetPosition(nextPosition);
      return nextPosition;
    });
  }, [contentBounds, isOpen, isExpanded, edgeAttachment, isDragging]);

  const openWidget = (): void => {
    if (edgeAttachmentRef.current !== 'none') {
      edgeClosedAnchorYRef.current = widgetPositionRef.current.y;
    }

    setIsOpen(true);
  };

  const startPanelDrag = useCallback((event: PointerEvent<HTMLElement>): void => {
    if (event.button !== 0) return;

    const target = event.target as HTMLElement;
    if (target.closest('[data-ai-drag-ignore="true"]')) {
      return;
    }

    const widgetElement = widgetContainerRef.current;
    if (!widgetElement) return;

    event.preventDefault();

    const rect = widgetElement.getBoundingClientRect();
    const logicalPosition = { x: rect.left, y: rect.top };

    if (edgeAttachmentRef.current !== 'none') {
      edgeAttachmentRef.current = 'none';
      setEdgeAttachment('none');
      widgetPositionRef.current = logicalPosition;
      setWidgetPosition(logicalPosition);
    }

    dragStateRef.current = {
      pointerId: event.pointerId,
      offsetX: event.clientX - rect.left,
      offsetY: event.clientY - rect.top,
      startClientX: event.clientX,
      startClientY: event.clientY,
      mode: 'panel',
      didActivate: false,
      edgeAttachmentStart: 'none',
    };
    setIsDragging(true);
  }, []);

  const startClosedDrag = useCallback((event: PointerEvent<HTMLButtonElement>): void => {
    if (event.button !== 0) return;

    const widgetElement = widgetContainerRef.current;
    if (!widgetElement) return;

    event.preventDefault();

    const rect = widgetElement.getBoundingClientRect();
    const edgeAttachmentStart = edgeAttachmentRef.current;

    dragStateRef.current = {
      pointerId: event.pointerId,
      offsetX: event.clientX - rect.left,
      offsetY: event.clientY - rect.top,
      startClientX: event.clientX,
      startClientY: event.clientY,
      mode: 'closed',
      didActivate: false,
      edgeAttachmentStart,
    };
    setIsDragging(true);
  }, []);

  useEffect(() => {
    if (!isDragging) return;

    const previousUserSelect = document.body.style.userSelect;
    const previousTouchAction = document.body.style.touchAction;
    document.body.style.userSelect = 'none';
    document.body.style.touchAction = 'none';

    const finishDrag = (event: globalThis.PointerEvent): void => {
      const dragState = dragStateRef.current;
      if (!dragState || dragState.pointerId !== event.pointerId) return;

      dragStateRef.current = null;
      setIsDragging(false);

      const element = widgetContainerRef.current;
      const activeBounds = isOpen ? readViewportBounds() : contentBoundsRef.current;

      if (dragState.mode === 'closed') {
        const movedDistance = Math.hypot(
          event.clientX - dragState.startClientX,
          event.clientY - dragState.startClientY
        );

        if (!dragState.didActivate && movedDistance < dragActivationThresholdPx) {
          openWidget();
          return;
        }
      }

      const size = isOpen ? readWidgetPanelSize(element) : readClosedWidgetSize(element);

      const resolved = resolveWidgetDragPosition(
        widgetPositionRef.current,
        size,
        activeBounds,
        {
          edgeAttachment: edgeAttachmentRef.current,
          isOpen,
          allowSnap: true,
        }
      );

      const logicalPosition =
        resolved.edgeAttachment === 'none'
          ? resolved.position
          : { x: resolved.position.x, y: resolved.position.y };

      edgeAttachmentRef.current = resolved.edgeAttachment;
      widgetPositionRef.current = logicalPosition;
      setEdgeAttachment(resolved.edgeAttachment);
      setWidgetPosition(logicalPosition);
      writeWidgetPosition(logicalPosition);
      writeEdgeAttachment(resolved.edgeAttachment);

      if (!isOpen && resolved.edgeAttachment !== 'none') {
        edgeClosedAnchorYRef.current = logicalPosition.y;
      }
    };

    const handlePointerMove = (event: globalThis.PointerEvent): void => {
      const dragState = dragStateRef.current;
      if (!dragState || dragState.pointerId !== event.pointerId) return;

      const movedDistance = Math.hypot(
        event.clientX - dragState.startClientX,
        event.clientY - dragState.startClientY
      );

      if (!dragState.didActivate && movedDistance >= dragActivationThresholdPx) {
        dragState.didActivate = true;
      }

      const rawPosition = {
        x: event.clientX - dragState.offsetX,
        y: event.clientY - dragState.offsetY,
      };

      if (dragState.mode === 'closed') {
        if (!dragState.didActivate) return;

        if (dragState.edgeAttachmentStart !== 'none') {
          edgeAttachmentRef.current = 'none';
          setEdgeAttachment('none');
        }

        const size = readClosedWidgetSize(widgetContainerRef.current);
        const nextPosition = clampToContentBounds(
          rawPosition,
          size,
          contentBoundsRef.current
        );
        widgetPositionRef.current = nextPosition;
        setWidgetPosition(nextPosition);
        return;
      }

      const size = readWidgetPanelSize(widgetContainerRef.current);
      const resolved = resolveWidgetDragPosition(rawPosition, size, readViewportBounds(), {
        edgeAttachment: edgeAttachmentRef.current,
        isOpen: true,
        allowSnap: dragState.didActivate,
      });

      const logicalPosition =
        resolved.edgeAttachment === 'none'
          ? resolved.position
          : { x: rawPosition.x, y: resolved.position.y };

      edgeAttachmentRef.current = resolved.edgeAttachment;
      widgetPositionRef.current = logicalPosition;
      setEdgeAttachment(resolved.edgeAttachment);
      setWidgetPosition(logicalPosition);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', finishDrag);
    window.addEventListener('pointercancel', finishDrag);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', finishDrag);
      window.removeEventListener('pointercancel', finishDrag);
      document.body.style.userSelect = previousUserSelect;
      document.body.style.touchAction = previousTouchAction;
    };
  }, [isDragging, isOpen]);

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
          context: result.context ?? null,
          intent: result.intent,
        },
      ]);
      speakAnswer(result.answer);
      setDynamicSuggestions(result.suggestedQuestions?.length ? result.suggestedQuestions : fallbackSuggestions);
      showReportDraftReadyToast(result, openActionUrl);
      setQuestion('');
      clearSelectedAttachment();
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
  askQuestionRef.current = askQuestion;

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

  const closeVoiceSession = (): void => {
    stopListening();
    stopSpeaking();
    setIsVoiceSessionOpen(false);
    setVoiceOutputEnabled(false);
    setAwaitingVoiceContinue(false);
    setVoiceStatusMessage(null);
  };

  const openVoiceSession = (): void => {
    setIsVoiceSessionOpen(true);
    setVoiceOutputEnabled(true);
    setAwaitingVoiceContinue(false);
    startVoiceListening();
  };

  const toggleVoiceSession = (): void => {
    if (isVoiceSessionOpen) {
      closeVoiceSession();
      return;
    }

    openVoiceSession();
  };

  const continueVoiceSession = (): void => {
    setAwaitingVoiceContinue(false);
    setIsVoiceSessionOpen(true);
    setVoiceOutputEnabled(true);
    startVoiceListening();
  };

  const changeVoicePersona = (persona: VoicePersona): void => {
    setVoicePersona(persona);
    if (isSpeaking && lastSpokenAnswerRef.current) {
      window.setTimeout(() => speakAnswer(lastSpokenAnswerRef.current, persona), 80);
    }
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
      setIsOpen(false);
    } catch (error) {
      window.alert(error instanceof Error ? error.message : readText('actionFailed'));
    } finally {
      if (toolActionId) setPendingToolActionId(null);
    }
  };

  const toggleExpanded = (): void => {
    const element = widgetContainerRef.current;
    const previousSize = readWidgetPanelSize(element);
    const nextExpanded = !isExpanded;
    const nextSize = getTargetPanelSize(nextExpanded, contentBounds);
    const edge = edgeAttachmentRef.current;

    setWidgetPosition((currentPosition) => {
      const activeBounds = readViewportBounds();
      const positionForLayout =
        edge !== 'none'
          ? resolveEdgePositionSource(
              currentPosition,
              edgeClosedAnchorYRef.current,
              true,
              nextExpanded
            )
          : currentPosition;
      const nextPosition =
        edge === 'right'
          ? getRightAlignedPosition(positionForLayout.y, nextSize, activeBounds)
          : edge === 'left'
            ? getLeftEdgeAttachedPosition(positionForLayout.y, nextSize, activeBounds)
            : clampToContentBounds(
                adjustWidgetPositionForSizeChange(currentPosition, previousSize, nextSize),
                nextSize,
                activeBounds
              );
      widgetPositionRef.current = nextPosition;
      writeWidgetPosition(nextPosition);
      return nextPosition;
    });
    panelSizeRef.current = nextSize;
    setIsExpanded(nextExpanded);
  };

  const dockWidgetToRail = (): void => {
    closeVoiceSession();
    applyBottomRightRailPlacement();
  };

  const handleDockDialogConfirm = (sidebarEnabled: boolean): void => {
    setAiAssistantInSidebar(sidebarEnabled);
    if (sidebarEnabled) {
      setAiAssistantWidgetVisible(false);
    }
    dockWidgetToRail();
  };

  const openDockDialog = (): void => {
    setIsDockDialogOpen(true);
  };

  const closeWidget = (): void => {
    closeVoiceSession();
    const widgetElement = widgetContainerRef.current;
    const panelSize = readWidgetPanelSize(widgetElement);
    const viewportBounds = readViewportBounds();
    const nextEdgeAttachment: WidgetEdgeAttachment =
      edgeAttachmentRef.current !== 'none'
        ? edgeAttachmentRef.current
        : isNearContentRightEdge(widgetPosition, panelSize, viewportBounds)
          ? 'right'
          : isNearSidebarRightEdge(widgetPosition)
            ? 'left'
            : 'none';
    const logicalPosition = {
      x: widgetPosition.x,
      y:
        nextEdgeAttachment !== 'none'
          ? edgeClosedAnchorYRef.current ?? widgetPosition.y
          : widgetPosition.y,
    };

    edgeAttachmentRef.current = nextEdgeAttachment;
    widgetPositionRef.current = logicalPosition;
    setEdgeAttachment(nextEdgeAttachment);
    setWidgetPosition(logicalPosition);
    writeWidgetPosition(logicalPosition);
    writeEdgeAttachment(nextEdgeAttachment);
    setIsExpanded(false);
    setIsActionsMenuOpen(false);
    setIsOpen(false);
  };

  useEffect(() => {
    if (!isOpen || isDragging || isDockDialogOpen) {
      return;
    }

    const handlePointerDown: EventListener = (event): void => {
      const target = event.target;
      if (!(target instanceof Node)) {
        return;
      }

      const widgetElement = widgetContainerRef.current;
      if (!widgetElement?.contains(target)) {
        const portalElement =
          target instanceof Element
            ? target.closest(
                '[data-slot="dialog-content"], [data-slot="dialog-overlay"], [data-sonner-toast], [data-sonner-toaster]'
              )
            : null;

        if (!portalElement) {
          closeWidget();
        }
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [isOpen, isDragging, isDockDialogOpen]);

  const copyAssistantMessage = async (message: AiAssistantChatMessage): Promise<void> => {
    await copyTextToClipboard(message.content);
    setCopiedMessageId(message.id);
    window.setTimeout(() => {
      setCopiedMessageId((current) => (current === message.id ? null : current));
    }, 1600);
  };

  const activeBounds = isOpen ? readViewportBounds() : contentBounds;
  const voiceSessionVisible = isVoiceSessionOpen || isListening || isSpeaking || awaitingVoiceContinue;
  const voiceStatusText = voiceStatusMessage ??
    (awaitingVoiceContinue
      ? readText('voiceContinueHint')
      : isSpeaking
        ? readText('voiceSpeaking')
        : isListening
          ? readText('voiceListening')
          : readText('voiceReady'));
  const displaySize = isOpen
    ? panelSizeRef.current
    : readClosedWidgetSize(widgetContainerRef.current);
  const displayPosition =
    !isDragging && edgeAttachment !== 'none'
      ? resolveDisplayPosition(
          resolveEdgePositionSource(
            widgetPosition,
            edgeClosedAnchorYRef.current,
            isOpen,
            isExpanded
          ),
          displaySize,
          activeBounds,
          edgeAttachment,
          isOpen
        )
      : clampToContentBounds(widgetPosition, displaySize, activeBounds);

  const closedRailClassName =
    edgeAttachment === 'left'
      ? 'rounded-e-3xl border-s-0 border-white/20'
      : edgeAttachment === 'right'
        ? 'rounded-s-3xl border-e-0 border-white/20'
        : 'rounded-3xl border-white/20';

  if (!isAiAssistantWidgetVisible || location.pathname.startsWith('/ai-assistant')) {
    return null;
  }

  return (
    <>
      <AiAssistantDockDialog
        open={isDockDialogOpen}
        sidebarEnabled={isAiAssistantInSidebar}
        onOpenChange={setIsDockDialogOpen}
        onConfirm={handleDockDialogConfirm}
      />
    <div
      ref={widgetContainerRef}
      className={`fixed print:hidden ${isOpen ? 'z-[60]' : 'z-50'} ${!isDragging && isPlacementTransitionEnabled ? 'transition-[left,top] duration-200 ease-out' : ''}`}
      style={{
        left: `${displayPosition.x}px`,
        top: `${displayPosition.y}px`,
      }}
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
        .ai-widget-scroll-area {
          scrollbar-gutter: stable;
          -webkit-overflow-scrolling: touch;
        }
        @keyframes crmAiVoiceBar {
          0%, 100% { transform: scaleY(0.55); opacity: 0.55; }
          50% { transform: scaleY(1.25); opacity: 1; }
        }
        @keyframes crmAiPulseRing {
          0% { transform: scale(1); opacity: 0.55; }
          70%, 100% { transform: scale(1.45); opacity: 0; }
        }
      `}</style>
      {isOpen ? (
        <section
          style={{ clipPath: cyberPanelClip }}
          className={`ai-widget-container relative flex min-h-0 max-h-[calc(100dvh-2rem)] w-[min(500px,calc(100dvw-2rem))] transition-[box-shadow,opacity] duration-300 ease-in-out flex-col overflow-hidden border border-primary/30 bg-background/98 shadow-2xl shadow-[0_24px_70px_-24px_var(--crm-brand-shadow)] backdrop-blur-2xl dark:border-primary/35 dark:bg-slate-950/98 ${isExpanded
          ? 'is-expanded w-[min(850px,calc(100dvw-2rem))] h-[min(92dvh,850px)]'
          : 'h-[min(80dvh,700px)]'
          }`}
        >
          <div className="pointer-events-none absolute inset-0 bg-[image:var(--crm-brand-gradient-soft)] opacity-35 dark:opacity-20" />
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.08]"
            style={{ backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 3px, rgb(236 0 122 / 45%) 3px, rgb(236 0 122 / 45%) 4px)' }}
          />
          <header
            className={`relative flex touch-none select-none items-center justify-between gap-3 border-b border-primary/20 bg-white/65 p-4 backdrop-blur-xl dark:border-primary/25 dark:bg-black/35 ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
            aria-label={readText('dragPanel')}
            onPointerDown={startPanelDrag}
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
                title={voiceOutputEnabled ? readText('voiceOutputOn') : readText('voiceOutputOff')}
                className={`h-10 w-10 rounded-2xl ${voiceOutputEnabled ? 'text-emerald-500 dark:text-emerald-300' : ''}`}
                aria-pressed={voiceOutputEnabled}
                onClick={() => {
                  const next = !voiceOutputEnabled;
                  setVoiceOutputEnabled(next);
                  if (!next) {
                    stopSpeaking();
                    setAwaitingVoiceContinue(false);
                  }
                }}
              >
                {voiceOutputEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                title={isVoiceSessionOpen ? readText('closeVoiceChat') : readText('voiceSessionTitle')}
                className={`h-10 w-10 rounded-2xl ${isVoiceSessionOpen ? 'text-emerald-500 dark:text-emerald-300' : ''}`}
                aria-pressed={isVoiceSessionOpen}
                onClick={toggleVoiceSession}
              >
                <Headphones size={18} />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                title={readText('dockPanel')}
                className="hidden h-10 w-10 rounded-2xl sm:inline-flex"
                aria-label={readText('dockPanel')}
                onClick={openDockDialog}
              >
                <ChevronsLeft size={18} />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="hidden h-10 w-10 rounded-2xl sm:inline-flex"
                aria-label={isExpanded ? readText('collapsePanel') : readText('expandPanel')}
                onClick={toggleExpanded}
              >
                {isExpanded ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-10 w-10 rounded-2xl"
                aria-label={readText('closeChat')}
                onClick={closeWidget}
              >
                <X size={18} />
              </Button>
            </div>
          </header>

          {voiceSessionVisible && (
            <div className="relative border-b border-primary/15 bg-primary/[0.04] px-4 py-3 dark:border-primary/20 dark:bg-primary/[0.05]">
              <div
                style={{ clipPath: cyberChipClip }}
                className="relative overflow-hidden border border-primary/25 bg-white/80 p-3 shadow-[0_0_24px_rgb(236_0_122_/_12%)] backdrop-blur-xl dark:bg-black/35"
              >
                <div
                  className="pointer-events-none absolute inset-0 opacity-20"
                  style={{ backgroundImage: 'linear-gradient(90deg, rgb(236 0 122 / 18%), transparent 38%, rgb(255 75 0 / 14%))' }}
                />
                <div className="relative flex items-start gap-3">
                  <div className="relative grid h-14 w-14 shrink-0 place-items-center">
                    <span
                      className={`absolute inset-0 border ${isListening ? 'border-emerald-400/60' : isSpeaking ? 'border-primary/60' : 'border-orange-400/50'}`}
                      style={{ clipPath: 'circle(50%)', animation: 'crmAiPulseRing 1.8s ease-out infinite' }}
                    />
                    <span
                      className={`absolute inset-2 border ${isListening ? 'border-emerald-400/45' : isSpeaking ? 'border-primary/45' : 'border-orange-400/35'}`}
                      style={{ clipPath: 'circle(50%)', animation: 'crmAiPulseRing 2.4s ease-out infinite' }}
                    />
                    <div
                      className="relative grid h-11 w-11 place-items-center border border-primary/30 bg-primary/10 text-primary"
                      style={{ clipPath: 'circle(50%)' }}
                    >
                      <Headphones size={20} />
                    </div>
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-[0.68rem] font-black uppercase tracking-[0.22em] text-primary">
                          {readText('voiceSessionTitle')}
                        </div>
                        <p className="mt-1 text-xs font-semibold leading-5 text-slate-600 dark:text-slate-300">
                          {readText('voiceSessionDescription')}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={closeVoiceSession}
                        className="shrink-0 border border-primary/25 bg-primary/10 px-2 py-1 text-[0.62rem] font-black uppercase tracking-wide text-primary transition hover:bg-primary/15"
                        style={{ clipPath: cyberChipClip }}
                      >
                        {readText('closeVoiceChat')}
                      </button>
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-2">
                      {(['female', 'male'] as VoicePersona[]).map((persona) => (
                        <button
                          key={persona}
                          type="button"
                          onClick={() => changeVoicePersona(persona)}
                          className={`border px-2 py-1.5 text-[0.68rem] font-black uppercase tracking-wide transition ${
                            voicePersona === persona
                              ? 'border-emerald-400 bg-emerald-400/10 text-emerald-600 dark:text-emerald-300'
                              : 'border-slate-200 bg-white/70 text-slate-500 hover:border-primary/30 hover:text-primary dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-300'
                          }`}
                          style={{ clipPath: cyberChipClip }}
                        >
                          {persona === 'female' ? readText('voiceFemale') : readText('voiceMale')}
                        </button>
                      ))}
                    </div>

                    <div className="mt-3 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          if (isListening) {
                            stopListening();
                            return;
                          }
                          if (awaitingVoiceContinue) {
                            continueVoiceSession();
                            return;
                          }
                          openVoiceSession();
                        }}
                        disabled={!speechSupported || isAssistantBusy}
                        className={`min-h-10 flex-1 border px-3 py-2 text-[0.68rem] font-black uppercase tracking-wide transition disabled:cursor-not-allowed disabled:opacity-55 ${
                          isListening
                            ? 'border-red-400 bg-red-500/10 text-red-500 dark:text-red-300'
                            : 'border-primary/40 bg-primary/10 text-primary hover:bg-primary/15'
                        }`}
                        style={{ clipPath: cyberChipClip }}
                        >
                          {isListening ? <MicOff size={14} className="me-1.5 inline" /> : <Mic size={14} className="me-1.5 inline" />}
                          {isListening
                            ? readText('stopVoiceChat')
                          : awaitingVoiceContinue
                            ? readText('voiceContinue')
                            : readText('startVoiceChat')}
                      </button>
                      <div className="flex h-10 items-end gap-1 px-1" aria-hidden="true">
                        {[0, 1, 2, 3, 4].map((bar) => (
                          <span
                            key={bar}
                            className={`w-1.5 ${isListening ? 'bg-emerald-400' : isSpeaking ? 'bg-primary' : 'bg-orange-400/70'}`}
                            style={{
                              transformOrigin: 'bottom',
                              height: `${12 + (bar % 3) * 7}px`,
                              animation: `crmAiVoiceBar ${0.9 + bar * 0.12}s ease-in-out infinite`,
                              animationDelay: `${bar * 80}ms`,
                            }}
                          />
                        ))}
                      </div>
                    </div>

                    <div className={`mt-2 flex items-center gap-2 text-[0.68rem] font-black uppercase tracking-[0.16em] ${
                      isListening ? 'text-emerald-500 dark:text-emerald-300' : isSpeaking ? 'text-primary' : 'text-orange-500 dark:text-orange-300'
                    }`}>
                      <span className="h-1.5 w-1.5 animate-pulse bg-current" />
                      {voiceStatusText}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div
            className="ai-widget-scroll-area relative min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-4 py-5 touch-pan-y"
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
                </div>
              </div>
            )}

            {messages.map((message) => (
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
                          headerAction={(
                            <div className="flex items-center gap-1">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 shrink-0 rounded-lg text-slate-500 hover:text-primary dark:text-slate-300"
                                onClick={() => {
                                  setVoiceOutputEnabled(true);
                                  speakAnswer(message.content, voicePersona, true);
                                }}
                              >
                                <Volume2 size={13} />
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-7 shrink-0 rounded-lg px-2 text-[0.68rem] font-black text-slate-500 hover:text-primary dark:text-slate-300"
                                onClick={() => void copyAssistantMessage(message)}
                              >
                                {copiedMessageId === message.id ? (
                                  <Check size={12} className="me-1" />
                                ) : (
                                  <Copy size={12} className="me-1" />
                                )}
                                {copiedMessageId === message.id ? readText('copied') : readText('copyAnswer')}
                              </Button>
                            </div>
                          )}
                        />
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
                              {(item.actionUrl || item.toolActionId) && (
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  disabled={Boolean(item.toolActionId && pendingToolActionId === item.toolActionId)}
                                  className="mt-3 h-8 rounded-xl bg-white/70 px-3 text-xs font-black dark:bg-white/10"
                                  onClick={() => void openActionUrl(
                                    item.actionUrl,
                                    item.toolActionId,
                                    item.confirmationRequired ?? Boolean(item.toolActionId)
                                  )}
                                >
                                  {item.actionUrl ? <ExternalLink size={13} className="me-1.5" /> : <Check size={13} className="me-1.5" />}
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

          <form className="relative border-t border-slate-200/80 bg-white/75 px-4 pb-3 pt-2 backdrop-blur-xl dark:border-white/10 dark:bg-black/30" onSubmit={handleSubmit}>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={(event) => void handleAttachmentChange(event)}
            />
            {selectedAttachment && (
              <div className="mb-2 flex min-w-0 max-w-full items-center gap-2 rounded-2xl border border-primary/30 bg-primary/10 px-3 py-2 text-xs font-black text-primary dark:text-primary-foreground">
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
              <div className="mb-2 flex min-w-0 max-w-full items-center gap-2 rounded-2xl border border-red-400/30 bg-red-500/10 px-3 py-2 text-xs font-black text-red-700 dark:text-red-100">
                <span className="min-w-0 truncate">{questionError || askMutation.error?.message}</span>
              </div>
            )}
            <div className="mb-1.5 grid grid-cols-[2fr_3fr] gap-2">
              <AiAssistantLastErrorButton
                latestErrorContext={latestErrorContext}
                isAssistantBusy={isAssistantBusy}
                onAskLatestError={askLatestError}
                fillHeight
                compact
              />
              <div className="flex min-w-0 items-center justify-between gap-2 rounded-2xl border border-slate-300 bg-slate-50/80 px-3 py-1 dark:border-white/20 dark:bg-white/[0.04]">
                <span className="shrink-0 text-[0.68rem] font-black uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  {readText('responseLanguage')}
                </span>
                <div className="flex min-w-[8.75rem] shrink-0 rounded-full border border-slate-300 bg-white p-0.5 dark:border-white/20 dark:bg-black/20">
                  {aiAssistantLanguageOptions.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      disabled={isAssistantBusy}
                      title={option.value === 'auto' ? readText('responseLanguageAuto') : option.label}
                      onClick={() => changeLanguagePreference(option.value)}
                      className={`inline-flex h-6 min-w-[2.5rem] flex-1 items-center justify-center rounded-full px-2 text-center text-[0.62rem] font-black uppercase transition ${languagePreference === option.value
                        ? 'border border-primary/40 bg-[image:var(--crm-brand-gradient)] text-white shadow-sm'
                        : 'border border-transparent text-slate-500 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/10'
                        } disabled:cursor-not-allowed disabled:opacity-60`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex flex-col rounded-[1.6rem] border border-slate-200 bg-white/90 shadow-sm dark:border-white/10 dark:bg-white/[0.06] overflow-hidden focus-within:ring-2 focus-within:ring-primary/25 dark:focus-within:ring-primary/20 transition-all duration-200">
              <div className="px-3 pt-2 pb-0.5">
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
              <div className="flex items-center justify-between gap-2 px-3 py-1 bg-slate-50/50 dark:bg-white/[0.02]">
                <div className="relative flex min-w-0 flex-1 items-center gap-2">
                  {isActionsMenuOpen && (
                    <div
                      className="absolute bottom-full start-0 z-20 mb-2 flex min-w-44 flex-col gap-1 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-xl animate-in fade-in slide-in-from-bottom-2 duration-200 dark:border-white/10 dark:bg-slate-900"
                      role="menu"
                    >
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={isAssistantBusy}
                        className="h-8 w-full justify-start rounded-xl px-2.5 text-xs font-black transition-colors hover:bg-accent dark:hover:bg-primary/10"
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
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    disabled={isAssistantBusy}
                    className={`h-8 w-8 shrink-0 rounded-full border transition-all duration-200 ${isActionsMenuOpen
                      ? 'rotate-45 border-primary/40 bg-accent text-primary dark:border-primary/30 dark:bg-primary/10 dark:text-primary'
                      : 'border-slate-200 hover:border-primary/30 dark:border-white/10 dark:hover:border-primary/30'
                      }`}
                    aria-expanded={isActionsMenuOpen}
                    onClick={() => setIsActionsMenuOpen(!isActionsMenuOpen)}
                  >
                    <Plus size={16} />
                  </Button>
                </div>
                <Button
                  ref={sendButtonRef}
                  type="submit"
                  size="sm"
                  disabled={isAssistantBusy || (!question.trim() && !selectedAttachment)}
                  className="h-8 shrink-0 rounded-full bg-[image:var(--crm-brand-gradient)] px-4 text-xs font-black text-white shadow-[0_10px_20px_-10px_var(--crm-brand-shadow)]"
                >
                  <SendHorizontal size={15} className="me-1.5" />
                  {isAssistantBusy ? readText('sending') : readText('send')}
                </Button>
              </div>
            </div>
          </form>
        </section>
      ) : (
        <button
          type="button"
          aria-label={readText('openFromRail')}
          title={readText('openFromRail')}
          onPointerDown={startClosedDrag}
          style={{ clipPath: cyberChipClip }}
          className={`group relative flex max-h-[70dvh] items-center gap-2 overflow-hidden border bg-[image:var(--crm-brand-gradient)] px-2.5 py-3 text-sm font-black text-white shadow-[0_10px_20px_-10px_var(--crm-brand-shadow)] transition hover:shadow-[0_14px_28px_-10px_var(--crm-brand-shadow)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 dark:ring-offset-slate-950 sm:px-3 sm:py-4 ${closedRailClassName} ${isDragging ? 'cursor-grabbing' : 'cursor-grab'} ${edgeAttachment === 'right' ? 'hover:translate-x-[-2px]' : edgeAttachment === 'left' ? 'hover:translate-x-[2px]' : 'hover:scale-[1.02]'}`}
        >
          <span className="pointer-events-none absolute inset-0 opacity-20" style={{ backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 3px, rgb(255 255 255 / 30%) 3px, rgb(255 255 255 / 30%) 4px)' }} />
          <span className="relative flex h-9 w-9 items-center justify-center rounded-2xl bg-white/20">
            <MessageCircle size={20} />
          </span>
          <span className="relative hidden max-w-20 text-start leading-4 sm:inline">{readText('dockedChat')}</span>
        </button>
      )}
    </div>
    </>
  );
}

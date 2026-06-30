import {
  forwardRef,
  useState,
  useEffect,
  useRef,
  useId,
  useLayoutEffect,
  useImperativeHandle,
  type ButtonHTMLAttributes,
} from 'react';
import { createPortal } from 'react-dom';
import { AlertCircle, Check, ChevronsUpDown, Loader2, Mic, MicOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useTranslation } from 'react-i18next';
import {
  DROPDOWN_DEBOUNCE_MS,
  DROPDOWN_MAX_HEIGHT_PX,
  DROPDOWN_MIN_CHARS,
  DROPDOWN_SCROLL_THRESHOLD,
} from '@/components/shared/dropdown/constants';
import { getIconPrefixPaddingStyle } from '@/lib/form-field-with-icon';
import { matchesSearchTerm } from '@/lib/search';

export interface ComboboxOption {
  value: string;
  label: string;
}

interface VoiceSearchComboboxProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'value' | 'onSelect' | 'disabled'> {
  options: ComboboxOption[];
  value?: string | null;
  onSelect: (value: string | null) => void;
  onDebouncedSearchChange?: (value: string) => void;
  onFetchNextPage?: () => void;
  hasNextPage?: boolean;
  isLoading?: boolean;
  isFetchingNextPage?: boolean;
  minChars?: number;
  placeholder?: string;
  searchPlaceholder?: string;
  className?: string;
  popoverContentClassName?: string;
  disabled?: boolean;
  modal?: boolean;
  disableToggleOff?: boolean;
}

export const VoiceSearchCombobox = forwardRef<HTMLButtonElement, VoiceSearchComboboxProps>(function VoiceSearchCombobox({
  options,
  value,
  onSelect,
  onDebouncedSearchChange,
  onFetchNextPage,
  hasNextPage = false,
  isLoading = false,
  isFetchingNextPage = false,
  minChars = DROPDOWN_MIN_CHARS,
  placeholder,
  searchPlaceholder,
  className,
  popoverContentClassName,
  disabled = false,
  modal: _modal = true,
  disableToggleOff = false,
  ...triggerProps
}, ref) {
  const { t, i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [pinnedSelection, setPinnedSelection] = useState<{ value: string; label: string } | null>(
    null
  );
  const [dropdownPosition, setDropdownPosition] = useState<{ top: number; left: number; width: number; openUpward: boolean } | null>(
    null
  );
  const rootRef = useRef<HTMLDivElement | null>(null);
  const triggerButtonRef = useRef<HTMLButtonElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const contentDomId = useId().replace(/:/g, '');

  useImperativeHandle(ref, () => triggerButtonRef.current as HTMLButtonElement, []);

  const [portalContainer, setPortalContainer] = useState<HTMLElement | null>(null);

  useLayoutEffect(() => {
    if (typeof document === 'undefined') return;
    if (open) {
      const parentDialog = rootRef.current?.closest('[role="dialog"]') as HTMLElement | null;
      setPortalContainer(parentDialog || document.body);
    } else {
      setPortalContainer(null);
    }
  }, [open]);

  const handleTriggerKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>): void => {
    if (disabled) {
      return;
    }
    if (open) {
      return;
    }
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      setOpen(true);
      return;
    }
    const isTypeaheadChar =
      event.key.length === 1 &&
      !event.ctrlKey &&
      !event.metaKey &&
      !event.altKey &&
      event.key.charCodeAt(0) >= 32 &&
      event.key !== ' ';
    if (isTypeaheadChar) {
      event.preventDefault();
      setSearchQuery(event.key);
      setOpen(true);
    }
  };

  useLayoutEffect(() => {
    if (!open || disabled) {
      return;
    }
    const updatePosition = (): void => {
      const trigger = triggerButtonRef.current;
      if (!trigger) {
        return;
      }

      const parentDialog = rootRef.current?.closest('[role="dialog"]') as HTMLElement | null;
      const container = parentDialog || document.body;

      const rect = trigger.getBoundingClientRect();
      const viewportH = window.innerHeight;
      const dropdownH = DROPDOWN_MAX_HEIGHT_PX + 56;
      const spaceBelow = viewportH - rect.bottom - 8;
      const spaceAbove = rect.top - 8;

      const openUpward = spaceBelow < dropdownH && spaceAbove > spaceBelow;

      let top = openUpward
        ? rect.top - dropdownH - 4
        : rect.bottom + 4;
      let left = rect.left;

      if (container !== document.body) {
        const containerRect = container.getBoundingClientRect();
        top = top - containerRect.top;
        left = left - containerRect.left;
      }

      const next = {
        top: container === document.body ? Math.max(8, top) : top,
        left: container === document.body 
          ? Math.max(8, Math.min(left, window.innerWidth - rect.width - 8))
          : left,
        width: rect.width,
        openUpward,
      };

      setDropdownPosition((previous) =>
        previous &&
          previous.top === next.top &&
          previous.left === next.left &&
          previous.width === next.width &&
          previous.openUpward === next.openUpward
          ? previous
          : next
      );
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);

    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [open, disabled]);

  useLayoutEffect(() => {
    if (!open || disabled || !dropdownPosition) {
      return;
    }
    window.requestAnimationFrame(() => {
      const root = document.getElementById(contentDomId);
      const input = root?.querySelector('[data-slot="command-input"]') as HTMLInputElement | null;
      if (!input) {
        return;
      }
      input.focus();
      const len = input.value.length;
      input.setSelectionRange(len, len);
    });
  }, [open, disabled, dropdownPosition, contentDomId]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition =
        (window as Window & { webkitSpeechRecognition?: new () => SpeechRecognition }).SpeechRecognition ||
        (window as Window & { webkitSpeechRecognition?: new () => SpeechRecognition }).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;

        const langMap: Record<string, string> = {
          'tr': 'tr-TR',
          'en': 'en-US',
          'de': 'de-DE',
          'fr': 'fr-FR'
        };
        recognition.lang = langMap[i18n.language] || 'tr-TR';

        recognition.onresult = (event: SpeechRecognitionEvent) => {
          const transcript = event.results[0][0].transcript;
          setSearchQuery(transcript);
          setIsListening(false);
        };

        recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
          console.error('Speech recognition error', event.error);
          setIsListening(false);
          if (event.error === 'not-allowed') {
            toast.error(t('common.voiceSearchPermissionDenied'));
          } else if (event.error === 'no-speech') {
            void 0;
          } else {
            toast.error(t('common.voiceSearchError'));
          }
        };

        recognition.onend = () => {
          setIsListening(false);
        };

        recognitionRef.current = recognition;
      }
    }
  }, [i18n.language, t]);

  const handleVoiceSearch = (e: React.MouseEvent): void => {
    e.preventDefault();
    e.stopPropagation();

    if (!recognitionRef.current) {
      toast.error(t('common.voiceSearchNotSupported'));
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (error) {
        console.error('Speech recognition start error', error);
        setIsListening(false);
      }
    }
  };

  useEffect(() => {
    if (!open) {
      setSearchQuery('');
      setIsListening(false);
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    }
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const handlePointerDown = (event: PointerEvent): void => {
      const target = event.target as Node | null;
      if (target && rootRef.current?.contains(target)) {
        return;
      }
      if (target && contentRef.current?.contains(target)) {
        return;
      }
      setOpen(false);
    };

    document.addEventListener('pointerdown', handlePointerDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
    };
  }, [open]);

  useEffect(() => {
    if (!onDebouncedSearchChange) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      onDebouncedSearchChange(searchQuery);
    }, DROPDOWN_DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [onDebouncedSearchChange, searchQuery]);

  useEffect(() => {
    if (!value) {
      setPinnedSelection((previous) => (previous === null ? previous : null));
      return;
    }

    const match = options.find((option) => option.value === value);
    if (match) {
      setPinnedSelection((previous) =>
        previous?.value === value && previous.label === match.label
          ? previous
          : { value, label: match.label }
      );
      return;
    }

    setPinnedSelection((previous) => (previous?.value === value ? previous : null));
  }, [value, options]);

  const isAsyncMode = Boolean(onDebouncedSearchChange);
  const isDropdownBusy = isLoading || isFetchingNextPage;
  const trimmedSearchQuery = searchQuery.trim();
  const isThresholdMode = isAsyncMode && trimmedSearchQuery.length > 0 && trimmedSearchQuery.length < minChars;
  const minCharsHint = t('common.dropdown.minCharsHint', {
    count: minChars,
    defaultValue: `Minimum ${minChars} characters`,
  });

  const handleListScroll = (event: React.UIEvent<HTMLDivElement>): void => {
    if (!onFetchNextPage || !hasNextPage || isFetchingNextPage) {
      return;
    }

    const target = event.currentTarget;
    if (target.scrollHeight <= 0) {
      return;
    }

    const scrollProgress = (target.scrollTop + target.clientHeight) / target.scrollHeight;
    if (scrollProgress >= DROPDOWN_SCROLL_THRESHOLD) {
      void onFetchNextPage();
    }
  };

  const selectedLabel = value
    ? (options.find((option) => option.value === value)?.label ??
      (pinnedSelection?.value === value ? pinnedSelection.label : null))
    : null;
  const listMinHeight = options.length > 0 || isFetchingNextPage ? DROPDOWN_MAX_HEIGHT_PX : undefined;

  const handleOptionSelect = (option: ComboboxOption): void => {
    let nextValue: string | null = null;
    if (option.value === value) {
      nextValue = disableToggleOff ? value : null;
    } else {
      nextValue = option.value;
    }

    if (nextValue) {
      setPinnedSelection({ value: nextValue, label: option.label });
    } else {
      setPinnedSelection(null);
    }
    onSelect(nextValue);
    setOpen(false);
  };

  const iconPrefixStyle = getIconPrefixPaddingStyle(className);

  return (
    <div ref={rootRef} className="relative w-full">
      <button
        {...triggerProps}
        ref={triggerButtonRef}
        type="button"
        role="combobox"
        aria-expanded={open}
        aria-controls={open ? contentDomId : undefined}
        onClick={() => {
          if (!disabled) setOpen((current) => !current);
        }}
        onKeyDown={handleTriggerKeyDown}
        className={cn(
          "inline-flex h-9 items-center rounded-md border bg-background shadow-xs transition-all hover:bg-accent hover:text-accent-foreground dark:bg-input/30 dark:border-input dark:hover:bg-input/50",
          "w-full justify-between px-3 text-left text-sm font-normal outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
          "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 [&>.truncate]:min-w-0 [&>.truncate]:overflow-hidden",
          !value && "text-muted-foreground",
          className
        )}
        style={iconPrefixStyle}
        disabled={disabled}
      >
        <span className="truncate flex-1 min-w-0 text-left">
          {selectedLabel || placeholder || t('common.select')}
        </span>
        {isDropdownBusy ? (
          <Loader2 className="ml-2 h-4 w-4 shrink-0 animate-spin text-[var(--crm-brand-text)]" />
        ) : (
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        )}
      </button>
      {open && dropdownPosition && portalContainer ? createPortal(
        <div
          ref={contentRef}
          id={contentDomId}
          onPointerDown={(e) => {
            e.stopPropagation();
            if (e.nativeEvent) {
              e.nativeEvent.stopImmediatePropagation();
            }
          }}
          onWheel={(e) => {
            e.stopPropagation();
            if (e.nativeEvent) {
              e.nativeEvent.stopImmediatePropagation();
            }
          }}
          onTouchMove={(e) => {
            e.stopPropagation();
            if (e.nativeEvent) {
              e.nativeEvent.stopImmediatePropagation();
            }
          }}
          className={cn(
            "overflow-hidden rounded-2xl border border-slate-300 bg-white p-0 shadow-[0_1px_0_rgba(15,23,42,0.05),0_16px_32px_-18px_rgba(15,23,42,0.45)] ring-1 ring-slate-200/70 dark:border-white/14 dark:bg-[#130822] dark:ring-white/10",
            popoverContentClassName
          )}
          style={{
            position: 'fixed',
            top: dropdownPosition.top,
            left: dropdownPosition.left,
            width: dropdownPosition.width,
            zIndex: 1000,
            pointerEvents: 'auto',
          }}
        >
          <Command
            className="bg-transparent"
            shouldFilter={!isAsyncMode}
            filter={(itemValue, search) => (matchesSearchTerm(search, [itemValue]) ? 1 : 0)}
          >
            <CommandInput
              placeholder={searchPlaceholder || t('common.search')}
              value={searchQuery}
              onValueChange={setSearchQuery}
              className="border-b border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-transparent"
            >
              {isThresholdMode ? (
                <Tooltip>
                  <TooltipTrigger
                    type="button"
                    aria-label={minCharsHint}
                    className="h-8 w-8 mr-1 inline-flex items-center justify-center rounded-lg text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/30"
                  >
                    <AlertCircle className="h-4 w-4" />
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    {minCharsHint}
                  </TooltipContent>
                </Tooltip>
              ) : null}
              {recognitionRef.current && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "h-8 w-8 mr-1 shrink-0 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5",
                    isListening && "text-rose-500 animate-pulse bg-rose-50 dark:bg-rose-900/20"
                  )}
                  onClick={handleVoiceSearch}
                  title={t('common.voiceSearch')}
                >
                  {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                </Button>
              )}
            </CommandInput>
            <CommandList
              onScroll={handleListScroll}
              className="custom-scrollbar space-y-1 p-2"
              style={{
                minHeight: listMinHeight,
                maxHeight: DROPDOWN_MAX_HEIGHT_PX,
                overflowY: 'auto',
                overscrollBehavior: 'contain',
              }}
            >
              {!isLoading ? (
                <CommandEmpty className="py-6 text-center text-sm text-slate-500 dark:text-slate-400">
                  {isThresholdMode ? minCharsHint : t('common.noResults')}
                </CommandEmpty>
              ) : null}
              {isLoading ? (
                <div className="flex min-h-28 items-center justify-center py-6 text-sm text-slate-500 dark:text-slate-400">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('common.loading')}
                </div>
              ) : (
                <CommandGroup>
                  {options.map((option) => (
                    <CommandItem
                      key={option.value}
                      value={`${option.label} ${option.value}`}
                      onSelect={() => handleOptionSelect(option)}
                      className="cursor-pointer rounded-xl border border-transparent px-3 py-2.5 shadow-sm transition-all hover:border-slate-200 hover:bg-slate-50 data-[selected=true]:border-rose-200 data-[selected=true]:bg-rose-50 data-[selected=true]:text-slate-900 dark:hover:border-white/12 dark:hover:bg-white/8 dark:data-[selected=true]:border-rose-400/35 dark:data-[selected=true]:bg-rose-950/25 dark:data-[selected=true]:text-white"
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4 text-rose-500",
                          value === option.value ? "opacity-100" : "opacity-0"
                        )}
                      />
                      {option.label}
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
              {isFetchingNextPage ? (
                <div className="flex items-center justify-center py-2 text-xs text-slate-500 dark:text-slate-400">
                  <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                  {t('common.loading')}
                </div>
              ) : null}
            </CommandList>
          </Command>
        </div>,
        portalContainer
      ) : null}
    </div>
  );
});

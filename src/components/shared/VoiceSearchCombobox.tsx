import { useState, useEffect, useRef } from 'react';
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useTranslation } from 'react-i18next';
import {
  DROPDOWN_DEBOUNCE_MS,
  DROPDOWN_MAX_HEIGHT_PX,
  DROPDOWN_MIN_CHARS,
  DROPDOWN_SCROLL_THRESHOLD,
} from '@/components/shared/dropdown/constants';
import { getIconPrefixPaddingStyle } from '@/lib/form-field-with-icon';

export interface ComboboxOption {
  value: string;
  label: string;
}

interface VoiceSearchComboboxProps {
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
  disabled?: boolean;
  modal?: boolean;
}

export function VoiceSearchCombobox({
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
  disabled = false,
  modal = true,
}: VoiceSearchComboboxProps) {
  const { t, i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

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

  const isAsyncMode = Boolean(onDebouncedSearchChange);
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
    ? options.find((option) => option.value === value)?.label 
    : null;

  const iconPrefixStyle = getIconPrefixPaddingStyle(className);

  return (
    <Popover open={open} onOpenChange={setOpen} modal={modal}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "w-full justify-between px-3 text-left font-normal [&>.truncate]:min-w-0 [&>.truncate]:overflow-hidden",
            !value && "text-muted-foreground",
            className
          )}
          style={iconPrefixStyle}
          disabled={disabled}
        >
          <span className="truncate flex-1 min-w-0 text-left">
            {selectedLabel || placeholder || t('common.select')}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] overflow-hidden rounded-2xl border border-slate-300 bg-white p-0 shadow-[0_1px_0_rgba(15,23,42,0.05),0_16px_32px_-18px_rgba(15,23,42,0.45)] ring-1 ring-slate-200/70 dark:border-white/14 dark:bg-[#130822] dark:ring-white/10" align="start">
        <Command className="bg-transparent" shouldFilter={!isAsyncMode}>
          <CommandInput 
            placeholder={searchPlaceholder || t('common.search')} 
            value={searchQuery}
            onValueChange={setSearchQuery}
            className="border-b border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-transparent"
          >
             {isThresholdMode ? (
               <Tooltip>
                 <TooltipTrigger asChild>
                   <button
                     type="button"
                     aria-label={minCharsHint}
                     className="h-8 w-8 mr-1 inline-flex items-center justify-center rounded-lg text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/30"
                   >
                     <AlertCircle className="h-4 w-4" />
                   </button>
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
                   isListening && "text-pink-500 animate-pulse bg-pink-50 dark:bg-pink-900/20"
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
            style={{ minHeight: DROPDOWN_MAX_HEIGHT_PX, maxHeight: DROPDOWN_MAX_HEIGHT_PX, overflowY: 'auto', overscrollBehavior: 'contain' }}
          >
            <CommandEmpty className="py-6 text-center text-sm text-slate-500 dark:text-slate-400">
              {isThresholdMode ? minCharsHint : t('common.noResults')}
            </CommandEmpty>
            {isLoading ? (
              <div className="flex items-center justify-center py-6 text-sm text-slate-500 dark:text-slate-400">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t('common.loading')}
              </div>
            ) : (
              <CommandGroup>
                {options.map((option) => (
                  <CommandItem
                    key={option.value}
                    value={option.label}
                    onSelect={() => {
                      onSelect(option.value === value ? null : option.value)
                      setOpen(false)
                    }}
                    className="cursor-pointer rounded-xl border border-transparent px-3 py-2.5 shadow-sm transition-all hover:border-slate-200 hover:bg-slate-50 data-[selected=true]:border-pink-200 data-[selected=true]:bg-pink-50 data-[selected=true]:text-slate-900 dark:hover:border-white/12 dark:hover:bg-white/8 dark:data-[selected=true]:border-pink-400/35 dark:data-[selected=true]:bg-pink-900/25 dark:data-[selected=true]:text-white"
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4 text-pink-500",
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
      </PopoverContent>
    </Popover>
  );
}

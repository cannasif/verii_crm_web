import { type KeyboardEvent, type ReactElement, useEffect, useMemo, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ParsedRecipients {
  valid: string[];
  invalid: string[];
}

export interface RecipientOption {
  email: string;
  label: string;
  description?: string;
}

function tokenizeRecipientInput(raw: string): string[] {
  return raw
    .split(/[;,\n\r]+/)
    .map((item) => item.trim())
    .filter(Boolean)
    .filter((item, index, array) => array.findIndex((entry) => entry.toLowerCase() === item.toLowerCase()) === index);
}

export function parseRecipientInput(raw: string): ParsedRecipients {
  if (!raw.trim()) {
    return { valid: [], invalid: [] };
  }

  const uniqueValues = tokenizeRecipientInput(raw);
  const valid: string[] = [];
  const invalid: string[] = [];
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;

  uniqueValues.forEach((value) => {
    if (emailRegex.test(value)) {
      valid.push(value);
    } else {
      invalid.push(value);
    }
  });

  return { valid, invalid };
}

export function appendRecipient(raw: string, email: string): string {
  const parsed = parseRecipientInput(raw);
  if (parsed.valid.some((item) => item.toLowerCase() === email.toLowerCase())) {
    return raw;
  }

  return [...parsed.valid, ...parsed.invalid, email]
    .filter((item, index, array) => array.findIndex((entry) => entry.toLowerCase() === item.toLowerCase()) === index)
    .join('; ');
}

export function appendRecipients(raw: string, emails: string[]): string {
  return emails.reduce((current, email) => appendRecipient(current, email), raw);
}

interface RecipientTokenFieldProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  suggestions?: RecipientOption[];
  invalidValues?: string[];
  className?: string;
}

export function RecipientTokenField({
  id,
  value,
  onChange,
  placeholder,
  suggestions = [],
  invalidValues = [],
  className,
}: RecipientTokenFieldProps): ReactElement {
  const [draft, setDraft] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const blurTimeoutRef = useRef<number | null>(null);

  const parsed = useMemo(() => parseRecipientInput(value), [value]);
  const tokens = useMemo(() => [...parsed.valid, ...parsed.invalid], [parsed.valid, parsed.invalid]);
  const tokenSet = useMemo(() => new Set(tokens.map((item) => item.toLowerCase())), [tokens]);

  const filteredSuggestions = useMemo(() => {
    const normalizedDraft = draft.trim().toLowerCase();

    return suggestions
      .filter((item, index, array) => array.findIndex((entry) => entry.email.toLowerCase() === item.email.toLowerCase()) === index)
      .filter((item) => !tokenSet.has(item.email.toLowerCase()))
      .filter((item) => {
        if (!normalizedDraft) return true;
        return (
          item.email.toLowerCase().includes(normalizedDraft) ||
          item.label.toLowerCase().includes(normalizedDraft) ||
          item.description?.toLowerCase().includes(normalizedDraft)
        );
      })
      .slice(0, 8);
  }, [draft, suggestions, tokenSet]);

  useEffect(() => {
    return () => {
      if (blurTimeoutRef.current) {
        window.clearTimeout(blurTimeoutRef.current);
      }
    };
  }, []);

  const commitDraft = (raw: string): void => {
    const incomingTokens = tokenizeRecipientInput(raw);
    if (incomingTokens.length === 0) {
      setDraft('');
      return;
    }

    const merged = [...tokens, ...incomingTokens].filter(
      (item, index, array) => array.findIndex((entry) => entry.toLowerCase() === item.toLowerCase()) === index
    );
    onChange(merged.join('; '));
    setDraft('');
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>): void => {
    if (event.key === 'Enter' || event.key === ',' || event.key === ';' || event.key === 'Tab') {
      if (draft.trim()) {
        event.preventDefault();
        commitDraft(draft);
      }
      return;
    }

    if (event.key === 'Backspace' && !draft && tokens.length > 0) {
      event.preventDefault();
      onChange(tokens.slice(0, -1).join('; '));
    }
  };

  const handleRemoveToken = (token: string): void => {
    onChange(tokens.filter((item) => item.toLowerCase() !== token.toLowerCase()).join('; '));
  };

  const openSuggestions = isFocused && filteredSuggestions.length > 0;

  return (
    <div className={cn('space-y-2', className)}>
      <div className="relative">
        <div
          className={cn(
            'flex min-h-[40px] flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm shadow-sm transition-colors',
            'dark:border-white/10 dark:bg-transparent',
            isFocused && 'border-sky-500 ring-2 ring-sky-500/20'
          )}
        >
          {tokens.map((token) => {
            const isInvalid = invalidValues.some((item) => item.toLowerCase() === token.toLowerCase());

            return (
              <span
                key={token}
                className={cn(
                  'inline-flex max-w-full items-center gap-1 rounded-full border px-2 py-1 text-xs font-medium',
                  isInvalid
                    ? 'border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-700/60 dark:bg-rose-950/30 dark:text-rose-300'
                    : 'border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-800/50 dark:bg-sky-950/30 dark:text-sky-300'
                )}
              >
                <span className="max-w-[220px] truncate">{token}</span>
                <button
                  type="button"
                  className="rounded-full p-0.5 transition-colors hover:bg-black/5 dark:hover:bg-white/10"
                  onClick={() => handleRemoveToken(token)}
                  aria-label={`${token} kaldir`}
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            );
          })}

          <input
            id={id}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => {
              if (blurTimeoutRef.current) {
                window.clearTimeout(blurTimeoutRef.current);
              }
              setIsFocused(true);
            }}
            onBlur={() => {
              blurTimeoutRef.current = window.setTimeout(() => {
                commitDraft(draft);
                setIsFocused(false);
              }, 120);
            }}
            placeholder={tokens.length === 0 ? placeholder : ''}
            className="min-w-[180px] flex-1 border-0 bg-transparent p-0 text-sm outline-none placeholder:text-slate-400 dark:placeholder:text-slate-500"
          />
        </div>

        {openSuggestions && (
          <div className="absolute z-30 mt-2 w-full rounded-lg border border-slate-200 bg-white p-1 shadow-xl dark:border-white/10 dark:bg-slate-950">
            {filteredSuggestions.map((option) => (
              <button
                key={option.email}
                type="button"
                className="flex w-full items-center justify-between gap-3 rounded-md px-3 py-2 text-left transition-colors hover:bg-slate-50 dark:hover:bg-white/6"
                onMouseDown={(event) => {
                  event.preventDefault();
                  commitDraft(option.email);
                }}
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-200">{option.label}</p>
                  <p className="truncate text-xs text-slate-400">{option.email}</p>
                </div>
                {option.description ? (
                  <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500 dark:bg-white/8 dark:text-slate-400">
                    {option.description}
                  </span>
                ) : null}
              </button>
            ))}
          </div>
        )}
      </div>

      {invalidValues.length > 0 && (
        <p className="text-xs text-rose-600 dark:text-rose-400">
          {invalidValues.join(', ')}
        </p>
      )}
    </div>
  );
}

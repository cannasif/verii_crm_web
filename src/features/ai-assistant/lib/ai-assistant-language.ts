import type { AiAssistantLanguagePreference } from '../types/ai-assistant.types';

export const aiAssistantLanguagePreferenceStorageKey = 'crm-ai-assistant-language-preference';

export const aiAssistantLanguageOptions: Array<{
  value: AiAssistantLanguagePreference;
  label: string;
}> = [
  { value: 'auto', label: 'Auto' },
  { value: 'tr', label: 'TR' },
  { value: 'en', label: 'EN' },
  { value: 'de', label: 'DE' },
  { value: 'fr', label: 'FR' },
  { value: 'es', label: 'ES' },
  { value: 'it', label: 'IT' },
  { value: 'ar', label: 'AR' },
];

const aiAssistantLanguageValues = new Set<AiAssistantLanguagePreference>(
  aiAssistantLanguageOptions.map((option) => option.value)
);

export function isAiAssistantLanguagePreference(value: string): value is AiAssistantLanguagePreference {
  return aiAssistantLanguageValues.has(value as AiAssistantLanguagePreference);
}

export function readAiAssistantLanguagePreference(): AiAssistantLanguagePreference {
  if (typeof window === 'undefined' || !window.localStorage) {
    return 'auto';
  }

  const storedValue = window.localStorage.getItem(aiAssistantLanguagePreferenceStorageKey);
  return storedValue && isAiAssistantLanguagePreference(storedValue)
    ? storedValue
    : 'auto';
}

export function writeAiAssistantLanguagePreference(value: AiAssistantLanguagePreference): void {
  if (typeof window === 'undefined' || !window.localStorage) {
    return;
  }

  window.localStorage.setItem(aiAssistantLanguagePreferenceStorageKey, value);
}

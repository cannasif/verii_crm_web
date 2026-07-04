import type { AiAssistantLanguagePreference } from '../types/ai-assistant.types';

export const aiAssistantLanguagePreferenceStorageKey = 'crm-ai-assistant-language-preference';

export const aiAssistantLanguageOptions: Array<{
  value: AiAssistantLanguagePreference;
  label: string;
}> = [
  { value: 'auto', label: 'Auto' },
  { value: 'tr', label: 'TR' },
  { value: 'en', label: 'EN' },
];

export function readAiAssistantLanguagePreference(): AiAssistantLanguagePreference {
  if (typeof window === 'undefined' || !window.localStorage) {
    return 'auto';
  }

  const storedValue = window.localStorage.getItem(aiAssistantLanguagePreferenceStorageKey);
  return storedValue === 'tr' || storedValue === 'en' || storedValue === 'auto'
    ? storedValue
    : 'auto';
}

export function writeAiAssistantLanguagePreference(value: AiAssistantLanguagePreference): void {
  if (typeof window === 'undefined' || !window.localStorage) {
    return;
  }

  window.localStorage.setItem(aiAssistantLanguagePreferenceStorageKey, value);
}

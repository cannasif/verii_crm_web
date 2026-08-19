import type { TFunction } from 'i18next';

type HttpErrorLike = Error & {
  response?: {
    status?: number;
  };
};

const GENERIC_TRANSPORT_ERROR = /^(?:request failed with status code \d+|network error)$/i;

export function resolveMailSettingsErrorMessage(
  error: Error,
  t: TFunction,
  fallbackKey: string
): string {
  const fallback = String(t(fallbackKey));
  const rawMessage = error.message?.trim() ?? '';
  const status = (error as HttpErrorLike).response?.status;

  if (!rawMessage || GENERIC_TRANSPORT_ERROR.test(rawMessage)) {
    return status ? `${fallback} (HTTP ${status})` : fallback;
  }

  return String(t(rawMessage, { defaultValue: rawMessage }));
}

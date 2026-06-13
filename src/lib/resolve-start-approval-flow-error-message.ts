interface ParsedApprovalFlowError {
  message?: string;
  exceptionMessage?: string;
  errors?: string[];
}

function parseApprovalFlowError(error: Error): ParsedApprovalFlowError | null {
  if (!error.message?.trim()) {
    return null;
  }

  try {
    return JSON.parse(error.message) as ParsedApprovalFlowError;
  } catch {
    return null;
  }
}

function normalizeForMatch(value: string): string {
  return value
    .toLocaleLowerCase('tr-TR')
    .normalize('NFD')
    .replace(/\p{M}/gu, '');
}

function isApproverResolutionFailure(exceptionMessage: string | undefined): boolean {
  if (!exceptionMessage?.trim()) {
    return false;
  }

  const normalized = normalizeForMatch(exceptionMessage);
  return (
    (normalized.includes('onayci') && normalized.includes('bulunamad')) ||
    normalized.includes('tutari karsilayan') ||
    (normalized.includes('approver') && normalized.includes('not found'))
  );
}

function isMisleadingOrderNotFound(message: string | undefined): boolean {
  if (!message?.trim()) {
    return false;
  }

  const normalized = normalizeForMatch(message);
  return normalized.includes('bulunamad') && normalized.includes('order');
}

export function resolveStartApprovalFlowErrorMessage(
  error: Error,
  translate: (key: string) => string,
  approvalKeyPrefix: string,
): string {
  const fallback = translate(`${approvalKeyPrefix}.startError`);
  const parsed = parseApprovalFlowError(error);

  if (!parsed) {
    return error.message || fallback;
  }

  if (Array.isArray(parsed.errors) && parsed.errors.length > 0) {
    return parsed.errors.join(', ');
  }

  const exceptionMessage = parsed.exceptionMessage?.trim();
  const message = parsed.message?.trim();
  const approverFailure =
    isApproverResolutionFailure(exceptionMessage) ||
    (isMisleadingOrderNotFound(message) && Boolean(exceptionMessage));

  if (approverFailure) {
    return translate(`${approvalKeyPrefix}.approverNotFound`);
  }

  if (exceptionMessage) {
    return exceptionMessage;
  }

  if (message) {
    return message;
  }

  return fallback;
}

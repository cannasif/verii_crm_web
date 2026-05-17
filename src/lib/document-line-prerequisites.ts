export type DocumentLinePrerequisitesInput = {
  customerId?: number | null;
  erpCustomerCode?: string | null;
  representativeId?: number | null;
  currency?: number | string | null | undefined;
};

export function hasDocumentCustomer(
  customerId?: number | null,
  erpCustomerCode?: string | null,
): boolean {
  return (
    (customerId != null && customerId > 0) ||
    (erpCustomerCode != null && String(erpCustomerCode).trim().length > 0)
  );
}

export function isDocumentCurrencySelected(currency: DocumentLinePrerequisitesInput['currency']): boolean {
  if (currency === undefined || currency === null) {
    return false;
  }
  if (typeof currency === 'number') {
    return !Number.isNaN(currency);
  }
  return String(currency).trim().length > 0;
}

export function hasDocumentRepresentative(representativeId?: number | null): boolean {
  return representativeId != null && representativeId > 0;
}

export function canDocumentLinePrerequisites(input: DocumentLinePrerequisitesInput): boolean {
  return (
    hasDocumentCustomer(input.customerId, input.erpCustomerCode) &&
    hasDocumentRepresentative(input.representativeId) &&
    isDocumentCurrencySelected(input.currency)
  );
}

export function buildDocumentLinePrerequisiteHintLines(
  input: DocumentLinePrerequisitesInput,
  t: (key: string) => string,
): string[] {
  const lines: string[] = [];

  if (!hasDocumentCustomer(input.customerId, input.erpCustomerCode)) {
    lines.push(t('disabledActionHints.needCustomer'));
  }
  if (!hasDocumentRepresentative(input.representativeId)) {
    lines.push(t('disabledActionHints.needRepresentative'));
  }
  if (!isDocumentCurrencySelected(input.currency)) {
    lines.push(t('disabledActionHints.needCurrency'));
  }

  return lines;
}

const customerDossierPdfPattern = /^\/api\/AiAssistant\/customer-dossier\/(\d+)\/pdf$/i;
const salesRepDossierPdfPattern = /^\/api\/AiAssistant\/sales-rep-dossier\/(\d+)\/pdf$/i;

export function isCustomerDossierPdfActionUrl(actionUrl?: string | null): boolean {
  if (!actionUrl) {
    return false;
  }

  return customerDossierPdfPattern.test(actionUrl);
}

export function isSalesRepDossierPdfActionUrl(actionUrl?: string | null): boolean {
  if (!actionUrl) {
    return false;
  }

  return salesRepDossierPdfPattern.test(actionUrl);
}

export function isDossierPdfActionUrl(actionUrl?: string | null): boolean {
  return isCustomerDossierPdfActionUrl(actionUrl) || isSalesRepDossierPdfActionUrl(actionUrl);
}

export function extractCustomerDossierId(actionUrl: string): number | null {
  const match = actionUrl.match(customerDossierPdfPattern);
  if (!match?.[1]) {
    return null;
  }

  const customerId = Number(match[1]);
  return Number.isFinite(customerId) ? customerId : null;
}

export function extractSalesRepDossierId(actionUrl: string): number | null {
  const match = actionUrl.match(salesRepDossierPdfPattern);
  if (!match?.[1]) {
    return null;
  }

  const userId = Number(match[1]);
  return Number.isFinite(userId) ? userId : null;
}

export function downloadBlob(blob: Blob, fileName: string): void {
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = objectUrl;
  anchor.download = fileName;
  anchor.rel = 'noopener';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(objectUrl);
}

export function downloadBlobAsPdf(blob: Blob, fileName: string): void {
  const pdfBlob = blob.type === 'application/pdf' ? blob : new Blob([blob], { type: 'application/pdf' });
  downloadBlob(pdfBlob, fileName.endsWith('.pdf') ? fileName : `${fileName}.pdf`);
}

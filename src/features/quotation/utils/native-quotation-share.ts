import { toast } from 'sonner';
import { googleIntegrationApi } from '@/features/google-integration/api/google-integration.api';
import { outlookIntegrationApi } from '@/features/outlook-integration/api/outlook-integration.api';
import { blobToBase64, blobToFile } from './quotation-share-utils';
import { resolveQuotationWhatsappPhone } from './resolve-quotation-recipient';

export interface NativeShareLabels {
  phoneRequired: string;
  emailRequired: string;
  emailInvalid: string;
  shareOpened: string;
  whatsappFallback: string;
  mailFallback: string;
  mailSentApi: string;
  mailSendFailed: string;
  shareFailed: string;
  shareCancelled: string;
}

export type ConnectedMailProvider = 'outlook' | 'google';

/** Entegrasyon yokken hangi web compose istemcisinin açılacağı (alıcıya göre değil, gönderene göre). */
export type MailComposeClient = 'outlook-office' | 'outlook-personal' | 'gmail';

const MAIL_COMPOSE_CLIENT_STORAGE_KEY = 'quotation-native-mail-compose-client';

export function getStoredMailComposeClient(): MailComposeClient {
  try {
    const stored = localStorage.getItem(MAIL_COMPOSE_CLIENT_STORAGE_KEY);
    if (stored === 'outlook-office' || stored === 'outlook-personal' || stored === 'gmail') {
      return stored;
    }
  } catch {
    // localStorage erişilemezse varsayılan
  }
  return 'outlook-office';
}

export function storeMailComposeClient(client: MailComposeClient): void {
  try {
    localStorage.setItem(MAIL_COMPOSE_CLIENT_STORAGE_KEY, client);
  } catch {
    // sessiz
  }
}

function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.rel = 'noopener';
  anchor.click();
  URL.revokeObjectURL(url);
}

function phoneToWaMeDigits(phone: string): string {
  return phone.replace(/\D/g, '');
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function buildGmailComposeUrl(to: string, subject: string, body: string): string {
  const params = new URLSearchParams({
    view: 'cm',
    fs: '1',
    to,
    su: subject,
    body,
  });
  return `https://mail.google.com/mail/?${params.toString()}`;
}

function buildOutlookPersonalComposeUrl(to: string, subject: string, body: string): string {
  const params = new URLSearchParams({ to, subject, body });
  return `https://outlook.live.com/mail/0/deeplink/compose?${params.toString()}`;
}

function buildOutlookOfficeComposeUrl(to: string, subject: string, body: string): string {
  const params = new URLSearchParams({ to, subject, body });
  return `https://outlook.office.com/mail/deeplink/compose?${params.toString()}`;
}

/** Tarayıcıda alıcı/konu/gövde dolu compose açar (Web Share kullanılmaz). */
function openMailComposeInBrowser(
  to: string,
  subject: string,
  body: string,
  client: MailComposeClient,
): void {
  const url =
    client === 'gmail'
      ? buildGmailComposeUrl(to, subject, body)
      : client === 'outlook-personal'
        ? buildOutlookPersonalComposeUrl(to, subject, body)
        : buildOutlookOfficeComposeUrl(to, subject, body);

  window.open(url, '_blank', 'noopener,noreferrer');
}

export async function getConnectedMailProvider(): Promise<ConnectedMailProvider | null> {
  const [outlookResult, googleResult] = await Promise.allSettled([
    outlookIntegrationApi.getStatus(),
    googleIntegrationApi.getStatus(),
  ]);

  const outlookConnected =
    outlookResult.status === 'fulfilled' && outlookResult.value.isConnected === true;
  const googleConnected =
    googleResult.status === 'fulfilled' && googleResult.value.isConnected === true;

  if (outlookConnected) return 'outlook';
  if (googleConnected) return 'google';
  return null;
}

async function trySendMailViaIntegration(params: {
  provider: ConnectedMailProvider;
  customerId: number;
  contactId?: number | null;
  recordId?: number | null;
  toEmail: string;
  subject: string;
  body: string;
  fileName: string;
  pdfBlob: Blob;
}): Promise<void> {
  const attachment = {
    fileName: params.fileName,
    contentType: 'application/pdf',
    base64Content: await blobToBase64(params.pdfBlob),
  };

  const payload = {
    customerId: params.customerId,
    contactId: params.contactId && params.contactId > 0 ? params.contactId : undefined,
    to: params.toEmail,
    subject: params.subject,
    body: params.body,
    isHtml: false,
    moduleKey: 'quotation' as const,
    recordId: params.recordId && params.recordId > 0 ? params.recordId : undefined,
    createActivityLog: true,
    attachments: [attachment],
  };

  if (params.provider === 'outlook') {
    await outlookIntegrationApi.sendCustomerMail(payload);
    return;
  }

  await googleIntegrationApi.sendCustomerMail(payload);
}

async function tryWebShareWithFile(params: {
  file: File;
  text: string;
  title?: string;
}): Promise<boolean> {
  if (typeof navigator.share !== 'function') return false;

  const shareData: ShareData = {
    files: [params.file],
    text: params.text,
    title: params.title,
  };

  if (typeof navigator.canShare === 'function' && !navigator.canShare(shareData)) {
    return false;
  }

  await navigator.share(shareData);
  return true;
}

function isShareCancelled(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError';
}

export async function shareQuotationNativeWhatsapp(params: {
  pdfBlob: Blob;
  fileName: string;
  customerId: number;
  contactId?: number | null;
  customerPhone?: string | null;
  customerPhone2?: string | null;
  message: string;
  labels: NativeShareLabels;
}): Promise<void> {
  const phone = await resolveQuotationWhatsappPhone({
    customerId: params.customerId,
    contactId: params.contactId,
    customerPhone: params.customerPhone,
    customerPhone2: params.customerPhone2,
  });

  if (!phone) {
    toast.error(params.labels.phoneRequired);
    return;
  }

  const file = blobToFile(params.pdfBlob, params.fileName);

  try {
    const shared = await tryWebShareWithFile({
      file,
      text: params.message,
      title: params.fileName,
    });

    if (shared) {
      toast.success(params.labels.shareOpened);
      return;
    }
  } catch (error) {
    if (isShareCancelled(error)) {
      return;
    }
  }

  downloadBlob(params.pdfBlob, params.fileName);
  const waUrl = `https://wa.me/${phoneToWaMeDigits(phone)}?text=${encodeURIComponent(params.message)}`;
  window.open(waUrl, '_blank', 'noopener,noreferrer');
  toast.info(params.labels.whatsappFallback);
}

export async function shareQuotationNativeMail(params: {
  pdfBlob: Blob;
  fileName: string;
  customerId: number;
  contactId?: number | null;
  recordId?: number | null;
  toEmail: string;
  subject: string;
  body: string;
  labels: NativeShareLabels;
  /** Prep dialog'da zaten biliniyorsa tekrar sorgulamayı önler */
  connectedProvider?: ConnectedMailProvider | null;
  /** Entegrasyon yokken hangi web mail istemcisi açılsın */
  composeClient?: MailComposeClient;
}): Promise<void> {
  const toEmail = params.toEmail.trim();
  const subject = params.subject.trim();
  const body = params.body.trim();

  if (!toEmail) {
    toast.error(params.labels.emailRequired);
    return;
  }

  if (!isValidEmail(toEmail)) {
    toast.error(params.labels.emailInvalid);
    return;
  }

  if (!subject) {
    toast.error(params.labels.emailRequired);
    return;
  }

  // 1) CRM Outlook/Gmail entegrasyonu → ekli API gönderimi (indirme yok)
  const provider =
    params.connectedProvider !== undefined
      ? params.connectedProvider
      : await getConnectedMailProvider();

  if (provider) {
    try {
      await trySendMailViaIntegration({
        provider,
        customerId: params.customerId,
        contactId: params.contactId,
        recordId: params.recordId,
        toEmail,
        subject,
        body,
        fileName: params.fileName,
        pdfBlob: params.pdfBlob,
      });
      toast.success(params.labels.mailSentApi.replace('{{email}}', toEmail));
      return;
    } catch (error) {
      const message = error instanceof Error ? error.message : params.labels.mailSendFailed;
      toast.error(message);
      return;
    }
  }

  // 2) Entegrasyon yok: PDF indir + Outlook/Gmail web compose (alıcı/konu/gövde dolu)
  // Web Share KULLANILMAZ — Outlook'ta boş .tmp eki ve yanlış alıcıya yol açıyor.
  downloadBlob(params.pdfBlob, params.fileName);

  const composeClient = params.composeClient ?? getStoredMailComposeClient();
  storeMailComposeClient(composeClient);

  window.setTimeout(() => {
    openMailComposeInBrowser(toEmail, subject, body, composeClient);
  }, 400);

  toast.info(params.labels.mailFallback.replace('{{email}}', toEmail));
}

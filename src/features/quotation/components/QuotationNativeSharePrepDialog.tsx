import { type ReactElement, useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Copy, Loader2, MessageCircle, Mail, Check } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  getStoredMailComposeClient,
  storeMailComposeClient,
  type MailComposeClient,
} from '../utils/native-quotation-share';

export type NativeSharePrepChannel = 'whatsapp' | 'mail';

export interface QuotationNativeSharePrepDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  channel: NativeSharePrepChannel;
  message: string;
  mailSubject?: string;
  mailBody?: string;
  mailTo?: string;
  mailViaApi?: boolean;
  fileName?: string;
  isSharing?: boolean;
  onConfirm: (values: {
    message?: string;
    mailTo?: string;
    mailSubject?: string;
    mailBody?: string;
    mailComposeClient?: MailComposeClient;
  }) => void | Promise<void>;
}

async function copyTextToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export function QuotationNativeSharePrepDialog({
  open,
  onOpenChange,
  channel,
  message,
  mailSubject,
  mailBody,
  mailTo,
  mailViaApi = false,
  fileName,
  isSharing = false,
  onConfirm,
}: QuotationNativeSharePrepDialogProps): ReactElement {
  const { t } = useTranslation('quotation');
  const [copied, setCopied] = useState(false);
  const [editedMessage, setEditedMessage] = useState(message);
  const [editedSubject, setEditedSubject] = useState(mailSubject ?? '');
  const [editedBody, setEditedBody] = useState(mailBody ?? '');
  const [editedMailTo, setEditedMailTo] = useState(mailTo ?? '');
  const [composeClient, setComposeClient] = useState<MailComposeClient>(getStoredMailComposeClient);

  useEffect(() => {
    if (!open) return;
    setEditedMessage(message);
    setEditedSubject(mailSubject ?? '');
    setEditedBody(mailBody ?? '');
    setEditedMailTo(mailTo ?? '');
    setComposeClient(getStoredMailComposeClient());
    setCopied(false);
  }, [open, message, mailSubject, mailBody, mailTo]);

  const copyPayload =
    channel === 'mail'
      ? [editedSubject.trim(), editedBody.trim()].filter(Boolean).join('\n\n')
      : editedMessage;

  const handleCopy = useCallback(async (): Promise<void> => {
    const ok = await copyTextToClipboard(copyPayload);
    if (ok) {
      setCopied(true);
      toast.success(t('share.nativePrep.copied'));
      window.setTimeout(() => setCopied(false), 2000);
    } else {
      toast.error(t('share.nativePrep.copyFailed'));
    }
  }, [copyPayload, t]);

  const isWhatsapp = channel === 'whatsapp';
  const canShare = isWhatsapp
    ? editedMessage.trim().length > 0
    : editedMailTo.trim().length > 0 && editedSubject.trim().length > 0 && editedBody.trim().length > 0;

  const handleConfirm = (): void => {
    if (!canShare) return;
    void onConfirm(
      isWhatsapp
        ? { message: editedMessage.trim() }
        : {
            mailTo: editedMailTo.trim(),
            mailSubject: editedSubject.trim(),
            mailBody: editedBody.trim(),
            mailComposeClient: composeClient,
          },
    );
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !isSharing && onOpenChange(next)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isWhatsapp ? (
              <MessageCircle className="h-5 w-5 text-emerald-600" />
            ) : (
              <Mail className="h-5 w-5 text-sky-600" />
            )}
            {isWhatsapp ? t('share.nativePrep.whatsappTitle') : t('share.nativePrep.mailTitle')}
          </DialogTitle>
          <DialogDescription>
            {isWhatsapp
              ? t('share.nativePrep.description')
              : mailViaApi
                ? t('share.nativePrep.mailDescriptionApi')
                : t('share.nativePrep.mailDescription')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {fileName ? (
            <p className="text-xs text-muted-foreground">
              {t('share.nativePrep.attachment', { fileName })}
            </p>
          ) : null}

          {channel === 'mail' ? (
            <div className="space-y-2">
              <Label htmlFor="native-share-prep-to">{t('share.nativePrep.to')}</Label>
              <Input
                id="native-share-prep-to"
                type="email"
                value={editedMailTo}
                onChange={(event) => setEditedMailTo(event.target.value)}
                placeholder="musteri@sirket.com"
                disabled={isSharing}
              />
            </div>
          ) : null}

          {channel === 'mail' && !mailViaApi ? (
            <div className="space-y-2">
              <Label htmlFor="native-share-prep-compose-client">
                {t('share.nativePrep.composeClient')}
              </Label>
              <Select
                value={composeClient}
                onValueChange={(value) => {
                  const next = value as MailComposeClient;
                  setComposeClient(next);
                  storeMailComposeClient(next);
                }}
                disabled={isSharing}
              >
                <SelectTrigger id="native-share-prep-compose-client" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="outlook-office">
                    {t('share.nativePrep.composeClientOutlookOffice')}
                  </SelectItem>
                  <SelectItem value="outlook-personal">
                    {t('share.nativePrep.composeClientOutlookPersonal')}
                  </SelectItem>
                  <SelectItem value="gmail">{t('share.nativePrep.composeClientGmail')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          ) : null}

          {channel === 'mail' ? (
            <div className="space-y-2">
              <Label htmlFor="native-share-prep-subject">{t('share.nativePrep.subject')}</Label>
              <Input
                id="native-share-prep-subject"
                value={editedSubject}
                onChange={(event) => setEditedSubject(event.target.value)}
                disabled={isSharing}
              />
            </div>
          ) : null}

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="native-share-prep-message">
                {isWhatsapp ? t('share.nativePrep.message') : t('share.nativePrep.body')}
              </Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 shrink-0"
                onClick={() => void handleCopy()}
                disabled={isSharing || !copyPayload.trim()}
              >
                {copied ? (
                  <Check className="mr-1.5 h-3.5 w-3.5 text-emerald-600" />
                ) : (
                  <Copy className="mr-1.5 h-3.5 w-3.5" />
                )}
                {copied ? t('share.nativePrep.copiedButton') : t('share.nativePrep.copy')}
              </Button>
            </div>
            <Textarea
              id="native-share-prep-message"
              value={isWhatsapp ? editedMessage : editedBody}
              onChange={(event) => {
                if (isWhatsapp) {
                  setEditedMessage(event.target.value);
                } else {
                  setEditedBody(event.target.value);
                }
              }}
              rows={4}
              disabled={isSharing}
              className="resize-y min-h-[6rem]"
            />
          </div>

          <p className="text-xs text-muted-foreground">
            {isWhatsapp
              ? t('share.nativePrep.hint')
              : mailViaApi
                ? t('share.nativePrep.mailHintApi')
                : t('share.nativePrep.mailHint')}
          </p>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSharing}>
            {t('cancel')}
          </Button>
          <Button type="button" onClick={handleConfirm} disabled={isSharing || !canShare}>
            {isSharing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {isWhatsapp
              ? t('share.nativePrep.continue')
              : mailViaApi
                ? t('share.nativePrep.sendMail')
                : t('share.nativePrep.openMail')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

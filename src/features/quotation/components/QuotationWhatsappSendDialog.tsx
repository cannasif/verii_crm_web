import { type ReactElement, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2, MessageCircle, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { contactApi } from '@/features/contact-management/api/contact-api';
import type { ContactDto } from '@/features/contact-management/types/contact-types';
import { customerApi } from '@/features/customer-management/api/customer-api';
import {
  useSendWhatsappDocumentMutation,
  useSendWhatsappQuotationMutation,
} from '@/features/whatsapp-integration/hooks/useWhatsappIntegrationMutations';
import { useWhatsappStatusQuery } from '@/features/whatsapp-integration/hooks/useWhatsappStatusQuery';
import {
  blobToBase64,
  resolveContactPhone,
  resolveWhatsappRecipientPhone,
} from '../utils/quotation-share-utils';

export interface QuotationWhatsappSendDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quotationId?: number | null;
  pdfBlob?: Blob | null;
  fileName: string;
  customerId?: number | null;
  contactId?: number | null;
  customerName?: string | null;
  defaultPhone?: string | null;
  defaultMessage?: string;
}

export function QuotationWhatsappSendDialog({
  open,
  onOpenChange,
  quotationId,
  pdfBlob,
  fileName,
  customerId,
  contactId,
  customerName,
  defaultPhone,
  defaultMessage,
}: QuotationWhatsappSendDialogProps): ReactElement {
  const { t } = useTranslation(['quotation', 'whatsapp-integration']);
  const { data: whatsappStatus } = useWhatsappStatusQuery();
  const sendQuotationMutation = useSendWhatsappQuotationMutation();
  const sendDocumentMutation = useSendWhatsappDocumentMutation();

  const [phoneNumber, setPhoneNumber] = useState('');
  const [message, setMessage] = useState('');
  const [contacts, setContacts] = useState<ContactDto[]>([]);
  const [resolvedCustomerName, setResolvedCustomerName] = useState<string | null>(null);
  const [loadingRecipients, setLoadingRecipients] = useState(false);
  const [inlineError, setInlineError] = useState<string | null>(null);
  const [phoneManuallyEdited, setPhoneManuallyEdited] = useState(false);

  const isConfigured = whatsappStatus?.isConfigured === true && whatsappStatus?.isEnabled === true;
  const isPending = sendQuotationMutation.isPending || sendDocumentMutation.isPending;
  const displayCustomerName = customerName?.trim() || resolvedCustomerName?.trim() || null;

  const contactOptions = useMemo(
    () =>
      contacts
        .map((contact) => {
          const phone = resolveContactPhone(contact.mobile, contact.phone);
          if (!phone) return null;
          const label = [contact.fullName, phone].filter(Boolean).join(' · ');
          return { id: contact.id, phone, label, isPrimary: contact.id === contactId };
        })
        .filter((item): item is { id: number; phone: string; label: string; isPrimary: boolean } => item !== null),
    [contacts, contactId],
  );

  useEffect(() => {
    if (!open) {
      setInlineError(null);
      setPhoneManuallyEdited(false);
      return;
    }

    setMessage(defaultMessage || t('share.whatsappMessage'));
  }, [open, defaultMessage, t]);

  useEffect(() => {
    if (!open || !customerId || customerId <= 0) {
      setContacts([]);
      setResolvedCustomerName(null);
      setPhoneNumber(defaultPhone ? resolveWhatsappRecipientPhone({ defaultPhone }) : '');
      return;
    }

    let cancelled = false;
    setLoadingRecipients(true);

    void Promise.all([
      customerApi.getById(customerId),
      contactApi.getList({
        pageNumber: 1,
        pageSize: 100,
        sortBy: 'FullName',
        sortDirection: 'asc',
        filters: [{ column: 'CustomerId', operator: 'equals', value: String(customerId) }],
      }),
    ])
      .then(([customer, contactResponse]) => {
        if (cancelled) return;

        const items = contactResponse.data ?? [];
        setContacts(items);
        setResolvedCustomerName(customer.name ?? null);

        const linkedContact =
          items.find((item) => item.id === contactId) ??
          items.find((item) => resolveContactPhone(item.mobile, item.phone)) ??
          null;

        const autoPhone = resolveWhatsappRecipientPhone({
          defaultPhone,
          contactPhone: linkedContact
            ? resolveContactPhone(linkedContact.mobile, linkedContact.phone)
            : null,
          customerPhone: customer.phone,
          customerPhone2: customer.phone2,
        });

        setPhoneNumber(autoPhone);
        setPhoneManuallyEdited(false);
      })
      .catch(() => {
        if (cancelled) return;
        setContacts([]);
        setResolvedCustomerName(null);
        setPhoneNumber(defaultPhone ? resolveWhatsappRecipientPhone({ defaultPhone }) : '');
      })
      .finally(() => {
        if (!cancelled) setLoadingRecipients(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, customerId, contactId, defaultPhone]);

  const handleSelectContactPhone = (phone: string): void => {
    setPhoneNumber(phone);
    setPhoneManuallyEdited(false);
    setInlineError(null);
  };

  const handleSend = async (): Promise<void> => {
    const normalizedPhone = phoneNumber.trim();
    if (!normalizedPhone) {
      setInlineError(t('shareWhatsappDialog.phoneRequired'));
      return;
    }

    if (!isConfigured) {
      setInlineError(t('shareWhatsappDialog.notConfigured'));
      return;
    }

    try {
      setInlineError(null);

      if (quotationId && quotationId > 0) {
        await sendQuotationMutation.mutateAsync({
          quotationId,
          payload: {
            toPhoneNumber: normalizedPhone,
            attachPdf: true,
            customerMessage: message.trim() || null,
          },
        });
      } else if (pdfBlob) {
        await sendDocumentMutation.mutateAsync({
          toPhoneNumber: normalizedPhone,
          message: message.trim() || null,
          fileName,
          contentType: 'application/pdf',
          base64Content: await blobToBase64(pdfBlob),
          customerId: customerId && customerId > 0 ? customerId : null,
        });
      } else {
        setInlineError(t('shareWhatsappDialog.missingDocument'));
        return;
      }

      onOpenChange(false);
    } catch (error) {
      setInlineError(
        error instanceof Error ? error.message : t('quotationSend.sendError', { ns: 'whatsapp-integration' }),
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-emerald-600" />
            {t('shareWhatsappDialog.title')}
          </DialogTitle>
          <DialogDescription>{t('shareWhatsappDialog.description')}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {!isConfigured ? (
            <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              {t('shareWhatsappDialog.notConfigured')}
            </p>
          ) : null}

          {displayCustomerName || phoneNumber ? (
            <div className="rounded-lg border border-emerald-200/80 bg-emerald-50/70 px-3 py-3 text-sm text-emerald-950">
              <div className="flex items-start gap-2">
                <User className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                <div className="min-w-0 space-y-1">
                  {displayCustomerName ? (
                    <p className="font-semibold">{displayCustomerName}</p>
                  ) : null}
                  {phoneNumber ? (
                    <p>
                      {t('shareWhatsappDialog.autoRecipient', { phone: phoneNumber })}
                    </p>
                  ) : (
                    <p className="text-amber-800">{t('shareWhatsappDialog.phoneMissing')}</p>
                  )}
                </div>
              </div>
            </div>
          ) : null}

          {contactOptions.length > 1 ? (
            <div className="space-y-2">
              <Label>{t('shareWhatsappDialog.contact')}</Label>
              <div className="flex flex-wrap gap-2">
                {contactOptions.map((option) => (
                  <Button
                    key={option.id}
                    type="button"
                    size="sm"
                    variant={phoneNumber === option.phone ? 'default' : 'outline'}
                    onClick={() => handleSelectContactPhone(option.phone)}
                  >
                    {option.label}
                  </Button>
                ))}
              </div>
            </div>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="quotation-whatsapp-phone">{t('shareWhatsappDialog.phone')}</Label>
            <Input
              id="quotation-whatsapp-phone"
              value={phoneNumber}
              onChange={(event) => {
                setPhoneNumber(event.target.value);
                setPhoneManuallyEdited(true);
              }}
              placeholder="+905xxxxxxxxx"
              disabled={loadingRecipients || isPending}
            />
            {!phoneManuallyEdited && phoneNumber ? (
              <p className="text-xs text-muted-foreground">{t('shareWhatsappDialog.phoneAutoHint')}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="quotation-whatsapp-message">{t('shareWhatsappDialog.message')}</Label>
            <Textarea
              id="quotation-whatsapp-message"
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              rows={4}
              disabled={isPending}
            />
          </div>

          <p className="text-sm text-muted-foreground">{t('shareWhatsappDialog.attachmentHint', { fileName })}</p>

          {inlineError ? <p className="text-sm text-red-600">{inlineError}</p> : null}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            {t('cancel')}
          </Button>
          <Button
            type="button"
            onClick={() => void handleSend()}
            disabled={isPending || !isConfigured || loadingRecipients || !phoneNumber.trim()}
          >
            {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {t('shareWhatsappDialog.send')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

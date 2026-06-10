import { useCallback, useMemo, useState, type ReactElement } from 'react';
import { toast } from 'sonner';
import { QuotationNativeSharePrepDialog, type NativeSharePrepChannel } from '../components/QuotationNativeSharePrepDialog';
import { resolveQuotationMailEmail } from '../utils/resolve-quotation-recipient';
import {
  getConnectedMailProvider,
  shareQuotationNativeMail,
  shareQuotationNativeWhatsapp,
  type ConnectedMailProvider,
  type MailComposeClient,
  type NativeShareLabels,
} from '../utils/native-quotation-share';

interface WhatsappShareParams {
  pdfBlob: Blob;
  fileName: string;
  customerId: number;
  contactId?: number | null;
  customerPhone?: string | null;
  customerPhone2?: string | null;
  message: string;
}

interface MailShareParams {
  pdfBlob: Blob;
  fileName: string;
  customerId: number;
  contactId?: number | null;
  recordId?: number | null;
  customerEmail?: string | null;
  subject: string;
  body: string;
}

type PendingPrep =
  | ({ channel: 'whatsapp' } & WhatsappShareParams)
  | ({ channel: 'mail'; toEmail: string; connectedProvider: ConnectedMailProvider | null } & MailShareParams);

interface UseQuotationNativeSharePrepOptions {
  labels: NativeShareLabels;
}

export function useQuotationNativeSharePrep({ labels }: UseQuotationNativeSharePrepOptions): {
  openWhatsappPrep: (params: WhatsappShareParams) => void;
  openMailPrep: (params: MailShareParams) => void;
  prepDialog: ReactElement | null;
  isResolvingMail: boolean;
} {
  const [pending, setPending] = useState<PendingPrep | null>(null);
  const [isSharing, setIsSharing] = useState(false);
  const [isResolvingMail, setIsResolvingMail] = useState(false);

  const openWhatsappPrep = useCallback((params: WhatsappShareParams): void => {
    setPending({ channel: 'whatsapp', ...params });
  }, []);

  const openMailPrep = useCallback(
    (params: MailShareParams): void => {
      setIsResolvingMail(true);
      void (async (): Promise<void> => {
        try {
          const toEmail = await resolveQuotationMailEmail({
            customerId: params.customerId,
            contactId: params.contactId,
            customerEmail: params.customerEmail,
          });

          if (!toEmail) {
            toast.error(labels.emailRequired);
            return;
          }

          const connectedProvider = await getConnectedMailProvider();
          setPending({ channel: 'mail', toEmail, connectedProvider, ...params });
        } finally {
          setIsResolvingMail(false);
        }
      })();
    },
    [labels.emailRequired],
  );

  const closePrep = useCallback((): void => {
    if (isSharing) return;
    setPending(null);
  }, [isSharing]);

  const handleConfirm = useCallback(
    async (values: {
      message?: string;
      mailTo?: string;
      mailSubject?: string;
      mailBody?: string;
      mailComposeClient?: MailComposeClient;
    }): Promise<void> => {
      if (!pending) return;

      setIsSharing(true);
      try {
        if (pending.channel === 'whatsapp') {
          await shareQuotationNativeWhatsapp({
            pdfBlob: pending.pdfBlob,
            fileName: pending.fileName,
            customerId: pending.customerId,
            contactId: pending.contactId,
            customerPhone: pending.customerPhone,
            customerPhone2: pending.customerPhone2,
            message: values.message ?? pending.message,
            labels,
          });
        } else {
          await shareQuotationNativeMail({
            pdfBlob: pending.pdfBlob,
            fileName: pending.fileName,
            customerId: pending.customerId,
            contactId: pending.contactId,
            recordId: pending.channel === 'mail' ? pending.recordId : undefined,
            toEmail: values.mailTo ?? pending.toEmail,
            subject: values.mailSubject ?? pending.subject,
            body: values.mailBody ?? pending.body,
            labels,
            connectedProvider: pending.connectedProvider,
            composeClient: values.mailComposeClient,
          });
        }
        setPending(null);
      } finally {
        setIsSharing(false);
      }
    },
    [pending, labels],
  );

  const prepDialog = useMemo((): ReactElement | null => {
    if (!pending) return null;

    return (
      <QuotationNativeSharePrepDialog
        open
        onOpenChange={(open) => {
          if (!open) closePrep();
        }}
        channel={pending.channel as NativeSharePrepChannel}
        message={pending.channel === 'whatsapp' ? pending.message : ''}
        mailTo={pending.channel === 'mail' ? pending.toEmail : undefined}
        mailSubject={pending.channel === 'mail' ? pending.subject : undefined}
        mailBody={pending.channel === 'mail' ? pending.body : undefined}
        mailViaApi={pending.channel === 'mail' ? pending.connectedProvider !== null : false}
        fileName={pending.fileName}
        isSharing={isSharing}
        onConfirm={handleConfirm}
      />
    );
  }, [pending, isSharing, closePrep, handleConfirm]);

  return { openWhatsappPrep, openMailPrep, prepDialog, isResolvingMail };
}

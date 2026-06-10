import { type ReactElement, lazy, Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import { Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useGoogleStatusQuery } from '@/features/google-integration/hooks/useGoogleStatusQuery';
import { useOutlookStatusQuery } from '@/features/outlook-integration/hooks/useOutlookStatusQuery';

const GoogleCustomerMailDialog = lazy(() =>
  import('@/features/google-integration/components/GoogleCustomerMailDialog').then((module) => ({
    default: module.GoogleCustomerMailDialog,
  })),
);

const OutlookCustomerMailDialog = lazy(() =>
  import('@/features/outlook-integration/components/OutlookCustomerMailDialog').then((module) => ({
    default: module.OutlookCustomerMailDialog,
  })),
);

export interface QuotationMailShareContext {
  recordId: number;
  customerId?: number | null;
  contactId?: number | null;
  customerName?: string | null;
  customerCode?: string | null;
  recordNo?: string | null;
  revisionNo?: string | null;
  totalAmountDisplay?: string | null;
  validUntil?: string | null;
  recordOwnerName?: string | null;
  attachmentFile?: File | null;
  autoAttachPdfOnOpen?: boolean;
}

interface QuotationMailShareDialogsProps {
  providerPickerOpen: boolean;
  onProviderPickerOpenChange: (open: boolean) => void;
  googleMailOpen: boolean;
  onGoogleMailOpenChange: (open: boolean) => void;
  outlookMailOpen: boolean;
  onOutlookMailOpenChange: (open: boolean) => void;
  shareContext: QuotationMailShareContext | null;
}

export function QuotationMailShareDialogs({
  providerPickerOpen,
  onProviderPickerOpenChange,
  googleMailOpen,
  onGoogleMailOpenChange,
  outlookMailOpen,
  onOutlookMailOpenChange,
  shareContext,
}: QuotationMailShareDialogsProps): ReactElement {
  const { t } = useTranslation('quotation');
  const { data: googleStatus } = useGoogleStatusQuery();
  const { data: outlookStatus } = useOutlookStatusQuery();

  const googleConnected = googleStatus?.isConnected === true;
  const outlookConnected = outlookStatus?.isConnected === true;

  const openGoogle = (): void => {
    onProviderPickerOpenChange(false);
    onGoogleMailOpenChange(true);
  };

  const openOutlook = (): void => {
    onProviderPickerOpenChange(false);
    onOutlookMailOpenChange(true);
  };

  const initialFiles = shareContext?.attachmentFile ? [shareContext.attachmentFile] : undefined;

  return (
    <>
      <Dialog open={providerPickerOpen} onOpenChange={onProviderPickerOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-sky-600" />
              {t('shareMailDialog.title')}
            </DialogTitle>
            <DialogDescription>{t('shareMailDialog.description')}</DialogDescription>
          </DialogHeader>

          <div className="grid gap-3">
            <Button type="button" variant="outline" onClick={openGoogle} disabled={!googleConnected}>
              {t('shareMailDialog.google')}
            </Button>
            <Button type="button" variant="outline" onClick={openOutlook} disabled={!outlookConnected}>
              {t('shareMailDialog.outlook')}
            </Button>
            {!googleConnected && !outlookConnected ? (
              <p className="text-sm text-amber-700">{t('shareMailDialog.notConnected')}</p>
            ) : null}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onProviderPickerOpenChange(false)}>
              {t('cancel')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Suspense fallback={null}>
        {shareContext && googleMailOpen ? (
          <GoogleCustomerMailDialog
            open={googleMailOpen}
            onOpenChange={onGoogleMailOpenChange}
            moduleKey="quotation"
            recordId={shareContext.recordId}
            customerId={shareContext.customerId}
            contactId={shareContext.contactId}
            customerName={shareContext.customerName}
            customerCode={shareContext.customerCode}
            recordNo={shareContext.recordNo}
            revisionNo={shareContext.revisionNo}
            totalAmountDisplay={shareContext.totalAmountDisplay}
            validUntil={shareContext.validUntil}
            recordOwnerName={shareContext.recordOwnerName}
            initialAttachmentFiles={initialFiles}
            autoAttachPdfOnOpen={shareContext.autoAttachPdfOnOpen}
          />
        ) : null}
        {shareContext && outlookMailOpen ? (
          <OutlookCustomerMailDialog
            open={outlookMailOpen}
            onOpenChange={onOutlookMailOpenChange}
            moduleKey="quotation"
            recordId={shareContext.recordId}
            customerId={shareContext.customerId}
            contactId={shareContext.contactId}
            customerName={shareContext.customerName}
            customerCode={shareContext.customerCode}
            recordNo={shareContext.recordNo}
            revisionNo={shareContext.revisionNo}
            totalAmountDisplay={shareContext.totalAmountDisplay}
            validUntil={shareContext.validUntil}
            recordOwnerName={shareContext.recordOwnerName}
            initialAttachmentFiles={initialFiles}
            autoAttachPdfOnOpen={shareContext.autoAttachPdfOnOpen}
          />
        ) : null}
      </Suspense>
    </>
  );
}

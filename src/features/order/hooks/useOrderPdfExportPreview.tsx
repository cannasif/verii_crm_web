import { useCallback, useMemo, useState, type ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { resolveQuotationCustomerLabelForPdf } from '@/lib/resolve-quotation-customer-label';
import type { QuotationCustomerLabelOption } from '@/lib/resolve-quotation-customer-label';
import { useAuthStore } from '@/stores/auth-store';
import { QuotationPdfExportPreviewDialog } from '@/features/quotation/components/QuotationPdfExportPreviewDialog';
import { QuotationWhatsappSendDialog } from '@/features/quotation/components/QuotationWhatsappSendDialog';
import {
  QuotationMailShareDialogs,
  type QuotationMailShareContext,
} from '@/features/quotation/components/QuotationMailShareDialogs';
import { useQuotationNativeSharePrep } from '@/features/quotation/hooks/useQuotationNativeSharePrep';
import { blobToFile, resolveCustomerPhone } from '@/features/quotation/utils/quotation-share-utils';
import { isIntegratedOrderShare } from '../config/order-share-config';
import { buildOrderPreviewPdfBlob } from '../utils/build-order-preview-pdf';
import { buildOrderPreviewPdfLabels } from '../utils/build-order-preview-pdf-labels';
import {
  buildPreviewPdfDocumentFooterDetails,
  buildPreviewPdfDocumentFooterLabels,
  buildPreviewPdfLineDetailLabels,
  resolvePreviewPdfShippingAddressText,
} from '@/features/quotation/utils/build-preview-pdf-footer-details';
import { useWindoDefinitionOptions } from '@/features/windo-profil-demir-vida-management/hooks/useWindoDefinitionOptions';
import { useShippingAddresses } from '../hooks/useShippingAddresses';
import type { CreateOrderSchema } from '../schemas/order-schema';
import type { OrderGetDto, OrderLineFormState } from '../types/order-types';
import type { QuotationNotesDto } from '@/features/quotation/types/quotation-types';
import { quotationNotesDtoToNotesList } from '@/features/quotation/utils/quotation-payload-mapper';

interface OrderPdfExportCustomer {
  name?: string | null;
  phone?: string | null;
  phone2?: string | null;
  email?: string | null;
}

interface UseOrderPdfExportPreviewParams {
  lines: OrderLineFormState[];
  orderFormSlice: CreateOrderSchema['order'];
  currencyCode: string;
  customerOptions: QuotationCustomerLabelOption[];
  selectedCustomer?: OrderPdfExportCustomer | null;
  order?: OrderGetDto | null;
  orderId?: number;
  quotationNotes?: QuotationNotesDto;
  detailShareFileName?: string;
  emptyLinesToastTitle?: string;
}

interface UseOrderPdfExportPreviewReturn {
  pdfExportOpen: boolean;
  setPdfExportOpen: (open: boolean) => void;
  openPdfExportPreview: () => void;
  buildExportPdfBlob: (options: { draft: boolean }) => Promise<Blob>;
  buildPreviewPdfBlob: (options?: { draft?: boolean }) => Promise<Blob>;
  shareFileName: string;
  handleModalShareWhatsapp: (pdfBlob: Blob) => void;
  handleModalShareMail: (pdfBlob: Blob) => void;
  reportBuiltInTemplates: Array<{
    id: string;
    title: string;
    isDefault: boolean;
    generate: () => Promise<Blob>;
  }>;
  renderPdfExportDialogs: () => ReactElement;
}

export function useOrderPdfExportPreview({
  lines,
  orderFormSlice,
  currencyCode,
  customerOptions,
  selectedCustomer,
  order,
  orderId = 0,
  quotationNotes = {},
  detailShareFileName,
  emptyLinesToastTitle,
}: UseOrderPdfExportPreviewParams): UseOrderPdfExportPreviewReturn {
  const { t, i18n } = useTranslation('order');
  const branch = useAuthStore((state) => state.branch);
  const { profilMap, demirMap, vidaMap, baskiMap, koliBaskiMap } = useWindoDefinitionOptions();
  const previewCustomerId = orderFormSlice.potentialCustomerId ?? order?.potentialCustomerId ?? undefined;
  const { data: shippingAddresses = [] } = useShippingAddresses(
    previewCustomerId != null && previewCustomerId > 0 ? previewCustomerId : undefined,
  );

  const [pdfExportOpen, setPdfExportOpen] = useState(false);
  const [whatsappShareOpen, setWhatsappShareOpen] = useState(false);
  const [mailProviderPickerOpen, setMailProviderPickerOpen] = useState(false);
  const [googleMailOpen, setGoogleMailOpen] = useState(false);
  const [outlookMailOpen, setOutlookMailOpen] = useState(false);
  const [pendingSharePdfBlob, setPendingSharePdfBlob] = useState<Blob | null>(null);

  const shareFileName = detailShareFileName ?? t('exportPreview.downloadFileName');
  const defaultShareFileName = t('exportPreview.downloadFileName');

  const nativeShareLabels = useMemo(
    () => ({
      phoneRequired: t('shareWhatsappDialog.phoneRequired'),
      emailRequired: t('share.nativeEmailRequired'),
      emailInvalid: t('share.nativeEmailInvalid'),
      shareOpened: t('share.nativeOpened'),
      whatsappFallback: t('share.nativeWhatsappFallback'),
      mailFallback: t('share.nativeMailFallback'),
      mailSentApi: t('share.nativeMailSentApi'),
      mailSendFailed: t('share.nativeMailSendFailed'),
      shareFailed: t('exportPreview.error'),
      shareCancelled: t('cancel'),
    }),
    [t],
  );

  const { openWhatsappPrep, openMailPrep, prepDialog } = useQuotationNativeSharePrep({
    labels: nativeShareLabels,
  });

  const buildPreviewPdfBlob = useCallback(
    async (options?: { draft?: boolean }): Promise<Blob> => {
      const oc = orderFormSlice;
      const customerLabel =
        (await resolveQuotationCustomerLabelForPdf({
          potentialCustomerId: oc.potentialCustomerId,
          erpCustomerCode: oc.erpCustomerCode,
          potentialCustomerName: order?.potentialCustomerName,
          customerFromApi: selectedCustomer,
          customerOptions,
        })) || t('pdfExportTemplate.notSpecified');

      const koliBaskiId = oc.koliBaskiDefinitionId ?? order?.koliBaskiDefinitionId ?? null;
      const koliBaskiName =
        order?.koliBaskiDefinitionName?.trim()
        || (koliBaskiId != null && koliBaskiId > 0 ? koliBaskiMap[koliBaskiId] : null)
        || null;

      const footerDetails = buildPreviewPdfDocumentFooterDetails(
        {
          koliBaskiName,
          description: oc.description ?? order?.description ?? null,
          structuredNotes: quotationNotesDtoToNotesList(quotationNotes),
          shippingAddressText: resolvePreviewPdfShippingAddressText({
            shippingAddressId: oc.shippingAddressId ?? order?.shippingAddressId ?? null,
            shippingAddressText: order?.shippingAddressText ?? null,
            shippingAddresses,
          }),
        },
        buildPreviewPdfDocumentFooterLabels(t),
      );
      const lineDetailLabels = buildPreviewPdfLineDetailLabels(t);

      return buildOrderPreviewPdfBlob({
        lines,
        currencyCode,
        locale: i18n.language,
        offerDate: oc.offerDate ?? order?.offerDate ?? null,
        offerNo: oc.offerNo ?? order?.offerNo ?? null,
        customerName: customerLabel,
        branchName: branch?.name?.trim() || t('pdfExportTemplate.notSpecified'),
        branchCode: branch?.code?.trim() || branch?.id?.trim() || null,
        generalDiscountRate: oc.generalDiscountRate ?? order?.generalDiscountRate ?? null,
        generalDiscountAmount: oc.generalDiscountAmount ?? order?.generalDiscountAmount ?? null,
        labels: buildOrderPreviewPdfLabels(t),
        footerDetails,
        lineDetailLabels,
        lineDetailMaps: { profilMap, demirMap, vidaMap, baskiMap },
        draft: options?.draft ?? false,
      });
    },
    [
      orderFormSlice,
      order,
      customerOptions,
      selectedCustomer,
      t,
      i18n.language,
      lines,
      currencyCode,
      branch,
      profilMap,
      demirMap,
      vidaMap,
      baskiMap,
      koliBaskiMap,
      quotationNotes,
      shippingAddresses,
    ],
  );

  const buildExportPdfBlob = useCallback(
    async ({ draft }: { draft: boolean }): Promise<Blob> => buildPreviewPdfBlob({ draft }),
    [buildPreviewPdfBlob],
  );

  const reportBuiltInTemplates = useMemo(
    () => [
      {
        id: 'v3rii-order-preview',
        title: t('pdfExportTemplate.builtInTemplateTitle'),
        isDefault: true,
        generate: () => buildPreviewPdfBlob({ draft: false }),
      },
    ],
    [buildPreviewPdfBlob, t],
  );

  const openPdfExportPreview = useCallback((): void => {
    if (lines.length === 0) {
      toast.error(emptyLinesToastTitle ?? t('create.error'), {
        description: t('lines.required'),
      });
      return;
    }
    setPdfExportOpen(true);
  }, [lines.length, t, emptyLinesToastTitle]);

  const mailShareContext = useMemo<QuotationMailShareContext | null>(() => {
    if (!isIntegratedOrderShare) return null;
    if (!order && orderId <= 0) {
      if (!pendingSharePdfBlob && !mailProviderPickerOpen && !googleMailOpen && !outlookMailOpen) {
        return null;
      }
      const oc = orderFormSlice;
      return {
        recordId: 0,
        customerId: oc.potentialCustomerId,
        customerName: selectedCustomer?.name ?? null,
        customerCode: oc.erpCustomerCode,
        recordNo: oc.offerNo,
        attachmentFile: pendingSharePdfBlob ? blobToFile(pendingSharePdfBlob, shareFileName) : null,
        autoAttachPdfOnOpen: false,
      };
    }

    if (
      !order
      || (!mailProviderPickerOpen && !googleMailOpen && !outlookMailOpen && !pendingSharePdfBlob)
    ) {
      return null;
    }

    const oc = orderFormSlice;

    if (pendingSharePdfBlob) {
      return {
        recordId: order.id,
        customerId: oc.potentialCustomerId ?? order.potentialCustomerId,
        contactId: order.contactId,
        customerName: order.potentialCustomerName ?? selectedCustomer?.name,
        customerCode: oc.erpCustomerCode ?? order.erpCustomerCode,
        recordNo: oc.offerNo ?? order.offerNo,
        revisionNo: order.revisionNo,
        totalAmountDisplay: order.grandTotalDisplay ?? undefined,
        validUntil: order.validUntil,
        recordOwnerName: order.representativeName,
        attachmentFile: blobToFile(pendingSharePdfBlob, shareFileName),
        autoAttachPdfOnOpen: false,
      };
    }

    return {
      recordId: order.id,
      customerId: order.potentialCustomerId,
      contactId: order.contactId,
      customerName: order.potentialCustomerName,
      customerCode: order.erpCustomerCode,
      recordNo: order.offerNo,
      revisionNo: order.revisionNo,
      totalAmountDisplay: order.grandTotalDisplay ?? undefined,
      validUntil: order.validUntil,
      recordOwnerName: order.representativeName,
      autoAttachPdfOnOpen: true,
    };
  }, [
    order,
    orderId,
    mailProviderPickerOpen,
    googleMailOpen,
    outlookMailOpen,
    pendingSharePdfBlob,
    orderFormSlice,
    selectedCustomer?.name,
    shareFileName,
  ]);

  const handleModalShareWhatsapp = useCallback(
    (pdfBlob: Blob): void => {
      const customerId = orderFormSlice.potentialCustomerId ?? order?.potentialCustomerId;
      if (!customerId || customerId <= 0) {
        toast.error(t('shareWhatsappDialog.customerRequired'));
        return;
      }

      if (isIntegratedOrderShare) {
        setPendingSharePdfBlob(pdfBlob);
        setWhatsappShareOpen(true);
        return;
      }

      openWhatsappPrep({
        pdfBlob,
        fileName: orderId > 0 ? shareFileName : defaultShareFileName,
        customerId,
        contactId: order?.contactId,
        customerPhone: selectedCustomer?.phone,
        customerPhone2: selectedCustomer?.phone2,
        message: t('share.whatsappMessage'),
      });
    },
    [
      orderFormSlice.potentialCustomerId,
      order,
      orderId,
      shareFileName,
      defaultShareFileName,
      selectedCustomer,
      openWhatsappPrep,
      t,
    ],
  );

  const handleModalShareMail = useCallback(
    (pdfBlob: Blob): void => {
      const customerId = orderFormSlice.potentialCustomerId ?? order?.potentialCustomerId;
      if (!customerId || customerId <= 0) {
        toast.error(t('shareMailDialog.customerRequired'));
        return;
      }

      if (isIntegratedOrderShare) {
        setPendingSharePdfBlob(pdfBlob);
        setMailProviderPickerOpen(true);
        return;
      }

      openMailPrep({
        pdfBlob,
        fileName: orderId > 0 ? shareFileName : defaultShareFileName,
        customerId,
        contactId: order?.contactId,
        recordId: orderId > 0 ? orderId : 0,
        customerEmail: selectedCustomer?.email,
        subject: t('share.mailSubject'),
        body: t('share.mailBody'),
      });
    },
    [
      orderFormSlice.potentialCustomerId,
      order,
      orderId,
      shareFileName,
      defaultShareFileName,
      selectedCustomer,
      openMailPrep,
      t,
    ],
  );

  const renderPdfExportDialogs = useCallback((): ReactElement => {
    const watchedCustomerId = orderFormSlice.potentialCustomerId ?? order?.potentialCustomerId;

    return (
      <>
        <QuotationPdfExportPreviewDialog
          open={pdfExportOpen}
          onOpenChange={setPdfExportOpen}
          buildPdfBlob={buildExportPdfBlob}
          fileName={orderId > 0 ? shareFileName : defaultShareFileName}
          labels={{
            title: t('exportPreview.title'),
            subtitle: t('exportPreview.subtitle'),
            close: t('exportPreview.close'),
            loading: t('exportPreview.loading'),
            error: t('exportPreview.error'),
            download: t('exportPreview.download'),
            errorDismiss: t('exportPreview.errorDismiss'),
            shareWhatsapp: t('shareWhatsapp'),
            shareMail: t('shareMail'),
          }}
          onShareWhatsapp={handleModalShareWhatsapp}
          onShareMail={handleModalShareMail}
        />

        {prepDialog}

        {isIntegratedOrderShare ? (
          <>
            <QuotationWhatsappSendDialog
              open={whatsappShareOpen}
              onOpenChange={setWhatsappShareOpen}
              pdfBlob={pendingSharePdfBlob}
              fileName={orderId > 0 ? shareFileName : defaultShareFileName}
              customerId={watchedCustomerId}
              customerName={selectedCustomer?.name ?? order?.potentialCustomerName}
              defaultPhone={resolveCustomerPhone(selectedCustomer?.phone, selectedCustomer?.phone2)}
              defaultMessage={t('share.whatsappMessage')}
            />

            <QuotationMailShareDialogs
              providerPickerOpen={mailProviderPickerOpen}
              onProviderPickerOpenChange={setMailProviderPickerOpen}
              googleMailOpen={googleMailOpen}
              onGoogleMailOpenChange={setGoogleMailOpen}
              outlookMailOpen={outlookMailOpen}
              onOutlookMailOpenChange={setOutlookMailOpen}
              shareContext={mailShareContext}
            />
          </>
        ) : null}
      </>
    );
  }, [
    pdfExportOpen,
    buildExportPdfBlob,
    orderId,
    shareFileName,
    defaultShareFileName,
    t,
    handleModalShareWhatsapp,
    handleModalShareMail,
    prepDialog,
    whatsappShareOpen,
    pendingSharePdfBlob,
    orderFormSlice.potentialCustomerId,
    order,
    selectedCustomer,
    mailProviderPickerOpen,
    googleMailOpen,
    outlookMailOpen,
    mailShareContext,
  ]);

  return {
    pdfExportOpen,
    setPdfExportOpen,
    openPdfExportPreview,
    buildExportPdfBlob,
    buildPreviewPdfBlob,
    shareFileName,
    handleModalShareWhatsapp,
    handleModalShareMail,
    reportBuiltInTemplates,
    renderPdfExportDialogs,
  };
}

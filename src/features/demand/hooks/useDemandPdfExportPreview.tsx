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
import { isIntegratedDemandShare } from '../config/demand-share-config';
import { buildDemandPreviewPdfBlob } from '../utils/build-demand-preview-pdf';
import { buildDemandPreviewPdfLabels } from '../utils/build-demand-preview-pdf-labels';
import {
  buildPreviewPdfDocumentFooterDetails,
  buildPreviewPdfDocumentFooterLabels,
  buildPreviewPdfLineDetailLabels,
  buildPreviewPdfLineDiscountLabels,
  previewPdfLineHasDiscount,
  previewPdfHasGeneralDiscount,
  resolvePreviewPdfPaymentTypeName,
  resolvePreviewPdfShippingAddressText,
} from '@/features/quotation/utils/build-preview-pdf-footer-details';
import { usePrefetchLineImagesForPdf } from '@/features/quotation/hooks/usePrefetchLineImagesForPdf';
import { useWindoDefinitionOptions } from '@/features/windo-profil-demir-vida-management/hooks/useWindoDefinitionOptions';
import { usePaymentTypes } from '../hooks/usePaymentTypes';
import { useShippingAddresses } from '../hooks/useShippingAddresses';
import type { CreateDemandSchema } from '../schemas/demand-schema';
import type { DemandGetDto, DemandLineFormState } from '../types/demand-types';
import type { QuotationNotesDto } from '@/features/quotation/types/quotation-types';

interface DemandPdfExportCustomer {
  name?: string | null;
  phone?: string | null;
  phone2?: string | null;
  email?: string | null;
}

interface UseDemandPdfExportPreviewParams {
  lines: DemandLineFormState[];
  demandFormSlice: CreateDemandSchema['demand'];
  currencyCode: string;
  customerOptions: QuotationCustomerLabelOption[];
  selectedCustomer?: DemandPdfExportCustomer | null;
  demand?: DemandGetDto | null;
  demandId?: number;
  quotationNotes?: QuotationNotesDto;
  detailShareFileName?: string;
  emptyLinesToastTitle?: string;
  asDraft?: boolean;
}

interface UseDemandPdfExportPreviewReturn {
  pdfExportOpen: boolean;
  setPdfExportOpen: (open: boolean) => void;
  openPdfExportPreview: () => void;
  buildExportPdfBlob: (options: { draft: boolean; showDiscount?: boolean; hideVat?: boolean }) => Promise<Blob>;
  buildPreviewPdfBlob: (options?: { draft?: boolean; showDiscount?: boolean; hideVat?: boolean }) => Promise<Blob>;
  hasLineDiscounts: boolean;
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

export function useDemandPdfExportPreview({
  lines,
  demandFormSlice,
  currencyCode,
  customerOptions,
  selectedCustomer,
  demand,
  demandId = 0,
  quotationNotes = {},
  detailShareFileName,
  emptyLinesToastTitle,
  asDraft = false,
}: UseDemandPdfExportPreviewParams): UseDemandPdfExportPreviewReturn {
  const { t, i18n } = useTranslation('demand');
  const branch = useAuthStore((state) => state.branch);
  const { profilMap, demirMap, vidaMap, baskiMap, koliBaskiMap } = useWindoDefinitionOptions();
  const { data: paymentTypes = [] } = usePaymentTypes();
  const previewCustomerId = demandFormSlice.potentialCustomerId ?? demand?.potentialCustomerId ?? undefined;
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

  const hasLineDiscounts = useMemo(
    () => lines.some((line) => previewPdfLineHasDiscount(line)),
    [lines],
  );

  usePrefetchLineImagesForPdf(lines);

  const hasGeneralDiscount = useMemo(() => {
    const dc = demandFormSlice;
    return previewPdfHasGeneralDiscount(
      dc.generalDiscountRate ?? demand?.generalDiscountRate ?? null,
      dc.generalDiscountAmount ?? demand?.generalDiscountAmount ?? null,
    );
  }, [demandFormSlice, demand]);

  const defaultShowDiscountDetails = hasLineDiscounts || hasGeneralDiscount;

  const buildPreviewPdfBlob = useCallback(
    async (options?: { draft?: boolean; showDiscount?: boolean; hideVat?: boolean }): Promise<Blob> => {
      const dc = demandFormSlice;
      const customerLabel =
        (await resolveQuotationCustomerLabelForPdf({
          potentialCustomerId: dc.potentialCustomerId,
          erpCustomerCode: dc.erpCustomerCode,
          potentialCustomerName: demand?.potentialCustomerName,
          customerFromApi: selectedCustomer,
          customerOptions,
        })) || t('pdfExportTemplate.notSpecified');

      const koliBaskiId = dc.koliBaskiDefinitionId ?? demand?.koliBaskiDefinitionId ?? null;
      const koliBaskiName =
        demand?.koliBaskiDefinitionName?.trim()
        || (koliBaskiId != null && koliBaskiId > 0 ? koliBaskiMap[koliBaskiId] : null)
        || null;
      const paymentTypeName = resolvePreviewPdfPaymentTypeName(
        dc.paymentTypeId ?? demand?.paymentTypeId ?? null,
        demand?.paymentTypeName ?? null,
        paymentTypes,
      );

      const footerDetails = buildPreviewPdfDocumentFooterDetails(
        {
          koliBaskiName,
          paymentTypeName,
          description: dc.description ?? demand?.description ?? null,
          quotationNotes,
          shippingAddressText: resolvePreviewPdfShippingAddressText({
            shippingAddressId: dc.shippingAddressId ?? demand?.shippingAddressId ?? null,
            shippingAddressText: demand?.shippingAddressText ?? null,
            shippingAddresses,
          }),
        },
        buildPreviewPdfDocumentFooterLabels(t, 'demand'),
      );
      const lineDetailLabels = buildPreviewPdfLineDetailLabels(t);
      const lineDiscountLabels = buildPreviewPdfLineDiscountLabels(t);
      const showDiscount = options?.showDiscount ?? defaultShowDiscountDetails;

      return buildDemandPreviewPdfBlob({
        lines,
        currencyCode,
        locale: i18n.language,
        offerDate: dc.offerDate ?? demand?.offerDate ?? null,
        offerNo: dc.offerNo ?? demand?.offerNo ?? null,
        customerName: customerLabel,
        branchName: branch?.name?.trim() || t('pdfExportTemplate.notSpecified'),
        branchCode: demand?.requestBranchCode?.trim() || branch?.code?.trim() || null,
        generalDiscountRate: dc.generalDiscountRate ?? demand?.generalDiscountRate ?? null,
        generalDiscountAmount: dc.generalDiscountAmount ?? demand?.generalDiscountAmount ?? null,
        labels: buildDemandPreviewPdfLabels(t),
        footerDetails,
        lineDetailLabels,
        lineDetailMaps: { profilMap, demirMap, vidaMap, baskiMap },
        lineDiscountLabels,
        showDiscount,
        draft: options?.draft ?? false,
        hideVat: options?.hideVat ?? false,
      });
    },
    [
      demandFormSlice,
      demand,
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
      paymentTypes,
      quotationNotes,
      shippingAddresses,
      defaultShowDiscountDetails,
    ],
  );

  const buildExportPdfBlob = useCallback(
    async ({ draft, showDiscount, hideVat }: { draft: boolean; showDiscount?: boolean; hideVat?: boolean }): Promise<Blob> =>
      buildPreviewPdfBlob({ draft, showDiscount, hideVat }),
    [buildPreviewPdfBlob],
  );

  const reportBuiltInTemplates = useMemo(
    () => [
      {
        id: 'v3rii-demand-preview',
        title: t('pdfExportTemplate.builtInTemplateTitle'),
        isDefault: true,
        generate: () => buildPreviewPdfBlob({
          draft: asDraft,
          showDiscount: defaultShowDiscountDetails,
        }),
      },
    ],
    [asDraft, buildPreviewPdfBlob, defaultShowDiscountDetails, t],
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
    if (!isIntegratedDemandShare) return null;
    if (!demand && demandId <= 0) {
      if (!pendingSharePdfBlob && !mailProviderPickerOpen && !googleMailOpen && !outlookMailOpen) {
        return null;
      }
      const dc = demandFormSlice;
      return {
        recordId: 0,
        customerId: dc.potentialCustomerId,
        customerName: selectedCustomer?.name ?? null,
        customerCode: dc.erpCustomerCode,
        recordNo: dc.offerNo,
        attachmentFile: pendingSharePdfBlob ? blobToFile(pendingSharePdfBlob, shareFileName) : null,
        autoAttachPdfOnOpen: false,
      };
    }

    if (
      !demand
      || (!mailProviderPickerOpen && !googleMailOpen && !outlookMailOpen && !pendingSharePdfBlob)
    ) {
      return null;
    }

    const dc = demandFormSlice;

    if (pendingSharePdfBlob) {
      return {
        recordId: demand.id,
        customerId: dc.potentialCustomerId ?? demand.potentialCustomerId,
        contactId: demand.contactId,
        customerName: demand.potentialCustomerName ?? selectedCustomer?.name,
        customerCode: dc.erpCustomerCode ?? demand.erpCustomerCode,
        recordNo: dc.offerNo ?? demand.offerNo,
        revisionNo: demand.revisionNo,
        totalAmountDisplay: demand.grandTotalDisplay ?? undefined,
        validUntil: demand.validUntil,
        recordOwnerName: demand.representativeName,
        attachmentFile: blobToFile(pendingSharePdfBlob, shareFileName),
        autoAttachPdfOnOpen: false,
      };
    }

    return {
      recordId: demand.id,
      customerId: demand.potentialCustomerId,
      contactId: demand.contactId,
      customerName: demand.potentialCustomerName,
      customerCode: demand.erpCustomerCode,
      recordNo: demand.offerNo,
      revisionNo: demand.revisionNo,
      totalAmountDisplay: demand.grandTotalDisplay ?? undefined,
      validUntil: demand.validUntil,
      recordOwnerName: demand.representativeName,
      autoAttachPdfOnOpen: true,
    };
  }, [
    demand,
    demandId,
    mailProviderPickerOpen,
    googleMailOpen,
    outlookMailOpen,
    pendingSharePdfBlob,
    demandFormSlice,
    selectedCustomer?.name,
    shareFileName,
  ]);

  const handleModalShareWhatsapp = useCallback(
    (pdfBlob: Blob): void => {
      const customerId = demandFormSlice.potentialCustomerId ?? demand?.potentialCustomerId;
      if (!customerId || customerId <= 0) {
        toast.error(t('shareWhatsappDialog.customerRequired'));
        return;
      }

      if (isIntegratedDemandShare) {
        setPendingSharePdfBlob(pdfBlob);
        setWhatsappShareOpen(true);
        return;
      }

      openWhatsappPrep({
        pdfBlob,
        fileName: demandId > 0 ? shareFileName : defaultShareFileName,
        customerId,
        contactId: demand?.contactId,
        customerPhone: selectedCustomer?.phone,
        customerPhone2: selectedCustomer?.phone2,
        message: t('share.whatsappMessage'),
      });
    },
    [
      demandFormSlice.potentialCustomerId,
      demand,
      demandId,
      shareFileName,
      defaultShareFileName,
      selectedCustomer,
      openWhatsappPrep,
      t,
    ],
  );

  const handleModalShareMail = useCallback(
    (pdfBlob: Blob): void => {
      const customerId = demandFormSlice.potentialCustomerId ?? demand?.potentialCustomerId;
      if (!customerId || customerId <= 0) {
        toast.error(t('shareMailDialog.customerRequired'));
        return;
      }

      if (isIntegratedDemandShare) {
        setPendingSharePdfBlob(pdfBlob);
        setMailProviderPickerOpen(true);
        return;
      }

      openMailPrep({
        pdfBlob,
        fileName: demandId > 0 ? shareFileName : defaultShareFileName,
        customerId,
        contactId: demand?.contactId,
        recordId: demandId > 0 ? demandId : 0,
        customerEmail: selectedCustomer?.email,
        subject: t('share.mailSubject'),
        body: t('share.mailBody'),
      });
    },
    [
      demandFormSlice.potentialCustomerId,
      demand,
      demandId,
      shareFileName,
      defaultShareFileName,
      selectedCustomer,
      openMailPrep,
      t,
    ],
  );

  const renderPdfExportDialogs = useCallback((): ReactElement => {
    const watchedCustomerId = demandFormSlice.potentialCustomerId ?? demand?.potentialCustomerId;

    return (
      <>
        <QuotationPdfExportPreviewDialog
          open={pdfExportOpen}
          onOpenChange={setPdfExportOpen}
          buildPdfBlob={buildExportPdfBlob}
          asDraft={asDraft}
          hasLineDiscounts={defaultShowDiscountDetails}
          fileName={demandId > 0 ? shareFileName : defaultShareFileName}
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
            showDiscount: t('exportPreview.showDiscount'),
            hideVat: t('exportPreview.hideVat'),
          }}
          onShareWhatsapp={handleModalShareWhatsapp}
          onShareMail={handleModalShareMail}
        />

        {prepDialog}

        {isIntegratedDemandShare ? (
          <>
            <QuotationWhatsappSendDialog
              open={whatsappShareOpen}
              onOpenChange={setWhatsappShareOpen}
              pdfBlob={pendingSharePdfBlob}
              fileName={demandId > 0 ? shareFileName : defaultShareFileName}
              customerId={watchedCustomerId}
              customerName={selectedCustomer?.name ?? demand?.potentialCustomerName}
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
    asDraft,
    defaultShowDiscountDetails,
    demandId,
    shareFileName,
    defaultShareFileName,
    t,
    handleModalShareWhatsapp,
    handleModalShareMail,
    prepDialog,
    whatsappShareOpen,
    pendingSharePdfBlob,
    demandFormSlice.potentialCustomerId,
    demand,
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
    hasLineDiscounts,
    shareFileName,
    handleModalShareWhatsapp,
    handleModalShareMail,
    reportBuiltInTemplates,
    renderPdfExportDialogs,
  };
}

import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRightLeft,
  Building2,
  Calculator,
  Calendar,
  CreditCard,
  FileText,
  Hash,
  Image,
  Layers,
  Link2,
  Package,
  Percent,
  Plus,
  Save,
  Send,
  ShieldCheck,
  ShoppingCart,
  StickyNote,
  Trash2,
  Wallet,
} from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { VoiceSearchCombobox } from '@/components/shared/VoiceSearchCombobox';
import { ProductSelectDialog, type ProductSelectionResult } from '@/components/shared/ProductSelectDialog';
import {
  DocumentApprovalFlowReportView,
  type DocumentApprovalFlowReport,
} from '@/components/shared/DocumentApprovalFlowReportView';
import type { IntegratedSupplierOption } from '@/features/purchase/hooks/useIntegratedSupplierSearch';
import type { ApiResponse } from '@/types/api';
import { areDiscountRatesValid, getDiscountRateTotal } from '@/lib/discount-rate-validation';
import { calculateLineTotalsAmounts } from '@/lib/line-discount-display';
import { getImageUrl } from '@/lib/image-url';
import { useDocumentFieldLabelMap } from '@/features/document-field-labels/hooks/useDocumentFieldLabels';
import type { DocumentContextKey } from '@/features/document-field-labels/types/documentFieldLabels';
import { usePaymentTypeOptionsInfinite } from '@/components/shared/dropdown/useDropdownEntityInfinite';
import { useDocumentSerialTypeList } from '@/features/document-serial-type-management/hooks/useDocumentSerialTypeList';
import { PricingRuleType } from '@/features/pricing-rule/types/pricing-rule-types';
import { useErpProjectCodesInfinite } from '@/services/hooks/useErpProjectCodesInfinite';
import { useSpecialCodeExists, useSpecialCodesInfinite } from '@/services/hooks/useSpecialCodesInfinite';
import {
  canApplySpecialCodeDefault,
  getDefaultSpecialCodeForOfferType,
} from '@/lib/sales-document-special-code-defaults';
import {
  createEmptyExchangeRate,
  createEmptyLine,
  formatMoney,
  NOTE_COUNT,
  productToLineMarker,
  purchaseCreateConfigs,
  toNumber,
  type CreatedPurchaseDocument,
  type ExchangeRateForm,
  type PurchaseCreateKind,
  type PurchaseLineForm,
} from '../types/purchase-create-types';
import {
  FieldLabel,
  INPUT_CLASSNAME,
  PurchaseSupplierCombobox,
  SECTION_CARD_CLASSNAME,
  SectionTitle,
} from '../components/PurchaseCreateUi';

interface PurchaseSimpleCreatePageProps {
  kind: PurchaseCreateKind;
}

type PurchaseDocumentDetail = Record<string, unknown> & {
  id?: number;
  status?: string | number;
  notes?: Record<string, string | null | undefined> | null;
  exchangeRates?: Array<Record<string, unknown>>;
  lines?: Array<Record<string, unknown>>;
  purchaseRequestIds?: number[];
};

function parseIdList(value: string, label: string): number[] {
  const tokens = value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

  const ids = tokens.map(Number);
  if (ids.some((item) => !Number.isFinite(item) || item <= 0)) {
    throw new Error(`${label} virgülle ayrılmış pozitif sayılar olmalıdır.`);
  }

  return Array.from(new Set(ids));
}

function getDocumentContext(kind: PurchaseCreateKind): DocumentContextKey {
  if (kind === 'supplierQuotation') return 'supplierQuotation';
  if (kind === 'order') return 'purchaseOrder';
  return 'purchaseRequest';
}

function getPricingRuleType(kind: PurchaseCreateKind): PricingRuleType {
  if (kind === 'supplierQuotation') return PricingRuleType.SupplierQuotation;
  if (kind === 'order') return PricingRuleType.PurchaseOrder;
  return PricingRuleType.PurchaseRequest;
}

function getHeaderNoteLabel(labels: ReturnType<typeof useDocumentFieldLabelMap>, index: number): string {
  return labels[`Note${index + 1}`]?.effectiveLabel || `Not ${index + 1}`;
}

function getHeaderNotePlaceholder(labels: ReturnType<typeof useDocumentFieldLabelMap>, index: number): string {
  return labels[`Note${index + 1}`]?.placeholder || `Belge notu ${index + 1}`;
}

function getLineDescriptionLabel(
  labels: ReturnType<typeof useDocumentFieldLabelMap>,
  fieldKey: 'Description1' | 'Description2' | 'Description3',
): string {
  return labels[fieldKey]?.effectiveLabel || fieldKey.replace('Description', 'Açıklama ');
}

function getLineDescriptionPlaceholder(
  labels: ReturnType<typeof useDocumentFieldLabelMap>,
  fieldKey: 'Description1' | 'Description2' | 'Description3',
): string {
  return labels[fieldKey]?.placeholder || 'Satır bazlı kalem açıklaması';
}

function toDateInput(value: unknown): string {
  if (typeof value !== 'string' || !value) return '';
  return value.slice(0, 10);
}

function nullableText(value: unknown): string {
  if (value == null) return '';
  return String(value);
}

function getStatusNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function canStartPurchaseApproval(kind: PurchaseCreateKind, status: unknown): boolean {
  const statusNumber = getStatusNumber(status);
  if (kind === 'supplierQuotation') {
    return statusNumber == null || statusNumber === 0 || statusNumber === 2;
  }
  if (kind === 'order') {
    return statusNumber == null || statusNumber === 0;
  }
  return false;
}

function getPurchaseDocumentType(kind: PurchaseCreateKind): number | null {
  if (kind === 'supplierQuotation') return 12;
  if (kind === 'order') return 13;
  return null;
}

function notesToForm(notesValue: PurchaseDocumentDetail['notes']): string[] {
  return Array.from({ length: NOTE_COUNT }, (_, index) => {
    const key = `note${index + 1}`;
    const pascalKey = `Note${index + 1}`;
    return nullableText(notesValue?.[key] ?? notesValue?.[pascalKey]);
  });
}

function exchangeRatesToForm(rates: PurchaseDocumentDetail['exchangeRates']): ExchangeRateForm[] {
  const mapped = (rates ?? []).map((rate) => ({
    clientKey: createEmptyExchangeRate().clientKey,
    currency: nullableText(rate.currency ?? rate.Currency),
    exchangeRate: nullableText(rate.exchangeRate ?? rate.ExchangeRate) || '1',
    exchangeRateDate: toDateInput(rate.exchangeRateDate ?? rate.ExchangeRateDate),
    isOfficial: Boolean(rate.isOfficial ?? rate.IsOfficial ?? true),
  }));

  return mapped.length > 0 ? mapped : [createEmptyExchangeRate()];
}

function linesToForm(linesValue: PurchaseDocumentDetail['lines']): PurchaseLineForm[] {
  const mapped = (linesValue ?? []).map((line) => ({
    clientKey: createEmptyLine().clientKey,
    stockId: nullableText(line.stockId ?? line.StockId),
    purchaseRequestLineId: nullableText(line.purchaseRequestLineId ?? line.PurchaseRequestLineId),
    supplierQuotationLineId: nullableText(line.supplierQuotationLineId ?? line.SupplierQuotationLineId),
    productCode: nullableText(line.productCode ?? line.ProductCode),
    productName: nullableText(line.productName ?? line.ProductName),
    quantity: nullableText(line.quantity ?? line.Quantity) || '1',
    unit: nullableText(line.unit ?? line.Unit),
    unitPrice: nullableText(line.unitPrice ?? line.UnitPrice) || '0',
    vatRate: nullableText(line.vatRate ?? line.VatRate) || '20',
    discount1: nullableText(line.discount1 ?? line.Discount1) || '0',
    discount2: nullableText(line.discount2 ?? line.Discount2) || '0',
    discount3: nullableText(line.discount3 ?? line.Discount3) || '0',
    deliveryDate: toDateInput(line.deliveryDate ?? line.DeliveryDate),
    description1: nullableText(line.description1 ?? line.Description1),
    description2: nullableText(line.description2 ?? line.Description2),
    description3: nullableText(line.description3 ?? line.Description3),
    imagePath: nullableText(line.imagePath ?? line.ImagePath),
    erpProjectCode: nullableText(line.erpProjectCode ?? line.ErpProjectCode),
  }));

  return mapped.length > 0 ? mapped : [createEmptyLine()];
}

export function PurchaseSimpleCreatePage({ kind }: PurchaseSimpleCreatePageProps) {
  const navigate = useNavigate();
  const { id: routeId } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const config = purchaseCreateConfigs[kind];
  const isRequest = kind === 'request';
  const documentId = routeId ? Number(routeId) : null;
  const isEditMode = Number.isFinite(documentId) && documentId != null && documentId > 0;
  const loadedDocumentRef = useRef<number | null>(null);
  const [documentNo, setDocumentNo] = useState('');
  const [revisionNo, setRevisionNo] = useState('');
  const [documentDate, setDocumentDate] = useState('');
  const [validUntil, setValidUntil] = useState('');
  const [headerDeliveryDate, setHeaderDeliveryDate] = useState('');
  const [supplierId, setSupplierId] = useState('');
  const [selectedSupplier, setSelectedSupplier] = useState<IntegratedSupplierOption | null>(null);
  const [purchaseRequestIdsText, setPurchaseRequestIdsText] = useState('');
  const [supplierQuotationId, setSupplierQuotationId] = useState('');
  const [currencyCode, setCurrencyCode] = useState('TL');
  const [exchangeRate, setExchangeRate] = useState('1');
  const [paymentTypeId, setPaymentTypeId] = useState('');
  const [documentSerialTypeId, setDocumentSerialTypeId] = useState('');
  const [purchaseType, setPurchaseType] = useState('');
  const [deliveryTerms, setDeliveryTerms] = useState('');
  const [paymentTerms, setPaymentTerms] = useState('');
  const [department, setDepartment] = useState('');
  const [projectCode, setProjectCode] = useState('');
  const [erpProjectCode, setErpProjectCode] = useState('');
  const [ozelKod1, setOzelKod1] = useState('');
  const [ozelKod2, setOzelKod2] = useState('');
  const [generalDiscountRate, setGeneralDiscountRate] = useState('0');
  const [generalDiscountAmount, setGeneralDiscountAmount] = useState('0');
  const [description, setDescription] = useState('');
  const [notes, setNotes] = useState<string[]>(() => Array.from({ length: NOTE_COUNT }, () => ''));
  const [exchangeRates, setExchangeRates] = useState<ExchangeRateForm[]>([createEmptyExchangeRate()]);
  const [lines, setLines] = useState<PurchaseLineForm[]>([createEmptyLine()]);
  const [productDialogOpen, setProductDialogOpen] = useState(false);
  const [targetLineIndex, setTargetLineIndex] = useState<number | null>(null);
  const [paymentTypeSearchTerm, setPaymentTypeSearchTerm] = useState('');
  const [documentSerialSearchTerm, setDocumentSerialSearchTerm] = useState('');
  const [projectSearchTerm, setProjectSearchTerm] = useState('');
  const [headerProjectSearchTerm, setHeaderProjectSearchTerm] = useState('');
  const [ozelKod1SearchTerm, setOzelKod1SearchTerm] = useState('');
  const [ozelKod2SearchTerm, setOzelKod2SearchTerm] = useState('');
  const specialCodeManualChangeRef = useRef({ ozelKod1: false, ozelKod2: false });
  const documentContext = getDocumentContext(kind);
  const headerFieldLabels = useDocumentFieldLabelMap(documentContext, 'HeaderNote');
  const lineDescriptionLabels = useDocumentFieldLabelMap(documentContext, 'LineDescription');
  const pricingRuleType = getPricingRuleType(kind);
  const paymentTypeDropdown = usePaymentTypeOptionsInfinite(paymentTypeSearchTerm, !isRequest);
  const specialCode1Dropdown = useSpecialCodesInfinite(1, ozelKod1SearchTerm, !isRequest);
  const specialCode2Dropdown = useSpecialCodesInfinite(2, ozelKod2SearchTerm, !isRequest);
  const defaultSpecialCode = getDefaultSpecialCodeForOfferType(purchaseType);
  const specialCode1DefaultExists = useSpecialCodeExists(1, defaultSpecialCode, !isRequest);
  const headerProjectDropdown = useErpProjectCodesInfinite(headerProjectSearchTerm, !isRequest);
  const lineProjectDropdown = useErpProjectCodesInfinite(projectSearchTerm, true);
  const { data: documentSerialTypesPage, isLoading: isDocumentSerialTypesLoading } = useDocumentSerialTypeList({
    pageNumber: 1,
    pageSize: 20,
    search: documentSerialSearchTerm,
    sortBy: 'SerialPrefix',
    sortDirection: 'asc',
    filters: [{ column: 'ruleType', operator: 'eq', value: String(pricingRuleType) }],
  });
  const documentSerialOptions = useMemo(
    () =>
      (documentSerialTypesPage?.data ?? []).map((item) => ({
        value: String(item.id),
        label: [
          item.serialPrefix || `#${item.id}`,
          item.serialLength ? `${item.serialLength} hane` : null,
          item.serialCurrent != null ? `Son: ${item.serialCurrent}` : null,
        ].filter(Boolean).join(' - '),
      })),
    [documentSerialTypesPage?.data],
  );

  const detailQuery = useQuery({
    queryKey: ['purchase', kind, 'detail', documentId],
    enabled: isEditMode,
    queryFn: async () => {
      const response = await api.get<ApiResponse<PurchaseDocumentDetail>>(`${config.endpoint}/${documentId}`);
      if (!response.success || !response.data) {
        throw new Error(response.message || 'Satınalma kaydı yüklenemedi.');
      }
      return response.data;
    },
    staleTime: 30_000,
  });

  const approvalReportQuery = useQuery({
    queryKey: ['purchase', kind, 'approval-flow-report', documentId],
    enabled: isEditMode && !isRequest,
    queryFn: async () => {
      const response = await api.get<ApiResponse<DocumentApprovalFlowReport>>(`${config.endpoint}/${documentId}/approval-flow-report`);
      if (!response.success || !response.data) {
        throw new Error(response.message || 'Satınalma onay akışı yüklenemedi.');
      }
      return response.data;
    },
    staleTime: 30_000,
  });

  const startApprovalMutation = useMutation({
    mutationFn: async () => {
      const documentType = getPurchaseDocumentType(kind);
      if (!documentId || !documentType) {
        throw new Error('Onaya gönderilecek satınalma kaydı bulunamadı.');
      }

      const response = await api.post<ApiResponse<boolean>>(`${config.endpoint}/start-approval-flow`, {
        entityId: documentId,
        documentType,
        totalAmount: totals.grandTotal,
      });

      if (!response.success) {
        throw new Error(response.message || 'Satınalma kaydı onaya gönderilemedi.');
      }

      return response;
    },
    onSuccess: () => {
      toast.success('Satınalma kaydı onaya gönderildi.');
      void queryClient.invalidateQueries({ queryKey: ['purchase', kind] });
      void queryClient.invalidateQueries({ queryKey: ['purchase', kind, 'detail', documentId] });
      void queryClient.invalidateQueries({ queryKey: ['purchase', kind, 'approval-flow-report', documentId] });
      void detailQuery.refetch();
      void approvalReportQuery.refetch();
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Satınalma kaydı onaya gönderilemedi.');
    },
  });

  useEffect(() => {
    const document = detailQuery.data;
    if (!document || !documentId || loadedDocumentRef.current === documentId) return;

    setDocumentNo(nullableText(document[config.numberField]));
    setRevisionNo(nullableText(document.revisionNo ?? document.RevisionNo));
    setDocumentDate(toDateInput(document[config.dateField]));
    setValidUntil(toDateInput(document.validUntil ?? document.ValidUntil));
    setHeaderDeliveryDate(toDateInput(document.deliveryDate ?? document.DeliveryDate));
    setSupplierId(nullableText(document.supplierId ?? document.SupplierId));
    setSelectedSupplier(
      document.supplierId || document.SupplierId
        ? {
            id: Number(document.supplierId ?? document.SupplierId),
            customerCode: nullableText(document.supplierErpCode ?? document.SupplierErpCode),
            name: nullableText(document.supplierNameSnapshot ?? document.SupplierNameSnapshot),
          }
        : null,
    );
    setPurchaseRequestIdsText((document.purchaseRequestIds ?? []).join(', '));
    setSupplierQuotationId(nullableText(document.supplierQuotationId ?? document.SupplierQuotationId));
    setCurrencyCode(nullableText(document.currencyCode ?? document.CurrencyCode) || 'TL');
    setExchangeRate(nullableText(document.exchangeRate ?? document.ExchangeRate) || '1');
    setPaymentTypeId(nullableText(document.paymentTypeId ?? document.PaymentTypeId));
    setDocumentSerialTypeId(nullableText(document.documentSerialTypeId ?? document.DocumentSerialTypeId));
    setPurchaseType(nullableText(document.purchaseType ?? document.PurchaseType));
    setDeliveryTerms(nullableText(document.deliveryTerms ?? document.DeliveryTerms));
    setPaymentTerms(nullableText(document.paymentTerms ?? document.PaymentTerms));
    setDepartment(nullableText(document.department ?? document.Department));
    setProjectCode(nullableText(document.projectCode ?? document.ProjectCode));
    setErpProjectCode(nullableText(document.erpProjectCode ?? document.ErpProjectCode));
    setOzelKod1(nullableText(document.ozelKod1 ?? document.OzelKod1));
    setOzelKod2(nullableText(document.ozelKod2 ?? document.OzelKod2));
    setGeneralDiscountRate(nullableText(document.generalDiscountRate ?? document.GeneralDiscountRate) || '0');
    setGeneralDiscountAmount(nullableText(document.generalDiscountAmount ?? document.GeneralDiscountAmount) || '0');
    setDescription(nullableText(document.description ?? document.Description));
    setNotes(notesToForm(document.notes));
    setExchangeRates(exchangeRatesToForm(document.exchangeRates));
    setLines(linesToForm(document.lines));
    specialCodeManualChangeRef.current = {
      ozelKod1: Boolean(document.ozelKod1 ?? document.OzelKod1),
      ozelKod2: Boolean(document.ozelKod2 ?? document.OzelKod2),
    };
    loadedDocumentRef.current = documentId;
  }, [config.dateField, config.numberField, detailQuery.data, documentId]);

  useEffect(() => {
    if (isRequest) return;

    if (!ozelKod1) {
      if (!specialCodeManualChangeRef.current.ozelKod2 && ozelKod2 !== '') {
        setOzelKod2('');
      }
      return;
    }

    if (specialCodeManualChangeRef.current.ozelKod2) return;

    const firstChar = ozelKod1.charAt(0).toUpperCase();
    const targetValue = ['I', 'K', 'N'].includes(firstChar) ? firstChar : '';
    if (ozelKod2 !== targetValue) {
      setOzelKod2(targetValue);
    }
  }, [isRequest, ozelKod1, ozelKod2]);

  useEffect(() => {
    if (isRequest || !defaultSpecialCode) return;
    if (specialCodeManualChangeRef.current.ozelKod1) return;
    if (!canApplySpecialCodeDefault(ozelKod1)) return;
    if (specialCode1DefaultExists.data !== true) return;
    if (ozelKod1 !== defaultSpecialCode) {
      setOzelKod1(defaultSpecialCode);
    }
  }, [defaultSpecialCode, isRequest, ozelKod1, specialCode1DefaultExists.data]);

  const visibleLines = useMemo(
    () => lines.filter((line) => line.productName.trim() || line.productCode.trim()),
    [lines]
  );
  const existingLineStockMarkers = useMemo<ProductSelectionResult[]>(
    () =>
      lines
        .filter((line) => line.productCode.trim() || line.productName.trim())
        .map(productToLineMarker),
    [lines],
  );
  const totals = useMemo(() => {
    const lineSummaries = visibleLines.map((line) => {
      const unitPrice = toNumber(line.unitPrice);
      const quantity = toNumber(line.quantity, 1);
      const discountRate1 = Math.min(100, Math.max(0, toNumber(line.discount1)));
      const discountRate2 = Math.min(100, Math.max(0, toNumber(line.discount2)));
      const discountRate3 = Math.min(100, Math.max(0, toNumber(line.discount3)));
      const vatRate = Math.min(100, Math.max(0, toNumber(line.vatRate, 20)));
      return calculateLineTotalsAmounts(unitPrice, quantity, discountRate1, discountRate2, discountRate3, vatRate);
    });
    const netTotal = lineSummaries.reduce((sum, line) => sum + line.lineTotal, 0);
    const discountByRate = netTotal * Math.min(100, Math.max(0, toNumber(generalDiscountRate))) / 100;
    const generalDiscount = Math.min(netTotal, discountByRate + Math.max(0, toNumber(generalDiscountAmount)));
    const discountedNetTotal = Math.max(0, netTotal - generalDiscount);
    const vatTotal = lineSummaries.reduce((sum, line) => sum + line.vatAmount, 0);
    const vatAfterDiscount = netTotal > 0 ? vatTotal * (discountedNetTotal / netTotal) : 0;
    return {
      netTotal,
      lineDiscountTotal: lineSummaries.reduce(
        (sum, line) => sum + line.discountAmount1 + line.discountAmount2 + line.discountAmount3,
        0,
      ),
      generalDiscount,
      vatTotal: vatAfterDiscount,
      grandTotal: discountedNetTotal + vatAfterDiscount,
    };
  }, [generalDiscountAmount, generalDiscountRate, visibleLines]);
  const canStartApproval = isEditMode && !isRequest && canStartPurchaseApproval(kind, detailQuery.data?.status ?? detailQuery.data?.Status);
  const canConvertToOrder =
    isEditMode &&
    kind === 'supplierQuotation' &&
    getStatusNumber(detailQuery.data?.status ?? detailQuery.data?.Status) !== 6;

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = buildPayload();
      const response = isEditMode
        ? await api.put<ApiResponse<CreatedPurchaseDocument>>(`${config.endpoint}/${documentId}`, payload)
        : await api.post<ApiResponse<CreatedPurchaseDocument>>(config.endpoint, payload);
      if (!response.success || !response.data?.id) {
        throw new Error(response.message || (isEditMode ? 'Satınalma kaydı güncellenemedi.' : 'Satınalma kaydı oluşturulamadı.'));
      }
      return response.data.id;
    },
    onSuccess: (id) => {
      toast.success(isEditMode ? 'Satınalma kaydı güncellendi.' : config.successMessage);
      void queryClient.invalidateQueries({ queryKey: ['purchase', kind] });
      void queryClient.invalidateQueries({ queryKey: ['purchase', kind, 'detail', id] });
      if (!isEditMode) {
        navigate(`${config.listPath}?created=${id}`);
      }
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Satınalma kaydı kaydedilemedi.');
    },
  });

  const convertToOrderMutation = useMutation({
    mutationFn: async () => {
      if (!documentId) {
        throw new Error('Siparişe çevrilecek tedarikçi teklifi bulunamadı.');
      }

      const response = await api.post<ApiResponse<CreatedPurchaseDocument>>(
        `${config.endpoint}/${documentId}/convert-to-order`,
        {},
      );

      if (!response.success || !response.data?.id) {
        throw new Error(response.message || 'Tedarikçi teklifi satınalma siparişine dönüştürülemedi.');
      }

      return response.data.id;
    },
    onSuccess: (purchaseOrderId) => {
      toast.success('Tedarikçi teklifi satınalma siparişine dönüştürüldü.');
      void queryClient.invalidateQueries({ queryKey: ['purchase', 'supplierQuotation'] });
      void queryClient.invalidateQueries({ queryKey: ['purchase', 'order'] });
      navigate(`/purchase/orders/${purchaseOrderId}`);
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Tedarikçi teklifi satınalma siparişine dönüştürülemedi.');
    },
  });

  const buildPayload = () => {
    if (!visibleLines.length) {
      throw new Error('En az bir satır girilmelidir.');
    }
    if (!isRequest && !selectedSupplier) {
      throw new Error('Tedarikçi seçimi zorunludur. Yalnızca ERP’ye entegre, cari kodu dolu müşteriler seçilebilir.');
    }
    const invalidDiscountLineIndex = visibleLines.findIndex((line) => !areDiscountRatesValid({
      discountRate1: toNumber(line.discount1),
      discountRate2: toNumber(line.discount2),
      discountRate3: toNumber(line.discount3),
    }));
    if (invalidDiscountLineIndex >= 0) {
      throw new Error(`${invalidDiscountLineIndex + 1}. satırdaki kademeli iskonto efektif %100 değerine ulaşamaz.`);
    }
    if (!isRequest && currencyCode.trim().toUpperCase() !== 'TL' && toNumber(exchangeRate, 0) <= 0) {
      throw new Error('TL dışındaki satınalma belgelerinde kur 0 olamaz.');
    }
    if (validUntil && documentDate && validUntil < documentDate) {
      throw new Error('Geçerlilik tarihi belge tarihinden önce olamaz.');
    }
    if (headerDeliveryDate && documentDate && headerDeliveryDate < documentDate) {
      throw new Error('Teslim tarihi belge tarihinden önce olamaz.');
    }
    if (paymentTypeId && !Number.isFinite(Number(paymentTypeId))) {
      throw new Error('Ödeme tipi ID sayısal olmalıdır.');
    }
    if (documentSerialTypeId && !Number.isFinite(Number(documentSerialTypeId))) {
      throw new Error('Belge seri ID sayısal olmalıdır.');
    }
    if (supplierQuotationId && !Number.isFinite(Number(supplierQuotationId))) {
      throw new Error('Bağlı tedarikçi teklif ID sayısal olmalıdır.');
    }
    const purchaseRequestIds = parseIdList(purchaseRequestIdsText, 'Bağlı satınalma talep ID bilgisi');

    const mappedLines = visibleLines.map((line) => {
      if (toNumber(line.quantity, 0) <= 0) {
        throw new Error(`${line.productName || line.productCode || 'Satır'} için miktar 0'dan büyük olmalıdır.`);
      }
      if (line.stockId && !Number.isFinite(Number(line.stockId))) {
        throw new Error(`${line.productName || line.productCode || 'Satır'} stok ID bilgisi sayısal olmalıdır.`);
      }
      if (line.purchaseRequestLineId && !Number.isFinite(Number(line.purchaseRequestLineId))) {
        throw new Error(`${line.productName || line.productCode || 'Satır'} bağlı talep satır ID bilgisi sayısal olmalıdır.`);
      }
      if (line.supplierQuotationLineId && !Number.isFinite(Number(line.supplierQuotationLineId))) {
        throw new Error(`${line.productName || line.productCode || 'Satır'} bağlı tedarikçi teklif satır ID bilgisi sayısal olmalıdır.`);
      }
      if (line.deliveryDate && documentDate && line.deliveryDate < documentDate) {
        throw new Error(`${line.productName || line.productCode || 'Satır'} teslim tarihi belge tarihinden önce olamaz.`);
      }
      const baseLine = {
        purchaseRequestLineId: line.purchaseRequestLineId ? Number(line.purchaseRequestLineId) : undefined,
        stockId: line.stockId ? Number(line.stockId) : undefined,
        productCode: line.productCode.trim() || null,
        productName: line.productName.trim(),
        quantity: toNumber(line.quantity, 1),
        unit: line.unit.trim() || null,
        deliveryDate: line.deliveryDate || null,
        description1: line.description1.trim() || null,
        description2: line.description2.trim() || null,
        description3: line.description3.trim() || null,
        imagePath: line.imagePath.trim() || null,
        erpProjectCode: line.erpProjectCode.trim() || null,
      };

      if (isRequest) {
        return baseLine;
      }

      return {
        ...baseLine,
        ...(kind === 'order' && line.supplierQuotationLineId
          ? { supplierQuotationLineId: Number(line.supplierQuotationLineId) }
          : {}),
        unitPrice: toNumber(line.unitPrice),
        discount1: toNumber(line.discount1),
        discount2: toNumber(line.discount2),
        discount3: toNumber(line.discount3),
        vatRate: toNumber(line.vatRate, 20),
      };
    });

    const mappedNotes = notes.reduce<Record<string, string | null>>((acc, note, index) => {
      acc[`note${index + 1}`] = note.trim() || null;
      return acc;
    }, {});

    return {
      [config.numberField]: documentNo.trim() || null,
      revisionNo: revisionNo.trim() || null,
      [config.dateField]: documentDate || null,
      validUntil: kind === 'supplierQuotation' ? validUntil || null : undefined,
      deliveryDate: kind === 'order' ? headerDeliveryDate || null : undefined,
      purchaseRequestIds: isRequest ? undefined : purchaseRequestIds,
      supplierQuotationId: kind === 'order' && supplierQuotationId ? Number(supplierQuotationId) : undefined,
      supplierId: isRequest ? undefined : selectedSupplier?.id,
      supplierNameSnapshot: isRequest ? undefined : selectedSupplier?.name ?? null,
      supplierErpCode: isRequest ? undefined : selectedSupplier?.customerCode ?? null,
      paymentTypeId: isRequest || !paymentTypeId ? undefined : Number(paymentTypeId),
      documentSerialTypeId: isRequest || !documentSerialTypeId ? undefined : Number(documentSerialTypeId),
      purchaseType: isRequest ? undefined : purchaseType.trim() || null,
      deliveryTerms: isRequest ? undefined : deliveryTerms.trim() || null,
      paymentTerms: isRequest ? undefined : paymentTerms.trim() || null,
      currencyCode: isRequest ? undefined : currencyCode.trim() || 'TL',
      exchangeRate: isRequest ? undefined : toNumber(exchangeRate, 1),
      generalDiscountRate: isRequest ? undefined : toNumber(generalDiscountRate),
      generalDiscountAmount: isRequest ? undefined : toNumber(generalDiscountAmount),
      department: department.trim() || null,
      projectCode: projectCode.trim() || null,
      erpProjectCode: isRequest ? undefined : erpProjectCode.trim() || null,
      ozelKod1: isRequest ? undefined : ozelKod1.trim() || null,
      ozelKod2: isRequest ? undefined : ozelKod2.trim() || null,
      description: description.trim() || null,
      notes: isRequest ? undefined : mappedNotes,
      exchangeRates: isRequest
        ? undefined
        : exchangeRates
          .filter((rate) => rate.currency.trim())
          .map((rate) => ({
            currency: rate.currency.trim(),
            exchangeRate: toNumber(rate.exchangeRate, 1),
            exchangeRateDate: rate.exchangeRateDate || new Date().toISOString(),
            isOfficial: rate.isOfficial,
          })),
      lines: mappedLines,
    };
  };

  const updateLine = (index: number, patch: Partial<PurchaseLineForm>) => {
    setLines((current) => current.map((line, lineIndex) => (lineIndex === index ? { ...line, ...patch } : line)));
  };

  const applySelectedProductToLine = (product: ProductSelectionResult, preferredIndex: number | null) => {
    setLines((current) => {
      const nextLine: PurchaseLineForm = {
        ...createEmptyLine(),
        stockId: product.id != null ? String(product.id) : '',
        productCode: product.code,
        productName: product.name,
        unit: product.unit || '',
        vatRate: product.vatRate != null ? String(product.vatRate) : '20',
      };

      const targetIndex =
        preferredIndex != null
          ? preferredIndex
          : current.findIndex((line) => !line.productCode.trim() && !line.productName.trim());

      if (targetIndex >= 0 && targetIndex < current.length) {
        return current.map((line, lineIndex) =>
          lineIndex === targetIndex
            ? {
                ...line,
                productCode: product.code,
                productName: product.name,
                stockId: product.id != null ? String(product.id) : line.stockId,
                unit: product.unit || line.unit,
                vatRate: product.vatRate != null ? String(product.vatRate) : line.vatRate,
              }
            : line,
        );
      }

      return [...current, nextLine];
    });
  };

  const handleProductSelect = (product: ProductSelectionResult) => {
    applySelectedProductToLine(product, targetLineIndex);
    setTargetLineIndex(null);
    setProductDialogOpen(false);
  };

  const openProductDialogForLine = (index: number | null) => {
    setTargetLineIndex(index);
    setProductDialogOpen(true);
  };

  const updateExchangeRate = (index: number, patch: Partial<ExchangeRateForm>) => {
    setExchangeRates((current) => current.map((rate, rateIndex) => (rateIndex === index ? { ...rate, ...patch } : rate)));
  };

  return (
    <div className="min-h-screen bg-[var(--crm-page-bg)] px-4 py-6 text-[var(--crm-text-primary)] sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-[1600px] space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-4 pt-2">
          <div className="flex min-w-0 items-center gap-3">
            <Button asChild variant="outline" size="icon" className="h-12 w-12 rounded-[8px] border-slate-300 bg-white shadow-sm dark:border-white/15 dark:bg-[#130d21]">
              <Link to={config.listPath} aria-label="Listeye dön">
                <ArrowLeft className="h-5 w-5" />
              </Link>
            </Button>
            <div className="min-w-0 space-y-1">
              <h1 className="text-3xl font-extrabold tracking-tight text-slate-950 dark:text-white">{config.title}</h1>
              <p className="flex items-center gap-2 text-sm font-semibold text-slate-600 dark:text-slate-400">
                <span className="h-2 w-2 rounded-full bg-[var(--crm-brand-primary)] shadow-[0_0_8px_color-mix(in_srgb,var(--crm-brand-primary)_65%,transparent)]" />
                {config.description}
              </p>
            </div>
          </div>
          <Button
            type="button"
            disabled={saveMutation.isPending || detailQuery.isLoading}
            onClick={() => saveMutation.mutate()}
            className="h-12 min-w-[150px] rounded-[8px] bg-linear-to-r from-[var(--crm-brand-primary)] to-[var(--crm-brand-secondary)] font-black text-white shadow-lg"
          >
            <Save className="mr-2 h-4 w-4" />
            {saveMutation.isPending ? 'Kaydediliyor' : isEditMode ? 'Güncelle' : 'Kaydet'}
          </Button>
          {canConvertToOrder ? (
            <Button
              type="button"
              disabled={convertToOrderMutation.isPending || saveMutation.isPending || detailQuery.isFetching}
              onClick={() => convertToOrderMutation.mutate()}
              className="h-12 min-w-[190px] rounded-[8px] bg-emerald-600 font-black text-white shadow-lg hover:bg-emerald-700"
            >
              <ShoppingCart className="mr-2 h-4 w-4" />
              {convertToOrderMutation.isPending ? 'Çevriliyor' : 'Siparişe Çevir'}
            </Button>
          ) : null}
          {canStartApproval ? (
            <Button
              type="button"
              disabled={startApprovalMutation.isPending || saveMutation.isPending || detailQuery.isFetching}
              onClick={() => startApprovalMutation.mutate()}
              className="h-12 min-w-[160px] rounded-[8px] bg-blue-600 font-black text-white shadow-lg hover:bg-blue-700"
            >
              <Send className="mr-2 h-4 w-4" />
              {startApprovalMutation.isPending ? 'Gönderiliyor' : 'Onaya Gönder'}
            </Button>
          ) : null}
        </header>

        {detailQuery.isError ? (
          <div className="rounded-[8px] border border-red-300 bg-red-50 px-4 py-3 text-sm font-bold text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">
            {detailQuery.error instanceof Error ? detailQuery.error.message : 'Satınalma kaydı yüklenemedi.'}
          </div>
        ) : null}

        {detailQuery.isLoading ? (
          <div className="rounded-[8px] border border-slate-300 bg-white px-4 py-3 text-sm font-bold text-slate-600 shadow-sm dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-300">
            Satınalma kaydı yükleniyor...
          </div>
        ) : null}

        <div className="grid grid-cols-1 gap-8 xl:grid-cols-[1fr_360px]">
          <main className="space-y-6">
            <section className={SECTION_CARD_CLASSNAME}>
              <SectionTitle index={1} icon={FileText} title="Başlık Bilgileri" />
              <div className="space-y-5 p-5">
                <div className="rounded-2xl border border-slate-300 bg-white p-4 shadow-sm dark:border-white/12 dark:bg-[#100b1a]/80">
                  <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
                    <label className="space-y-2">
                      <FieldLabel
                        required={!isRequest}
                        help="Satınalma teklifi ve siparişi mevcut müşteri/cari kartından seçilen ERP entegre tedarikçi ile açılır. Cari kodu olmayan kayıt tedarikçi olarak kullanılamaz."
                      >
                        <Building2 className="h-4 w-4" />
                        Tedarikçi
                      </FieldLabel>
                      {isRequest ? (
                        <Input
                          className={INPUT_CLASSNAME}
                          value="Talep/RFQ aşamasında tedarikçi sonra seçilebilir"
                          disabled
                        />
                      ) : (
                        <PurchaseSupplierCombobox
                          value={supplierId}
                          selectedSupplier={selectedSupplier}
                          onSelect={(supplier) => {
                            setSelectedSupplier(supplier);
                            setSupplierId(supplier?.id.toString() ?? '');
                          }}
                        />
                      )}
                    </label>
                    <div className="rounded-[8px] border border-slate-200 bg-slate-50 p-3 text-sm dark:border-white/10 dark:bg-white/[0.04]">
                      <div className="text-[11px] font-black uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        Seçili tedarikçi
                      </div>
                      <div className="mt-1 font-black text-slate-900 dark:text-white">
                        {selectedSupplier?.name ?? (isRequest ? 'Talep tedarikçisiz açılabilir' : 'Henüz seçilmedi')}
                      </div>
                      <div className="text-slate-500 dark:text-slate-400">
                        ERP Cari Kodu: {selectedSupplier?.customerCode ?? '-'}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  <label className="space-y-2">
                    <FieldLabel help="Boş bırakılırsa belge operasyon numaralandırması ile sonradan takip edilebilir.">
                      <Hash className="h-4 w-4" />
                      {config.numberLabel}
                    </FieldLabel>
                    <Input className={INPUT_CLASSNAME} value={documentNo} onChange={(event) => setDocumentNo(event.target.value)} placeholder="Boş bırakılabilir" />
                  </label>
                  <label className="space-y-2">
                    <FieldLabel help="Satış teklif/sipariş ekranındaki revizyon alanı ile aynı amaçla kullanılır. Tedarikçi teklif veya satınalma sipariş revizyonu takip edilir.">
                      <Hash className="h-4 w-4" />
                      Revizyon No
                    </FieldLabel>
                    <Input className={INPUT_CLASSNAME} value={revisionNo} onChange={(event) => setRevisionNo(event.target.value)} placeholder="Opsiyonel" />
                  </label>
                  <label className="space-y-2">
                    <FieldLabel>
                      <Calendar className="h-4 w-4" />
                      {config.dateLabel}
                    </FieldLabel>
                    <Input className={INPUT_CLASSNAME} type="date" value={documentDate} onChange={(event) => setDocumentDate(event.target.value)} />
                  </label>
                  {kind === 'supplierQuotation' ? (
                    <label className="space-y-2">
                      <FieldLabel help="Tedarikçiden gelen fiyatın hangi tarihe kadar geçerli olduğunu gösterir.">
                        <Calendar className="h-4 w-4" />
                        Geçerlilik Tarihi
                      </FieldLabel>
                      <Input className={INPUT_CLASSNAME} type="date" value={validUntil} onChange={(event) => setValidUntil(event.target.value)} />
                    </label>
                  ) : null}
                  {kind === 'order' ? (
                    <label className="space-y-2">
                      <FieldLabel help="Satınalma siparişinin genel teslim tarihidir. Satır teslim tarihi ayrıca ezebilir.">
                        <Calendar className="h-4 w-4" />
                        Genel Teslim Tarihi
                      </FieldLabel>
                      <Input className={INPUT_CLASSNAME} type="date" value={headerDeliveryDate} onChange={(event) => setHeaderDeliveryDate(event.target.value)} />
                    </label>
                  ) : null}
                  <label className="space-y-2">
                    <FieldLabel>
                      <Layers className="h-4 w-4" />
                      Departman
                    </FieldLabel>
                    <Input className={INPUT_CLASSNAME} value={department} onChange={(event) => setDepartment(event.target.value)} placeholder="Opsiyonel" />
                  </label>
                  <label className="space-y-2">
                    <FieldLabel>
                      <Package className="h-4 w-4" />
                      Proje Kodu
                    </FieldLabel>
                    <Input className={INPUT_CLASSNAME} value={projectCode} onChange={(event) => setProjectCode(event.target.value)} placeholder="Opsiyonel" />
                  </label>
                  {!isRequest ? (
                    <>
                      <label className="space-y-2">
                        <FieldLabel help="Bir teklif veya sipariş birden fazla satınalma talebinden oluşabilir. ID değerlerini virgülle ayırarak yazabilirsiniz.">
                          <Link2 className="h-4 w-4" />
                          Bağlı Talep ID'leri
                        </FieldLabel>
                        <Input className={INPUT_CLASSNAME} value={purchaseRequestIdsText} onChange={(event) => setPurchaseRequestIdsText(event.target.value)} placeholder="Örn: 12, 18" />
                      </label>
                      {kind === 'order' ? (
                        <label className="space-y-2">
                          <FieldLabel help="Bu sipariş bir tedarikçi teklifinden dönüştüyse ilgili teklif ID bilgisidir.">
                            <Link2 className="h-4 w-4" />
                            Bağlı Tedarikçi Teklif ID
                          </FieldLabel>
                          <Input className={INPUT_CLASSNAME} value={supplierQuotationId} onChange={(event) => setSupplierQuotationId(event.target.value)} inputMode="numeric" placeholder="Opsiyonel" />
                        </label>
                      ) : null}
                      <label className="space-y-2">
                        <FieldLabel>Satınalma Tipi</FieldLabel>
                        <Input className={INPUT_CLASSNAME} value={purchaseType} onChange={(event) => setPurchaseType(event.target.value)} placeholder="Yurtiçi / Yurtdışı / RFQ" />
                      </label>
                      <label className="space-y-2">
                        <FieldLabel>ERP Proje Kodu</FieldLabel>
                        <VoiceSearchCombobox
                          className={INPUT_CLASSNAME}
                          value={erpProjectCode || null}
                          onSelect={(value) => setErpProjectCode(value ?? '')}
                          options={headerProjectDropdown.options}
                          onDebouncedSearchChange={setHeaderProjectSearchTerm}
                          onFetchNextPage={headerProjectDropdown.fetchNextPage}
                          hasNextPage={headerProjectDropdown.hasNextPage}
                          isLoading={headerProjectDropdown.isLoading}
                          isFetchingNextPage={headerProjectDropdown.isFetchingNextPage}
                          placeholder="ERP proje kodu seçin"
                          searchPlaceholder="Proje kodu veya açıklaması ile ara..."
                        />
                      </label>
                      <label className="space-y-2">
                        <FieldLabel help="Satış belgelerindeki Özel Kod 1 mantığı ile aynı ERP özel kod havuzundan seçilir. Satınalma tipi Yurtiçi/Yurtdışı ise uygun varsayılan kod, kullanıcı elle değiştirmediyse otomatik uygulanır.">
                          Özel Kod 1
                        </FieldLabel>
                        <VoiceSearchCombobox
                          className={INPUT_CLASSNAME}
                          value={ozelKod1 || null}
                          onSelect={(value) => {
                            specialCodeManualChangeRef.current.ozelKod1 = true;
                            setOzelKod1(value ?? '');
                          }}
                          options={specialCode1Dropdown.options}
                          onDebouncedSearchChange={setOzelKod1SearchTerm}
                          onFetchNextPage={specialCode1Dropdown.fetchNextPage}
                          hasNextPage={specialCode1Dropdown.hasNextPage}
                          isLoading={specialCode1Dropdown.isLoading}
                          isFetchingNextPage={specialCode1Dropdown.isFetchingNextPage}
                          placeholder="Özel Kod 1 seçin"
                          searchPlaceholder="Özel kod ara..."
                        />
                      </label>
                      <label className="space-y-2">
                        <FieldLabel help="Özel Kod 1 değerinin ilk karakterinden otomatik türetilir. Kullanıcı elle seçim yaparsa sonraki otomatik değişiklikler bu alanın üzerine yazmaz.">
                          Özel Kod 2
                        </FieldLabel>
                        <VoiceSearchCombobox
                          className={INPUT_CLASSNAME}
                          value={ozelKod2 || null}
                          onSelect={(value) => {
                            specialCodeManualChangeRef.current.ozelKod2 = true;
                            setOzelKod2(value ?? '');
                          }}
                          options={specialCode2Dropdown.options}
                          onDebouncedSearchChange={setOzelKod2SearchTerm}
                          onFetchNextPage={specialCode2Dropdown.fetchNextPage}
                          hasNextPage={specialCode2Dropdown.hasNextPage}
                          isLoading={specialCode2Dropdown.isLoading}
                          isFetchingNextPage={specialCode2Dropdown.isFetchingNextPage}
                          placeholder="Özel Kod 2 seçin"
                          searchPlaceholder="Özel kod ara..."
                        />
                      </label>
                      <label className="space-y-2 xl:col-span-1">
                        <FieldLabel help="Tedarikçi ile anlaşılan teslim şartı. PDF/rapor ve satınalma takibinde kullanılabilir.">Teslim Şartı</FieldLabel>
                        <Input className={INPUT_CLASSNAME} value={deliveryTerms} onChange={(event) => setDeliveryTerms(event.target.value)} placeholder="Örn: Depo teslim, Ex-works" />
                      </label>
                      <label className="space-y-2 xl:col-span-1">
                        <FieldLabel help="Tedarikçi ile anlaşılan ödeme şartı. Ödeme tipi ID'den farklı olarak serbest metin açıklamasıdır.">Ödeme Şartı</FieldLabel>
                        <Input className={INPUT_CLASSNAME} value={paymentTerms} onChange={(event) => setPaymentTerms(event.target.value)} placeholder="Örn: 30 gün vadeli" />
                      </label>
                    </>
                  ) : null}
                </div>

                <label className="space-y-2">
                  <FieldLabel>
                    <StickyNote className="h-4 w-4" />
                    Belge Açıklaması
                  </FieldLabel>
                  <Textarea
                    className="min-h-24 rounded-[8px] border-slate-300 bg-white font-semibold text-slate-900 shadow-sm placeholder:text-slate-400 focus-visible:border-pink-500 focus-visible:ring-pink-200 dark:border-white/15 dark:bg-[#100b1a] dark:text-white"
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    rows={3}
                    placeholder="Satınalma belgesinin tamamını ilgilendiren açıklama"
                  />
                </label>
              </div>
            </section>

            {!isRequest ? (
              <section className={SECTION_CARD_CLASSNAME}>
                <SectionTitle index={2} icon={CreditCard} title="Finans, Kur ve İskonto" />
                <div className="grid gap-5 p-5 lg:grid-cols-[1fr_1.15fr]">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="space-y-2">
                      <FieldLabel required>
                        <Wallet className="h-4 w-4" />
                        Para Birimi
                      </FieldLabel>
                      <Input className={INPUT_CLASSNAME} value={currencyCode} onChange={(event) => setCurrencyCode(event.target.value)} />
                    </label>
                    <label className="space-y-2">
                      <FieldLabel required>
                        <ArrowRightLeft className="h-4 w-4" />
                        Kur
                      </FieldLabel>
                      <Input className={INPUT_CLASSNAME} value={exchangeRate} onChange={(event) => setExchangeRate(event.target.value)} inputMode="decimal" />
                    </label>
                    <label className="space-y-2">
                      <FieldLabel>
                        <CreditCard className="h-4 w-4" />
                        Ödeme Tipi
                      </FieldLabel>
                      <VoiceSearchCombobox
                        className={INPUT_CLASSNAME}
                        value={paymentTypeId || null}
                        onSelect={(value) => setPaymentTypeId(value ?? '')}
                        options={paymentTypeDropdown.options}
                        onDebouncedSearchChange={setPaymentTypeSearchTerm}
                        onFetchNextPage={paymentTypeDropdown.fetchNextPage}
                        hasNextPage={paymentTypeDropdown.hasNextPage}
                        isLoading={paymentTypeDropdown.isLoading}
                        isFetchingNextPage={paymentTypeDropdown.isFetchingNextPage}
                        placeholder="Ödeme tipi seçin"
                        searchPlaceholder="Ödeme tipi ara..."
                      />
                    </label>
                    <label className="space-y-2">
                      <FieldLabel help="Seçilen satınalma belge tipi için tanımlı seri numarasıdır. Şimdilik numara üretimini değiştirmeden yalnızca seçilen seri ID'si API'ye gönderilir.">
                        Belge Seri
                      </FieldLabel>
                      <VoiceSearchCombobox
                        className={INPUT_CLASSNAME}
                        value={documentSerialTypeId || null}
                        onSelect={(value) => setDocumentSerialTypeId(value ?? '')}
                        options={documentSerialOptions}
                        onDebouncedSearchChange={setDocumentSerialSearchTerm}
                        isLoading={isDocumentSerialTypesLoading}
                        placeholder="Belge seri seçin"
                        searchPlaceholder="Seri prefix ile ara..."
                      />
                    </label>
                    <label className="space-y-2">
                      <FieldLabel>
                        <Percent className="h-4 w-4" />
                        Genel İskonto %
                      </FieldLabel>
                      <Input className={INPUT_CLASSNAME} value={generalDiscountRate} onChange={(event) => setGeneralDiscountRate(event.target.value)} inputMode="decimal" />
                    </label>
                    <label className="space-y-2">
                      <FieldLabel>Genel İskonto Tutarı</FieldLabel>
                      <Input className={INPUT_CLASSNAME} value={generalDiscountAmount} onChange={(event) => setGeneralDiscountAmount(event.target.value)} inputMode="decimal" />
                    </label>
                  </div>

                  <div className="rounded-2xl border border-slate-300 bg-slate-50/80 p-4 dark:border-white/12 dark:bg-white/[0.04]">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <div>
                        <h3 className="font-black text-slate-900 dark:text-white">Döviz Kurları</h3>
                        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Belgedeki kur snapshot bilgileri.</p>
                      </div>
                      <Button type="button" variant="outline" onClick={() => setExchangeRates((current) => [...current, createEmptyExchangeRate()])}>
                        <Plus className="mr-2 h-4 w-4" />
                        Kur Ekle
                      </Button>
                    </div>
                    <div className="space-y-3">
                      {exchangeRates.map((rate, index) => (
                        <div key={rate.clientKey} className="grid gap-3 sm:grid-cols-[1fr_1fr_1fr_44px]">
                          <Input className={INPUT_CLASSNAME} value={rate.currency} onChange={(event) => updateExchangeRate(index, { currency: event.target.value })} placeholder="DOLAR / EURO / TL" />
                          <Input className={INPUT_CLASSNAME} value={rate.exchangeRate} onChange={(event) => updateExchangeRate(index, { exchangeRate: event.target.value })} inputMode="decimal" placeholder="Kur" />
                          <Input className={INPUT_CLASSNAME} type="date" value={rate.exchangeRateDate} onChange={(event) => updateExchangeRate(index, { exchangeRateDate: event.target.value })} />
                          <Button type="button" variant="outline" size="icon" onClick={() => setExchangeRates((current) => current.filter((_, rateIndex) => rateIndex !== index))}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </section>
            ) : null}

            <section className={SECTION_CARD_CLASSNAME}>
              <SectionTitle index={isRequest ? 2 : 3} icon={Layers} title="Satırlar" />
              <div className="p-0">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4 dark:border-white/10">
                  <div>
                    <h3 className="font-black text-slate-900 dark:text-white">Satınalma kalemleri</h3>
                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                      Profil, demir, vida ve baskı alanları satınalma ekranında özellikle gösterilmez.
                    </p>
                  </div>
                  <Button type="button" variant="outline" onClick={() => setLines((current) => [...current, createEmptyLine()])}>
                    <Plus className="mr-2 h-4 w-4" />
                    Satır Ekle
                  </Button>
                  <Button type="button" variant="outline" onClick={() => openProductDialogForLine(null)}>
                    <Package className="mr-2 h-4 w-4" />
                    Katalogdan Seç
                  </Button>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-[1280px] w-full border-separate border-spacing-0 text-sm">
                    <thead>
                      <tr className="bg-slate-100 text-left text-[11px] font-black uppercase tracking-wide text-slate-600 dark:bg-white/[0.06] dark:text-slate-300">
                        <th className="w-12 px-4 py-3">#</th>
                        <th className="min-w-[230px] px-3 py-3">Stok Kodu</th>
                        <th className="min-w-[280px] px-3 py-3">Stok / Hizmet Adı</th>
                        <th className="w-28 px-3 py-3">Miktar</th>
                        <th className="w-24 px-3 py-3">Birim</th>
                        {!isRequest ? <th className="w-32 px-3 py-3">Birim Fiyat</th> : null}
                        {!isRequest ? <th className="w-28 px-3 py-3">İsk. 1</th> : null}
                        {!isRequest ? <th className="w-28 px-3 py-3">İsk. 2</th> : null}
                        {!isRequest ? <th className="w-28 px-3 py-3">İsk. 3</th> : null}
                        {!isRequest ? <th className="w-24 px-3 py-3">KDV</th> : null}
                        <th className="w-40 px-3 py-3">Teslim Tarihi</th>
                        {!isRequest ? <th className="w-40 px-3 py-3">Satır Toplam</th> : null}
                        <th className="w-14 px-3 py-3" />
                      </tr>
                    </thead>
                    <tbody>
                      {lines.map((line, index) => {
                        const lineAmounts = calculateLineTotalsAmounts(
                          toNumber(line.unitPrice),
                          toNumber(line.quantity, 1),
                          toNumber(line.discount1),
                          toNumber(line.discount2),
                          toNumber(line.discount3),
                          toNumber(line.vatRate, 20),
                        );
                        const effectiveDiscount = getDiscountRateTotal({
                          discountRate1: toNumber(line.discount1),
                          discountRate2: toNumber(line.discount2),
                          discountRate3: toNumber(line.discount3),
                        });
                        const invalidDiscount = !areDiscountRatesValid({
                          discountRate1: toNumber(line.discount1),
                          discountRate2: toNumber(line.discount2),
                          discountRate3: toNumber(line.discount3),
                        });

                        return (
                          <tr key={line.clientKey} className="align-top odd:bg-white even:bg-slate-50/70 dark:odd:bg-[#100b1a] dark:even:bg-white/[0.03]">
                            <td className="border-b border-slate-200 px-4 py-3 font-black text-slate-500 dark:border-white/10">{index + 1}</td>
                            <td className="border-b border-slate-200 px-3 py-3 dark:border-white/10">
                              <div className="flex gap-2">
                                <Input className={INPUT_CLASSNAME} value={line.productCode} onChange={(event) => updateLine(index, { productCode: event.target.value })} placeholder="Stok kodu" />
                                <Button type="button" variant="outline" size="icon" className="h-12 w-12 shrink-0 rounded-[8px]" onClick={() => openProductDialogForLine(index)}>
                                  <Package className="h-4 w-4" />
                                </Button>
                              </div>
                            </td>
                            <td className="border-b border-slate-200 px-3 py-3 dark:border-white/10">
                              <Input className={INPUT_CLASSNAME} value={line.productName} onChange={(event) => updateLine(index, { productName: event.target.value })} placeholder="Ürün/hizmet adı" />
                            </td>
                            <td className="border-b border-slate-200 px-3 py-3 dark:border-white/10">
                              <Input className={INPUT_CLASSNAME} value={line.quantity} onChange={(event) => updateLine(index, { quantity: event.target.value })} inputMode="decimal" />
                            </td>
                            <td className="border-b border-slate-200 px-3 py-3 dark:border-white/10">
                              <Input className={INPUT_CLASSNAME} value={line.unit} onChange={(event) => updateLine(index, { unit: event.target.value })} placeholder="AD" />
                            </td>
                            {!isRequest ? (
                              <>
                                <td className="border-b border-slate-200 px-3 py-3 dark:border-white/10">
                                  <Input className={INPUT_CLASSNAME} value={line.unitPrice} onChange={(event) => updateLine(index, { unitPrice: event.target.value })} inputMode="decimal" />
                                </td>
                                <td className="border-b border-slate-200 px-3 py-3 dark:border-white/10">
                                  <Input className={INPUT_CLASSNAME} value={line.discount1} onChange={(event) => updateLine(index, { discount1: event.target.value })} inputMode="decimal" />
                                </td>
                                <td className="border-b border-slate-200 px-3 py-3 dark:border-white/10">
                                  <Input className={INPUT_CLASSNAME} value={line.discount2} onChange={(event) => updateLine(index, { discount2: event.target.value })} inputMode="decimal" />
                                </td>
                                <td className="border-b border-slate-200 px-3 py-3 dark:border-white/10">
                                  <Input className={INPUT_CLASSNAME} value={line.discount3} onChange={(event) => updateLine(index, { discount3: event.target.value })} inputMode="decimal" />
                                  {invalidDiscount ? (
                                    <p className="mt-1 text-[11px] font-bold text-red-500">Efektif iskonto %100 olamaz.</p>
                                  ) : (
                                    <p className="mt-1 text-[11px] font-semibold text-slate-400">Efektif %{effectiveDiscount.toFixed(2)}</p>
                                  )}
                                </td>
                                <td className="border-b border-slate-200 px-3 py-3 dark:border-white/10">
                                  <Input className={INPUT_CLASSNAME} value={line.vatRate} onChange={(event) => updateLine(index, { vatRate: event.target.value })} inputMode="decimal" />
                                </td>
                              </>
                            ) : null}
                            <td className="border-b border-slate-200 px-3 py-3 dark:border-white/10">
                              <Input className={INPUT_CLASSNAME} type="date" value={line.deliveryDate} onChange={(event) => updateLine(index, { deliveryDate: event.target.value })} />
                            </td>
                            {!isRequest ? (
                              <td className="border-b border-slate-200 px-3 py-3 font-black text-slate-900 dark:border-white/10 dark:text-white">
                                {formatMoney(lineAmounts.lineGrandTotal, currencyCode)}
                              </td>
                            ) : null}
                            <td className="border-b border-slate-200 px-3 py-3 dark:border-white/10">
                              <Button type="button" variant="outline" size="icon" onClick={() => setLines((current) => current.filter((_, lineIndex) => lineIndex !== index))}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <div className="grid gap-4 border-t border-slate-200 p-5 dark:border-white/10 md:grid-cols-2 xl:grid-cols-4">
                  {lines.map((line, index) => (
                    <div key={`${line.clientKey}-details`} className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 dark:border-white/10 dark:bg-white/[0.04]">
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <span className="text-xs font-black uppercase tracking-wide text-slate-600 dark:text-slate-300">Satır {index + 1} detayları</span>
                        <span className="text-[11px] font-bold text-slate-400">{line.productCode || '-'}</span>
                      </div>
                      <div className="space-y-3">
                        <div className="grid gap-3 sm:grid-cols-2">
                          <label className="space-y-2">
                            <FieldLabel help="Katalogdan seçim yapıldığında otomatik dolar. RII_STOK bağlantısı için API'ye gönderilir.">
                              <Package className="h-4 w-4" />
                              Stok ID
                            </FieldLabel>
                            <Input className={INPUT_CLASSNAME} value={line.stockId} onChange={(event) => updateLine(index, { stockId: event.target.value })} inputMode="numeric" placeholder="Opsiyonel" />
                          </label>
                          <label className="space-y-2">
                            <FieldLabel help="Bu kalem bir satınalma talep satırından geldiyse kaynak satır ID bilgisidir.">
                              <Link2 className="h-4 w-4" />
                              Talep Satır ID
                            </FieldLabel>
                            <Input className={INPUT_CLASSNAME} value={line.purchaseRequestLineId} onChange={(event) => updateLine(index, { purchaseRequestLineId: event.target.value })} inputMode="numeric" placeholder="Opsiyonel" />
                          </label>
                          {kind === 'order' ? (
                            <label className="space-y-2">
                              <FieldLabel help="Bu sipariş kalemi tedarikçi teklif satırından dönüştüyse kaynak satır ID bilgisidir.">
                                <Link2 className="h-4 w-4" />
                                Teklif Satır ID
                              </FieldLabel>
                              <Input className={INPUT_CLASSNAME} value={line.supplierQuotationLineId} onChange={(event) => updateLine(index, { supplierQuotationLineId: event.target.value })} inputMode="numeric" placeholder="Opsiyonel" />
                            </label>
                          ) : null}
                          <label className="space-y-2">
                            <FieldLabel help="Kalem görseli varsa relatif dosya yolu API'ye gönderilir. Profil/demir/vida/baskı alanları bu satınalma formunda özellikle gösterilmez.">
                              <Image className="h-4 w-4" />
                              Görsel Yolu
                            </FieldLabel>
                            <Input className={INPUT_CLASSNAME} value={line.imagePath} onChange={(event) => updateLine(index, { imagePath: event.target.value })} placeholder="/uploads/..." />
                          </label>
                        </div>
                        {line.imagePath.trim() ? (
                          <div className="overflow-hidden rounded-[8px] border border-slate-200 bg-white dark:border-white/10 dark:bg-black/20">
                            <img
                              src={getImageUrl(line.imagePath) ?? line.imagePath}
                              alt={`${line.productName || 'Satınalma kalemi'} görseli`}
                              className="h-32 w-full object-cover"
                              loading="lazy"
                            />
                          </div>
                        ) : null}
                        <label className="space-y-2">
                          <FieldLabel help="Satır bazında ERP proje kodu farklıysa burada seçilir. Boş bırakılırsa başlık proje bilgisi kullanılabilir.">
                            Satır ERP Proje Kodu
                          </FieldLabel>
                          <VoiceSearchCombobox
                            className={INPUT_CLASSNAME}
                            value={line.erpProjectCode || null}
                            onSelect={(value) => updateLine(index, { erpProjectCode: value ?? '' })}
                            options={lineProjectDropdown.options}
                            onDebouncedSearchChange={setProjectSearchTerm}
                            onFetchNextPage={lineProjectDropdown.fetchNextPage}
                            hasNextPage={lineProjectDropdown.hasNextPage}
                            isLoading={lineProjectDropdown.isLoading}
                            isFetchingNextPage={lineProjectDropdown.isFetchingNextPage}
                            placeholder="Satır ERP proje kodu"
                            searchPlaceholder="Proje kodu veya açıklaması ile ara..."
                          />
                        </label>
                        <label className="space-y-2">
                          <FieldLabel help={lineDescriptionLabels.Description1?.helpText ?? 'Satır bazlı üretim/satınalma açıklaması.'}>
                            {getLineDescriptionLabel(lineDescriptionLabels, 'Description1')}
                          </FieldLabel>
                          <Input
                            className={INPUT_CLASSNAME}
                            value={line.description1}
                            onChange={(event) => updateLine(index, { description1: event.target.value })}
                            placeholder={getLineDescriptionPlaceholder(lineDescriptionLabels, 'Description1')}
                          />
                        </label>
                        <label className="space-y-2">
                          <FieldLabel help={lineDescriptionLabels.Description2?.helpText ?? 'Satır Ekalan1 karşılığı olarak kullanılacak açıklama alanı.'}>
                            {getLineDescriptionLabel(lineDescriptionLabels, 'Description2')}
                          </FieldLabel>
                          <Input
                            className={INPUT_CLASSNAME}
                            value={line.description2}
                            onChange={(event) => updateLine(index, { description2: event.target.value })}
                            placeholder={getLineDescriptionPlaceholder(lineDescriptionLabels, 'Description2')}
                          />
                        </label>
                        <label className="space-y-2">
                          <FieldLabel help={lineDescriptionLabels.Description3?.helpText ?? 'Satır bazlı ek açıklama alanı.'}>
                            {getLineDescriptionLabel(lineDescriptionLabels, 'Description3')}
                          </FieldLabel>
                          <Input
                            className={INPUT_CLASSNAME}
                            value={line.description3}
                            onChange={(event) => updateLine(index, { description3: event.target.value })}
                            placeholder={getLineDescriptionPlaceholder(lineDescriptionLabels, 'Description3')}
                          />
                        </label>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {!isRequest ? (
              <section className={SECTION_CARD_CLASSNAME}>
                <SectionTitle index={4} icon={StickyNote} title="Belge Notları" />
                <div className="grid gap-3 p-5 md:grid-cols-3">
                  {notes.map((note, index) => (
                    <label key={index} className="space-y-2">
                      <FieldLabel help={headerFieldLabels[`Note${index + 1}`]?.helpText ?? 'Belge geneli not alanı.'}>
                        {getHeaderNoteLabel(headerFieldLabels, index)}
                      </FieldLabel>
                      <Input
                        className={INPUT_CLASSNAME}
                        value={note}
                        maxLength={100}
                        onChange={(event) => setNotes((current) => current.map((item, itemIndex) => (itemIndex === index ? event.target.value : item)))}
                        placeholder={getHeaderNotePlaceholder(headerFieldLabels, index)}
                      />
                    </label>
                  ))}
                </div>
              </section>
            ) : null}

            {!isRequest && isEditMode ? (
              <section className={SECTION_CARD_CLASSNAME}>
                <SectionTitle index={5} icon={ShieldCheck} title="Onay Akışı" />
                <div className="p-5">
                  <DocumentApprovalFlowReportView
                    translationNamespace="purchase"
                    report={approvalReportQuery.data}
                    isLoading={approvalReportQuery.isLoading}
                    error={approvalReportQuery.error instanceof Error ? approvalReportQuery.error : null}
                    locale="tr-TR"
                  />
                </div>
              </section>
            ) : null}
          </main>

          <aside className="xl:sticky xl:top-6">
            <section className={SECTION_CARD_CLASSNAME}>
              <SectionTitle index={isRequest ? 3 : isEditMode ? 6 : 5} icon={Calculator} title="Özet" />
              <div className="space-y-4 p-5">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/[0.04]">
                  <div className="flex items-center justify-between text-sm font-bold text-slate-500 dark:text-slate-400">
                    <span>Satır Sayısı</span>
                    <span className="text-slate-950 dark:text-white">{visibleLines.length}</span>
                  </div>
                </div>
                {!isRequest ? (
                  <>
                    <div className="space-y-3 text-sm">
                      <div className="flex justify-between gap-4">
                        <span className="font-bold text-slate-500 dark:text-slate-400">Ara Toplam</span>
                        <strong className="text-slate-950 dark:text-white">{formatMoney(totals.netTotal, currencyCode)}</strong>
                      </div>
                      <div className="flex justify-between gap-4">
                        <span className="font-bold text-slate-500 dark:text-slate-400">Satır İskonto</span>
                        <strong className="text-red-600 dark:text-red-400">-{formatMoney(totals.lineDiscountTotal, currencyCode)}</strong>
                      </div>
                      <div className="flex justify-between gap-4">
                        <span className="font-bold text-slate-500 dark:text-slate-400">Genel İskonto</span>
                        <strong className="text-red-600 dark:text-red-400">-{formatMoney(totals.generalDiscount, currencyCode)}</strong>
                      </div>
                      <div className="flex justify-between gap-4">
                        <span className="font-bold text-slate-500 dark:text-slate-400">Toplam KDV</span>
                        <strong className="text-slate-950 dark:text-white">{formatMoney(totals.vatTotal, currencyCode)}</strong>
                      </div>
                    </div>
                    <div className="rounded-2xl border border-[var(--crm-brand-primary)]/30 bg-[var(--crm-brand-primary)]/10 p-4">
                      <div className="text-[11px] font-black uppercase tracking-wide text-[var(--crm-brand-primary)]">Genel Toplam</div>
                      <div className="mt-2 text-2xl font-black text-slate-950 dark:text-white">
                        {formatMoney(totals.grandTotal, currencyCode)}
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm font-semibold text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
                    Satınalma talebi tedarikçisiz ihtiyaç kaydıdır. RFQ ya da tedarikçi teklifine dönüştürülürken tedarikçi ve fiyat bilgisi detaylandırılır.
                  </div>
                )}
                <Button
                  type="button"
                  disabled={saveMutation.isPending || detailQuery.isLoading}
                  onClick={() => saveMutation.mutate()}
                  className="h-12 w-full rounded-[8px] bg-linear-to-r from-[var(--crm-brand-primary)] to-[var(--crm-brand-secondary)] font-black text-white shadow-lg"
                >
                  <Save className="mr-2 h-4 w-4" />
                  {saveMutation.isPending ? 'Kaydediliyor' : isEditMode ? 'Güncelle' : 'Kaydet'}
                </Button>
                {canStartApproval ? (
                  <Button
                    type="button"
                    disabled={startApprovalMutation.isPending || saveMutation.isPending || detailQuery.isFetching}
                    onClick={() => startApprovalMutation.mutate()}
                    className="h-12 w-full rounded-[8px] bg-blue-600 font-black text-white shadow-lg hover:bg-blue-700"
                  >
                    <Send className="mr-2 h-4 w-4" />
                    {startApprovalMutation.isPending ? 'Gönderiliyor' : 'Onaya Gönder'}
                  </Button>
                ) : null}
              </div>
            </section>
          </aside>
        </div>
      </div>
      <ProductSelectDialog
        open={productDialogOpen}
        onOpenChange={(open) => {
          setProductDialogOpen(open);
          if (!open) {
            setTargetLineIndex(null);
          }
        }}
        onSelect={handleProductSelect}
        existingLineStockMarkers={existingLineStockMarkers}
        disableRelatedStocks
      />
    </div>
  );
}

export function PurchaseRequestCreatePage() {
  return <PurchaseSimpleCreatePage kind="request" />;
}

export function SupplierQuotationCreatePage() {
  return <PurchaseSimpleCreatePage kind="supplierQuotation" />;
}

export function SupplierQuotationDetailPage() {
  return <PurchaseSimpleCreatePage kind="supplierQuotation" />;
}

export function PurchaseOrderCreatePage() {
  return <PurchaseSimpleCreatePage kind="order" />;
}

export function PurchaseOrderDetailPage() {
  return <PurchaseSimpleCreatePage kind="order" />;
}

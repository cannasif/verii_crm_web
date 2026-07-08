import { documentSerialTypeApi } from '../api/document-serial-type-api';
import type {
  CustomerDocumentSerialDocumentKind,
  CustomerDocumentSerialUsageRecordDto,
} from '../types/document-serial-type-types';

interface RecordCustomerDocumentSerialUsageParams {
  customerId?: number | null;
  documentKind: CustomerDocumentSerialDocumentKind;
  documentSerialTypeId?: number | null;
  documentId?: number | null;
  documentNo?: string | null;
  requestBranchCode?: string | number | null;
}

export async function recordCustomerDocumentSerialUsageSafely({
  customerId,
  documentKind,
  documentSerialTypeId,
  documentId,
  documentNo,
  requestBranchCode,
}: RecordCustomerDocumentSerialUsageParams): Promise<void> {
  if (!customerId || customerId <= 0 || !documentSerialTypeId || documentSerialTypeId <= 0) return;

  const payload: CustomerDocumentSerialUsageRecordDto = {
    customerId,
    documentKind,
    documentSerialTypeId,
    documentId: documentId && documentId > 0 ? documentId : null,
    documentNo: documentNo?.trim() || null,
    requestBranchCode: requestBranchCode != null && String(requestBranchCode).trim() !== ''
      ? String(requestBranchCode)
      : null,
  };

  try {
    await documentSerialTypeApi.recordCustomerSuggestionUsage(payload);
  } catch (error) {
    console.warn('Customer document serial usage could not be recorded.', error);
  }
}

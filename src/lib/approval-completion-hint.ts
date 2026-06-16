import { useSystemSettingsStore } from '@/stores/system-settings-store';

export type ApprovalCompletionDocumentType = 'demand' | 'quotation' | 'order';

const DEMAND_TOOLTIP_KEY_PREFIX = 'systemSettings.DemandActionTooltips';
const QUOTATION_TOOLTIP_KEY_PREFIX = 'systemSettings.QuotationActionTooltips';
const ORDER_TOOLTIP_KEY_PREFIX = 'systemSettings.OrderActionTooltips';

export function getApprovalCompletionHintKey(
  documentType: ApprovalCompletionDocumentType,
  actionValue: number
): string {
  const prefix =
    documentType === 'demand'
      ? DEMAND_TOOLTIP_KEY_PREFIX
      : documentType === 'quotation'
        ? QUOTATION_TOOLTIP_KEY_PREFIX
        : ORDER_TOOLTIP_KEY_PREFIX;

  return `${prefix}.${actionValue}`;
}

export function useApprovalCompletionActionValue(
  documentType: ApprovalCompletionDocumentType
): number {
  return useSystemSettingsStore((state) => {
    if (documentType === 'demand') {
      return state.settings.demandApprovalCompletionAction;
    }
    if (documentType === 'quotation') {
      return state.settings.quotationApprovalCompletionAction;
    }
    return state.settings.orderApprovalCompletionAction;
  });
}

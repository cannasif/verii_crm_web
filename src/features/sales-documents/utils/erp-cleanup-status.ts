export type ErpCleanupStatus = 0 | 1 | 2;
export type ErpCleanupTone = 'default' | 'warning' | 'danger';

export const ERP_CLEANUP_STATUS = {
  None: 0,
  ErpRecordCleanedAndCopyCreated: 1,
  ErpCleanupFailed: 2,
} as const;

export interface ErpCleanupAwareDocument {
  erpCleanupStatus?: number | null;
  erpCleanupReason?: string | null;
  originalDocumentNumber?: string | null;
}

export function hasErpCleanupInfo(document: ErpCleanupAwareDocument): boolean {
  return Number(document.erpCleanupStatus ?? 0) !== ERP_CLEANUP_STATUS.None;
}

export function getErpCleanupTone(document: ErpCleanupAwareDocument): ErpCleanupTone {
  return Number(document.erpCleanupStatus ?? 0) === ERP_CLEANUP_STATUS.ErpCleanupFailed ? 'danger' : 'warning';
}

export function getErpCleanupLabel(
  document: ErpCleanupAwareDocument,
  translate: (key: string, options?: Record<string, unknown>) => string
): string | null {
  const status = Number(document.erpCleanupStatus ?? 0);

  if (status === ERP_CLEANUP_STATUS.ErpRecordCleanedAndCopyCreated) {
    return translate('common:erpCleanup.status.cleanedForRevision', {
      defaultValue: 'ERP kaydı revizyon için plasiyer tarafından kapatıldı',
    });
  }

  if (status === ERP_CLEANUP_STATUS.ErpCleanupFailed) {
    return translate('common:erpCleanup.status.cleanupFailed', {
      defaultValue: 'ERP kaydı temizlenemedi',
    });
  }

  return null;
}

export function getErpCleanupDescription(
  document: ErpCleanupAwareDocument,
  translate: (key: string, options?: Record<string, unknown>) => string
): string | null {
  if (!hasErpCleanupInfo(document)) return null;

  const label = getErpCleanupLabel(document, translate);
  const reason = document.erpCleanupReason?.trim();
  const originalDocumentNumber = document.originalDocumentNumber?.trim();

  const details = [
    originalDocumentNumber
      ? translate('common:erpCleanup.originalDocumentNumberValue', {
          defaultValue: 'Eski ERP No: {{value}}',
          value: originalDocumentNumber,
        })
      : null,
    reason
      ? translate('common:erpCleanup.reasonValue', {
          defaultValue: 'Neden: {{value}}',
          value: reason,
        })
      : null,
  ].filter(Boolean);

  return [label, ...details].filter(Boolean).join(' · ');
}

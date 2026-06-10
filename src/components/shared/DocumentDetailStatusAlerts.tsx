import { type ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, AlertDescription } from '@/components/ui/alert';

export type DocumentDetailKind = 'quotation' | 'demand' | 'order';

interface DocumentDetailStatusAlertsProps {
  documentKind: DocumentDetailKind;
  status: number;
  isApprovalLockedForCurrentUser: boolean;
  cancellationReason?: string | null;
}

export function DocumentDetailStatusAlerts({
  documentKind,
  status,
  isApprovalLockedForCurrentUser,
  cancellationReason,
}: DocumentDetailStatusAlertsProps): ReactElement {
  const { t } = useTranslation([documentKind, 'approval', 'common']);

  const trimmedReason = cancellationReason?.trim();
  const customerCancelPrefix =
    documentKind === 'order'
      ? t('customerCancel.readOnlyReason', {
          ns: 'order',
          defaultValue: 'Bu sipariş müşteri tarafından iptal edildiği için değişiklik yapılamaz.',
        })
      : t('customerCancel.readOnlyReason', {
          defaultValue:
            documentKind === 'demand'
              ? 'Bu talep müşteri tarafından iptal edildiği için değişiklik yapılamaz.'
              : 'Bu teklif müşteri tarafından iptal edildiği için değişiklik yapılamaz.',
        });

  const reasonLabel =
    documentKind === 'order'
      ? t('customerCancel.reasonLabel', { ns: 'order', defaultValue: 'İptal nedeni' })
      : t('customerCancel.reasonLabel', { defaultValue: 'İptal nedeni' });

  return (
    <div className="mb-4 space-y-3">
      {isApprovalLockedForCurrentUser && (
        <Alert className="border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-800/80 dark:bg-amber-950/30 dark:text-amber-100">
          <AlertDescription>
            {t('approval.lockedForNonApprover', {
              defaultValue:
                'Bu kayıt onay sürecinde. Yalnızca aktif onay kullanıcısı değişiklik yapabilir; sizin için düzenleme kapalı.',
            })}
          </AlertDescription>
        </Alert>
      )}

      {status === 2 && (
        <Alert className="border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-800/80 dark:bg-emerald-950/35 dark:text-emerald-100">
          <AlertDescription>
            {t('approval.approvedReadOnlyReason', {
              defaultValue:
                documentKind === 'quotation'
                  ? 'Bu teklif onaylandığı için değişiklik yapılamaz.'
                  : documentKind === 'demand'
                    ? 'Bu talep onaylandığı için değişiklik yapılamaz.'
                    : 'Bu sipariş onaylandığı için değişiklik yapılamaz.',
            })}
          </AlertDescription>
        </Alert>
      )}

      {status === 3 && (
        <Alert className="border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-800/80 dark:bg-amber-950/30 dark:text-amber-100">
          <AlertDescription>
            {t('approval.rejectedReadOnlyReason', {
              defaultValue:
                documentKind === 'quotation'
                  ? 'Bu teklif reddedildiği için değişiklik yapılamaz. Güncellemek için aşağıdaki "Revize et" butonunu kullanın.'
                  : documentKind === 'demand'
                    ? 'Bu talep reddedildiği için değişiklik yapılamaz. Güncellemek için listeden "Revize et" kullanın.'
                    : 'Bu sipariş reddedildiği için değişiklik yapılamaz. Güncellemek için listeden "Revize et" kullanın.',
            })}
          </AlertDescription>
        </Alert>
      )}

      {status === 4 && (
        <Alert className="border-zinc-300 bg-zinc-100 text-zinc-800 dark:border-zinc-600 dark:bg-zinc-800/50 dark:text-zinc-200">
          <AlertDescription>
            {t('approval.closedReason', {
              defaultValue:
                'Bu kayıt aynı belge numarasında başka bir kayıt onaylandığı için kapatıldı; değişiklik yapılamaz.',
            })}
          </AlertDescription>
        </Alert>
      )}

      {status === 5 && (
        <Alert className="border-rose-400/80 bg-rose-50 text-rose-950 dark:border-rose-800/80 dark:bg-rose-950/40 dark:text-rose-100">
          <AlertDescription>
            {customerCancelPrefix}
            {trimmedReason ? (
              <>
                {' '}
                <span className="font-semibold">{reasonLabel}:</span> {trimmedReason}
              </>
            ) : null}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}

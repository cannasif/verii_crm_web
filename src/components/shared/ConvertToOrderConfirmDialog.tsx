import { type ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface ConvertToOrderConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isPending?: boolean;
}

export function ConvertToOrderConfirmDialog({
  open,
  onOpenChange,
  onConfirm,
  isPending = false,
}: ConvertToOrderConfirmDialogProps): ReactElement {
  const { t } = useTranslation(['quotation', 'common']);

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {t('list.convertToOrderConfirmTitle', { defaultValue: 'Tekrar siparişe aktar' })}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {t('list.convertToOrderConfirmDescription', {
              defaultValue:
                'Bu teklifle daha önce ERP/Netsis entegrasyonu yapılmış bir sipariş oluşturulmuş olabilir. Yine de tekrar siparişe aktarmak istiyor musunuz?',
            })}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>
            {t('common.cancel', { ns: 'common', defaultValue: 'Vazgeç' })}
          </AlertDialogCancel>
          <AlertDialogAction
            disabled={isPending}
            onClick={(event) => {
              event.preventDefault();
              onConfirm();
            }}
            className="bg-linear-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700"
          >
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t('list.convertToOrderPending', { defaultValue: 'Siparişe aktarılıyor...' })}
              </>
            ) : (
              t('list.convertToOrderConfirmAction', { defaultValue: 'Evet, aktar' })
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

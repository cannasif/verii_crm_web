import { type ReactElement, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import type { CustomerDuplicateCandidateDto } from '../types/customerDedupe.types';
import { useMergeCustomersMutation } from '../hooks/useMergeCustomersMutation';
import { MATCH_TYPES } from './ConflictFilters';

export interface MergePreviewDialogProps {
  candidate: CustomerDuplicateCandidateDto;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onMergeSuccess?: () => void;
}

export function MergePreviewDialog({
  candidate,
  open,
  onOpenChange,
  onMergeSuccess,
}: MergePreviewDialogProps): ReactElement {
  const { t } = useTranslation(['customerDedupe']);
  const [preferMasterValues, setPreferMasterValues] = useState(true);
  const mergeMutation = useMergeCustomersMutation();

  const handleConfirm = (): void => {
    mergeMutation.mutate(
      {
        masterCustomerId: candidate.masterCustomerId,
        duplicateCustomerId: candidate.duplicateCustomerId,
        preferMasterValues,
      },
      {
        onSuccess: () => {
          onOpenChange(false);
          onMergeSuccess?.();
        },
      }
    );
  };

  const matchLabel = MATCH_TYPES.includes(candidate.matchType as (typeof MATCH_TYPES)[number])
    ? t(candidate.matchType)
    : candidate.matchType;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('confirmMergeTitle')}</DialogTitle>
          <DialogDescription>{t('confirmMergeDescription')}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="grid gap-2">
            <Label className="text-muted-foreground">{t('masterCustomer')}</Label>
            <div className="font-medium">{candidate.masterCustomerName}</div>
            <div className="text-xs text-muted-foreground">ID: {candidate.masterCustomerId}</div>
          </div>
          <div className="grid gap-2">
            <Label className="text-muted-foreground">{t('duplicateCustomer')}</Label>
            <div className="font-medium">{candidate.duplicateCustomerName}</div>
            <div className="text-xs text-muted-foreground">ID: {candidate.duplicateCustomerId}</div>
          </div>
          <div className="flex items-center gap-2">
            <Label className="text-muted-foreground">{t('matchType')}</Label>
            <Badge variant="secondary">{matchLabel}</Badge>
          </div>
          <div className="flex items-center gap-2">
            <Label className="text-muted-foreground">{t('score')}</Label>
            <Badge>{(candidate.score * 100).toFixed(0)}%</Badge>
          </div>
          <div className="flex items-center justify-between rounded-lg border p-4">
            <Label htmlFor="prefer-master" className="cursor-pointer flex-1">
              {t('preferMasterValues')}
            </Label>
            <Switch
              id="prefer-master"
              checked={preferMasterValues}
              onCheckedChange={setPreferMasterValues}
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={mergeMutation.isPending}
          >
            {t('common:common.cancel', 'Cancel')}
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={mergeMutation.isPending}
          >
            {mergeMutation.isPending ? t('common:common.processing', 'Processing...') : t('merge')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

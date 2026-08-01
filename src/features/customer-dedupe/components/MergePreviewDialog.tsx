import { type ReactElement, useEffect, useState } from 'react';
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
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle, CheckCircle2, Database, Loader2, ShieldAlert } from 'lucide-react';
import type {
  CustomerDuplicateCandidateDto,
  CustomerMergeSnapshotDto,
} from '../types/customerDedupe.types';
import { useMergeCustomersMutation } from '../hooks/useMergeCustomersMutation';
import { useMergePreviewQuery } from '../hooks/useMergePreviewQuery';
import { cn } from '@/lib/utils';

export interface MergePreviewDialogProps {
  candidate: CustomerDuplicateCandidateDto;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onMergeSuccess?: () => void;
}

const relationLabels: Array<[keyof CustomerMergeSnapshotDto['relations'], string]> = [
  ['contacts', 'relationContacts'],
  ['shippingAddresses', 'relationAddresses'],
  ['images', 'relationImages'],
  ['activities', 'relationActivities'],
  ['demands', 'relationDemands'],
  ['quotations', 'relationQuotations'],
  ['orders', 'relationOrders'],
  ['pricingRules', 'relationPricingRules'],
  ['temporaryQuotations', 'relationTemporaryQuotations'],
  ['otherRelations', 'relationOther'],
];

function CustomerCard({
  customer,
  selected,
  recommended,
  onSelect,
}: {
  customer: CustomerMergeSnapshotDto;
  selected: boolean;
  recommended: boolean;
  onSelect: () => void;
}): ReactElement {
  const { t } = useTranslation(['customerDedupe']);
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'rounded-xl border p-4 text-left transition-all',
        selected ? 'border-primary bg-primary/5 ring-2 ring-primary/20' : 'hover:border-primary/40'
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="font-semibold">{customer.customerName}</div>
          <div className="text-xs text-muted-foreground">ID: {customer.customerId}</div>
        </div>
        <div className="flex flex-wrap gap-1">
          {recommended && <Badge variant="secondary">{t('recommended')}</Badge>}
          <Badge variant={customer.isErpRegistered ? 'default' : 'outline'}>
            {customer.isErpRegistered ? t('erpWithCode', { code: customer.customerCode }) : t('potential')}
          </Badge>
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between text-sm">
        <span>{t('completeness')}</span>
        <strong>%{customer.completenessScore}</strong>
      </div>
      <div className="mt-1 h-2 overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-primary" style={{ width: `${customer.completenessScore}%` }} />
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {relationLabels.map(([key, label]) => (
          <Badge key={key} variant="outline" className="font-normal">
            {t(label)}: {customer.relations[key]}
          </Badge>
        ))}
      </div>
      <div className="mt-3 text-xs font-medium text-primary">
        {selected ? t('selectedAsMaster') : t('selectAsMaster')}
      </div>
    </button>
  );
}

export function MergePreviewDialog({
  candidate,
  open,
  onOpenChange,
  onMergeSuccess,
}: MergePreviewDialogProps): ReactElement {
  const { t } = useTranslation(['customerDedupe']);
  const previewQuery = useMergePreviewQuery(
    candidate.masterCustomerId,
    candidate.duplicateCustomerId,
    open
  );
  const mergeMutation = useMergeCustomersMutation();
  const [masterCustomerId, setMasterCustomerId] = useState(candidate.recommendedMasterCustomerId);
  const [fieldSelections, setFieldSelections] = useState<Record<string, number>>({});

  const preview = previewQuery.data;
  useEffect(() => {
    if (!preview) return;
    setMasterCustomerId(preview.recommendedMasterCustomerId);
    setFieldSelections(Object.fromEntries(
      preview.fields.map((field) => [field.field, field.recommendedSourceCustomerId])
    ));
  }, [preview]);

  const handleConfirm = (): void => {
    if (!preview || !preview.canMerge) return;
    const duplicateCustomerId = preview.first.customerId === masterCustomerId
      ? preview.second.customerId
      : preview.first.customerId;
    mergeMutation.mutate(
      {
        masterCustomerId,
        duplicateCustomerId,
        preferMasterValues: true,
        fieldSelections,
      },
      {
        onSuccess: () => {
          onOpenChange(false);
          onMergeSuccess?.();
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] w-[calc(100vw-1rem)] max-w-6xl overflow-y-auto sm:w-[calc(100vw-2rem)]">
        <DialogHeader>
          <DialogTitle>{t('decisionTitle')}</DialogTitle>
          <DialogDescription>{t('decisionDescription')}</DialogDescription>
        </DialogHeader>

        {previewQuery.isLoading && (
          <div className="flex min-h-52 items-center justify-center gap-2 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" /> {t('prepareComparison')}
          </div>
        )}
        {previewQuery.isError && (
          <Alert variant="destructive">
            <ShieldAlert className="h-4 w-4" />
            <AlertTitle>{t('comparisonFailed')}</AlertTitle>
            <AlertDescription>{previewQuery.error.message}</AlertDescription>
          </Alert>
        )}

        {preview && (
          <div className="space-y-5 py-2">
            <Alert>
              <CheckCircle2 className="h-4 w-4" />
              <AlertTitle>{t('smartRecommendation')}</AlertTitle>
              <AlertDescription>{preview.recommendationReason}</AlertDescription>
            </Alert>

            {!preview.canMerge && (
              <Alert variant="destructive">
                <ShieldAlert className="h-4 w-4" />
                <AlertTitle>{t('mergeBlocked')}</AlertTitle>
                <AlertDescription>{preview.blockReason}</AlertDescription>
              </Alert>
            )}

            <section>
              <div className="mb-2 text-sm font-semibold">{t('masterStep')}</div>
              <div className="grid gap-3 lg:grid-cols-2">
                {[preview.first, preview.second].map((customer) => (
                  <CustomerCard
                    key={customer.customerId}
                    customer={customer}
                    selected={masterCustomerId === customer.customerId}
                    recommended={preview.recommendedMasterCustomerId === customer.customerId}
                    onSelect={() => setMasterCustomerId(customer.customerId)}
                  />
                ))}
              </div>
            </section>

            <div className="flex flex-wrap gap-2">
              {preview.matchReasons.map((reason) => <Badge key={reason}>{reason}</Badge>)}
            </div>
            {preview.warnings.map((warning) => (
              <Alert key={warning} className="border-amber-300 bg-amber-50/60 dark:bg-amber-950/20">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <AlertDescription>{warning}</AlertDescription>
              </Alert>
            ))}

            <section>
              <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
                <Database className="h-4 w-4" /> {t('fieldStep')}
              </div>
              <div className="overflow-x-auto rounded-xl border">
                <table className="w-full min-w-[820px] text-sm">
                  <thead className="bg-muted/60 text-left">
                    <tr>
                      <th className="w-44 p-3">{t('field')}</th>
                      <th className="p-3">{preview.first.customerName}</th>
                      <th className="p-3">{preview.second.customerName}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.fields.map((field) => (
                      <tr key={field.field} className={cn('border-t', field.isDifferent && 'bg-amber-50/40 dark:bg-amber-950/10')}>
                        <td className="p-3 font-medium">
                          {t(`fieldLabels.${field.field}`, { defaultValue: field.label })}
                        </td>
                        {[preview.first, preview.second].map((customer, index) => {
                          const value = index === 0 ? field.firstValue : field.secondValue;
                          const selected = fieldSelections[field.field] === customer.customerId;
                          return (
                            <td key={customer.customerId} className="p-2">
                              <button
                                type="button"
                                onClick={() => setFieldSelections((current) => ({ ...current, [field.field]: customer.customerId }))}
                                disabled={!value}
                                className={cn(
                                  'w-full rounded-lg border p-2 text-left transition-colors',
                                  selected && value ? 'border-primary bg-primary/5' : 'border-transparent',
                                  !value && 'cursor-not-allowed text-muted-foreground'
                                )}
                              >
                                <span className="break-words">{value || t('emptyValue')}</span>
                                {selected && value && <span className="ml-2 text-xs font-semibold text-primary">{t('willRemain')}</span>}
                              </button>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={mergeMutation.isPending}>
            {t('common:cancel')}
          </Button>
          <Button onClick={handleConfirm} disabled={!preview?.canMerge || mergeMutation.isPending}>
            {mergeMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {mergeMutation.isPending ? t('common:processing') : t('mergeWithSelections')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

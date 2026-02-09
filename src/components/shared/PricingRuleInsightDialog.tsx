import { type ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Percent, Ruler, Tag } from 'lucide-react';

interface PricingRuleInsight {
  pricingRuleHeaderId?: number | null;
  stokCode: string;
  minQuantity: number;
  maxQuantity?: number | null;
  fixedUnitPrice?: number | null;
  currencyCode?: string | null;
  discountRate1: number;
  discountRate2: number;
  discountRate3: number;
}

interface DiscountLimitInsight {
  erpProductGroupCode?: string | null;
  maxDiscount1: number;
  maxDiscount2?: number | null;
  maxDiscount3?: number | null;
}

interface PricingRuleInsightDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productCode?: string | null;
  activeGroupCode?: string | null;
  rules: PricingRuleInsight[];
  discountLimit?: DiscountLimitInsight | null;
}

export function PricingRuleInsightDialog({
  open,
  onOpenChange,
  productCode,
  activeGroupCode,
  rules,
  discountLimit,
}: PricingRuleInsightDialogProps): ReactElement {
  const { t } = useTranslation();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden p-0 gap-0">
        <DialogHeader className="px-5 py-4 border-b bg-slate-50/60 dark:bg-slate-900/40">
          <DialogTitle className="flex items-center gap-2">
            <Tag className="h-4 w-4 text-pink-500" />
            {t('common.pricingInsights.title', 'Fiyat ve Iskonto Kurallari')}
          </DialogTitle>
          <DialogDescription>
            {t(
              'common.pricingInsights.description',
              'Secili stok icin aktif kural araliklari ve iskonto limitleri'
            )}
          </DialogDescription>
          <div className="flex flex-wrap gap-2 pt-1">
            <Badge variant="outline">
              {t('common.pricingInsights.stock', 'Stok')}: {productCode || '-'}
            </Badge>
            <Badge variant="outline">
              {t('common.pricingInsights.group', 'Grup')}: {activeGroupCode || '-'}
            </Badge>
          </div>
        </DialogHeader>

        <div className="overflow-auto p-5 space-y-5">
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold flex items-center gap-2">
                <Ruler className="h-4 w-4 text-blue-500" />
                {t('common.pricingInsights.rules', 'Kural Araliklari')}
              </h4>
              <Badge>{rules.length}</Badge>
            </div>

            {rules.length === 0 ? (
              <div className="text-sm text-muted-foreground border rounded-lg p-3">
                {t(
                  'common.pricingInsights.noRule',
                  'Bu stok icin eslesen fiyat kurali bulunamadi.'
                )}
              </div>
            ) : (
              <div className="space-y-2">
                {rules.map((rule, index) => (
                  <div key={`${rule.pricingRuleHeaderId ?? 0}-${index}`} className="border rounded-lg p-3 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="secondary">#{rule.pricingRuleHeaderId ?? '-'}</Badge>
                      <Badge variant="outline">
                        {t('common.pricingInsights.range', 'Miktar')}: {rule.minQuantity} - {rule.maxQuantity ?? 'inf'}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                      <div>
                        <span className="text-muted-foreground">{t('common.pricingInsights.fixedPrice', 'Sabit Fiyat')}</span>
                        <div className="font-medium">{rule.fixedUnitPrice ?? '-'}</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">{t('common.pricingInsights.currency', 'Doviz')}</span>
                        <div className="font-medium">{rule.currencyCode ?? '-'}</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">{t('common.pricingInsights.discount1', 'Indirim 1')}</span>
                        <div className="font-medium">%{rule.discountRate1}</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">{t('common.pricingInsights.discount2And3', 'Ind. 2/3')}</span>
                        <div className="font-medium">%{rule.discountRate2} / %{rule.discountRate3}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="space-y-3">
            <h4 className="text-sm font-semibold flex items-center gap-2">
              <Percent className="h-4 w-4 text-amber-500" />
              {t('common.pricingInsights.discountLimit', 'Iskonto Limit Araligi')}
            </h4>

            {!discountLimit ? (
              <div className="text-sm text-muted-foreground border rounded-lg p-3">
                {t(
                  'common.pricingInsights.noLimit',
                  'Bu grup icin tanimli kullanici iskonto limiti bulunamadi.'
                )}
              </div>
            ) : (
              <div className="border rounded-lg p-3 space-y-2">
                <div className="text-sm">
                  <span className="text-muted-foreground">{t('common.pricingInsights.limitGroup', 'Limit Grubu')}:</span>{' '}
                  <span className="font-medium">{discountLimit.erpProductGroupCode || '-'}</span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-sm">
                  <div className="rounded-md border p-2">
                    <div className="text-muted-foreground">{t('common.pricingInsights.discount1', 'Indirim 1')}</div>
                    <div className="font-semibold">%{discountLimit.maxDiscount1}</div>
                  </div>
                  <div className="rounded-md border p-2">
                    <div className="text-muted-foreground">{t('common.pricingInsights.discount2', 'Indirim 2')}</div>
                    <div className="font-semibold">
                      %{discountLimit.maxDiscount2 ?? 0}
                    </div>
                  </div>
                  <div className="rounded-md border p-2">
                    <div className="text-muted-foreground">{t('common.pricingInsights.discount3', 'Indirim 3')}</div>
                    <div className="font-semibold">
                      %{discountLimit.maxDiscount3 ?? 0}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}

import { type ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { QuotationDetailDto } from '../types/approval-types';

interface QuotationDetailViewProps {
  quotation: QuotationDetailDto;
}

export function QuotationDetailView({ quotation }: QuotationDetailViewProps): ReactElement {
  const { t, i18n } = useTranslation(['approval', 'common']);

  const formatCurrency = (amount: number, currency: string): string => {
    return new Intl.NumberFormat(i18n.language, {
      style: 'currency',
      currency: currency || 'TRY',
    }).format(amount);
  };

  const formatDate = (dateString: string | null | undefined): string => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString(i18n.language, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>{t('approval.detail.quotationInfo')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                {t('approval.detail.offerNo')}
              </p>
              <p className="text-sm">{quotation.offerNo || '-'}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                {t('approval.detail.customer')}
              </p>
              <p className="text-sm">{quotation.potentialCustomerName || '-'}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                {t('approval.detail.representative')}
              </p>
              <p className="text-sm">{quotation.representativeName || '-'}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                {t('approval.detail.currency')}
              </p>
              <p className="text-sm">{quotation.currency}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                {t('approval.detail.offerDate')}
              </p>
              <p className="text-sm">{formatDate(quotation.offerDate)}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                {t('approval.detail.deliveryDate')}
              </p>
              <p className="text-sm">{formatDate(quotation.deliveryDate)}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                {t('approval.detail.total')}
              </p>
              <p className="text-sm font-semibold">
                {formatCurrency(quotation.total, quotation.currency)}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                {t('approval.detail.grandTotal')}
              </p>
              <p className="text-sm font-semibold">
                {formatCurrency(quotation.grandTotal, quotation.currency)}
              </p>
            </div>
          </div>
          {quotation.description && (
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                {t('approval.detail.description')}
              </p>
              <p className="text-sm">{quotation.description}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('approval.detail.lines')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('approval.detail.productCode')}</TableHead>
                  <TableHead>{t('approval.detail.productName')}</TableHead>
                  <TableHead className="text-right">
                    {t('approval.detail.quantity')}
                  </TableHead>
                  <TableHead className="text-right">
                    {t('approval.detail.unitPrice')}
                  </TableHead>
                  <TableHead className="text-right">
                    {t('approval.detail.lineTotal')}
                  </TableHead>
                  <TableHead className="text-right">
                    {t('approval.detail.lineGrandTotal')}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {quotation.lines.map((line) => (
                  <TableRow key={line.id}>
                    <TableCell>{line.productCode}</TableCell>
                    <TableCell>{line.productName}</TableCell>
                    <TableCell className="text-right">{line.quantity}</TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(line.unitPrice, quotation.currency)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(line.lineTotal, quotation.currency)}
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      {formatCurrency(line.lineGrandTotal, quotation.currency)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {quotation.exchangeRates && quotation.exchangeRates.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{t('approval.detail.exchangeRates')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('approval.detail.currency')}</TableHead>
                    <TableHead className="text-right">
                      {t('approval.detail.exchangeRate')}
                    </TableHead>
                    <TableHead>{t('approval.detail.exchangeRateDate')}</TableHead>
                    <TableHead>{t('approval.detail.isOfficial')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {quotation.exchangeRates.map((rate) => (
                    <TableRow key={rate.id}>
                      <TableCell>{rate.currency}</TableCell>
                      <TableCell className="text-right">{rate.exchangeRate}</TableCell>
                      <TableCell>{formatDate(rate.exchangeRateDate)}</TableCell>
                      <TableCell>{rate.isOfficial ? t('approval.yes') : t('approval.no')}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

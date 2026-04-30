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
import { formatSystemCurrency, formatSystemDate } from '@/lib/system-settings';

interface QuotationDetailViewProps {
  quotation: QuotationDetailDto;
}

export function QuotationDetailView({ quotation }: QuotationDetailViewProps): ReactElement {
  const { t } = useTranslation(['approval', 'common']);

  const formatCurrency = (amount: number, currency: string): string => {
    return formatSystemCurrency(amount, currency || 'TRY');
  };

  const formatDate = (dateString: string | null | undefined): string => {
    if (!dateString) return '-';
    return formatSystemDate(dateString);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>{t('detail.quotationInfo')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                {t('detail.offerNo')}
              </p>
              <p className="text-sm">{quotation.offerNo || '-'}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                {t('detail.customer')}
              </p>
              <p className="text-sm">{quotation.potentialCustomerName || '-'}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                {t('detail.representative')}
              </p>
              <p className="text-sm">{quotation.representativeName || '-'}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                {t('detail.currency')}
              </p>
              <p className="text-sm">{quotation.currency}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                {t('detail.offerDate')}
              </p>
              <p className="text-sm">{formatDate(quotation.offerDate)}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                {t('detail.deliveryDate')}
              </p>
              <p className="text-sm">{formatDate(quotation.deliveryDate)}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                {t('detail.total')}
              </p>
              <p className="text-sm font-semibold">
                {formatCurrency(quotation.total, quotation.currency)}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                {t('detail.grandTotal')}
              </p>
              <p className="text-sm font-semibold">
                {formatCurrency(quotation.grandTotal, quotation.currency)}
              </p>
            </div>
          </div>
          {quotation.description && (
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                {t('detail.description')}
              </p>
              <p className="text-sm">{quotation.description}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('detail.lines')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('detail.productCode')}</TableHead>
                  <TableHead>{t('detail.productName')}</TableHead>
                  <TableHead className="text-right">
                    {t('detail.quantity')}
                  </TableHead>
                  <TableHead className="text-right">
                    {t('detail.unitPrice')}
                  </TableHead>
                  <TableHead className="text-right">
                    {t('detail.lineTotal')}
                  </TableHead>
                  <TableHead className="text-right">
                    {t('detail.lineGrandTotal')}
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
            <CardTitle>{t('detail.exchangeRates')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('detail.currency')}</TableHead>
                    <TableHead className="text-right">
                      {t('detail.exchangeRate')}
                    </TableHead>
                    <TableHead>{t('detail.exchangeRateDate')}</TableHead>
                    <TableHead>{t('detail.isOfficial')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {quotation.exchangeRates.map((rate) => (
                    <TableRow key={rate.id}>
                      <TableCell>{rate.currency}</TableCell>
                      <TableCell className="text-right">{rate.exchangeRate}</TableCell>
                      <TableCell>{formatDate(rate.exchangeRateDate)}</TableCell>
                      <TableCell>{rate.isOfficial ? t('yes') : t('no')}</TableCell>
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

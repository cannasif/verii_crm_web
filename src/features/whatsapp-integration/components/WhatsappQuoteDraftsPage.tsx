import { Fragment, type ReactElement, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useUIStore } from '@/stores/ui-store';
import { ChevronDown, ChevronRight, Loader2, RefreshCw } from 'lucide-react';
import { useWhatsappQuoteDraftsQuery } from '../hooks/useWhatsappQuoteDraftsQuery';
import type { WhatsappQuoteDraftDto } from '../types/whatsapp-integration.types';

function formatDate(value?: string | null): string {
  if (!value) return '-';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '-';
  return parsed.toLocaleString();
}

function formatMoney(value?: number | null): string {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    maximumFractionDigits: 2,
  }).format(value ?? 0);
}

function customerLabel(draft: WhatsappQuoteDraftDto): string {
  if (draft.customerName?.trim()) return draft.customerName;
  if (draft.contactName?.trim()) return draft.contactName;
  return '-';
}

export function WhatsappQuoteDraftsPage(): ReactElement {
  const { t } = useTranslation(['whatsapp-integration', 'common']);
  const { setPageTitle } = useUIStore();
  const [pageNumber, setPageNumber] = useState(1);
  const [search, setSearch] = useState('');
  const [expandedDraftId, setExpandedDraftId] = useState<number | null>(null);

  const query = useWhatsappQuoteDraftsQuery({
    pageNumber,
    pageSize: 20,
    search,
    sortBy: 'createdDate',
    sortDirection: 'desc',
  });

  useEffect(() => {
    setPageTitle(t('drafts.title'));
    return () => setPageTitle(null);
  }, [setPageTitle, t]);

  const drafts = query.data?.data ?? [];
  const totalCount = query.data?.totalCount ?? 0;
  const hasNext = query.data?.hasNextPage === true;
  const hasPrevious = query.data?.hasPreviousPage === true;

  return (
    <div className="w-full space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{t('drafts.title')}</h1>
        <p className="text-muted-foreground mt-1">{t('drafts.description')}</p>
      </div>

      <Card className="rounded-2xl border-white/60 bg-white/75 shadow-sm backdrop-blur-xl">
        <CardHeader>
          <CardTitle>{t('drafts.tableTitle')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPageNumber(1);
              }}
              placeholder={t('drafts.searchPlaceholder')}
              className="w-full sm:w-80"
            />
            <Button variant="outline" onClick={() => query.refetch()} disabled={query.isFetching}>
              {query.isFetching ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
              {t('common:refresh')}
            </Button>
          </div>

          <div className="overflow-x-auto rounded-xl border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10" />
                  <TableHead>{t('drafts.columns.createdDate')}</TableHead>
                  <TableHead>{t('drafts.columns.phone')}</TableHead>
                  <TableHead>{t('drafts.columns.customer')}</TableHead>
                  <TableHead>{t('drafts.columns.status')}</TableHead>
                  <TableHead className="text-right">{t('drafts.columns.lineCount')}</TableHead>
                  <TableHead className="text-right">{t('drafts.columns.grandTotal')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {query.isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground">
                      <Loader2 className="mx-auto h-5 w-5 animate-spin" />
                    </TableCell>
                  </TableRow>
                ) : drafts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground">
                      {t('drafts.empty')}
                    </TableCell>
                  </TableRow>
                ) : (
                  drafts.map((draft) => {
                    const isExpanded = expandedDraftId === draft.id;
                    return (
                      <Fragment key={draft.id}>
                        <TableRow key={draft.id} className="cursor-pointer" onClick={() => setExpandedDraftId(isExpanded ? null : draft.id)}>
                          <TableCell>
                            {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                          </TableCell>
                          <TableCell className="whitespace-nowrap">{formatDate(draft.createdDate)}</TableCell>
                          <TableCell>{draft.phoneNumber}</TableCell>
                          <TableCell>{customerLabel(draft)}</TableCell>
                          <TableCell>
                            <Badge variant={draft.status === 'WaitingRepresentativeReview' ? 'secondary' : 'default'}>
                              {t(`drafts.status.${draft.status}`, { defaultValue: draft.status })}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">{draft.lines.length}</TableCell>
                          <TableCell className="text-right font-semibold">{formatMoney(draft.grandTotal)}</TableCell>
                        </TableRow>
                        {isExpanded ? (
                          <TableRow key={`${draft.id}-details`}>
                            <TableCell colSpan={7} className="bg-slate-50/80 p-0">
                              <div className="space-y-3 p-4">
                                {draft.customerMessage ? (
                                  <p className="text-sm text-muted-foreground">
                                    <span className="font-medium text-foreground">{t('drafts.customerMessage')}:</span> {draft.customerMessage}
                                  </p>
                                ) : null}
                                <div className="overflow-x-auto rounded-lg border bg-white">
                                  <Table>
                                    <TableHeader>
                                      <TableRow>
                                        <TableHead>{t('drafts.lineColumns.code')}</TableHead>
                                        <TableHead>{t('drafts.lineColumns.name')}</TableHead>
                                        <TableHead className="text-right">{t('drafts.lineColumns.quantity')}</TableHead>
                                        <TableHead className="text-right">{t('drafts.lineColumns.unitPrice')}</TableHead>
                                        <TableHead className="text-right">{t('drafts.lineColumns.total')}</TableHead>
                                        <TableHead>{t('drafts.lineColumns.type')}</TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {draft.lines.map((line) => (
                                        <TableRow key={line.id}>
                                          <TableCell className="font-mono text-xs">{line.productCode}</TableCell>
                                          <TableCell>{line.productName}</TableCell>
                                          <TableCell className="text-right">{line.quantity}</TableCell>
                                          <TableCell className="text-right">{formatMoney(line.unitPrice)}</TableCell>
                                          <TableCell className="text-right">{formatMoney(line.lineGrandTotal)}</TableCell>
                                          <TableCell>
                                            <Badge variant={line.isMandatoryRelatedProduct ? 'outline' : 'default'}>
                                              {line.isMandatoryRelatedProduct ? t('drafts.relatedLine') : t('drafts.mainLine')}
                                            </Badge>
                                          </TableCell>
                                        </TableRow>
                                      ))}
                                    </TableBody>
                                  </Table>
                                </div>
                              </div>
                            </TableCell>
                          </TableRow>
                        ) : null}
                      </Fragment>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>{t('drafts.total', { count: totalCount })}</span>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" disabled={!hasPrevious} onClick={() => setPageNumber((value) => Math.max(1, value - 1))}>
                {t('common:previous')}
              </Button>
              <span>{pageNumber}</span>
              <Button variant="outline" size="sm" disabled={!hasNext} onClick={() => setPageNumber((value) => value + 1)}>
                {t('common:next')}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

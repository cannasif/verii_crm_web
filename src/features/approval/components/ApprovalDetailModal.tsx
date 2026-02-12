import { type ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useQuotationDetail } from '../hooks/useQuotationDetail';
import { useApprovalHistory } from '../hooks/useApprovalHistory';
import { ApprovalActionForm } from './ApprovalActionForm';
import { ApprovalHistoryTimeline } from './ApprovalHistoryTimeline';
import { QuotationDetailView } from './QuotationDetailView';
import { Skeleton } from '@/components/ui/skeleton';
import type { ApprovalQueueGetDto } from '../types/approval-types';
import { ApprovalStatus } from '../types/approval-types';

interface ApprovalDetailModalProps {
  queue: ApprovalQueueGetDto;
  isOpen: boolean;
  onClose: () => void;
}

export function ApprovalDetailModal({
  queue,
  isOpen,
  onClose,
}: ApprovalDetailModalProps): ReactElement {
  const { t } = useTranslation();
  const { data: quotation, isLoading: isLoadingQuotation } = useQuotationDetail(queue.quotationId);
  const { data: history, isLoading: isLoadingHistory } = useApprovalHistory(queue.quotationId);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {t('approval.detail.title')} - {queue.quotationOfferNo || `#${queue.quotationId}`}
          </DialogTitle>
          <DialogDescription>
            {t('approval.detail.subtitle')}
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="detail" className="w-full">
          <TabsList>
            <TabsTrigger value="detail">{t('approval.detail.tabs.detail')}</TabsTrigger>
            <TabsTrigger value="history">{t('approval.detail.tabs.history')}</TabsTrigger>
            {queue.status === ApprovalStatus.Waiting && queue.isCurrent && (
              <TabsTrigger value="action">{t('approval.detail.tabs.action')}</TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="detail" className="space-y-4">
            {isLoadingQuotation ? (
              <Skeleton className="h-64 w-full" />
            ) : quotation ? (
              <QuotationDetailView quotation={quotation} />
            ) : (
              <p>{t('approval.detail.notFound')}</p>
            )}
          </TabsContent>

          <TabsContent value="history" className="space-y-4">
            {isLoadingHistory ? (
              <Skeleton className="h-64 w-full" />
            ) : (
              <ApprovalHistoryTimeline history={history || []} />
            )}
          </TabsContent>

          {queue.status === ApprovalStatus.Waiting && queue.isCurrent && (
            <TabsContent value="action" className="space-y-4">
              <ApprovalActionForm queue={queue} onSuccess={onClose} />
            </TabsContent>
          )}
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

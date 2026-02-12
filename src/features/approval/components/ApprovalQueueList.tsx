import { type ReactElement, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useUIStore } from '@/stores/ui-store';
import { useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { usePendingApprovals } from '../hooks/usePendingApprovals';
import { ApprovalQueueCard } from './ApprovalQueueCard';
import { ApprovalDetailModal } from './ApprovalDetailModal';
import type { ApprovalQueueGetDto } from '../types/approval-types';

export function ApprovalQueueList(): ReactElement {
  const { t } = useTranslation();
  const { setPageTitle } = useUIStore();
  const { data: pendingApprovals, isLoading, error } = usePendingApprovals();
  const [selectedQueue, setSelectedQueue] = useState<ApprovalQueueGetDto | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  useEffect(() => {
    setPageTitle(t('approval.list.title'));
    return () => {
      setPageTitle(null);
    };
  }, [t, setPageTitle]);

  const handleViewDetail = (queue: ApprovalQueueGetDto): void => {
    setSelectedQueue(queue);
    setIsDetailModalOpen(true);
  };

  const handleCloseModal = (): void => {
    setIsDetailModalOpen(false);
    setSelectedQueue(null);
  };

  const handleApprove = (queue: ApprovalQueueGetDto): void => {
    setSelectedQueue(queue);
    setIsDetailModalOpen(true);
  };

  const handleReject = (queue: ApprovalQueueGetDto): void => {
    setSelectedQueue(queue);
    setIsDetailModalOpen(true);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-32 w-full" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-destructive">
            {t('approval.list.error')}
          </p>
        </CardContent>
      </Card>
    );
  }

  if (!pendingApprovals || pendingApprovals.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-center text-muted-foreground">
            {t('approval.list.empty')}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            {t('approval.list.title')}
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {t('approval.list.description')}
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {pendingApprovals.map((queue) => (
          <ApprovalQueueCard
            key={queue.id}
            queue={queue}
            onViewDetail={handleViewDetail}
            onApprove={handleApprove}
            onReject={handleReject}
          />
        ))}
      </div>

      {selectedQueue && (
        <ApprovalDetailModal
          queue={selectedQueue}
          isOpen={isDetailModalOpen}
          onClose={handleCloseModal}
        />
      )}
    </div>
  );
}

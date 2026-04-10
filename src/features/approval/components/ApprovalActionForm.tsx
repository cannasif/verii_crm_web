import { type ReactElement } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { useApproveQuotation } from '../hooks/useApproveQuotation';
import { useRejectQuotation } from '../hooks/useRejectQuotation';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { CheckCircle2, XCircle } from 'lucide-react';
import { approvalNoteSchema, type ApprovalNoteSchema } from '../schemas/approval-schema';
import type { ApprovalQueueGetDto } from '../types/approval-types';

interface ApprovalActionFormProps {
  queue: ApprovalQueueGetDto;
  onSuccess: () => void;
}

export function ApprovalActionForm({ queue, onSuccess }: ApprovalActionFormProps): ReactElement {
  const { t } = useTranslation(['approval', 'common']);
  const approveMutation = useApproveQuotation();
  const rejectMutation = useRejectQuotation();

  const form = useForm<ApprovalNoteSchema>({
    resolver: zodResolver(approvalNoteSchema),
    defaultValues: {
      note: '',
    },
  });

  const handleApprove = async (data: ApprovalNoteSchema): Promise<void> => {
    try {
      const result = await approveMutation.mutateAsync({
        queueId: queue.id,
        note: data.note || undefined,
      });

      if (result.success) {
        toast.success(
          t('approval.approve.success'),
          {
            description: t('approval.approve.successMessage'),
          }
        );
        onSuccess();
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : t('approval.approve.errorMessage');
      toast.error(
        t('approval.approve.error'),
        {
          description: errorMessage,
        }
      );
    }
  };

  const handleReject = async (data: ApprovalNoteSchema): Promise<void> => {
    try {
      const result = await rejectMutation.mutateAsync({
        queueId: queue.id,
        note: data.note || undefined,
      });

      if (result.success) {
        toast.success(
          t('approval.reject.success'),
          {
            description: t('approval.reject.successMessage'),
          }
        );
        onSuccess();
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : t('approval.reject.errorMessage');
      toast.error(
        t('approval.reject.error'),
        {
          description: errorMessage,
        }
      );
    }
  };

  return (
    <Form {...form}>
      <form className="space-y-4">
        <FormField
          control={form.control}
          name="note"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t('approval.note.label')}</FormLabel>
              <FormControl>
                <Textarea
                  {...field}
                  value={field.value || ''}
                  placeholder={t('approval.note.placeholder')}
                  rows={4}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex gap-2 justify-end">
          <Button
            type="button"
            variant="destructive"
            onClick={form.handleSubmit(handleReject)}
            disabled={rejectMutation.isPending || approveMutation.isPending}
          >
            <XCircle className="h-4 w-4 mr-2" />
            {rejectMutation.isPending
          ? t('approval.processing')
          : t('approval.actions.reject')}
          </Button>
          <Button
            type="button"
            onClick={form.handleSubmit(handleApprove)}
            disabled={approveMutation.isPending || rejectMutation.isPending}
            className="bg-green-600 hover:bg-green-700"
          >
            <CheckCircle2 className="h-4 w-4 mr-2" />
            {approveMutation.isPending
              ? t('approval.processing')
              : t('approval.actions.approve')}
          </Button>
        </div>
      </form>
    </Form>
  );
}

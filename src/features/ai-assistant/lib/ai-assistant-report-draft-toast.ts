import { toast } from 'sonner';
import type { AiAssistantActionItemDto, AiAssistantAnswerDto } from '../types/ai-assistant.types';

type OpenReportDraftAction = (
  actionUrl: string,
  toolActionId?: number | null,
  confirmationRequired?: boolean
) => void | Promise<void>;

function findReportDraftAction(answer: AiAssistantAnswerDto): AiAssistantActionItemDto | null {
  if (answer.intent !== 'report-builder') {
    return null;
  }

  const actions = answer.actionItems?.length
    ? answer.actionItems
    : (answer.toolActions ?? []).map((action) => ({
        toolActionId: action.id,
        toolName: action.toolName,
        title: action.title,
        description: action.description ?? '',
        severity: action.status === 'Failed' ? 'danger' : 'success',
        actionLabel: action.actionLabel,
        actionUrl: action.actionUrl,
        confirmationRequired: action.confirmationRequired,
      }));

  return actions.find((action) => action.actionUrl?.startsWith('/reports/')) ?? null;
}

export function showReportDraftReadyToast(
  answer: AiAssistantAnswerDto,
  openActionUrl: OpenReportDraftAction
): void {
  const reportDraftAction = findReportDraftAction(answer);
  if (!reportDraftAction?.actionUrl) {
    return;
  }

  toast.success('Rapor taslağı hazır', {
    description: reportDraftAction.actionUrl.includes('/edit')
      ? 'AI taslağı kaydetti. Linkten açıp kolon, KPI ve grafik seçimlerini kontrol edebilirsiniz.'
      : 'AI taslağı hazırladı. Rapor oluşturucuda kayda devam edebilirsiniz.',
    action: {
      label: reportDraftAction.actionLabel ?? 'Taslağı aç',
      onClick: () => {
        void openActionUrl(
          reportDraftAction.actionUrl!,
          reportDraftAction.toolActionId,
          reportDraftAction.confirmationRequired ?? Boolean(reportDraftAction.toolActionId)
        );
      },
    },
  });
}

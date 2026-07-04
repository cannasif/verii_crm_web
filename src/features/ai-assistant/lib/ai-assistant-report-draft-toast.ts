import { toast } from 'sonner';
import type { AiAssistantActionItemDto, AiAssistantAnswerDto } from '../types/ai-assistant.types';

type OpenReportDraftAction = (
  actionUrl: string,
  toolActionId?: number | null,
  confirmationRequired?: boolean
) => void | Promise<void>;

export function findReportDraftAction(answer: AiAssistantAnswerDto): AiAssistantActionItemDto | null {
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

export function findPdfTemplateDraftAction(answer: AiAssistantAnswerDto): AiAssistantActionItemDto | null {
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

  return actions.find((action) => action.actionUrl?.startsWith('/pdf-report-designer/')) ?? null;
}

export function findCreatedReportDraftAction(answer: AiAssistantAnswerDto): AiAssistantActionItemDto | null {
  const action = findReportDraftAction(answer);
  if (!action?.actionUrl || !/^\/reports\/\d+\/edit$/.test(action.actionUrl)) {
    return null;
  }

  return action;
}

export function findCreatedPdfTemplateDraftAction(answer: AiAssistantAnswerDto): AiAssistantActionItemDto | null {
  const action = findPdfTemplateDraftAction(answer);
  if (!action?.actionUrl || !/^\/pdf-report-designer\/edit\/\d+$/.test(action.actionUrl)) {
    return null;
  }

  return action;
}

export function showReportDraftReadyToast(
  answer: AiAssistantAnswerDto,
  openActionUrl: OpenReportDraftAction
): void {
  const builderDraftAction = findPdfTemplateDraftAction(answer) ?? findReportDraftAction(answer);
  if (!builderDraftAction?.actionUrl) {
    return;
  }

  const isPdfAction = builderDraftAction.actionUrl.startsWith('/pdf-report-designer/');

  toast.success(isPdfAction ? 'PDF taslağı hazır' : 'Rapor taslağı hazır', {
    description: builderDraftAction.actionUrl.includes('/edit')
      ? isPdfAction
        ? 'AI PDF taslağını kaydetti. Linkten açıp sayfa yerleşimi, tablo ve görsel alanlarını kontrol edebilirsiniz.'
        : 'AI taslağı kaydetti. Linkten açıp kolon, KPI ve grafik seçimlerini kontrol edebilirsiniz.'
      : isPdfAction
        ? 'AI PDF taslağı hazırladı. PDF Builder ekranında kayda devam edebilirsiniz.'
        : 'AI taslağı hazırladı. Rapor oluşturucuda kayda devam edebilirsiniz.',
    action: {
      label: builderDraftAction.actionLabel ?? 'Taslağı aç',
      onClick: () => {
        void openActionUrl(
          builderDraftAction.actionUrl!,
          builderDraftAction.toolActionId,
          builderDraftAction.confirmationRequired ?? Boolean(builderDraftAction.toolActionId)
        );
      },
    },
  });
}

import { createElement } from 'react';
import { toast } from 'sonner';
import type { AiAssistantActionItemDto, AiAssistantAnswerDto } from '../types/ai-assistant.types';
import { AiAssistantReportDraftToast } from '../components/AiAssistantReportDraftToast';

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

  if (action.autoOpen === false) {
    return null;
  }

  return action;
}

export function findCreatedPdfTemplateDraftAction(answer: AiAssistantAnswerDto): AiAssistantActionItemDto | null {
  const action = findPdfTemplateDraftAction(answer);
  if (!action?.actionUrl || !/^\/pdf-report-designer\/edit\/\d+$/.test(action.actionUrl)) {
    return null;
  }

  if (action.autoOpen === false) {
    return null;
  }

  return action;
}

export function showReportDraftReadyToast(
  answer: AiAssistantAnswerDto,
  openActionUrl: OpenReportDraftAction
): void {
  const builderDraftAction = findCreatedPdfTemplateDraftAction(answer) ?? findCreatedReportDraftAction(answer);
  if (!builderDraftAction?.actionUrl) {
    return;
  }

  const isPdfAction = builderDraftAction.actionUrl.startsWith('/pdf-report-designer/');
  const title = isPdfAction ? 'PDF taslağı hazır' : 'Rapor taslağı hazır';
  const description = isPdfAction
    ? 'AI PDF taslağını kaydetti. Taslağı açıp sayfa yerleşimi, tablo ve görsel alanlarını kontrol edebilirsiniz.'
    : 'AI taslağı kaydetti. Taslağı açıp kolon, KPI ve grafik seçimlerini kontrol edebilirsiniz.';

  toast.custom(
    (toastId) =>
      createElement(AiAssistantReportDraftToast, {
        toastId,
        title,
        description,
        isPdf: isPdfAction,
        actionLabel: builderDraftAction.actionLabel ?? 'Taslağı aç',
        onOpen: () => {
          void openActionUrl(
            builderDraftAction.actionUrl!,
            builderDraftAction.toolActionId,
            builderDraftAction.confirmationRequired ?? Boolean(builderDraftAction.toolActionId)
          );
        },
      }),
    {
      duration: 10000,
      unstyled: true,
      className: 'ai-assistant-report-draft-toast !bg-transparent !border-0 !shadow-none !p-0',
    }
  );
}

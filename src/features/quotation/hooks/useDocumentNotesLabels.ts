import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

export type DocumentNotesContext = 'quotation' | 'order' | 'demand';

const CONTEXT_NAMESPACE: Record<DocumentNotesContext, string> = {
  quotation: 'quotation',
  order: 'order',
  demand: 'demand',
};

export interface DocumentNotesLabels {
  title: string;
  description: string;
  noteLabel: string;
  placeholder: string;
  addLineTooltip: string;
  linesHint: string;
  removeLine: string;
  saving: string;
  maxLengthError: string;
  pageLabel: string;
  notesTooltipText: string;
}

export function useDocumentNotesLabels(context: DocumentNotesContext = 'quotation'): DocumentNotesLabels {
  const ns = CONTEXT_NAMESPACE[context];
  const { t } = useTranslation([ns, 'quotation', 'common']);

  return useMemo(() => {
    const resolve = (key: string, defaultValue: string): string =>
      t(`${ns}:notes.${key}`, {
        defaultValue: t(`quotation:notes.${key}`, { defaultValue }),
      });

    return {
      title: resolve('title', 'Notlar'),
      description: resolve('description', ''),
      noteLabel: resolve('noteLabel', 'Not'),
      placeholder: resolve('placeholder', ''),
      addLineTooltip: resolve('addLineTooltip', 'Açıklama satırı ekle'),
      linesHint: resolve('linesHint', 'Her satır PDF ve belge notlarında ayrı görünür.'),
      removeLine: resolve('removeLine', 'Satırı kaldır'),
      saving: resolve('saving', 'Kaydediliyor...'),
      maxLengthError: resolve('maxLengthError', 'Not alanı en fazla 100 karakter olabilir.'),
      pageLabel: resolve('pageLabel', 'Sayfa {{current}} / {{total}}'),
      notesTooltipText: resolve('notesTooltipText', 'Teklif geneli açıklamalarıdır. Maksimum karakter limiti 100\'dür'),
    };
  }, [ns, t]);
}

export function resolveDocumentNotesLabel(
  t: (key: string, options?: Record<string, unknown>) => string,
  context: DocumentNotesContext,
  key: keyof DocumentNotesLabels,
  defaultValue: string,
): string {
  const ns = CONTEXT_NAMESPACE[context];
  return t(`${ns}:notes.${key}`, {
    defaultValue: t(`quotation:notes.${key}`, { defaultValue }),
  });
}

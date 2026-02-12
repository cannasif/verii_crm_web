import type { ReactElement } from 'react';
import { Eye, EyeOff, Lock, Unlock, ChevronUp, ChevronDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { usePdfReportDesignerStore } from '../store/usePdfReportDesignerStore';
import { isPdfTableElement } from '../types/pdf-report-template.types';

export function PdfLayersPanel(): ReactElement {
  const { t } = useTranslation();
  const getOrderedElements = usePdfReportDesignerStore((s) => s.getOrderedElements);
  const elementOrder = usePdfReportDesignerStore((s) => s.elementOrder);
  const elementsById = usePdfReportDesignerStore((s) => s.elementsById);
  const selectedIds = usePdfReportDesignerStore((s) => s.selectedIds);
  const setSelectedIds = usePdfReportDesignerStore((s) => s.setSelectedIds);
  const setElementLocked = usePdfReportDesignerStore((s) => s.setElementLocked);
  const setElementHidden = usePdfReportDesignerStore((s) => s.setElementHidden);
  const bringForward = usePdfReportDesignerStore((s) => s.bringForward);
  const sendBackward = usePdfReportDesignerStore((s) => s.sendBackward);

  const elements = getOrderedElements();

  const getLabel = (el: (typeof elements)[0]): string => {
    if (isPdfTableElement(el))
      return t('reportDesigner.layers.tableLabel', { count: el.columns.length });
    if (el.type === 'text') return el.text?.slice(0, 20) || t('reportDesigner.layers.textLabel');
    if (el.type === 'field') return el.value || t('reportDesigner.layers.fieldLabel');
    if (el.type === 'image') return t('reportDesigner.layers.imageLabel');
    return el.type;
  };

  return (
    <div className="flex w-56 flex-col gap-2 border-l border-slate-200 bg-slate-50/80 p-3 dark:border-slate-700 dark:bg-slate-900/30">
      <span className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
        {t('reportDesigner.layers.title')}
      </span>
      <div className="flex flex-col gap-0.5">
        {[...elementOrder].reverse().map((id, reverseIndex) => {
          const el = elementsById[id];
          if (!el) return null;
          const index = elementOrder.length - 1 - reverseIndex;
          const isSelected = selectedIds.includes(id);
          return (
            <div
              key={id}
              className={`flex items-center gap-1 rounded border px-2 py-1.5 text-xs ${
                isSelected
                  ? 'border-blue-500 bg-blue-50 dark:bg-slate-800'
                  : 'border-transparent hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <div className="flex flex-col">
                <button
                  type="button"
                  className="rounded p-0.5 text-slate-400 hover:bg-slate-200 disabled:opacity-40"
                  title={t('reportDesigner.layers.bringForward')}
                  disabled={index >= elementOrder.length - 1}
                  onClick={() => bringForward(id)}
                >
                  <ChevronUp className="size-3" />
                </button>
                <button
                  type="button"
                  className="rounded p-0.5 text-slate-400 hover:bg-slate-200 disabled:opacity-40"
                  title={t('reportDesigner.layers.sendBackward')}
                  disabled={index <= 0}
                  onClick={() => sendBackward(id)}
                >
                  <ChevronDown className="size-3" />
                </button>
              </div>
              <button
                type="button"
                className="min-w-0 flex-1 truncate text-left"
                onClick={() => setSelectedIds([id])}
              >
                {getLabel(el)}
              </button>
              <button
                type="button"
                onClick={() => setElementHidden(id, !el.hidden)}
                className="rounded p-0.5 text-slate-500 hover:bg-slate-200"
                title={el.hidden ? t('reportDesigner.layers.show') : t('reportDesigner.layers.hide')}
              >
                {el.hidden ? (
                  <EyeOff className="size-3.5" />
                ) : (
                  <Eye className="size-3.5" />
                )}
              </button>
              <button
                type="button"
                onClick={() => setElementLocked(id, !el.locked)}
                className="rounded p-0.5 text-slate-500 hover:bg-slate-200"
                title={el.locked ? t('reportDesigner.layers.unlock') : t('reportDesigner.layers.lock')}
              >
                {el.locked ? (
                  <Lock className="size-3.5" />
                ) : (
                  <Unlock className="size-3.5" />
                )}
              </button>
            </div>
          );
        })}
      </div>
      {elements.length === 0 && (
        <p className="text-xs text-slate-500">{t('reportDesigner.layers.noItems')}</p>
      )}
    </div>
  );
}

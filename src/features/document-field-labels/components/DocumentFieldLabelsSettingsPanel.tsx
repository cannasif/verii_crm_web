import { type ReactElement, useEffect, useMemo, useRef, useState } from 'react';
import { Loader2, Tags } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { useDocumentFieldLabelsQuery } from '../hooks/useDocumentFieldLabels';
import type {
  DocumentFieldLabelDocumentType,
  DocumentFieldLabelDto,
  DocumentFieldLabelScope,
  UpdateDocumentFieldLabelDto,
} from '../types/documentFieldLabels';

const DOCUMENTS: Array<{ type: DocumentFieldLabelDocumentType; label: string }> = [
  { type: 'Demand', label: 'Talep' },
  { type: 'Quotation', label: 'Teklif' },
  { type: 'Order', label: 'Sipariş' },
];

const SCOPES: Array<{ scope: DocumentFieldLabelScope; label: string; description: string }> = [
  {
    scope: 'HeaderNote',
    label: 'Üst Notlar',
    description: 'Belge not penceresindeki not başlıklarını değiştirir.',
  },
  {
    scope: 'LineDescription',
    label: 'Satır Açıklamaları',
    description: 'Satır ekleme ekranındaki Açıklama 1, 2 ve 3 başlıklarını değiştirir.',
  },
];

type DraftMap = Record<string, UpdateDocumentFieldLabelDto>;

function getDraftKey(item: Pick<DocumentFieldLabelDto, 'documentType' | 'scope' | 'fieldKey'>): string {
  return `${item.documentType}|${item.scope}|${item.fieldKey}`;
}

function isSupportedUpdateItem(item: UpdateDocumentFieldLabelDto | undefined): item is UpdateDocumentFieldLabelDto {
  if (!item) {
    return false;
  }

  return DOCUMENTS.some((document) => document.type === item.documentType)
    && SCOPES.some((scope) => scope.scope === item.scope);
}

interface DocumentFieldLabelsSettingsPanelProps {
  onItemsChange?: (items: UpdateDocumentFieldLabelDto[]) => void;
}

export function DocumentFieldLabelsSettingsPanel({
  onItemsChange,
}: DocumentFieldLabelsSettingsPanelProps): ReactElement {
  const { data, isLoading, isError, error } = useDocumentFieldLabelsQuery();
  const [drafts, setDrafts] = useState<DraftMap>({});
  const [activeDocument, setActiveDocument] = useState<DocumentFieldLabelDocumentType>('Quotation');
  const [activeScope, setActiveScope] = useState<DocumentFieldLabelScope>('HeaderNote');
  const dirtyDraftKeysRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!data) return;

    const nextDrafts: DraftMap = {};
    for (const item of data) {
      nextDrafts[getDraftKey(item)] = {
        documentType: item.documentType,
        scope: item.scope,
        fieldKey: item.fieldKey,
        customLabel: item.customLabel ?? '',
        helpText: item.helpText ?? '',
        placeholder: item.placeholder ?? '',
        isActive: item.isActive,
      };
    }

    setDrafts(nextDrafts);
    dirtyDraftKeysRef.current.clear();
    onItemsChange?.([]);
  }, [data, onItemsChange]);

  const visibleItems = useMemo(
    () =>
      (data ?? [])
        .filter((item) => item.documentType === activeDocument && item.scope === activeScope)
        .sort((a, b) => a.sortOrder - b.sortOrder),
    [activeDocument, activeScope, data],
  );

  const activeScopeDefinition = SCOPES.find((scope) => scope.scope === activeScope) ?? SCOPES[0];

  const handleDraftChange = (
    item: DocumentFieldLabelDto,
    value: string,
  ): void => {
    const key = getDraftKey(item);
    setDrafts((current) => {
      const nextDrafts = {
        ...current,
        [key]: {
          ...(current[key] ?? {
            documentType: item.documentType,
            scope: item.scope,
            fieldKey: item.fieldKey,
            customLabel: item.customLabel ?? '',
            helpText: item.helpText ?? '',
            placeholder: item.placeholder ?? '',
            isActive: item.isActive,
          }),
          documentType: item.documentType,
          scope: item.scope,
          fieldKey: item.fieldKey,
          isActive: item.isActive,
          customLabel: value,
        },
      };

      dirtyDraftKeysRef.current.add(key);
      onItemsChange?.(
        Array.from(dirtyDraftKeysRef.current)
          .map((draftKey) => nextDrafts[draftKey])
          .filter(isSupportedUpdateItem),
      );
      return nextDrafts;
    });
  };

  if (isLoading) {
    return (
      <div className="w-full min-w-0 rounded-2xl border border-slate-200 bg-slate-50 p-3 sm:p-4 dark:border-white/10 dark:bg-white/[0.03]">
        <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
          <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
          Belge alan başlıkları yükleniyor...
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="w-full min-w-0 break-words rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 sm:p-4 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
        {error instanceof Error ? error.message : 'Belge alan başlıkları yüklenemedi.'}
      </div>
    );
  }

  return (
    <div className="w-full min-w-0 max-w-full overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 p-3 sm:p-4 dark:border-white/10 dark:bg-white/[0.03]">
      <div className="mb-4 flex min-w-0 flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
            <Tags className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1 space-y-1 overflow-hidden">
            <p className="break-words text-sm font-semibold">Belge alan başlıkları</p>
            <p className="text-muted-foreground break-words text-sm">
              Talep, teklif, sipariş ve satınalma belgelerindeki not penceresi ile satır açıklama alanlarının başlıklarını müşteri terminolojisine göre değiştirir. Boş bırakılan alanlarda mevcut sistem adı kullanılır. Burada yapılan başlık değişikliği dil değişiminden etkilenmez.
            </p>
          </div>
        </div>
      </div>

      <div className="mb-3 flex min-w-0 flex-wrap gap-2">
        {SCOPES.map((scope) => (
          <button
            key={scope.scope}
            type="button"
            onClick={() => setActiveScope(scope.scope)}
            className={cn(
              'rounded-xl border px-3 py-2 text-sm font-semibold transition-colors',
              activeScope === scope.scope
                ? 'border-sky-500 bg-sky-50 text-sky-700 dark:border-sky-400/50 dark:bg-sky-500/10 dark:text-sky-300'
                : 'border-slate-200 bg-white text-slate-600 hover:border-sky-300 dark:border-white/10 dark:bg-[#0C0516] dark:text-slate-300',
            )}
          >
            {scope.label}
          </button>
        ))}
      </div>

      <div className="mb-4 flex min-w-0 flex-wrap gap-2">
        {DOCUMENTS.map((document) => (
          <button
            key={document.type}
            type="button"
            onClick={() => setActiveDocument(document.type)}
            className={cn(
              'rounded-xl border px-3 py-2 text-sm font-semibold transition-colors',
              activeDocument === document.type
                ? 'border-emerald-500 bg-emerald-50 text-emerald-700 dark:border-emerald-400/50 dark:bg-emerald-500/10 dark:text-emerald-300'
                : 'border-slate-200 bg-white text-slate-600 hover:border-emerald-300 dark:border-white/10 dark:bg-[#0C0516] dark:text-slate-300',
            )}
          >
            {document.label}
          </button>
        ))}
      </div>

      <div className="mb-4 min-w-0 break-words rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200">
        {activeScope === 'HeaderNote'
          ? 'Örnek: Teklif sekmesinde Not 1 alanına “Elma”, Not 2 alanına “Armut” yazılırsa teklif not penceresinde “TEKLİF NOTU 1” yerine “Elma”, “TEKLİF NOTU 2” yerine “Armut” görünür.'
          : 'Örnek: Teklif satır açıklamalarında Açıklama 1 alanına “Üretim Notu” yazılırsa satır ekleme ekranında “Açıklama 1” yerine “Üretim Notu” görünür.'}
      </div>

      <div className="grid w-full min-w-0 grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {visibleItems.map((item) => {
          const draft = drafts[getDraftKey(item)];
          const effectiveLabel = draft?.customLabel?.trim() || item.defaultLabel;
          const documentLabel = DOCUMENTS.find((document) => document.type === item.documentType)?.label ?? item.documentType;

          return (
            <div
              key={getDraftKey(item)}
              className="min-w-0 max-w-full overflow-hidden rounded-xl border border-slate-200 bg-white p-3 dark:border-white/10 dark:bg-[#0C0516]"
            >
              <div className="mb-3 flex min-w-0 items-start justify-between gap-2">
                <div className="min-w-0 flex-1 overflow-hidden">
                  <p className="truncate text-sm font-semibold" title={effectiveLabel}>{effectiveLabel}</p>
                  <p className="break-words text-xs text-slate-500 dark:text-slate-400">
                    {documentLabel} · {activeScopeDefinition.label} · varsayılan: {item.defaultLabel}
                  </p>
                </div>
                <span className="shrink-0 rounded-md bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-500 dark:bg-white/5 dark:text-slate-400">
                  #{item.sortOrder}
                </span>
              </div>

              <label className="mb-1 block text-xs font-medium text-slate-500 dark:text-slate-400">
                Görünen başlık
              </label>
              <Input
                maxLength={80}
                value={draft?.customLabel ?? ''}
                placeholder={item.defaultLabel}
                onChange={(event) => handleDraftChange(item, event.target.value)}
                className="w-full min-w-0 max-w-full rounded-xl border-slate-200 bg-white dark:border-white/10 dark:bg-black/20"
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import { createClientId } from '@/lib/create-client-id';

export type DocumentLineBackendRef = {
  id: string;
  backendLineId?: number | null;
};

export function parseDocumentLineBackendIdFromFormId(formId: string | number | undefined): number | null {
  if (formId == null) return null;
  if (typeof formId === 'number' && Number.isFinite(formId) && formId > 0) return formId;
  const s = String(formId).trim();
  const prefixed = s.match(/^line-(\d+)(?:-|$)/);
  if (prefixed) {
    const n = parseInt(prefixed[1], 10);
    return Number.isNaN(n) ? null : n;
  }
  if (/^\d+$/.test(s)) {
    const n = parseInt(s, 10);
    return Number.isNaN(n) ? null : n;
  }
  return null;
}

export function resolveDocumentLineBackendId(line: DocumentLineBackendRef): number | null {
  const explicit = line.backendLineId;
  if (explicit != null && Number.isFinite(explicit) && explicit > 0) {
    return explicit;
  }
  return parseDocumentLineBackendIdFromFormId(line.id);
}

export function ensureUniqueDocumentLineIds<T extends { id: string }>(lines: T[]): T[] {
  const seen = new Set<string>();

  return lines.map((line, index) => {
    const currentId = line.id?.trim();
    const baseId = currentId && currentId.length > 0 ? currentId : createClientId();

    if (!seen.has(baseId)) {
      seen.add(baseId);
      return baseId === line.id ? line : { ...line, id: baseId };
    }

    const nextId = `${baseId}-uniq-${index}-${createClientId()}`;
    seen.add(nextId);
    return { ...line, id: nextId };
  });
}

export function mergeRefetchedDocumentLines<
  T extends DocumentLineBackendRef & { unit?: string | null },
>(
  freshMapped: T[],
  previous: T[],
  resolveBackendId: (line: T) => number | null,
): T[] {
  const previousByBackendId = new Map<number, T>();

  for (const line of previous) {
    const backendId = resolveBackendId(line);
    if (backendId != null) {
      previousByBackendId.set(backendId, line);
    }
  }

  const localOnlyLines = previous.filter((line) => resolveBackendId(line) == null);

  const mergedFresh = freshMapped.map((line) => {
    const backendId = resolveBackendId(line);
    const previousLine = backendId != null ? previousByBackendId.get(backendId) : undefined;

    if (!previousLine) {
      return line;
    }

    const unit = line.unit?.trim() ? line.unit : previousLine.unit ?? null;

    return {
      ...line,
      unit,
    };
  });

  return deduplicateDocumentLinesByBackendId([...mergedFresh, ...localOnlyLines]);
}

export function syncDocumentLinesFromServer<
  T extends DocumentLineBackendRef & { unit?: string | null },
>(
  freshMapped: T[],
  previousSnapshot: T[],
  options?: { keepLocalDraftLines?: boolean },
): T[] {
  const keepLocalDraftLines = options?.keepLocalDraftLines ?? false;
  const previousByBackendId = new Map<number, T>();

  for (const line of previousSnapshot) {
    const backendId = resolveDocumentLineBackendId(line);
    if (backendId != null) {
      previousByBackendId.set(backendId, line);
    }
  }

  const syncedFresh = freshMapped.map((line) => {
    const backendId = resolveDocumentLineBackendId(line);
    const previousLine = backendId != null ? previousByBackendId.get(backendId) : undefined;

    if (!previousLine) {
      return line;
    }

    return {
      ...line,
      unit: line.unit?.trim() ? line.unit : previousLine.unit ?? null,
    };
  });

  if (!keepLocalDraftLines) {
    return deduplicateDocumentLinesByBackendId(syncedFresh);
  }

  const localDraftLines = previousSnapshot.filter(
    (line) => resolveDocumentLineBackendId(line) == null,
  );

  return deduplicateDocumentLinesByBackendId([...syncedFresh, ...localDraftLines]);
}

export function deduplicateDocumentLinesByBackendId<T extends DocumentLineBackendRef>(
  lines: T[],
): T[] {
  const seenBackendIds = new Set<number>();
  const result: T[] = [];

  for (const line of lines) {
    const backendId = resolveDocumentLineBackendId(line);
    if (backendId != null) {
      if (seenBackendIds.has(backendId)) {
        continue;
      }
      seenBackendIds.add(backendId);
    }
    result.push(line);
  }

  return ensureUniqueDocumentLineIds(result);
}

export function appendCreatedDocumentLines<T extends DocumentLineBackendRef>(
  previous: T[],
  createdLines: T[],
): T[] {
  const next = [...previous];

  for (const line of createdLines) {
    const backendId = resolveDocumentLineBackendId(line);
    if (backendId != null) {
      const existingIndex = next.findIndex((item) => resolveDocumentLineBackendId(item) === backendId);
      if (existingIndex >= 0) {
        next[existingIndex] = line;
        continue;
      }
    }
    next.push(line);
  }

  return deduplicateDocumentLinesByBackendId(next);
}

export function removeDocumentLineFromState<T extends DocumentLineBackendRef>(
  lines: T[],
  targetFormLineId: string,
  backendLineId: number | null,
  resolveRelatedGroup: (allLines: T[], line?: T | null) => T[],
): T[] {
  const lineToDelete = lines.find((line) => line.id === targetFormLineId);

  if (backendLineId != null) {
    const filtered = lines.filter((line) => resolveDocumentLineBackendId(line) !== backendLineId);
    if (filtered.length !== lines.length) {
      return deduplicateDocumentLinesByBackendId(filtered);
    }
  }

  if (!lineToDelete) {
    return [...lines];
  }

  const relatedGroup = resolveRelatedGroup(lines, lineToDelete);
  if (relatedGroup.length > 0) {
    const relatedGroupIds = new Set(relatedGroup.map((line) => line.id));
    return deduplicateDocumentLinesByBackendId(
      lines.filter((line) => !relatedGroupIds.has(line.id)),
    );
  }

  return deduplicateDocumentLinesByBackendId(
    lines.filter((line) => line.id !== targetFormLineId),
  );
}

export function applyDocumentLinesUpdate<T extends { id: string }>(
  linesRef: MutableRefObject<T[]>,
  setLines: Dispatch<SetStateAction<T[]>>,
  nextOrUpdater: T[] | ((prev: T[]) => T[]),
): void {
  const previous = linesRef.current;
  const resolved =
    typeof nextOrUpdater === 'function' ? nextOrUpdater(previous) : nextOrUpdater;
  const next = deduplicateDocumentLinesByBackendId(ensureUniqueDocumentLineIds(resolved));

  linesRef.current = next;
  setLines(next);
}

import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { documentFieldLabelsApi } from '../api/documentFieldLabelsApi';
import type {
  DocumentContextKey,
  DocumentFieldLabelDocumentType,
  DocumentFieldLabelDto,
  DocumentFieldLabelScope,
  UpdateDocumentFieldLabelsRequest,
} from '../types/documentFieldLabels';
import { DOCUMENT_CONTEXT_TO_TYPE } from '../types/documentFieldLabels';

export const DOCUMENT_FIELD_LABELS_QUERY_KEY = ['document-field-labels'] as const;

export function useDocumentFieldLabelsQuery(params?: {
  documentType?: DocumentFieldLabelDocumentType;
  scope?: DocumentFieldLabelScope;
}) {
  return useQuery({
    queryKey: [...DOCUMENT_FIELD_LABELS_QUERY_KEY, params?.documentType ?? 'all', params?.scope ?? 'all'],
    queryFn: () => documentFieldLabelsApi.get(params),
    staleTime: 5 * 60 * 1000,
  });
}

export function useUpdateDocumentFieldLabelsMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: UpdateDocumentFieldLabelsRequest) => documentFieldLabelsApi.update(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: DOCUMENT_FIELD_LABELS_QUERY_KEY });
    },
  });
}

export function useDocumentFieldLabelMap(
  context: DocumentContextKey,
  scope: DocumentFieldLabelScope,
): Record<string, DocumentFieldLabelDto> {
  const documentType = DOCUMENT_CONTEXT_TO_TYPE[context];
  const { data } = useDocumentFieldLabelsQuery({ documentType, scope });

  return useMemo(() => {
    const map: Record<string, DocumentFieldLabelDto> = {};
    for (const item of data ?? []) {
      if (item.isActive) {
        map[item.fieldKey] = item;
      }
    }
    return map;
  }, [data]);
}

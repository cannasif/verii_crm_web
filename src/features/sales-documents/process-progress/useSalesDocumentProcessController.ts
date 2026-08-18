import { useRef, useState } from 'react';
import type { ProcessProgressStatus } from '@/components/shared';
import { createClientId } from '@/lib/create-client-id';
import {
  describeSalesDocumentProcessError,
  resolveApprovalDecisionOutcome,
  resolveStartApprovalOutcome,
  wasApprovalDecisionRecorded,
  type ApprovalFlowReportSnapshot,
  type SalesDocumentProcessOutcome,
  type SalesDocumentSnapshot,
} from './SalesDocumentProcessProgressModal';

export interface SalesDocumentRecord extends SalesDocumentSnapshot {
  id: number;
  grandTotal: number;
  offerNo?: string | null;
  revisionNo?: string | null;
}

export interface ApprovalActionReference {
  id: number;
  entityId: number;
  approvalRequestId: number;
  stepOrder: number;
  approvedByUserId: number;
  quotationOfferNo?: string | null;
  quotationRevisionNo?: string | null;
}

export interface SalesDocumentProcessState<TApproval = never> {
  open: boolean;
  status: ProcessProgressStatus;
  operationKey: string;
  approval: TApproval | null;
  erpNumber: string | null;
  outcome: SalesDocumentProcessOutcome | null;
  errorMessage: string | null;
  technicalDetails: string | null;
}

function createInitialProcessState<TApproval>(): SalesDocumentProcessState<TApproval> {
  return {
    open: false,
    status: 'running',
    operationKey: '',
    approval: null,
    erpNumber: null,
    outcome: null,
    errorMessage: null,
    technicalDetails: null,
  };
}

interface StartApprovalControllerOptions<TDocument extends SalesDocumentRecord> {
  document: TDocument | null | undefined;
  documentType: number;
  isPending: boolean;
  fallbackErrorMessage: string;
  execute: (request: {
    entityId: number;
    documentType: number;
    totalAmount: number;
    operationKey: string;
  }) => Promise<unknown>;
  fetchDocument: (id: number) => Promise<TDocument>;
  onDocumentRefreshed?: (document: TDocument) => void;
}

export function useSalesDocumentStartApprovalProcess<TDocument extends SalesDocumentRecord>({
  document,
  documentType,
  isPending,
  fallbackErrorMessage,
  execute,
  fetchDocument,
  onDocumentRefreshed,
}: StartApprovalControllerOptions<TDocument>): {
  process: SalesDocumentProcessState;
  start: () => void;
  retry: () => void;
  setOpen: (open: boolean) => void;
} {
  const [process, setProcess] = useState<SalesDocumentProcessState>(createInitialProcessState);
  const operationInFlightRef = useRef(false);

  const run = async (operationKey: string, recoverFirst = false): Promise<void> => {
    if (!document || isPending || operationInFlightRef.current) return;
    operationInFlightRef.current = true;

    setProcess({
      ...createInitialProcessState(),
      open: true,
      operationKey,
    });

    try {
      if (recoverFirst) {
        const current = await fetchDocument(document.id);
        const recoveredOutcome = resolveStartApprovalOutcome(current);
        if (recoveredOutcome) {
          onDocumentRefreshed?.(current);
          setProcess((state) => ({
            ...state,
            status: 'success',
            erpNumber: current.erpIntegrationNumber ?? null,
            outcome: recoveredOutcome,
          }));
          return;
        }
      }

      await execute({
        entityId: document.id,
        documentType,
        totalAmount: document.grandTotal,
        operationKey,
      });

      let refreshedDocument: TDocument | null = null;
      try {
        refreshedDocument = await fetchDocument(document.id);
        onDocumentRefreshed?.(refreshedDocument);
      } catch {
        // Ana işlem başarılıysa geçici sonuç sorgusu hatası işlemi başarısız yapmamalı.
      }

      setProcess((state) => ({
        ...state,
        status: 'success',
        erpNumber: refreshedDocument?.erpIntegrationNumber ?? null,
        outcome: refreshedDocument ? resolveStartApprovalOutcome(refreshedDocument) : null,
      }));
    } catch (error) {
      const failure = describeSalesDocumentProcessError(error, fallbackErrorMessage);
      setProcess((state) => ({ ...state, status: 'error', ...failure }));
    } finally {
      operationInFlightRef.current = false;
    }
  };

  return {
    process,
    start: () => { void run(createClientId()); },
    retry: () => {
      if (!process.operationKey || isPending) return;
      void run(process.operationKey, true);
    },
    setOpen: (open) => setProcess((state) => ({ ...state, open })),
  };
}

interface ApprovalDecisionControllerOptions<TDocument extends SalesDocumentRecord> {
  isPending: boolean;
  isOtherDecisionPending: boolean;
  fallbackErrorMessage: string;
  execute: (request: { approvalActionId: number; operationKey: string }) => Promise<unknown>;
  fetchDocument: (id: number) => Promise<TDocument>;
  fetchApprovalReport: (id: number) => Promise<ApprovalFlowReportSnapshot>;
  onResolved?: () => void | Promise<void>;
}

export function useSalesDocumentApprovalDecisionProcess<
  TDocument extends SalesDocumentRecord,
  TApproval extends ApprovalActionReference,
>({
  isPending,
  isOtherDecisionPending,
  fallbackErrorMessage,
  execute,
  fetchDocument,
  fetchApprovalReport,
  onResolved,
}: ApprovalDecisionControllerOptions<TDocument>): {
  process: SalesDocumentProcessState<TApproval>;
  approve: (approval: TApproval) => void;
  retry: () => void;
  setOpen: (open: boolean) => void;
} {
  const [process, setProcess] = useState<SalesDocumentProcessState<TApproval>>(createInitialProcessState);
  const operationInFlightRef = useRef(false);

  const run = async (
    approval: TApproval,
    operationKey: string,
    recoverFirst = false,
  ): Promise<void> => {
    if (isPending || isOtherDecisionPending || operationInFlightRef.current) return;
    operationInFlightRef.current = true;
    const documentId = approval.entityId || approval.approvalRequestId;

    setProcess({
      ...createInitialProcessState<TApproval>(),
      open: true,
      operationKey,
      approval,
    });

    try {
      if (recoverFirst) {
        const current = await fetchDocument(documentId);
        const recoveredOutcome = resolveApprovalDecisionOutcome(current);
        if (recoveredOutcome === 'approved' || recoveredOutcome === 'erp-completed') {
          setProcess((state) => ({
            ...state,
            status: 'success',
            erpNumber: current.erpIntegrationNumber ?? null,
            outcome: recoveredOutcome,
          }));
          await onResolved?.();
          return;
        }

        if (recoveredOutcome === 'approval-continued') {
          const report = await fetchApprovalReport(documentId);
          if (wasApprovalDecisionRecorded(report, approval)) {
            setProcess((state) => ({ ...state, status: 'success', outcome: recoveredOutcome }));
            await onResolved?.();
            return;
          }
        }
      }

      await execute({ approvalActionId: approval.id, operationKey });

      let erpNumber: string | null = null;
      let outcome: SalesDocumentProcessOutcome | null = null;
      try {
        const refreshedDocument = await fetchDocument(documentId);
        erpNumber = refreshedDocument.erpIntegrationNumber ?? null;
        outcome = resolveApprovalDecisionOutcome(refreshedDocument);
      } catch {
        // Ana onay başarılıysa geçici sonuç sorgusu hatası onayı başarısız yapmamalı.
      }

      setProcess((state) => ({ ...state, status: 'success', erpNumber, outcome }));
      await onResolved?.();
    } catch (error) {
      const failure = describeSalesDocumentProcessError(error, fallbackErrorMessage);
      setProcess((state) => ({ ...state, status: 'error', ...failure }));
    } finally {
      operationInFlightRef.current = false;
    }
  };

  return {
    process,
    approve: (approval) => { void run(approval, createClientId()); },
    retry: () => {
      if (!process.approval || !process.operationKey || isPending) return;
      void run(process.approval, process.operationKey, true);
    },
    setOpen: (open) => setProcess((state) => ({ ...state, open })),
  };
}

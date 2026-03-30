import { type ChangeEvent, type ReactElement, useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import {
  AlertCircle,
  FileText,
  Mail,
  Paperclip,
  Plus,
  RefreshCcw,
  Sparkles,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  appendRecipient,
  appendRecipients,
  parseRecipientInput,
  RecipientTokenField,
  type RecipientOption,
} from '@/components/ui/recipient-token-field';
import { RichTextEditor } from '@/components/ui/rich-text-editor';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { contactApi } from '@/features/contact-management/api/contact-api';
import type { ContactDto } from '@/features/contact-management/types/contact-types';
import { customerApi } from '@/features/customer-management/api/customer-api';
import type { CustomerDto } from '@/features/customer-management/types/customer-types';
import { DocumentRuleType, pdfReportTemplateApi } from '@/features/pdf-report';
import { outlookIntegrationApi } from '../api/outlook-integration.api';
import { useSendOutlookCustomerMailMutation } from '../hooks/useOutlookIntegrationMutations';
import type { OutlookCustomerMailAttachmentDto } from '../types/outlook-integration.types';

interface OutlookCustomerMailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  moduleKey: 'activity' | 'demand' | 'quotation' | 'order';
  recordId: number;
  customerId?: number | null;
  contactId?: number | null;
  customerName?: string | null;
  contactName?: string | null;
  customerCode?: string | null;
  recordNo?: string | null;
  revisionNo?: string | null;
  totalAmountDisplay?: string | null;
  validUntil?: string | null;
  recordOwnerName?: string | null;
  contextTitle?: string | null;
}

interface MailTemplateOption {
  key: string;
  build: (ctx: MailContextValues) => {
    subject: string;
    body: string;
  };
}

interface RecipientSuggestion {
  email: string;
  label: string;
  source: string;
}

interface MailContextValues {
  module: string;
  id: string;
  recordId: string;
  recordNo: string;
  revisionNo: string;
  customer: string;
  customerCode: string;
  contact: string;
  total: string;
  validUntil: string;
  owner: string;
  contextTitle: string;
}

const VARIABLE_TOKEN_KEYS = [
  'module',
  'recordNo',
  'revisionNo',
  'customer',
  'customerCode',
  'contact',
  'total',
  'validUntil',
  'owner',
] as const;

const DRAFT_STORAGE_KEY = 'v3rii-google-mail-draft';
const PREFERENCE_STORAGE_KEY = 'v3rii-google-mail-preferences';

function applyTemplateVariables(input: string, values: MailContextValues): string {
  return Object.entries(values).reduce(
    (acc, [key, value]) => acc.split(`{{${key}}}`).join(value || '-'),
    input
  );
}

function formatDisplayDate(raw: string | null | undefined, language: string): string {
  if (!raw) return '-';
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return raw;
  return date.toLocaleDateString(language);
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      const normalized = result.includes('base64,') ? result.split('base64,')[1] : result;
      resolve(normalized);
    };
    reader.onerror = () => reject(reader.error ?? new Error('File could not be read.'));
    reader.readAsDataURL(file);
  });
}

function normalizePdfFileSegment(value: string): string {
  return value
    .toLocaleLowerCase('tr-TR')
    .replace(/[^a-z0-9]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

function buildStorageScope(moduleKey: string, recordId: number): string {
  return `${moduleKey}:${recordId}`;
}

export function OutlookCustomerMailDialog({
  open,
  onOpenChange,
  moduleKey,
  recordId,
  customerId,
  contactId,
  customerName,
  contactName,
  customerCode,
  recordNo,
  revisionNo,
  totalAmountDisplay,
  validUntil,
  recordOwnerName,
  contextTitle,
}: OutlookCustomerMailDialogProps): ReactElement {
  const { t, i18n } = useTranslation('outlook-integration');
  const sendMutation = useSendOutlookCustomerMailMutation();

  const [templateKey, setTemplateKey] = useState<string>('generic-info');
  const [activeTab, setActiveTab] = useState<'compose' | 'preview'>('compose');
  const [to, setTo] = useState<string>('');
  const [cc, setCc] = useState<string>('');
  const [bcc, setBcc] = useState<string>('');
  const [subject, setSubject] = useState<string>('');
  const [body, setBody] = useState<string>('');
  const [isHtml, setIsHtml] = useState<boolean>(true);
  const [loadingContext, setLoadingContext] = useState(false);
  const [customerDetail, setCustomerDetail] = useState<CustomerDto | null>(null);
  const [contacts, setContacts] = useState<ContactDto[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [inlineError, setInlineError] = useState<string | null>(null);
  const [recentSuggestions, setRecentSuggestions] = useState<RecipientSuggestion[]>([]);
  const [selectedPdfTemplateId, setSelectedPdfTemplateId] = useState<string>('');
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  const moduleLabel = useMemo(
    () =>
      t(`mailDialog.modules.${moduleKey}`),
    [moduleKey, t]
  );

  const templates = useMemo<MailTemplateOption[]>(
    () => [
      {
        key: 'generic-info',
        build: () => ({
          subject: t('mailDialog.templates.generic.subject'),
          body: t('mailDialog.templates.generic.body'),
        }),
      },
      {
        key: 'follow-up',
        build: () => ({
          subject: t('mailDialog.templates.followUp.subject'),
          body: t('mailDialog.templates.followUp.body'),
        }),
      },
      {
        key: 'reminder',
        build: () => ({
          subject: t('mailDialog.templates.reminder.subject'),
          body: t('mailDialog.templates.reminder.body'),
        }),
      },
    ],
    [t]
  );

  const variableTokens = useMemo(
    () =>
      VARIABLE_TOKEN_KEYS.map((key) => ({
        token: `{{${key}}}`,
        label: t(`mailDialog.variableLabels.${key}`),
      })),
    [t]
  );

  const selectedTemplate = templates.find((item) => item.key === templateKey) ?? templates[0];
  const missingCustomer = !customerId || customerId <= 0;
  const documentRuleType = useMemo(() => {
    if (moduleKey === 'quotation') return DocumentRuleType.Quotation;
    if (moduleKey === 'demand') return DocumentRuleType.Demand;
    if (moduleKey === 'order') return DocumentRuleType.Order;
    return null;
  }, [moduleKey]);

  const pdfTemplatesQuery = useQuery({
    queryKey: ['outlook-mail-pdf-templates', documentRuleType],
    enabled: open && documentRuleType !== null,
    queryFn: async () =>
      pdfReportTemplateApi.getList({
        pageNumber: 1,
        pageSize: 100,
        sortBy: 'title',
        sortDirection: 'asc',
        ruleType: documentRuleType ?? undefined,
        isActive: true,
      }),
  });

  const availablePdfTemplates = pdfTemplatesQuery.data?.items ?? [];

  const selectedContact = useMemo(
    () => contacts.find((item) => item.id === contactId) ?? null,
    [contacts, contactId]
  );

  const contextValues = useMemo<MailContextValues>(
    () => ({
      module: moduleLabel,
      id: String(recordId || '-'),
      recordId: String(recordId || '-'),
      recordNo: recordNo?.trim() || `#${recordId}`,
      revisionNo: revisionNo?.trim() || '-',
      customer: customerName?.trim() || customerDetail?.name || '-',
      customerCode: customerCode?.trim() || customerDetail?.customerCode || '-',
      contact: contactName?.trim() || selectedContact?.fullName || '-',
      total: totalAmountDisplay?.trim() || '-',
      validUntil: formatDisplayDate(validUntil, i18n.language),
      owner: recordOwnerName?.trim() || '-',
      contextTitle: contextTitle?.trim() || '-',
    }),
    [
      moduleLabel,
      recordId,
      recordNo,
      revisionNo,
      customerName,
      customerDetail?.name,
      customerCode,
      customerDetail?.customerCode,
      contactName,
      selectedContact?.fullName,
      totalAmountDisplay,
      validUntil,
      i18n.language,
      recordOwnerName,
      contextTitle,
    ]
  );

  const parsedTo = useMemo(() => parseRecipientInput(to), [to]);
  const parsedCc = useMemo(() => parseRecipientInput(cc), [cc]);
  const parsedBcc = useMemo(() => parseRecipientInput(bcc), [bcc]);

  const automaticRecipients = useMemo(() => {
    const suggestions = [selectedContact?.email, customerDetail?.email]
      .map((item) => item?.trim())
      .filter((item): item is string => Boolean(item));

    return suggestions.filter(
      (item, index, array) => array.findIndex((entry) => entry.toLowerCase() === item.toLowerCase()) === index
    );
  }, [selectedContact?.email, customerDetail?.email]);

  const resolvedToRecipients = parsedTo.valid.length > 0 ? parsedTo.valid : automaticRecipients;
  const resolvedSubject = useMemo(() => applyTemplateVariables(subject, contextValues), [subject, contextValues]);
  const resolvedBody = useMemo(() => applyTemplateVariables(body, contextValues), [body, contextValues]);

  const recipientSuggestions = useMemo<RecipientSuggestion[]>(() => {
    const directSuggestions: RecipientSuggestion[] = [];

    if (selectedContact?.email) {
      directSuggestions.push({
        email: selectedContact.email,
        label: selectedContact.fullName || selectedContact.email,
        source: t('mailDialog.sources.selectedContact'),
      });
    }

    if (customerDetail?.email) {
      directSuggestions.push({
        email: customerDetail.email,
        label: customerDetail.name || customerDetail.email,
        source: t('mailDialog.sources.customerDefault'),
      });
    }

    return [...directSuggestions, ...recentSuggestions].filter(
      (item, index, array) => array.findIndex((entry) => entry.email.toLowerCase() === item.email.toLowerCase()) === index
    );
  }, [selectedContact, customerDetail, recentSuggestions, t]);

  const contactRecipientOptions = useMemo(
    () =>
      contacts
        .filter((item) => item.email?.trim())
        .map((item) => ({
          id: item.id,
          email: item.email!.trim(),
          label: item.fullName || item.email!.trim(),
        }))
        .filter(
          (item, index, array) =>
            array.findIndex((entry) => entry.email.toLowerCase() === item.email.toLowerCase()) === index
        ),
    [contacts]
  );

  const companyRecipientOptions = useMemo(
    () =>
      [customerDetail?.email]
        .map((email) => email?.trim())
        .filter((email): email is string => Boolean(email))
        .filter(
          (email, index, array) => array.findIndex((entry) => entry.toLowerCase() === email.toLowerCase()) === index
        ),
    [customerDetail?.email]
  );

  const recipientDirectoryEntries = useMemo(
    () =>
      [
        ...companyRecipientOptions.map((email) => ({
          key: `company-${email}`,
          email,
          label: customerDetail?.name || customerName || t('mailDialog.companyDefault', { defaultValue: 'Firma' }),
          bucketLabel: t('mailDialog.companyEmails', { defaultValue: 'Firma e-postalari' }),
        })),
        ...contactRecipientOptions.map((item) => ({
          key: `contact-${item.id}-${item.email}`,
          email: item.email,
          label: item.label,
          bucketLabel: t('mailDialog.contactEmails', { defaultValue: 'Kontak e-postalari' }),
        })),
      ].filter(
        (item, index, array) => array.findIndex((entry) => entry.email.toLowerCase() === item.email.toLowerCase()) === index
      ),
    [companyRecipientOptions, customerDetail?.name, customerName, t, contactRecipientOptions]
  );

  const recipientOptionDirectory = useMemo<RecipientOption[]>(
    () =>
      [
        ...recipientSuggestions.map((item) => ({
          email: item.email,
          label: item.label,
          description: item.source,
        })),
        ...companyRecipientOptions.map((email) => ({
          email,
          label: customerDetail?.name || customerName || t('mailDialog.companyDefault', { defaultValue: 'Firma' }),
          description: t('mailDialog.companyEmails', { defaultValue: 'Firma e-postalari' }),
        })),
        ...contactRecipientOptions.map((item) => ({
          email: item.email,
          label: item.label,
          description: t('mailDialog.contactEmails', { defaultValue: 'Kontak e-postalari' }),
        })),
      ].filter(
        (item, index, array) => array.findIndex((entry) => entry.email.toLowerCase() === item.email.toLowerCase()) === index
      ),
    [
      recipientSuggestions,
      companyRecipientOptions,
      customerDetail?.name,
      customerName,
      t,
      contactRecipientOptions,
    ]
  );

  useEffect(() => {
    if (!open) {
      return;
    }

    const next = selectedTemplate.build(contextValues);
    setActiveTab('compose');
    setInlineError(null);

    const scope = buildStorageScope(moduleKey, recordId);
    const draftRaw = window.localStorage.getItem(DRAFT_STORAGE_KEY);
    const preferenceRaw = window.localStorage.getItem(PREFERENCE_STORAGE_KEY);
    let restoredDraft = false;

    if (draftRaw) {
      try {
        const drafts = JSON.parse(draftRaw) as Record<string, {
          to?: string;
          cc?: string;
          bcc?: string;
          subject?: string;
          body?: string;
          isHtml?: boolean;
          templateKey?: string;
          selectedPdfTemplateId?: string;
        }>;
        const draft = drafts[scope];
        if (draft) {
          setTo(draft.to ?? '');
          setCc(draft.cc ?? '');
          setBcc(draft.bcc ?? '');
          setSubject(draft.subject ?? next.subject);
          setBody(draft.body ?? next.body);
          setIsHtml(draft.isHtml ?? true);
          if (draft.templateKey) setTemplateKey(draft.templateKey);
          if (draft.selectedPdfTemplateId) setSelectedPdfTemplateId(draft.selectedPdfTemplateId);
          restoredDraft = true;
        }
      } catch {
        // ignore malformed draft cache
      }
    }

    if (!restoredDraft) {
      setTo('');
      setCc('');
      setBcc('');
      setSubject(next.subject);
      setBody(next.body);
      setIsHtml(true);
      if (preferenceRaw) {
        try {
          const preferences = JSON.parse(preferenceRaw) as Record<string, { templateKey?: string; selectedPdfTemplateId?: string }>;
          const preference = preferences[moduleKey];
          if (preference?.templateKey) setTemplateKey(preference.templateKey);
          if (preference?.selectedPdfTemplateId) setSelectedPdfTemplateId(preference.selectedPdfTemplateId);
        } catch {
          // ignore malformed preference cache
        }
      }
    }

    setSelectedFiles([]);
  }, [open, selectedTemplate, contextValues]);

  useEffect(() => {
    if (!open) return;

    const draftsRaw = window.localStorage.getItem(DRAFT_STORAGE_KEY);
    let drafts: Record<string, unknown> = {};
    if (draftsRaw) {
      try {
        drafts = JSON.parse(draftsRaw) as Record<string, unknown>;
      } catch {
        drafts = {};
      }
    }

    drafts[buildStorageScope(moduleKey, recordId)] = {
      to,
      cc,
      bcc,
      subject,
      body,
      isHtml,
      templateKey,
      selectedPdfTemplateId,
    };

    window.localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(drafts));
  }, [open, moduleKey, recordId, to, cc, bcc, subject, body, isHtml, templateKey, selectedPdfTemplateId]);

  useEffect(() => {
    if (!open) return;

    const preferenceRaw = window.localStorage.getItem(PREFERENCE_STORAGE_KEY);
    let preferences: Record<string, unknown> = {};
    if (preferenceRaw) {
      try {
        preferences = JSON.parse(preferenceRaw) as Record<string, unknown>;
      } catch {
        preferences = {};
      }
    }

    preferences[moduleKey] = {
      templateKey,
      selectedPdfTemplateId,
    };

    window.localStorage.setItem(PREFERENCE_STORAGE_KEY, JSON.stringify(preferences));
  }, [open, moduleKey, templateKey, selectedPdfTemplateId]);

  useEffect(() => {
    if (!open) return;
    if (availablePdfTemplates.length === 0) return;

    setSelectedPdfTemplateId((current) => {
      if (current && availablePdfTemplates.some((item) => String(item.id) === current)) {
        return current;
      }
      return String(availablePdfTemplates.find((item) => item.default)?.id ?? availablePdfTemplates[0]?.id ?? '');
    });
  }, [open, availablePdfTemplates]);

  useEffect(() => {
    if (!open || missingCustomer) {
      setCustomerDetail(null);
      setContacts([]);
      setRecentSuggestions([]);
      return;
    }

    let cancelled = false;
    setLoadingContext(true);

    void Promise.all([
      customerApi.getById(Number(customerId)),
      contactApi.getList({
        pageNumber: 1,
        pageSize: 100,
        sortBy: 'FullName',
        sortDirection: 'asc',
        filters: [{ column: 'CustomerId', operator: 'equals', value: String(customerId) }],
      }),
      outlookIntegrationApi.getCustomerMailLogs({
        customerId: Number(customerId),
        pageNumber: 1,
        pageSize: 10,
        sortBy: 'createdDate',
        sortDirection: 'desc',
      }),
    ])
      .then(([customerResponse, contactResponse, mailLogs]) => {
        if (cancelled) {
          return;
        }

        setCustomerDetail(customerResponse);
        setContacts(contactResponse.data ?? []);

        const logSuggestions: RecipientSuggestion[] = [];
        (mailLogs.data ?? []).forEach((log) => {
          [log.toEmails, log.ccEmails, log.bccEmails]
            .filter(Boolean)
            .flatMap((value) => parseRecipientInput(value ?? '').valid)
            .forEach((email) => {
              logSuggestions.push({
                email,
                label: email,
                source: t('mailDialog.sources.recentSend'),
              });
            });
        });

        setRecentSuggestions(logSuggestions);
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          const message = error instanceof Error ? error.message : t('mailDialog.contextLoadError');
          setInlineError(message);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingContext(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [open, missingCustomer, customerId, t]);

  const handleTemplateChange = (nextTemplateKey: string): void => {
    setTemplateKey(nextTemplateKey);
    const template = templates.find((item) => item.key === nextTemplateKey) ?? templates[0];
    const next = template.build(contextValues);
    setSubject(next.subject);
    setBody(next.body);
  };

  const handleAddRecipient = (bucket: 'to' | 'cc' | 'bcc', email: string): void => {
    if (bucket === 'to') setTo((current) => appendRecipient(current, email));
    if (bucket === 'cc') setCc((current) => appendRecipient(current, email));
    if (bucket === 'bcc') setBcc((current) => appendRecipient(current, email));
  };

  const handleAddRecipientGroup = (bucket: 'to' | 'cc' | 'bcc', emails: string[]): void => {
    if (emails.length === 0) return;
    if (bucket === 'to') setTo((current) => appendRecipients(current, emails));
    if (bucket === 'cc') setCc((current) => appendRecipients(current, emails));
    if (bucket === 'bcc') setBcc((current) => appendRecipients(current, emails));
  };

  const handleVariableInsert = (token: string, target: 'subject' | 'body'): void => {
    if (target === 'subject') {
      setSubject((current) => `${current}${current.trim() ? ' ' : ''}${token}`);
      return;
    }

    setBody((current) => `${current}${current.trim() ? isHtml ? '<p></p>' : '\n' : ''}${token}`);
  };

  const handleFilesChange = (event: ChangeEvent<HTMLInputElement>): void => {
    const incoming = Array.from(event.target.files ?? []);
    setSelectedFiles((current) => {
      const merged = [...current, ...incoming];
      return merged.filter(
        (file, index, array) =>
          array.findIndex((candidate) => candidate.name === file.name && candidate.size === file.size) === index
      );
    });
    event.target.value = '';
  };

  const handleRemoveFile = (fileName: string): void => {
    setSelectedFiles((current) => current.filter((item) => item.name !== fileName));
  };

  const handleGeneratePdfAttachment = async (): Promise<void> => {
    if (!documentRuleType || !selectedPdfTemplateId) {
      toast.error(t('mailDialog.pdfTemplateRequired'));
      return;
    }

    try {
      setInlineError(null);
      setIsGeneratingPdf(true);

      const blob = await pdfReportTemplateApi.generateDocument(Number(selectedPdfTemplateId), recordId);
      const selectedPdfTemplate = availablePdfTemplates.find((item) => item.id === Number(selectedPdfTemplateId));
      const recordSegment = contextValues.recordNo !== '-' ? contextValues.recordNo : String(recordId);
      const fileName = [
        normalizePdfFileSegment(moduleKey),
        normalizePdfFileSegment(recordSegment),
        normalizePdfFileSegment(selectedPdfTemplate?.title || 'dokuman'),
      ]
        .filter(Boolean)
        .join('-')
        .concat('.pdf');

      const generatedFile = new File([blob], fileName, { type: 'application/pdf' });

      setSelectedFiles((current) => {
        const merged = [...current, generatedFile];
        return merged.filter(
          (file, index, array) =>
            array.findIndex((candidate) => candidate.name === file.name && candidate.size === file.size) === index
        );
      });

      toast.success(t('mailDialog.pdfAttached'));
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : t('mailDialog.pdfGenerateFailed');
      setInlineError(message);
      toast.error(message);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const canSend =
    !missingCustomer &&
    resolvedToRecipients.length > 0 &&
    parsedTo.invalid.length === 0 &&
    parsedCc.invalid.length === 0 &&
    parsedBcc.invalid.length === 0 &&
    resolvedSubject.trim().length > 0 &&
    resolvedBody.trim().length > 0;

  const handleSend = async (): Promise<void> => {
    if (!canSend || missingCustomer) {
      return;
    }

    try {
      setInlineError(null);

      const attachments: OutlookCustomerMailAttachmentDto[] = await Promise.all(
        selectedFiles.map(async (file) => ({
          fileName: file.name,
          contentType: file.type || 'application/octet-stream',
          base64Content: await fileToBase64(file),
        }))
      );

      await sendMutation.mutateAsync({
        customerId: Number(customerId),
        contactId: contactId && contactId > 0 ? Number(contactId) : undefined,
        to: parsedTo.valid.join('; ') || undefined,
        cc: parsedCc.valid.join('; ') || undefined,
        bcc: parsedBcc.valid.join('; ') || undefined,
        subject: resolvedSubject.trim(),
        body: resolvedBody,
        isHtml,
        templateKey: selectedTemplate.key,
        templateName: t(`mailDialog.templateNames.${selectedTemplate.key}`),
        templateVersion: 'v2',
        moduleKey,
        recordId,
        recordNo: contextValues.recordNo,
        revisionNo: contextValues.revisionNo !== '-' ? contextValues.revisionNo : undefined,
        customerCode: contextValues.customerCode !== '-' ? contextValues.customerCode : undefined,
        totalAmountDisplay: contextValues.total !== '-' ? contextValues.total : undefined,
        validUntil: contextValues.validUntil !== '-' ? contextValues.validUntil : undefined,
        recordOwnerName: contextValues.owner !== '-' ? contextValues.owner : undefined,
        contextTitle: contextValues.contextTitle !== '-' ? contextValues.contextTitle : undefined,
        createActivityLog: true,
        attachments,
      });

      const draftsRaw = window.localStorage.getItem(DRAFT_STORAGE_KEY);
      if (draftsRaw) {
        try {
          const drafts = JSON.parse(draftsRaw) as Record<string, unknown>;
          delete drafts[buildStorageScope(moduleKey, recordId)];
          window.localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(drafts));
        } catch {
          // ignore malformed draft cache
        }
      }

      onOpenChange(false);
    } catch (error) {
      setInlineError(error instanceof Error ? error.message : t('mailDialog.sendError'));
    }
  };

  const handleClearDraft = (): void => {
    const next = selectedTemplate.build(contextValues);
    setTo('');
    setCc('');
    setBcc('');
    setSubject(next.subject);
    setBody(next.body);
    setSelectedFiles([]);
    setInlineError(null);

    const draftsRaw = window.localStorage.getItem(DRAFT_STORAGE_KEY);
    if (!draftsRaw) return;

    try {
      const drafts = JSON.parse(draftsRaw) as Record<string, unknown>;
      delete drafts[buildStorageScope(moduleKey, recordId)];
      window.localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(drafts));
    } catch {
      // ignore malformed draft cache
    }
  };

  const recipientPlaceholder = t('mailDialog.recipientPlaceholder');

  const contextFields = [
    { label: t('mailDialog.fields.recordNo'), value: contextValues.recordNo },
    { label: t('mailDialog.fields.revisionNo'), value: contextValues.revisionNo },
    { label: t('mailDialog.fields.customerCode'), value: contextValues.customerCode },
    { label: t('mailDialog.fields.total'), value: contextValues.total },
    { label: t('mailDialog.fields.validUntil'), value: contextValues.validUntil },
    { label: t('mailDialog.fields.owner'), value: contextValues.owner },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-0.75rem)] sm:w-[calc(100vw-2rem)] max-w-[900px] p-0 overflow-hidden bg-white dark:bg-[#100c1c] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white shadow-2xl flex flex-col max-h-[min(92dvh,900px)] sm:max-h-[92vh] rounded-2xl">

        <DialogHeader className="shrink-0 px-5 pt-5 pb-4 sm:px-6 sm:pt-6 sm:pb-5 border-b border-slate-100 dark:border-white/6">
          <div className="flex items-start gap-3 pr-8">
            <div className="shrink-0 mt-0.5 h-9 w-9 rounded-xl bg-linear-to-br from-sky-600 to-blue-500 flex items-center justify-center shadow-md shadow-sky-500/20">
              <Mail className="h-4 w-4 text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <DialogTitle className="text-base font-semibold text-slate-900 dark:text-white leading-snug">
                {t('mailDialog.title')}
              </DialogTitle>
              <DialogDescription className="mt-0.5 text-sm text-slate-500 dark:text-slate-400 leading-snug">
                {t('mailDialog.description', { module: moduleLabel, id: recordId })}
              </DialogDescription>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            <span className="rounded-full bg-violet-50 dark:bg-violet-950/60 border border-violet-200 dark:border-violet-700/50 px-2.5 py-0.5 text-xs font-medium text-sky-700 dark:text-sky-300">
              {moduleLabel}
            </span>
            <span className="rounded-full bg-slate-100 dark:bg-white/8 border border-slate-200 dark:border-white/10 px-2.5 py-0.5 text-xs font-mono text-slate-600 dark:text-slate-300">
              {contextValues.recordNo}
            </span>
            {contextValues.customer !== '-' && (
              <span className="rounded-full bg-slate-100 dark:bg-white/8 border border-slate-200 dark:border-white/10 px-2.5 py-0.5 text-xs text-slate-500 dark:text-slate-400 max-w-[200px] truncate">
                {contextValues.customer}
              </span>
            )}
            {loadingContext && (
              <span className="inline-flex items-center gap-1 text-xs text-slate-400 dark:text-slate-500">
                <RefreshCcw className="h-3 w-3 animate-spin" />
                {t('mailDialog.loadingContext')}
              </span>
            )}
          </div>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
          <div className="px-5 py-4 sm:px-6 sm:py-5 space-y-4">
            {missingCustomer && (
              <Alert className="border-amber-200 dark:border-amber-700/40 bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300 rounded-xl [&>svg]:text-amber-500">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-sm">{t('mailDialog.missingCustomer')}</AlertDescription>
              </Alert>
            )}
            {inlineError && (
              <Alert className="border-red-200 dark:border-red-700/40 bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300 rounded-xl [&>svg]:text-red-500">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-sm">{inlineError}</AlertDescription>
              </Alert>
            )}
            {(parsedTo.invalid.length > 0 || parsedCc.invalid.length > 0 || parsedBcc.invalid.length > 0) && (
              <Alert className="border-amber-200 dark:border-amber-700/40 bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300 rounded-xl [&>svg]:text-amber-500">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-sm">
                  {t('mailDialog.invalidRecipients')}
                  <span className="block mt-1 text-xs font-mono opacity-80">
                    {[...parsedTo.invalid, ...parsedCc.invalid, ...parsedBcc.invalid].join(', ')}
                  </span>
                </AlertDescription>
              </Alert>
            )}

            <div className="rounded-xl border border-slate-100 dark:border-white/8 bg-slate-50 dark:bg-white/4 overflow-x-auto scrollbar-none">
              <div className="flex min-w-max divide-x divide-slate-100 dark:divide-white/8">
                {contextFields.map((f) => (
                  <div key={f.label} className="flex flex-col px-4 py-2.5">
                    <span className="text-[10px] font-medium uppercase tracking-widest text-slate-400 dark:text-slate-500 whitespace-nowrap">{f.label}</span>
                    <span className="mt-0.5 text-sm font-semibold text-slate-800 dark:text-slate-200 whitespace-nowrap">{f.value}</span>
                  </div>
                ))}
              </div>
            </div>

            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'compose' | 'preview')}>
              <TabsList className="h-8 w-full max-w-[200px] rounded-lg bg-slate-100 dark:bg-white/8 p-1 gap-1">
                <TabsTrigger value="compose" className="flex-1 h-full rounded-md text-xs font-medium transition-all data-[state=active]:bg-white dark:data-[state=active]:bg-white/12 data-[state=active]:shadow-sm">
                  {t('mailDialog.tabs.compose')}
                </TabsTrigger>
                <TabsTrigger value="preview" className="flex-1 h-full rounded-md text-xs font-medium transition-all data-[state=active]:bg-white dark:data-[state=active]:bg-white/12 data-[state=active]:shadow-sm">
                  {t('mailDialog.tabs.preview')}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="compose" className="mt-4">
                <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_260px]">
                  <div className="space-y-4 min-w-0">
                    <div className="rounded-xl border border-slate-200 dark:border-white/8 overflow-hidden">
                      <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-50 dark:bg-white/4 border-b border-slate-100 dark:border-white/6">
                        <span className="h-1.5 w-1.5 rounded-full bg-violet-500" />
                        <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 uppercase tracking-wide">{t('mailDialog.toLabel')}</span>
                      </div>
                      <div className="px-4 py-3 space-y-3 bg-white dark:bg-transparent">
                        <div className="grid gap-3 sm:grid-cols-2">
                          <div className="space-y-1">
                            <Label htmlFor="g-to" className="text-xs text-slate-500 dark:text-slate-400">{t('mailDialog.toLabel')}</Label>
                            <RecipientTokenField
                              id="g-to"
                              value={to}
                              onChange={setTo}
                              placeholder={t('mailDialog.autoRecipientHint')}
                              suggestions={recipientOptionDirectory}
                              invalidValues={parsedTo.invalid}
                            />
                          </div>
                          <div className="space-y-1">
                            <Label htmlFor="g-cc" className="text-xs text-slate-500 dark:text-slate-400">{t('mailDialog.ccLabel')}</Label>
                            <RecipientTokenField
                              id="g-cc"
                              value={cc}
                              onChange={setCc}
                              placeholder={recipientPlaceholder}
                              suggestions={recipientOptionDirectory}
                              invalidValues={parsedCc.invalid}
                            />
                          </div>
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor="g-bcc" className="text-xs text-slate-500 dark:text-slate-400">{t('mailDialog.bccLabel')}</Label>
                          <RecipientTokenField
                            id="g-bcc"
                            value={bcc}
                            onChange={setBcc}
                            placeholder={recipientPlaceholder}
                            suggestions={recipientOptionDirectory}
                            invalidValues={parsedBcc.invalid}
                          />
                        </div>
                        {resolvedToRecipients.length > 0 && !to.trim() && (
                          <p className="text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/40 rounded-lg px-3 py-2">
                            {t('mailDialog.autoResolvedTo', { emails: resolvedToRecipients.join('; ') })}
                          </p>
                        )}
                        {recipientSuggestions.length > 0 && (
                          <div className="space-y-1.5">
                            <p className="text-[11px] uppercase tracking-widest font-medium text-slate-400 dark:text-slate-500">{t('mailDialog.recipientAssistant')}</p>
                            {recipientSuggestions.map((s) => (
                              <div key={`${s.source}-${s.email}`} className="flex items-center gap-3 rounded-lg border border-slate-100 dark:border-white/8 bg-slate-50/70 dark:bg-white/4 px-3 py-2">
                                <div className="min-w-0 flex-1">
                                  <p className="text-sm font-medium truncate text-slate-800 dark:text-slate-200">{s.label}</p>
                                  <p className="text-xs text-slate-400 truncate">{s.email}</p>
                                </div>
                                <div className="flex gap-1 shrink-0">
                                  <Button type="button" size="sm" variant="outline" className="h-6 rounded-md px-2 text-xs" onClick={() => handleAddRecipient('to', s.email)}>
                                    {t('mailDialog.addTo')}
                                  </Button>
                                  <Button type="button" size="sm" variant="ghost" className="h-6 rounded-md px-2 text-xs" onClick={() => handleAddRecipient('cc', s.email)}>
                                    {t('mailDialog.ccShort')}
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                        {recipientDirectoryEntries.length > 0 && (
                          <div className="space-y-2 rounded-lg border border-slate-200 dark:border-white/8 bg-slate-50/70 dark:bg-white/4 p-3">
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-[11px] uppercase tracking-widest font-medium text-slate-400 dark:text-slate-500">
                                {t('mailDialog.companyRecipientDirectory', { defaultValue: 'Firma ve kontak alici merkezi' })}
                              </p>
                              <div className="flex gap-1">
                                <Button type="button" size="sm" variant="outline" className="h-6 rounded-md px-2 text-xs" onClick={() => handleAddRecipientGroup('to', recipientDirectoryEntries.map((item) => item.email))}>
                                  {t('mailDialog.addAllTo', { defaultValue: 'Tumunu To ekle' })}
                                </Button>
                              </div>
                            </div>
                            <div className="space-y-1">
                              {recipientDirectoryEntries.map((entry) => (
                                <div key={entry.key} className="flex items-center gap-3 rounded-lg border border-slate-100 dark:border-white/8 bg-white/80 dark:bg-white/2 px-3 py-2">
                                  <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2">
                                      <p className="text-sm font-medium truncate text-slate-800 dark:text-slate-200">{entry.label}</p>
                                      <span className="shrink-0 rounded-full bg-slate-100 dark:bg-white/8 px-2 py-0.5 text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                                        {entry.bucketLabel}
                                      </span>
                                    </div>
                                    <p className="text-xs text-slate-400 truncate">{entry.email}</p>
                                  </div>
                                  <div className="flex gap-1 shrink-0">
                                    <Button type="button" size="sm" variant="outline" className="h-6 rounded-md px-2 text-xs" onClick={() => handleAddRecipient('to', entry.email)}>
                                      {t('mailDialog.addTo')}
                                    </Button>
                                    <Button type="button" size="sm" variant="ghost" className="h-6 rounded-md px-2 text-xs" onClick={() => handleAddRecipient('cc', entry.email)}>
                                      {t('mailDialog.ccShort')}
                                    </Button>
                                    <Button type="button" size="sm" variant="ghost" className="h-6 rounded-md px-2 text-xs" onClick={() => handleAddRecipient('bcc', entry.email)}>
                                      Bcc
                                    </Button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="rounded-xl border border-slate-200 dark:border-white/8 overflow-hidden">
                      <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-50 dark:bg-white/4 border-b border-slate-100 dark:border-white/6">
                        <span className="h-1.5 w-1.5 rounded-full bg-fuchsia-500" />
                        <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 uppercase tracking-wide">{t('mailDialog.bodyLabel')}</span>
                      </div>
                      <div className="px-4 py-3 space-y-3 bg-white dark:bg-transparent">

                        <div className="space-y-1">
                          <Label className="text-xs text-slate-500 dark:text-slate-400">{t('mailDialog.templateLabel')}</Label>
                          <div className="flex flex-wrap gap-1.5">
                            {templates.map((item) => (
                              <button
                                key={item.key}
                                type="button"
                                onClick={() => handleTemplateChange(item.key)}
                                className={`rounded-full px-3 py-1 text-xs font-medium border transition-all ${
                                  templateKey === item.key
                                    ? 'bg-sky-600 border-sky-600 text-white shadow-sm'
                                    : 'bg-white dark:bg-white/4 border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:border-sky-400 hover:text-sky-700 dark:hover:text-sky-300'
                                }`}
                              >
                                {t(`mailDialog.templateNames.${item.key}`)}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="space-y-1">
                          <Label htmlFor="g-subject" className="text-xs text-slate-500 dark:text-slate-400">{t('mailDialog.subjectLabel')}</Label>
                          <Input
                            id="g-subject"
                            value={subject}
                            onChange={(e) => setSubject(e.target.value)}
                            maxLength={250}
                            className="h-9 text-sm rounded-lg border-slate-200 dark:border-white/10 focus-visible:ring-sky-500"
                          />
                          {resolvedSubject && resolvedSubject !== subject && (
                            <p className="text-xs text-slate-400 dark:text-slate-500 truncate">→ {resolvedSubject}</p>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <Checkbox
                            id="g-html"
                            checked={isHtml}
                            onCheckedChange={(v) => setIsHtml(Boolean(v))}
                            className="data-[state=checked]:bg-sky-600 data-[state=checked]:border-sky-600"
                          />
                          <Label htmlFor="g-html" className="text-xs cursor-pointer text-slate-500 dark:text-slate-400">
                            {t('mailDialog.isHtmlLabel')}
                          </Label>
                        </div>

                        {isHtml ? (
                          <RichTextEditor value={body} onChange={setBody} className="rounded-lg border-slate-200 dark:border-white/10" />
                        ) : (
                          <Textarea
                            id="g-body"
                            value={body}
                            onChange={(e) => setBody(e.target.value)}
                            rows={8}
                            className="resize-y min-h-[180px] text-sm rounded-lg border-slate-200 dark:border-white/10 focus-visible:ring-sky-500"
                          />
                        )}
                      </div>
                    </div>

                    {documentRuleType !== null && (
                      <div className="rounded-xl border border-slate-200 dark:border-white/8 bg-white dark:bg-transparent overflow-hidden">
                        <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-50 dark:bg-white/4 border-b border-slate-100 dark:border-white/6">
                          <FileText className="h-3.5 w-3.5 text-slate-400" />
                          <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide">
                            {t('mailDialog.pdfCardTitle')}
                          </span>
                          {availablePdfTemplates.length > 0 && (
                            <span className="ml-auto rounded-full bg-sky-100 dark:bg-sky-950/50 px-1.5 py-0.5 text-[10px] font-bold text-sky-700 dark:text-sky-300">
                              {availablePdfTemplates.length}
                            </span>
                          )}
                        </div>
                        <div className="px-4 py-3 space-y-3">
                          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                            {t('mailDialog.pdfCardDescription')}
                          </p>
                          {availablePdfTemplates.length > 0 && (
                            <div className="space-y-2">
                              <Label className="text-xs text-slate-500 dark:text-slate-400">
                                {t('mailDialog.pdfTemplateLabel')}
                              </Label>
                              <Select value={selectedPdfTemplateId} onValueChange={setSelectedPdfTemplateId}>
                                <SelectTrigger className="h-10 rounded-lg border-slate-200 dark:border-white/10">
                                  <SelectValue placeholder={t('mailDialog.pdfTemplatePlaceholder')} />
                                </SelectTrigger>
                                <SelectContent>
                                  {availablePdfTemplates.map((item) => (
                                    <SelectItem key={item.id} value={String(item.id)}>
                                      {item.title}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <div className="grid gap-2 sm:grid-cols-2">
                                {availablePdfTemplates.map((item) => {
                                  const isSelected = selectedPdfTemplateId === String(item.id);
                                  return (
                                    <button
                                      key={item.id}
                                      type="button"
                                      onClick={() => setSelectedPdfTemplateId(String(item.id))}
                                      className={`rounded-xl border px-3 py-3 text-left transition-all ${
                                        isSelected
                                          ? 'border-violet-500 bg-violet-50 dark:bg-violet-950/30 shadow-sm'
                                          : 'border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/4 hover:border-violet-300 dark:hover:border-violet-700'
                                      }`}
                                    >
                                      <div className="flex items-start justify-between gap-2">
                                        <div className="min-w-0">
                                          <div className="text-sm font-medium text-slate-800 dark:text-slate-100 break-words">
                                            {item.title}
                                          </div>
                                          <div className="mt-1 text-[11px] uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">
                                            {item.default
                                              ? t('mailDialog.defaultPdfTemplate')
                                              : t('mailDialog.optionalPdfTemplate')}
                                          </div>
                                        </div>
                                        <span
                                          className={`mt-0.5 inline-flex h-4 w-4 shrink-0 rounded-full border ${
                                            isSelected
                                              ? 'border-violet-500 bg-violet-500 shadow-[0_0_0_3px_rgba(139,92,246,0.18)]'
                                              : 'border-slate-300 dark:border-slate-600'
                                          }`}
                                        />
                                      </div>
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]">
                            <div className="rounded-lg border border-dashed border-slate-200 dark:border-white/10 px-3 py-2.5 text-xs text-slate-500 dark:text-slate-400">
                              {selectedPdfTemplateId
                                ? t('mailDialog.selectedPdfTemplateSummary', {
                                    name:
                                      availablePdfTemplates.find((item) => String(item.id) === selectedPdfTemplateId)?.title ??
                                      '-',
                                  })
                                : t('mailDialog.pdfTemplatePlaceholder')}
                            </div>
                            <div className="flex items-end">
                              <Button
                                type="button"
                                variant="outline"
                                className="h-9 rounded-lg"
                                onClick={() => void handleGeneratePdfAttachment()}
                                disabled={
                                  isGeneratingPdf ||
                                  pdfTemplatesQuery.isLoading ||
                                  availablePdfTemplates.length === 0 ||
                                  !selectedPdfTemplateId
                                }
                              >
                                {isGeneratingPdf ? t('mailDialog.generatingPdf') : t('mailDialog.generatePdfAndAttach')}
                              </Button>
                            </div>
                          </div>
                          {pdfTemplatesQuery.isError && (
                            <p className="text-xs text-red-500">
                              {pdfTemplatesQuery.error?.message || t('mailDialog.pdfTemplatesLoadFailed')}
                            </p>
                          )}
                          {!pdfTemplatesQuery.isLoading && availablePdfTemplates.length === 0 && (
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                              {t('mailDialog.noPdfTemplates')}
                            </p>
                          )}
                        </div>
                      </div>
                    )}

                    <div className="rounded-xl border border-slate-200 dark:border-white/8 bg-white dark:bg-transparent">
                      <div className="flex items-center justify-between px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          <Paperclip className="h-3.5 w-3.5 text-slate-400" />
                          <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide">{t('mailDialog.attachmentsTitle')}</span>
                          {selectedFiles.length > 0 && (
                            <span className="rounded-full bg-sky-100 dark:bg-sky-950/50 px-1.5 py-0.5 text-[10px] font-bold text-sky-700 dark:text-sky-300">
                              {selectedFiles.length}
                            </span>
                          )}
                        </div>
                        <Label
                          htmlFor="g-files"
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 dark:border-white/10 px-2.5 py-1 text-xs font-medium cursor-pointer hover:bg-slate-50 dark:hover:bg-white/6 transition-colors"
                        >
                          <Plus className="h-3 w-3" />
                          {t('mailDialog.addAttachment')}
                        </Label>
                        <input id="g-files" type="file" multiple className="hidden" onChange={handleFilesChange} />
                      </div>
                      {selectedFiles.length > 0 && (
                        <div className="px-4 pb-3 flex flex-wrap gap-1.5">
                          {selectedFiles.map((file) => (
                            <div key={`${file.name}-${file.size}`} className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/4 px-2.5 py-1 text-xs text-slate-600 dark:text-slate-300">
                              <FileText className="h-3 w-3 shrink-0" />
                              <span className="max-w-[120px] truncate">{file.name}</span>
                              <button type="button" onClick={() => handleRemoveFile(file.name)} aria-label={t('mailDialog.removeAttachment')} className="text-slate-400 hover:text-red-500 transition-colors">
                                <X className="h-3 w-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-4 min-w-0">
                    <div className="rounded-xl border border-slate-200 dark:border-white/8 overflow-hidden">
                      <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-50 dark:bg-white/4 border-b border-slate-100 dark:border-white/6">
                        <Mail className="h-3.5 w-3.5 text-slate-400" />
                        <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 uppercase tracking-wide">{t('mailDialog.previewHeader')}</span>
                      </div>
                      <div className="px-4 py-3 space-y-2 bg-white dark:bg-transparent">
                        <div className="space-y-0.5">
                          <p className="text-[10px] uppercase tracking-widest font-medium text-slate-400">{t('mailDialog.subjectLabel')}</p>
                          <p className="text-sm text-slate-700 dark:text-slate-200 line-clamp-2 font-medium">{resolvedSubject || '—'}</p>
                        </div>
                        <div className="space-y-0.5">
                          <p className="text-[10px] uppercase tracking-widest font-medium text-slate-400">{t('mailDialog.templateLabel')}</p>
                          <p className="text-xs text-slate-600 dark:text-slate-300">{t(`mailDialog.templateNames.${selectedTemplate.key}`)}</p>
                        </div>
                        <div className="space-y-0.5">
                          <p className="text-[10px] uppercase tracking-widest font-medium text-slate-400">{t('mailDialog.pdfTemplateLabel')}</p>
                          <p className="text-xs text-slate-600 dark:text-slate-300">{availablePdfTemplates.find((item) => String(item.id) === selectedPdfTemplateId)?.title || '—'}</p>
                        </div>
                        <div className="space-y-0.5">
                          <p className="text-[10px] uppercase tracking-widest font-medium text-slate-400">{t('mailDialog.toLabel').split('(')[0].trim()}</p>
                          <p className="text-xs text-slate-600 dark:text-slate-300 break-all">{resolvedToRecipients.join('; ') || '—'}</p>
                        </div>
                        {parsedCc.valid.length > 0 && (
                          <div className="space-y-0.5">
                            <p className="text-[10px] uppercase tracking-widest font-medium text-slate-400">{t('mailDialog.ccShort')}</p>
                            <p className="text-xs text-slate-600 dark:text-slate-300 break-all">{parsedCc.valid.join('; ')}</p>
                          </div>
                        )}
                        <div className={`flex items-center gap-1.5 mt-2 pt-2 border-t border-slate-100 dark:border-white/6 text-xs ${canSend ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 dark:text-slate-500'}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${canSend ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'}`} />
                          {canSend ? t('mailDialog.readyToSend') : t('mailDialog.notReadyToSend')}
                        </div>
                        <p className="text-[11px] text-slate-400 dark:text-slate-500">
                          {t('mailDialog.activityLogEnabled')}
                        </p>
                      </div>
                    </div>
                    <div className="rounded-xl border border-slate-200 dark:border-white/8 overflow-hidden">
                      <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-50 dark:bg-white/4 border-b border-slate-100 dark:border-white/6">
                        <Sparkles className="h-3.5 w-3.5 text-fuchsia-400" />
                        <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 uppercase tracking-wide">{t('mailDialog.variablesTitle')}</span>
                      </div>
                      <div className="px-3 py-2 space-y-1 bg-white dark:bg-transparent">
                        {variableTokens.map((item) => (
                          <div key={item.token} className="flex items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 hover:bg-slate-50 dark:hover:bg-white/4 group">
                            <div className="min-w-0">
                              <p className="text-xs font-medium text-slate-700 dark:text-slate-300">{item.label}</p>
                              <p className="text-[10px] font-mono text-slate-400 dark:text-slate-500 truncate">{item.token}</p>
                            </div>
                            <div className="flex gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                type="button"
                                title={t('mailDialog.insertSubject')}
                                onClick={() => handleVariableInsert(item.token, 'subject')}
                                className="rounded-md border border-slate-200 dark:border-white/10 bg-white dark:bg-white/6 px-1.5 py-0.5 text-[10px] font-medium text-slate-500 hover:text-sky-600 hover:border-sky-400 transition-colors"
                              >
                                {t('mailDialog.subjectShort')}
                              </button>
                              <button
                                type="button"
                                title={t('mailDialog.insertBody')}
                                onClick={() => handleVariableInsert(item.token, 'body')}
                                className="rounded-md border border-slate-200 dark:border-white/10 bg-white dark:bg-white/6 px-1.5 py-0.5 text-[10px] font-medium text-slate-500 hover:text-fuchsia-600 hover:border-fuchsia-400 transition-colors"
                              >
                                {t('mailDialog.bodyShort')}
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-xl border border-slate-100 dark:border-white/6 bg-slate-50/60 dark:bg-white/3 px-4 py-3">
                      <p className="text-[10px] uppercase tracking-widest font-semibold text-slate-400 dark:text-slate-500 mb-2">{t('mailDialog.deliveryPolicy')}</p>
                      <ul className="space-y-1.5">
                        {[
                          t('mailDialog.policies.validation'),
                          t('mailDialog.policies.activity'),
                          t('mailDialog.policies.logging'),
                        ].map((policy) => (
                          <li key={policy} className="flex items-start gap-1.5 text-xs text-slate-500 dark:text-slate-500">
                            <span className="mt-[5px] h-1 w-1 rounded-full bg-slate-300 dark:bg-slate-600 shrink-0" />
                            {policy}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="preview" className="mt-4">
                <div className="rounded-xl border border-slate-200 dark:border-white/8 overflow-hidden">
                  <div className="px-5 py-4 border-b border-slate-100 dark:border-white/6 space-y-1.5 bg-white dark:bg-transparent">
                    <h3 className="font-semibold text-slate-900 dark:text-white text-base">{resolvedSubject || '—'}</h3>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                      <span>
                        <span className="font-medium">{t('mailDialog.toLabel').split('(')[0].trim()}:</span>{' '}
                        {resolvedToRecipients.join('; ') || '—'}
                      </span>
                      {parsedCc.valid.length > 0 && (
                        <span><span className="font-medium">{t('mailDialog.ccShort')}:</span> {parsedCc.valid.join('; ')}</span>
                      )}
                      {parsedBcc.valid.length > 0 && (
                        <span><span className="font-medium">{t('mailDialog.bccShort')}:</span> {parsedBcc.valid.join('; ')}</span>
                      )}
                    </div>
                  </div>
                  <div className="px-5 py-5 bg-white dark:bg-transparent">
                    {isHtml ? (
                      <div className="prose prose-sm max-w-none dark:prose-invert" dangerouslySetInnerHTML={{ __html: resolvedBody }} />
                    ) : (
                      <pre className="whitespace-pre-wrap text-sm font-sans text-slate-700 dark:text-slate-200">{resolvedBody}</pre>
                    )}
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>

        <div className="shrink-0 px-5 py-3 sm:px-6 border-t border-slate-100 dark:border-white/6 bg-slate-50/60 dark:bg-white/3 backdrop-blur-sm">
          <DialogFooter className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center sm:justify-end gap-2 sm:gap-2.5">
            <Button
              variant="ghost"
              onClick={handleClearDraft}
              className="h-9 px-4 rounded-lg text-sm font-medium"
            >
              {t('mailDialog.clearDraft')}
            </Button>
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="h-9 px-5 rounded-lg border-slate-200 dark:border-white/10 text-sm font-medium hover:bg-slate-100 dark:hover:bg-white/8 transition-colors"
            >
              {t('mailDialog.cancel')}
            </Button>
            <Button
              onClick={() => void handleSend()}
              disabled={sendMutation.isPending || !canSend}
              className="h-9 px-5 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-sm font-medium shadow-md shadow-sky-500/20 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none disabled:hover:scale-100 min-w-[100px]"
            >
              {sendMutation.isPending ? (
                <span className="flex items-center justify-center gap-1.5">
                  <RefreshCcw className="h-3.5 w-3.5 animate-spin" />
                  {t('mailDialog.sending')}
                </span>
              ) : (
                <span className="flex items-center justify-center gap-1.5">
                  <Mail className="h-3.5 w-3.5" />
                  {t('mailDialog.send')}
                </span>
              )}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}

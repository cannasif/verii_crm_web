import { type ReactElement, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Mail } from 'lucide-react';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useSendGoogleCustomerMailMutation } from '../hooks/useGoogleIntegrationMutations';

interface GoogleCustomerMailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  moduleKey: 'activity' | 'demand' | 'quotation' | 'order';
  recordId: number;
  customerId?: number | null;
  contactId?: number | null;
  customerName?: string | null;
  contactName?: string | null;
}

interface MailTemplateOption {
  key: string;
  build: (ctx: { moduleLabel: string; recordId: number; customerName?: string | null; contactName?: string | null }) => {
    subject: string;
    body: string;
  };
}

export function GoogleCustomerMailDialog({
  open,
  onOpenChange,
  moduleKey,
  recordId,
  customerId,
  contactId,
  customerName,
  contactName,
}: GoogleCustomerMailDialogProps): ReactElement {
  const { t } = useTranslation('google-integration');
  const sendMutation = useSendGoogleCustomerMailMutation();
  const [templateKey, setTemplateKey] = useState<string>('generic-info');
  const [to, setTo] = useState<string>('');
  const [cc, setCc] = useState<string>('');
  const [bcc, setBcc] = useState<string>('');
  const [subject, setSubject] = useState<string>('');
  const [body, setBody] = useState<string>('');
  const [isHtml, setIsHtml] = useState<boolean>(false);

  const moduleLabel = useMemo(
    () => t(`mailDialog.modules.${moduleKey}`),
    [moduleKey, t]
  );

  const templates = useMemo<MailTemplateOption[]>(
    () => [
      {
        key: 'generic-info',
        build: ({ moduleLabel: ml, recordId: id, customerName: cn }) => ({
          subject: t('mailDialog.templates.generic.subject', { module: ml, id }),
          body: t('mailDialog.templates.generic.body', { module: ml, id, customer: cn || '-' }),
        }),
      },
      {
        key: 'follow-up',
        build: ({ moduleLabel: ml, recordId: id, customerName: cn, contactName: ct }) => ({
          subject: t('mailDialog.templates.followUp.subject', { module: ml, id }),
          body: t('mailDialog.templates.followUp.body', { module: ml, id, customer: cn || '-', contact: ct || '-' }),
        }),
      },
      {
        key: 'reminder',
        build: ({ moduleLabel: ml, recordId: id, customerName: cn }) => ({
          subject: t('mailDialog.templates.reminder.subject', { module: ml, id }),
          body: t('mailDialog.templates.reminder.body', { module: ml, id, customer: cn || '-' }),
        }),
      },
    ],
    [t]
  );

  const selectedTemplate = templates.find((x) => x.key === templateKey) ?? templates[0];
  const missingCustomer = !customerId || customerId <= 0;

  useEffect(() => {
    if (!open) {
      return;
    }

    const initial = selectedTemplate.build({ moduleLabel, recordId, customerName, contactName });
    setTo('');
    setCc('');
    setBcc('');
    setSubject(initial.subject);
    setBody(initial.body);
    setIsHtml(false);
  }, [open, selectedTemplate, moduleLabel, recordId, customerName, contactName]);

  const handleTemplateChange = (nextTemplateKey: string): void => {
    setTemplateKey(nextTemplateKey);
    const template = templates.find((x) => x.key === nextTemplateKey) ?? templates[0];
    const next = template.build({ moduleLabel, recordId, customerName, contactName });
    setSubject(next.subject);
    setBody(next.body);
  };

  const handleSend = async (): Promise<void> => {
    if (missingCustomer || !subject.trim() || !body.trim()) {
      return;
    }

    await sendMutation.mutateAsync({
      customerId: Number(customerId),
      contactId: contactId && contactId > 0 ? Number(contactId) : undefined,
      to: to.trim() || undefined,
      cc: cc.trim() || undefined,
      bcc: bcc.trim() || undefined,
      subject: subject.trim(),
      body,
      isHtml,
      templateKey: selectedTemplate.key,
      templateName: t(`mailDialog.templateNames.${selectedTemplate.key}`),
      templateVersion: 'v1',
    });

    onOpenChange(false);
  };

  const recipientPlaceholder = t('mailDialog.recipientPlaceholder');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-1rem)] sm:w-[calc(100vw-2rem)] max-w-[800px] p-0 overflow-hidden bg-white dark:bg-[#130822] border border-slate-100 dark:border-white/10 text-slate-900 dark:text-white shadow-2xl flex flex-col max-h-[90vh]">
        <DialogHeader className="px-6 py-5 border-b border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-[#1a1025]/50 flex flex-row items-center justify-between sticky top-0 z-10 backdrop-blur-sm shrink-0">
          <DialogTitle className="text-slate-900 dark:text-white flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-linear-to-br from-pink-500 to-orange-500 p-0.5 shadow-lg shadow-pink-500/20">
              <div className="h-full w-full bg-white dark:bg-[#130822] rounded-[10px] flex items-center justify-center">
                <Mail className="h-5 w-5 text-pink-600 dark:text-pink-500" />
              </div>
            </div>
            <div className="flex flex-col gap-0.5 min-w-0">
              <span>{t('mailDialog.title')}</span>
              <span className="text-xs font-normal text-slate-500 dark:text-slate-400">
                {t('mailDialog.description', { module: moduleLabel, id: recordId })}
              </span>
            </div>
          </DialogTitle>
          <DialogDescription className="sr-only">
            {t('mailDialog.description', { module: moduleLabel, id: recordId })}
          </DialogDescription>
        </DialogHeader>

        <div className="p-6 overflow-y-auto custom-scrollbar bg-slate-50/30 dark:bg-[#0f0a18]/30 flex-1">
          <div className="flex flex-col gap-4">
            {missingCustomer && (
              <Alert className="border-amber-200 dark:border-amber-800/50 bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-200 [&>svg]:text-amber-600 dark:[&>svg]:text-amber-400">
                <AlertDescription>{t('mailDialog.missingCustomer')}</AlertDescription>
              </Alert>
            )}

            <div className="p-3 rounded-xl border border-slate-100 dark:border-white/5 bg-white dark:bg-[#1a1025] shadow-sm">
              <div className="grid gap-2">
                <Label htmlFor="google-mail-template" className="text-slate-700 dark:text-slate-300">
                  {t('mailDialog.templateLabel')}
                </Label>
                <Select value={templateKey} onValueChange={handleTemplateChange}>
                  <SelectTrigger id="google-mail-template" className="h-9 border-slate-200 dark:border-white/10 focus-visible:ring-purple-500">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {templates.map((item) => (
                      <SelectItem key={item.key} value={item.key}>
                        {t(`mailDialog.templateNames.${item.key}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="p-3 rounded-xl border border-slate-100 dark:border-white/5 bg-white dark:bg-[#1a1025] shadow-sm">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="grid gap-2">
                  <Label htmlFor="google-mail-to" className="text-slate-700 dark:text-slate-300">
                    {t('mailDialog.toLabel')}
                  </Label>
                  <Input
                    id="google-mail-to"
                    value={to}
                    onChange={(event) => setTo(event.target.value)}
                    placeholder={t('mailDialog.autoRecipientHint')}
                    className="h-9 text-sm border-slate-200 dark:border-white/10 focus-visible:ring-purple-500"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="google-mail-cc" className="text-slate-700 dark:text-slate-300">
                    {t('mailDialog.ccLabel')}
                  </Label>
                  <Input
                    id="google-mail-cc"
                    value={cc}
                    onChange={(event) => setCc(event.target.value)}
                    placeholder={recipientPlaceholder}
                    className="h-9 text-sm border-slate-200 dark:border-white/10 focus-visible:ring-purple-500"
                  />
                </div>
              </div>
              <div className="grid gap-2 mt-3">
                <Label htmlFor="google-mail-bcc" className="text-slate-700 dark:text-slate-300">
                  {t('mailDialog.bccLabel')}
                </Label>
                <Input
                  id="google-mail-bcc"
                  value={bcc}
                  onChange={(event) => setBcc(event.target.value)}
                  placeholder={recipientPlaceholder}
                  className="h-9 text-sm border-slate-200 dark:border-white/10 focus-visible:ring-purple-500"
                />
              </div>
            </div>

            <div className="p-3 rounded-xl border border-slate-100 dark:border-white/5 bg-white dark:bg-[#1a1025] shadow-sm">
              <div className="grid gap-2">
                <Label htmlFor="google-mail-subject" className="text-slate-700 dark:text-slate-300">
                  {t('mailDialog.subjectLabel')}
                </Label>
                <Input
                  id="google-mail-subject"
                  value={subject}
                  onChange={(event) => setSubject(event.target.value)}
                  maxLength={250}
                  className="h-9 text-sm border-slate-200 dark:border-white/10 focus-visible:ring-purple-500"
                />
              </div>
            </div>

            <div className="p-3 rounded-xl border border-slate-100 dark:border-white/5 bg-white dark:bg-[#1a1025] shadow-sm">
              <div className="grid gap-2">
                <Label htmlFor="google-mail-body" className="text-slate-700 dark:text-slate-300">
                  {t('mailDialog.bodyLabel')}
                </Label>
                <Textarea
                  id="google-mail-body"
                  value={body}
                  onChange={(event) => setBody(event.target.value)}
                  rows={8}
                  className="resize-y min-h-[120px] text-sm border-slate-200 dark:border-white/10 focus-visible:ring-purple-500"
                />
              </div>
              <div className="flex items-center gap-2 mt-3">
                <Checkbox
                  id="google-mail-is-html"
                  checked={isHtml}
                  onCheckedChange={(checked) => setIsHtml(Boolean(checked))}
                  className="data-[state=checked]:bg-purple-600 data-[state=checked]:border-purple-600"
                />
                <Label htmlFor="google-mail-is-html" className="font-normal cursor-pointer text-slate-600 dark:text-slate-400 text-sm">
                  {t('mailDialog.isHtmlLabel')}
                </Label>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="px-6 py-4 border-t border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-[#1a1025]/50 flex justify-between sm:justify-end gap-3 sticky bottom-0 z-10 backdrop-blur-sm shrink-0">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="h-10 px-6 rounded-xl border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
          >
            {t('mailDialog.cancel')}
          </Button>
          <Button
            onClick={() => void handleSend()}
            disabled={missingCustomer || sendMutation.isPending || !subject.trim() || !body.trim()}
            className="h-10 px-6 rounded-xl bg-purple-600 hover:bg-purple-700 text-white shadow-lg shadow-purple-500/20 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none"
          >
            {sendMutation.isPending ? t('mailDialog.sending') : t('mailDialog.send')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

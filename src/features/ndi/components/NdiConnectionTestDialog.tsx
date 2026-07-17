import { type FormEvent, type ReactElement, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { CheckCircle2, Eye, EyeOff, Loader2, PlugZap, ShieldAlert } from 'lucide-react';

import { useMyPermissionsQuery } from '@/features/access-control/hooks/useMyPermissionsQuery';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ndiApi, type NdiConnectionTestRequest } from '../api/ndi-api';

const INITIAL_FORM: NdiConnectionTestRequest = {
  dbName: 'WIN24',
  username: 'v3rii',
  password: '',
  branchCode: '0',
  dbUser: 'TEMELSET',
  dbPassword: '',
  dbType: 'MSSQL',
};

function getFailureHint(message: string): string | null {
  if (message.includes('TBLPARAM')) {
    return 'Seçilen veritabanında bu şube kodu tanımlı değil. Firmanın gerçek şube kodunu deneyin.';
  }
  if (message.toLowerCase().includes('unsupported_grant_type')) {
    return 'Bu yol JSON login kabul etmiyor. Sistem diğer desteklenen token yollarını da otomatik denedi.';
  }
  return null;
}

export function NdiConnectionTestDialog(): ReactElement | null {
  const { data: permissions } = useMyPermissionsQuery();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<NdiConnectionTestRequest>(INITIAL_FORM);
  const [showPassword, setShowPassword] = useState(false);
  const [showDbPassword, setShowDbPassword] = useState(false);
  const canManage = permissions?.isSystemAdmin === true || ['tenantadmin', 'systemadmin'].includes((permissions?.roleTitle ?? '').trim().toLowerCase());
  const mutation = useMutation({ mutationFn: ndiApi.testConnection });

  if (!canManage) return null;

  const updateField = (field: keyof NdiConnectionTestRequest, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
    mutation.reset();
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    mutation.mutate({
      dbName: form.dbName.trim(),
      username: form.username.trim(),
      password: form.password,
      branchCode: form.branchCode.trim(),
      dbUser: form.dbUser.trim(),
      dbPassword: form.dbPassword,
      dbType: form.dbType,
    });
  };

  const failureMessage = mutation.error instanceof Error ? mutation.error.message : null;
  const failureHint = failureMessage ? getFailureHint(failureMessage) : null;
  const isValid = Boolean(form.dbName.trim() && form.username.trim() && form.password && form.branchCode.trim() && form.dbUser.trim() && form.dbType);

  return (
    <Dialog open={open} onOpenChange={(next) => { setOpen(next); if (!next) { mutation.reset(); setForm((current) => ({ ...current, password: '', dbPassword: '' })); } }}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" className="h-10 border-white/45 bg-white/10 px-3 text-white hover:bg-white/20 hover:text-white dark:border-white/20">
          <PlugZap className="size-4" />
          Bağlantı testi
        </Button>
      </DialogTrigger>
      <DialogContent className="border-slate-300 bg-[var(--crm-app-panel)] p-0 dark:border-white/20 lg:max-w-2xl">
        <form onSubmit={handleSubmit} autoComplete="off">
          <DialogHeader className="border-b border-slate-200 px-5 py-4 pr-14 dark:border-white/15">
            <DialogTitle>NDI Netsis bağlantı testi</DialogTitle>
            <DialogDescription>Deneme bilgileri kaydedilmez ve alınan token ekranda gösterilmez.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 p-5 sm:grid-cols-2">
            <Field label="Veritabanı adı"><Input value={form.dbName} onChange={(e) => updateField('dbName', e.target.value)} maxLength={64} /></Field>
            <Field label="Şube kodu"><Input value={form.branchCode} onChange={(e) => updateField('branchCode', e.target.value)} maxLength={16} /></Field>
            <Field label="Netsis kullanıcı adı"><Input value={form.username} onChange={(e) => updateField('username', e.target.value)} maxLength={64} /></Field>
            <PasswordField label="Netsis şifresi" value={form.password} visible={showPassword} onToggle={() => setShowPassword((value) => !value)} onChange={(value) => updateField('password', value)} />
            <Field label="Veritabanı kullanıcısı"><Input value={form.dbUser} onChange={(e) => updateField('dbUser', e.target.value)} maxLength={64} /></Field>
            <PasswordField label="Veritabanı şifresi" value={form.dbPassword} visible={showDbPassword} required={false} onToggle={() => setShowDbPassword((value) => !value)} onChange={(value) => updateField('dbPassword', value)} />
            <Field label="Veritabanı tipi">
              <Select value={form.dbType} onValueChange={(value) => updateField('dbType', value)}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="MSSQL">MSSQL</SelectItem><SelectItem value="vtMSSQL">vtMSSQL</SelectItem><SelectItem value="0">0</SelectItem></SelectContent>
              </Select>
            </Field>
          </div>
          {mutation.isSuccess && (
            <div className="mx-5 mb-5 flex gap-3 rounded-lg border border-emerald-300 bg-emerald-50 p-4 text-emerald-900 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200">
              <CheckCircle2 className="mt-0.5 size-5 shrink-0" />
              <div className="min-w-0 text-sm"><div className="font-bold">Bağlantı başarılı</div><div className="mt-1 break-words">{mutation.data.dbName} / Şube {mutation.data.branchCode} / {mutation.data.source}</div></div>
            </div>
          )}
          {failureMessage && (
            <div className="mx-5 mb-5 rounded-lg border border-red-300 bg-red-50 p-4 text-red-900 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-200">
              <div className="flex gap-3"><ShieldAlert className="mt-0.5 size-5 shrink-0" /><div className="min-w-0 text-sm"><div className="font-bold">Bağlantı kurulamadı</div>{failureHint && <div className="mt-1 font-semibold">{failureHint}</div>}<div className="mt-2 max-h-40 overflow-y-auto whitespace-pre-wrap break-words font-mono text-xs">{failureMessage}</div></div></div>
            </div>
          )}
          <DialogFooter className="border-t border-slate-200 px-5 py-4 dark:border-white/15">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={mutation.isPending}>Kapat</Button>
            <Button type="submit" disabled={!isValid || mutation.isPending}>{mutation.isPending ? <Loader2 className="size-4 animate-spin" /> : <PlugZap className="size-4" />}Bağlantıyı dene</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: ReactElement }): ReactElement {
  return <div className="space-y-2"><Label>{label}</Label>{children}</div>;
}

function PasswordField({ label, value, visible, required = true, onToggle, onChange }: { label: string; value: string; visible: boolean; required?: boolean; onToggle: () => void; onChange: (value: string) => void }): ReactElement {
  return <Field label={label}><div className="relative"><Input type={visible ? 'text' : 'password'} value={value} required={required} maxLength={256} autoComplete="new-password" className="pr-10" onChange={(e) => onChange(e.target.value)} /><Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1/2 size-8 -translate-y-1/2" onClick={onToggle} aria-label={visible ? `${label} alanını gizle` : `${label} alanını göster`}>{visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}</Button></div></Field>;
}

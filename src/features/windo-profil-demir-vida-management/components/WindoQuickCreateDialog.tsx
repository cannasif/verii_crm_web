import { type ReactElement, useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { VoiceSearchCombobox } from '@/components/shared/VoiceSearchCombobox';
import type { ComboboxOption } from '@/components/shared/VoiceSearchCombobox';
import { windoDefinitionApi } from '../api/windo-definition-api';
import type { WindoDefinitionCreateDto, WindoDefinitionGetDto } from '../types/windo-definition-types';

type WindoQuickCreateKind = 'profil' | 'demir' | 'vida' | 'baski' | 'koliBaski';

interface WindoQuickCreateDialogProps {
  kind: WindoQuickCreateKind;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialProfilDefinitionId?: number | null;
  profilOptions: ComboboxOption[];
  onCreated: (item: WindoDefinitionGetDto) => void;
}

const KIND_LABELS: Record<WindoQuickCreateKind, { tr: string; en: string }> = {
  profil: { tr: 'Profil', en: 'Profile' },
  demir: { tr: 'Demir', en: 'Rebar' },
  vida: { tr: 'Vida', en: 'Screw' },
  baski: { tr: 'Baskı', en: 'Print' },
  koliBaski: { tr: 'Koli Baskı', en: 'Package print' },
};

export function WindoQuickCreateDialog({
  kind,
  open,
  onOpenChange,
  initialProfilDefinitionId,
  profilOptions,
  onCreated,
}: WindoQuickCreateDialogProps): ReactElement {
  const { i18n, t } = useTranslation(['windo-profil-demir-vida-management', 'common']);
  const windoNs = 'windo-profil-demir-vida-management' as const;
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [demirName, setDemirName] = useState('');
  const [vidaName, setVidaName] = useState('');
  const [profilDefinitionId, setProfilDefinitionId] = useState<string | null>(
    initialProfilDefinitionId ? String(initialProfilDefinitionId) : null
  );

  const labels = KIND_LABELS[kind];
  const label = i18n.language.startsWith('tr') ? labels.tr : labels.en;
  const requiresProfil = kind === 'demir' || kind === 'vida';
  const createsBundle = kind === 'profil';

  const mutation = useMutation({
    mutationFn: async (payload: WindoDefinitionCreateDto): Promise<WindoDefinitionGetDto> => {
      if (kind === 'profil') return windoDefinitionApi.createProfil(payload);
      if (kind === 'demir') return windoDefinitionApi.createDemir(payload);
      if (kind === 'vida') return windoDefinitionApi.createVida(payload);
      if (kind === 'baski') return windoDefinitionApi.createBaski(payload);
      return windoDefinitionApi.createKoliBaski(payload);
    },
    onSuccess: async (item) => {
      await queryClient.invalidateQueries({ queryKey: ['windo-definition'] });
      await queryClient.invalidateQueries({ queryKey: ['windo-definition-management'] });
      toast.success(
        t('common.success', {
          defaultValue: `${label} kaydı oluşturuldu`,
        })
      );
      onCreated(item);
      setName('');
      setDemirName('');
      setVidaName('');
      setProfilDefinitionId(initialProfilDefinitionId ? String(initialProfilDefinitionId) : null);
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast.error(error.message || `${label} oluşturulamadı`);
    },
  });

  const title = useMemo(() => {
    switch (kind) {
      case 'profil': return t('dialog.addNewProfile', { ns: windoNs, defaultValue: 'Yeni profil ekle' });
      case 'demir': return t('dialog.addNewRebar', { ns: windoNs, defaultValue: 'Yeni demir ekle' });
      case 'vida': return t('dialog.addNewScrew', { ns: windoNs, defaultValue: 'Yeni vida ekle' });
      case 'baski': return t('dialog.addNewPrint', { ns: windoNs, defaultValue: 'Yeni baskı ekle' });
      case 'koliBaski': return t('dialog.addNewKoliBaski', { ns: windoNs, defaultValue: 'Yeni koli baskı ekle' });
      default: return '';
    }
  }, [kind, t]);

  const handleSubmit = async (): Promise<void> => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      toast.error(i18n.language.startsWith('tr') ? 'Ad alanı zorunludur' : 'Name is required');
      return;
    }

    const trimmedDemirName = demirName.trim();
    const trimmedVidaName = vidaName.trim();

    if (requiresProfil && !profilDefinitionId) {
      toast.error(i18n.language.startsWith('tr') ? 'Profil seçimi zorunludur' : 'Profile is required');
      return;
    }

    if (createsBundle) {
      if (!trimmedDemirName || !trimmedVidaName) {
        toast.error(
          i18n.language.startsWith('tr')
            ? 'Profil ile birlikte demir ve vida adı da zorunludur'
            : 'Rebar and screw names are also required with profile'
        );
        return;
      }

      const profile = await windoDefinitionApi.createProfil({
        name: trimmedName,
        profilDefinitionId: null,
      });

      await windoDefinitionApi.createDemir({
        name: trimmedDemirName,
        profilDefinitionId: profile.id,
      });

      await windoDefinitionApi.createVida({
        name: trimmedVidaName,
        profilDefinitionId: profile.id,
      });

      await queryClient.invalidateQueries({ queryKey: ['windo-definition'] });
      await queryClient.invalidateQueries({ queryKey: ['windo-definition-management'] });
      toast.success(
        i18n.language.startsWith('tr')
          ? 'Profil, demir ve vida kaydı oluşturuldu'
          : 'Profile, rebar and screw records created'
      );
      onCreated(profile);
      setName('');
      setDemirName('');
      setVidaName('');
      setProfilDefinitionId(null);
      onOpenChange(false);
      return;
    }

    const payload: WindoDefinitionCreateDto = {
      name: trimmedName,
      profilDefinitionId: requiresProfil && profilDefinitionId ? Number(profilDefinitionId) : null,
    };

    await mutation.mutateAsync(payload);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) {
          setName('');
          setDemirName('');
          setVidaName('');
          setProfilDefinitionId(initialProfilDefinitionId ? String(initialProfilDefinitionId) : null);
        }
        onOpenChange(nextOpen);
      }}
    >
      <DialogContent className="sm:max-w-md !overflow-visible">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {requiresProfil ? (
            <div className="space-y-2">
              <Label>{t('dialog.profilLabel', { ns: windoNs, defaultValue: 'Bağlı profil' })}</Label>
              <VoiceSearchCombobox
                options={profilOptions}
                value={profilDefinitionId}
                onSelect={setProfilDefinitionId}
                placeholder={t('dialog.profilPlaceholder', { ns: windoNs, defaultValue: 'Profil seçin' })}
                searchPlaceholder={t('dialog.profilSearchPlaceholder', { ns: windoNs, defaultValue: 'Profil ara' })}
              />
            </div>
          ) : null}
          <div className="space-y-2">
            <Label>{t('dialog.nameLabel', { ns: windoNs, defaultValue: 'Ad' })}</Label>
            <Input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder={
                i18n.language.startsWith('tr')
                  ? `${label} adı`
                  : t('dialog.nameLabel', { ns: windoNs, defaultValue: `${label} name` })
              }
              maxLength={150}
            />
          </div>
          {createsBundle ? (
            <>
              <div className="space-y-2">
                <Label>{t('dialog.demirNameLabel', { ns: windoNs, defaultValue: 'Demir adı' })}</Label>
                <Input
                  value={demirName}
                  onChange={(event) => setDemirName(event.target.value)}
                  placeholder={t('dialog.demirNamePlaceholder', { ns: windoNs, defaultValue: 'Bağlı demir adı' })}
                  maxLength={150}
                />
              </div>
              <div className="space-y-2">
                <Label>{t('dialog.vidaNameLabel', { ns: windoNs, defaultValue: 'Vida adı' })}</Label>
                <Input
                  value={vidaName}
                  onChange={(event) => setVidaName(event.target.value)}
                  placeholder={t('dialog.vidaNamePlaceholder', { ns: windoNs, defaultValue: 'Bağlı vida adı' })}
                  maxLength={150}
                />
              </div>
            </>
          ) : null}
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t('dialog.cancel', { ns: windoNs, defaultValue: 'İptal' })}
            </Button>
            <Button
              type="button"
              className="bg-[image:var(--crm-brand-gradient)] hover:opacity-90 border-0 text-white font-semibold px-5 active:scale-[0.98] transition-all"
              onClick={() => void handleSubmit()}
              disabled={mutation.isPending}
            >
              {t('dialog.save', { ns: windoNs, defaultValue: 'Kaydet' })}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}


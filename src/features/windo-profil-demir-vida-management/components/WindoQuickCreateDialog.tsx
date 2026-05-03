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

type WindoQuickCreateKind = 'profil' | 'demir' | 'vida';

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
};

export function WindoQuickCreateDialog({
  kind,
  open,
  onOpenChange,
  initialProfilDefinitionId,
  profilOptions,
  onCreated,
}: WindoQuickCreateDialogProps): ReactElement {
  const { i18n, t } = useTranslation(['common']);
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [profilDefinitionId, setProfilDefinitionId] = useState<string | null>(
    initialProfilDefinitionId ? String(initialProfilDefinitionId) : null
  );

  const labels = KIND_LABELS[kind];
  const label = i18n.language.startsWith('tr') ? labels.tr : labels.en;
  const requiresProfil = kind !== 'profil';

  const mutation = useMutation({
    mutationFn: async (payload: WindoDefinitionCreateDto): Promise<WindoDefinitionGetDto> => {
      if (kind === 'profil') return windoDefinitionApi.createProfil(payload);
      if (kind === 'demir') return windoDefinitionApi.createDemir(payload);
      return windoDefinitionApi.createVida(payload);
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
      setProfilDefinitionId(initialProfilDefinitionId ? String(initialProfilDefinitionId) : null);
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast.error(error.message || `${label} oluşturulamadı`);
    },
  });

  const title = useMemo(
    () =>
      i18n.language.startsWith('tr')
        ? `Yeni ${label} ekle`
        : `Add new ${label.toLowerCase()}`,
    [i18n.language, label]
  );

  const handleSubmit = async (): Promise<void> => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      toast.error(i18n.language.startsWith('tr') ? 'Ad alanı zorunludur' : 'Name is required');
      return;
    }

    if (requiresProfil && !profilDefinitionId) {
      toast.error(i18n.language.startsWith('tr') ? 'Profil seçimi zorunludur' : 'Profile is required');
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
          setProfilDefinitionId(initialProfilDefinitionId ? String(initialProfilDefinitionId) : null);
        }
        onOpenChange(nextOpen);
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {requiresProfil ? (
            <div className="space-y-2">
              <Label>{i18n.language.startsWith('tr') ? 'Profil' : 'Profile'}</Label>
              <VoiceSearchCombobox
                options={profilOptions}
                value={profilDefinitionId}
                onSelect={setProfilDefinitionId}
                placeholder={i18n.language.startsWith('tr') ? 'Profil seçin' : 'Select profile'}
                searchPlaceholder={i18n.language.startsWith('tr') ? 'Profil ara' : 'Search profile'}
              />
            </div>
          ) : null}
          <div className="space-y-2">
            <Label>{i18n.language.startsWith('tr') ? 'Ad' : 'Name'}</Label>
            <Input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder={i18n.language.startsWith('tr') ? `${label} adı` : `${label} name`}
              maxLength={150}
            />
          </div>
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {i18n.language.startsWith('tr') ? 'İptal' : 'Cancel'}
            </Button>
            <Button
              type="button"
              className="bg-linear-to-r from-pink-600 to-orange-600 text-white"
              onClick={() => void handleSubmit()}
              disabled={mutation.isPending}
            >
              {i18n.language.startsWith('tr') ? 'Kaydet' : 'Save'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

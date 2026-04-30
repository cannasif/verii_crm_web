import { type ReactElement, useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useUIStore } from '@/stores/ui-store';
import { windoDefinitionApi } from '../api/windo-definition-api';
import type { WindoDefinitionCreateDto, WindoDefinitionGetDto } from '../types/windo-definition-types';

type DefinitionKind = 'profil' | 'demir' | 'vida';

interface DefinitionSectionConfig {
  kind: DefinitionKind;
  title: string;
  description: string;
  queryKey: string;
  getList: () => Promise<WindoDefinitionGetDto[]>;
  create: (data: WindoDefinitionCreateDto) => Promise<WindoDefinitionGetDto>;
  update: (id: number, data: WindoDefinitionCreateDto) => Promise<WindoDefinitionGetDto>;
  remove: (id: number) => Promise<void>;
}

function DefinitionSection({
  config,
}: {
  config: DefinitionSectionConfig;
}): ReactElement {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [draftName, setDraftName] = useState('');
  const [editingItem, setEditingItem] = useState<WindoDefinitionGetDto | null>(null);

  const { data = [], isLoading } = useQuery({
    queryKey: ['windo-definition-management', config.queryKey],
    queryFn: config.getList,
  });

  const filtered = useMemo(
    () => data.filter((item) => item.name.toLowerCase().includes(search.trim().toLowerCase())),
    [data, search]
  );

  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: ['windo-definition-management', config.queryKey] });
    await queryClient.invalidateQueries({ queryKey: ['windo-definition', config.kind] });
  };

  const createMutation = useMutation({
    mutationFn: config.create,
    onSuccess: async () => {
      toast.success(`${config.title} kaydı oluşturuldu`);
      await invalidate();
      setDialogOpen(false);
      setDraftName('');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: WindoDefinitionCreateDto }) => config.update(id, data),
    onSuccess: async () => {
      toast.success(`${config.title} kaydı güncellendi`);
      await invalidate();
      setDialogOpen(false);
      setEditingItem(null);
      setDraftName('');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: config.remove,
    onSuccess: async () => {
      toast.success(`${config.title} kaydı silindi`);
      await invalidate();
    },
  });

  const handleSubmit = async () => {
    const name = draftName.trim();
    if (!name) {
      toast.error('Ad alanı zorunludur');
      return;
    }

    if (editingItem) {
      await updateMutation.mutateAsync({ id: editingItem.id, data: { name } });
      return;
    }

    await createMutation.mutateAsync({ name });
  };

  return (
    <>
      <Card className="rounded-[2rem] border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-[#180F22]">
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <CardTitle className="text-xl font-bold">{config.title}</CardTitle>
            <p className="text-sm text-muted-foreground">{config.description}</p>
          </div>
          <div className="flex w-full gap-3 sm:w-auto">
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Ara..."
              className="h-11 min-w-[220px] rounded-2xl"
            />
            <Button
              type="button"
              className="h-11 rounded-2xl bg-linear-to-r from-pink-600 to-orange-600 text-white"
              onClick={() => {
                setEditingItem(null);
                setDraftName('');
                setDialogOpen(true);
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              Yeni
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Yükleniyor...</p>
          ) : filtered.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-slate-200 px-4 py-6 text-sm text-muted-foreground dark:border-white/10">
              Kayıt bulunamadı.
            </p>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-white/10">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 dark:bg-white/5">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold">Ad</th>
                    <th className="px-4 py-3 text-right font-semibold">İşlem</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((item) => (
                    <tr key={item.id} className="border-t border-slate-200 dark:border-white/10">
                      <td className="px-4 py-3">{item.name}</td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="rounded-xl"
                            onClick={() => {
                              setEditingItem(item);
                              setDraftName(item.name);
                              setDialogOpen(true);
                            }}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="rounded-xl text-red-600"
                            onClick={() => {
                              void deleteMutation.mutateAsync(item.id);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingItem ? `${config.title} güncelle` : `${config.title} ekle`}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Ad</Label>
              <Input value={draftName} onChange={(e) => setDraftName(e.target.value)} maxLength={150} />
            </div>
            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                İptal
              </Button>
              <Button
                type="button"
                className="bg-linear-to-r from-pink-600 to-orange-600 text-white"
                onClick={() => void handleSubmit()}
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                Kaydet
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function WindoProfilDemirVidaTanimlamaPage(): ReactElement {
  const { setPageTitle } = useUIStore();

  useEffect(() => {
    setPageTitle('Windo Profil / Demir / Vida');
    return () => setPageTitle(null);
  }, [setPageTitle]);

  const sections: DefinitionSectionConfig[] = [
    {
      kind: 'profil',
      title: 'Profil Tanımla',
      description: 'Satır bazında seçilecek profil tanımlarını yönetin.',
      queryKey: 'profil',
      getList: windoDefinitionApi.getProfilList,
      create: windoDefinitionApi.createProfil,
      update: windoDefinitionApi.updateProfil,
      remove: windoDefinitionApi.deleteProfil,
    },
    {
      kind: 'demir',
      title: 'Demir Tanımla',
      description: 'Satır bazında seçilecek demir tanımlarını yönetin.',
      queryKey: 'demir',
      getList: windoDefinitionApi.getDemirList,
      create: windoDefinitionApi.createDemir,
      update: windoDefinitionApi.updateDemir,
      remove: windoDefinitionApi.deleteDemir,
    },
    {
      kind: 'vida',
      title: 'Vida Tanımla',
      description: 'Satır bazında seçilecek vida tanımlarını yönetin.',
      queryKey: 'vida',
      getList: windoDefinitionApi.getVidaList,
      create: windoDefinitionApi.createVida,
      update: windoDefinitionApi.updateVida,
      remove: windoDefinitionApi.deleteVida,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="rounded-[2rem] border border-slate-200 bg-white px-6 py-8 shadow-sm dark:border-white/10 dark:bg-[#180F22]">
        <h1 className="text-3xl font-bold tracking-tight">Windo Profil / Demir / Vida Tanımlama</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Profil, demir ve vida kayıtlarını tek modülde ayrı tablolarla yönetin.
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        {sections.map((section) => (
          <DefinitionSection key={section.kind} config={section} />
        ))}
      </div>
    </div>
  );
}

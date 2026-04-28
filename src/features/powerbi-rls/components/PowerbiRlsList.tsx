import { type ReactElement, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Edit2, Trash2, Loader2, FileSearch, X } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import {
  usePowerbiRlsList,
  useDeletePowerbiRls,
  useCreatePowerbiRls,
  useUpdatePowerbiRls,
} from '../hooks/usePowerbiRls';
import type { PowerBIReportRoleMapping } from '../types/powerbiRls.types';
import { PowerbiRlsForm } from './PowerbiRlsForm';
import type { PowerbiRlsFormSchema } from '../types/powerbiRls.types';
import { useCrudPermissions } from '@/features/access-control/hooks/useCrudPermissions';

const LIST_PARAMS = { pageNumber: 1, pageSize: 100, sortBy: 'Id', sortDirection: 'desc' as const };

interface PowerbiRlsListProps {
  formOpen: boolean;
  setFormOpen: (open: boolean) => void;
  editing: PowerBIReportRoleMapping | null;
  setEditing: (item: PowerBIReportRoleMapping | null) => void;
}

export function PowerbiRlsList({
  formOpen,
  setFormOpen,
  editing,
  setEditing,
}: PowerbiRlsListProps): ReactElement {
  const { t } = useTranslation();
  const { canUpdate, canDelete } = useCrudPermissions('powerbi.rls.view');
  const { data, isLoading } = usePowerbiRlsList(LIST_PARAMS);
  const deleteMutation = useDeletePowerbiRls();
  const createMutation = useCreatePowerbiRls();
  const updateMutation = useUpdatePowerbiRls();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<PowerBIReportRoleMapping | null>(null);

  const items = data?.data ?? [];

  const handleEdit = (item: PowerBIReportRoleMapping): void => {
    if (!canUpdate) return;
    setEditing(item);
    setFormOpen(true);
  };

  const handleFormClose = (open: boolean): void => {
    setFormOpen(open);
    if (!open) setEditing(null);
  };

  const handleDeleteClick = (item: PowerBIReportRoleMapping): void => {
    if (!canDelete) return;
    setSelectedItem(item);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async (): Promise<void> => {
    if (selectedItem) {
      await deleteMutation.mutateAsync(selectedItem.id);
      setDeleteDialogOpen(false);
      setSelectedItem(null);
    }
  };

  const handleFormSubmit = async (values: PowerbiRlsFormSchema): Promise<void> => {
    if (editing) {
      await updateMutation.mutateAsync({ id: editing.id, data: values });
    } else {
      await createMutation.mutateAsync(values);
    }
    setFormOpen(false);
    setEditing(null);
  };

  return (
    <>
      <div className="rounded-2xl border border-slate-200 bg-white/80 p-2 dark:border-white/10 dark:bg-white/[0.03] shadow-sm">
        <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-white/5">
          <Table>
            <TableHeader>
              <TableRow className="font-bold text-slate-700 dark:text-white dark:bg-[#231A2C] border-b border-slate-200 dark:border-white/5">
                <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white py-4 border-r border-slate-200 dark:border-white/5">{t('powerbiRls.report')}</TableHead>
                <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white border-r border-slate-200 dark:border-white/5">{t('powerbiRls.role')}</TableHead>
                <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white border-r border-slate-200 dark:border-white/5">{t('powerbiRls.rlsRoles')}</TableHead>
                <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white border-r border-slate-200 dark:border-white/5">{t('powerbiRls.createdBy')}</TableHead>
                <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white border-r border-slate-200 dark:border-white/5">{t('powerbiRls.updatedBy')}</TableHead>
                <TableHead className="text-right text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">{t('powerbiRls.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-20 bg-white/50 dark:bg-transparent">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto text-pink-500" />
                  </TableCell>
                </TableRow>
              ) : items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-20 bg-white/50 dark:bg-transparent">
                    <div className="flex flex-col items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10">
                        <FileSearch className="h-6 w-6 text-slate-400" />
                      </div>
                      <p className="text-sm font-medium text-slate-400">{t('common.noData')}</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                items.map((row) => (
                  <TableRow key={row.id} className="border-b border-slate-200 dark:border-white/5 hover:bg-pink-50/30 dark:hover:bg-pink-500/5 transition-colors">
                    <TableCell className="font-bold text-slate-700 dark:text-white py-4 border-r border-slate-200 dark:border-white/5">{row.reportName ?? '-'}</TableCell>
                    <TableCell className="border-r border-slate-200 dark:border-white/5">{row.roleName ?? '-'}</TableCell>
                    <TableCell className="max-w-[200px] truncate border-r border-slate-200 dark:border-white/5" title={row.rlsRoles}>{row.rlsRoles}</TableCell>
                    <TableCell className="text-slate-500 dark:text-slate-400 text-sm border-r border-slate-200 dark:border-white/5">{row.createdBy ?? '-'}</TableCell>
                    <TableCell className="text-slate-500 dark:text-slate-400 text-sm border-r border-slate-200 dark:border-white/5">{row.updatedBy ?? '-'}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        {canUpdate && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(row)}
                            className="h-8 w-8 rounded-lg hover:bg-pink-50 dark:hover:bg-pink-500/10 text-slate-400 hover:text-pink-600"
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                        )}
                        {canDelete && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteClick(row)}
                            className="h-8 w-8 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 text-slate-400 hover:text-red-600"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <PowerbiRlsForm
        open={(canUpdate) ? formOpen : false}
        onOpenChange={handleFormClose}
        initial={editing}
        onSubmit={handleFormSubmit}
        isSubmitting={createMutation.isPending || updateMutation.isPending}
      />

      <Dialog open={canDelete && deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent showCloseButton={false} className="w-[calc(100vw-1rem)] sm:w-[calc(100vw-2rem)] max-w-[480px] p-0 border-0 shadow-2xl bg-white dark:bg-[#180F22] rounded-3xl ring-1 ring-slate-200 dark:ring-white/10 overflow-hidden">
          <DialogPrimitive.Close className="absolute right-6 top-6 z-50 rounded-2xl bg-slate-100 p-2.5 text-slate-400 transition-all duration-200 hover:bg-red-600 hover:text-white active:scale-90 dark:bg-white/5 dark:text-white/40 dark:hover:bg-red-600 dark:hover:text-white">
            <X size={20} strokeWidth={2.5} />
          </DialogPrimitive.Close>
          <DialogHeader className="p-6 pb-4 border-b border-slate-100 dark:border-white/5 text-left">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-red-100 dark:bg-red-500/10 shadow-inner border border-red-200 dark:border-red-500/20">
                <Trash2 className="h-6 w-6 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                  {t('powerbiRls.delete')}
                </DialogTitle>
                <DialogDescription className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1">
                  {t('powerbiRls.confirmDelete')}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <DialogFooter className="border-t border-slate-100 dark:border-white/5 px-6 py-4 flex-col sm:flex-row gap-3">
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              className="rounded-xl border-slate-200 dark:border-white/10 bg-white dark:bg-white/5 hover:bg-slate-50 dark:hover:bg-white/10 font-bold px-6 h-11"
            >
              {t('powerbiRls.cancel')}
            </Button>
            <Button
              onClick={handleDeleteConfirm}
              disabled={deleteMutation.isPending}
              className="rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold hover:scale-[1.02] active:scale-[0.98] transition-all shadow-[0_5px_15px_-5px_rgba(220,38,38,0.5)] disabled:opacity-50 px-8 h-11 gap-2"
            >
              {deleteMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {t('powerbiRls.delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

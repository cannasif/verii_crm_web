import { type ReactElement, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Edit2, Trash2, Loader2 } from 'lucide-react';
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
  const { canCreate, canUpdate, canDelete } = useCrudPermissions('powerbi.rls.view');
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
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('powerbiRls.report')}</TableHead>
              <TableHead>{t('powerbiRls.role')}</TableHead>
              <TableHead>{t('powerbiRls.rlsRoles')}</TableHead>
              <TableHead>{t('powerbiRls.createdBy')}</TableHead>
              <TableHead>{t('powerbiRls.updatedBy')}</TableHead>
              <TableHead className="text-right">{t('powerbiRls.actions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                </TableCell>
              </TableRow>
            ) : items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  {t('common.noData')}
                </TableCell>
              </TableRow>
            ) : (
              items.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-medium">{row.reportName ?? '-'}</TableCell>
                  <TableCell>{row.roleName ?? '-'}</TableCell>
                  <TableCell className="max-w-[200px] truncate" title={row.rlsRoles}>{row.rlsRoles}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{row.createdBy ?? '-'}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{row.updatedBy ?? '-'}</TableCell>
                  <TableCell className="text-right">
                    {canUpdate ? (
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(row)}>
                        <Edit2 className="h-4 w-4" />
                      </Button>
                    ) : null}
                    {canDelete ? (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteClick(row)}
                        className="text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    ) : null}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <PowerbiRlsForm
        open={(canCreate || canUpdate) ? formOpen : false}
        onOpenChange={handleFormClose}
        initial={editing}
        onSubmit={handleFormSubmit}
        isSubmitting={createMutation.isPending || updateMutation.isPending}
      />

      <Dialog open={canDelete && deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('powerbiRls.delete')}</DialogTitle>
            <DialogDescription>
              {t('powerbiRls.confirmDelete')}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              {t('powerbiRls.cancel')}
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t('powerbiRls.delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

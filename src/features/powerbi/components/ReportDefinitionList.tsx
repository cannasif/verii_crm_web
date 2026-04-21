import { type ReactElement, useState, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search, RefreshCw, X } from 'lucide-react';
import { useUIStore } from '@/stores/ui-store';
import {
  usePowerbiReportDefinitionList,
  useCreatePowerbiReportDefinition,
  useUpdatePowerbiReportDefinition,
  useDeletePowerbiReportDefinition,
} from '../hooks/usePowerbiReportDefinition';
import { powerbiQueryKeys } from '../utils/query-keys';
import { useQueryClient } from '@tanstack/react-query';
import type { PowerBIReportDefinitionGetDto } from '../types/powerbiReportDefinition.types';
import type { PowerBIReportDefinitionFormSchema } from '../types/powerbiReportDefinition.types';
import { ReportDefinitionForm } from './ReportDefinitionForm';
import { PowerbiReportSyncCard } from '@/features/powerbi-sync';
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
import { Edit2, Trash2, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useCrudPermissions } from '@/features/access-control/hooks/useCrudPermissions';

const LIST_PARAMS = {
  pageNumber: 1,
  pageSize: 100,
  sortBy: 'Id',
  sortDirection: 'desc' as const,
};

export function ReportDefinitionList(): ReactElement {
  const { t } = useTranslation();
  const { canCreate, canUpdate, canDelete } = useCrudPermissions('powerbi.report-definitions.view');
  const { setPageTitle } = useUIStore();
  const queryClient = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<PowerBIReportDefinitionGetDto | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPlaceholder, setFilterPlaceholder] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<PowerBIReportDefinitionGetDto | null>(null);

  const { data, isLoading } = usePowerbiReportDefinitionList(LIST_PARAMS);
  const createMutation = useCreatePowerbiReportDefinition();
  const updateMutation = useUpdatePowerbiReportDefinition();
  const deleteMutation = useDeletePowerbiReportDefinition();

  const items = useMemo(() => data?.data ?? [], [data]);
  const filteredItems = useMemo(() => {
    if (!searchTerm) return items;
    const lower = searchTerm.toLowerCase();
    return items.filter(
      (x) =>
        x.name?.toLowerCase().includes(lower) ||
        x.workspaceId?.toLowerCase().includes(lower) ||
        x.reportId?.toLowerCase().includes(lower)
    );
  }, [items, searchTerm]);

  useEffect(() => {
    setPageTitle(t('powerbi.reportDefinition.title'));
    return () => setPageTitle(null);
  }, [t, setPageTitle]);

  const handleRefresh = async (): Promise<void> => {
    await queryClient.invalidateQueries({
      queryKey: powerbiQueryKeys.reportDefinitions.list(LIST_PARAMS),
    });
  };

  const handleAdd = (): void => {
    setEditing(null);
    setFormOpen(true);
  };

  const handleEdit = (item: PowerBIReportDefinitionGetDto): void => {
    setEditing(item);
    setFormOpen(true);
  };

  const handleDeleteClick = (item: PowerBIReportDefinitionGetDto): void => {
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

  const handleFormSubmit = async (values: PowerBIReportDefinitionFormSchema): Promise<void> => {
    const payload = {
      name: values.name,
      description: values.description || undefined,
      workspaceId: values.workspaceId,
      reportId: values.reportId,
      datasetId: values.datasetId || undefined,
      embedUrl: values.embedUrl || undefined,
      isActive: values.isActive,
      rlsRoles: values.rlsRoles || undefined,
      allowedUserIds: values.allowedUserIds || undefined,
      allowedRoleIds: values.allowedRoleIds || undefined,
    };
    if (editing) {
      await updateMutation.mutateAsync({ id: editing.id, data: payload });
    } else {
      await createMutation.mutateAsync(payload);
    }
    setFormOpen(false);
    setEditing(null);
  };

  return (
    <div className="w-full space-y-6">
      <PowerbiReportSyncCard />
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-2">
        <h1 className="text-3xl font-bold tracking-tight">
          {t('powerbi.reportDefinition.title')}
        </h1>
        {canCreate ? (
          <Button onClick={handleAdd}>
            <Plus className="mr-2 h-4 w-4" />
            {t('powerbi.reportDefinition.add')}
          </Button>
        ) : null}
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t('common.search')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
          {searchTerm && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-0 top-1/2 -translate-y-1/2"
              onClick={() => setSearchTerm('')}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
        <Input
          placeholder={t('powerbi.filterPlaceholder')}
          value={filterPlaceholder}
          onChange={(e) => setFilterPlaceholder(e.target.value)}
          className="max-w-xs"
        />
        <Button variant="outline" size="icon" onClick={handleRefresh}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('powerbi.reportDefinition.name')}</TableHead>
              <TableHead>{t('powerbi.reportDefinition.workspaceId')}</TableHead>
              <TableHead>{t('powerbi.reportDefinition.reportId')}</TableHead>
              <TableHead>{t('powerbi.reportDefinition.isActive')}</TableHead>
              <TableHead className="text-right">{t('common.actions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                </TableCell>
              </TableRow>
            ) : filteredItems.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  {t('common.noData')}
                </TableCell>
              </TableRow>
            ) : (
              filteredItems.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-medium">{row.name}</TableCell>
                  <TableCell className="font-mono text-xs">{row.workspaceId}</TableCell>
                  <TableCell className="font-mono text-xs">{row.reportId}</TableCell>
                  <TableCell>
                    <Badge variant={row.isActive ? 'default' : 'secondary'}>
                      {row.isActive ? t('status.active') : t('status.inactive')}
                    </Badge>
                  </TableCell>
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

      <ReportDefinitionForm
        open={canCreate || canUpdate ? formOpen : false}
        onOpenChange={setFormOpen}
        initial={editing}
        onSubmit={handleFormSubmit}
        isSubmitting={createMutation.isPending || updateMutation.isPending}
      />

      <Dialog open={canDelete && deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('common.delete.confirmTitle')}</DialogTitle>
            <DialogDescription>
              {t('common.delete.confirmMessage', {
                name: selectedItem?.name ?? '',
              })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t('common.delete.action')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

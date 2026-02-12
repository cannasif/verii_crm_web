import { type ReactElement, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { useFormContext, useFieldArray } from 'react-hook-form';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { VoiceSearchCombobox } from '@/components/shared/VoiceSearchCombobox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useUsersForPricingRule } from '../hooks/useUsersForPricingRule';
import { useCreatePricingRuleSalesman } from '../hooks/useCreatePricingRuleSalesman';
import { useDeletePricingRuleSalesman } from '../hooks/useDeletePricingRuleSalesman';
import { usePricingRuleSalesmenByHeaderId } from '../hooks/usePricingRuleSalesmenByHeaderId';
import type { PricingRuleSalesmanFormState, PricingRuleHeaderGetDto, PricingRuleFormSchema } from '../types/pricing-rule-types';
// İkonlar
import { 
  Trash2, 
  Loader2, 
  UserPlus, 
  User, 
} from 'lucide-react';
import { Alert02Icon } from 'hugeicons-react';

interface PricingRuleSalesmanTableProps {
  header?: PricingRuleHeaderGetDto | null;
}

export function PricingRuleSalesmanTable({
  header,
}: PricingRuleSalesmanTableProps): ReactElement {
  const { t } = useTranslation();
  const { control } = useFormContext<PricingRuleFormSchema>();
  const { fields, append, remove } = useFieldArray({
    control,
    name: "salesmen",
    keyName: "_fieldId"
  });

  const salesmen = fields as unknown as PricingRuleSalesmanFormState[];

  const { data: users, isLoading } = useUsersForPricingRule();
  const createMutation = useCreatePricingRuleSalesman();
  const deleteMutation = useDeletePricingRuleSalesman();
  const { data: existingSalesmen } = usePricingRuleSalesmenByHeaderId(header?.id || 0);

  const [addConfirmOpen, setAddConfirmOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [selectedSalesmanId, setSelectedSalesmanId] = useState<number | null>(null);
  const [selectedSalesmanToDelete, setSelectedSalesmanToDelete] = useState<{ id: string; dbId?: number } | null>(null);

  const isExistingRecord = !!header?.id;

  // --- Handlers ---
  const handleAddSalesman = (salesmanId: number): void => {
    if (salesmen.some((s) => s.salesmanId === salesmanId)) return;

    if (isExistingRecord) {
      setSelectedSalesmanId(salesmanId);
      setAddConfirmOpen(true);
    } else {
      const newSalesman: PricingRuleSalesmanFormState = {
        id: `temp-${Date.now()}`,
        salesmanId,
      };
      append(newSalesman);
    }
  };

  const handleAddConfirm = async (): Promise<void> => {
    if (!selectedSalesmanId || !header?.id) return;

    try {
      const response = await createMutation.mutateAsync({
        pricingRuleHeaderId: header.id,
        salesmanId: selectedSalesmanId,
      });

      if (response) {
        const newSalesman: PricingRuleSalesmanFormState = {
          id: `existing-${response.id}`,
          salesmanId: response.salesmanId,
        };
        append(newSalesman);
        setAddConfirmOpen(false);
        setSelectedSalesmanId(null);
        toast.success(t('pricingRule.salesmen.addSuccess'), { description: t('pricingRule.salesmen.addSuccessMessage') });
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : t('pricingRule.salesmen.addError');
      toast.error(t('pricingRule.salesmen.addError'), { description: errorMessage });
    }
  };

  const handleDeleteSalesman = (id: string): void => {
    const salesman = salesmen.find((s) => s.id === id);
    if (!salesman) return;

    if (isExistingRecord) {
      const existingSalesman = existingSalesmen?.find((s) => s.salesmanId === salesman.salesmanId);
      if (existingSalesman) {
        setSelectedSalesmanToDelete({ id, dbId: existingSalesman.id });
        setDeleteConfirmOpen(true);
      } else {
        const index = salesmen.findIndex((s) => s.id === id);
        if (index !== -1) remove(index);
      }
    } else {
      const index = salesmen.findIndex((s) => s.id === id);
      if (index !== -1) remove(index);
    }
  };

  const handleDeleteConfirm = async (): Promise<void> => {
    if (!selectedSalesmanToDelete?.dbId) {
      if (selectedSalesmanToDelete) {
          const index = salesmen.findIndex((salesman) => salesman.id === selectedSalesmanToDelete.id);
          if (index !== -1) remove(index);
      }
      setDeleteConfirmOpen(false);
      setSelectedSalesmanToDelete(null);
      return;
    }

    try {
      await deleteMutation.mutateAsync(selectedSalesmanToDelete.dbId);
      const index = salesmen.findIndex((salesman) => salesman.id === selectedSalesmanToDelete.id);
      if (index !== -1) remove(index);
      setDeleteConfirmOpen(false);
      setSelectedSalesmanToDelete(null);
      toast.success(t('pricingRule.salesmen.deleteSuccess'), { description: t('pricingRule.salesmen.deleteSuccessMessage') });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : t('pricingRule.salesmen.deleteError');
      toast.error(t('pricingRule.salesmen.deleteError'), { description: errorMessage });
    }
  };

  const availableUsers = users?.filter((user) => !salesmen.some((s) => s.salesmanId === user.id)) || [];
  const isLoadingUsers = isLoading;
  const isLoadingAction = createMutation.isPending || deleteMutation.isPending;
  const selectedUser = selectedSalesmanId ? users?.find((u) => u.id === selectedSalesmanId) : null;
  const userToDelete = selectedSalesmanToDelete ? users?.find((u) => u.id === salesmen.find((s) => s.id === selectedSalesmanToDelete.id)?.salesmanId) : null;

  // Loading State
  if (isLoadingUsers) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-2 text-slate-400">
        <Loader2 className="h-8 w-8 animate-spin" />
        <p className="text-sm font-medium">{t('pricingRule.loading')}</p>
      </div>
    );
  }

  // --- Ortak Stiller ---
  const headStyle = "cursor-pointer select-none text-slate-500 dark:text-slate-400 font-semibold py-3 text-xs uppercase tracking-wider";

  return (
    <div className="space-y-4 h-full flex flex-col">
      <div className="flex justify-between items-center px-1">
        <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
          <div className="bg-purple-50 dark:bg-purple-500/20 p-1.5 rounded-lg text-purple-600 dark:text-purple-400">
            <User size={18} />
          </div>
          {t('pricingRule.salesmen.title')}
        </h3>
        
        {availableUsers.length > 0 && (
          <div className="flex items-center gap-2">
            <VoiceSearchCombobox
                options={availableUsers.map((user) => ({
                    value: user.id.toString(),
                    label: user.fullName || ''
                }))}
                value={null}
                onSelect={(value) => {
                    if (value) handleAddSalesman(parseInt(value));
                }}
                placeholder={t('pricingRule.salesmen.add')}
                searchPlaceholder={t('pricingRule.salesmen.search')}
                className="w-[240px] h-9 bg-white dark:bg-white/5 border-slate-200 dark:border-white/10 text-xs"
                disabled={isLoadingAction}
                modal={true}
            />
          </div>
        )}
      </div>

      <div className="rounded-xl border border-slate-200 dark:border-white/10 overflow-hidden bg-white/50 dark:bg-transparent flex-1 relative min-h-[300px]">
        <div className="absolute inset-0 overflow-auto">
            {salesmen.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-3">
                    <div className="bg-slate-100 dark:bg-white/5 p-4 rounded-full">
                        <User size={32} className="opacity-50" />
                    </div>
                    <div className="text-center">
                        <p className="text-sm font-medium text-slate-600 dark:text-slate-300">{t('pricingRule.salesmen.empty')}</p>
                        <p className="text-xs mt-1 text-slate-400">{t('pricingRule.salesmen.emptyDescription')}</p>
                    </div>
                </div>
            ) : (
                <Table>
                <TableHeader className="bg-slate-50/80 dark:bg-white/5 sticky top-0 z-10 backdrop-blur-sm">
                    <TableRow className="border-b border-slate-200 dark:border-white/10 hover:bg-transparent">
                    <TableHead className={headStyle}>{t('pricingRule.salesmen.salesman')}</TableHead>
                    <TableHead className={`text-right ${headStyle}`}>{t('pricingRule.table.actions')}</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {salesmen.map((salesman) => {
                    const user = users?.find((u) => u.id === salesman.salesmanId);
                    return (
                        <TableRow 
                            key={salesman.id}
                            className="group border-b border-slate-100 dark:border-white/5 transition-colors hover:bg-slate-50/80 dark:hover:bg-white/5"
                        >
                        <TableCell>
                            <div className="flex items-center gap-2 font-medium text-slate-700 dark:text-slate-200">
                                <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-white/10 flex items-center justify-center text-slate-500 text-xs">
                                    {user?.fullName?.charAt(0) || <User size={14} />}
                                </div>
                                {user?.fullName || `ID: ${salesman.salesmanId}`}
                            </div>
                        </TableCell>
                        <TableCell className="text-right">
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10"
                                onClick={() => handleDeleteSalesman(salesman.id)}
                                disabled={isLoadingAction}
                                >
                                {isLoadingAction && selectedSalesmanToDelete?.id === salesman.id ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <Trash2 size={14} />
                                )}
                                </Button>
                            </div>
                        </TableCell>
                        </TableRow>
                    );
                    })}
                </TableBody>
                </Table>
            )}
        </div>
      </div>

      {/* Ekleme Onay Dialog */}
      <Dialog open={addConfirmOpen} onOpenChange={setAddConfirmOpen} modal={true}>
        <DialogContent className="bg-white dark:bg-[#130822] border border-slate-100 dark:border-white/10 text-slate-900 dark:text-white w-[90%] sm:w-full max-w-md rounded-2xl shadow-2xl overflow-hidden p-0 gap-0">
          <DialogHeader className="flex flex-col items-center gap-4 text-center pb-6 pt-10 px-6">
            <div className="h-20 w-20 rounded-full bg-purple-50 dark:bg-purple-500/10 flex items-center justify-center mb-2 animate-in zoom-in duration-300">
               <UserPlus size={36} className="text-purple-600 dark:text-purple-500" />
            </div>
            
            <div className="space-y-2">
                <DialogTitle className="text-2xl font-bold text-slate-900 dark:text-white">
                {t('pricingRule.salesmen.addConfirmTitle')}
                </DialogTitle>
                <DialogDescription className="text-slate-500 dark:text-slate-400 max-w-[280px] mx-auto text-sm leading-relaxed">
                  {t('pricingRule.salesmen.addConfirmMessage', {
                    name: selectedUser?.fullName || '',
                  })}
                </DialogDescription>
            </div>
          </DialogHeader>

          <DialogFooter className="flex flex-row gap-3 justify-center p-6 bg-slate-50/50 dark:bg-[#1a1025]/50 border-t border-slate-100 dark:border-white/5">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setAddConfirmOpen(false);
                setSelectedSalesmanId(null);
              }}
              disabled={isLoadingAction}
              className="flex-1 h-12 rounded-xl border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-white/5 font-semibold"
            >
              {t('pricingRule.form.cancel')}
            </Button>
            
            <Button
              type="button"
              onClick={handleAddConfirm}
              disabled={isLoadingAction}
              className="flex-1 h-12 rounded-xl bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white border-0 shadow-lg shadow-purple-500/20 transition-all hover:scale-[1.02] font-bold"
            >
              {t('pricingRule.form.confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Silme Onay Dialog */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen} modal={true}>
        <DialogContent className="bg-white dark:bg-[#130822] border border-slate-100 dark:border-white/10 text-slate-900 dark:text-white w-[90%] sm:w-full max-w-md rounded-2xl shadow-2xl overflow-hidden p-0 gap-0">
          
          <DialogHeader className="flex flex-col items-center gap-4 text-center pb-6 pt-10 px-6">
            <div className="h-20 w-20 rounded-full bg-red-50 dark:bg-red-500/10 flex items-center justify-center mb-2 animate-in zoom-in duration-300">
               <Alert02Icon size={36} className="text-red-600 dark:text-red-500" />
            </div>
            
            <div className="space-y-2">
                <DialogTitle className="text-2xl font-bold text-slate-900 dark:text-white">
                {t('pricingRule.salesmen.deleteConfirmTitle')}
                </DialogTitle>
                <DialogDescription className="text-slate-500 dark:text-slate-400 max-w-[280px] mx-auto text-sm leading-relaxed">
                {t('pricingRule.salesmen.deleteConfirmMessage', {
                    name: userToDelete?.fullName || '',
                })}
                </DialogDescription>
            </div>
          </DialogHeader>

          <DialogFooter className="flex flex-row gap-3 justify-center p-6 bg-slate-50/50 dark:bg-[#1a1025]/50 border-t border-slate-100 dark:border-white/5">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setDeleteConfirmOpen(false);
                setSelectedSalesmanToDelete(null);
              }}
              disabled={isLoadingAction}
              className="flex-1 h-12 rounded-xl border-slate-200 dark:border-white/10 text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-white/5 font-semibold"
            >
              {t('pricingRule.form.cancel')}
            </Button>
            
            <Button
              type="button"
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={isLoadingAction}
              className="flex-1 h-12 rounded-xl bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white border-0 shadow-lg shadow-red-500/20 transition-all hover:scale-[1.02] font-bold"
            >
              {isLoadingAction ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('pricingRule.loading')}
                </>
              ) : (
                t('pricingRule.form.confirm')
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
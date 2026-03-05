import { type ReactElement, useState, useRef, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { GripVertical, Plus, Trash2, Edit2, Layers } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { VoiceSearchCombobox } from '@/components/shared/VoiceSearchCombobox';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useApprovalFlowStepList } from '../hooks/useApprovalFlowStepList';
import { useCreateApprovalFlowStep } from '../hooks/useCreateApprovalFlowStep';
import { useUpdateApprovalFlowStep } from '../hooks/useUpdateApprovalFlowStep';
import { useDeleteApprovalFlowStep } from '../hooks/useDeleteApprovalFlowStep';
import { useApprovalRoleGroupOptionsInfinite } from '@/components/shared/dropdown/useDropdownEntityInfinite';
import type { ApprovalFlowStepGetDto } from '../types/approval-flow-step-types';
import { isZodFieldRequired } from '@/lib/zod-required';

interface ApprovalFlowStepListProps {
  approvalFlowId: number;
}

const stepFormSchema = z.object({
  approvalRoleGroupId: z.number().min(1, 'approvalFlowStep.form.approvalRoleGroupId.required'),
});

type StepFormSchema = z.infer<typeof stepFormSchema>;

// --- MODERN TASARIM SABİTLERİ ---
const INPUT_STYLE = `
  h-11 rounded-lg
  bg-slate-50 dark:bg-[#0c0516] 
  border border-slate-200 dark:border-white/10 
  text-slate-900 dark:text-white text-sm
  placeholder:text-slate-400 dark:placeholder:text-slate-600 
  
  focus-visible:ring-0 focus-visible:ring-offset-0 
  
  /* LIGHT MODE FOCUS */
  focus:bg-white 
  focus:border-pink-500 
  focus:shadow-[0_0_0_3px_rgba(236,72,153,0.15)] 

  /* DARK MODE FOCUS */
  dark:focus:bg-[#0c0516] 
  dark:focus:border-pink-500/60 
  dark:focus:shadow-[0_0_0_3px_rgba(236,72,153,0.1)]

  transition-all duration-200
`;

const LABEL_STYLE = "text-[11px] text-slate-500 dark:text-slate-400 uppercase tracking-wider font-bold ml-1 mb-1.5 block";

export function ApprovalFlowStepList({ approvalFlowId }: ApprovalFlowStepListProps): ReactElement {
  const { t } = useTranslation();
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editingStep, setEditingStep] = useState<ApprovalFlowStepGetDto | null>(null);
  const dragItemRef = useRef<number | null>(null);

  const { data: steps = [], isLoading } = useApprovalFlowStepList(approvalFlowId);
  const [roleGroupSearchTerm, setRoleGroupSearchTerm] = useState('');
  const roleGroupDropdown = useApprovalRoleGroupOptionsInfinite(roleGroupSearchTerm, formOpen);
  const createStep = useCreateApprovalFlowStep();
  const updateStep = useUpdateApprovalFlowStep();
  const deleteStep = useDeleteApprovalFlowStep();

  const sortedSteps = [...steps].sort((a, b) => a.stepOrder - b.stepOrder);

  const availableRoleGroupOptions = useMemo(() => {
    const usedRoleGroupIds = new Set(
      sortedSteps
        .filter((step) => step.approvalRoleGroupId !== 0)
        .map((step) => step.approvalRoleGroupId)
    );
    return roleGroupDropdown.options.filter(
      (opt) =>
        !usedRoleGroupIds.has(parseInt(opt.value)) ||
        (editingStep && editingStep.approvalRoleGroupId === parseInt(opt.value))
    );
  }, [sortedSteps, roleGroupDropdown.options, editingStep]);

  const form = useForm<StepFormSchema>({
    resolver: zodResolver(stepFormSchema),
    mode: 'onChange',
    reValidateMode: 'onChange',
    defaultValues: {
      approvalRoleGroupId: 0,
    },
  });
  const isFormValid = form.formState.isValid;

  const handleDragStart = (index: number): void => {
    dragItemRef.current = index;
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number): void => {
    e.preventDefault();
    setDragOverIndex(index);
  };

  const handleDragEnd = (): void => {
    if (draggedIndex === null || dragItemRef.current === null) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      dragItemRef.current = null;
      return;
    }

    const sourceIndex = dragItemRef.current;
    const targetIndex = dragOverIndex;

    if (targetIndex !== null && sourceIndex !== null && sourceIndex !== targetIndex && targetIndex >= 0 && targetIndex < sortedSteps.length) {
      const movedStep = sortedSteps[sourceIndex];
      const newSteps: ApprovalFlowStepGetDto[] = [];

      for (let i = 0; i < sortedSteps.length; i++) {
        if (i === sourceIndex) {
          continue;
        }
        if (i === targetIndex) {
          if (sourceIndex < targetIndex) {
            newSteps.push(sortedSteps[i]);
            newSteps.push(movedStep);
          } else {
            newSteps.push(movedStep);
            newSteps.push(sortedSteps[i]);
          }
        } else {
          newSteps.push(sortedSteps[i]);
        }
      }

      const updates = newSteps.map((step, index) => ({
        id: step.id,
        data: {
          approvalFlowId: step.approvalFlowId,
          stepOrder: index + 1,
          approvalRoleGroupId: step.approvalRoleGroupId,
        },
      }));

      Promise.all(updates.map(({ id, data }) => updateStep.mutateAsync({ id, data }))).catch(() => {});
    }

    setDraggedIndex(null);
    setDragOverIndex(null);
    dragItemRef.current = null;
  };

  const handleAddClick = (): void => {
    setEditingStep(null);
    form.reset({ approvalRoleGroupId: 0 });
    setFormOpen(true);
  };

  const handleEditClick = (step: ApprovalFlowStepGetDto): void => {
    setEditingStep(step);
    form.reset({ approvalRoleGroupId: step.approvalRoleGroupId });
    setFormOpen(true);
  };

  const handleDeleteClick = (step: ApprovalFlowStepGetDto): void => {
    if (confirm(t('approvalFlowStep.messages.deleteConfirm'))) {
      deleteStep.mutate({ id: step.id, approvalFlowId: step.approvalFlowId });
    }
  };

  const handleFormSubmit = async (data: StepFormSchema): Promise<void> => {
    if (editingStep) {
      await updateStep.mutateAsync({
        id: editingStep.id,
        data: {
          approvalFlowId: editingStep.approvalFlowId,
          stepOrder: editingStep.stepOrder,
          approvalRoleGroupId: data.approvalRoleGroupId,
        },
      });
    } else {
      const maxOrder = sortedSteps.length > 0 ? Math.max(...sortedSteps.map((s) => s.stepOrder)) : 0;
      await createStep.mutateAsync({
        approvalFlowId,
        stepOrder: maxOrder + 1,
        approvalRoleGroupId: data.approvalRoleGroupId,
      });
    }
    setFormOpen(false);
    setEditingStep(null);
    form.reset();
  };

  return (
    <div className="space-y-4">
      <div className="bg-slate-50/50 dark:bg-white/5 border border-slate-200 dark:border-white/5 rounded-xl p-6 transition-all duration-300">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-pink-500/10 flex items-center justify-center text-pink-500">
              <Layers size={18} />
            </div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              {t('approvalFlowStep.title')}
            </h3>
          </div>
          <Button 
            onClick={handleAddClick} 
            size="sm"
            className="px-4 py-2 bg-linear-to-r from-pink-600 to-orange-600 rounded-lg text-white text-xs font-bold shadow-lg shadow-pink-500/20 hover:scale-105 transition-transform border-0 hover:text-white"
          >
            <Plus className="h-4 w-4 mr-2" />
            {t('approvalFlowStep.addButton')}
          </Button>
        </div>

        <div>
          {isLoading ? (
            <div className="text-sm text-slate-500 dark:text-slate-400 text-center py-4">
              {t('approvalFlow.loading')}
            </div>
          ) : sortedSteps.length === 0 ? (
            <div className="text-sm text-slate-500 dark:text-slate-400 text-center py-8 border-2 border-dashed border-slate-200 dark:border-white/10 rounded-xl bg-slate-50/50 dark:bg-white/5">
              {t('approvalFlowStep.empty')}
            </div>
          ) : (
            <div className="space-y-3">
              {sortedSteps.map((step, index) => (
                <div
                  key={step.id}
                  draggable
                  onDragStart={() => handleDragStart(index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragEnd={handleDragEnd}
                  className={`
                    flex items-center gap-4 p-4 rounded-xl border cursor-move transition-all duration-200 group
                    ${draggedIndex === index 
                      ? 'opacity-50 border-pink-500/50 bg-pink-50 dark:bg-pink-900/20' 
                      : dragOverIndex === index && draggedIndex !== index 
                        ? 'border-pink-500 bg-pink-50 dark:bg-pink-900/20 scale-[1.02]' 
                        : 'border-slate-200 dark:border-white/5 bg-white dark:bg-[#0c0516] hover:border-pink-500/30 hover:shadow-md hover:shadow-pink-500/5'}
                  `}
                >
                  <GripVertical className="h-5 w-5 text-slate-400 group-hover:text-pink-500 transition-colors flex-shrink-0" />
                  
                  <div className="flex-1 flex items-center gap-4">
                    <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-pink-500/10 text-pink-600 dark:text-pink-400 font-bold text-sm border border-pink-500/20">
                      {step.stepOrder}
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-slate-900 dark:text-white text-sm">
                        {step.approvalRoleGroupName || t('approvalFlowStep.unknownRoleGroup')}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        {t('approvalFlowStep.stepDescription', { order: step.stepOrder })}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEditClick(step)}
                      className="h-8 w-8 text-slate-500 hover:text-pink-600 hover:bg-pink-50 dark:hover:bg-pink-500/10 rounded-lg"
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteClick(step)}
                      className="h-8 w-8 text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="bg-white dark:bg-[#130822] border border-slate-100 dark:border-white/10 text-slate-900 dark:text-white max-w-lg shadow-2xl shadow-slate-200/50 dark:shadow-black/50 sm:rounded-2xl p-0 overflow-hidden">
          <DialogHeader className="border-b border-slate-100 dark:border-white/5 px-6 py-5 bg-white/80 dark:bg-[#130822]/90 backdrop-blur-md shrink-0 flex-row items-center justify-between space-y-0">
            <div className="flex items-center gap-3">
               <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-pink-500/20 to-orange-500/20 border border-pink-500/10 flex items-center justify-center text-pink-500 shrink-0">
                 <Layers size={20} />
               </div>
               <div>
                  <DialogTitle className="text-lg font-bold text-slate-900 dark:text-white">
                    {editingStep
                      ? t('approvalFlowStep.form.editTitle')
                      : t('approvalFlowStep.form.addTitle')}
                  </DialogTitle>
                  <DialogDescription className="text-slate-500 dark:text-slate-400 text-xs mt-0.5">
                    {editingStep
                      ? t('approvalFlowStep.form.editDescription')
                      : t('approvalFlowStep.form.addDescription')}
                  </DialogDescription>
               </div>
            </div>
          </DialogHeader>

          <div className="p-6">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-5">
                <FormField
                  control={form.control}
                  name="approvalRoleGroupId"
                  render={({ field }) => (
                    <FormItem className="space-y-0">
                      <FormLabel className={LABEL_STYLE} required={isZodFieldRequired(stepFormSchema, 'approvalRoleGroupId')}>
                        {t('approvalFlowStep.form.approvalRoleGroup')}
                      </FormLabel>
                      <VoiceSearchCombobox
                        value={field.value && field.value !== 0 ? field.value.toString() : ''}
                        onSelect={(value) => field.onChange(value ? Number(value) : 0)}
                        options={availableRoleGroupOptions}
                        onDebouncedSearchChange={setRoleGroupSearchTerm}
                        onFetchNextPage={roleGroupDropdown.fetchNextPage}
                        hasNextPage={roleGroupDropdown.hasNextPage}
                        isLoading={roleGroupDropdown.isLoading}
                        isFetchingNextPage={roleGroupDropdown.isFetchingNextPage}
                        placeholder={t('approvalFlowStep.form.selectRoleGroup')}
                        searchPlaceholder={t('common.search')}
                        className={INPUT_STYLE}
                      />
                      <FormMessage className="text-red-500 text-[10px] mt-1" />
                    </FormItem>
                  )}
                />

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-white/5">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setFormOpen(false)}
                    disabled={createStep.isPending || updateStep.isPending}
                    className="h-10 px-4 rounded-lg border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/5 text-slate-700 dark:text-slate-300"
                  >
                    {t('approvalFlowStep.form.cancel')}
                  </Button>
                  <Button
                    type="submit"
                    disabled={createStep.isPending || updateStep.isPending || !isFormValid}
                    className="h-10 px-6 rounded-lg bg-linear-to-r from-pink-600 to-orange-600 hover:from-pink-700 hover:to-orange-700 text-white font-medium shadow-lg shadow-pink-500/20 border-0"
                  >
                    {createStep.isPending || updateStep.isPending
                      ? t('approvalFlowStep.form.saving')
                      : t('approvalFlowStep.form.save')}
                  </Button>
                </div>
              </form>
            </Form>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

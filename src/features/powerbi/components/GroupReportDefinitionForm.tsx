import { type ReactElement, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  powerbiGroupReportDefinitionFormSchema,
  type PowerBIGroupReportDefinitionFormSchema,
} from '../types/powerbiGroupReportDefinition.types';
import type { PowerBIGroupReportDefinitionGetDto } from '../types/powerbiGroupReportDefinition.types';
import { usePowerbiGroupList } from '../hooks/usePowerbiGroup';
import { usePowerbiReportDefinitionList } from '../hooks/usePowerbiReportDefinition';
import { Loader2 } from 'lucide-react';

const GROUP_LIST_PARAMS = { pageNumber: 1, pageSize: 500 };
const REPORT_LIST_PARAMS = { pageNumber: 1, pageSize: 500, sortBy: 'Id', sortDirection: 'desc' as const };

interface GroupReportDefinitionFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial: PowerBIGroupReportDefinitionGetDto | null;
  onSubmit: (data: PowerBIGroupReportDefinitionFormSchema) => void | Promise<void>;
  isSubmitting: boolean;
}

export function GroupReportDefinitionForm({
  open,
  onOpenChange,
  initial,
  onSubmit,
  isSubmitting,
}: GroupReportDefinitionFormProps): ReactElement {
  const { t } = useTranslation();
  const { data: groupsData } = usePowerbiGroupList(GROUP_LIST_PARAMS);
  const { data: reportsData } = usePowerbiReportDefinitionList(REPORT_LIST_PARAMS);
  const groups = groupsData?.data ?? [];
  const reports = reportsData?.data ?? [];

  const form = useForm<PowerBIGroupReportDefinitionFormSchema>({
    resolver: zodResolver(powerbiGroupReportDefinitionFormSchema),
    defaultValues: {
      groupId: 0,
      reportDefinitionId: 0,
    },
  });

  useEffect(() => {
    if (initial) {
      form.reset({
        groupId: initial.groupId,
        reportDefinitionId: initial.reportDefinitionId,
      });
    } else {
      form.reset({
        groupId: 0,
        reportDefinitionId: 0,
      });
    }
  }, [initial, form, open]);

  const handleSubmit = async (data: PowerBIGroupReportDefinitionFormSchema): Promise<void> => {
    await onSubmit(data);
    if (!isSubmitting) {
      form.reset();
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-1rem)] sm:w-[calc(100vw-2rem)] max-w-[450px]">
        <DialogHeader>
          <DialogTitle>
            {initial
              ? t('powerbi.groupReportDefinition.edit')
              : t('powerbi.groupReportDefinition.add')}
          </DialogTitle>
          <DialogDescription>
            {initial
              ? t('powerbi.groupReportDefinition.editDescription')
              : t('powerbi.groupReportDefinition.createDescription')}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="groupId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('powerbi.groupReportDefinition.groupId')}</FormLabel>
                  <Select
                    onValueChange={(v) => field.onChange(Number(v))}
                    value={field.value ? String(field.value) : ''}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t('powerbi.groupReportDefinition.selectGroup')} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {groups.map((g) => (
                        <SelectItem key={g.id} value={String(g.id)}>
                          {g.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="reportDefinitionId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('powerbi.groupReportDefinition.reportDefinitionId')}</FormLabel>
                  <Select
                    onValueChange={(v) => field.onChange(Number(v))}
                    value={field.value ? String(field.value) : ''}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t('powerbi.groupReportDefinition.selectReport')} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {reports.map((r) => (
                        <SelectItem key={r.id} value={String(r.id)}>
                          {r.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
                {t('common.cancel')}
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t('common.save')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

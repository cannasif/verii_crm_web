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
import { Input } from '@/components/ui/input';
import { powerbiRlsFormSchema, type PowerbiRlsFormSchema } from '../types/powerbiRls.types';
import type { PowerBIReportRoleMapping } from '../types/powerbiRls.types';
import { useUserAuthorityList } from '../hooks/usePowerbiRls';
import { usePowerbiReportDefinitionList } from '@/features/powerbi/hooks/usePowerbiReportDefinition';
import { Loader2 } from 'lucide-react';

const REPORT_LIST_PARAMS = { pageNumber: 1, pageSize: 500, sortBy: 'Id', sortDirection: 'desc' as const };
const ROLE_LIST_PARAMS = { pageNumber: 1, pageSize: 500 };

interface PowerbiRlsFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial: PowerBIReportRoleMapping | null;
  onSubmit: (data: PowerbiRlsFormSchema) => void | Promise<void>;
  isSubmitting: boolean;
}

export function PowerbiRlsForm({
  open,
  onOpenChange,
  initial,
  onSubmit,
  isSubmitting,
}: PowerbiRlsFormProps): ReactElement {
  const { t } = useTranslation();
  const { data: reportsData } = usePowerbiReportDefinitionList(REPORT_LIST_PARAMS);
  const { data: rolesData } = useUserAuthorityList(ROLE_LIST_PARAMS);
  const reports = reportsData?.data ?? [];
  const roles = rolesData?.data ?? [];

  const form = useForm<PowerbiRlsFormSchema>({
    resolver: zodResolver(powerbiRlsFormSchema),
    defaultValues: {
      powerBIReportDefinitionId: 0,
      roleId: 0,
      rlsRoles: '',
    },
  });

  useEffect(() => {
    if (initial) {
      form.reset({
        powerBIReportDefinitionId: initial.powerBIReportDefinitionId,
        roleId: initial.roleId,
        rlsRoles: initial.rlsRoles,
      });
    } else {
      form.reset({
        powerBIReportDefinitionId: 0,
        roleId: 0,
        rlsRoles: '',
      });
    }
  }, [initial, form, open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-1rem)] sm:w-[calc(100vw-2rem)] max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {initial ? t('powerbiRls.edit') : t('powerbiRls.new')}
          </DialogTitle>
          <DialogDescription>
            {t('powerbiRls.description')}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="powerBIReportDefinitionId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('powerbiRls.report')}</FormLabel>
                  <Select
                    onValueChange={(v) => field.onChange(Number(v))}
                    value={field.value ? String(field.value) : ''}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t('powerbiRls.report')} />
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
            <FormField
              control={form.control}
              name="roleId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('powerbiRls.role')}</FormLabel>
                  <Select
                    onValueChange={(v) => field.onChange(Number(v))}
                    value={field.value ? String(field.value) : ''}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t('powerbiRls.role')} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {roles.map((r) => (
                        <SelectItem key={r.id} value={String(r.id)}>
                          {r.title}
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
              name="rlsRoles"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('powerbiRls.rlsRoles')}</FormLabel>
                  <FormControl>
                    <Input
                      placeholder={t('powerbiRls.rlsRolesPlaceholder')}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                {t('powerbiRls.cancel')}
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t('powerbiRls.save')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

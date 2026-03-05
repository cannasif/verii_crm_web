import { type ReactElement, useEffect, useState } from 'react';
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
import { VoiceSearchCombobox } from '@/components/shared/VoiceSearchCombobox';
import {
  userPowerbiGroupFormSchema,
  type UserPowerBIGroupFormSchema,
} from '../types/userPowerbiGroup.types';
import type { UserPowerBIGroupGetDto } from '../types/userPowerbiGroup.types';
import { usePowerbiGroupList } from '../hooks/usePowerbiGroup';
import { useUserOptionsInfinite } from '@/components/shared/dropdown/useDropdownEntityInfinite';
import { Loader2 } from 'lucide-react';
import { isZodFieldRequired } from '@/lib/zod-required';

const GROUP_LIST_PARAMS = { pageNumber: 1, pageSize: 500 };

interface UserGroupFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial: UserPowerBIGroupGetDto | null;
  onSubmit: (data: UserPowerBIGroupFormSchema) => void | Promise<void>;
  isSubmitting: boolean;
}

export function UserGroupForm({
  open,
  onOpenChange,
  initial,
  onSubmit,
  isSubmitting,
}: UserGroupFormProps): ReactElement {
  const { t } = useTranslation();
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const { data: groupsData } = usePowerbiGroupList(GROUP_LIST_PARAMS);
  const userDropdown = useUserOptionsInfinite(userSearchTerm, open);
  const groups = groupsData?.data ?? [];

  const form = useForm<UserPowerBIGroupFormSchema>({
    resolver: zodResolver(userPowerbiGroupFormSchema),
    mode: 'onChange',
    reValidateMode: 'onChange',
    defaultValues: {
      userId: 0,
      groupId: 0,
    },
  });
  const isFormValid = form.formState.isValid;

  useEffect(() => {
    if (initial) {
      form.reset({
        userId: initial.userId,
        groupId: initial.groupId,
      });
    } else {
      form.reset({
        userId: 0,
        groupId: 0,
      });
    }
  }, [initial, form, open]);

  const handleSubmit = async (data: UserPowerBIGroupFormSchema): Promise<void> => {
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
              ? t('powerbi.userGroup.edit')
              : t('powerbi.userGroup.add')}
          </DialogTitle>
          <DialogDescription>
            {initial
              ? t('powerbi.userGroup.editDescription')
              : t('powerbi.userGroup.createDescription')}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="userId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel required={isZodFieldRequired(userPowerbiGroupFormSchema, 'userId')}>{t('powerbi.userGroup.userId')}</FormLabel>
                  <FormControl>
                    <VoiceSearchCombobox
                      options={userDropdown.options}
                      value={field.value ? String(field.value) : ''}
                      onSelect={(v) => field.onChange(v ? Number(v) : 0)}
                      onDebouncedSearchChange={setUserSearchTerm}
                      onFetchNextPage={userDropdown.fetchNextPage}
                      hasNextPage={userDropdown.hasNextPage}
                      isLoading={userDropdown.isLoading}
                      isFetchingNextPage={userDropdown.isFetchingNextPage}
                      placeholder={t('powerbi.userGroup.selectUser')}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="groupId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel required={isZodFieldRequired(userPowerbiGroupFormSchema, 'groupId')}>{t('powerbi.userGroup.groupId')}</FormLabel>
                  <FormControl>
                    <VoiceSearchCombobox
                      options={groups.map((g) => ({ value: String(g.id), label: g.name }))}
                      value={field.value ? String(field.value) : ''}
                      onSelect={(v) => field.onChange(v ? Number(v) : 0)}
                      placeholder={t('powerbi.userGroup.selectGroup')}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
                {t('common.cancel')}
              </Button>
              <Button type="submit" disabled={isSubmitting || !isFormValid}>
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

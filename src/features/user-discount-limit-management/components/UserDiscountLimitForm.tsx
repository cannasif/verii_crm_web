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
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { VoiceSearchCombobox, type ComboboxOption } from '@/components/shared/VoiceSearchCombobox';
import { userDiscountLimitFormSchema, type UserDiscountLimitFormSchema } from '../types/user-discount-limit-types';
import type { UserDiscountLimitDto } from '../types/user-discount-limit-types';
import { useUserOptions } from '../hooks/useUserOptions';
import { useStokGroup } from '@/services/hooks/useStokGroup';
import { toast } from 'sonner';
import { userDiscountLimitApi } from '../api/user-discount-limit-api';
import { isZodFieldRequired } from '@/lib/zod-required';

const INPUT_STYLE = `
  h-11 rounded-lg
  border-gray-200 bg-white
  focus:border-pink-500 focus:ring-2 focus:ring-pink-100
  hover:border-pink-200 hover:bg-pink-50/30
  transition-all duration-200
  text-gray-700 font-medium
`;

const LABEL_STYLE = "text-sm font-semibold text-gray-700 mb-1.5 ml-1";

interface UserDiscountLimitFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: UserDiscountLimitFormSchema) => void | Promise<void>;
  userDiscountLimit?: UserDiscountLimitDto | null;
  isLoading?: boolean;
}

export function UserDiscountLimitForm({
  open,
  onOpenChange,
  onSubmit,
  userDiscountLimit,
  isLoading = false,
}: UserDiscountLimitFormProps): ReactElement {
  const { t } = useTranslation();
  const { data: users, isLoading: usersLoading } = useUserOptions();
  const { data: stokGroups = [], isLoading: isLoadingGroups } = useStokGroup();

  const form = useForm<UserDiscountLimitFormSchema>({
    resolver: zodResolver(userDiscountLimitFormSchema),
    defaultValues: {
      erpProductGroupCode: '',
      salespersonId: 0,
      maxDiscount1: 0,
      maxDiscount2: undefined,
      maxDiscount3: undefined,
    },
  });

  useEffect(() => {
    if (userDiscountLimit) {
      form.reset({
        erpProductGroupCode: userDiscountLimit.erpProductGroupCode,
        salespersonId: userDiscountLimit.salespersonId,
        maxDiscount1: userDiscountLimit.maxDiscount1,
        maxDiscount2: userDiscountLimit.maxDiscount2 || undefined,
        maxDiscount3: userDiscountLimit.maxDiscount3 || undefined,
      });
    } else {
      form.reset({
        erpProductGroupCode: '',
        salespersonId: 0,
        maxDiscount1: 0,
        maxDiscount2: undefined,
        maxDiscount3: undefined,
      });
    }
  }, [userDiscountLimit, form]);

  const handleSubmit = async (data: UserDiscountLimitFormSchema): Promise<void> => {
    if (!userDiscountLimit) {
      try {
        const existsResult = await userDiscountLimitApi.existsBySalespersonAndGroup(data.salespersonId, data.erpProductGroupCode);
        if (existsResult) {
          toast.error(t('userDiscountLimitManagement.alreadyExists'));
          return;
        }
      } catch {
        void 0;
      }
    }
    await onSubmit(data);
    if (!isLoading) {
      form.reset();
      onOpenChange(false);
    }
  };

  const userComboboxOptions: ComboboxOption[] = users?.map(user => ({
    value: user.id.toString(),
    label: user.fullName || `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username
  })) || [];

  const groupComboboxOptions: ComboboxOption[] = stokGroups.map(group => {
    const groupCode = group.grupKodu || `__group_${group.isletmeKodu}_${group.subeKodu}`;
    const displayText = group.grupKodu && group.grupAdi 
      ? `${group.grupKodu} - ${group.grupAdi}`
      : group.grupAdi || group.grupKodu || groupCode;
    return {
      value: groupCode,
      label: displayText
    };
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {userDiscountLimit
              ? t('userDiscountLimitManagement.edit')
              : t('userDiscountLimitManagement.create')}
          </DialogTitle>
          <DialogDescription>
            {userDiscountLimit
              ? t('userDiscountLimitManagement.editDescription')
              : t('userDiscountLimitManagement.createDescription')}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="salespersonId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className={LABEL_STYLE} required={isZodFieldRequired(userDiscountLimitFormSchema, 'salespersonId')}>
                    {t('userDiscountLimitManagement.salesperson')}
                  </FormLabel>
                  <VoiceSearchCombobox
                    options={userComboboxOptions}
                    value={field.value && field.value > 0 ? field.value.toString() : ''}
                    onSelect={(value) => {
                      field.onChange(value ? Number(value) : 0);
                    }}
                    placeholder={t('userDiscountLimitManagement.selectSalesperson')}
                    searchPlaceholder={t('userDiscountLimitManagement.searchSalesperson')}
                    className={INPUT_STYLE}
                    modal={true}
                    disabled={usersLoading}
                  />
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="erpProductGroupCode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className={LABEL_STYLE} required={isZodFieldRequired(userDiscountLimitFormSchema, 'erpProductGroupCode')}>
                    {t('userDiscountLimitManagement.erpProductGroupCode')}
                  </FormLabel>
                  <VoiceSearchCombobox
                    options={groupComboboxOptions}
                    value={field.value || ''}
                    onSelect={(value) => {
                      field.onChange(value);
                    }}
                    placeholder={t('userDiscountLimitManagement.selectErpProductGroupCode')}
                    searchPlaceholder={t('userDiscountLimitManagement.searchGroup')}
                    className={INPUT_STYLE}
                    modal={true}
                    disabled={isLoadingGroups}
                  />
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="maxDiscount1"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className={LABEL_STYLE} required={isZodFieldRequired(userDiscountLimitFormSchema, 'maxDiscount1')}>
                    {t('userDiscountLimitManagement.maxDiscount1')}
                  </FormLabel>
                  <FormControl>
                    <Input
                      className={INPUT_STYLE}
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      {...field}
                      onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                      value={field.value || ''}
                      placeholder={t('userDiscountLimitManagement.enterMaxDiscount1')}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="maxDiscount2"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className={LABEL_STYLE}>
                    {t('userDiscountLimitManagement.maxDiscount2')}
                  </FormLabel>
                  <FormControl>
                    <Input
                      className={INPUT_STYLE}
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      {...field}
                      onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                      value={field.value || ''}
                      placeholder={t('userDiscountLimitManagement.enterMaxDiscount2')}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="maxDiscount3"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className={LABEL_STYLE}>
                    {t('userDiscountLimitManagement.maxDiscount3')}
                  </FormLabel>
                  <FormControl>
                    <Input
                      className={INPUT_STYLE}
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      {...field}
                      onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                      value={field.value || ''}
                      placeholder={t('userDiscountLimitManagement.enterMaxDiscount3')}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isLoading}
              >
                {t('userDiscountLimitManagement.cancel')}
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading
                  ? t('userDiscountLimitManagement.saving')
                  : t('userDiscountLimitManagement.save')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

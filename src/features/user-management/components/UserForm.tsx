import { type ReactElement, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  userFormSchema,
  userUpdateFormSchema,
  type UserFormSchema,
  type UserUpdateFormSchema,
} from '../types/user-types';
import type { UserDto } from '../types/user-types';
import { useUserAuthorityOptionsQuery } from '../hooks/useUserAuthorityOptionsQuery';
import type { RoleOption } from '../hooks/useUserAuthorityOptionsQuery';
import { useUserManagerOptionsQuery } from '../hooks/useUserManagerOptionsQuery';
import { useUserPermissionGroupsForForm } from '../hooks/useUserPermissionGroupsForForm';
import { UserFormPermissionGroupSelect } from './UserFormPermissionGroupSelect';
import { User, Mail, Lock, Phone, Shield, Activity, X, Users } from 'lucide-react';
import { FormSubmitTooltipWrap } from '@/components/shared/FormSubmitTooltipWrap';
import { isZodFieldRequired } from '@/lib/zod-required';
import { getZodValidationMessages } from '@/lib/zod-validation-hint';
import { cn } from '@/lib/utils';

interface UserFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: UserFormSchema | UserUpdateFormSchema) => void | Promise<void>;
  user?: UserDto | null;
  isLoading?: boolean;
  canManagePermissionGroups?: boolean;
}

const INPUT_FIELD_CLASSNAME = cn(
  'h-11 w-full rounded-lg text-sm transition-all duration-200',
  'bg-slate-50 dark:bg-white/5',
  'border border-slate-200 dark:border-white/10',
  'text-slate-900 dark:text-white',
  'placeholder:text-slate-400 dark:placeholder:text-slate-500',
  'focus-visible:bg-white dark:focus-visible:bg-white/5',
  'focus-visible:border-rose-500/70 focus-visible:ring-2 focus-visible:ring-rose-500/10 focus-visible:ring-offset-0',
  'aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/20',
  'dark:aria-invalid:border-destructive dark:aria-invalid:ring-destructive/30'
);

const LABEL_STYLE = 'text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-2';

const FORM_MESSAGE_SLOT_CLASSNAME = 'min-h-5';

function FormMessageSlot(): ReactElement {
  return (
    <div className={FORM_MESSAGE_SLOT_CLASSNAME}>
      <FormMessage className="text-xs leading-snug" />
    </div>
  );
}

const EMPTY_ROLE_OPTIONS: RoleOption[] = [];

export function UserForm({
  open,
  onOpenChange,
  onSubmit,
  user,
  isLoading = false,
  canManagePermissionGroups = false,
}: UserFormProps): ReactElement {
  const { t } = useTranslation('user-management');
  const userId = user?.id ?? null;
  const userUsername = user?.username ?? '';
  const userEmail = user?.email ?? '';
  const userFirstName = user?.firstName ?? '';
  const userLastName = user?.lastName ?? '';
  const userPhoneNumber = user?.phoneNumber ?? '';
  const userManagerUserId = user?.managerUserId ?? null;
  const userRoleLabel = user?.role ?? '';
  const userRoleId = user?.roleId ?? 0;
  const userIsActive = user?.isActive ?? true;
  const isEditMode = userId != null;
  const roleOptionsQuery = useUserAuthorityOptionsQuery();
  const roleOptions = roleOptionsQuery.data ?? EMPTY_ROLE_OPTIONS;
  const managerOptionsQuery = useUserManagerOptionsQuery();
  const managerOptions = (managerOptionsQuery.data ?? []).filter((option) => option.value !== userId);
  const userPermissionGroupsQuery = useUserPermissionGroupsForForm(
    userId,
    canManagePermissionGroups
  );

  const form = useForm<UserFormSchema | UserUpdateFormSchema>({
    resolver: zodResolver(isEditMode ? userUpdateFormSchema : userFormSchema),
    mode: 'onChange',
    reValidateMode: 'onChange',
    defaultValues: {
      username: '',
      email: '',
      password: '',
      firstName: '',
      lastName: '',
      phoneNumber: '',
      roleId: 0,
      managerUserId: null,
      isActive: true,
      permissionGroupIds: [],
    },
  });
  const isFormValid = form.formState.isValid;
  const watchedValues = form.watch();
  const activeSchema = useMemo(
    () => (isEditMode ? userUpdateFormSchema : userFormSchema),
    [isEditMode]
  );

  const saveManualHintLines = useMemo(() => {
    if (isFormValid) return [];
    return getZodValidationMessages(activeSchema, watchedValues).map((message) =>
      t(message, { defaultValue: message })
    );
  }, [activeSchema, isFormValid, t, watchedValues]);

  const handleInvalidSubmit = (): void => {
    void form.trigger();
  };

  useEffect(() => {
    if (!open) {
      return;
    }

    if (userId != null) {
      form.reset({
        username: userUsername,
        email: userEmail,
        firstName: userFirstName,
        lastName: userLastName,
        phoneNumber: userPhoneNumber,
        roleId: userRoleId,
        managerUserId: userManagerUserId,
        isActive: userIsActive,
        permissionGroupIds: [],
      });
      return;
    }

    form.reset({
      username: '',
      email: '',
      password: '',
      firstName: '',
      lastName: '',
      phoneNumber: '',
      roleId: 0,
      managerUserId: null,
      isActive: true,
      permissionGroupIds: [],
    });
  }, [
    open,
    userId,
    userUsername,
    userEmail,
    userFirstName,
    userLastName,
    userPhoneNumber,
    userManagerUserId,
    userIsActive,
    userRoleId,
    form,
  ]);

  useEffect(() => {
    if (!open || userId == null || !canManagePermissionGroups) {
      return;
    }

    if (userPermissionGroupsQuery.isLoading || userPermissionGroupsQuery.data == null) {
      return;
    }

    const current = form.getValues('permissionGroupIds') ?? [];
    const next = userPermissionGroupsQuery.data;
    const same =
      current.length === next.length &&
      current.every((value, index) => value === next[index]);

    if (!same) {
      form.setValue('permissionGroupIds', next, { shouldDirty: false, shouldTouch: false });
    }
  }, [open, userId, canManagePermissionGroups, userPermissionGroupsQuery.isLoading, userPermissionGroupsQuery.data, form]);

  useEffect(() => {
    if (!open || userId == null || roleOptions.length === 0) {
      return;
    }

    const currentRole = form.getValues('roleId');
    if (currentRole && currentRole > 0) {
      return;
    }

    const matchedRole = roleOptions.find((r) => r.label === userRoleLabel);
    if (matchedRole) {
      form.setValue('roleId', matchedRole.value, { shouldDirty: false, shouldTouch: false });
    }
  }, [open, userId, userRoleLabel, roleOptions, form]);

  const handleSubmit = async (data: UserFormSchema | UserUpdateFormSchema): Promise<void> => {
    await onSubmit(data);
    if (!isLoading) {
      form.reset({
        username: '',
        email: '',
        password: '',
        firstName: '',
        lastName: '',
        phoneNumber: '',
        roleId: 0,
        managerUserId: null,
        isActive: true,
        permissionGroupIds: [],
      });
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} className="bg-white dark:bg-[#130822] border border-slate-100 dark:border-white/10 text-slate-900 dark:text-white w-[calc(100vw-1rem)] sm:w-[calc(100vw-2rem)] max-w-[96vw] xl:max-w-[800px] max-h-[92vh] flex flex-col p-0 overflow-hidden rounded-2xl shadow-2xl transition-all duration-300">
        <DialogHeader className="px-6 py-4 border-b border-slate-100 dark:border-white/5 flex flex-row items-center justify-between shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-10 w-10 rounded-xl bg-[image:var(--crm-brand-gradient)] flex items-center justify-center shrink-0">
              <User size={20} className="text-white" />
            </div>
            <div className="min-w-0 text-left">
              <DialogTitle className="text-lg font-semibold text-slate-900 dark:text-white truncate">
                {user ? t('form.editUser') : t('form.addUser')}
              </DialogTitle>
              <DialogDescription className="text-slate-500 dark:text-slate-400 text-sm truncate">
                {user ? t('form.editDescription') : t('form.addDescription')}
              </DialogDescription>
            </div>
          </div>
          <button
            onClick={() => onOpenChange(false)}
            className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-white/10 text-slate-500 dark:text-slate-400 transition-colors"
          >
            <X size={20} />
          </button>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit, handleInvalidSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel
                        className={LABEL_STYLE}
                        required={isZodFieldRequired(activeSchema, 'username')}
                      >
                        <User size={16} className="text-rose-500" /> {t('form.username')}
                      </FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder={t('form.usernamePlaceholder')}
                          maxLength={50}
                          disabled={isEditMode}
                          className={INPUT_FIELD_CLASSNAME}
                        />
                      </FormControl>
                      <FormMessageSlot />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel
                        className={LABEL_STYLE}
                        required={isZodFieldRequired(activeSchema, 'email')}
                      >
                        <Mail size={16} className="text-rose-500" /> {t('form.email')}
                      </FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="email"
                          placeholder={t('form.emailPlaceholder')}
                          className={INPUT_FIELD_CLASSNAME}
                        />
                      </FormControl>
                      <FormMessageSlot />
                    </FormItem>
                  )}
                />
              </div>

              {!isEditMode && (
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={LABEL_STYLE}>
                        <Lock size={16} className="text-rose-500" /> {t('form.password')}
                      </FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="password"
                          placeholder={t('form.passwordPlaceholder')}
                          className={INPUT_FIELD_CLASSNAME}
                        />
                      </FormControl>
                      <FormMessageSlot />
                    </FormItem>
                  )}
                />
              )}

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={LABEL_STYLE}>
                        <User size={16} className="text-rose-500" /> {t('form.firstName')}
                      </FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder={t('form.firstNamePlaceholder')}
                          maxLength={50}
                          className={INPUT_FIELD_CLASSNAME}
                        />
                      </FormControl>
                      <FormMessageSlot />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={LABEL_STYLE}>
                        <User size={16} className="text-rose-500" /> {t('form.lastName')}
                      </FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder={t('form.lastNamePlaceholder')}
                          maxLength={50}
                          className={INPUT_FIELD_CLASSNAME}
                        />
                      </FormControl>
                      <FormMessageSlot />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="phoneNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={LABEL_STYLE}>
                        <Phone size={16} className="text-rose-500" /> {t('form.phoneNumber')}
                      </FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder={t('form.phoneNumberPlaceholder')}
                          maxLength={20}
                          className={INPUT_FIELD_CLASSNAME}
                        />
                      </FormControl>
                      <FormMessageSlot />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="roleId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel
                        className={LABEL_STYLE}
                        required={isZodFieldRequired(activeSchema, 'roleId')}
                      >
                        <Shield size={16} className="text-rose-500" /> {t('form.role')}
                      </FormLabel>
                      <Select
                        value={field.value ? String(field.value) : ''}
                        onValueChange={(v) => field.onChange(v ? parseInt(v, 10) : 0)}
                        disabled={isLoading}
                      >
                        <FormControl>
                          <SelectTrigger className={INPUT_FIELD_CLASSNAME}>
                            <SelectValue
                              placeholder={t('form.rolePlaceholder')}
                            />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="bg-white dark:bg-[#130822] border-slate-200 dark:border-white/10">
                          {roleOptions.map((opt) => (
                            <SelectItem key={opt.value} value={String(opt.value)} className="focus:bg-rose-500 focus:text-white">
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessageSlot />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="managerUserId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className={LABEL_STYLE}>
                      <Users size={16} className="text-rose-500" /> {t('form.manager')}
                    </FormLabel>
                    <Select
                      value={field.value ? String(field.value) : 'none'}
                      onValueChange={(value) => field.onChange(value === 'none' ? null : parseInt(value, 10))}
                      disabled={isLoading}
                    >
                      <FormControl>
                        <SelectTrigger className={INPUT_FIELD_CLASSNAME}>
                          <SelectValue placeholder={t('form.managerPlaceholder')} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-white dark:bg-[#130822] border-slate-200 dark:border-white/10">
                        <SelectItem value="none">{t('form.noManager')}</SelectItem>
                        {managerOptions.map((option) => (
                          <SelectItem key={option.value} value={String(option.value)} className="focus:bg-rose-500 focus:text-white">
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessageSlot />
                  </FormItem>
                )}
              />

              {canManagePermissionGroups && (
                <FormField
                  control={form.control}
                  name="permissionGroupIds"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={LABEL_STYLE}>
                        <Shield size={16} className="text-rose-500" /> {t('form.permissionGroups')}
                      </FormLabel>
                      <FormControl>
                        <UserFormPermissionGroupSelect
                          value={field.value ?? []}
                          onChange={field.onChange}
                          disabled={isLoading}
                        />
                      </FormControl>
                      <FormMessageSlot />
                    </FormItem>
                  )}
                />
              )}

              <FormField
                control={form.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-xl border border-slate-200 dark:border-white/10 p-4 bg-slate-50/50 dark:bg-white/5">
                    <FormLabel className="text-sm font-medium flex items-center gap-2 m-0">
                      <Activity size={16} className="text-rose-500" /> {t('form.isActive')}
                    </FormLabel>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        className="data-[state=checked]:bg-rose-500"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex flex-col-reverse flex-row justify-end gap-3 pt-6 border-t border-slate-100 dark:border-white/5">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={isLoading}
                  className="h-11 px-5 rounded-lg font-medium"
                >
                  {t('form.cancel')}
                </Button>
                <FormSubmitTooltipWrap
                  schema={activeSchema}
                  value={watchedValues}
                  isValid={isFormValid}
                  isPending={isLoading}
                  manualHintLines={saveManualHintLines}
                >
                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="h-11 px-8 rounded-lg bg-[image:var(--crm-brand-gradient)] hover:scale-[1.02] active:scale-[0.98] border-0 text-white font-semibold shadow-[0_10px_20px_-10px_var(--crm-brand-shadow)] transition-all duration-200"
                  >
                    {isLoading ? t('form.saving') : t('form.save')}
                  </Button>
                </FormSubmitTooltipWrap>
              </div>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  );
}

import { type ReactElement, useEffect } from 'react';
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

interface UserFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: UserFormSchema | UserUpdateFormSchema) => void | Promise<void>;
  user?: UserDto | null;
  isLoading?: boolean;
}

const INPUT_STYLE = `
  h-11 rounded-lg
  bg-slate-50 dark:bg-white/5
  border border-slate-200 dark:border-white/10
  text-slate-900 dark:text-white text-sm
  placeholder:text-slate-400 dark:placeholder:text-slate-500
  focus-visible:bg-white dark:focus-visible:bg-white/5
  focus-visible:border-pink-500/70 focus-visible:ring-2 focus-visible:ring-pink-500/10 focus-visible:ring-offset-0
  transition-all duration-200 w-full
`;

const LABEL_STYLE = 'text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-2';

const EMPTY_ROLE_OPTIONS: RoleOption[] = [];

export function UserForm({
  open,
  onOpenChange,
  onSubmit,
  user,
  isLoading = false,
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
    userId
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
    if (!open || userId == null) {
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
  }, [open, userId, userPermissionGroupsQuery.isLoading, userPermissionGroupsQuery.data, form]);

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
            <div className="h-10 w-10 rounded-xl bg-linear-to-br from-pink-500 to-orange-500 flex items-center justify-center shrink-0">
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
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={LABEL_STYLE}>
                        <User size={16} className="text-pink-500" /> {t('form.username')}
                      </FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder={t('form.usernamePlaceholder')}
                          maxLength={50}
                          disabled={isEditMode}
                          className={INPUT_STYLE}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={LABEL_STYLE}>
                        <Mail size={16} className="text-pink-500" /> {t('form.email')}
                      </FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="email"
                          placeholder={t('form.emailPlaceholder')}
                          className={INPUT_STYLE}
                        />
                      </FormControl>
                      <FormMessage />
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
                        <Lock size={16} className="text-pink-500" /> {t('form.password')}
                      </FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="password"
                          placeholder={t('form.passwordPlaceholder')}
                          className={INPUT_STYLE}
                        />
                      </FormControl>
                      <FormMessage />
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
                        <User size={16} className="text-pink-500" /> {t('form.firstName')}
                      </FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder={t('form.firstNamePlaceholder')}
                          maxLength={50}
                          className={INPUT_STYLE}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={LABEL_STYLE}>
                        <User size={16} className="text-pink-500" /> {t('form.lastName')}
                      </FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder={t('form.lastNamePlaceholder')}
                          maxLength={50}
                          className={INPUT_STYLE}
                        />
                      </FormControl>
                      <FormMessage />
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
                        <Phone size={16} className="text-pink-500" /> {t('form.phoneNumber')}
                      </FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder={t('form.phoneNumberPlaceholder')}
                          maxLength={20}
                          className={INPUT_STYLE}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="roleId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className={LABEL_STYLE}>
                        <Shield size={16} className="text-pink-500" /> {t('form.role')}
                        {!isEditMode && <span className="text-destructive ml-1">*</span>}
                      </FormLabel>
                      <Select
                        value={field.value ? String(field.value) : ''}
                        onValueChange={(v) => field.onChange(v ? parseInt(v, 10) : 0)}
                        disabled={isLoading}
                      >
                        <FormControl>
                          <SelectTrigger className={INPUT_STYLE}>
                            <SelectValue
                              placeholder={t('form.rolePlaceholder')}
                            />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="bg-white dark:bg-[#130822] border-slate-200 dark:border-white/10">
                          {roleOptions.map((opt) => (
                            <SelectItem key={opt.value} value={String(opt.value)} className="focus:bg-pink-500 focus:text-white">
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
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
                      <Users size={16} className="text-pink-500" /> {t('form.manager')}
                    </FormLabel>
                    <Select
                      value={field.value ? String(field.value) : 'none'}
                      onValueChange={(value) => field.onChange(value === 'none' ? null : parseInt(value, 10))}
                      disabled={isLoading}
                    >
                      <FormControl>
                        <SelectTrigger className={INPUT_STYLE}>
                          <SelectValue placeholder={t('form.managerPlaceholder')} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="bg-white dark:bg-[#130822] border-slate-200 dark:border-white/10">
                        <SelectItem value="none">{t('form.noManager')}</SelectItem>
                        {managerOptions.map((option) => (
                          <SelectItem key={option.value} value={String(option.value)} className="focus:bg-pink-500 focus:text-white">
                            {option.label}
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
                name="permissionGroupIds"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className={LABEL_STYLE}>
                      <Shield size={16} className="text-pink-500" /> {t('form.permissionGroups')}
                    </FormLabel>
                    <FormControl>
                      <UserFormPermissionGroupSelect
                        value={field.value ?? []}
                        onChange={field.onChange}
                        disabled={isLoading}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-xl border border-slate-200 dark:border-white/10 p-4 bg-slate-50/50 dark:bg-white/5">
                    <FormLabel className="text-sm font-medium flex items-center gap-2 m-0">
                      <Activity size={16} className="text-pink-500" /> {t('form.isActive')}
                    </FormLabel>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        className="data-[state=checked]:bg-pink-500"
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
                <Button
                  type="submit"
                  disabled={isLoading || !isFormValid}
                  className="h-11 px-8 rounded-lg bg-linear-to-r from-pink-600 to-orange-600 hover:from-pink-700 hover:to-orange-700 text-white font-semibold shadow-md disabled:opacity-50 disabled:pointer-events-none transition-all duration-200 opacity-75 grayscale-[0] dark:opacity-100 dark:grayscale-0"
                >
                  {isLoading
                    ? t('form.saving')
                    : t('form.save')}
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  );
}

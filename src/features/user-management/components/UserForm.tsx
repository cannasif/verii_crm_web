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
import { useUserPermissionGroupsForForm } from '../hooks/useUserPermissionGroupsForForm';
import { UserFormPermissionGroupSelect } from './UserFormPermissionGroupSelect';

interface UserFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: UserFormSchema | UserUpdateFormSchema) => void | Promise<void>;
  user?: UserDto | null;
  isLoading?: boolean;
}

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
  const userRoleLabel = user?.role ?? '';
  const userRoleId = user?.roleId ?? 0;
  const userIsActive = user?.isActive ?? true;
  const isEditMode = userId != null;
  const roleOptionsQuery = useUserAuthorityOptionsQuery();
  const roleOptions = roleOptionsQuery.data ?? EMPTY_ROLE_OPTIONS;
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
        isActive: true,
        permissionGroupIds: [],
      });
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {user
              ? t('userManagement.form.editUser')
              : t('userManagement.form.addUser')}
          </DialogTitle>
          <DialogDescription>
            {user
              ? t('userManagement.form.editDescription')
              : t('userManagement.form.addDescription')}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {t('userManagement.form.username')}
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder={t('userManagement.form.usernamePlaceholder')}
                        maxLength={50}
                        disabled={isEditMode}
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
                    <FormLabel>
                      {t('userManagement.form.email')}
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="email"
                        placeholder={t('userManagement.form.emailPlaceholder')}
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
                    <FormLabel>
                      {t('userManagement.form.password')}
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="password"
                        placeholder={t('userManagement.form.passwordPlaceholder')}
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
                    <FormLabel>
                      {t('userManagement.form.firstName')}
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder={t('userManagement.form.firstNamePlaceholder')}
                        maxLength={50}
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
                    <FormLabel>
                      {t('userManagement.form.lastName')}
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder={t('userManagement.form.lastNamePlaceholder')}
                        maxLength={50}
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
                    <FormLabel>
                      {t('userManagement.form.phoneNumber')}
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder={t('userManagement.form.phoneNumberPlaceholder')}
                        maxLength={20}
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
                    <FormLabel>
                      {t('userManagement.form.role')}
                      {!isEditMode && <span className="text-destructive ml-1">*</span>}
                    </FormLabel>
                    <Select
                      value={field.value ? String(field.value) : ''}
                      onValueChange={(v) => field.onChange(v ? parseInt(v, 10) : 0)}
                      disabled={isLoading}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue
                            placeholder={t('userManagement.form.rolePlaceholder')}
                          />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {roleOptions.map((opt) => (
                          <SelectItem key={opt.value} value={String(opt.value)}>
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
              name="permissionGroupIds"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {t('userManagement.form.permissionGroups')}
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
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <FormLabel>
                    {t('userManagement.form.isActive')}
                  </FormLabel>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
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
                {t('userManagement.form.cancel')}
              </Button>
              <Button type="submit" disabled={isLoading || !isFormValid}>
                {isLoading
                  ? t('userManagement.form.saving')
                  : t('userManagement.form.save')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

import { type ReactElement, useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { Breadcrumb } from '@/components/ui/breadcrumb';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { userDetailFormSchema, type UserDetailFormSchema, Gender, GENDER_OPTIONS } from '../types/user-detail-types';
import { useUserDetailByUserId } from '../hooks/useUserDetailByUserId';
import { useCreateUserDetail } from '../hooks/useCreateUserDetail';
import { useUpdateUserDetail } from '../hooks/useUpdateUserDetail';
import { useUploadProfilePicture } from '../hooks/useUploadProfilePicture';
import { useAuthStore } from '@/stores/auth-store';
import { useUIStore } from '@/stores/ui-store';
import { toast } from 'sonner';
import { getImageUrl } from '../utils/image-url';
import { useChangePassword } from '@/features/auth/hooks/useChangePassword';
import { changePasswordSchema, type ChangePasswordRequest } from '@/features/auth/types/auth';
import {
  User,
  Shield,
  Camera,
  Save,
  Ruler,
  Weight,
  FileText,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Loader2,
  ArrowLeft,
  Building2,
  Briefcase,
  Phone,
  Linkedin,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export function ProfilePage(): ReactElement {
  const { t } = useTranslation();
  const { setPageTitle } = useUIStore();
  const { user, branch } = useAuthStore();
  const userId = user?.id || 0;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isCurrentPasswordVisible, setIsCurrentPasswordVisible] = useState(false);
  const [isNewPasswordVisible, setIsNewPasswordVisible] = useState(false);

  const { data: userDetail, isLoading: isLoadingDetail, refetch: refetchUserDetail } = useUserDetailByUserId(userId);
  const createUserDetail = useCreateUserDetail();
  const updateUserDetail = useUpdateUserDetail();
  const uploadProfilePicture = useUploadProfilePicture();
  const changePassword = useChangePassword();

  const changePasswordForm = useForm<ChangePasswordRequest>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { currentPassword: '', newPassword: '' },
  });

  const form = useForm<UserDetailFormSchema>({
    resolver: zodResolver(userDetailFormSchema),
    mode: 'onChange',
    reValidateMode: 'onChange',
    defaultValues: {
      profilePictureUrl: '',
      height: undefined,
      weight: undefined,
      description: '',
      gender: undefined,
      linkedinUrl: '',
      phoneNumber: '',
      email: '',
    },
  });
  const isFormValid = form.formState.isValid;

  useEffect(() => {
    setPageTitle(t('userDetailManagement.profilePageTitle'));
    return () => setPageTitle(null);
  }, [t, setPageTitle]);

  useEffect(() => {
    const u = new URL(window.location.href);
    if (u.searchParams.has('currentPassword') || u.searchParams.has('newPassword')) {
      u.searchParams.delete('currentPassword');
      u.searchParams.delete('newPassword');
      window.history.replaceState({}, '', u.pathname + u.search);
    }
  }, []);

  useEffect(() => {
    if (userDetail) {
      form.reset({
        profilePictureUrl: userDetail.profilePictureUrl || '',
        height: userDetail.height || undefined,
        weight: userDetail.weight || undefined,
        description: userDetail.description || '',
        gender: userDetail.gender || undefined,
        linkedinUrl: userDetail.linkedinUrl || '',
        phoneNumber: userDetail.phoneNumber || '',
        email: userDetail.email || '',
      });
      setPreviewUrl(userDetail.profilePictureUrl ? getImageUrl(userDetail.profilePictureUrl) : null);
    } else {
      form.reset({
        profilePictureUrl: '',
        height: undefined,
        weight: undefined,
        description: '',
        gender: undefined,
        linkedinUrl: '',
        phoneNumber: '',
        email: '',
      });
      setPreviewUrl(null);
    }
  }, [userDetail, form]);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error(t('userDetailManagement.fileSizeError'));
      return;
    }
    if (!file.type.startsWith('image/')) {
      toast.error(t('userDetailManagement.fileTypeError'));
      return;
    }
    const tempPreviewUrl = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setPreviewUrl(result);
        resolve(result);
      };
      reader.readAsDataURL(file);
    });
    try {
      const result = await uploadProfilePicture.mutateAsync({ userId, file });
      const refetchedData = await refetchUserDetail();
      if (result?.profilePictureUrl) {
        setPreviewUrl(getImageUrl(result.profilePictureUrl));
        form.setValue('profilePictureUrl', result.profilePictureUrl);
      } else if (refetchedData.data?.profilePictureUrl) {
        setPreviewUrl(getImageUrl(refetchedData.data.profilePictureUrl));
        form.setValue('profilePictureUrl', refetchedData.data.profilePictureUrl);
      } else if (tempPreviewUrl) {
        setPreviewUrl(tempPreviewUrl);
      }
    } catch {
      if (tempPreviewUrl) setPreviewUrl(tempPreviewUrl);
    }
  };

  const handleSubmit = async (data: UserDetailFormSchema): Promise<void> => {
    if (userDetail) {
      await updateUserDetail.mutateAsync({
        id: userDetail.id,
        data: {
          profilePictureUrl: data.profilePictureUrl || undefined,
          height: data.height || undefined,
          weight: data.weight || undefined,
          description: data.description || undefined,
          gender: data.gender || undefined,
          linkedinUrl: data.linkedinUrl || undefined,
          phoneNumber: data.phoneNumber || undefined,
          email: data.email || undefined,
        },
      });
    } else {
      await createUserDetail.mutateAsync({
        userId,
        profilePictureUrl: data.profilePictureUrl || undefined,
        height: data.height || undefined,
        weight: data.weight || undefined,
        description: data.description || undefined,
        gender: data.gender || undefined,
        linkedinUrl: data.linkedinUrl || undefined,
        phoneNumber: data.phoneNumber || undefined,
        email: data.email || undefined,
      });
    }
    toast.success(t('userDetailManagement.saveSuccess'));
  };

  const handleChangePasswordSubmit = async (data: ChangePasswordRequest): Promise<void> => {
    await changePassword.mutateAsync(data);
    changePasswordForm.reset();
    const url = new URL(window.location.href);
    if (url.searchParams.has('currentPassword') || url.searchParams.has('newPassword')) {
      url.searchParams.delete('currentPassword');
      url.searchParams.delete('newPassword');
      window.history.replaceState({}, '', url.pathname + url.search);
    }
  };

  if (isLoadingDetail) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const isSaving = createUserDetail.isPending || updateUserDetail.isPending;
  const isChangingPassword = changePassword.isPending;
  const displayName = user?.name || user?.email || 'Kullanıcı';

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 sm:space-y-8 pb-10">
      <Breadcrumb
        items={[
          { label: t('sidebar.home') },
          { label: t('userDetailManagement.profilePageTitle'), isActive: true },
        ]}
      />

      <Link
        to="/"
        className={cn(
          'inline-flex items-center gap-2 text-sm font-medium transition-colors',
          'text-muted-foreground hover:text-foreground'
        )}
      >
        <ArrowLeft size={16} />
        {t('userDetailManagement.backToHome')}
      </Link>

      <section className="rounded-2xl border bg-white/70 dark:bg-[#1a1025]/60 backdrop-blur-xl border-white/60 dark:border-white/5 p-6 sm:p-8 shadow-sm transition-all duration-300">
        <div className="flex flex-col sm:flex-row sm:items-start gap-6 sm:gap-8">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="relative group shrink-0 self-center sm:self-auto"
          >
            <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full border-4 border-border bg-muted overflow-hidden shadow-lg ring-2 ring-background transition-all group-hover:ring-primary/20">
              {previewUrl ? (
                <img src={previewUrl} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-3xl sm:text-4xl font-bold text-white bg-linear-to-br from-pink-500 to-orange-500">
                  {displayName[0]?.toUpperCase() || 'U'}
                </div>
              )}
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 rounded-full">
                <Camera size={28} className="text-white" />
              </div>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="sr-only"
            />
          </button>
          <div className="flex-1 min-w-0 text-center sm:text-left">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground truncate">
              {displayName}
            </h1>
            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 mt-2 text-muted-foreground">
              <span className="inline-flex items-center gap-2 text-sm">
                <Mail size={14} />
                <span className="break-all">{user?.email}</span>
              </span>
              {branch?.name && (
                <span className="inline-flex items-center gap-2 text-sm">
                  <Building2 size={14} />
                  {branch.name}
                </span>
              )}
              <span className="inline-flex items-center gap-2 text-sm">
                <Briefcase size={14} />
                {t('roles.admin')}
              </span>
            </div>
          </div>
        </div>
      </section>

      <Card className="bg-white/70 dark:bg-[#1a1025]/60 backdrop-blur-xl border-white/60 dark:border-white/5 shadow-sm rounded-2xl transition-all duration-300">
        <CardHeader>
          <CardTitle className="text-xl">{t('userDetailManagement.personalInfo')}</CardTitle>
          <CardDescription>
            {t('userDetailManagement.personalInfoDescription')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="height"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        {t('userDetailManagement.height')}
                      </FormLabel>
                      <FormControl>
                        <div className="relative group">
                          <Ruler className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors size-4" />
                          <Input
                            type="number"
                            step="0.000001"
                            {...field}
                            onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                            value={field.value ?? ''}
                            className="pl-10 h-11 bg-white/50 dark:bg-card/50 border-slate-200 dark:border-white/10 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-pink-500 dark:focus-visible:border-pink-500 rounded-xl transition-all"
                            placeholder={t('userDetailManagement.heightPlaceholderExample', { defaultValue: 'Örn: 175' })}
                          />
                        </div>
                      </FormControl>
                      <FormMessage className="text-destructive text-xs" />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="weight"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        {t('userDetailManagement.weight')}
                      </FormLabel>
                      <FormControl>
                        <div className="relative group">
                          <Weight className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors size-4" />
                          <Input
                            type="number"
                            step="0.000001"
                            {...field}
                            onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                            value={field.value ?? ''}
                            className="pl-10 h-11 bg-white/50 dark:bg-card/50 border-slate-200 dark:border-white/10 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-pink-500 dark:focus-visible:border-pink-500 rounded-xl transition-all"
                            placeholder={t('userDetailManagement.weightPlaceholderExample', { defaultValue: 'Örn: 70' })}
                          />
                        </div>
                      </FormControl>
                      <FormMessage className="text-destructive text-xs" />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="gender"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {t('userDetailManagement.gender')}
                    </FormLabel>
                    <div className="relative group">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 z-10 text-muted-foreground group-focus-within:text-primary transition-colors size-4" />
                      <Select
                        onValueChange={(value) => field.onChange(value && value !== 'none' ? (parseInt(value, 10) as Gender) : undefined)}
                        value={field.value !== undefined && field.value !== null ? String(field.value) : undefined}
                      >
                        <FormControl>
                          <SelectTrigger className="pl-10 h-11 bg-white/50 dark:bg-card/50 border-slate-200 dark:border-white/10 focus:ring-0 focus:ring-offset-0 focus:border-pink-500 dark:focus:border-pink-500 rounded-xl transition-all w-full">
                            <SelectValue placeholder={t('userDetailManagement.selectGender')} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">{t('userDetailManagement.noGenderSelected')}</SelectItem>
                          {GENDER_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={String(option.value)}>
                              {t(`userDetailManagement.gender${option.label}`, option.label)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <FormMessage className="text-destructive text-xs" />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="phoneNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        {t('userDetailManagement.phoneNumber')}
                      </FormLabel>
                      <FormControl>
                        <div className="relative group">
                          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors size-4" />
                          <Input
                            type="text"
                            {...field}
                            value={field.value ?? ''}
                            className="pl-10 h-11 bg-white/50 dark:bg-card/50 border-slate-200 dark:border-white/10 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-pink-500 dark:focus-visible:border-pink-500 rounded-xl transition-all"
                            placeholder={t('userDetailManagement.enterPhoneNumber')}
                          />
                        </div>
                      </FormControl>
                      <FormMessage className="text-destructive text-xs" />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        {t('userDetailManagement.email')}
                      </FormLabel>
                      <FormControl>
                        <div className="relative group">
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors size-4" />
                          <Input
                            type="email"
                            {...field}
                            value={field.value ?? ''}
                            className="pl-10 h-11 bg-white/50 dark:bg-card/50 border-slate-200 dark:border-white/10 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-pink-500 dark:focus-visible:border-pink-500 rounded-xl transition-all"
                            placeholder={t('userDetailManagement.enterEmail')}
                          />
                        </div>
                      </FormControl>
                      <FormMessage className="text-destructive text-xs" />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="linkedinUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        {t('userDetailManagement.linkedinUrl')}
                      </FormLabel>
                      <FormControl>
                        <div className="relative group">
                          <Linkedin className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors size-4" />
                          <Input
                            type="url"
                            {...field}
                            value={field.value ?? ''}
                            className="pl-10 h-11 bg-white/50 dark:bg-card/50 border-slate-200 dark:border-white/10 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-pink-500 dark:focus-visible:border-pink-500 rounded-xl transition-all"
                            placeholder={t('userDetailManagement.enterLinkedinUrl')}
                          />
                        </div>
                      </FormControl>
                      <FormMessage className="text-destructive text-xs" />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {t('userDetailManagement.description')}
                    </FormLabel>
                    <FormControl>
                      <div className="relative group">
                        <FileText className="absolute left-3 top-3 text-muted-foreground group-focus-within:text-primary transition-colors size-4" />
                        <Textarea
                          {...field}
                          value={field.value ?? ''}
                          placeholder={t('userDetailManagement.enterDescription')}
                          rows={4}
                          className="pl-10 bg-white/50 dark:bg-card/50 border-slate-200 dark:border-white/10 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-pink-500 dark:focus-visible:border-pink-500 rounded-xl min-h-[120px] resize-none transition-all"
                        />
                      </div>
                    </FormControl>
                    <FormMessage className="text-destructive text-xs" />
                  </FormItem>
                )}
              />
              <div className="flex justify-end pt-2">
                <Button type="submit" disabled={isSaving || !isFormValid} className="min-w-[140px]">
                  {isSaving ? (
                    <>
                      <Loader2 size={18} className="animate-spin mr-2" />
                      {t('userDetailManagement.saving')}
                    </>
                  ) : (
                    <>
                      <Save size={18} className="mr-2" />
                      {t('userDetailManagement.save')}
                    </>
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      <Card className="bg-white/70 dark:bg-[#1a1025]/60 backdrop-blur-xl border-white/60 dark:border-white/5 shadow-sm rounded-2xl transition-all duration-300">
        <CardHeader>
          <CardTitle className="text-xl flex items-center gap-2">
            <Shield size={20} className="text-muted-foreground" />
            {t('userDetailManagement.security')}
          </CardTitle>
          <CardDescription>
            {t('userDetailManagement.securityDescription')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="change-password" className="border-none">
              <AccordionTrigger className="py-4 px-0 hover:no-underline [&[data-state=open]>div]:text-primary">
                <div className="flex items-center gap-3 font-medium">
                  <div className="p-2 rounded-lg bg-muted">
                    <Lock size={18} className="text-muted-foreground" />
                  </div>
                  {t('userDetailManagement.changePassword')}
                </div>
              </AccordionTrigger>
              <AccordionContent className="pt-2 pb-0 px-0">
                <Form {...changePasswordForm}>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      changePasswordForm.handleSubmit(handleChangePasswordSubmit)(e);
                    }}
                    className="space-y-5"
                  >
                    <FormField
                      control={changePasswordForm.control}
                      name="currentPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('userDetailManagement.currentPassword')}</FormLabel>
                          <FormControl>
                            <div className="relative group">
                              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground size-4" />
                              <Input
                                {...field}
                                type={isCurrentPasswordVisible ? 'text' : 'password'}
                                className="pl-10 pr-10 h-11 bg-white/50 dark:bg-card/50 border-slate-200 dark:border-white/10 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-pink-500 dark:focus-visible:border-pink-500 rounded-xl transition-all"
                                placeholder="••••••••"
                              />
                              <button
                                type="button"
                                onClick={() => setIsCurrentPasswordVisible((v) => !v)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                              >
                                {isCurrentPasswordVisible ? <EyeOff size={18} /> : <Eye size={18} />}
                              </button>
                            </div>
                          </FormControl>
                          <FormMessage className="text-destructive text-xs" />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={changePasswordForm.control}
                      name="newPassword"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t('userDetailManagement.newPassword')}</FormLabel>
                          <FormControl>
                            <div className="relative group">
                              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground size-4" />
                              <Input
                                {...field}
                                type={isNewPasswordVisible ? 'text' : 'password'}
                                className="pl-10 pr-10 h-11 bg-white/50 dark:bg-card/50 border-slate-200 dark:border-white/10 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-pink-500 dark:focus-visible:border-pink-500 rounded-xl transition-all"
                                placeholder={t('userDetailManagement.newPasswordPlaceholder')}
                              />
                              <button
                                type="button"
                                onClick={() => setIsNewPasswordVisible((v) => !v)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                              >
                                {isNewPasswordVisible ? <EyeOff size={18} /> : <Eye size={18} />}
                              </button>
                            </div>
                          </FormControl>
                          <FormMessage className="text-destructive text-xs" />
                        </FormItem>
                      )}
                    />
                    <div className="flex justify-end">
                      <Button type="submit" disabled={isChangingPassword} variant="outline" className="rounded-xl">
                        {isChangingPassword ? (
                          <>
                            <Loader2 size={16} className="animate-spin mr-2" />
                            {t('userDetailManagement.changingPassword')}
                          </>
                        ) : (
                          <>
                            <Shield size={16} className="mr-2" />
                            {t('userDetailManagement.changePasswordButton')}
                          </>
                        )}
                      </Button>
                    </div>
                  </form>
                </Form>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>
    </div>
  );
}

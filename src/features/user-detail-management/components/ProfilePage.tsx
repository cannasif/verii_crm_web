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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetClose,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
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
import { useSalesmenOverviewQuery } from '@/features/salesman-360/hooks/useSalesmen360';
import { useSalesRepMatchList } from '@/features/sales-rep-match-management/hooks/useSalesRepMatchList';
import {
  User,
  Camera,
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
  Ruler,
  Weight,
  FileText,
  TrendingUp,
  Heart,
  UserMinus,
  Activity,
  Zap,
  BarChart3,
  DollarSign,
  MessageSquare,
  CheckCircle,
  Settings,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ElementType;
  description?: string;
  colorClass?: string;
  progress?: number;
}

function StatCard({ title, value, icon: Icon, description, colorClass, progress }: StatCardProps) {
  return (
    <div className="relative group overflow-hidden rounded-3xl border border-slate-200 dark:border-white/20 bg-white/60 dark:bg-[#1D1726] p-6 transition-all backdrop-blur-xl">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1">{title}</p>
          <h3 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">{value}</h3>
          {description && <p className="mt-1 text-xs text-muted-foreground dark:text-slate-400 font-bold">{description}</p>}
        </div>
        <div className={cn("p-3 rounded-2xl bg-white/50 dark:bg-black/40 shadow-sm transition-colors", colorClass)}>
          <Icon size={22} className="opacity-100" />
        </div>
      </div>
      {progress !== undefined && (
        <div className="mt-4 h-2.5 w-full rounded-full bg-slate-200 dark:bg-white/5 overflow-hidden border border-slate-300/30 dark:border-transparent">
          <div
            className={cn("h-full transition-all duration-1000 ease-out shadow-[0_0_12px_rgba(var(--progress-color),0.4)]",
              colorClass?.replace('text-emerald-600', 'bg-emerald-500')
                .replace('text-blue-200', 'bg-blue-600')
                .replace('text-pink-200', 'bg-rose-600')
                .replace('text-indigo-200 ', 'bg-indigo-600')
            )}
            style={{
              width: `${progress}%`,
              // @ts-ignore
              '--progress-color': colorClass?.includes('emerald') ? '16,185,129' : colorClass?.includes('blue') ? '37,99,235' : colorClass?.includes('indigo') ? '79,70,229' : '225,29,72'
            }}
          />
        </div>
      )}
    </div>
  );
}

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
  const { data: overview, isLoading: isLoadingOverview } = useSalesmenOverviewQuery(userId);
  const { data: matchData } = useSalesRepMatchList({
    pageSize: 1,
    filters: [{ column: 'userId', value: String(userId), operator: 'eq' }]
  });

  const erpMatch = matchData?.data?.[0];

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

  useEffect(() => {
    setPageTitle(t('userDetailManagement.profilePageTitle'));
    return () => setPageTitle(null);
  }, [t, setPageTitle]);

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
    }
  }, [userDetail, form]);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>): Promise<void> => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const result = await uploadProfilePicture.mutateAsync({ userId, file });
      await refetchUserDetail();
      if (result?.profilePictureUrl) {
        setPreviewUrl(getImageUrl(result.profilePictureUrl));
      }
    } catch (err) {
      console.error(err);
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
  };

  const isSaving = createUserDetail.isPending || updateUserDetail.isPending;
  const isChangingPassword = changePassword.isPending;
  const displayName = user?.name || user?.email || 'Kullanıcı';

  if (isLoadingDetail || isLoadingOverview) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-10 w-10 animate-spin text-primary opacity-20" />
      </div>
    );
  }

  const kpis = overview?.kpis;
  const revenueQuality = overview?.revenueQuality;

  return (
    <div className="w-full space-y-6 pb-20 px-4 sm:px-8">
      <div className="space-y-4">
        <Breadcrumb
          items={[
            { label: t('sidebar.home') },
            { label: t('userDetailManagement.profilePageTitle'), isActive: true },
          ]}
        />
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm font-bold text-muted-foreground hover:text-primary transition-all bg-white/80 dark:bg-white/5 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 shadow-sm w-fit"
        >
          <ArrowLeft size={16} />
          {t('userDetailManagement.backToHome')}
        </Link>
      </div>

      <section className="relative overflow-hidden rounded-3xl border border-slate-200 dark:border-white/5 bg-linear-to-br from-white/80 to-white/40 dark:from-white/10 dark:to-white/5 backdrop-blur-2xl p-8 shadow-xl shadow-slate-200/50 dark:shadow-none">
        <div className="absolute top-0 right-0 w-64 h-64 bg-pink-500/10 blur-3xl -mr-20 -mt-20 rounded-full" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-orange-500/10 blur-3xl -ml-20 -mb-20 rounded-full" />

        <div className="relative flex flex-col md:flex-row items-center md:items-start gap-8">
          <div className="relative shrink-0 group">
            <div className="w-32 h-32 sm:w-40 sm:h-40 rounded-3xl border-4 border-white/80 dark:border-white/10 bg-muted overflow-hidden shadow-2xl ring-4 ring-pink-500/20 group-hover:ring-pink-500/40 transition-all duration-500">
              {previewUrl ? (
                <img src={previewUrl} alt="" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-5xl font-black text-white bg-linear-to-br from-pink-600 via-pink-500 to-orange-500">
                  {displayName[0]?.toUpperCase() || 'U'}
                </div>
              )}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 backdrop-blur-sm cursor-pointer"
              >
                <Camera size={32} className="text-white transform scale-90 group-hover:scale-100 transition-transform" />
              </button>
            </div>
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} className="sr-only" />
          </div>

          <div className="flex-1 text-center md:text-left space-y-4">
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
              <div className="space-y-1">
                <div className="flex flex-col md:flex-row md:items-center gap-3">
                  <h1 className="text-3xl sm:text-4xl font-black tracking-tighter text-slate-800 dark:text-white">
                    {displayName}
                  </h1>
                  {erpMatch && (
                    <Badge variant="outline" className="w-fit mx-auto md:mx-0 border-pink-500/30 bg-pink-500/5 text-pink-600 dark:text-pink-400 font-bold px-3 py-1 rounded-lg">
                      #{erpMatch.salesRepCode}
                    </Badge>
                  )}
                </div>
                <p className="text-slate-500 dark:text-slate-400 font-medium flex flex-wrap items-center justify-center md:justify-start gap-x-4 gap-y-2">
                  <span className="flex items-center gap-1.5"><Mail size={16} className="opacity-60" /> {user?.email}</span>
                  <span className="hidden sm:inline opacity-20">|</span>
                  <span className="flex items-center gap-1.5"><Building2 size={16} className="opacity-60" /> {branch?.name || '-'}</span>
                  <span className="hidden sm:inline opacity-20">|</span>
                  <span className="flex items-center gap-1.5"><Briefcase size={16} className="opacity-60" /> {t('roles.admin')}</span>
                </p>
              </div>

              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="outline" className="rounded-2xl border-slate-300 dark:border-white/20 bg-white/40 dark:bg-white/5 backdrop-blur-sm hover:bg-white/60 dark:hover:bg-white/10 transition-all gap-2 font-bold shadow-sm px-6">
                    <Settings size={18} className="text-pink-500" />
                    Profil Ayarları
                  </Button>
                </SheetTrigger>
                <SheetContent showCloseButton={false} className="w-full sm:max-w-2xl overflow-y-auto border-l border-white/20 bg-white/90 dark:bg-[#1D1726]/95 backdrop-blur-3xl p-0">
                  <div className="p-8 space-y-8 relative">
                    <div className="absolute right-8 top-8 z-50">
                      <SheetClose asChild>
                        <Button variant="outline" size="icon" className="rounded-2xl border-2 border-slate-300 dark:border-white/30 bg-white/50 dark:bg-white/10 hover:bg-white/80 dark:hover:bg-white/20 transition-all text-muted-foreground hover:text-pink-500 shadow-md">
                          <X size={24} />
                        </Button>
                      </SheetClose>
                    </div>
                    <SheetHeader>
                      <SheetTitle className="text-3xl font-black tracking-tighter">Profil Ayarları</SheetTitle>
                      <SheetDescription className="text-base font-medium">Profil bilgilerinizi ve güvenlik ayarlarınızı buradan yönetebilirsiniz.</SheetDescription>
                    </SheetHeader>

                    <Tabs defaultValue="personal" className="w-full">
                      <TabsList className="w-full grid grid-cols-2 p-1 bg-slate-100 dark:bg-white/5 rounded-2xl h-14 mb-8">
                        <TabsTrigger value="personal" className="rounded-xl font-bold data-[state=active]:bg-white dark:data-[state=active]:bg-white/10 data-[state=active]:shadow-sm transition-all flex items-center gap-2">
                          <User size={16} />
                          {t('userDetailManagement.personalInfo')}
                        </TabsTrigger>
                        <TabsTrigger value="security" className="rounded-xl font-bold data-[state=active]:bg-white dark:data-[state=active]:bg-white/10 data-[state=active]:shadow-sm transition-all flex items-center gap-2">
                          <Lock size={16} />
                          {t('userDetailManagement.security')}
                        </TabsTrigger>
                      </TabsList>

                      <TabsContent value="personal" className="mt-0 space-y-6">
                        <div className="bg-white/60 dark:bg-white/5 backdrop-blur-xl rounded-3xl p-10 border border-slate-200 dark:border-white/10 shadow-sm">
                          <Form {...form}>
                            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                <FormField
                                  control={form.control}
                                  name="height"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
                                        {t('userDetailManagement.height')}
                                      </FormLabel>
                                      <FormControl>
                                        <div className="relative group">
                                          <Ruler className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-pink-500 transition-colors size-5" />
                                          <Input
                                            type="number"
                                            {...field}
                                            value={field.value ?? ''}
                                            onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                                            className="pl-12 h-14 text-base rounded-xl bg-white/50 dark:bg-card/50 border-slate-200 dark:border-white/10 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-pink-500 transition-all"
                                            placeholder="Örn: 175"
                                          />
                                        </div>
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                                <FormField
                                  control={form.control}
                                  name="weight"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
                                        {t('userDetailManagement.weight')}
                                      </FormLabel>
                                      <FormControl>
                                        <div className="relative group">
                                          <Weight className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-pink-500 transition-colors size-5" />
                                          <Input
                                            type="number"
                                            {...field}
                                            value={field.value ?? ''}
                                            onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                                            className="pl-12 h-14 text-base rounded-xl bg-white/50 dark:bg-card/50 border-slate-200 dark:border-white/10 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-pink-500 transition-all"
                                            placeholder="Örn: 70"
                                          />
                                        </div>
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                              </div>
                              <FormField
                                control={form.control}
                                name="gender"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
                                      {t('userDetailManagement.gender')}
                                    </FormLabel>
                                    <div className="relative group w-full">
                                      <User className="absolute left-4 top-1/2 -translate-y-1/2 z-10 text-muted-foreground group-focus-within:text-pink-500 transition-colors size-5" />
                                      <Select
                                        onValueChange={(value) => field.onChange(value && value !== 'none' ? (parseInt(value, 10) as Gender) : undefined)}
                                        value={field.value !== undefined ? String(field.value) : undefined}
                                      >
                                        <FormControl>
                                          <SelectTrigger className="w-full pl-12 h-14 min-h-[56px] py-0 text-base rounded-xl bg-white/50 dark:bg-card/50 border-slate-200 dark:border-white/10 focus:ring-0 focus:ring-offset-0 focus:border-pink-500 transition-all flex items-center">
                                            <SelectValue placeholder={t('userDetailManagement.selectGender')} />
                                          </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                          <SelectItem value="none">{t('userDetailManagement.noGenderSelected')}</SelectItem>
                                          {GENDER_OPTIONS.map((opt) => (
                                            <SelectItem key={opt.value} value={String(opt.value)}>{t(`userDetailManagement.gender${opt.label}`)}</SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                    </div>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />

                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                <FormField
                                  control={form.control}
                                  name="phoneNumber"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
                                        {t('userDetailManagement.phoneNumber')}
                                      </FormLabel>
                                      <FormControl>
                                        <div className="relative group">
                                          <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-pink-500 transition-colors size-5" />
                                          <Input
                                            type="text"
                                            {...field}
                                            value={field.value ?? ''}
                                            className="pl-12 h-14 text-base rounded-xl bg-white/50 dark:bg-card/50 border-slate-200 dark:border-white/10 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-pink-500 transition-all"
                                            placeholder={t('userDetailManagement.enterPhoneNumber')}
                                          />
                                        </div>
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
                                      <FormLabel className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
                                        {t('userDetailManagement.email')}
                                      </FormLabel>
                                      <FormControl>
                                        <div className="relative group">
                                          <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-pink-500 transition-colors size-5" />
                                          <Input
                                            type="email"
                                            {...field}
                                            value={field.value ?? ''}
                                            className="pl-12 h-14 text-base rounded-xl bg-white/50 dark:bg-card/50 border-slate-200 dark:border-white/10 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-pink-500 transition-all"
                                            placeholder={t('userDetailManagement.enterEmail')}
                                          />
                                        </div>
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                              </div>

                              <FormField
                                control={form.control}
                                name="linkedinUrl"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
                                      {t('userDetailManagement.linkedinUrl')}
                                    </FormLabel>
                                    <FormControl>
                                      <div className="relative group">
                                        <Linkedin className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-pink-500 transition-colors size-5" />
                                        <Input
                                          type="url"
                                          {...field}
                                          value={field.value ?? ''}
                                          className="pl-12 h-14 text-base rounded-xl bg-white/50 dark:bg-card/50 border-slate-200 dark:border-white/10 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-pink-500 transition-all"
                                          placeholder={t('userDetailManagement.enterLinkedinUrl')}
                                        />
                                      </div>
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />

                              <FormField
                                control={form.control}
                                name="description"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
                                      {t('userDetailManagement.description')}
                                    </FormLabel>
                                    <FormControl>
                                      <div className="relative group">
                                        <FileText className="absolute left-4 top-5 text-muted-foreground group-focus-within:text-pink-500 transition-colors size-5" />
                                        <Textarea
                                          {...field}
                                          value={field.value ?? ''}
                                          rows={4}
                                          className="pl-14 pt-5 text-base rounded-xl bg-white/50 dark:bg-card/50 border-slate-200 dark:border-white/10 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-pink-500 resize-none transition-all"
                                          placeholder={t('userDetailManagement.enterDescription')}
                                        />
                                      </div>
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <Button type="submit" disabled={isSaving} className="w-full px-10 rounded-2xl font-black bg-linear-to-r from-pink-600 to-orange-600 hover:opacity-90 transition-all h-14 shadow-lg shadow-pink-500/20 border-none text-white text-xl opacity-90 grayscale-[0] dark:opacity-100 dark:grayscale-0">
                                {isSaving ? <Loader2 className="animate-spin" /> : t('userDetailManagement.save')}
                              </Button>
                            </form>
                          </Form>
                        </div>
                      </TabsContent>

                      <TabsContent value="security" className="mt-0">
                        <div className="bg-white/60 dark:bg-white/5 backdrop-blur-xl rounded-3xl p-10 border border-slate-200 dark:border-white/10 shadow-sm">
                          <Form {...changePasswordForm}>
                            <form onSubmit={changePasswordForm.handleSubmit(handleChangePasswordSubmit)} className="space-y-6">
                              <FormField
                                control={changePasswordForm.control}
                                name="currentPassword"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                      {t('userDetailManagement.currentPassword')}
                                    </FormLabel>
                                    <FormControl>
                                      <div className="relative group">
                                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-orange-500 transition-colors size-5" />
                                        <Input
                                          type={isCurrentPasswordVisible ? 'text' : 'password'}
                                          {...field}
                                          className="pl-12 pr-12 h-14 text-base rounded-xl bg-white/50 dark:bg-card/50 border-slate-200 dark:border-white/10 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-orange-500 transition-all"
                                          placeholder="••••••••"
                                        />
                                        <button
                                          type="button"
                                          onClick={() => setIsCurrentPasswordVisible(!isCurrentPasswordVisible)}
                                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-orange-500 transition-colors"
                                        >
                                          {isCurrentPasswordVisible ? <EyeOff size={18} /> : <Eye size={18} />}
                                        </button>
                                      </div>
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={changePasswordForm.control}
                                name="newPassword"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                      {t('userDetailManagement.newPassword')}
                                    </FormLabel>
                                    <FormControl>
                                      <div className="relative group">
                                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-orange-500 transition-colors size-5" />
                                        <Input
                                          type={isNewPasswordVisible ? 'text' : 'password'}
                                          {...field}
                                          className="pl-12 pr-12 h-14 text-base rounded-xl bg-white/50 dark:bg-card/50 border-slate-200 dark:border-white/10 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-orange-500 transition-all"
                                          placeholder={t('userDetailManagement.newPasswordPlaceholder')}
                                        />
                                        <button
                                          type="button"
                                          onClick={() => setIsNewPasswordVisible(!isNewPasswordVisible)}
                                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-orange-500 transition-colors"
                                        >
                                          {isNewPasswordVisible ? <EyeOff size={18} /> : <Eye size={18} />}
                                        </button>
                                      </div>
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <Button type="submit" disabled={isChangingPassword} className="w-full rounded-2xl font-black bg-linear-to-r from-pink-600 to-orange-600 hover:opacity-90 transition-all h-14 shadow-lg shadow-pink-500/20 border-none text-white text-xl opacity-90 grayscale-[0] dark:opacity-100 dark:grayscale-0">
                                {isChangingPassword ? <Loader2 className="animate-spin" /> : t('userDetailManagement.changePasswordButton')}
                              </Button>
                            </form>
                          </Form>
                        </div>
                      </TabsContent>
                    </Tabs>
                  </div>
                </SheetContent>
              </Sheet>
            </div>

            <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 pt-1">
              {userDetail?.phoneNumber && (
                <div className="px-4 py-2 rounded-2xl bg-white/60 dark:bg-white/5 border border-white/60 dark:border-white/10 flex items-center gap-2 shadow-sm">
                  <Phone size={16} className="text-orange-500" />
                  <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{userDetail.phoneNumber}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <StatCard
          title="Sağlık Skoru"
          value={`${revenueQuality?.healthScore || 0}%`}
          icon={Heart}
          progress={revenueQuality?.healthScore || 0}
          colorClass="text-emerald-200 dark:text-emerald-100 bg-emerald-600 dark:bg-emerald-900"
          description="Genel Portföy Sağlığı"
        />
        <StatCard
          title="Elde Tutma"
          value={`${Math.round((revenueQuality?.retentionRate || 0) * 100)}%`}
          icon={TrendingUp}
          progress={Math.round((revenueQuality?.retentionRate || 0) * 100)}
          colorClass="text-blue-200 dark:text-blue-100 bg-blue-600 dark:bg-blue-900"
          description="Müşteri Elde Tutma Oranı"
        />
        <StatCard
          title="Kayıp Riski"
          value={`${revenueQuality?.churnRiskScore || 0}%`}
          icon={UserMinus}
          progress={revenueQuality?.churnRiskScore || 0}
          colorClass="text-rose-200 dark:text-rose-100 bg-rose-600 dark:bg-rose-900"
          description="Müşteri Kayıp Tahmini"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

        <Card className="rounded-3xl border-slate-200 dark:border-white/20 bg-white/40 dark:bg-[#1D1726] backdrop-blur-xl shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div className="space-y-1">
              <CardTitle className="text-lg font-black flex items-center gap-2">
                <BarChart3 size={20} className="text-pink-600" />
                Finans & Satış Vitrini
              </CardTitle>
              <CardDescription>Dönüşüm ve ciro istatistikleri</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-6 pt-2">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="flex items-center justify-between p-5 rounded-2xl bg-white/80 dark:bg-white/5 border border-slate-300 dark:border-white/10 shadow-md">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-pink-100 dark:bg-pink-500/10 text-pink-600">
                    <MessageSquare size={20} />
                  </div>
                  <div className="text-sm font-black text-muted-foreground uppercase tracking-tight">Talepler</div>
                </div>
                <div className="text-3xl font-black text-slate-900 dark:text-white">{kpis?.totalDemands || 0}</div>
              </div>

              <div className="flex items-center justify-between p-5 rounded-2xl bg-white/80 dark:bg-white/5 border border-slate-300 dark:border-white/10 shadow-md">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-blue-100 dark:bg-blue-500/10 text-blue-600">
                    <FileText size={20} />
                  </div>
                  <div className="text-sm font-black text-muted-foreground uppercase tracking-tight">Teklifler</div>
                </div>
                <div className="text-3xl font-black text-slate-900 dark:text-white">{kpis?.totalQuotations || 0}</div>
              </div>

              <div className="flex items-center justify-between p-5 rounded-2xl bg-white/80 dark:bg-white/5 border border-slate-300 dark:border-white/10 shadow-md">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-emerald-100 dark:bg-emerald-500/10 text-emerald-600">
                    <CheckCircle size={20} />
                  </div>
                  <div className="text-sm font-black text-muted-foreground uppercase tracking-tight">Siparişler</div>
                </div>
                <div className="text-3xl font-black text-slate-900 dark:text-white">{kpis?.totalOrders || 0}</div>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                <DollarSign size={12} className="text-pink-600" />
                Döviz Bazlı Cirolar
              </h4>
              <div className="space-y-3">
                {kpis?.totalsByCurrency?.map((cur) => (
                  <div key={cur.currency} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-black text-slate-800 dark:text-slate-200">{cur.currency}</span>
                      <span className="font-bold">{cur.orderAmount.toLocaleString()} / {cur.quotationAmount.toLocaleString()}</span>
                    </div>
                    <div className="h-2.5 w-full rounded-full bg-slate-200 dark:bg-white/5 overflow-hidden flex border border-slate-300/20 dark:border-transparent">
                      <div
                        className="h-full bg-linear-to-r from-rose-600 to-pink-500 rounded-full shadow-[0_0_10px_rgba(225,29,72,0.4)]"
                        style={{ width: `${Math.min(100, (cur.orderAmount / (cur.quotationAmount || 1)) * 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-slate-200 dark:border-white/20 bg-white/40 dark:bg-[#1D1726] backdrop-blur-xl shadow-lg">
          <CardHeader>
            <CardTitle className="text-lg font-black flex items-center gap-2">
              <Activity size={20} className="text-orange-500" />
              Saha & Aktivite Vitrini
            </CardTitle>
            <CardDescription className="text-xs">Gerçekleşen saha performans verileri</CardDescription>
          </CardHeader>
          <CardContent className="space-y-8 pt-4">
            <div className="flex items-center justify-center py-6">
              <div className="relative w-40 h-40 flex items-center justify-center">
                <div className="absolute inset-0 rounded-full border-8 border-slate-300/30 dark:border-white/5" />
                <div className="absolute inset-0 rounded-full border-8 border-orange-500 border-t-transparent -rotate-45 shadow-[0_0_15px_rgba(249,115,22,0.3)]" />
                <div className="text-center">
                  <div className="text-4xl font-black text-slate-800 dark:text-white">{kpis?.totalActivities || 0}</div>
                  <div className="text-xs font-black uppercase text-muted-foreground tracking-tighter">Toplam Aktivite</div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
              <div className="flex items-center justify-between p-4 rounded-2xl bg-orange-500/5 border border-orange-500/10 group hover:bg-orange-500/10 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-2xl bg-orange-500 text-white shadow-lg shadow-orange-500/20">
                    <Zap size={20} />
                  </div>
                  <div>
                    <div className="text-sm font-black text-slate-800 dark:text-white">Aksiyon Bekleyenler</div>
                    <div className="text-xs font-medium text-muted-foreground">Önerilen aksiyon sayısı</div>
                  </div>
                </div>
                <div className="text-3xl font-black text-orange-600">{overview?.recommendedActions?.length || 0}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

    </div>
  );
}

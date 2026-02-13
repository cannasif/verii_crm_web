import { type ReactElement, useEffect, useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
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
  X,
  Lock,
  Eye,
  EyeOff,
  Mail,
  LogOut,
  Loader2 // Yükleme ikonu eklendi
} from 'lucide-react';

interface UserDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function UserDetailDialog({
  open,
  onOpenChange,
}: UserDetailDialogProps): ReactElement {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const userId = user?.id || 0;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const { data: userDetail, isLoading: isLoadingDetail, refetch: refetchUserDetail } = useUserDetailByUserId(userId);
  const createUserDetail = useCreateUserDetail();
  const updateUserDetail = useUpdateUserDetail();
  const uploadProfilePicture = useUploadProfilePicture();
  const changePassword = useChangePassword();

  const [isCurrentPasswordVisible, setIsCurrentPasswordVisible] = useState(false);
  const [isNewPasswordVisible, setIsNewPasswordVisible] = useState(false);

  const changePasswordForm = useForm<ChangePasswordRequest>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
    },
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
    },
  });
  const isFormValid = form.formState.isValid;

  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.has('currentPassword') || url.searchParams.has('newPassword')) {
      url.searchParams.delete('currentPassword');
      url.searchParams.delete('newPassword');
      window.history.replaceState({}, '', url.pathname + url.search);
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
      });
      if (userDetail.profilePictureUrl) {
        setPreviewUrl(getImageUrl(userDetail.profilePictureUrl));
      } else {
        setPreviewUrl(null);
      }
    } else {
      form.reset({
        profilePictureUrl: '',
        height: undefined,
        weight: undefined,
        description: '',
        gender: undefined,
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
    } catch (error) {
      console.error('File upload error:', error);
      if (tempPreviewUrl) {
        setPreviewUrl(tempPreviewUrl);
      }
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
      });
    }
    onOpenChange(false);
  };

  const handleChangePasswordSubmit = async (data: ChangePasswordRequest): Promise<void> => {
    try {
      await changePassword.mutateAsync(data);
      changePasswordForm.reset();
      const url = new URL(window.location.href);
      if (url.searchParams.has('currentPassword') || url.searchParams.has('newPassword')) {
        url.searchParams.delete('currentPassword');
        url.searchParams.delete('newPassword');
        window.history.replaceState({}, '', url.pathname + url.search);
      }
    } catch (error) {
      console.error('Password change error:', error);
    }
  };

  if (isLoadingDetail) {
    return <></>;
  }

  const isSaving = createUserDetail.isPending || updateUserDetail.isPending;
  const isChangingPassword = changePassword.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="sm:max-w-[95vw] md:max-w-6xl lg:max-w-5xl w-full h-[90vh] md:h-[700px] p-0 overflow-hidden bg-white dark:bg-[#1a1025] border-none text-zinc-900 dark:text-slate-300 shadow-2xl rounded-2xl flex flex-col focus:outline-none [&>button]:hidden"
      >
        <DialogTitle className="sr-only">Kullanıcı Detayları</DialogTitle>

        {/* --- ÜST KAPATMA BUTONU --- */}
        <div className="absolute top-4 right-4 z-50">
            <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => onOpenChange(false)} 
                className="bg-zinc-100/50 hover:bg-zinc-200 dark:bg-white/10 dark:hover:bg-white/20 text-zinc-500 dark:text-white rounded-full h-8 w-8 backdrop-blur-sm transition-all"
            >
                <X size={16} />
            </Button>
        </div>

        <div className="flex flex-col md:flex-row h-full overflow-hidden">
          
          {/* --- SOL TARAFLAR (SIDEBAR) --- */}
          <div className="w-full md:w-80 bg-zinc-50/80 dark:bg-[#150a1f]/90 backdrop-blur-md border-b md:border-b-0 md:border-r border-zinc-100 dark:border-white/5 p-8 flex flex-col flex-shrink-0 gap-8 relative">
            
            {/* Profil Resmi ve İsim */}
            <div className="flex flex-col items-center md:items-start text-center md:text-left">
              <div className="relative group cursor-pointer mb-5" onClick={() => fileInputRef.current?.click()}>
                <div className="w-28 h-28 rounded-full border-[4px] border-white dark:border-[#2a1d35] bg-zinc-200 dark:bg-slate-800 overflow-hidden relative shadow-lg">
                    {previewUrl ? (
                      <img src={previewUrl} alt="Profile" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-4xl font-bold text-white bg-gradient-to-br from-pink-500 to-orange-500">
                         {user?.name?.[0]?.toUpperCase() || 'U'}
                      </div>
                    )}
                    {/* Hover Overlay */}
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300">
                      <Camera size={26} className="text-white drop-shadow-md" />
                    </div>
                </div>
              </div>
              
              <div className="w-full space-y-1">
                 <h2 className="text-2xl font-bold text-zinc-900 dark:text-white break-words tracking-tight">{user?.name || 'Kullanıcı'}</h2>
                 <div className="flex items-center justify-center md:justify-start gap-2">
                    <Mail size={14} className="text-zinc-400 dark:text-slate-500" />
                    <p className="text-sm text-zinc-500 dark:text-slate-400 font-medium break-all">{user?.email}</p>
                 </div>
              </div>
              
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
            </div>
            
            {/* Masaüstünde Alt "Vazgeç" Butonu */}
            <div className="mt-auto hidden md:block w-full">
                <Button 
                    variant="ghost" 
                    className="w-full text-zinc-500 hover:text-zinc-900 hover:bg-zinc-200/50 dark:text-slate-400 dark:hover:text-white dark:hover:bg-white/5 gap-2 justify-start h-12 rounded-xl transition-colors"
                    onClick={() => onOpenChange(false)}
                >
                    <LogOut size={18} />
                    {t('userDetailManagement.cancel')}
                </Button>
            </div>
          </div>

          {/* --- SAĞ TARAFLAR (İÇERİK ALANI) --- */}
          <div className="flex-1 overflow-y-auto p-5 md:p-10 bg-white dark:bg-[#1a1025] relative">
            
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-3 duration-500 max-w-2xl mx-auto pb-6 pt-2">
                
                {/* Başlık Alanı */}
                <div className="border-b border-zinc-100 dark:border-white/5 pb-6 pr-8">
                  <h3 className="text-2xl font-bold text-zinc-900 dark:text-white mb-2">Profil Düzenle</h3>
                  <p className="text-sm text-zinc-500 dark:text-slate-400 leading-relaxed">
                    Kişisel bilgilerinizi ve hesap ayarlarınızı buradan yönetebilirsiniz.
                  </p>
                </div>

                {/* --- PROFİL FORMU --- */}
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <FormField
                        control={form.control}
                        name="height"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs font-semibold text-zinc-500 dark:text-slate-400 ml-1 uppercase tracking-wide">
                                {t('userDetailManagement.height')}
                            </FormLabel>
                            <FormControl>
                              <div className="relative group">
                                {/* İkon Titreme Animasyonu (Mikro-Etkileşim) */}
                                <Ruler className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-slate-600 group-focus-within:text-pink-600 dark:group-focus-within:text-pink-500 group-focus-within:animate-[wiggle_0.3s_ease-in-out] transition-colors" size={18} />
                                {/* Pembe Border Geri Döndü */}
                                <Input
                                  type="number"
                                  step="0.01"
                                  {...field}
                                  onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                                  value={field.value || ''}
                                  className="pl-12 bg-zinc-50/50 dark:bg-[#150a1f] border-zinc-200 dark:border-white/10 text-zinc-900 dark:text-slate-200 focus:border-pink-500 dark:focus:border-pink-500 focus:ring-4 focus:ring-pink-500/10 rounded-xl h-12 shadow-sm transition-all"
                                  placeholder="Örn: 175"
                                />
                              </div>
                            </FormControl>
                            <FormMessage className="text-red-500 text-xs" />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="weight"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs font-semibold text-zinc-500 dark:text-slate-400 ml-1 uppercase tracking-wide">
                                {t('userDetailManagement.weight')}
                            </FormLabel>
                            <FormControl>
                                <div className="relative group">
                                    <Weight className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-slate-600 group-focus-within:text-pink-600 dark:group-focus-within:text-pink-500 group-focus-within:animate-[wiggle_0.3s_ease-in-out] transition-colors" size={18} />
                                    <Input
                                        type="number"
                                        step="0.01"
                                        {...field}
                                        onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                                        value={field.value || ''}
                                        className="pl-12 bg-zinc-50/50 dark:bg-[#150a1f] border-zinc-200 dark:border-white/10 text-zinc-900 dark:text-slate-200 focus:border-pink-500 dark:focus:border-pink-500 focus:ring-4 focus:ring-pink-500/10 rounded-xl h-12 shadow-sm transition-all"
                                        placeholder="Örn: 70.5"
                                    />
                                </div>
                            </FormControl>
                            <FormMessage className="text-red-500 text-xs" />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="gender"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs font-semibold text-zinc-500 dark:text-slate-400 ml-1 uppercase tracking-wide">
                              {t('userDetailManagement.gender')}
                          </FormLabel>
                          <div className="relative group">
                            <User className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-slate-600 z-10 group-focus-within:text-pink-600 dark:group-focus-within:text-pink-500 group-focus-within:animate-[wiggle_0.3s_ease-in-out] transition-colors" size={18} />
                            <Select
                                onValueChange={(value) => field.onChange(value && value !== 'none' ? parseInt(value) as Gender : undefined)}
                                value={field.value !== undefined && field.value !== null ? field.value.toString() : undefined}
                            >
                                <FormControl>
                                <SelectTrigger className="pl-12 bg-zinc-50/50 dark:bg-[#150a1f] border-zinc-200 dark:border-white/10 text-zinc-900 dark:text-slate-200 focus:border-pink-500 dark:focus:border-pink-500 focus:ring-4 focus:ring-pink-500/10 rounded-xl h-12 w-full shadow-sm transition-all">
                                    <SelectValue placeholder={t('userDetailManagement.selectGender')} />
                                </SelectTrigger>
                                </FormControl>
                                <SelectContent className="bg-white dark:bg-[#1e1235] border-zinc-100 dark:border-white/10 text-zinc-900 dark:text-slate-300 shadow-xl">
                                <SelectItem value="none" className="focus:bg-zinc-50 dark:focus:bg-white/5 cursor-pointer">
                                    {t('userDetailManagement.noGenderSelected')}
                                </SelectItem>
                                {GENDER_OPTIONS.map((option) => (
                                    <SelectItem key={option.value} value={option.value.toString()} className="focus:bg-zinc-50 dark:focus:bg-white/5 cursor-pointer">
                                    {t(`userDetailManagement.gender${option.label}`, option.label)}
                                    </SelectItem>
                                ))}
                                </SelectContent>
                            </Select>
                          </div>
                          <FormMessage className="text-red-500 text-xs" />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs font-semibold text-zinc-500 dark:text-slate-400 ml-1 uppercase tracking-wide">
                              {t('userDetailManagement.description')}
                          </FormLabel>
                          <FormControl>
                            <div className="relative group">
                                <FileText className="absolute left-4 top-4 text-zinc-400 dark:text-slate-600 group-focus-within:text-pink-600 dark:group-focus-within:text-pink-500 group-focus-within:animate-[wiggle_0.3s_ease-in-out] transition-colors" size={18} />
                                <Textarea
                                {...field}
                                value={field.value || ''}
                                placeholder={t('userDetailManagement.enterDescription')}
                                rows={4}
                                className="pl-12 bg-zinc-50/50 dark:bg-[#150a1f] border-zinc-200 dark:border-white/10 text-zinc-900 dark:text-slate-200 focus:border-pink-500 dark:focus:border-pink-500 focus:ring-4 focus:ring-pink-500/10 rounded-xl py-3.5 min-h-[120px] resize-none shadow-sm transition-all"
                                />
                            </div>
                          </FormControl>
                          <FormMessage className="text-red-500 text-xs" />
                        </FormItem>
                      )}
                    />

                    <div className="pt-2 flex justify-end">
                      <Button 
                        type="submit" 
                        disabled={isSaving || !isFormValid}
                        className="w-full md:w-auto bg-linear-to-r from-pink-600 to-orange-600 hover:from-pink-500 hover:to-orange-500 text-white font-medium px-8 py-3 h-12 rounded-xl shadow-lg shadow-pink-600/20 active:scale-95 transition-all duration-200"
                      >
                        {isSaving ? (
                             <div className="flex items-center gap-2">
                                 <Loader2 size={18} className="animate-spin" />
                                 {t('userDetailManagement.saving')}
                             </div>
                        ) : (
                            <div className="flex items-center justify-center gap-2">
                                <Save size={18} />
                                {t('userDetailManagement.save')}
                            </div>
                        )}
                      </Button>
                    </div>
                  </form>
                </Form>

                {/* --- ŞİFRE DEĞİŞTİR (Modern Accordion) --- */}
                <div className="pt-2">
                    <Accordion type="single" collapsible className="w-full border border-zinc-200 dark:border-white/5 bg-zinc-50/50 dark:bg-[#150a1f]/50 rounded-xl overflow-hidden shadow-sm hover:border-zinc-300 dark:hover:border-white/10 transition-colors group">
                    <AccordionItem value="change-password" className="border-none">
                        <AccordionTrigger className="px-6 py-4 hover:no-underline hover:bg-white dark:hover:bg-white/5 text-zinc-700 dark:text-slate-300 font-medium transition-all group">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-white dark:bg-white/5 rounded-lg border border-zinc-100 dark:border-white/5 group-hover:border-pink-200 dark:group-hover:border-pink-900 transition-colors">
                                <Shield size={18} className="text-zinc-400 dark:text-slate-500 group-hover:text-pink-600 dark:group-hover:text-pink-500 group-hover:animate-[wiggle_0.3s_ease-in-out] transition-colors" />
                            </div>
                            <span className="group-hover:text-zinc-900 dark:group-hover:text-white transition-colors">{t('userDetailManagement.changePassword')}</span>
                        </div>
                        </AccordionTrigger>
                        <AccordionContent className="px-6 py-6 bg-white dark:bg-[#1a1025] border-t border-zinc-100 dark:border-white/5">
                            <Form {...changePasswordForm}>
                                <form 
                                    onSubmit={(e) => {
                                    e.preventDefault();
                                    changePasswordForm.handleSubmit(handleChangePasswordSubmit)(e);
                                    }} 
                                    className="space-y-5"
                                >
                                    <div className="grid gap-5">
                                        <FormField
                                            control={changePasswordForm.control}
                                            name="currentPassword"
                                            render={({ field }) => (
                                                <FormItem>
                                                <FormLabel className="text-xs font-semibold text-zinc-500 dark:text-slate-400 ml-1">{t('userDetailManagement.currentPassword')}</FormLabel>
                                                <FormControl>
                                                    <div className="relative group focus-within:text-pink-600 dark:focus-within:text-pink-500">
                                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-slate-600 group-focus-within:animate-[wiggle_0.3s_ease-in-out] transition-colors" size={18} />
                                                    <Input
                                                        {...field}
                                                        type={isCurrentPasswordVisible ? 'text' : 'password'}
                                                        className="pl-12 pr-12 bg-zinc-50 dark:bg-[#150a1f] border-zinc-200 dark:border-white/10 text-zinc-900 dark:text-slate-200 focus:border-pink-500 dark:focus:border-pink-500 focus:ring-4 focus:ring-pink-500/10 rounded-xl h-11 transition-all"
                                                        placeholder="••••••••"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => setIsCurrentPasswordVisible((v) => !v)}
                                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:text-slate-500 dark:hover:text-white transition-colors"
                                                    >
                                                        {isCurrentPasswordVisible ? <EyeOff size={18} /> : <Eye size={18} />}
                                                    </button>
                                                    </div>
                                                </FormControl>
                                                </FormItem>
                                            )}
                                        />

                                        <FormField
                                            control={changePasswordForm.control}
                                            name="newPassword"
                                            render={({ field }) => (
                                                <FormItem>
                                                <FormLabel className="text-xs font-semibold text-zinc-500 dark:text-slate-400 ml-1">{t('userDetailManagement.newPassword')}</FormLabel>
                                                <FormControl>
                                                    <div className="relative group focus-within:text-pink-600 dark:focus-within:text-pink-500">
                                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-slate-600 group-focus-within:animate-[wiggle_0.3s_ease-in-out] transition-colors" size={18} />
                                                    <Input
                                                        {...field}
                                                        type={isNewPasswordVisible ? 'text' : 'password'}
                                                        className="pl-12 pr-12 bg-zinc-50 dark:bg-[#150a1f] border-zinc-200 dark:border-white/10 text-zinc-900 dark:text-slate-200 focus:border-pink-500 dark:focus:border-pink-500 focus:ring-4 focus:ring-pink-500/10 rounded-xl h-11 transition-all"
                                                        placeholder="Yeni şifreniz"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => setIsNewPasswordVisible((v) => !v)}
                                                        className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:text-slate-500 dark:hover:text-white transition-colors"
                                                    >
                                                        {isNewPasswordVisible ? <EyeOff size={18} /> : <Eye size={18} />}
                                                    </button>
                                                    </div>
                                                </FormControl>
                                                </FormItem>
                                            )}
                                        />
                                    </div>

                                    <div className="flex justify-end">
                                        <Button
                                        type="submit"
                                        disabled={isChangingPassword}
                                        variant="outline"
                                        className="border-zinc-200 dark:border-white/10 text-zinc-700 dark:text-slate-200 hover:bg-zinc-50 dark:hover:bg-white/5 rounded-xl transition-all h-11"
                                        >
                                        {isChangingPassword ? (
                                            <div className="flex items-center gap-2">
                                                 <Loader2 size={16} className="animate-spin" />
                                                 {t('userDetailManagement.changingPassword')}
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-2">
                                                <Shield size={16} />
                                                {t('userDetailManagement.changePasswordButton')}
                                            </div>
                                        )}
                                        </Button>
                                    </div>
                                </form>
                            </Form>
                        </AccordionContent>
                    </AccordionItem>
                    </Accordion>
                </div>
                
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

import { type ReactElement, type ReactNode, useEffect, useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
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
import { Textarea } from '@/components/ui/textarea';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Combobox } from '@/components/ui/combobox';
import { Checkbox } from '@/components/ui/checkbox';
import {
  activityFormSchema,
  ActivityPriority,
  ActivityStatus,
  ReminderChannel,
  type ActivityDto,
  type ActivityFormSchema,
} from '../types/activity-types';
import { ACTIVITY_STATUSES, ACTIVITY_PRIORITIES, REMINDER_MINUTE_PRESETS } from '../utils/activity-constants';
import { activityTypeApi } from '@/features/activity-type/api/activity-type-api';
import { useCustomerOptions } from '@/features/customer-management/hooks/useCustomerOptions';
import { useUserOptions } from '@/features/user-discount-limit-management/hooks/useUserOptions';
import { useQuery } from '@tanstack/react-query';
import { contactApi } from '@/features/contact-management/api/contact-api';
import type { PagedFilter } from '@/types/api';
import { CustomerSelectDialog, type CustomerSelectionResult } from '@/components/shared';
import { Search, Calendar, FileText, List, CheckSquare, Building2, User, AlertCircle, X, Bell, Plus, Trash2 } from 'lucide-react';

interface ActivityFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: ActivityFormSchema) => void | Promise<void>;
  activity?: ActivityDto | null;
  isLoading?: boolean;
  initialDate?: string | null;
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

function FormSection({ title, children, className = '' }: { title: string; children: ReactNode; className?: string }): ReactElement {
  return (
    <section className={className}>
      <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-4">{title}</h3>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function normalizeStatus(value: number | string | undefined): number {
  if (typeof value === 'number') return value;
  if (value === 'Completed') return ActivityStatus.Completed;
  if (value === 'Cancelled' || value === 'Canceled') return ActivityStatus.Cancelled;
  return ActivityStatus.Scheduled;
}

function normalizePriority(value: number | string | undefined): number {
  if (typeof value === 'number') return value;
  if (value === 'Low') return ActivityPriority.Low;
  if (value === 'High') return ActivityPriority.High;
  return ActivityPriority.Medium;
}

function toDateTimeInputValue(value?: string | null): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function toDefaultStartDateTime(initialDate?: string | null): string {
  if (initialDate && initialDate.length === 10) {
    return `${initialDate}T09:00`;
  }
  const now = new Date();
  now.setSeconds(0, 0);
  return toDateTimeInputValue(now.toISOString());
}

const REMINDER_CHANNEL_OPTIONS = [
  { value: String(ReminderChannel.InApp), label: 'In-App' },
  { value: String(ReminderChannel.Email), label: 'Email' },
  { value: String(ReminderChannel.Sms), label: 'SMS' },
  { value: String(ReminderChannel.Push), label: 'Push' },
] as const;

export function ActivityForm({
  open,
  onOpenChange,
  onSubmit,
  activity,
  isLoading = false,
  initialDate,
}: ActivityFormProps): ReactElement {
  const { t } = useTranslation();
  const { data: customerOptions = [] } = useCustomerOptions();
  const { data: userOptions = [] } = useUserOptions();
  const [customerSelectDialogOpen, setCustomerSelectDialogOpen] = useState(false);
  const [selectedCustomerDisplayName, setSelectedCustomerDisplayName] = useState<string | null>(null);

  const form = useForm<ActivityFormSchema>({
    resolver: zodResolver(activityFormSchema),
    mode: 'onChange',
    defaultValues: {
      subject: '',
      description: '',
      activityType: '',
      status: ActivityStatus.Scheduled,
      priority: ActivityPriority.Medium,
      startDateTime: toDefaultStartDateTime(initialDate),
      endDateTime: undefined,
      isAllDay: false,
      reminders: [],
    },
  });

  const { fields: reminderFields, append: appendReminder, remove: removeReminder } = useFieldArray({
    control: form.control,
    name: 'reminders',
  });

  const isFormValid = form.formState.isValid;
  const isSubmitting = isLoading;

  const watchedCustomerId = form.watch('potentialCustomerId');
  const watchedReminders = form.watch('reminders') || [];

  const { data: activityTypesResponse } = useQuery({
    queryKey: ['activityTypes'],
    queryFn: async () => {
      const response = await activityTypeApi.getList({ pageNumber: 1, pageSize: 1000, sortBy: 'Id', sortDirection: 'asc' });
      return response.data || [];
    },
    staleTime: 5 * 60 * 1000,
  });
  const activityTypes = activityTypesResponse || [];

  const { data: contactData } = useQuery({
    queryKey: ['contactOptions', watchedCustomerId],
    queryFn: async () => {
      const response = await contactApi.getList({
        pageNumber: 1,
        pageSize: 1000,
        sortBy: 'Id',
        sortDirection: 'asc',
        filters: watchedCustomerId ? [{ column: 'CustomerId', operator: 'eq', value: watchedCustomerId.toString() }] as PagedFilter[] : undefined,
      });
      return response.data || [];
    },
    enabled: !!watchedCustomerId,
    staleTime: 5 * 60 * 1000,
  });
  const contactOptions = contactData || [];

  useEffect(() => {
    if (open && !activity && initialDate) {
      form.setValue('startDateTime', toDefaultStartDateTime(initialDate));
    }
  }, [open, initialDate, activity, form]);

  useEffect(() => {
    if (activity) {
      form.reset({
        subject: activity.subject,
        description: activity.description || '',
        activityType: activity.activityTypeId ? String(activity.activityTypeId) : '',
        potentialCustomerId: activity.potentialCustomerId || undefined,
        erpCustomerCode: activity.erpCustomerCode || '',
        status: normalizeStatus(activity.status),
        priority: normalizePriority(activity.priority),
        contactId: activity.contactId || undefined,
        assignedUserId: activity.assignedUserId || undefined,
        startDateTime: toDateTimeInputValue(activity.startDateTime) || toDefaultStartDateTime(),
        endDateTime: toDateTimeInputValue(activity.endDateTime),
        isAllDay: activity.isAllDay,
        reminders: (activity.reminders || []).map((reminder) => ({
          offsetMinutes: reminder.offsetMinutes,
          channel: reminder.channel,
        })),
      });
      setSelectedCustomerDisplayName(null);
      return;
    }

    form.reset({
      subject: '',
      description: '',
      activityType: '',
      potentialCustomerId: undefined,
      erpCustomerCode: '',
      status: ActivityStatus.Scheduled,
      priority: ActivityPriority.Medium,
      contactId: undefined,
      assignedUserId: undefined,
      startDateTime: toDefaultStartDateTime(initialDate),
      endDateTime: undefined,
      isAllDay: false,
      reminders: [],
    });
    setSelectedCustomerDisplayName(null);
  }, [activity, form, initialDate]);

  useEffect(() => {
    if (!watchedCustomerId) form.setValue('contactId', undefined);
  }, [watchedCustomerId, form]);

  const handleSubmit = async (data: ActivityFormSchema): Promise<void> => {
    await onSubmit(data);
    if (!isLoading) {
      form.reset();
      onOpenChange(false);
    }
  };

  const addPresetReminder = (offsetMinutes: number): void => {
    const exists = watchedReminders.some((reminder) => reminder.offsetMinutes === offsetMinutes);
    if (exists) return;
    appendReminder({ offsetMinutes, channel: ReminderChannel.InApp });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-white dark:bg-[#0f0a18] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white max-w-2xl w-[95vw] sm:w-full max-h-[90vh] flex flex-col p-0 overflow-hidden rounded-2xl shadow-xl">
        <DialogHeader className="px-6 py-4 border-b border-slate-100 dark:border-white/5 flex flex-row items-center justify-between shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-10 w-10 rounded-xl bg-linear-to-br from-pink-500 to-orange-500 flex items-center justify-center shrink-0">
              <Calendar size={20} className="text-white" />
            </div>
            <div className="min-w-0">
              <DialogTitle className="text-lg font-semibold text-slate-900 dark:text-white truncate">
                {activity ? t('activityManagement.edit', 'Aktivite Düzenle') : t('activityManagement.create', 'Yeni Aktivite')}
              </DialogTitle>
              <DialogDescription className="text-slate-500 dark:text-slate-400 text-sm truncate">
                {activity ? t('activityManagement.editDescription', 'Aktivite bilgilerini düzenleyin') : t('activityManagement.createDescription', 'Yeni aktivite bilgilerini girin')}
              </DialogDescription>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)} className="shrink-0 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-white" aria-label={t('common.close', 'Kapat')}>
            <X size={20} />
          </Button>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-5 min-h-0">
          <Form {...form}>
            <form id="activity-form" onSubmit={form.handleSubmit(handleSubmit)} className="space-y-8">
              <FormSection title={t('activityManagement.basicInfo', 'Temel bilgiler')}>
                <FormField control={form.control} name="subject" render={({ field }) => (
                  <FormItem>
                    <FormLabel className={LABEL_STYLE}><FileText size={16} className="text-pink-500 shrink-0" /> {t('activityManagement.subject', 'Konu')} <span className="text-red-500">*</span></FormLabel>
                    <FormControl><Input {...field} className={INPUT_STYLE} placeholder={t('activityManagement.enterSubject', 'Örn: Proje Toplantısı')} /></FormControl>
                    <FormMessage className="text-xs text-red-500" />
                  </FormItem>
                )} />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField control={form.control} name="activityType" render={({ field }) => (
                    <FormItem>
                      <FormLabel className={LABEL_STYLE}><List size={16} className="text-pink-500 shrink-0" /> {t('activityManagement.activityType', 'Tip')} <span className="text-red-500">*</span></FormLabel>
                      <FormControl>
                        <Combobox
                          options={activityTypes.map((type) => ({ value: String(type.id), label: type.name }))}
                          value={field.value ? String(field.value) : ''}
                          onValueChange={field.onChange}
                          placeholder={t('activityManagement.select', 'Seç')}
                          className={INPUT_STYLE}
                        />
                      </FormControl>
                      <FormMessage className="text-xs text-red-500" />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="status" render={({ field }) => (
                    <FormItem>
                      <FormLabel className={LABEL_STYLE}><CheckSquare size={16} className="text-pink-500 shrink-0" /> {t('activityManagement.status', 'Durum')} <span className="text-red-500">*</span></FormLabel>
                      <FormControl>
                        <Combobox
                          options={ACTIVITY_STATUSES.map((statusOption) => ({ value: String(statusOption.value), label: t(statusOption.labelKey, statusOption.label) }))}
                          value={String(field.value)}
                          onValueChange={(value) => field.onChange(Number(value))}
                          placeholder={t('activityManagement.select', 'Seç')}
                          className={INPUT_STYLE}
                        />
                      </FormControl>
                      <FormMessage className="text-xs text-red-500" />
                    </FormItem>
                  )} />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField control={form.control} name="startDateTime" render={({ field }) => (
                    <FormItem>
                      <FormLabel className={LABEL_STYLE}><Calendar size={16} className="text-pink-500 shrink-0" /> {t('activityManagement.activityDate', 'Başlangıç')} <span className="text-red-500">*</span></FormLabel>
                      <FormControl><Input {...field} type="datetime-local" className={INPUT_STYLE} value={field.value || ''} /></FormControl>
                      <FormMessage className="text-xs text-red-500" />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="endDateTime" render={({ field }) => (
                    <FormItem>
                      <FormLabel className={LABEL_STYLE}><Calendar size={16} className="text-pink-500 shrink-0" /> {t('activityManagement.endDate', 'Bitiş')}</FormLabel>
                      <FormControl><Input type="datetime-local" className={INPUT_STYLE} value={field.value || ''} onChange={(event) => field.onChange(event.target.value || undefined)} /></FormControl>
                      <FormMessage className="text-xs text-red-500" />
                    </FormItem>
                  )} />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField control={form.control} name="priority" render={({ field }) => (
                    <FormItem>
                      <FormLabel className={LABEL_STYLE}><AlertCircle size={16} className="text-pink-500 shrink-0" /> {t('activityManagement.priority', 'Öncelik')}</FormLabel>
                      <FormControl>
                        <Combobox
                          options={ACTIVITY_PRIORITIES.map((priorityOption) => ({ value: String(priorityOption.value), label: t(priorityOption.labelKey, priorityOption.label) }))}
                          value={String(field.value ?? ActivityPriority.Medium)}
                          onValueChange={(value) => field.onChange(Number(value))}
                          placeholder={t('activityManagement.select', 'Seç')}
                          className={INPUT_STYLE}
                        />
                      </FormControl>
                      <FormMessage className="text-xs text-red-500" />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="isAllDay" render={({ field }) => (
                    <FormItem>
                      <FormLabel className={LABEL_STYLE}><Calendar size={16} className="text-pink-500 shrink-0" /> {t('activityManagement.allDay', 'Tüm Gün')}</FormLabel>
                      <FormControl>
                        <div className="h-11 px-3 rounded-lg border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 flex items-center gap-3">
                          <Checkbox checked={!!field.value} onCheckedChange={(checked) => field.onChange(Boolean(checked))} />
                          <span className="text-sm text-slate-700 dark:text-slate-300">{t('activityManagement.allDay', 'Tüm Gün')}</span>
                        </div>
                      </FormControl>
                      <FormMessage className="text-xs text-red-500" />
                    </FormItem>
                  )} />
                </div>
              </FormSection>

              <FormSection title={t('activityManagement.relations', 'Müşteri & ilişkiler')}>
                <FormField
                  control={form.control}
                  name="potentialCustomerId"
                  render={({ field }) => {
                    const watchedErpCode = form.watch('erpCustomerCode');
                    const selectedCustomer = customerOptions.find((customer) => customer.id === field.value);
                    const displayValue = selectedCustomer
                      ? selectedCustomer.name || selectedCustomer.customerCode || String(field.value)
                      : watchedErpCode
                        ? selectedCustomerDisplayName
                          ? `${selectedCustomerDisplayName} (${t('activity-management:erpLabel', { code: watchedErpCode, defaultValue: `ERP: ${watchedErpCode}` })})`
                          : t('activity-management:erpLabel', { code: watchedErpCode, defaultValue: `ERP: ${watchedErpCode}` })
                        : '';

                    return (
                      <FormItem>
                        <FormLabel className={LABEL_STYLE}><Building2 size={16} className="text-pink-500 shrink-0" /> {t('activityManagement.customer', 'Müşteri')}</FormLabel>
                        <div className="flex w-full items-center gap-2">
                          <FormControl>
                            <Input
                              readOnly
                              value={displayValue}
                              placeholder={t('activityManagement.selectCustomer', 'Müşteri seçin')}
                              className={`${INPUT_STYLE} flex-1 cursor-pointer`}
                              onClick={() => setCustomerSelectDialogOpen(true)}
                            />
                          </FormControl>
                          <Button type="button" variant="outline" onClick={() => setCustomerSelectDialogOpen(true)} className="h-11 w-11 shrink-0 rounded-lg border-slate-200 dark:border-white/10" aria-label={t('activityManagement.selectCustomer', 'Müşteri seçin')}>
                            <Search size={18} />
                          </Button>
                          {(field.value != null || watchedErpCode) && (
                            <Button type="button" variant="ghost" size="icon" className="h-11 w-11 shrink-0 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20" onClick={(event) => { event.stopPropagation(); field.onChange(undefined); form.setValue('erpCustomerCode', ''); setSelectedCustomerDisplayName(null); }} aria-label={t('common.clear', 'Temizle')}>
                              <X size={18} />
                            </Button>
                          )}
                        </div>
                        <FormMessage className="text-xs text-red-500" />
                      </FormItem>
                    );
                  }}
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField control={form.control} name="contactId" render={({ field }) => (
                    <FormItem>
                      <FormLabel className={LABEL_STYLE}><User size={16} className="text-pink-500 shrink-0" /> {t('activityManagement.contactId', 'İletişim')}</FormLabel>
                      <FormControl>
                        <Combobox
                          options={[{ value: 'none', label: t('activityManagement.noContactSelected', 'Seçilmedi') }, ...contactOptions.map((contact) => ({ value: contact.id.toString(), label: contact.fullName }))]}
                          value={field.value && field.value !== 0 ? field.value.toString() : 'none'}
                          onValueChange={(value) => field.onChange(value && value !== 'none' ? Number(value) : undefined)}
                          placeholder={watchedCustomerId ? t('activityManagement.select', 'Seç') : t('activityManagement.selectCustomerFirst', 'Önce Müşteri')}
                          disabled={!watchedCustomerId}
                          className={INPUT_STYLE}
                        />
                      </FormControl>
                      <FormMessage className="text-xs text-red-500" />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="assignedUserId" render={({ field }) => (
                    <FormItem>
                      <FormLabel className={LABEL_STYLE}><User size={16} className="text-pink-500 shrink-0" /> {t('activityManagement.assignedUser', 'Atanan Kullanıcı')}</FormLabel>
                      <FormControl>
                        <Combobox
                          options={[{ value: 'none', label: t('activityManagement.noUserSelected', 'Seçilmedi') }, ...userOptions.map((userOption) => ({ value: userOption.id.toString(), label: userOption.fullName }))]}
                          value={field.value && field.value !== 0 ? field.value.toString() : 'none'}
                          onValueChange={(value) => field.onChange(value && value !== 'none' ? Number(value) : undefined)}
                          placeholder={t('activityManagement.select', 'Seç')}
                          className={INPUT_STYLE}
                        />
                      </FormControl>
                      <FormMessage className="text-xs text-red-500" />
                    </FormItem>
                  )} />
                </div>
              </FormSection>

              <FormSection title={t('activityManagement.details', 'Detay')}>
                <FormField control={form.control} name="description" render={({ field }) => (
                  <FormItem>
                    <FormLabel className={LABEL_STYLE}><FileText size={16} className="text-pink-500 shrink-0" /> {t('activityManagement.description', 'Açıklama')}</FormLabel>
                    <FormControl><Textarea {...field} className={`${INPUT_STYLE} min-h-[88px] py-3 resize-none`} placeholder={t('activityManagement.enterDescription', 'Aktivite detaylarını girin...')} /></FormControl>
                    <FormMessage className="text-xs text-red-500" />
                  </FormItem>
                )} />

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <FormLabel className={LABEL_STYLE}><Bell size={16} className="text-pink-500 shrink-0" /> {t('activityManagement.reminders', 'Hatırlatmalar')}</FormLabel>
                    <Button type="button" variant="outline" size="sm" onClick={() => appendReminder({ offsetMinutes: 15, channel: ReminderChannel.InApp })}>
                      <Plus size={14} className="mr-1" /> {t('common.add', 'Ekle')}
                    </Button>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {REMINDER_MINUTE_PRESETS.map((offset) => (
                      <Button key={offset} type="button" variant="ghost" size="sm" className="border border-slate-200 dark:border-white/10" onClick={() => addPresetReminder(offset)}>
                        {offset >= 1440 ? `${Math.floor(offset / 1440)} gün` : `${offset} dk`}
                      </Button>
                    ))}
                  </div>

                  {reminderFields.length === 0 && (
                    <div className="text-xs text-slate-500 dark:text-slate-400 rounded-lg border border-dashed border-slate-200 dark:border-white/10 p-3">
                      {t('activityManagement.noReminder', 'Hatırlatma eklenmedi')}
                    </div>
                  )}

                  <div className="space-y-2">
                    {reminderFields.map((field, index) => (
                      <div key={field.id} className="grid grid-cols-12 gap-2 items-center rounded-lg border border-slate-200 dark:border-white/10 p-2">
                        <div className="col-span-5">
                          <FormField
                            control={form.control}
                            name={`reminders.${index}.offsetMinutes`}
                            render={({ field: reminderOffsetField }) => (
                              <FormItem>
                                <FormControl>
                                  <Input
                                    type="number"
                                    min={0}
                                    max={525600}
                                    value={String(reminderOffsetField.value ?? 0)}
                                    onChange={(event) => reminderOffsetField.onChange(Number(event.target.value || 0))}
                                    className={INPUT_STYLE}
                                  />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                        </div>
                        <div className="col-span-5">
                          <FormField
                            control={form.control}
                            name={`reminders.${index}.channel`}
                            render={({ field: reminderChannelField }) => (
                              <FormItem>
                                <FormControl>
                                  <Combobox
                                    options={REMINDER_CHANNEL_OPTIONS.map((option) => ({
                                      value: option.value,
                                      label: t(`activityManagement.reminderChannel${option.label}`, option.label),
                                    }))}
                                    value={String(reminderChannelField.value ?? ReminderChannel.InApp)}
                                    onValueChange={(value) => reminderChannelField.onChange(Number(value))}
                                    placeholder={t('activityManagement.select', 'Seç')}
                                    className={INPUT_STYLE}
                                  />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                        </div>
                        <div className="col-span-2 flex justify-end">
                          <Button type="button" variant="ghost" size="icon" className="text-red-500" onClick={() => removeReminder(index)}>
                            <Trash2 size={16} />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </FormSection>

              <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-2 border-t border-slate-100 dark:border-white/5">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="h-11 px-5 rounded-lg font-medium">
                  {t('common.cancel', 'Vazgeç')}
                </Button>
                <Button type="submit" disabled={isSubmitting || !isFormValid} className="h-11 px-6 rounded-lg bg-linear-to-r from-pink-600 to-orange-600 hover:from-pink-700 hover:to-orange-700 text-white font-semibold shadow-md disabled:opacity-50 disabled:pointer-events-none">
                  {isSubmitting ? t('common.saving', 'Kaydediliyor...') : activity ? t('common.update', 'Güncelle') : t('common.save', 'Kaydet')}
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </DialogContent>

      <CustomerSelectDialog
        open={customerSelectDialogOpen}
        onOpenChange={setCustomerSelectDialogOpen}
        onSelect={(customer: CustomerSelectionResult) => {
          form.setValue('potentialCustomerId', customer.customerId ?? undefined);
          form.setValue('erpCustomerCode', customer.erpCustomerCode ?? '');
          setSelectedCustomerDisplayName(customer.customerName ?? null);
          setCustomerSelectDialogOpen(false);
        }}
      />
    </Dialog>
  );
}

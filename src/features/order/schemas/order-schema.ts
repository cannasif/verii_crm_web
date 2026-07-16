import { z } from 'zod';
import { OfferType } from '@/types/offer-type';

export const createOrderSchema = z.object({
  order: z.object({
    potentialCustomerId: z.number().nullable().optional(),
    erpCustomerCode: z.string().max(50, 'Müşteri kodu en fazla 50 karakter olabilir').nullable().optional(),
    deliveryDate: z.string().nullable().optional(),
    shippingAddressId: z.number().nullable().optional(),
    representativeId: z.number().nullable().optional(),
    activityId: z.number().nullable().optional(),
    projectCode: z.string().max(50, 'Proje kodu en fazla 50 karakter olabilir').nullable().optional(),
    ozelKod1: z.string({ message: 'Özel Kod 1 seçilmelidir' }).trim().min(1, 'Özel Kod 1 seçilmelidir').max(10, 'Özel Kod 1 en fazla 10 karakter olabilir'),
    ozelKod2: z.string({ message: 'Özel Kod 2 seçilmelidir' }).trim().min(1, 'Özel Kod 2 seçilmelidir').max(10, 'Özel Kod 2 en fazla 10 karakter olabilir'),
    status: z.number().nullable().optional(),
    description: z.string().max(500, 'Açıklama en fazla 500 karakter olabilir').nullable().optional(),
    paymentTypeId: z.number().nullable().optional(),
    paymentTermDays: z.number().int('Vade günü tam sayı olmalıdır').min(0, 'Vade günü 0’dan küçük olamaz').max(3650, 'Vade günü 3650’den büyük olamaz').nullable().optional(),
    documentSerialTypeId: z
      .number()
      .nullable()
      .refine((v) => v != null && v >= 1, { message: 'Sipariş seri no seçilmelidir' }),
    offerType: z.enum([OfferType.YURTICI, OfferType.YURTDISI], { error: 'offerType.requiredMessage' }),
    deliveryMethod: z.string().nullable().optional(),
    koliBaskiDefinitionId: z.number().nullable().optional(),
    offerDate: z.string().nullable().optional(),
    offerNo: z.string().max(50, 'Sipariş no en fazla 50 karakter olabilir').nullable().optional(),
    revisionNo: z.string().max(50, 'Revizyon no en fazla 50 karakter olabilir').nullable().optional(),
    revisionId: z.number().nullable().optional(),
    currency: z.string().min(1, 'Para birimi seçilmelidir'),
    generalDiscountRate: z
      .number()
      .min(0, 'İskonto oranı 0\'dan küçük olamaz')
      .max(100, 'İskonto oranı 100\'ü geçemez')
      .nullable()
      .optional(),
    generalDiscountAmount: z
      .number()
      .min(0, 'İskonto tutarı negatif olamaz')
      .nullable()
      .optional(),
  }),
}).superRefine((data, ctx) => {
  const o = data.order;
  const hasCustomer =
    (o.potentialCustomerId != null && o.potentialCustomerId > 0) ||
    (o.erpCustomerCode != null && String(o.erpCustomerCode).trim().length > 0);

  if (!hasCustomer) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Müşteri seçilmelidir',
      path: ['order', 'potentialCustomerId'],
    });
  }

  if (o.paymentTypeId == null || o.paymentTypeId === 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Ödeme tipi seçilmelidir',
      path: ['order', 'paymentTypeId'],
    });
  }

  if (!o.deliveryDate || String(o.deliveryDate).trim().length === 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Teslimat tarihi seçilmelidir',
      path: ['order', 'deliveryDate'],
    });
  }
});

export type CreateOrderSchema = z.infer<typeof createOrderSchema>;

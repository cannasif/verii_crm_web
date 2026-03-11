import { z } from 'zod';
import { OfferType } from '@/types/offer-type';

export const createDemandSchema = z.object({
  demand: z.object({
    potentialCustomerId: z.number().nullable().optional(),
    erpCustomerCode: z.string().max(50, 'Müşteri kodu en fazla 50 karakter olabilir').nullable().optional(),
    deliveryDate: z.string().nullable().optional(),
    shippingAddressId: z.number().nullable().optional(),
    representativeId: z.number().nullable().optional(),
    projectCode: z.string().max(50, 'Proje kodu en fazla 50 karakter olabilir').nullable().optional(),
    status: z.number().nullable().optional(),
    description: z.string().max(500, 'Açıklama en fazla 500 karakter olabilir').nullable().optional(),
    paymentTypeId: z.number().nullable().optional(),
    documentSerialTypeId: z
      .number()
      .nullable()
      .refine((v) => v != null && v >= 1, { message: 'Talep seri no seçilmelidir' }),
    offerType: z.enum([OfferType.YURTICI, OfferType.YURTDISI], { error: 'Teklif tipi seçilmelidir' }),
    deliveryMethod: z.string().nullable().optional(),
    offerDate: z.string().nullable().optional(),
    offerNo: z.string().max(50, 'Teklif no en fazla 50 karakter olabilir').nullable().optional(),
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
  const d = data.demand;
  const hasCustomer =
    (d.potentialCustomerId != null && d.potentialCustomerId > 0) ||
    (d.erpCustomerCode != null && String(d.erpCustomerCode).trim().length > 0);

  if (!hasCustomer) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Müşteri seçilmelidir',
      path: ['demand', 'potentialCustomerId'],
    });
  }

  if (d.paymentTypeId == null || d.paymentTypeId === 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Ödeme tipi seçilmelidir',
      path: ['demand', 'paymentTypeId'],
    });
  }

  if (!d.deliveryDate || String(d.deliveryDate).trim().length === 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Teslimat tarihi seçilmelidir',
      path: ['demand', 'deliveryDate'],
    });
  }
});

export type CreateDemandSchema = z.infer<typeof createDemandSchema>;

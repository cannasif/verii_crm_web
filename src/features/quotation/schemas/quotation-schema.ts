import { z } from 'zod';

export const createQuotationSchema = z.object({
  quotation: z.object({
    potentialCustomerId: z.number().nullable().optional(),
    erpCustomerCode: z.string().max(50, 'Müşteri kodu en fazla 50 karakter olabilir').nullable().optional(),
    deliveryDate: z.string().min(1, 'Teslimat tarihi seçilmelidir'),
    shippingAddressId: z.number().nullable().optional(),
    representativeId: z.number().nullable().optional(),
    projectCode: z.string().max(50, 'Proje kodu en fazla 50 karakter olabilir').nullable().optional(),
    status: z.number().nullable().optional(),
    description: z.string().max(500, 'Açıklama en fazla 500 karakter olabilir').nullable().optional(),
    paymentTypeId: z.number().min(1, 'Ödeme planı seçilmelidir'),
    documentSerialTypeId: z
      .number()
      .nullable()
      .refine((v) => v != null && v >= 1, { message: 'Teklif seri no seçilmelidir' }),
    offerType: z.string({
      message: 'Teklif tipi seçilmelidir',
    }),
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
});

export type CreateQuotationSchema = z.infer<typeof createQuotationSchema>;

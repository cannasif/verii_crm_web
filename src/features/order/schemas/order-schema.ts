import { z } from 'zod';

export const createOrderSchema = z.object({
  order: z.object({
    potentialCustomerId: z.number().nullable().optional(),
    erpCustomerCode: z.string().max(50, 'Müşteri kodu en fazla 50 karakter olabilir').nullable().optional(),
    deliveryDate: z.string().nullable().optional(),
    shippingAddressId: z.number().nullable().optional(),
    representativeId: z.number().nullable().optional(),
    status: z.number().nullable().optional(),
    description: z.string().max(500, 'Açıklama en fazla 500 karakter olabilir').nullable().optional(),
    paymentTypeId: z.number().nullable().optional(),
    documentSerialTypeId: z
      .number()
      .nullable()
      .refine((v) => v != null && v >= 1, { message: 'Sipariş seri no seçilmelidir' }),
    offerType: z.string({
      message: 'Sipariş tipi seçilmelidir',
    }),
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
});

export type CreateOrderSchema = z.infer<typeof createOrderSchema>;

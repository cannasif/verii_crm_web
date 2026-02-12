import { type ReactElement, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { type Resolver, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage
} from '@/components/ui/form';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import { 
  Package, 
  Calculator, 
  Trash2, 
  Layers, 
  Banknote, 
  Tag, 
  Coins, 
  Percent,
  Save
} from 'lucide-react';

// Kendi oluşturduğumuz types dosyasından importlar
import { 
  productPricingFormSchema, 
  type ProductPricingFormSchema, 
  type ProductPricingGetDto,
  CURRENCIES,
  calculateFinalPrice, 
  calculateProfitMargin, 
  formatPrice 
} from '../types/product-pricing-types';
import { isZodFieldRequired } from '@/lib/zod-required';

import { ProductPricingStockSelectDialog } from './ProductPricingStockSelectDialog';

interface ProductPricingFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: ProductPricingFormSchema) => void | Promise<void>;
  onDelete?: (id: number) => void;
  productPricing?: ProductPricingGetDto | null;
  isLoading?: boolean;
  excludeProductCodes?: string[];
}

// STİL: Standart yükseklik ve kenarlıklar
const BASE_INPUT = "h-10 rounded-lg bg-slate-50 dark:bg-[#0c0516] border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white text-sm placeholder:text-slate-400 dark:placeholder:text-slate-600 focus-visible:ring-0 focus:border-pink-500 transition-all";
const INPUT_STYLE = `${BASE_INPUT} w-full`;
const LABEL_STYLE = "text-[11px] text-slate-500 dark:text-slate-400 uppercase tracking-wider font-bold ml-1 mb-1.5 flex items-center gap-1.5";

export function ProductPricingForm({
  open,
  onOpenChange,
  onSubmit,
  onDelete,
  productPricing,
  isLoading,
  excludeProductCodes,
}: ProductPricingFormProps): ReactElement {
  const { i18n } = useTranslation();
  const [productDialogOpen, setProductDialogOpen] = useState(false);

  const form = useForm<ProductPricingFormSchema>({
    resolver: zodResolver(productPricingFormSchema) as Resolver<ProductPricingFormSchema>,
    defaultValues: {
      erpProductCode: '', erpGroupCode: '', currency: 'TRY',
      listPrice: 0, costPrice: 0,
      discount1: 0, discount2: 0, discount3: 0
    }
  });

  // Düzenleme modunda verileri doldur
  useEffect(() => {
    if (productPricing) {
      form.reset({
        erpProductCode: productPricing.erpProductCode,
        erpGroupCode: productPricing.erpGroupCode || '',
        currency: productPricing.currency,
        listPrice: productPricing.listPrice,
        costPrice: productPricing.costPrice,
        discount1: productPricing.discount1 || 0,
        discount2: productPricing.discount2 || 0,
        discount3: productPricing.discount3 || 0,
      });
    } else {
      form.reset({ 
        erpProductCode: '', erpGroupCode: '', currency: 'TRY', 
        listPrice: 0, costPrice: 0, discount1: 0, discount2: 0, discount3: 0 
      });
    }
  }, [productPricing, form, open]);

  // Anlık Hesaplama
  const values = form.watch();
  const calculations = useMemo(() => {
    const final = calculateFinalPrice(values.listPrice, values.discount1, values.discount2, values.discount3);
    const profit = calculateProfitMargin(final, values.costPrice);
    return { final, profit };
  }, [values.listPrice, values.costPrice, values.discount1, values.discount2, values.discount3]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-white dark:bg-[#130822] border border-slate-100 dark:border-white/10 text-slate-900 dark:text-white max-w-4xl max-h-[95vh] h-full flex flex-col gap-0 p-0 overflow-hidden sm:rounded-2xl">
        <DialogHeader className="border-b border-slate-100 dark:border-white/5 px-6 py-5 bg-white/80 dark:bg-[#130822]/90 backdrop-blur-md shrink-0 flex-row items-center gap-3 space-y-0">
          <div className="h-10 w-10 rounded-xl bg-linear-to-br from-pink-500/20 to-orange-500/20 border border-pink-500/10 flex items-center justify-center text-pink-500 shrink-0">
            <Tag size={20} />
          </div>
          <div>
            <DialogTitle className="text-lg font-bold">{productPricing ? 'Fiyatlandırma Düzenle' : 'Yeni Fiyatlandırma'}</DialogTitle>
            <DialogDescription className="text-xs mt-0.5">Ürün fiyat ve maliyet bilgilerini giriniz.</DialogDescription>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* SOL KOLON: Ürün Bilgileri */}
                <div className="space-y-5">
                  <FormField control={form.control} name="erpProductCode" render={({ field }) => (
                    <FormItem className="space-y-0">
                      <FormLabel className={LABEL_STYLE} required={isZodFieldRequired(productPricingFormSchema, 'erpProductCode')}>
                        <Package size={12} className="text-pink-500" /> Stok Kodu
                      </FormLabel>
                      <div className="flex gap-2">
                        <FormControl>
                          <Input {...field} readOnly placeholder="Ürün seçiniz" className={INPUT_STYLE} />
                        </FormControl>
                        <Button 
                          type="button" 
                          variant="outline" 
                          onClick={() => setProductDialogOpen(true)}
                          className="h-10 shrink-0 border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/5 px-4"
                        >
                          <Package size={16} className="mr-2" /> Seç
                        </Button>
                      </div>
                      <FormMessage className="text-red-500 text-[10px]" />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="erpGroupCode" render={({ field }) => (
                    <FormItem className="space-y-0">
                      <FormLabel className={LABEL_STYLE}>
                        <Layers size={12} className="text-pink-500" /> Grup Kodu
                      </FormLabel>
                      <FormControl>
                        <Input {...field} readOnly className={`${INPUT_STYLE} bg-slate-100 dark:bg-slate-800/50`} />
                      </FormControl>
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="currency" render={({ field }) => (
                    <FormItem className="space-y-0">
                      <FormLabel className={LABEL_STYLE} required={isZodFieldRequired(productPricingFormSchema, 'currency')}>
                        <Banknote size={12} className="text-pink-500" /> Para Birimi
                      </FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className={INPUT_STYLE}>
                            <SelectValue placeholder="Seçiniz" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {CURRENCIES.map(c => (
                            <SelectItem key={c.value} value={c.value}>{c.value} - {c.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage className="text-red-500 text-[10px]" />
                    </FormItem>
                  )} />
                  
                  {/* HESAPLAMA ÖZETİ KARTI */}
                  <div className="rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-[#0c0516] p-4 transition-colors space-y-3 mt-4">
                    <div className="flex items-center gap-2 text-sm font-semibold text-pink-600 border-b border-slate-200 dark:border-white/10 pb-2 mb-2">
                      <Calculator size={16} /> Hesaplama Özeti
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-500 dark:text-slate-400">Son Fiyat:</span>
                        <span className="font-bold text-slate-900 dark:text-white">{formatPrice(calculations.final, values.currency, i18n.language)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-500 dark:text-slate-400">Kar Tutarı:</span>
                        <span className={calculations.profit.amount >= 0 ? "text-green-600 font-medium" : "text-red-600 font-medium"}>
                          {formatPrice(calculations.profit.amount, values.currency, i18n.language)}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-500 dark:text-slate-400">Kar Marjı:</span>
                        <span className={calculations.profit.percentage >= 0 ? "text-green-600 font-medium" : "text-red-600 font-medium"}>
                          %{calculations.profit.percentage.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* SAĞ KOLON: Fiyatlar */}
                <div className="space-y-5">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField control={form.control} name="listPrice" render={({ field }) => (
                      <FormItem className="space-y-0">
                        <FormLabel className={LABEL_STYLE} required={isZodFieldRequired(productPricingFormSchema, 'listPrice')}>
                          <Tag size={12} className="text-pink-500" /> Liste Fiyatı
                        </FormLabel>
                        <FormControl>
                          <Input type="number" {...field} className={INPUT_STYLE} />
                        </FormControl>
                        <FormMessage className="text-red-500 text-[10px]" />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="costPrice" render={({ field }) => (
                      <FormItem className="space-y-0">
                        <FormLabel className={LABEL_STYLE} required={isZodFieldRequired(productPricingFormSchema, 'costPrice')}>
                          <Coins size={12} className="text-pink-500" /> Maliyet
                        </FormLabel>
                        <FormControl>
                          <Input type="number" {...field} className={INPUT_STYLE} />
                        </FormControl>
                        <FormMessage className="text-red-500 text-[10px]" />
                      </FormItem>
                    )} />
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <FormField control={form.control} name="discount1" render={({ field }) => (
                      <FormItem className="space-y-0">
                        <FormLabel className={LABEL_STYLE}>
                          <Percent size={12} className="text-pink-500" /> İsk. 1 (%)
                        </FormLabel>
                        <FormControl><Input type="number" {...field} className={INPUT_STYLE} /></FormControl>
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="discount2" render={({ field }) => (
                      <FormItem className="space-y-0">
                        <FormLabel className={LABEL_STYLE}>
                          <Percent size={12} className="text-pink-500" /> İsk. 2 (%)
                        </FormLabel>
                        <FormControl><Input type="number" {...field} className={INPUT_STYLE} /></FormControl>
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="discount3" render={({ field }) => (
                      <FormItem className="space-y-0">
                        <FormLabel className={LABEL_STYLE}>
                          <Percent size={12} className="text-pink-500" /> İsk. 3 (%)
                        </FormLabel>
                        <FormControl><Input type="number" {...field} className={INPUT_STYLE} /></FormControl>
                      </FormItem>
                    )} />
                  </div>
                </div>
              </div>
            </form>
          </Form>
        </div>

        <DialogFooter className="border-t border-slate-100 dark:border-white/5 px-6 py-5 bg-white/80 dark:bg-[#130822]/90 backdrop-blur-md shrink-0 flex items-center justify-between w-full">
          {productPricing && onDelete ? (
            <Button 
              type="button" 
              variant="destructive" 
              onClick={() => onDelete(productPricing.id)}
              disabled={isLoading}
              className="bg-red-500/10 text-red-500 hover:bg-red-500/20 border-0"
            >
              <Trash2 size={16} className="mr-2" /> Sil
            </Button>
          ) : <div />}
          
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
              İptal
            </Button>
            <Button onClick={form.handleSubmit(onSubmit)} disabled={isLoading} className="bg-linear-to-r from-pink-600 to-indigo-600 text-white border-0 hover:from-pink-700 hover:to-indigo-700">
              <Save size={16} className="mr-2" />
              {isLoading ? 'Kaydediliyor...' : 'Kaydet'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>

      <ProductPricingStockSelectDialog
        open={productDialogOpen}
        onOpenChange={setProductDialogOpen}
        onSelect={(result) => {
          form.setValue('erpProductCode', result.code);
          form.setValue('erpGroupCode', result.groupCode ?? '');
          setProductDialogOpen(false);
        }}
        excludeProductCodes={excludeProductCodes}
      />
    </Dialog>
  );
}

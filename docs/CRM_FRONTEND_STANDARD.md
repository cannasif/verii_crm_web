# Verii CRM Frontend Standard

Bu belge `verii_crm_web` icin referans frontend standardidir. CRM web olgunlastikca diger Verii web projeleri ayni kaliba yaklastirilir.

## Hedef

CRM web uygulamasi feature-first React + Vite uygulamasidir:

- `src/features/<feature>` is akisi ve domain'e yakin kodu tasir.
- `src/components/ui` temel UI primitive'lerini tasir.
- `src/components/shared` domainler arasi tekrar kullanilan uygulama komponentlerini tasir.
- `src/lib` sadece gercekten genel yardimci ve altyapi kodunu tasir.
- Domain'e ozel helper `src/lib` yerine ilgili feature altina konur.

## Feature Klasor Standardi

Yeni veya buyuyen feature icin varsayilan yapi:

```text
src/features/<feature>/
  api/
    <feature>-api.ts
  components/
    <Feature>Page.tsx
  hooks/
    use<Feature>Query.ts
    use<Feature>Mutation.ts
  types/
    <feature>.types.ts
  utils/
    <feature>-helpers.ts
  index.ts
```

Kucuk feature'larda bos klasor acmak gerekmez; ama dosya buyudugunde bu sinirlara tasinir.

## API ve Data Fetching

- Tum HTTP cagri kodu feature `api/` dosyasinda veya ortak `src/services` katmaninda olur.
- Axios instance sadece `src/lib/axios.ts` uzerinden kullanilir.
- API response unwrap ve hata mesaji standardi tek helper uzerinden ilerler.
- React Query key'leri feature `utils/query-keys.ts` veya feature API yaninda tanimlanir.
- Component icinde URL string'i, token okuma veya response shape duzeltme yazilmaz.

## Form, Validation ve Mutation

- Formlarda React Hook Form + Zod tercih edilir.
- Validation schema feature icinde tutulur.
- Mutation success/error toast mesajlari i18n key ile gelir.
- Save, delete, sync, refresh gibi komutlar optimistic veya invalidation davranisini acikca tanimlar.

## UI/UX Standardi

Liste sayfalari mevcut `PAGE_UI_UX_IMPLEMENTATION_GUIDE.md` standardini izler:

- `PageToolbar`
- 45 saniyelik refresh cooldown
- aktif filtre indikatoru
- `ColumnPreferencesPopover`
- user/page bazli localStorage kolon tercihi
- tablo state'inde arama, filtre, siralama ve paging ayrimi

## Localization

- Yeni gorunen metinler i18n key ile yazilir.
- Feature metinleri feature namespace'inde tutulur.
- Ortak komponent metinleri shared namespace'e gider.
- Build oncesi i18n namespace kontrolu calisir.

## Route ve Export

- Her feature `index.ts` uzerinden public export verir.
- Route tanimlari feature component import eder; feature'in ic dosya detaylarini dagitmaz.
- Lazy import edilen agir vendor'lar `src/lib/lazy-vendors.ts` veya feature icinde kontrollu yuklenir.

## Kalite Kapisi

Frontend degisikligi icin varsayilan kontrol:

```bash
npm run quality
```

Bu komut sirasiyla:

- lint
- i18n namespace kontrolu
- TypeScript typecheck

Riskli UI degisikliginde ek olarak:

- `npm run build`
- kritik ekranlarda manuel veya Playwright smoke kontrolu
- responsive kontrol

## Oncelikli Tamamlama Listesi

1. `README.md` ve proje dokumantasyonunu CRM adiyla dogru hale getir.
2. `src/lib` icindeki domain'e ozel helper'lari ilgili feature altina kademeli tasi.
3. Feature API dosyalarinda response unwrap ve error handling'i tek helper'a indir.
4. Eski `_old` feature klasorlerini emekli et veya migration notu ile izole tut.
5. Tum liste sayfalarinin toolbar/filter/column pattern'ini ayni standarda cek.
6. `quality` komutunu lokal ve CI icin tek varsayilan kontrol yap.

## Kaynak Referanslari

- React official documentation
- Vite official guide
- TanStack Query documentation

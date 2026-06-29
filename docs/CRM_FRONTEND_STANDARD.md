# Verii Frontend Reference Standard

Bu belge `verii_crm_web` icin baglayici frontend standardidir. CRM'de oturan kurallar WMS, B2B, Aqua ve yeni Verii web projelerine de ayni yaklasimla tasinir.

Ust urun ailesi standardi CRM API dokumanlarindaki `docs/V3RII_PRODUCT_FAMILY_BASE_STANDARD.md` dosyasinda tutulur. Bu dosya o standardin web frontend uygulama kurallarini detaylandirir.

## Hedef

Frontend uygulamalari feature-first React + Vite yapisinda kalir:

- `src/features/<feature>` is akisi ve domain'e yakin kodu tasir.
- `src/components/ui` sadece temel UI primitive'lerini tasir.
- `src/components/shared` domainler arasi tekrar kullanilan uygulama komponentlerini tasir.
- `src/lib` sadece gercekten genel altyapi/helper kodunu tasir.
- `src/services` yalnizca birden fazla feature tarafindan paylasilan servisleri tasir.
- Domain'e ozel helper, api client, schema veya formatter `src/lib` yerine ilgili feature altinda tutulur.

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
  schemas/
    <feature>.schema.ts
  types/
    <feature>.types.ts
  utils/
    <feature>-helpers.ts
    <feature>-query-keys.ts
  index.ts
```

Kucuk feature'larda bos klasor acmak gerekmez. Dosya buyudugunde yukaridaki sinirlara tasinir.

## Katman Kurallari

- Page/component HTTP URL, token, response unwrap, retry veya paging normalizasyonu bilmez.
- Feature `api/` dosyasi endpoint path, request DTO ve response DTO sorumlulugunu tasir.
- Hook dosyasi React Query state'ini, query key'i ve invalidation davranisini tasir.
- Component sadece UI state, kullanici etkilesimi ve render kararini tasir.
- Form schema ve validation metinleri component icine gomulmez.
- Shared component domain terimi bilmez; domain terimi gerekiyorsa feature component olur.

## API ve Data Fetching

- Axios instance sadece `src/lib/axios.ts` icinde olusturulur ve kullanilir.
- Feature kodunda default `axios` import edilmez; hata tipi icin `isAxiosError` gibi named helper kullanilabilir.
- Tum HTTP cagri kodu feature `api/` dosyasinda veya gercekten ortak `src/services` katmaninda olur.
- API response unwrap ve hata mesaji standardi tek helper uzerinden ilerler.
- Component icinde endpoint string'i, token okuma veya response shape duzeltme yazilmaz.
- `fetch` sadece public asset/config dosyasi gibi uygulama API'si olmayan kaynaklarda kullanilir.
- Mutation sonrasi cache davranisi acik olmalidir: `invalidateQueries`, optimistic update veya explicit refetch.

## Query Key Standardi

- Query key'ler feature icinde tek kaynaktan uretilir.
- Liste query key'i paging, sort, search ve filter parametrelerini icerir.
- Search input state'i ile request parametresi ayridir; debounce uygulanir.
- Sayfa degisiminde `pageNumber`, `pageSize`, `sortBy`, `sortDirection`, `filters`, `search` parametreleri backend kontratiyla ayni isimlerde ilerler.
- Paged query response UI'da tek normalize modelle kullanilir: `items`, `totalCount`, `pageNumber`, `pageSize`.

## Paged Liste ve Search

Tum liste ekranlari ortak davranisa yaklasir:

- Default `pageSize=10`.
- Kullanici page size degistirirse yeni deger query parametresine gider.
- Search Turkce karakter, buyuk/kucuk harf ve noktalama toleransli backend standardina yaslanir.
- Frontend milyonluk data icin client-side filtreleme yapmaz.
- Liste ekraninda arama, filtre, siralama ve paging state'leri birbirinden ayridir.
- Search degisince page number 1'e doner.
- Refresh gercek query invalidation/refetch yapar ve spam'i engellemek icin cooldown kullanir.

## Form, Validation ve Mutation

- Formlarda React Hook Form + Zod tercih edilir.
- Validation schema feature icinde tutulur.
- Numeric alanlarda parse/format tek helper uzerinden yapilir; string input ile hesaplama modeli karistirilmaz.
- Save, delete, sync, approve, reject gibi komutlar pending/disabled state'e sahiptir.
- Basarili ve hatali toast mesajlari i18n key ile gelir.
- Backend'den gelen anlamli hata mesaji gizlenmez; teknik stack trace gosterilmez.

## UI/UX Standardi

Liste sayfalari `PAGE_UI_UX_IMPLEMENTATION_GUIDE.md` standardini izler:

- `PageToolbar`
- 45 saniyelik refresh cooldown veya ekran icin tanimli cooldown
- aktif filtre indikatoru
- `ColumnPreferencesPopover`
- user/page bazli localStorage kolon tercihi
- ayni tablo bos/yukleniyor/hata durumlari

Operasyonel CRM ekranlari icin:

- Landing/marketing kompozisyonu kullanilmaz.
- Bilgi yogun ama taranabilir layout tercih edilir.
- Kart icinde kart yapilmaz.
- Butonlarda uygun ikon kullanilir.
- Text tasmalari responsive olarak kontrol edilir.
- Tema renkleri CSS tokenlari uzerinden akar; hardcoded pembe/turuncu sadece marka tokeni ise kullanilir.

## Tema ve Tasarim Tokenlari

- Tema secimi kullanici bazli localStorage'da tutulabilir.
- Tema degisimi sadece popup'a degil, layout, sidebar, toolbar, tablo, kart, buton ve AI asistan gibi global yuzeylere etki eder.
- Yeni renk kullanimi once token olarak tanimlanir.
- Feature component icinde dogrudan marka rengi gerekiyorsa sebebi acik olmalidir.
- Gradient zorunlu degildir; kurumsal temalarda gradiantsiz varyantlar bulunur.

## Localization

- Yeni gorunen metinler i18n key ile yazilir.
- Feature metinleri feature namespace'inde tutulur.
- Ortak komponent metinleri shared/common namespace'e gider.
- Hata, toast, tooltip, placeholder, modal ve confirm metinleri de lokalizedir.
- Build/quality oncesi i18n namespace kontrolu calisir.

## Browser Storage

- Token okuma/yazma sadece auth store ve `src/lib/axios.ts` gibi auth altyapi noktalarinda olur.
- localStorage key'leri user/page/feature kapsamiyla isimlendirilir.
- Kolon, tema, dil, dashboard layout gibi tercih verisi localStorage'da tutulabilir.
- Geçici pagination state sessionStorage'da tutulabilir.
- localStorage yazma hatalari private mode/quota icin UI'yi kirmadan ele alinir.

## Logging ve Telemetry

- Production kaynak kodunda `console.log`, `console.debug`, `console.info`, `console.trace` kalmaz.
- Kullanici aksiyonuna donen beklenen hatalar UI state/toast ile gosterilir.
- `console.warn` ve `console.error` sadece actionable teknik sorunlarda kullanilir.
- Uzun vadede bu noktalar telemetry adapter'ina tasinir.

## Route ve Export

- Her buyuyen feature `index.ts` uzerinden public export verir.
- Route tanimlari feature component import eder; feature'in ic dosya detaylarini dagitmaz.
- Lazy import edilen agir vendor'lar `src/lib/lazy-vendors.ts` veya feature icinde kontrollu yuklenir.
- `_old` klasorleri yeni import kaynagi olamaz; migration tamamlandiginda silinir veya izolasyon notu eklenir.

## React Stabilite Kurallari

- Render sirasinda state setter cagrilmaz.
- `useEffect` icinde state set edilecekse dependency listesi stabil ve gerekce net olur.
- Derived state icin once `useMemo` veya render-time hesap tercih edilir.
- Ref callback icinde layout olcumu yapiliyorsa ayni degeri tekrar set etmeyen guard bulunur.
- Liste satirlari stable unique key kullanir; index key yalnizca statik listede kabul edilir.
- Modal/dropdown portal davranisi ref loop yaratmayacak sekilde test edilir.

## Performans Kurallari

- Milyonluk data UI'da client-side aranmaz, siralanmaz veya filtrelenmez.
- Buyuk listelerde request debounce, cancellation ve backend paging zorunludur.
- Gereksiz `refetch` zinciri, mount loop ve interval leak'i kabul edilmez.
- Agir PDF/Excel/export islemleri lazy import edilir.
- Tablo kolon tercihleri ve pagination state'i render loop yaratmayacak sekilde memoize edilir.

## Kalite Kapisi

Frontend degisikligi icin varsayilan kontrol:

```bash
npm run quality
```

Bu komut sirasiyla:

- ESLint
- i18n namespace kontrolu
- frontend standart kontrolu
- TypeScript typecheck

Riskli UI veya data-flow degisikliginde ek olarak:

- `npm run build`
- kritik ekranlarda manuel veya Playwright smoke kontrolu
- responsive kontrol
- network timing kontrolu
- console error kontrolu

## Otomatik Standart Kontrolu

`scripts/check-frontend-standards.mjs` su an su kaciklari engeller:

- `console.log/debug/info/trace`
- `src/lib/axios.ts` disinda default `axios` importu
- `src/lib/axios.ts` disinda `axios.*` kullanimi

Yeni tekrar eden hata sinifi bulundugunda once script'e kural eklenir, sonra kod temizlenir.

## Degisiklik Checklist'i

1. Feature klasoru dogru yerde mi?
2. API cagrisi component disinda mi?
3. Query key paging/search/filter/sort parametrelerini kapsiyor mu?
4. Search page 1'e donuyor mu?
5. User-visible metinler i18n key mi?
6. Pending/error/empty state var mi?
7. localStorage/sessionStorage key'i scoped mi?
8. Tema tokenlari kullaniliyor mu?
9. Debug log kaldi mi?
10. `npm run quality` gecti mi?

## Oncelikli Tamamlama Listesi

1. Eski `_old` feature klasorlerini emekli et veya migration notu ile izole tut.
2. Tum liste sayfalarinin toolbar/filter/column pattern'ini ayni standarda cek.
3. Feature API dosyalarinda response unwrap ve error handling'i tek helper'a indir.
4. Token/storage erisimlerini auth altyapisi disinda kademeli azalt.
5. Tema tokenlarini tum global yuzeylere yay.
6. Kritik flow'lar icin smoke test senaryolari ekle.

## Kaynak Referanslari

- React official documentation
- Vite official guide
- TanStack Query documentation
- Radix UI documentation
- Microsoft web app performance guidance

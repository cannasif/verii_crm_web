# CRM Liste Sayfasi UI/UX Uygulama Rehberi

Bu rehber CRM'deki liste/grid sayfalarinin ayni operasyonel standarda gelmesi icin kullanilir. Hedef sadece benzer gorunum degil; paging, search, filtre, kolon tercihi, refresh ve hata durumlarinin da ayni davranmasidir.

## Referans Davranis

Her liste sayfasi su parcayi tasir:

- Sayfa basligi, geri butonu gerekiyorsa solunda.
- Kisa alt aciklama.
- Ana liste karti.
- Liste kartinin icinde `PageToolbar`.
- Search input + refresh butonu.
- Filter popover.
- `ColumnPreferencesPopover`.
- Opsiyonel export/import/action butonlari.
- Paged table.
- Loading, empty, error ve permission state'leri.

## PageToolbar Standardi

- Search ve refresh tablo kartinin ustunde bulunur.
- Refresh gercek `refetch` veya `invalidateQueries` yapar.
- Refresh spam'i engellemek icin cooldown kullanir.
- Search degisince `pageNumber=1` olur.
- Search request'i debounce edilir.
- Toolbar sag slotunda filtre, kolon ve export islemleri bulunur.

## Paged Table Standardi

- Default `pageSize=10`.
- Kullanici page size degistirdiginde backend'e yeni page size gider.
- Her sayfa degisiminde beklenen kayit sayisi backend kontratina gore gelir; onceki sayfa datasindan dilimleme yapilmaz.
- Total count backend'den gelir. Search modunda backend performans icin approximate/seek total donerse UI bunu yaniltici kesin toplam gibi gostermemelidir.
- Sort state backend'e `sortBy` ve `sortDirection` olarak gider.
- Filter state backend'e net DTO olarak gider.
- Client-side sort/search sadece kucuk, statik lookup listelerinde kabul edilir.

## Search Standardi

- Search input UI state'i ile request search parametresi ayridir.
- Debounce suresi ekran yogunluguna gore 250-500 ms araliginda olur.
- Turkce karakter, buyuk/kucuk harf ve noktalama toleransi backend search standardina yaslanir.
- Search devam ederken butonlar kilitlenmez; sadece ilgili loading/fetching state gosterilir.
- Eski request sonucu yeni search sonucunu ezmemelidir; React Query key parametreleri bunu kapsamalidir.

## Filter Standardi

- Filtreler popover veya sheet icinde gruplanir.
- Aktif filtre varsa butonda gorsel indikator olur.
- Filter clear aksiyonu bulunur.
- Filter apply search gibi page 1'e doner.
- Filtre inputlari backend DTO isimleriyle uyumlu tutulur.

## Column Preferences Standardi

- Sütun düzenleme dropdown yerine popover olur.
- Kolon tercihleri user + page key ile localStorage'da tutulur.
- ID/primary action gibi kritik kolonlar gerekirse gizlenemez olur.
- Kolon order ve visibility state'i tablo render loop yaratmayacak sekilde memoize edilir.
- Drag/drop destekli tablolarda stable column id zorunludur.

## Tema Uyumu

- Liste karti, toolbar, tablo header, row hover, buton ve badge renkleri tema tokenlarindan gelir.
- Pembe/turuncu gibi marka renkleri dogrudan hardcoded kullanilmaz; token veya semantic class olmalidir.
- Acik/koyu/kurumsal temalarda kontrast kontrol edilir.

## Hata ve Empty State

- Loading state skeleton veya tablo icinde loading row olarak gosterilir.
- Empty state kullaniciya neyin bos oldugunu soyler, teknik detay vermez.
- Error state tekrar dene aksiyonu tasir.
- Permission yoksa ekran bos patlamaz; route veya component seviyesinde kontrollu davranir.

## Export/Import Aksiyonlari

- Export butonu tablo toolbar aksiyon grubunda olur.
- Excel export o anki tema renkleriyle baslik/header tasarimini koruyabilir; ama veri okunurlugu onceliklidir.
- Import isleminde dosya validasyonu, preview veya anlamli hata mesaji bulunur.

## Uygulama Checklist'i

1. Search + Refresh grid ustunde mi?
2. Refresh cooldown ve gercek refetch var mi?
3. Search page 1'e donuyor mu?
4. Query key search/filter/sort/page/pageSize iceriyor mu?
5. Filtreler popover/sheet icinde mi?
6. Aktif filtre indikatoru var mi?
7. Column preferences user/page scoped localStorage kullaniyor mu?
8. Table default page size 10 mu?
9. Client-side milyonluk filtreleme yok mu?
10. Loading/empty/error state var mi?
11. Tema tokenlari kullaniliyor mu?
12. `npm run quality` geciyor mu?

## Referans Sayfalar

Yeni liste sayfasi tasirken once bu ekranlar incelenir:

- `activity-management`
- `demands`
- `quotations`
- `orders`
- `stocks`
- `contact-management`
- `customer-management`

Bu liste "tum davranis eksiksiz uygulanmistir" anlami tasimaz. Her degisiklikte yukaridaki checklist ve kalite komutlari yeniden calistirilir.

## Smoke Test Senaryosu

1. Sayfa acilir, console error yoktur.
2. Default 10 kayit gelir.
3. Search yazilir, request debounce ile gider ve page 1'e doner.
4. Page 2'ye gecilir, beklenen page size korunur.
5. Page size degistirilir, backend yeni page size ile cagrilir.
6. Sort uygulanir, request parametreleri degisir.
7. Filter uygulanir ve temizlenir.
8. Kolon gizlenir, sayfa yenilenir, tercih korunur.
9. Refresh tiklanir, cooldown calisir.
10. Tema degistirilir, tablo ve toolbar renkleri uyumlu kalir.

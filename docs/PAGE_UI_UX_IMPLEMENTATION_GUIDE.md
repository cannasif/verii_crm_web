# Sayfa UI/UX İyileştirme Uygulama Rehberi

Bu belge, activity-management sayfasında yapılan UI/UX iyileştirmelerinin diğer sayfalara nasıl uygulanacağını açıklar.

## Yapılan İyileştirmeler

### 1. Arama + Yenile (Search + Refresh)
- **Arama** ve **Refresh** butonu grid/tablo alanının **üstünde**, aynı kart içinde
- Refresh butonu tıklandığında **45 saniye** devre dışı kalır
- Refresh gerçek veri yenilemesi yapar (`invalidateQueries`)

### 2. Gelişmiş Filtre / Filtre (Filter)
- Filtre alanları bir **Popover** içinde
- Açma/kapama için **Filter** butonu
- Filtre uygulandığında buton rengi/indikatör ile belirtilir (pembe ton, nokta)
- Filter butonu Sütunları Düzenle butonunun **yanında**

### 3. Sütunları Düzenle (Column Customization)
- **Dropdown** yerine **Popover** (butona bağlı)
- Gösterilecek sütunlar: Yukarı/Aşağı ile sıralama
- Gizlenen sütunlar: Göz ikonu ile tekrar gösterme
- ID sütunu gizlenemez
- Ayarlar **localStorage** ile userId + sayfa anahtarı ile kaydedilir

## Ortak Bileşenler

- `PageToolbar` - Arama + Refresh (45s cooldown) + opsiyonel rightSlot
- `ColumnPreferencesPopover` - Sütun düzenleme popover
- `src/lib/column-preferences.ts` - localStorage yardımcı fonksiyonları

## Uygulama Kontrol Listesi (Her Sayfa)

1. [ ] Search + Refresh grid üstüne taşındı mı?
2. [ ] Refresh 45s cooldown var mı?
3. [ ] Refresh invalidateQueries yapıyor mu?
4. [ ] Filtreler Popover içinde mi?
5. [ ] Filter butonu aktif durumda görünüyor mu?
6. [ ] Sütun düzenleme Popover mı?
7. [ ] Sütun tercihleri localStorage'da mı?

## Uygulama Durumu

| Sayfa | Durum |
|-------|-------|
| activity-management | Referans (zaten uygulandı) |
| demands, quotations, orders | Uygulandı |
| customer-management | Uygulandı |
| conflict-inbox | Uygulandı |
| erp-customer-management | Uygulandı |
| activity-type-management | Uygulandı |
| stocks | Uygulandı |
| contact-management | Uygulandı |
| customer-type-management | Uygulandı |
| country-management | Uygulandı |
| city-management | Uygulandı |
| district-management | Uygulandı |
| title-management | Uygulandı |
| payment-type-management | Uygulandı |
| sales-type-management | Uygulandı |
| document-serial-type-management | Uygulandı (PageToolbar) |
| product-pricing-group-by-management | Uygulandı (PageToolbar) |
| pricing-rules | Uygulandı (PageToolbar) |
| user-discount-limit-management | Uygulandı |
| shipping-address-management | Uygulandı |
| approval-user-role-management | Uygulandı (PageToolbar) |
| approval-role-management | Uygulandı (PageToolbar) |
| approval-role-group-management | Uygulandı (PageToolbar) |
| approval-flow-management | Uygulandı (PageToolbar) |

### Kalan sayfalar için referans
Tüm kalan sayfalar için **country-management** sayfası referans alınabilir. Aynı pattern:
1. `PageToolbar` + `ColumnPreferencesPopover` + `loadColumnPreferences` import et
2. `columnOrder` state ve localStorage'dan yükle
3. Search+Refresh alanını PageToolbar ile değiştir
4. Column Dropdown/Popover'ı `ColumnPreferencesPopover` ile değiştir
5. Filter butonuna `hasFiltersActive` stili ekle
6. Table'a `columnOrder` ve `onColumnOrderChange` prop'larını geçir (drag destekli table'lar için)

## Sayfa Bazlı Notlar

| Sayfa | Özel Durum |
|-------|------------|
| demands, quotations, orders | Approval status filter - Popover'a al |
| country, city, district | Zaten filter/column var - Popover'a dönüştür |
| activity-type | activity-management ile benzer yapı |
| product-pricing-group-by | Column edit var - localStorage ekle |

# V3RII CRM Web - Sidebar Ekranlari Kullanici Rehberi

Bu rehber, web uygulamasinda sidebar (sol menu) uzerinden acilan tum ekranlari kapsar.

## Kapsam ve Notlar
- Kaynak: `/src/components/shared/MainLayout.tsx` menu yapisi + `/src/routes/index.tsx` route tanimlari + ilgili `feature` ekranlari ve API katmani.
- Ekran gorunurlugu kullanici yetkilerine gore degisir (Permission/Access Control).
- API endpointleri burada "ana kaynak" seviyesinde verildi; tum alt endpoint varyasyonlari ilgili `src/features/*/api/*.ts` dosyalarindadir.
- "Ayarlar" menusu route degil, profil modal/ekrani akisina bagli calisir.

## CRM Is Akis Mantigi (Is Kurali Ozeti)

### A) Genel Ticari Akis (Operasyon Sirasi)
1. Talep olusturulur (`/demands/create`), talep detayi acilir (`/demands/:id`).
2. Talep detayindan `Onaya Gonder` yapilir.
3. Talep onayi tamamlaninca sistem teklife donusturur.
4. Teklif olusturulur/duzenlenir (`/quotations/:id`) ve `Onaya Gonder` yapilir.
5. Teklif onayi tamamlaninca sistem siparise donusturur.
6. Siparis olusturulur/duzenlenir (`/orders/:id`) ve `Onaya Gonder` yapilir.
7. Siparis onayi tamamlandiginda belge `Onaylandi` durumuna gecer ve surec ticari olarak kapanir.

Onemli: Talep/Teklif/Siparis create ekranlari kaydi olusturur; onay akisini fiilen baslatan islem detay ekranindaki `Onaya Gonder` aksiyonudur.

### B) Belge Durum Mantigi
- `Baslamadi` (`HavenotStarted`): Belge olustu ama onay sureci baslatilmadi.
- `Beklemede` (`Waiting`): Onay aksiyonu bekleniyor.
- `Onaylandi` (`Approved`): Tum zorunlu adimlar tamamlandi.
- `Reddedildi` (`Rejected`): Herhangi bir adimda red verildi.
- `Kapandi` (`Closed`): Ayni belge numarasinin eski/revizyon kayitlari kapanmis durum.

### C) Onay Akisi Secim Kurali (Sistem Davranisi)
1. Sistem belge tipine gore aktif bir akisi (`ApprovalFlow`) arar.
2. Akistaki adimlar (`ApprovalFlowStep`) sirayla kontrol edilir.
3. Her adim icin rol grubundaki rollerden, belge toplamini (`totalAmount`) karsilayan (`MaxAmount >= total`) roller bulunur.
4. Ilk uygun adim secilir ve o adimdaki yetkili kullanicilar icin bekleyen onay kayitlari (`ApprovalAction`) acilir.
5. Belge statusu `Beklemede` olur.

### D) Ayni Adimda Onay Kurali
- Ayni adimdaki tum bekleyen onaylar tamamlanmadan bir sonraki adima gecilmez.
- Son kullanici dilinde: adimdaki tum ilgili onaycilarin onayi gerekir; biri bekliyorsa adim tamamlanmis sayilmaz.

### E) Red Kurali
- Bir onayci red verdiginde ilgili onay talebi `Reddedildi` olur.
- Belgenin statusu da `Reddedildi` olur.
- Red nedeni belgeye yazilir ve raporlarda gorunur.

### F) Akis Yoksa Ne Olur? (Mevcut Implementasyon)
- Talep icin aktif onay akisi yoksa: sistem talebi dogrudan teklife donusturur.
- Teklif icin aktif onay akisi yoksa: sistem teklifi dogrudan siparise donusturur.
- Siparis icin aktif onay akisi yoksa: sistem hata doner (sipariste akis tanimi beklenir).

### G) Akis Varsa Ama Kurallar Eksikse Ne Olur?
- Adim tanimi yoksa: onay baslatma hata verir.
- Toplami karsilayan rol yoksa: onay baslatma hata verir.
- Rol var ama role bagli kullanici yoksa: onay baslatma hata verir.

### H) Donusum Kurali
- Talep onaylandiginda -> Teklif olusturulur (otomatik donusum).
- Teklif onaylandiginda -> Siparis olusturulur (otomatik donusum).
- Siparis onaylandiginda -> Belge nihai ticari asamaya gecer, yeni belge turune donusmez.

### I) Stok ve Netsis Mantigi
- Stok listesi ERP/Netsis kaynagindan gelir (`/stocks`).
- Stok detayinda (`/stocks/:id`) operasyon ekipleri bagli stok tanimlama, gorsel ekleme/silme ve ana gorsel secimi, HTML aciklama ve teknik ozellik (JSON) gibi alanlarda zenginlestirme yapar.
- Bu zenginlestirme satis belgelerinde urun secimi ve teklif/siparis kalitesi icin kritik rol oynar.

### J) Fiyat ve Iskonto Kural Mantigi
- `Urun Fiyatlandirma` ve `Urun Fiyatlandirma Grubu` taban fiyatlari tasir.
- `Fiyat Kurali` belge tipi + miktar araligi + musteri/satisci kosullariyla fiyat/iskonto uygular.
- `Kullanici Iskonto Limiti` satis temsilcisi bazinda ust sinirlari korur.

---

## 1) Ana Sayfa

| Ekran | Route | Ne Ise Yarar | Ana Alanlar | Ana API |
|---|---|---|---|---|
| Ana Sayfa (Dashboard) | `/` | Operasyonun genel ozetini ve hizli erisimleri sunar | KPI kartlari, son aktiviteler, hizli islem kartlari, rapor indirme | `/api/Dashboard`, `/api/Dashboard/currencyRates` |

---

## 2) Satis Yonetimi

### Talepler
| Ekran | Route | Ne Ise Yarar | Ana Alanlar | Ana API |
|---|---|---|---|---|
| Yeni Talep Olustur | `/demands/create` | Yeni talep acma ve onaya gonderme | Header (musteri, sevk adresi, para birimi, tarih), satirlar, kur, ozet | `/api/demand`, `/api/DemandLine`, `/api/DemandExchangeRate`, `/api/approval/demand/*` |
| Onay Bekleyen Talepler | `/demands/waiting-approvals` | Bekleyen talep onaylarini yonetir | Bekleyen kayit listesi, onay/red aksiyonu, aciklama | `/api/demand/waiting-approvals`, `/api/demand/approve`, `/api/demand/reject` |
| Talep Listesi | `/demands` | Tum talepleri filtreleyip listeler | Arama, filtre, tablo, revize/duzenle/detay | `/api/demand` |

### Teklifler
| Ekran | Route | Ne Ise Yarar | Ana Alanlar | Ana API |
|---|---|---|---|---|
| Yeni Teklif Olustur | `/quotations/create` | Yeni teklif acma ve onaya gonderme | Teklif header, satirlar, doviz kurlari, final ozet | `/api/quotation`, `/api/QuotationLine`, `/api/QuotationExchangeRate`, `/api/approval/quotation/*` |
| Bekleyen Onaylar (Teklif) | `/quotations/waiting-approvals` | Teklif onay surecini yonetir | Bekleyen teklif listesi, onay/red, yorum | `/api/quotation/waiting-approvals`, `/api/quotation/approve`, `/api/quotation/reject` |
| Teklif Listesi | `/quotations` | Teklif arama, filtreleme ve takip | Liste tablo, filtreler, revizyon, detay gecis | `/api/quotation` |

### Siparisler
| Ekran | Route | Ne Ise Yarar | Ana Alanlar | Ana API |
|---|---|---|---|---|
| Yeni Siparis Olustur | `/orders/create` | Yeni siparis acma ve onaya gonderme | Siparis header, satirlar, kur, toplam ozet | `/api/order`, `/api/OrderLine`, `/api/OrderExchangeRate`, `/api/approval/order/*` |
| Onay Bekleyen Siparisler | `/orders/waiting-approvals` | Siparis onaylarini yonetir | Bekleyen siparis listesi, onay/red islemleri | `/api/order/waiting-approvals`, `/api/order/approve`, `/api/order/reject` |
| Siparis Listesi | `/orders` | Tum siparislerin takibi | Arama, filtre, tablo, detay/revizyon | `/api/order` |

---

## 3) Musteriler

| Ekran | Route | Ne Ise Yarar | Ana Alanlar | Ana API |
|---|---|---|---|---|
| Musteri Yonetimi | `/customer-management` | Musteri CRUD ve temel kart yonetimi | Musteri kart formu (ad, vergi, iletisim, konum, tip), liste, filtre | `/api/Customer` |
| Cakisma Gelen Kutusu | `/customers/conflict-inbox` | Mukerrer musteri adaylarini birlestirir | Eslesme skoru, ana/mukerrer kayit karsilastirmasi, merge onizleme | `/api/Customer/*duplicate*` (frontend: customerDedupe API) |
| ERP Musteri | `/erp-customers` | ERP'den gelen musteri kayitlarini izler | ERP sutun seti, hizli arama, detayli filtre, kolon secimi | `/api/erp/customers` (ErpController) |
| Musteri Iletisim Yonetimi | `/contact-management` | Musteri kisi/iletisim kayitlarini yonetir | Kisi formu (ad-soyad, email, telefon, unvan, musteri), tablo | `/api/Contact` |
| Musteri Tipi Yonetimi | `/customer-type-management` | Musteri segment/tip tanimlarini yonetir | Tip adi, aciklama, liste ve CRUD | `/api/CustomerType` |

Not: Musteri detay aksiyonlarindan `Musteri 360` ekranina gecis yapilabilir (`/customer-360/:customerId`).

---

## 4) Aktiviteler

| Ekran | Route | Ne Ise Yarar | Ana Alanlar | Ana API |
|---|---|---|---|---|
| Gunluk Isler | `/daily-tasks` | Gorevlerin gunluk/haftalik takibini yapar | Gorev listesi, durum filtreleri, calisan filtreleri, takvim gorunumu | `/api/Activity`, `/api/ActivityType` |
| Aktivite Yonetimi | `/activity-management` | Aktivite kayitlarini uc uca yonetir | Aktivite formu (konu, tip, musteri, kisi, sorumlu, durum, oncelik), gelismis filtre, tablo | `/api/Activity`, `/api/ActivityType`, `/api/ActivityImage` |
| Aktivite Tipi Yonetimi | `/activity-type-management` | Aktivite tip sozlugunu yonetir | Tip adi/aciklama, liste ve CRUD | `/api/ActivityType` |

---

## 5) Urunler ve Stok

| Ekran | Route | Ne Ise Yarar | Ana Alanlar | Ana API |
|---|---|---|---|---|
| Stok Yonetimi | `/stocks` | ERP stok listesini izler ve detay gecisi saglar | Stok listesi, arama, sayfalama, detay aksiyonu | `/api/Stock`, `/api/StockDetail`, `/api/StockImage`, `/api/StockRelation` |
| Urun Fiyatlandirma Yonetimi | `/product-pricing-management` | Urun bazli fiyat/iskonto kartlarini yonetir | ERP urun kodu, grup kodu, para birimi, liste/maliyet, iskonto 1-2-3, kar marji | `/api/ProductPricing` |
| Urun Fiyatlandirma Grubu Yonetimi | `/product-pricing-group-by-management` | Grup bazli fiyat kurallari tanimlar | ERP grup kodu, para birimi, fiyat/iskonto alanlari, liste | `/api/ProductPricingGroupBy` |
| Fiyat Kurali Yonetimi | `/pricing-rules` | Talep/Teklif/Siparis icin kural bazli fiyat yonetimi | Kural header, satirlar (min-max miktar, sabit fiyat/iskonto), satisci atamalari | `/api/PricingRuleHeader`, `/api/PricingRuleLine`, `/api/PricingRuleSalesman` |

Not: Stok detay ekrani route'u `/stocks/:id` olup gorsel yonetimi, bagli stok ve teknik detay alanlarini icerir.

---

## 6) PowerBI

| Ekran | Route | Ne Ise Yarar | Ana Alanlar | Ana API |
|---|---|---|---|---|
| PowerBI Konfigurasyon | `/powerbi/configuration` | Tenant/Client/Workspace ayarlarini yonetir | TenantId, ClientId, WorkspaceId, API Base URL, Scope | `/api/PowerBIConfiguration` |
| PowerBI Raporlari (Goruntule) | `/powerbi/reports` | Kullaniciya acik raporlarin listesi | Rapor adi, aciklama, aktif/pasif, goruntule aksiyonu | `/api/powerbi/embed/reports` |
| PowerBI Senkronizasyon | `/powerbi/sync` | Workspace raporlarini CRM'e senkronize eder | Workspace ID (opsiyonel), sync sonucu (created/updated/deleted) | `/api/PowerBIReportSync` |
| PowerBI Raporlari | `/powerbi/report-definitions` | Rapor metadata tanimlarini yonetir | Name, workspaceId, reportId, datasetId, embedUrl, aktiflik, RLS rolleri | `/api/PowerBIReportDefinition` |
| PowerBI Gruplari | `/powerbi/groups` | PowerBI grup tanimlarini yonetir | Grup adi, aciklama, aktiflik | `/api/PowerBIGroup` |
| PowerBI Kullanici Gruplari | `/powerbi/user-groups` | Kullanici-grup eslestirmelerini yonetir | User, Group eslestirmesi | `/api/UserPowerBIGroup` |
| PowerBI Grup-Rapor Eslestirme | `/powerbi/group-report-definitions` | Grup ve rapor tanimlarini baglar | Group, ReportDefinition eslestirmesi | `/api/PowerBIGroupReportDefinition` |
| RLS Yonetimi | `/powerbi/rls` | Rapor + rol + RLS role setlerini yonetir | Rapor secimi, rol secimi, RLS role listesi | `/api/powerbi/report-role-mappings`, `/api/UserAuthority` |

Not: Tek rapor embed ekrani `/powerbi/reports/:id` route'u ile acilir.

---

## 7) Raporlar

| Ekran | Route | Ne Ise Yarar | Ana Alanlar | Ana API |
|---|---|---|---|---|
| Satis KPI | `/salesmen-360/me` | Satici odakli 360 KPI/analitik gorunumu | Ozet KPI, trend grafikler, kohort, onerilen aksiyonlar | `/api/Salesmen360/*` |
| Rapor Olusturucu - Liste | `/reports` | Dinamik rapor tanimlarini listeler | Arama, rapor kartlari, yeni rapor gecisi | `/api/reportbuilder/reports` |
| Rapor Olusturucu - Yeni | `/reports/new` | Sifirdan rapor tasarlar | Baglanti secimi, datasource kontrol, field drag-drop, preview, properties | `/api/reportbuilder/reports`, `/api/reportbuilder/connections`, `/api/reportbuilder/preview` |
| PDF Olusturucu - Liste | `/report-designer` | PDF sablonlarini listeler ve isletir | Sablon tablosu, kopyala, sil, PDF uretme | `/api/PdfReportTemplate` |
| PDF Olusturucu - Olustur | `/report-designer/create` | Talep/Teklif/Siparis icin PDF sablon tasarlar | A4 canvas, surukle-birak alanlar, katman/inspector, varsayilan sablon secimi | `/api/PdfReportTemplate/fields/*`, `/api/PdfReportTemplate` |

Not: PDF sablon duzenleme route'u `/report-designer/edit/:id` ve rapor goruntuleme route'u `/reports/:id` menuden dolayli acilir.

---

## 8) Onay Tanim Grubu

| Ekran | Route | Ne Ise Yarar | Ana Alanlar | Ana API |
|---|---|---|---|---|
| Onay Akisi Yonetimi | `/approval-flow-management` | Belge tipine gore onay akislarini tanimlar | Belge tipi (Talep/Teklif/Siparis), aktiflik, akis adimlari | `/api/ApprovalFlow`, `/api/ApprovalFlowStep` |
| Onay Rol Grubu Yonetimi | `/approval-role-group-management` | Onay rol grubu sozlugunu yonetir | Grup adi, olusturma bilgileri, CRUD | `/api/ApprovalRoleGroup` |
| Onay Rolu Yonetimi | `/approval-role-management` | Rol ve limitli onay yetkisi tanimlar | Rol grubu, rol adi, max tutar | `/api/ApprovalRole` |
| Onay Kullanici Rolu Yonetimi | `/approval-user-role-management` | Kullaniciyi onay rollerine baglar | Kullanici secimi, rol secimi, liste ve CRUD | `/api/ApprovalUserRole` |

---

## 9) Tanimlar

| Ekran | Route | Ne Ise Yarar | Ana Alanlar | Ana API |
|---|---|---|---|---|
| Ulke Yonetimi | `/country-management` | Ulke sozlugu yonetimi | Ulke adi, kod, ERP kodu | `/api/Country` |
| Sehir Yonetimi | `/city-management` | Sehir sozlugu yonetimi | Sehir adi, ulke, ERP kodu | `/api/City` |
| Ilce Yonetimi | `/district-management` | Ilce sozlugu yonetimi | Ilce adi, sehir, ERP kodu | `/api/District` |
| Sevk Adresi Yonetimi | `/shipping-address-management` | Musteri sevk adres kartlarini yonetir | Musteri, adres, ulke/sehir/ilce, posta kodu, varsayilan flag | `/api/ShippingAddress` |
| Unvan Yonetimi | `/title-management` | Kisi unvan sozlugunu yonetir | Unvan adi ve kodu | `/api/Title` |
| Odeme Tipi Yonetimi | `/payment-type-management` | Odeme tipi sozlugunu yonetir | Ad, aciklama | `/api/PaymentType` |
| Dosya Tip Yonetimi | `/document-serial-type-management` | Belge seri/numaralandirma kurallarini yonetir | Kural tipi, musteri tipi, satisci, seri onek/uzunluk/artis | `/api/DocumentSerialType` |
| Satis Tipi Yonetimi | `/definitions/sales-type-management` | Satis tipi tanimlarini yonetir | SalesType kodu, ad, arama, liste | `/api/SalesType` |

---

## 10) Kullanicilar

| Ekran | Route | Ne Ise Yarar | Ana Alanlar | Ana API |
|---|---|---|---|---|
| Kullanici Iskonto Limiti Yonetimi | `/user-discount-limit-management` | Satis temsilcisi + urun grubu bazli max iskonto tanimlar | Salesperson, ERP group code, max discount 1-2-3, filtreleme | `/api/UserDiscountLimit` |

---

## 11) Erisim Kontrolu

| Ekran | Route | Ne Ise Yarar | Ana Alanlar | Ana API |
|---|---|---|---|---|
| Kullanici Yonetimi | `/user-management` | Uygulama kullanicilarini ve rol/grup atamalarini yonetir | Username, email, ad/soyad, rol, aktiflik, izin gruplari | `/api/User`, `/api/PermissionGroup` |
| Mail Ayarlari | `/users/mail-settings` | SMTP ayarlarini yonetir | Host, port, SSL, username/password, from bilgisi, timeout, test mail | `/api/SmtpSettings`, `/api/Mail/send-test` |
| Izin Tanimlari | `/access-control/permission-definitions` | Yetki kodlarini tanimlar/senkronlar | Kod, ad, aciklama, aktiflik, route etkisi | `/api/permission-definitions`, `/api/permission-definitions/sync` |
| Izin Gruplari | `/access-control/permission-groups` | Izinleri gruplandirir | Grup adi, system admin flag, aktiflik, izin secimi | `/api/permission-groups` |
| Kullanici Grup Atamalari | `/access-control/user-group-assignments` | Kullanicinin izin gruplarini belirler | Kullanici secimi, grup secimi, toplu kaydet | `/api/user-permission-groups/*` |
| Hangfire Izleme | `/hangfire-monitoring` | Arkaplan job sagligini izler | Job istatistikleri, failed listesi, dead-letter listesi | `/api/hangfire/stats`, `/api/hangfire/failed`, `/api/hangfire/dead-letter` |

---

## 12) Ayarlar

| Ekran | Route | Ne Ise Yarar | Ana Alanlar | Ana API |
|---|---|---|---|---|
| Ayarlar / Profil | `#` (menu aksiyonu) ve `/profile` | Kullanici profil bilgisi, avatar ve sifre degisimi | Kisisel bilgiler, iletisim, avatar upload, sifre degistirme | `/api/UserDetail`, `/api/UserDetail/upload-profile-picture`, `/api/Auth/change-password` |

---

## 13) Operasyonel Kullanim Onerisi (Kisa)

1. Once `Izin Tanimlari` ve `Izin Gruplari` ile erisim modelini tamamlayin.
2. Sonra `Tanimlar` (ulke/sehir/ilce/odeme tipi/satis tipi vb.) sozluklerini doldurun.
3. Ardindan `Musteriler`, `Stok/Fiyatlandirma`, `Onay Akislari` kurulumunu yapin.
4. Gunluk operasyonda `Talep -> Teklif -> Siparis` akisiyla devam edin.
5. Ust yonetim ve izleme icin `Dashboard`, `PowerBI`, `Raporlar`, `Hangfire` ekranlarini kullanin.

---

## 14) Adim Adim Kullanici Rehberi (Pratik Akis)

### Senaryo 1 - Yeni Talep Acma ve Onaya Gonderme
1. `Satis Yonetimi > Talepler > Yeni Talep Olustur` ekranina girin.
2. Header alanlarini doldurun: musteri, para birimi, teslim tarihi, odeme tipi, satis temsilcisi.
3. Talep satirlarini ekleyin, miktar/fiyat/iskonto alanlarini kontrol edin.
4. Kaydi olusturun; sistem sizi `Talep Detay` ekranina alir.
5. Detay ekraninda `Onaya Gonder` butonuna basin.
6. Sonuc: Akis varsa belge `Beklemede` olur ve yetkili kullanicilara duser.
7. Sonuc: Akis yoksa belge otomatik onaylanip Teklife donusebilir.

### Senaryo 2 - Bekleyen Talep Onayi
1. `Satis Yonetimi > Talepler > Onay Bekleyen Talepler` ekranina girin.
2. Uzerinize dusen kaydi acin.
3. `Onayla` veya `Reddet` aksiyonu verin.
4. Birden fazla onayci olan adimlarda tum onaylar tamamlaninca sonraki adima gecilir.

### Senaryo 3 - Tekliften Siparise Gecis
1. Teklif detayinda (`/quotations/:id`) `Onaya Gonder` ile akis baslatin.
2. Tum adimlar onaylandiginda sistem siparisi otomatik olusturur.
3. Siparis detayinda fiyatlar, satirlar, notlar ve rapor sekmeleri kontrol edilir.

### Senaryo 4 - Siparis Onayi
1. Siparis detayinda `Onaya Gonder` butonu ile akis baslatilir.
2. Onay adimlari tamamlaninca siparis `Onaylandi` olur.
3. Sipariste aktif akis yoksa sistem hata verir; once `Onay Akisi Yonetimi` tanimi yapilmalidir.

### Senaryo 5 - Stok Zenginlestirme
1. `Urunler ve Stok > Stok Yonetimi` listesinden kaydi acin.
2. `Stok Detay` ekraninda asagidaki islemleri yapin:
3. Gorsel yukleyin ve ana gorsel secin.
4. Bagli stok iliskilerini olusturun.
5. HTML aciklama ve teknik ozellikleri girin.
6. Bu alanlar satis ekibinin dogru urun sunmasini kolaylastirir.

---

## 15) Onay Akisi Kurulum Rehberi (Admin Icin)

1. `Onay Rol Grubu Yonetimi` ekraninda gruplari tanimlayin (ornek: Bolge Muduru, Finans).
2. `Onay Rolu Yonetimi` ekraninda role max tutar siniri verin.
3. `Onay Kullanici Rolu Yonetimi` ekraninda kullanicilari role baglayin.
4. `Onay Akisi Yonetimi` ekraninda belge tipi bazli aktif akis olusturun.
5. Akis adimlarini (step order) mantikli siraya koyun.
6. Test amacli bir belge acip `Onaya Gonder` ile dogrulama yapin.

Kontrol listesi:
- Belge tipi icin sadece gecerli ve aktif akis var mi?
- Her adimda role bagli en az bir aktif kullanici var mi?
- MaxAmount kurali toplam tutari kapsiyor mu?

---

## 16) Sik Karsilasilan Durumlar ve Cozum

### Durum: \"Onaya gonderdim ama islem ilerlemiyor\"
- Olasi neden: Ayni adimdaki diger onaycilar hala beklemede.
- Kontrol: Belge detayindaki `Onay Akisi` sekmesi ve bekleyen aksiyonlar.

### Durum: \"Onaya gonderince rol/yetki bulunamadi\" hatasi
- Olasi neden: Toplam tutari karsilayan `MaxAmount` tanimli rol yok.
- Cozum: `Onay Rolu Yonetimi` ekraninda limitleri guncelleyin.

### Durum: \"Bu adim icin onayci bulunamadi\"
- Olasi neden: Role bagli kullanici atanmamis.
- Cozum: `Onay Kullanici Rolu Yonetimi` ekraninda atama yapin.

### Durum: \"Sipariste onay akisi bulunamadi\"
- Olasi neden: Siparis belge tipi icin aktif akis yok.
- Cozum: `Onay Akisi Yonetimi` ekraninda Siparis icin akis tanimlayip aktive edin.

### Durum: \"Talep/Teklif onaya gitmeden bir ust belgeye gecti\"
- Aciklama: Talep/Teklif tarafinda aktif akis yoksa sistem otomatik donusum yapabilir.
- Kontrol: Ilgili belge tipi icin aktif akis tanimi var mi?

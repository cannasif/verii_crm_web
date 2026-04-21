# Opus 4.7 Prompt: `pdf-report-designer/create` Ekranını Daha Kurumsal, Daha Öğretici ve Daha Kolay Kullanılır Hale Getir

Sen kıdemli bir React + TypeScript + ürün UX odaklı frontend mühendisisin. Görevin mevcut ekranı baştan yazmak değil; ekranın gerçek iş amacını anlayıp, var olan teknik yapıyı bozmadan daha anlaşılır, daha kurumsal, daha öğretici ve daha güven veren bir deneyime dönüştürmek.

Bu görevde özellikle şunu yapmanı istiyorum:

- ekranı daha güzel yap
- ama sadece güzelleştirme yapma
- kullanım mantığını ilk kez gören biri için daha net hale getir
- mevcut tüm önemli özellikleri koru
- “özellik çok ama kullanımı zor” hissini azalt
- ekranı eğitim gerektirmeden daha rahat kullanılabilir yap

## Proje ve İncelenecek Dosyalar

- Uygulama: `verii_crm_web`
- İncelenecek ekran: `https://crm.v3rii.com/pdf-report-designer/create`

Ana giriş noktası:
- `/Users/cannasif/Documents/V3rii/verii_crm_web/src/features/pdf-report-designer/pages/PdfReportDesignerCreatePage.tsx`

İlgili ana bileşenler:
- `/Users/cannasif/Documents/V3rii/verii_crm_web/src/features/pdf-report-designer/components/PdfA4Canvas.tsx`
- `/Users/cannasif/Documents/V3rii/verii_crm_web/src/features/pdf-report-designer/components/PdfSidebar.tsx`
- `/Users/cannasif/Documents/V3rii/verii_crm_web/src/features/pdf-report-designer/components/PdfInspectorPanel.tsx`
- `/Users/cannasif/Documents/V3rii/verii_crm_web/src/features/pdf-report-designer/components/PdfLayersPanel.tsx`
- `/Users/cannasif/Documents/V3rii/verii_crm_web/src/features/pdf-report-designer/store/usePdfReportDesignerStore.ts`

İlgili veri dönüşüm ve payload katmanı:
- `/Users/cannasif/Documents/V3rii/verii_crm_web/src/features/pdf-report-designer/utils/dto-to-canvas.ts`
- `/Users/cannasif/Documents/V3rii/verii_crm_web/src/features/pdf-report-designer/utils/canvas-to-dto.ts`

İlgili hook ve form katmanı:
- `/Users/cannasif/Documents/V3rii/verii_crm_web/src/features/pdf-report-designer/hooks/useCreatePdfReportTemplate.ts`
- `/Users/cannasif/Documents/V3rii/verii_crm_web/src/features/pdf-report-designer/hooks/useUpdatePdfReportTemplate.ts`
- `/Users/cannasif/Documents/V3rii/verii_crm_web/src/features/pdf-report-designer/hooks/usePdfReportTemplateById.ts`
- `/Users/cannasif/Documents/V3rii/verii_crm_web/src/features/pdf-report-designer/hooks/usePdfReportTemplateFields.ts`
- `/Users/cannasif/Documents/V3rii/verii_crm_web/src/features/pdf-report-designer/schemas/pdf-report-designer-create-schema.ts`

## Bu Ekranın Asıl İş Amacı

Bu ekran sıradan bir “form oluştur” ekranı değil. Bu ekran bir PDF şablon editörü.

Kullanıcı burada:

1. Belge tipini seçer
   - teklif
   - sipariş
   - talep
   - hızlı teklif
   - aktivite
   - benzeri rule type’lar
2. Şablonun temel bilgilerini tanımlar
   - başlık
   - rule type
   - varsayılan mı
   - sayfa sayısı
   - preset veya başlangıç düzeni
3. Sol panelden alanları, tabloları, şekilleri, görselleri ve dinamik verileri ekler
4. Ortadaki A4 canvas üzerinde öğeleri yerleştirir
5. Sağ panelden seçili öğeyi ayarlar
   - font
   - boyut
   - konum
   - padding
   - border
   - renk
   - görünürlük mantığı
   - tablo kolonları
   - görsel ayarları
6. Katmanları ve sayfaları yönetir
7. Sonunda şablonu kaydeder

Yani ekranın temel amacı:

- kullanıcıya kod yazmadan PDF şablonu tasarlatmak
- bunu farklı belge tiplerine bağlamak
- baskıya yakın A4 düzeni üzerinde kontrol vermek
- tekrar kullanılabilir kurumsal PDF template üretmek

## Neden Zor Hissediliyor?

Mevcut ekran güçlü ama ilk kullanım deneyimi zor olabilir. Başlıca nedenler:

1. Form, editör, canvas, field palette, inspector ve layers aynı anda eşit ağırlıkta geliyor
2. Kullanıcı “önce ne yapacağım?” sorusuna çok hızlı cevap alamıyor
3. Temel ayarlar ile ileri seviye ayarlar aynı görsel ağırlıkta sunuluyor
4. Sol panel güçlü ama “buradan ne eklenir?” duygusu daha öğretici olabilir
5. Sağ panel güçlü ama “seçili öğeyi şimdi nasıl yönetirim?” hissi daha iyi organize edilebilir
6. Canvas ekranın kalbi olmasına rağmen etrafındaki yardımcı yapı onu yeterince desteklemeyebilir
7. Ekran power-user için güçlü, ilk kez kullanan kullanıcı için yorucu hissedebilir

## Senden İstediğim Nihai Sonuç

Bu ekran şuna dönüşmeli:

- daha kurumsal
- daha düzenli
- daha sakin
- daha öğretici
- ilk kullanımda daha anlaşılır
- güçlü ama korkutmayan
- profesyonel tasarım stüdyosu hissi veren

Ama bunları yaparken:

- hiçbir kritik özelliği kaldırma
- drag/drop mantığını bozma
- save/update akışını bozma
- create/edit ortak yapısını bozma
- store mimarisini bozma
- payload yapısını bozma
- var olan business rule’ları bozma

Bu bir rewrite işi değil.
Bu bir guided enhancement işi.

## Kesinlikle Korunması Gerekenler

Şunları bozma:

- `react-hook-form`
- `zodResolver`
- `usePdfReportDesignerStore`
- DTO <-> canvas dönüşüm mantığı
- DnD kit davranışı
- sayfa yönetimi mantığı
- create ve edit ortak çalışma modeli
- mevcut API kontratları
- mevcut field binding mantığı
- localization yapısı

Yapabileceklerin:

- üst bilgi alanını daha iyi gruplayabilirsin
- yardımcı rehber alanları ekleyebilirsin
- bilgi hiyerarşisini güçlendirebilirsin
- section heading ve helper text ekleyebilirsin
- panelleri daha iyi organize edebilirsin
- spacing, emphasis, toolbar grouping, empty state, onboarding hissi iyileştirebilirsin
- küçük yardımcı bileşenler çıkarabilirsin

Ama büyük kırıcı refactor yapma.

## Özellikle İyileştirmeni İstediğim Alanlar

### 1. İlk Açılış Deneyimi

Kullanıcı ekranı açtığında ilk 20-30 saniyede şunu anlayabilmeli:

- önce belge tipini seç
- sonra şablon adını gir
- sonra alan veya tablo ekle
- sonra canvas üzerinde konumlandır
- sonra sağ panelden ayarla
- sonra kaydet

Gerekirse çok hafif ama kurumsal bir başlangıç rehberi, açıklama bandı veya empty state guidance kullan.

### 2. Üst Bilgi ve Komut Alanı

Şu alanlar daha iyi hiyerarşik hale getirilmeli:

- rule type
- title
- default state
- page count
- preset seçimi
- save / update
- cancel / geri dön
- undo / redo
- grid / snap / yardımcı editör araçları

Buradaki amaç:

- “şablon bilgileri” ile
- “editör komutları” ile
- “kalıcı aksiyonlar”

birbirinden net ayrışsın.

### 3. Sol Panel

Sol panel kullanıcıya şunu net söylemeli:

“Bu şablona hangi öğeleri ekleyebilirim?”

İyileştirme hedefi:

- daha net gruplama
- daha anlaşılır başlıklar
- sık kullanılanların daha görünür olması
- nadir kullanılanların daha sakin sunulması
- gerekiyorsa helper text / tooltip ile öğretici davranış

### 4. Canvas

Canvas ekranın merkezi ve en önemli alanı.

Bu alan:

- daha baskın görünmeli
- daha temiz hissedilmeli
- boşken kullanıcıyı yönlendirmeli
- aktif sayfa bilgisini net vermeli
- A4 çalışma yüzeyi daha profesyonel görünmeli

Canvas etrafındaki yardımcı açıklamalar ve durumlar kullanıcıyı desteklemeli.

### 5. Sağ Panel / Inspector

Sağ panel şu soruya cevap vermeli:

“Seçtiğim öğeyi şimdi nasıl ayarlayacağım?”

Bu yüzden:

- temel ayarlar üstte
- tipografi ayrı
- boyut ve konum ayrı
- renk ve görünüm ayrı
- tablo özel ayarları ayrı
- visibility/conditional logic ayrı
- ileri seviye ayarlar gerekirse collapse içinde olabilir

Panel daha taranabilir, daha az yorucu ve daha mantıksal sırada olmalı.

### 6. Layers ve Yardımcı Paneller

Katmanlar paneli güçlü ama destekleyici araç gibi hissetmeli.

Şunlara dikkat et:

- seçili öğe daha net vurgulansın
- layer item’larında öğe tipi hızlı anlaşılsın
- canvas ile layer seçimi arasındaki bağ güçlensin
- gereksiz kalabalık azalırken işlev kaybolmasın

### 7. Kurumsal Görsel Dil

İstenen his:

- ciddi
- ürünleşmiş
- eğitim gerektirmeden kullanılabilir
- güçlü ama kontrollü
- teknik ama insan dostu

İstenmeyen his:

- rastgele kartlaşmış admin panel
- her şeyin aynı anda bağırdığı karmaşa
- sadece geliştiricinin anlayacağı araç paneli
- güzel ama işlevi bulanık tasarım

## Önemli Ürün İlkesi

Bu ekran “şık” olmaktan çok “anlaşılır ve kullanılabilir” olmalı.

Yani hedef:

- sadece görsel modernizasyon değil
- gerçek kullanım kolaylığı
- düşük bilişsel yük
- ilk kullanımda yön bulma
- aynı anda power-user gücünü koruma

“Aptal kullanıcı bile mantığını kavrasın ama uzman kullanıcı da hiçbir şeyi kaybetmesin” seviyesinde düşün.

## İstediğim Çalışma Sırası

Şu sırayla ilerle:

1. Mevcut ekranın UX problemlerini kısa ve net maddelerle analiz et
2. Ekranın gerçek kullanım akışını özetle
3. Önerdiğin yeni bilgi mimarisini anlat
4. Hangi parçaları özellikle koruyacağını belirt
5. Sonra kodu gerçekten uygula
6. Sonunda:
   - hangi dosyalara dokunduğunu yaz
   - hangi davranışları bilinçli olarak koruduğunu söyle
   - hangi kullanıcı problemlerini çözdüğünü özetle
7. Build/test çalıştır ve sonucu yaz

## Başarı Kriteri

İyi sonuç şu olmalı:

- kullanıcı ekranı açınca ne yaptığını daha hızlı anlar
- temel akışlar daha net görünür
- editör daha kurumsal görünür
- canvas daha güçlü hissedilir
- paneller daha iyi organize olur
- hiçbir önemli yetenek kaybolmaz
- save/create/update akışı bozulmaz

Şimdi bu ekranı dosyalardan okuyup gerçekten anla, ardından mevcut yapıyı bozmadan daha kurumsal ve kolay kullanılır hale getir.

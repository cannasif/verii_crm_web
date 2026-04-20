# Opus Prompt: `pdf-report-designer/create` Ekranını Daha Kurumsal ve Kolay Kullanılır Hale Getir

Sen kıdemli bir React + TypeScript + ürün UX odaklı frontend mühendisisin. Görevin mevcut yapıyı baştan yazmak değil; ekranın gerçek amacını anlayıp mevcut mimariyi bozmadan daha anlaşılır, daha kurumsal ve daha yönlendirici bir hale getirmek.

## Görev Bağlamı

- Uygulama: `verii_crm_web`
- İncelenecek ekran: `https://crm.v3rii.com/pdf-report-designer/create`
- Ana sayfa dosyası:
  - `/Users/cannasif/Documents/V3rii/verii_crm_web/src/features/pdf-report-designer/pages/PdfReportDesignerCreatePage.tsx`
- Ana bileşenler:
  - `/Users/cannasif/Documents/V3rii/verii_crm_web/src/features/pdf-report-designer/components/PdfA4Canvas.tsx`
  - `/Users/cannasif/Documents/V3rii/verii_crm_web/src/features/pdf-report-designer/components/PdfSidebar.tsx`
  - `/Users/cannasif/Documents/V3rii/verii_crm_web/src/features/pdf-report-designer/components/PdfInspectorPanel.tsx`
  - `/Users/cannasif/Documents/V3rii/verii_crm_web/src/features/pdf-report-designer/components/PdfLayersPanel.tsx`
  - `/Users/cannasif/Documents/V3rii/verii_crm_web/src/features/pdf-report-designer/store/usePdfReportDesignerStore.ts`
- İlgili veri dönüşüm katmanı:
  - `/Users/cannasif/Documents/V3rii/verii_crm_web/src/features/pdf-report-designer/utils/dto-to-canvas.ts`
- İlgili API/use-case hook’ları:
  - `/Users/cannasif/Documents/V3rii/verii_crm_web/src/features/pdf-report-designer/hooks/useCreatePdfReportTemplate.ts`
  - `/Users/cannasif/Documents/V3rii/verii_crm_web/src/features/pdf-report-designer/hooks/useUpdatePdfReportTemplate.ts`
  - `/Users/cannasif/Documents/V3rii/verii_crm_web/src/features/pdf-report-designer/hooks/usePdfReportTemplateById.ts`
  - `/Users/cannasif/Documents/V3rii/verii_crm_web/src/features/pdf-report-designer/hooks/usePdfReportTemplateFields.ts`

## Bu Ekranın Asıl Amacı Ne?

Bu ekran sıradan bir form değil. Bu ekran bir PDF şablon üretim aracı.

Kullanıcı burada:

1. Belgenin tipini seçer
   - örn. Talep, Teklif, Sipariş, Hızlı Teklif, Aktivite
2. Şablonun temel üst bilgisini oluşturur
   - başlık
   - belge tipi
   - varsayılan mı
   - sayfa sayısı
   - layout preset
3. Sol panelden alanları, tabloları, görselleri ve diğer öğeleri sürükleyip A4 canvas üzerine bırakır
4. Sağ panelden seçilen öğenin özelliklerini düzenler
   - font
   - boyut
   - konum
   - kenarlık
   - görünürlük kuralları
   - tablo detayları
   - görsel ayarları
5. Katmanlar paneliyle hangi elemanın seçili olduğunu ve sırasını yönetir
6. Sonunda bu tasarımı backend’e kaydeder

Yani bu ekranın ana hedefi:

- kullanıcıya bir PDF belge tasarımını kod yazmadan kurgulatmak
- bunu farklı belge tiplerine bağlamak
- baskı / export kalitesine yakın bir A4 düzeni vermek
- reusable template oluşturmayı sağlamak

## Şu An Neden Zor Hissettiriyor?

Bu ekran fonksiyonel olarak güçlü ama ilk kullanım deneyimi zor. Bunun başlıca nedenleri:

1. Form + editör + alan paleti + canvas + inspector + layers aynı anda yükleniyor
2. Kullanıcı ilk girişte “önce ne yapacağım?” sorusunun cevabını hemen hissedemiyor
3. En kritik bilgiler ile ileri seviye araçlar aynı görsel ağırlıkta sunuluyor
4. Canvas güçlü ama rehbersiz hissettiriyor
5. Sağ panel ve sol panel çok şey yapıyor ama görev dağılımı yeterince öğretici değil
6. Bu ekran uzman kullanıcı için güçlü, yeni kullanıcı için yorucu

## Özellikle Anlaman Gereken İşleyiş

Bu ekranın çalışma modeli şöyle:

- `react-hook-form` üst bilgileri yönetiyor
- canvas içindeki öğeler store üzerinden yönetiliyor
- kullanıcı öğe ekledikçe store güncelleniyor
- save anında canvas öğeleri DTO’ya çevrilip backend’e gönderiliyor
- edit ve create aynı temel altyapıyı paylaşıyor
- route create olsa da ekran aslında tam bir tasarım stüdyosu gibi çalışıyor

Bu yüzden ekranı basitleştirirken gücü azaltma. Ama gücü daha iyi organize et.

## Ana Hedef

Bu ekranı:

- daha kurumsal
- daha sakin
- ilk kullanımda daha öğretici
- daha az korkutucu
- daha net görev akışına sahip
- daha profesyonel editör hissi veren

bir yapıya dönüştür.

Ama şunları bozma:

- mevcut store mimarisi
- drag & drop davranışı
- create/edit ortak çalışma mantığı
- API payload yapısı
- form validasyon yapısı
- localization yapısı

## Tasarım ve UX Beklentileri

### 1. Ekran İlk Açıldığında Kullanıcı Ne Yapacağını Anlamalı

İlk 20-30 saniyelik deneyim iyileştirilmeli.

Kullanıcı şunu sezebilmeli:

- önce belge tipini ve şablon adını belirle
- sonra alan ekle
- sonra canvas üzerinde yerleştir
- sonra sağ panelden ayarla
- sonra kaydet

Gerekirse bu akışı çok hafif bir onboarding bandı, step hint veya empty-state rehberiyle ver.

### 2. Üst Kısım Yeniden Hiyerarşik Olmalı

Şu bölümler net ayrışmalı:

- şablon kimliği / temel bilgiler
- editör araçları
- kaydetme aksiyonu

Özellikle:

- `rule type`
- `title`
- `default`
- `page count`
- `layout preset`

alanları profesyonel bir düzen içinde grupla.

`Save/Create/Update` aksiyonu her zaman baskın ve net olsun.

### 3. Canvas Merkezde Daha Güçlü Hissettirmeli

Canvas bu ekranın kalbi. O yüzden:

- çevresindeki yardımcı bilgiler daha iyi düzenlenmeli
- sayfa bilgisi daha net görünmeli
- aktif sayfa hissi artmalı
- boş canvas durumunda kullanıcıya ne yapacağı söylenmeli
- A4 çalışma alanı daha “tasarım yüzeyi” gibi hissettirmeli

### 4. Sol Panel Daha Öğretici Olmalı

Sol panel şu soruyu cevaplamalı:

“Buradan ne ekleyebilirim?”

Bu yüzden:

- alanlar daha mantıklı gruplanmalı
- section başlıkları daha açıklayıcı olmalı
- sık kullanılan öğeler üstte olabilir
- nadir kullanılanlar daha aşağıda veya daha sakin görünebilir
- gerekirse kısa helper text veya tooltip kullanılabilir

### 5. Sağ Panel Daha Yorgunluk Azaltan Bir Yapıda Olmalı

Sağ panel şu soruyu cevaplamalı:

“Seçili öğeyi şimdi nasıl ayarlayacağım?”

Beklenen yapı:

- temel ayarlar üstte
- tipografik ayarlar ayrı
- konum / boyut ayrı
- görünürlük / conditional logic ayrı
- ileri seviye seçenekler collapse olabilir

Bu panel özellikle daha taranabilir hale gelmeli.

### 6. Katmanlar Paneli Daha Net Bir Yardımcı Araç Olmalı

Katmanlar güçlü ama şu anda ana deneyime fazla yakın hissedebilir. Şunları iyileştir:

- seçili öğeyi daha net vurgula
- eleman tipi hızlı anlaşılmalı
- layer sıralama ve seçme deneyimi daha net olmalı
- canvas ile layer panel arasındaki bağ hissedilmeli

### 7. Ekran Bir “Kurumsal Tasarım Aracı” Gibi Hissettirmeli

İstenen ton:

- ciddi
- sakin
- ürünleşmiş
- onboarding’i olan
- eğitim gerektirmeden anlaşılır

İstenmeyen ton:

- aşırı kalabalık
- her şey aynı anda bağıran
- sadece geliştirici için yapılmış araç hissi
- “özellik çok, yönlendirme az” hissi

## Teknik Sınırlar

Şunları koru:

- `react-hook-form`
- `zodResolver`
- `usePdfReportDesignerStore`
- `dtoToPdfCanvasElements`
- `pdfCanvasElementsToDto`
- DnD Kit temelli sürükle-bırak
- mevcut component sınırları, mümkün olduğunca

İzin verilen yaklaşım:

- küçük yardımcı bileşenler çıkarabilirsin
- bilgi mimarisini iyileştirebilirsin
- üst layout’u yeniden organize edebilirsin
- rehber alanları ekleyebilirsin
- spacing, section heading, card hierarchy, toolbar grouping iyileştirebilirsin

Ama büyük bir rewrite yapma.

## Çalışma Şekli

Şu sırayla ilerle:

1. Önce mevcut ekranın kullanıcı açısından neden zor olduğunu kısa maddelerle analiz et
2. Sonra bu ekranın gerçek kullanım akışını özetle
3. Sonra yeni bilgi mimarisini öner
4. Sonra kodu uygula
5. Sonunda:
   - hangi dosyaları değiştirdiğini yaz
   - hangi davranışları bilinçli olarak koruduğunu belirt
   - kullanıcı açısından hangi noktaları kolaylaştırdığını özetle

## Başarı Kriteri

İyi sonuç şu hissi vermeli:

- “Bu ekran ne yaptığını daha iyi anlatıyor”
- “İlk kez kullanan biri daha az zorlanır”
- “Profesyonel bir PDF şablon editörü gibi duruyor”
- “Güçlü özellikler duruyor ama daha düzenli görünüyor”
- “Create ekranı artık karmaşık değil, rehberli”

Şimdi kodu incele, önce mevcut yapıyı anla, sonra bu hedeflere göre ekranı geliştir.

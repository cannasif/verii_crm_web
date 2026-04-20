# Opus Prompt: `pdf-report-designer/edit/25` Kurumsal UX İyileştirmesi

Sen kıdemli bir React + TypeScript + UX odaklı frontend mühendisisin. Var olan ekranı baştan yazmak için değil, mevcut mimariyi anlayıp bozmadan daha kurumsal, daha anlaşılır ve daha kolay kullanılabilir hale getirmek için çalışıyorsun.

## Proje Bağlamı

- Uygulama: `verii_crm_web`
- İyileştirilecek ekran: `https://crm.v3rii.com/pdf-report-designer/edit/25`
- Ana sayfa dosyası:
  - `/Users/cannasif/Documents/V3rii/verii_crm_web/src/features/pdf-report-designer/pages/PdfReportDesignerCreatePage.tsx`
- İlgili ana bileşenler:
  - `/Users/cannasif/Documents/V3rii/verii_crm_web/src/features/pdf-report-designer/components/PdfA4Canvas.tsx`
  - `/Users/cannasif/Documents/V3rii/verii_crm_web/src/features/pdf-report-designer/components/PdfSidebar.tsx`
  - `/Users/cannasif/Documents/V3rii/verii_crm_web/src/features/pdf-report-designer/components/PdfInspectorPanel.tsx`
  - `/Users/cannasif/Documents/V3rii/verii_crm_web/src/features/pdf-report-designer/components/PdfLayersPanel.tsx`
  - `/Users/cannasif/Documents/V3rii/verii_crm_web/src/features/pdf-report-designer/store/usePdfReportDesignerStore.ts`

## Mevcut Durum Özeti

Bu ekran şu anda güçlü ama yoğun bir editör:

- Sol tarafta alan/öğe paleti var
- Ortada A4 canvas var
- Sağ tarafta inspector/properties alanı var
- Katmanlar, undo/redo, snap to grid, çok sayfalı çalışma ve sürükle-bırak desteği var
- Form alanları ile canvas düzenleme aynı ekranda birleşmiş durumda

Teknik olarak güçlü ama kullanıcı deneyimi açısından şu riskleri taşıyor:

- İlk açılışta kognitif yük yüksek
- Araç çubukları ve yardımcı paneller aynı önemde görünüyor
- Yeni başlayan kullanıcı için “önce ne yapmalıyım?” sorusu yeterince net değil
- Özellikler kuvvetli ama hiyerarşi zayıf; hangi alan ana, hangisi ileri seviye net değil
- Kurumsal his yerine “araç dolu ama yönlendirmesi zayıf editör” hissi oluşabiliyor

## Ana Hedef

Ekranı daha kurumsal, daha net, daha sakin ve daha yönlendirici yap.

Ama bunu yaparken:

- mevcut veri modelini bozma
- mevcut store yapısını bozma
- mevcut API entegrasyonlarını bozma
- drag/drop davranışını bozma
- canvas mantığını bozma
- edit/create akışını bozma
- mevcut field binding, layer, inspector, save/update davranışını bozma

Yani istenen şey “rewrite” değil, “guided enhancement”.

## Tasarım ve UX İlkeleri

Şu prensipleri uygula:

1. İlk 30 saniyelik kullanım deneyimini iyileştir.
2. Kullanıcıya hangi adımla başlaması gerektiğini açıkça hissettir.
3. En sık kullanılan aksiyonları öne çıkar, ileri seviye ayarları görsel olarak ikinci plana al.
4. Görsel karmaşayı azalt ama gücü azaltma.
5. Daha kurumsal bir editör hissi ver:
   - net bilgi hiyerarşisi
   - daha iyi spacing
   - daha sakin renk dengesi
   - daha anlamlı bölüm başlıkları
   - daha okunabilir form ve toolbar
6. “Power user” özellikleri dursun ama novice kullanıcıyı korkutmasın.

## Özellikle Beklenen İyileştirmeler

Şunları özellikle değerlendir ve mümkünse uygula:

### 1. Üst Alan / Komut Bölgesi

- Üst kısımdaki form ve aksiyon alanını daha kurumsal hale getir
- Belge tipi, başlık, layout preset, page count, default gibi alanların görsel hiyerarşisini iyileştir
- Save / Update aksiyonunu daha baskın ve net yap
- Undo / Redo / Snap to Grid gibi editör araçlarını mantıklı bir gruplama ile sun
- “Bu ekran bir tasarım editörü” hissini daha net ver

### 2. Rehberli Başlangıç Deneyimi

- Kullanıcı ilk girişte ne yapacağını daha iyi anlamalı
- Gerekirse “Başlamak için 3 adım” benzeri hafif ama kurumsal bir yönlendirme alanı ekle
- Smart start blokları varsa onları daha iyi konumlandır
- İlk kullanımda en sık akışlar görünür olmalı:
  - belge tipi seç
  - başlık ver
  - alan ekle
  - tablo ekle
  - kaydet

### 3. Sol Panel

- Alan/öğe paletini daha anlaşılır hale getir
- Gruplamaları daha net yap
- Gereksiz yoğunluk varsa sadeleştir
- Etiketler, tooltip’ler, bölüm isimleri daha profesyonel ve açıklayıcı olsun

### 4. Canvas Deneyimi

- Canvas çevresindeki boşluk, çerçeve, başlık ve yardımcı ipuçlarını iyileştir
- Çok sayfalı yapı varsa kullanıcının hangi sayfada olduğunu daha rahat anlamasını sağla
- Canvas ana çalışma alanı olarak daha baskın ve temiz görünmeli

### 5. Sağ Panel / Inspector

- Property alanını daha iyi kategorize et
- Sık kullanılan ayarlar üstte, ileri seviye ayarlar daha aşağıda veya collapse yapıda olabilir
- Form alanları ve property editörleri daha okunabilir ve daha az yorucu olmalı

### 6. Katmanlar ve Gelişmiş Paneller

- Katmanlar paneli ile inspector çakışıyorsa bilgi mimarisini iyileştir
- Kullanıcının seçili elemanı daha net hissetmesini sağla
- Seçim durumu, odak, aktif panel, aktif element ilişkisi daha görünür olsun

## Korunması Gerekenler

Bunları bozma:

- `react-hook-form` akışı
- `zodResolver` doğrulama yapısı
- `usePdfReportDesignerStore` state yaklaşımı
- `usePdfReportTemplateById`, `useCreatePdfReportTemplate`, `useUpdatePdfReportTemplate`
- `dtoToPdfCanvasElements`, `pdfCanvasElementsToDto`
- DnD kit kullanımı
- mevcut route mantığı
- mevcut localization yapısı

## Kod Kalitesi Beklentisi

- Büyük kırıcı refactor yapma
- Mümkün olduğunca mevcut component sınırları içinde ilerle
- Gerekirse küçük yardımcı alt bileşenler çıkar ama dosya yapısını kaotik hale getirme
- Stil iyileştirmeleri proje diline uyumlu olsun
- Tailwind sınıflarında anlamsız tekrar üretme
- Var olan tasarımı “AI slop” hale getirme; ciddi, temiz, ürünleşmiş his versin

## Çıktı Beklentisi

Şu sırayla ilerle:

1. Önce mevcut ekranın UX problemlerini kısa maddelerle tespit et
2. Sonra önerdiğin bilgi mimarisi değişikliklerini yaz
3. Sonra kodu uygula
4. Sonunda hangi dosyalarda neyi iyileştirdiğini özetle
5. Var olan davranışların hangilerini bilinçli olarak koruduğunu belirt

## Başarı Kriteri

İyi sonuç şuna benzer olmalı:

- daha kurumsal
- daha sakin
- ilk kullanımda daha anlaşılır
- profesyonel editör hissi veren
- mevcut işlevleri bozmayan
- kaydet/güncelle/düzenle akışını koruyan

Şimdi dosyaları incele, mevcut yapıyı anla, ardından ekranı bu hedeflere göre geliştir.

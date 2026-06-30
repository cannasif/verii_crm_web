# AI Report Builder Playbook

Bu dokuman CRM Report Builder'in dogal dil ile rapor uretmeye hazir hale gelmesi icin referans kontrattir. Amac, kullanici "su kolonlar olsun, su KPI gelsin, grafik olsun" dediginde AI'in mevcut Report Builder semasina guvenli bir JSON plan uretmesidir.

## Neden Gerekli

Mevcut Report Builder zaten rapor olusturmak icin yeterli bir cekirdege sahip:

- API: `/api/reportbuilder/connections`, `/datasources`, `/datasources/check`, `/preview`, create/update/list.
- Backend config: `ReportConfig` icinde `chartType`, `axis`, `values`, `legend`, `filters`, `sorting`, `datasetParameters`, `calculatedFields`.
- Frontend config: backend config'e ek olarak coklu `widgets`, KPI/table/chart appearance, dashboard metadata.
- Preview engine: SQL'i AI yazmiyor; backend schema whitelist uzerinden SELECT/GROUP/FILTER/ORDER uretir.

Eksik olan parca, dogal dil istegini bu guvenli config modeline cevirecek AI planlayici katmanidir.

## Senior Mimari

AI dogrudan SQL uretmemeli ve calistirmamali. AI yalnizca `ReportPlan` JSON'u uretmeli.

AI raporlari ham tablo veya rastgele sistem view'lari uzerinden kurulmamalidir. Raporlanabilir veri kaynaklari onceden hazirlanmis, is anlamlari belirgin AI-ready SQL kaynaklari olmali:

- `RII_AI_VW_*`: Parametresiz, genel rapor veri setleri icin view.
- `RII_AI_FN_*`: Kullanici, sube, tarih araligi, para birimi, temsilci, musteri veya benzeri parametre isteyen rapor veri setleri icin table-valued function.

Bu ayrim sayesinde AI "hangi tabloyu gezeyim?" diye tahmin yapmaz; yalnizca rapor uretmeye hazir semantic source'lar arasindan secer.

Akis:

1. Kullanici istegi alinir.
2. Sistem mevcut baglantilari, data source listesini ve secilen data source schema bilgisini AI baglamina verir.
3. AI strict JSON schema ile `ReportPlan` dondurur.
4. Backend plan validasyonu yapar:
   - dataSource whitelist icinde mi?
   - kolonlar schema icinde mi?
   - aggregation numeric/string/date semantigine uygun mu?
   - filtre operatorleri izinli mi?
   - chartType destekleniyor mu?
   - KPI/table/chart kurallari tamam mi?
5. Plan `ReportConfig` + `widgets` yapisina deterministik cevrilir.
6. `/api/reportbuilder/preview` ile on izleme alinir.
7. Basarili ise kullaniciya "taslak rapor" olarak gosterilir; kullanici onaylarsa kaydedilir.

Bu tasarimda AI hatali kolon uydursa bile backend validasyonu gecemez.

## Mevcut Report Builder Yetenekleri

Desteklenen grafik tipleri:

- `table`
- `bar`
- `stackedBar`
- `line`
- `pie`
- `donut`
- `kpi`
- `matrix`

Desteklenen aggregation:

- `sum`
- `count`
- `avg`
- `min`
- `max`

Desteklenen filtre operatorleri:

- `eq`
- `ne`
- `gt`
- `gte`
- `lt`
- `lte`
- `contains`
- `startswith`
- `endswith`
- `in`
- `between`

Desteklenen calculated field islemleri:

- `add`
- `subtract`
- `multiply`
- `divide`

Dataset parameter source:

- `literal`
- `currentUserId`
- `currentUserEmail`
- `today`
- `now`

## AI Report Plan JSON Kontrati

AI ciktisi asagidaki yapiya uymali. Bu yapi direkt DB'ye yazilmaz; once backend tarafinda Report Builder config'ine cevrilir.

```json
{
  "intent": "create_report",
  "confidence": 0.82,
  "report": {
    "name": "Aylik Satis Performansi",
    "description": "Satis temsilcisi bazinda teklif, siparis ve toplam tutar analizi.",
    "connectionKey": "crm",
    "dataSourceType": "view",
    "dataSourceName": "dbo.vw_sales_performance"
  },
  "widgets": [
    {
      "title": "Toplam Siparis",
      "chartType": "kpi",
      "values": [{ "field": "GrandTotal", "aggregation": "sum", "label": "Toplam Siparis" }],
      "filters": [],
      "appearance": {
        "kpiFormat": "currency",
        "backgroundStyle": "card",
        "kpiLayout": "split"
      }
    },
    {
      "title": "Aylik Satis Trendi",
      "chartType": "line",
      "axis": { "field": "OrderDate", "dateGrouping": "month", "label": "Ay" },
      "values": [{ "field": "GrandTotal", "aggregation": "sum", "label": "Satis" }],
      "sorting": { "by": "axis", "direction": "asc" },
      "filters": []
    },
    {
      "title": "Temsilci Bazinda Satis",
      "chartType": "bar",
      "axis": { "field": "SalesRepName", "label": "Satis Temsilcisi" },
      "values": [{ "field": "GrandTotal", "aggregation": "sum", "label": "Toplam" }],
      "sorting": { "by": "value", "direction": "desc", "valueField": "GrandTotal" },
      "filters": []
    }
  ],
  "questionsForUser": []
}
```

## AI Sistem Prompt Taslagi

```text
Sen V3RII CRM Report Builder planlayicisisin.
Gorevin kullanici istegini mevcut Report Builder semasina uygun, guvenli bir ReportPlan JSON'una cevirmektir.

Kurallar:
- SQL yazma.
- Sadece verilen dataSource ve schema icindeki kolonlari kullan.
- Kolon uydurma.
- Chart type yalnizca: table, bar, stackedBar, line, pie, donut, kpi, matrix.
- KPI icin en az 1 numeric value gerekir; axis/legend kullanma.
- Bar/line/pie/donut/stackedBar/matrix icin en az 1 axis veya legend ve en az 1 value gerekir.
- Numeric kolonlarda varsayilan aggregation sum; id/code/no alanlarinda count tercih edilir.
- Date kolonlarinda kullanici "aylik/yillik/gunluk" dediyse dateGrouping kullan.
- Kullanici tarih araligi istediyse between filtresi kullan.
- Emin degilsen `questionsForUser` icinde kisa soru sor; gecersiz rapor uydurma.
- Cikti sadece JSON olsun.
```

## Yardimci AI Sohbet Akisi

Rapor AI tek seferde "raporu yaptim" dememeli. Kullanici rapor ihtiyacini net anlatmadiysa rehber gibi ilerlemelidir. Bu katman kullanicinin is dilini rapor diline cevirir.

Baslangic mesaji ornegi:

```text
Hangi konuda rapor hazirlamak istersiniz? Musteri, teklif, siparis, talep, stok, aktivite, cari bakiye veya onay surecleri uzerinden ilerleyebilirim. Isterseniz KPI, grafik ve detay tablo olarak birlikte tasarlayalim.
```

Sohbet akisi:

1. Kullanici hedefi soyler.
   - Ornek: "Bu ay satis temsilcisi performans raporu istiyorum."
2. AI uygun AI-ready source adaylarini bulur.
   - Ornek: `RII_AI_FN_SalesRepPerformance`.
3. AI kaynakta donen alanlari sade dille anlatir.
   - Ornek: "Bu kaynak temsilci, teklif tutari, siparis tutari, aktivite sayisi, bekleyen onay adedi ve tarih alanlarini donduruyor."
4. AI rapor tasarimi sorularini sorar.
   - Hangi KPI'lar ustte olsun?
   - Hangi kolonlar detay tabloda gorunsun?
   - Grafik hangi kirilima gore olsun? Temsilci, musteri, ay, durum?
   - Tarih araligi ne olsun?
   - Para birimi veya sube filtresi gerekli mi?
5. Kullanici secim yaptikca AI bir taslak ozet gosterir.
6. Kullanici onaylarsa `ReportPlan` uretilir ve preview calisir.
7. Mevcut kaynak yetmezse `DataSourceProposal` uretilir.

Bu akista AI'in cevap tipi serbest metin olmamali; frontend'in UI olusturabilmesi icin her cevap structured olmalidir. Ornek cevap modeli ayri `ai-report-assistant-turn.schema.json` dosyasinda tutulur.

### Yardimci AI Davranis Kurallari

- Kullanici belirsiz konusursa once konu ve hedef metrikleri sor.
- Kullanici "satis raporu" derse teklif/siparis/talep ayrimini sor.
- Kullanici "performans" derse temsilci, musteri veya urun bazli mi oldugunu sor.
- Kullanici "KPI olsun" derse KPI adaylari oner.
- Kullanici "grafik olsun" derse chart adaylari ve kirilim alanlari oner.
- Kullanici "kolonlar su olsun" derse sadece kaynak schema'sinda olan kolonlari kabul et.
- Kaynakta olmayan alan icin sessizce uydurma; yeni `RII_AI_*` source gerektigini soyle.
- Kullaniciya teknik kolon adini dayatma; displayName ve aciklama kullan.
- Her adimda "devam edelim mi / preview alalim mi" gibi net aksiyon sun.

### Basic AI Icin Uygulama Modeli

Ilk surum asiri karmasik olmamali. Mevcut projeye uygun minimum parcalar:

1. `ReportBuilderAiController`
   - `POST /api/reportbuilder/ai/start`
   - `POST /api/reportbuilder/ai/continue`
   - `POST /api/reportbuilder/ai/preview-plan`
2. `ReportBuilderSemanticContextService`
   - AI-ready kaynaklari listeler.
   - Schema, kolon aciklamasi ve business terms bilgisini verir.
3. `ReportBuilderAssistantService`
   - Kullanici mesajini alir.
   - Structured assistant turn dondurur.
   - Gerekirse kaynak onerir veya rapor plani uretir.
4. `ReportPlanValidator`
   - AI ciktisini schema ve Report Builder kataloguna gore validate eder.
5. Frontend "AI ile rapor olustur" paneli
   - Chat UI.
   - Field/KPI/chart onerilerini secilebilir chip/card olarak gosterir.
   - Preview sonucu gelmeden raporu kaydetmez.

### Assistant Tool Mantigi

AI'in kullanabilecegi uygulama fonksiyonlari sunlar olmali:

| Tool | Amac |
| --- | --- |
| `list_ai_report_sources` | `RII_AI_VW_*` ve `RII_AI_FN_*` kaynaklarini is terimleriyle getirir. |
| `get_report_source_schema` | Secilen kaynagin kolonlarini, tiplerini ve aciklamalarini getirir. |
| `suggest_report_design` | Kullanici hedefinden KPI/chart/table onerileri uretir. |
| `validate_report_plan` | ReportPlan'i backend kurallariyla dogrular. |
| `preview_report_plan` | Mevcut preview engine ile sonuc dondurur. |
| `propose_ai_source` | Eksik view/function ihtiyacini standart proposal'a cevirir. |

OpenAI function calling/tool calling dokumanlari bu model icin uygundur: model uygulama fonksiyonlarini JSON schema ile cagirir, uygulama ise gercek veri ve validasyon isini yapar.

### Internetteki BI Copilot Urunlerinden Cikarilan Ek Gelistirmeler

Power BI Copilot, Tableau Pulse ve Looker semantik model yaklasimindan CRM'e tasinmasi gereken pratikler:

1. Semantic model hazirligi zorunlu olmalı.
   - AI'a sadece tablo/kolon listesi vermek yetmez.
   - Her kaynak icin business terms, kolon aciklamasi, ornek sorular, varsayilan aggregation ve veri kalite notlari tutulmali.
2. Metrik tanimi ayri yasamali.
   - "Ciro", "bekleyen teklif", "onay bekleyen is", "aktivite tamamlama orani" gibi kavramlar tek yerde tanimli olmali.
   - KPI'lar rastgele sum/count degil, onayli metric catalog uzerinden secilmeli.
3. Rehberli analiz kullanilmali.
   - Tableau Pulse benzeri sekilde kullaniciya "bu metriği takip et", "neden degisti", "hangi kirilim etkiledi" gibi sonraki sorular onerilmeli.
4. Aciklanabilirlik olmali.
   - AI her rapor onerisi icin "neden bu kaynak", "neden bu KPI", "neden bu chart" bilgisini dondurmeli.
5. Yetki ve governance rapor seviyesinde korunmali.
   - AI sadece kullanicinin gorebildigi source/field/metric'leri onermeli.
   - Kaydedilen raporda hangi AI planindan olustugu audit trail olarak tutulmali.
6. Evaluation set olmadan canliya verilmemeli.
   - Her modul icin dogal dil test istekleri ve beklenen source/field/chart sonuclari yazilmali.
   - AI degisikligi yapildiginda bu test seti tekrar calismali.

### Metric Catalog

AI rapor asistaninin KPI uydurmamasi icin `Metric Catalog` gerekir. Bu katalog DB tablosu, JSON dosyasi veya backend seed'i olarak tutulabilir.

Onerilen metrik modeli:

```json
{
  "metricKey": "sales.order_total",
  "displayName": "Toplam Siparis Tutari",
  "description": "KDV dahil siparis genel toplami.",
  "domain": "sales",
  "sourceName": "dbo.RII_AI_FN_SalesDocuments",
  "field": "GrandTotal",
  "aggregation": "sum",
  "format": "currency",
  "allowedBreakdowns": ["SalesRepName", "CustomerName", "DocumentDate", "CurrencyCode"],
  "defaultFilters": [
    { "field": "DocumentType", "operator": "eq", "value": "Order" }
  ],
  "synonyms": ["ciro", "siparis tutari", "satis tutari", "toplam siparis"]
}
```

Ilk CRM metric katalog onerileri:

| Metric Key | Gosterim | Domain | Varsayilan Mantik |
| --- | --- | --- | --- |
| `sales.quotation_total` | Toplam Teklif Tutari | sales | Teklif genel toplam sum |
| `sales.order_total` | Toplam Siparis Tutari | sales | Siparis genel toplam sum |
| `sales.pending_approval_count` | Onay Bekleyen Is Adedi | approval | Bekleyen onay count |
| `sales.conversion_rate` | Tekliften Siparise Donusum | sales | Siparis adedi / teklif adedi |
| `activity.completed_count` | Tamamlanan Aktivite | activity | Tamamlanan aktivite count |
| `activity.completion_rate` | Aktivite Tamamlanma Orani | activity | Tamamlanan / toplam aktivite |
| `customer.balance` | Cari Bakiye | customer360 | ERP bakiye son durum |
| `stock.available_balance` | Depo Bakiyesi | stock | Stok depo miktari |
| `discount.effective_rate` | Efektif Iskonto Orani | sales | Kademeli iskonto hesabi |

Metric catalog olmadan AI yalniz kolon adlarina bakarak KPI secer; bu da musteriye yanlis rapor gosterebilir.

### Insight ve Follow-up Sorular

Rapor olustuktan sonra AI sadece "rapor hazir" dememeli. Kullaniciya analitik devam sorulari sunmali:

- "Bu raporu satis temsilcisine gore kirmak ister misiniz?"
- "Son 6 ay trendini line chart olarak ekleyebilirim."
- "En yuksek bakiyeli 10 cariyi tabloya ekleyebilirim."
- "Bu KPI icin onceki aya gore degisim karti ister misiniz?"
- "Bu raporu her pazartesi size gostermek icin favori rapor yapabiliriz."

Bu akisa `InsightSuggestion` denir. Ilk surumda sadece rule-based uretilmesi yeterlidir; LLM sadece metni daha dogal hale getirebilir.

### AI Rapor Audit Trail

Her AI rapor denemesi izlenmeli:

| Alan | Amac |
| --- | --- |
| `RequestText` | Kullanici ne istedi? |
| `AssistantTurnJson` | AI hangi sorulari/onerileri dondurdu? |
| `ReportPlanJson` | Hangi plan uretildi? |
| `DataSourceProposalJson` | Yeni kaynak onerdiyse ne onerdi? |
| `ValidationResult` | Backend hangi kurallardan gecirdi? |
| `PreviewStatus` | Preview basarili mi? |
| `CreatedReportId` | Kayit olustuysa hangi rapor? |
| `UserId` / `BranchCode` | Yetki ve izleme icin. |

Bu audit hem hata ayiklama hem de musteriye "AI bu raporu su veri kaynagindan, su alanlarla olusturdu" diyebilmek icin gerekir.

### Evaluation Test Set

Canliya cikmadan once en az su dogal dil istekleri test edilmeli:

| Test | Beklenen |
| --- | --- |
| "Bu ay temsilci bazinda teklif ve siparis tutari" | `SalesDocuments` source, 2 KPI, temsilci bar chart |
| "Onay bekleyen teklifler kimde bekliyor" | approval source, approver/status fields |
| "Cari bakiyesi en yuksek 20 musteri" | customer ledger/source, balance metric, table |
| "Son 6 ay aktivite trendi" | activity source, month grouping, line chart |
| "Stok grup koduna gore depo bakiyesi" | stock source, group code axis, balance sum |
| "Tekliften siparise donusum oranı" | conversion metric, numerator/denominator aciklamasi |

Her test icin beklenen `sourceName`, `fields`, `metrics`, `chartType` ve sorulmasi gereken clarification sorulari belirlenmeli.

### Basic AI'dan Senior AI'a Yol Haritasi

1. Rehberli sohbet ve schema tabanli cevap.
2. AI-ready source katalogu.
3. Metric catalog.
4. ReportPlan validator ve mapper.
5. Preview ile kullanici onayi.
6. DataSourceProposal ve SQL registry.
7. Audit trail.
8. Evaluation test seti.
9. Insight/follow-up onerileri.
10. Favori/planli rapor ve bildirim entegrasyonu.

## AI PDF Builder Katmani

Rapor AI'in bir sonraki seviyesi PDF build katmanidir. Kullanici "bana bu raporu PDF olarak tasarla, ustte KPI, ortada chart, altta tablo olsun; kurumsal tema olsun" dediginde AI mevcut PDF Designer modeline uygun bir `PdfLayoutPlan` uretmelidir.

Mevcut projede PDF icin hazir temel:

- Web route: `/pdf-report-designer`, `/pdf-report-designer/create`, `/pdf-report-designer/edit/:id`.
- API module: `PdfBuilder`.
- Template model: `ReportTemplateData` icinde `page`, `elements`, `layoutKey`, `layoutOptions`.
- Element tipleri: `text`, `field`, `image`, `shape`, `container`, `note`, `summary`, `quotationTotals`, `table`.
- Table options: repeat header, page break, dense mode, group footer, detail rows, continuation pages.
- Visibility rules ve conditional style rules.
- Field palette: Demand/Quotation/Order header, line ve exchange rate field'lari.
- Table preset yonetimi.

AI burada PDF binary uretmemeli. AI sadece mevcut designer'in anlayacagi layout plan uretmeli; backend/frontend bunu template JSON'a deterministic cevirmeli.

### PDF AI Akisi

1. Kullanici rapor/PDF amacini anlatir.
2. AI belge tipini sorar veya secer:
   - Talep
   - Teklif
   - Siparis
   - Genel rapor PDF'i
   - Dashboard/yonetim ozeti
3. AI mevcut field palette'i okur.
4. Kullaniciya alanlari sade dille anlatir:
   - "Header'da musteri, belge no, tarih, temsilci, toplamlar var."
   - "Satir tablosunda stok kodu, urun adi, miktar, birim fiyat, iskonto, KDV ve genel toplam var."
5. AI layout hedefini sorar:
   - Tek sayfa teklif mi?
   - Cok satirli detay tablo mu?
   - KPI kartli yonetim raporu mu?
   - Musteriye gonderilecek kurumsal PDF mi?
6. AI `PdfLayoutPlan` uretir.
7. Validator koordinat, tasma, path, tablo kolonlari ve page budget kontrollerini yapar.
8. Template preview/render alinir.
9. Kullanici onaylarsa PDF template kaydedilir.

### PDF Tasarim Kurallari

- AI absolute koordinat uretirken A4 mm olcusunu esas almali: 210 x 297.
- Her element sayfa sinirlari icinde kalmali.
- Header, content ve footer bolgeleri cakismamali.
- Table genisligi sayfa icerigini asmamali.
- Uzun metin alanlarinda `textOverflow` veya auto-height davranisi tanimlanmali.
- Satir tablosu cok satirli ise repeat header ve continuation page ayarlari olmali.
- Para alanlari saga hizali, tarih alanlari kisa formatli, metin alanlari sola hizali olmali.
- Musteriye giden PDF'lerde teknik field path gosterilmemeli.
- Logo ve kurumsal renkler tema token'larindan gelmeli.
- QR, barkod, imza, onay bilgisi gibi alanlar opsiyonel block olarak dusunulmeli.
- Tum path'ler `ReportTemplateFieldsDto` icindeki gercek alanlardan secilmeli.

### PDF Template Tipleri

| Template Tipi | Kullanim | Onerilen Layout |
| --- | --- | --- |
| Musteri Teklif PDF | Musteriye gonderilecek teklif | Logo, musteri/belge kutusu, satir tablosu, toplamlar, notlar, imza |
| Siparis Uretim PDF | Uretimin gorecegi belge | Satir tablosu buyuk, profil/demir/vida/baski/aciklama alanlari belirgin |
| Ic Onay PDF | Yonetim/onay sureci | KPI kartlari, iskonto/toplam/kar marji, onay akisi |
| Cari Ekstre PDF | Cari hareket/bakiye | Bakiye KPI, hareket tablosu, vade/belge no/aciklama |
| Satis Performans PDF | Yonetim raporu | KPI kartlari, grafik snapshot, temsilci/musteri tablo |

### AI PDF Tasarim Presetleri

AI PDF Builder ilk surumda serbest koordinat uydurmak yerine onayli preset'lerden birini secmeli. Bu hem daha guvenli render verir hem de kullanicinin "biraz daha kurumsal", "kapakli olsun", "uretim gorecek" gibi taleplerini hizli karsilar.

| Preset | Kullanici Niyeti | Tasarim Davranisi |
| --- | --- | --- |
| `corporate` | Standart teklif/siparis PDF'i | Kurumsal header, musteri/belge bilgisi, okunakli satir tablosu ve toplamlar. |
| `cover` | "Fotografi kapak yap", "gorselli teklif" | Header/banner gorsel, okunurluk icin bilgi paneli, musteriye gonderilebilir sunum hissi. |
| `compact` | "Cok satir var", "az yer kaplasin" | Daha kucuk font, yogun tablo, daha fazla satir kapasitesi, sade toplam alani. |
| `production` | "Uretim gorecek", "imalat/sevkiyat icin" | Satir aciklamalari, profil/demir/vida/baski gibi kalem bilgileri ve uretim not paneli daha belirgin. |
| `premium` | "Yonetim/premium/prestijli" | Koyu header, daha guclu hiyerarsi, teklif ozeti ve marka algisi daha baskin. |

Preset secim kurali:

- Kullanici "kapak", "fotograf", "gorsel", "logo" derse `cover`.
- "Cok satir", "kompakt", "az yer", "detay tablo" derse `compact`.
- "Uretim", "imalat", "atolye", "sevkiyat" derse `production`.
- "Premium", "yonetim", "prestij" derse `premium`.
- Belirsiz istekte varsayilan `corporate`.

AI cevap modeli `selectedPdfPreset` degerini state icinde tasimali; final layout plani ise `ai-pdf-layout-plan.schema.json` icindeki `layoutPreset` alanini doldurmalidir.

### AI PDF Tool Mantigi

| Tool | Amac |
| --- | --- |
| `list_pdf_template_fields` | Belge tipi icin kullanilabilir header/line/exchange field'lari getirir. |
| `list_pdf_table_presets` | Hazir tablo presetlerini getirir. |
| `suggest_pdf_layout` | Kullanici amacina gore layout bloklari onerir. |
| `validate_pdf_layout_plan` | Koordinat, path, table width ve tasma kontrolleri yapar. |
| `map_pdf_layout_to_template` | PdfLayoutPlan'i mevcut `ReportTemplateData` JSON'una cevirir. |
| `render_pdf_preview` | Template'i ornek data ile PDF/PNG preview'a cevirir. |

### AI PDF Plan Ornegi

```json
{
  "intent": "create_pdf_template",
  "documentType": "Quotation",
  "title": "Kurumsal Teklif PDF",
  "page": { "width": 210, "height": 297, "unit": "mm" },
  "theme": {
    "preset": "corporate",
    "primaryColor": "#1f3a5f",
    "accentColor": "#e91e63"
  },
  "sections": [
    {
      "key": "header",
      "height": 38,
      "blocks": [
        { "type": "image", "role": "logo", "x": 12, "y": 10, "width": 38, "height": 16 },
        { "type": "field", "label": "Teklif No", "path": "OfferNo", "x": 150, "y": 10, "width": 45, "height": 8 },
        { "type": "field", "label": "Tarih", "path": "OfferDate", "x": 150, "y": 20, "width": 45, "height": 8 }
      ]
    },
    {
      "key": "content",
      "blocks": [
        { "type": "field", "label": "Musteri", "path": "CustomerName", "x": 12, "y": 45, "width": 90, "height": 10 },
        {
          "type": "table",
          "x": 12,
          "y": 70,
          "width": 186,
          "height": 145,
          "columns": [
            { "label": "Stok Kodu", "path": "Lines.StockCode", "width": 26 },
            { "label": "Urun", "path": "Lines.ProductName", "width": 58 },
            { "label": "Miktar", "path": "Lines.Quantity", "width": 18, "align": "right", "format": "number" },
            { "label": "Birim Fiyat", "path": "Lines.UnitPrice", "width": 26, "align": "right", "format": "currency" },
            { "label": "Toplam", "path": "Lines.LineGrandTotal", "width": 30, "align": "right", "format": "currency" }
          ],
          "tableOptions": { "repeatHeader": true, "pageBreak": "auto", "dense": true }
        },
        { "type": "quotationTotals", "x": 125, "y": 222, "width": 73, "height": 38 }
      ]
    },
    {
      "key": "footer",
      "height": 18,
      "blocks": [
        { "type": "text", "text": "Bu teklif belirtilen sartlarda gecerlidir.", "x": 12, "y": 280, "width": 120, "height": 8 },
        { "type": "pageNumber", "x": 180, "y": 280, "width": 18, "height": 8 }
      ]
    }
  ]
}
```

### PDF Render Kalite Kontrolleri

AI PDF Builder canliya cikmadan once su kontroller otomatik yapilmali:

- Tum elementler sayfa icinde mi?
- Elementler anlamsiz sekilde ust uste biniyor mu?
- Table kolon toplam genisligi table width'i asiyor mu?
- Required path'ler field palette icinde var mi?
- Header/footer repeat davranisi dogru mu?
- Uzun musteri/stok adi tasiyor mu?
- Bos veri geldiginde placeholder veya hide rule dogru mu?
- PDF render sonucu bos sayfa uretmiyor mu?
- Musteriye giden PDF'de test/placeholder metni kalmis mi?

Bu kontroller olmadan AI tasarimi dogrudan default template yapilmamali.

### Rapor AI ve PDF AI Birlesik Akis

1. Kullanici: "Bu ay temsilci performans raporu istiyorum, PDF de olsun."
2. Rapor AI `ReportPlan` uretir.
3. Preview data ve widget ozeti olusur.
4. PDF AI bu preview/wigdet bilgisinden `PdfLayoutPlan` uretir.
5. PDF preview render edilir.
6. Kullanici hem raporu hem PDF layout'u onaylar.
7. Rapor ve PDF template birlikte kaydedilir.

Bu modelde raporun verisi ve PDF'nin sunumu birbirinden ayridir. Veri `ReportPlan`, sunum `PdfLayoutPlan` tarafindan yonetilir.

## AI'a Verilecek Semantic Context

AI'a her istekte su bilgiler verilmeli:

```json
{
  "availableConnections": [
    { "key": "crm", "label": "CRM Ana Veri" }
  ],
  "availableDataSources": [
    {
      "type": "view",
      "name": "dbo.vw_sales_performance",
      "description": "Talep, teklif ve siparis toplamlarini temsilci/musteri/tarih bazinda analiz eder.",
      "businessTerms": ["satis", "teklif", "siparis", "temsilci", "tutar", "ciro"]
    }
  ],
  "schema": [
    {
      "name": "GrandTotal",
      "displayName": "Genel Toplam",
      "semanticType": "number",
      "defaultAggregation": "sum",
      "description": "Belgenin KDV dahil toplam tutari."
    },
    {
      "name": "SalesRepName",
      "displayName": "Satis Temsilcisi",
      "semanticType": "text",
      "defaultAggregation": "count",
      "description": "Belgeyi takip eden satis temsilcisi."
    }
  ]
}
```

Bu semantic context olmadan AI dogru tabloyu veya kolonu secemez. Power BI Copilot dokumanlari da ayni prensibi vurgular: iyi sonuc icin semantik model ve acik alan aciklamalari hazirlanmalidir.

## CRM Domain Semantic Map Baslangici

Bu kisim zamanla buyumeli. AI'in "musteri, teklif, siparis, aktivite" gibi is kelimelerini data source ve kolonlara baglamasi icin kullanilir.

| Kullanici Terimi | Muhtemel Modul | Muhtemel Alanlar | Not |
| --- | --- | --- | --- |
| musteri | Customer | CustomerName, CustomerCode, CustomerType | Cari/potansiyel ayrimi gerekebilir. |
| cari | Customer / ERP Customer | CustomerCode, ErpCode, TaxNumber | ERP karsiligi olan musteri. |
| teklif | Quotation | DocumentNo, RevisionNo, GrandTotal, Status | Teklif listesi ve onay durumu icin. |
| siparis | Order | DocumentNo, GrandTotal, Status, IsERPIntegrated | ERP'ye aktarim raporlari icin. |
| talep | Demand | DocumentNo, GrandTotal, Status | Teklife donusen talepler ayrica izlenebilir. |
| satis temsilcisi | User / SalesRep | RepresentativeId, SalesRepName | Policy/scope etkileyebilir. |
| aktivite | Activity | ActivityType, StartDateTime, AssignedUser | Musteri ziyaret/telefon/toplanti analizi. |
| bakiye | Customer360 / Netsis | Debit, Credit, Balance | ERP hareketleri icin ozel read model gerekir. |
| stok | Stock | StockCode, StockName, GroupCode, SpecialCode1 | Buyuk data oldugu icin paged/fast search sart. |
| iskonto | QuotationLine / OrderLine | Discount1, Discount2, Discount3 | Kademeli iskonto hesabi kullanilir. |

## Validasyon Kurallari

Backend tarafinda AI plani kabul edilmeden once:

- `connectionKey`, `dataSourceType`, `dataSourceName` katalogdan dogrulanmali.
- Tum `axis.field`, `legend.field`, `values.field`, `filters.field`, `sorting.valueField` kolonlari schema'da veya calculatedFields icinde olmali.
- `values` icindeki aggregation numeric olmayan alanlarda `sum/avg/min/max` olamaz; text alanlarda genelde `count` olmali.
- `contains/startswith/endswith` yalniz text kolonlarda onerilmeli.
- `between` tarih ve numeric kolonlarda kullanilmali.
- `dateGrouping` yalniz date/datetime kolonlarda kullanilmali.
- `kpi` widget'inda axis/legend olmamali.
- `pie/donut` icin tek value ve kategorik axis tercih edilmeli.
- Preview basarisizsa rapor kaydedilmemeli; kullaniciya hangi kolon/kural hatali oldugu soylenmeli.

## Uygulama Adimlari

1. API'ye `ReportBuilderAi` modul/servis ekle.
2. `ReportAiPlanRequestDto` ve `ReportAiPlanResponseDto` tanimla.
3. Backend'de katalog ve schema bilgisini toplayan `ReportBuilderSemanticContextService` ekle.
4. AI provider katmani ekle:
   - OpenAI structured outputs veya Azure OpenAI structured outputs.
   - Cikti `ReportPlan` JSON schema ile strict alinmali.
5. `ReportPlanValidator` ekle.
6. `ReportPlanToReportConfigMapper` ekle.
7. Frontend Report Builder'a "AI ile rapor olustur" paneli ekle.
8. Kullanici isteginden taslak plan uret; preview calistir; kullanici onaylarsa kaydet.
9. Her domain icin semantic map'i dokuman + DB metadata ile genislet.
10. Rapor preview ve save flow icin unit/integration test ekle.

### AI PDF Gorsel / Kapak Akisi

Kullanici "bu fotografi kapak yap", "logoyu ustte kullan" veya "bu gorseli rapora ekle" dediginde AI sadece metne bakarak varsayim yapmamali. Frontend once gorseli dosya varligi olarak yuklemeli, sonra AI istegine bu varligi structured sekilde eklemelidir.

1. Frontend dosyayi mevcut PDF asset upload endpoint'ine gonderir.
   - Endpoint: `POST /api/pdf-report-templates/assets/upload`
   - Donen URL veya asset anahtari AI isteginde saklanir.
2. AI chat/draft istegine `uploadedAssets` eklenir.
   - `url`: yuklenen dosya URL'si veya guvenli data URI.
   - `fileName`: kullanici dosya adi.
   - `purpose`: `cover`, `logo`, `inline`, `background` gibi kullanim niyeti.
   - `altText`: erisilebilirlik ve audit icin kisa aciklama.
3. Kullanici mesajinda "kapak yap" veya asset purpose `cover` ise PDF taslagina kontrollu bir header/banner image elementi eklenir.
4. Kapak gorseli tam sayfa arka plana rastgele basilmamalidir; belge numarasi, musteri, tablo ve toplamlar okunur kalmalidir.
5. Preview PDF id uzerinden uretilir:
   - Talep: `DocumentRuleType.Demand`
   - Teklif: `DocumentRuleType.Quotation`
   - Siparis: `DocumentRuleType.Order`
6. Preview basarili render edilmeden template kaydedilmemelidir.

Ornek AI istegi:

```json
{
  "message": "Teklif PDF'i olustur, yukledigim fotografi kapak yap",
  "documentType": "Quotation",
  "entityId": 20301,
  "uploadedAssets": [
    {
      "url": "/uploads/report-builder/cover-001.png",
      "fileName": "cover-001.png",
      "purpose": "cover",
      "altText": "Urun ailesi kapak gorseli"
    }
  ]
}
```

Ornek PDF plan parcasi:

```json
{
  "assetInstructions": [
    {
      "assetKey": "cover-001",
      "usage": "cover",
      "targetSection": "header",
      "imageFit": "cover",
      "opacity": 0.55,
      "note": "Kapak gorseli baslik alaninda okunurlugu bozmayacak sekilde kullanilir."
    }
  ]
}
```

## AI-ready SQL Kaynak Standardi

Report Builder AI ozelligi icin veri kaynagi tasarimi ayri bir katman gibi ele alinmali. Ama bu katman mevcut Report Builder'i bozmaz; sadece AI'in daha dogru ve hizli rapor uretmesini saglar.

### Isimlendirme

| Kaynak Tipi | Isim Formati | Ne Zaman Kullanilir | Ornek |
| --- | --- | --- | --- |
| View | `dbo.RII_AI_VW_<Domain>_<Purpose>` | Parametresiz, genel ve herkes icin ayni veri seti | `dbo.RII_AI_VW_SalesPipeline` |
| Function | `dbo.RII_AI_FN_<Domain>_<Purpose>` | Kullanici/sube/tarih/para birimi gibi parametre gerekiyorsa | `dbo.RII_AI_FN_SalesPerformance` |

### View Ne Zaman?

View, raporun veri kapsami parametresiz okunabiliyorsa tercih edilir:

- Genel stok listesi.
- Genel teklif/siparis ozetleri.
- Aktivite tip dagilimi.
- Musteri segment listesi.

View icinde kolonlar rapor diline yakin isimlendirilmelidir. Ornegin `SalesRepName`, `CustomerName`, `DocumentDate`, `GrandTotal`, `CurrencyCode`.

### Function Ne Zaman?

Function, raporun mutlaka dis parametre ile daraltilmasi gerekiyorsa tercih edilir:

- `@CurrentUserId` veya `@CurrentUserEmail` ile policy/satis temsilcisi kapsami.
- `@BranchCode` ile sube kapsami.
- `@StartDate`, `@EndDate` ile tarih araligi.
- `@CurrencyCode` ile doviz bazli KPI.
- `@CustomerId` veya `@SalesRepId` ile 360 raporlari.

Function kullanildiginda `datasetParameters` zorunlu dusunulmelidir. AI bu parametreleri uydurmaz; semantic catalog ona function parametrelerini verir.

### AI Kaynaklari Icin Kolon Kurallari

- Kolon adlari teknik tablo kolonlarindan cok rapor diline yakin olmali.
- Her kolonun `displayName`, `semanticType`, `description`, `defaultAggregation` bilgisi katalogda dolu olmali.
- Tarih kolonlari tek bir standart ile verilmeli: `DocumentDate`, `CreatedDate`, `ApprovedDate` gibi.
- Para kolonlari icin tutar ve para birimi ayri olmasi daha dogru: `GrandTotal`, `CurrencyCode`.
- ID kolonlari raporda gosterilecekse `DocumentId`, `CustomerId` gibi acik olmalı; agregasyonda varsayilan `count` olmalı.
- Buyuk tablolarda view/function altinda gerekli index stratejisi olmadan AI kataloguna acilmamali.

### Ilk AI-ready Kaynak Onerileri

| Kaynak | Tip | Amac |
| --- | --- | --- |
| `dbo.RII_AI_VW_CustomerSummary` | view | Musteri, cari kod, tip, temsilci, bakiye ve son hareket ozetleri. |
| `dbo.RII_AI_FN_SalesDocuments` | function | Talep/teklif/siparisleri kullanici, tarih ve durum parametreleriyle raporlamak. |
| `dbo.RII_AI_FN_SalesRepPerformance` | function | Satis temsilcisi bazinda teklif, siparis, aktivite, onay bekleyen isler ve toplam tutarlar. |
| `dbo.RII_AI_VW_StockSummary` | view | Stok kodu, stok adi, grup kodu, ozel kodlar, birim ve depo bakiyesi. |
| `dbo.RII_AI_FN_CustomerLedger` | function | Cari bazinda ERP hareket/bakiye raporlari. |
| `dbo.RII_AI_VW_ApprovalWorkload` | view | Talep/teklif/siparis onay bekleyen is yukleri. |

Bu kaynaklar olusturulduktan sonra AI'a ham `Quotation`, `Order`, `Stock` gibi teknik tablolar yerine bu kaynaklar tanitilmalidir.

### Eksik Kaynak Varsa Ne Olacak?

Kullanici istegi mevcut AI-ready kaynaklarla karsilanamiyorsa dogru senior akis sudur:

1. AI mevcut kaynaklarla rapor uydurmaz.
2. Istenen kolon/KPI/chart icin hangi yeni kaynak gerektigini `DataSourceProposal` olarak cikarir.
3. Gelistirici veya otomatik backend assistant bu proposal'a gore SQL view/function tasarlar.
4. SQL kaynak EF migration'a baglanmadan, onayli `CREATE OR ALTER VIEW/FUNCTION` script'i olarak uygulanir.
5. Kaynak `ReportingCatalogService` tarafinda listelenebilir hale gelir.
6. Schema okunur, kolon aciklamalari ve semantic metadata dogrulanir.
7. AI ayni kullanici istegini bu yeni kaynakla tekrar `ReportPlan`'a cevirir.

### Migration Yerine Rapor SQL Registry

AI rapor kaynaklari icin EF migration tercih edilmemeli. Sebep: rapor view/function'lari domain entity semasindan farkli yasam dongusune sahiptir; canlida rapor ihtiyacina gore sik guncellenebilir ve EF migration zincirini gereksiz sisirir.

Onerilen yontem:

1. API'de sadece yetkili admin/gelistirici rolune acik `ReportSqlSourceRegistry` akisi bulunur.
2. AI veya gelistirici `DataSourceProposal` uretir.
3. Backend/geliştirici bu proposal'dan SQL script taslagi uretir.
4. Script manuel veya otomatik review'dan gecer.
5. Uygulama `CREATE OR ALTER VIEW` veya `CREATE OR ALTER FUNCTION` ile kaynagi olusturur/gunceller.
6. Uygulanan script hash'i, kaynak adi, versiyon, aciklama, olusturan kullanici ve tarih bir registry tabloda tutulur.
7. Rollback gerekiyorsa onceki script versiyonu tekrar `CREATE OR ALTER` ile uygulanir.

Bu registry EF migration degildir; sadece raporlama katmaninin surum takibidir.

Ornek registry tablo mantigi:

```sql
CREATE TABLE dbo.ReportSqlSourceRegistry (
    Id int IDENTITY(1,1) PRIMARY KEY,
    SourceName nvarchar(256) NOT NULL,
    SourceType nvarchar(20) NOT NULL,
    ScriptHash nvarchar(128) NOT NULL,
    VersionNo int NOT NULL,
    Description nvarchar(500) NULL,
    CreatedBy nvarchar(256) NULL,
    CreatedAt datetime2 NOT NULL DEFAULT SYSUTCDATETIME(),
    IsActive bit NOT NULL DEFAULT 1
);
```

Ornek view uygulama sekli:

```sql
CREATE OR ALTER VIEW dbo.RII_AI_VW_StockSummary
AS
SELECT
    Id AS StockId,
    ErpStockCode AS StockCode,
    StockName,
    UnitCode,
    GroupCode,
    SpecialCode1,
    SpecialCode2
FROM dbo.Stocks
WHERE IsDeleted = 0;
```

Ornek function uygulama sekli:

```sql
CREATE OR ALTER FUNCTION dbo.RII_AI_FN_SalesDocuments
(
    @StartDate date,
    @EndDate date,
    @CurrentUserId int
)
RETURNS TABLE
AS
RETURN
(
    SELECT
        DocumentId,
        DocumentNo,
        DocumentType,
        CustomerName,
        SalesRepName,
        DocumentDate,
        GrandTotal,
        CurrencyCode,
        ApprovalStatus
    FROM dbo.RII_Report_SalesDocumentsBase
    WHERE DocumentDate >= @StartDate
      AND DocumentDate < DATEADD(day, 1, @EndDate)
      AND (@CurrentUserId IS NULL OR SalesRepUserId = @CurrentUserId)
);
```

Guvenlik kurali: AI'in urettigi SQL dogrudan calistirilmaz. `CREATE OR ALTER` yalniz `RII_AI_VW_` ve `RII_AI_FN_` prefix'li kaynaklara izin vermeli; `DROP`, `ALTER TABLE`, `INSERT`, `UPDATE`, `DELETE`, dynamic SQL ve cross database erisim yasaklanmalidir.

Bu asamada yazilacak SQL de rastgele olmamalidir:

- View/function sadece rapor icin gerekli kolonlari donmeli.
- Gereksiz `SELECT *` kullanilmamali.
- Buyuk tablolarda join/filter/order stratejisi ve index ihtiyaci dusunulmeli.
- Function parametreleri `datasetParameters` ile eslesebilecek net isimde olmali.
- Kolon adlari rapor diline yakin olmali; teknik kisaltmalar kullanilmamali.
- Tum yeni kaynaklar `RII_AI_VW_` veya `RII_AI_FN_` prefix'i ile baslamali.

Ornek proposal:

```json
{
  "reason": "Kullanici temsilci bazinda teklif, siparis, aktivite ve bekleyen onay KPI'larini tek raporda istiyor; mevcut kaynaklar bu alanlari tek veri setinde birlestirmiyor.",
  "sourceType": "function",
  "sourceName": "dbo.RII_AI_FN_SalesRepPerformance",
  "parameters": [
    { "name": "StartDate", "semanticType": "date", "required": true },
    { "name": "EndDate", "semanticType": "date", "required": true },
    { "name": "CurrentUserId", "semanticType": "number", "required": true }
  ],
  "columns": [
    { "name": "SalesRepName", "semanticType": "text", "description": "Satis temsilcisi adi." },
    { "name": "QuotationTotal", "semanticType": "number", "defaultAggregation": "sum" },
    { "name": "OrderTotal", "semanticType": "number", "defaultAggregation": "sum" },
    { "name": "ActivityCount", "semanticType": "number", "defaultAggregation": "sum" },
    { "name": "WaitingApprovalCount", "semanticType": "number", "defaultAggregation": "sum" }
  ]
}
```

## Ornek Kullanici Istekleri

```text
Bu ay satis temsilcisi bazinda toplam teklif tutari, siparis tutari ve onay bekleyen teklif adedini gosteren bir rapor yap. Ustte 3 KPI olsun, altta temsilci bazinda bar chart ve detay tablo olsun.
```

```text
Son 6 ayda cari bazinda en cok siparis veren musterileri gormek istiyorum. Musteri, toplam siparis, toplam adet, ortalama iskonto kolonlari olsun. Ilk 20 musteriyi gostersin.
```

```text
Aktivite performans raporu lazim. Temsilci bazinda ziyaret, telefon, toplantı sayisi ve tamamlanma oranı KPI olsun. Aylik trend chart da olsun.
```

## Dikkat Edilecek Noktalar

- Mevcut `AiAssistantInsightService` kural tabanli calisiyor; gercek LLM cagirmiyor. Bu ozellik icin ayri AI provider katmani gerekir.
- Mevcut preview engine `TOP(5000)` ve `CommandTimeout=15` kullaniyor; agir raporlarda ozel indexed view veya rapor view'lari gerekir.
- Raporlar kullanici yetki/policy kapsamindan cikmamali. Data source ya current user parametreli function olmali ya da backend yetki filtresi uygulamali.
- Buyuk stok/musteri datalarinda rapor view'lari indexed/paged/search-ready tasarlanmali.
- AI taslagi dogrudan yayinlanmamali; once preview ve kullanici onayi zorunlu olmali.

## Referans Kaynaklardan Cikarilan Ilkeler

- OpenAI Structured Outputs: model cevabinin JSON Schema'ya uymasini garanti etmek icin kullanilabilir; bu yuzden serbest metin yerine strict schema ile `ReportPlan` ve `AssistantTurn` alinmali. Kaynak: https://platform.openai.com/docs/guides/structured-outputs
- OpenAI tool/function calling: model uygulama fonksiyonlarini cagirmali, fakat gercek veri okuma, validasyon ve preview uygulama tarafinda kalmali. Kaynak: https://platform.openai.com/docs/guides/function-calling
- Power BI Copilot: dogal dil raporlarinda veri hazirligi ve semantic model aciklamalari kritik oldugu icin CRM'de de tablo/kolon aciklamalari, is terimleri ve onayli data source katalogu olmadan dogru rapor beklenmemeli. Kaynak: https://learn.microsoft.com/en-us/power-bi/create-reports/copilot-introduction
- Tableau Pulse: metrik odakli insight/follow-up mantigi rapor AI'ina tasinabilir; rapordan sonra kullaniciya sonraki analiz sorulari onerilmeli. Kaynak: https://help.tableau.com/current/pulse/en-us/
- Looker semantic model: metrik ve dimension tanimlari merkezi bir modelde tutulmali; CRM karsiligi `Metric Catalog` ve AI-ready source katalogudur. Kaynak: https://cloud.google.com/looker/docs/semantic-model

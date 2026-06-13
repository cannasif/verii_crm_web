# ChatGPT Prompt — CRM Erişim Kontrolü Rehberi

Aşağıdaki metni kopyalayıp ChatGPT'ye yapıştırın. İsterseniz `docs/ERISIM_KONTROLU_HIYERARSI_REHBERI_TR.md` dosyasının içeriğini de ek bağlam olarak verin.

---

## Prompt (kopyala-yapıştır)

```
Sen bir kurumsal CRM (Verii CRM) eğitim dokümanı yazarısın. Hedef kitle: satış operasyonu yöneticileri ve IT — kod bilgisi yok, sadece web arayüzü kullanacaklar.

GÖREV:
Türkçe, profesyonel ama samimi bir "Erişim Kontrolü ve Satış Hiyerarşisi Kurulum Rehberi" yaz. PDF veya Word'e aktarılabilir olmalı. Bölümler numaralı, tablolar net, her adımda menü yolu ve URL ver.

TEKNİK MODEL (buna uy — uydurma özellik ekleme):

1) İKİ KATMAN:
   - İzin grupları: hangi sayfaya girer, hangi işlemi yapar (view/create/update/delete)
   - Görünürlük politikaları: o sayfada hangi kayıtları görür
   Kural: "İzin verir, görünürlük sınırlar."

2) ROLLER:
   - Admin: Sistem Yöneticisi izin grubu (isSystemAdmin) — tüm sayfalar ve işlemler, görünürlük ataması gerekmez
   - Yönetici: geniş izin grubu + görünürlük kapsamı "Yönetici hiyerarşisi" (scopeType 2)
   - User (satış temsilcisi): kısıtlı izin grubu + görünürlük "Sadece kendisi" (scopeType 1)

3) YÖNETİCİ AĞACI:
   Kullanıcı Yönetimi ekranındaki "Yönetici" alanı (managerUserId). Yönetici hiyerarşisi bu ağaca dayanır.

4) GÖRÜNÜRLÜK ENTITY'LERİ (her biri ayrı atanır):
   Quotation (Teklif), Demand (Talep), Order (Sipariş), Activity (Aktivite), Salesman360 (Satışçı KPI)
   Kapsamlar: 1=Sadece kendisi, 2=Yönetici hiyerarşisi, 3=İzin grubu, 4=Şirket geneli

5) SATIŞ TEMSİLCİSİ EŞLEŞMESİ:
   Tanımlar > Satış Temsilcisi Eşleştirme — teklif/talep/sipariş listeleri temsilci üzerinden filtrelenir.

6) MÜŞTERİ NOTU:
   Görünürlük entity listesinde Customer yok; müşteri görünürlüğü farklı çalışabilir.

7) DOĞRULAMA:
   Görünürlük Simülatörü — user/entity seç, görünür kullanıcı listesini kontrol et.

MENÜ YOLLARI:
- Erişim Kontrolü > İzin Grupları (/access-control/permission-groups)
- Erişim Kontrolü > Kullanıcı Grup Atamaları (/access-control/user-group-assignments)
- Erişim Kontrolü > Görünürlük Politikaları (/access-control/visibility-policies)
- Erişim Kontrolü > Kullanıcı Görünürlük Atamaları (/access-control/user-visibility-assignments)
- Erişim Kontrolü > Görünürlük Simülatörü (/access-control/visibility-simulator)
- Kullanıcı Yönetimi (/user-management)
- Tanımlar > Satış Temsilcisi Eşleştirme (/definitions/sales-rep-match-management)

İSTENEN BÖLÜMLER:
1. Kapak ve özet (1 sayfa)
2. İki katman modeli (diyagram tarifi — ChatGPT görsel üretebilir)
3. Örnek org şeması: Admin > Bölge Müdürü > Satış Müdürü > Satış Temsilcisi
4. Kurulum sırası (7 adım checklist)
5. İzin grupları — Admin / Yönetici / User için örnek izin listesi (tablo)
6. Görünürlük politikaları — 10 şablon politika tablosu
7. Adım adım UI talimatları (her rol için)
8. Simülatör kullanımı
9. Sık hatalar ve çözümler (tablo)
10. Hızlı referans / karar ağacı
11. Ek: ChatGPT'ye sorulacak 5 örnek soru-cevap

FORMAT:
- Markdown
- Tablolar kullan
- Her bölümde "Beklenen sonuç" kutusu
- Görsel için [DİYAGRAM: açıklama] placeholder'ları ekle (ben sonra görsel üreteceğim)
- Kod bloğu KULLANMA
- Türkçe, net, operasyonel dil

ÖRNEK SENARYO (rehberde işle):
- 1 admin, 2 satış müdürü, 6 satış temsilcisi
- Her müdür 3 temsilciye bağlı
- Temsilci sadece kendi tekliflerini görür
- Müdür kendi + 3 temsilcinin tekliflerini görür
- Admin her şeyi görür
```

---

## Ek ipucu

ChatGPT'ye görsel de istiyorsanız prompt sonuna ekleyin:

```
Ayrıca şu 3 diyagramı DALL-E ile üret:
1) İki katman: İzin grupları vs Görünürlük politikaları
2) Org şeması: Admin > Müdür > User
3) 7 adımlı kurulum akışı
Türkçe etiketler, kurumsal flat tasarım, beyaz arka plan.
```

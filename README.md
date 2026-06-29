VERII_CRM Frontend projesi, müşteri ilişkileri, satış dokümanları, onay akışları, raporlama ve entegrasyon süreçleri için modern, ölçeklenebilir ve sürdürülebilir bir arayüz sağlar.

## Standartlar

- Frontend referans standardı: `docs/CRM_FRONTEND_STANDARD.md`
- Sayfa UI/UX uygulama rehberi: `docs/PAGE_UI_UX_IMPLEMENTATION_GUIDE.md`
- Standart denetçisi: `scripts/check-frontend-standards.mjs`

## Komutlar

```bash
npm run dev
npm run quality
npm run build
```

`quality` komutu lint, i18n namespace kontrolü ve TypeScript typecheck adımlarını birlikte çalıştırır.
Ek olarak debug console ve doğrudan axios kullanımı gibi frontend standart kaçaklarını da kontrol eder.

# Activity Image Management Feature

Bu feature, Activity (Aktivite) kayıtlarına birden fazla resim ekleme, listeleme, güncelleme ve silme işlemlerini sağlar.

## Özellikler

- ✅ Aktiviteye birden fazla resim ekleme
- ✅ Resim listesini görüntüleme (tablo formatında)
- ✅ Resim önizleme
- ✅ Resim URL ve açıklama bilgileri
- ✅ Resim güncelleme
- ✅ Resim silme (onay dialogu ile)
- ✅ URL validasyonu (HTTP/HTTPS kontrolü)
- ✅ Açıklama karakter limiti (500 karakter)
- ✅ URL karakter limiti (1000 karakter)

## Dosya Yapısı

```
src/features/activity-image-management/
├── api/
│   └── activity-image-api.ts          # Backend API istekleri
├── components/
│   ├── ActivityImageTab.tsx           # Ana tab component (liste/tablo görünümü)
│   └── ActivityImageFormDialog.tsx    # Resim ekleme/düzenleme formu
├── hooks/
│   ├── useActivityImages.ts           # Resimleri getirme hook'u
│   ├── useCreateActivityImages.ts     # Yeni resim ekleme hook'u
│   ├── useUpdateActivityImage.ts      # Resim güncelleme hook'u
│   └── useDeleteActivityImage.ts      # Resim silme hook'u
├── types/
│   └── activity-image-types.ts        # TypeScript tipleri ve Zod şemaları
├── utils/
│   └── query-keys.ts                  # TanStack Query cache key'leri
├── index.ts                           # Public exports
└── README.md                          # Bu dosya
```

## Backend Endpoint'leri

### 1. Resim Ekleme (Toplu)
```
POST /api/ActivityImage
Content-Type: application/json

Request Body:
[
  {
    "activityId": 123,
    "resimAciklama": "Açıklama metni (opsiyonel)",
    "resimUrl": "https://example.com/image.jpg"
  }
]

Response: ApiResponse<ActivityImageDto[]>
```

### 2. Aktiviteye Ait Resimleri Getirme
```
GET /api/ActivityImage/by-activity/{activityId}

Response: ApiResponse<ActivityImageDto[]>
```

### 3. Resim Güncelleme
```
PUT /api/ActivityImage/{id}
Content-Type: application/json

Request Body:
{
  "activityId": 123,
  "resimAciklama": "Güncellenmiş açıklama",
  "resimUrl": "https://example.com/updated-image.jpg"
}

Response: ApiResponse<ActivityImageDto>
```

### 4. Resim Silme
```
DELETE /api/ActivityImage/{id}

Response: ApiResponse<object>
```

## DTO Yapıları

### ActivityImageDto
```typescript
{
  id: number;
  activityId: number;
  resimAciklama?: string;      // max 500 karakter
  resimUrl: string;             // required, max 1000 karakter, HTTP/HTTPS
  createdDate?: string;
  updatedDate?: string;
}
```

### CreateActivityImageDto
```typescript
{
  activityId: number;           // required
  resimAciklama?: string;       // max 500 karakter
  resimUrl: string;             // required, max 1000 karakter, HTTP/HTTPS
}
```

### UpdateActivityImageDto
```typescript
{
  activityId: number;           // required
  resimAciklama?: string;       // max 500 karakter
  resimUrl: string;             // required, max 1000 karakter, HTTP/HTTPS
}
```

## Kullanım

### ActivityForm İçinde Entegrasyon

Feature, `ActivityForm` component'ine yeni bir "Resimler" sekmesi olarak entegre edilmiştir:

```tsx
import { ActivityImageTab } from '@/features/activity-image-management';

// ActivityForm içinde:
<Tabs value={activeTab} onValueChange={setActiveTab}>
  <TabsList>
    <TabsTrigger value="details">Detaylar</TabsTrigger>
    <TabsTrigger value="images">Resimler</TabsTrigger>
  </TabsList>
  
  <TabsContent value="details">
    {/* Aktivite form alanları */}
  </TabsContent>
  
  <TabsContent value="images">
    <ActivityImageTab activityId={activity?.id} />
  </TabsContent>
</Tabs>
```

### Bağımsız Kullanım

```tsx
import { ActivityImageTab } from '@/features/activity-image-management';

function MyComponent() {
  const activityId = 123;
  
  return <ActivityImageTab activityId={activityId} />;
}
```

## Validasyon Kuralları

### Resim URL
- **Zorunlu**: Evet
- **Maksimum Uzunluk**: 1000 karakter
- **Format**: Geçerli bir HTTP veya HTTPS URL'i olmalı
- **Örnek**: `https://example.com/images/photo.jpg`

### Açıklama
- **Zorunlu**: Hayır
- **Maksimum Uzunluk**: 500 karakter

## Önemli Notlar

1. **Activity ID Kontrolü**: Resim ekleyebilmek için önce Activity kaydedilmelidir. Eğer Activity henüz kaydedilmemişse (ID yoksa), kullanıcıya "Önce Aktivite Kaydet" uyarısı gösterilir.

2. **Toplu Ekleme**: Backend, birden fazla resmi tek bir istekte kabul edebilir. Frontend şu anda tek tek ekleme yapıyor ancak API toplu eklemeyi destekliyor.

3. **Cache Yönetimi**: TanStack Query kullanılarak otomatik cache yönetimi yapılır. Her create/update/delete işleminden sonra liste otomatik olarak güncellenir.

4. **Resim Önizleme**: Liste görünümünde küçük önizlemeler gösterilir. Eğer resim yüklenemezse placeholder icon gösterilir.

5. **Dil Desteği**: Tüm metinler i18next ile çevrilebilir hale getirilmiştir. Translation key'leri `activity-image:` namespace'i altındadır.

## Gerekli Bağımlılıklar

- `@tanstack/react-query` - API state management
- `react-hook-form` - Form yönetimi
- `zod` - Schema validasyonu
- `@hookform/resolvers` - Zod resolver
- `lucide-react` - İkonlar
- `sonner` - Toast bildirimleri
- `@radix-ui/react-alert-dialog` - Silme onay dialogu

## Translation Keys

```
activity-image:title
activity-image:subtitle
activity-image:addNew
activity-image:addFirst
activity-image:noImages
activity-image:noImagesDescription
activity-image:saveActivityFirst
activity-image:saveActivityFirstDescription
activity-image:loading
activity-image:preview
activity-image:url
activity-image:urlPlaceholder
activity-image:description
activity-image:descriptionPlaceholder
activity-image:create
activity-image:edit
activity-image:createDescription
activity-image:editDescription
activity-image:createSuccess
activity-image:createError
activity-image:updateSuccess
activity-image:updateError
activity-image:deleteSuccess
activity-image:deleteError
activity-image:deleteConfirmTitle
activity-image:deleteConfirmDescription
activity-image:urlRequired
activity-image:urlMaxLength
activity-image:descriptionMaxLength
activity-image:invalidUrl
```

## Test Senaryoları

1. **Yeni Activity Oluşturma**
   - Activity form açıldığında "Resimler" sekmesi görünmeli
   - Activity henüz kaydedilmemişse uyarı mesajı gösterilmeli

2. **Mevcut Activity'ye Resim Ekleme**
   - Activity düzenleme modunda açıldığında resim sekmesi aktif olmalı
   - Yeni resim ekle butonu çalışmalı
   - Form validasyonları doğru çalışmalı
   - Resim başarıyla eklenmeli ve listede görünmeli

3. **Resim Düzenleme**
   - Resim satırındaki düzenle butonu formu açmalı
   - Mevcut veriler form'a yüklenmeli
   - Güncellemeler kaydedilmeli

4. **Resim Silme**
   - Sil butonu onay dialogunu açmalı
   - Onaylandığında resim silinmeli
   - Liste otomatik güncelenmeli

5. **URL Validasyonu**
   - Geçersiz URL'ler hata vermeli
   - HTTP ve HTTPS URL'leri kabul edilmeli
   - Maksimum uzunluk kontrolü yapılmalı

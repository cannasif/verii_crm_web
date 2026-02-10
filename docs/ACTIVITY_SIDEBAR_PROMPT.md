# Sidebar – Aktivite Alanları: Çalışma Mantığı, API, DTO ve URL Dokümantasyonu

Bu belge, React (Vite) CRM uygulamasında **Sidebar > Aktivite** altındaki ekranların çalışma mantığını, hangi DTO ile nereye istek atıldığını, response yapısını, URL ve query parametrelerini Cursor / React prompt olarak kullanılabilecek şekilde eksiksiz tanımlar.

---

## 1. Genel Yapı

- **Base URL:** `VITE_API_URL` veya `/config.json` içindeki `apiUrl`; yoksa `http://localhost:5000`. Tüm API istekleri `@/lib/axios` içindeki `api` instance ile atılır (interceptor ile token eklenir).
- **Tüm API response’ları** şu wrapper ile gelir:
  ```ts
  interface ApiResponse<T> {
    success: boolean;
    message: string;
    exceptionMessage: string;
    data: T;
    errors: string[];
    timestamp: string;
    statusCode: number;
    className: string;
  }
  ```
- Sayfa listeleri **sayfalı (paged)** endpoint’ler kullanır; backend bazen `data` bazen `items` ile dizi döner. Frontend her iki durumu da `PagedResponse<T>` ile normalize eder.

---

## 2. Sidebar Menü ve Rotalar

| Menü metni (sidebar) | Route path | Sayfa component |
|----------------------|------------|------------------|
| Günlük İşler | `/daily-tasks` | `DailyTasksPage` (`features/daily-tasks`) |
| Aktivite Yönetimi | `/activity-management` | `ActivityManagementPage` (`features/activity-management`) |
| Aktivite Tipleri | `/activity-type-management` | `ActivityTypeManagementPage` (`features/activity-type`) |

---

## 3. Aktivite Yönetimi (`/activity-management`)

### 3.1. Amaç ve akış

- Tüm aktiviteleri sayfalı liste halinde gösterir; arama, basit filtre (Tümü / Aktif / Tamamlanan), gelişmiş filtre (kolon + operatör + değer) ve sıralama destekler.
- Yeni aktivite ekleme ve mevcut aktivite düzenleme/silme yapılır.
- Liste **Activity** API’den çekilir; oluşturma/güncelleme/silme aynı API’ye gider.

### 3.2. Liste isteği (GET)

- **URL:** `GET /api/Activity`
- **Query parametreleri:**  
  `pageNumber`, `pageSize`, `sortBy`, `sortDirection`, `filters` (JSON string).
- **filters formatı:** `PagedFilter[]` → `JSON.stringify` ile query’e eklenir.
  ```ts
  interface PagedFilter {
    column: string;   // örn: 'Subject', 'Status', 'StartDateTime'
    operator: string; // örn: 'Contains', 'Equals', 'gte', 'lte'
    value: string;
  }
  ```
- **Kullanılan hook:** `useActivities({ pageNumber, pageSize, sortBy, sortDirection, filters })`  
  → `activityApi.getList(params)` çağrılır.
- **Response:** `ApiResponse<PagedResponse<ActivityDto>>`.  
  `PagedResponse` içinde `data: ActivityDto[]` veya bazen `items: ActivityDto[]` gelir; frontend ikisini de `data` olarak kullanacak şekilde normalize eder.

**ActivityDto (liste ve detay):**

```ts
interface ActivityDto {
  id: number;
  subject: string;
  description?: string;
  activityTypeId: number;
  activityType: ActivityTypeRef;  // { id, name, description?, ... }
  startDateTime: string;          // ISO 8601
  endDateTime?: string;
  isAllDay: boolean;
  status: ActivityStatus | number | string;  // 0=Scheduled, 1=Completed, 2=Cancelled
  priority: ActivityPriority | number | string;  // 0=Low, 1=Medium, 2=High
  assignedUserId: number;
  assignedUser?: { id, fullName?, userName? };
  contactId?: number;
  contact?: { id, firstName?, lastName?, fullName? };
  potentialCustomerId?: number;
  potentialCustomer?: { id, name, customerCode? };
  erpCustomerCode?: string;
  reminders: ActivityReminderDto[];
  activityDate?: string;
  isCompleted?: boolean;
  createdDate: string;
  updatedDate?: string;
  // ... isDeleted, createdBy, updatedBy, createdByFullUser, updatedByFullUser, vb.
}

interface ActivityTypeRef {
  id: number;
  name: string;
  description?: string;
  createdDate?: string;
  updatedDate?: string;
  isDeleted?: boolean;
  createdByFullUser?: string;
  updatedByFullUser?: string;
}

interface ActivityReminderDto {
  id: number;
  activityId: number;
  offsetMinutes: number;
  channel: ReminderChannel;  // 0=InApp, 1=Email, 2=Sms, 3=Push
  sentAt?: string;
  status: ReminderStatus;
  createdDate: string;
  isDeleted: boolean;
}
```

### 3.3. Basit filtreler (sayfa state’i)

- **Arama (searchTerm):** `Subject` üzerinde `Contains` ile aranır → `{ column: 'Subject', operator: 'Contains', value: trimmed }`.
- **Aktif/Tamamlanan:**  
  - Aktif: `Status` `Equals` `0` (Scheduled).  
  - Tamamlanan: `Status` `Equals` `1` (Completed).  
  Bu filtreler `buildSimpleFilters(searchTerm, activeFilter)` ile üretilir ve `apiFilters` içinde gelişmiş filtrelerle birleştirilir.

### 3.4. Gelişmiş filtre (ActivityAdvancedFilter)

- Kullanıcı satırlar ekler: kolon, operatör, değer.  
- İzin verilen kolonlar: `Subject`, `Description`, `PotentialCustomerId`, `ActivityTypeId`, `Priority`, `Status`, `StartDateTime`.  
- String kolonlarda operatörler: `Contains`, `StartsWith`, `EndsWith`, `Equals`.  
- Sayı/tarih kolonlarında: `Equals`, `>`, `>=`, `<`, `<=`.  
- “Uygula” denince `draftFilterRows` → `rowsToBackendFilters(draftFilterRows)` ile `PagedFilter[]` yapılır ve `appliedAdvancedFilters` state’ine yazılır; liste isteği `simpleFilters + appliedAdvancedFilters` ile tekrar atılır.

### 3.5. Detay (tek kayıt) – GET

- **URL:** `GET /api/Activity/{id}`
- **Response:** `ApiResponse<ActivityDto>`
- **Kullanım:** Detay modal veya form doldurma için `useActivity(id)` veya doğrudan `activityApi.getById(id)`.

### 3.6. Oluşturma – POST

- **URL:** `POST /api/Activity`
- **Body:** `CreateActivityDto`
  ```ts
  interface CreateActivityDto {
    subject: string;
    description?: string;
    activityTypeId: number;
    startDateTime: string;   // ISO 8601
    endDateTime?: string;
    isAllDay: boolean;
    status: ActivityStatus | number;
    priority: ActivityPriority | number;
    assignedUserId: number;
    contactId?: number;
    potentialCustomerId?: number;
    erpCustomerCode?: string;
    reminders: CreateActivityReminderDto[];
  }

  interface CreateActivityReminderDto {
    offsetMinutes: number;
    channel: ReminderChannel;
  }
  ```
- Form verisi `ActivityFormSchema` (Zod); `buildCreateActivityPayload(data, { assignedUserIdFallback: user?.id })` ile `CreateActivityDto`’ya çevrilir. `startDateTime`/`endDateTime` ISO string’e çevrilir.
- **Hook:** `useCreateActivity()` → `activityApi.create(payload)`.  
- **Response:** `ApiResponse<ActivityDto>`; `data` yeni aktivite.

### 3.7. Güncelleme – PUT

- **URL:** `PUT /api/Activity/{id}`
- **Body:** `UpdateActivityDto` (alanlar `CreateActivityDto` ile aynı: subject, description, activityTypeId, startDateTime, endDateTime, isAllDay, status, priority, assignedUserId, contactId, potentialCustomerId, erpCustomerCode, reminders).
- Mevcut aktivite + form verisi → sayfa içinde `buildUpdatePayload(data, editingActivity.assignedUserId)` ile DTO üretilir.
- **Hook:** `useUpdateActivity()` → `activityApi.update(id, data)`.  
- **Response:** `ApiResponse<ActivityDto>`.

### 3.8. Silme – DELETE

- **URL:** `DELETE /api/Activity/{id}`
- **Body:** yok.
- **Response:** `ApiResponse<object>`; sadece `success` kontrol edilir.
- **Hook:** `useDeleteActivity()` → `activityApi.delete(id)`.

---

## 4. Aktivite Tipleri (`/activity-type-management`)

### 4.1. Amaç ve akış

- Aktivite tiplerini (ör. Call, Meeting, Task) listeler; client-side arama (isim, açıklama, oluşturan) yapılır.  
- Yeni tip ekleme, düzenleme ve silme vardır.  
- Tüm veri **ActivityType** API’den gelir; istatistik (stats) aynı list endpoint’i ile client’ta hesaplanır.

### 4.2. Liste isteği – GET

- **URL:** `GET /api/ActivityType`
- **Query:** `pageNumber`, `pageSize`, `sortBy`, `sortDirection`, istenirse `filters` (JSON string).
- **Kullanım:** `useActivityTypeList({ pageNumber: 1, pageSize: 10000, sortBy: 'Id', sortDirection: 'desc' })` → `activityTypeApi.getList(params)`.
- **Response:** `ApiResponse<PagedResponse<ActivityTypeDto>>`. Dizi bazen `data` bazen `items`; frontend normalize eder.

**ActivityTypeDto:**

```ts
interface ActivityTypeDto {
  id: number;
  name: string;
  description?: string;
  createdDate: string;
  updatedDate?: string;
  createdBy?: string;
  createdByFullName?: string;
  createdByFullUser?: string;
}
```

### 4.3. Detay – GET

- **URL:** `GET /api/ActivityType/{id}`
- **Response:** `ApiResponse<ActivityTypeDto>`.

### 4.4. Oluşturma – POST

- **URL:** `POST /api/ActivityType`
- **Body:** `CreateActivityTypeDto`
  ```ts
  interface CreateActivityTypeDto {
    name: string;
    description?: string;
  }
  ```
- **Hook:** `useCreateActivityType()` → `activityTypeApi.create(data)`.

### 4.5. Güncelleme – PUT

- **URL:** `PUT /api/ActivityType/{id}`
- **Body:** `UpdateActivityTypeDto` (name, description?).
- **Hook:** `useUpdateActivityType()` → `activityTypeApi.update(id, data)`.

### 4.6. Silme – DELETE

- **URL:** `DELETE /api/ActivityType/{id}`
- **Hook:** `useDeleteActivityType()` → `activityTypeApi.delete(id)`.

### 4.7. İstatistik (stats)

- Ayrı bir backend endpoint yok. `useActivityTypeStats()` içinde `activityTypeApi.getList({ pageNumber: 1, pageSize: 1000 })` çağrılır; gelen listeden client’ta `totalActivityTypes`, `activeActivityTypes`, `newThisMonth` hesaplanır.

---

## 5. Günlük İşler (`/daily-tasks`)

### 5.1. Amaç ve akış

- Kullanıcının günlük/haftalık/takvim görünümünde kendi (veya seçilen kullanıcının) aktivitelerini görmesi, yeni aktivite eklemesi, durum güncellemesi (başlat, beklet, tamamla) ve silmesi.
- Veri kaynağı yine **Activity** API; sadece filtreler ve görünüm (Kartlar / Liste / Takvim; Takvimde Haftalık/Aylık) farklıdır.

### 5.2. Liste isteği – GET

- **URL:** `GET /api/Activity` (activity-api, `useActivities`).
- **Sabit parametreler:**  
  `pageNumber: 1`, `pageSize: 1000`, `sortBy: 'StartDateTime'`, `sortDirection: 'asc'`.
- **Filtreler (tab ve seçimlere göre):**
  - **Status:** `statusFilter !== 'all'` ise `{ column: 'Status', operator: 'eq', value: statusFilter }`.
  - **Kullanıcı:** `assignedUserFilter` varsa `{ column: 'AssignedUserId', operator: 'eq', value: assignedUserFilter.toString() }`.
  - **Kartlar (haftalık görevler):**  
    `StartDateTime` `gte` haftanın pazartesi tarihi (YYYY-MM-DD), `StartDateTime` `lte` pazar tarihi.
  - **Liste (bugün):**  
    `StartDateTime` `eq` bugünün tarihi (YYYY-MM-DD).
  - **Takvim (aylık):**  
    `StartDateTime` `gte` takvim ayının grid başlangıç tarihi, `lte` grid bitiş tarihi (yaklaşık 6 haftalık aralık).
  - **Takvim (haftalık):**  
    `StartDateTime` `gte` seçilen haftanın pazartesi, `lte` pazar (YYYY-MM-DD).

Tarih aralıkları sayfa içinde `getWeekDateRange()`, `getCalendarDateRange()`, `getWeeklyDateRange()` ile hesaplanır; `filters` dizisi oluşturulup `useActivities({ ..., filters })` ile gönderilir.

### 5.3. Response işleme

- Gelen `data.data` (veya `items`) `ActivityDto[]` olarak kullanılır.  
- Her aktivite için `activityDate = activity.activityDate ?? activity.startDateTime`, `isCompleted` (status’e göre) eklenir; liste ve takvim bu zenginleştirilmiş listeyi kullanır.  
- Ek olarak client-side filtre (status, assignedUser, tarih aralığı) tekrar uygulanır; böylece “Kartlar” / “Liste” / “Takvim” görünümleri doğru alt kümeyi gösterir.

### 5.4. Oluşturma – POST

- **URL:** `POST /api/Activity`
- **Body:** `CreateActivityDto`  
  Form `ActivityForm` ile doldurulur; `buildCreateActivityPayload(data, { assignedUserIdFallback: user?.id })` ile DTO üretilir. Takvimden slot/dün tıklanınca form açılıyorsa `initialStartDateTime` / `initialEndDateTime` (veya `initialDate`) ile başlangıç/bitiş doldurulur.
- **Hook:** `useCreateActivity()`.

### 5.5. Güncelleme – PUT (durum değişikliği)

- **URL:** `PUT /api/Activity/{id}`
- **Body:** `UpdateActivityDto`  
  Mevcut aktivite `toUpdateActivityDto(activity, { status: yeniStatus })` ile DTO’ya çevrilir; sadece `status` değişir (ör. Scheduled, Completed, Cancelled).
- **Hook:** `useUpdateActivity()`.

### 5.6. Silme – DELETE

- **URL:** `DELETE /api/Activity/{id}`
- **Hook:** `useDeleteActivity()`.

---

## 6. Özet Tablo: İstekler ve DTO’lar

| Ekran | İşlem | Method | URL | Request body / query | Response |
|-------|--------|--------|-----|----------------------|----------|
| Aktivite Yönetimi | Liste | GET | `/api/Activity?pageNumber=&pageSize=&sortBy=&sortDirection=&filters=` | filters: PagedFilter[] (JSON) | ApiResponse<PagedResponse<ActivityDto>> |
| Aktivite Yönetimi | Detay | GET | `/api/Activity/{id}` | - | ApiResponse<ActivityDto> |
| Aktivite Yönetimi | Oluştur | POST | `/api/Activity` | CreateActivityDto | ApiResponse<ActivityDto> |
| Aktivite Yönetimi | Güncelle | PUT | `/api/Activity/{id}` | UpdateActivityDto | ApiResponse<ActivityDto> |
| Aktivite Yönetimi | Sil | DELETE | `/api/Activity/{id}` | - | ApiResponse<object> |
| Aktivite Tipleri | Liste | GET | `/api/ActivityType?pageNumber=&pageSize=&sortBy=&sortDirection=` | - | ApiResponse<PagedResponse<ActivityTypeDto>> |
| Aktivite Tipleri | Detay | GET | `/api/ActivityType/{id}` | - | ApiResponse<ActivityTypeDto> |
| Aktivite Tipleri | Oluştur | POST | `/api/ActivityType` | CreateActivityTypeDto | ApiResponse<ActivityTypeDto> |
| Aktivite Tipleri | Güncelle | PUT | `/api/ActivityType/{id}` | UpdateActivityTypeDto | ApiResponse<ActivityTypeDto> |
| Aktivite Tipleri | Sil | DELETE | `/api/ActivityType/{id}` | - | ApiResponse<object> |
| Günlük İşler | Liste | GET | `/api/Activity?pageNumber=1&pageSize=1000&sortBy=StartDateTime&sortDirection=asc&filters=` | filters: Status, AssignedUserId, StartDateTime (gte/lte/eq) | ApiResponse<PagedResponse<ActivityDto>> |
| Günlük İşler | Oluştur | POST | `/api/Activity` | CreateActivityDto | ApiResponse<ActivityDto> |
| Günlük İşler | Güncelle | PUT | `/api/Activity/{id}` | UpdateActivityDto | ApiResponse<ActivityDto> |
| Günlük İşler | Sil | DELETE | `/api/Activity/{id}` | - | ApiResponse<object> |

---

## 7. Ortak tipler (genel)

```ts
// @/types/api
interface PagedResponse<T> {
  data: T[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}
```

Backend bazen `items` döndüğünde frontend `data` ile eşleştirir; tüm sayfalarda sonuç `PagedResponse<T>.data` (dizi) üzerinden kullanılır.

Bu doküman, Cursor veya benzeri bir ortamda “Aktivite sidebar ekranları nasıl çalışıyor, hangi DTO ile nereye istek atılıyor?” sorusuna tek referans olarak kullanılabilir; React/Expo prompt’u olarak ekran bazlı genişletilebilir.

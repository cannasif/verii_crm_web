export type SalesDocumentDraftType = 'demand' | 'quotation' | 'order';

export interface SalesDocumentDraftPayload<
  TFormValues = unknown,
  TLine = unknown,
  TExchangeRate = unknown,
  TNotes = unknown,
> {
  formValues: TFormValues;
  lines: TLine[];
  exchangeRates: TExchangeRate[];
  notes: TNotes;
}

export interface SalesDocumentDraftRecord<TPayload = SalesDocumentDraftPayload> {
  key: string;
  userId: string;
  branchCode: string;
  documentType: SalesDocumentDraftType;
  schemaVersion: 1;
  updatedAt: string;
  expiresAt: string;
  payload: TPayload;
}

const DB_NAME = 'verii-crm-sales-document-drafts';
const DB_VERSION = 1;
const STORE_NAME = 'drafts';

let dbPromise: Promise<IDBDatabase> | null = null;

function openDraftDb(): Promise<IDBDatabase> {
  if (typeof indexedDB === 'undefined') {
    return Promise.reject(new Error('IndexedDB is not available.'));
  }

  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'key' });
        store.createIndex('expiresAt', 'expiresAt', { unique: false });
        store.createIndex('userDocument', ['userId', 'branchCode', 'documentType'], { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('IndexedDB open failed.'));
  });

  return dbPromise;
}

function withStore<T>(
  mode: IDBTransactionMode,
  callback: (store: IDBObjectStore) => IDBRequest<T> | void,
): Promise<T | undefined> {
  return openDraftDb().then(
    (db) =>
      new Promise<T | undefined>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, mode);
        const store = tx.objectStore(STORE_NAME);
        const request = callback(store);
        let result: T | undefined;

        if (request) {
          request.onsuccess = () => {
            result = request.result;
          };
          request.onerror = () => reject(request.error ?? new Error('IndexedDB request failed.'));
        }

        tx.oncomplete = () => resolve(result);
        tx.onerror = () => reject(tx.error ?? new Error('IndexedDB transaction failed.'));
        tx.onabort = () => reject(tx.error ?? new Error('IndexedDB transaction aborted.'));
      }),
  );
}

export function buildSalesDocumentDraftKey(params: {
  userId: string | number;
  branchCode?: string | number | null;
  documentType: SalesDocumentDraftType;
}): string {
  const branchCode = params.branchCode === null || params.branchCode === undefined || params.branchCode === ''
    ? 'default'
    : String(params.branchCode);
  return `crm.sales-draft.v1.${params.userId}.${branchCode}.${params.documentType}.create`;
}

export async function getSalesDocumentDraft<TPayload>(
  key: string,
): Promise<SalesDocumentDraftRecord<TPayload> | null> {
  try {
    const record = await withStore<SalesDocumentDraftRecord<TPayload>>('readonly', (store) => store.get(key));
    return record ?? null;
  } catch (error) {
    console.warn('[SalesDraft] Draft read failed.', error);
    return null;
  }
}

export async function putSalesDocumentDraft<TPayload>(
  record: SalesDocumentDraftRecord<TPayload>,
): Promise<void> {
  try {
    await withStore('readwrite', (store) => store.put(record));
  } catch (error) {
    console.warn('[SalesDraft] Draft save failed.', error);
  }
}

export async function deleteSalesDocumentDraft(key: string): Promise<void> {
  try {
    await withStore('readwrite', (store) => store.delete(key));
  } catch (error) {
    console.warn('[SalesDraft] Draft delete failed.', error);
  }
}

export async function deleteExpiredSalesDocumentDrafts(nowIso = new Date().toISOString()): Promise<void> {
  try {
    await withStore('readwrite', (store) => {
      const index = store.index('expiresAt');
      const request = index.openCursor(IDBKeyRange.upperBound(nowIso));
      request.onsuccess = () => {
        const cursor = request.result;
        if (!cursor) return;
        cursor.delete();
        cursor.continue();
      };
      return undefined;
    });
  } catch (error) {
    console.warn('[SalesDraft] Expired draft cleanup failed.', error);
  }
}


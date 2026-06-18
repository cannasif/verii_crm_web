import { getImageUrl } from '@/lib/image-url';

const dataUrlCache = new Map<string, string>();
const inflightRequests = new Map<string, Promise<string | null>>();

async function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Blob okunamadi'));
    reader.readAsDataURL(blob);
  });
}

async function fetchUrlToDataUrl(url: string): Promise<string | null> {
  try {
    const response = await fetch(url, { credentials: 'include' });
    if (!response.ok) return null;
    return blobToDataUrl(await response.blob());
  } catch {
    return null;
  }
}

export function resolveLineImageCacheKey(
  imagePath?: string | null,
  pendingImagePreviewUrl?: string | null,
): string | null {
  const pending = pendingImagePreviewUrl?.trim();
  if (pending) return `pending:${pending}`;

  const remoteUrl = getImageUrl(imagePath);
  if (!remoteUrl) return null;

  return `remote:${remoteUrl}`;
}

export function getCachedLineImageDataUrl(cacheKey: string): string | null {
  return dataUrlCache.get(cacheKey) ?? null;
}

export function setCachedLineImageDataUrl(cacheKey: string, dataUrl: string): void {
  if (dataUrl.startsWith('data:')) {
    dataUrlCache.set(cacheKey, dataUrl);
  }
}

export async function getLineImageDataUrl(
  imagePath?: string | null,
  pendingImagePreviewUrl?: string | null,
): Promise<string | null> {
  const pending = pendingImagePreviewUrl?.trim();
  if (pending?.startsWith('data:')) {
    const cacheKey = resolveLineImageCacheKey(imagePath, pendingImagePreviewUrl);
    if (cacheKey) setCachedLineImageDataUrl(cacheKey, pending);
    return pending;
  }

  const cacheKey = resolveLineImageCacheKey(imagePath, pendingImagePreviewUrl);
  if (!cacheKey) return null;

  const cached = getCachedLineImageDataUrl(cacheKey);
  if (cached) return cached;

  const inflight = inflightRequests.get(cacheKey);
  if (inflight) return inflight;

  const request = (async (): Promise<string | null> => {
    if (pending) {
      return fetchUrlToDataUrl(pending);
    }

    const remoteUrl = getImageUrl(imagePath);
    if (!remoteUrl) return null;

    return fetchUrlToDataUrl(remoteUrl);
  })();

  inflightRequests.set(cacheKey, request);

  try {
    const dataUrl = await request;
    if (dataUrl) {
      setCachedLineImageDataUrl(cacheKey, dataUrl);
    }
    return dataUrl;
  } finally {
    inflightRequests.delete(cacheKey);
  }
}

export function cacheLineImageFromHtmlImage(
  imagePath: string | null | undefined,
  pendingImagePreviewUrl: string | null | undefined,
  img: HTMLImageElement,
): void {
  const cacheKey = resolveLineImageCacheKey(imagePath, pendingImagePreviewUrl);
  if (!cacheKey || !img.complete || img.naturalWidth === 0) return;

  try {
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const context = canvas.getContext('2d');
    if (!context) return;
    context.drawImage(img, 0, 0);
    setCachedLineImageDataUrl(cacheKey, canvas.toDataURL('image/jpeg', 0.9));
  } catch {
    void getLineImageDataUrl(imagePath, pendingImagePreviewUrl);
  }
}

export interface LineImagePrefetchInput {
  imagePath?: string | null;
  pendingImagePreviewUrl?: string | null;
}

export async function prefetchLineImagesForPdf(lines: LineImagePrefetchInput[]): Promise<void> {
  await Promise.all(
    lines.map((line) => getLineImageDataUrl(line.imagePath, line.pendingImagePreviewUrl)),
  );
}

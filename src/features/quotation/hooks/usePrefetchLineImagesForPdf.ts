import { useEffect, useMemo } from 'react';
import {
  prefetchLineImagesForPdf,
  type LineImagePrefetchInput,
} from '@/lib/line-image-data-url-cache';

export function usePrefetchLineImagesForPdf(lines: LineImagePrefetchInput[]): void {
  const signature = useMemo(
    () => lines
      .map((line) => `${line.imagePath ?? ''}|${line.pendingImagePreviewUrl ?? ''}`)
      .join(';;'),
    [lines],
  );

  useEffect(() => {
    if (!signature.replace(/\|/g, '').trim()) return;
    void prefetchLineImagesForPdf(lines);
  }, [lines, signature]);
}

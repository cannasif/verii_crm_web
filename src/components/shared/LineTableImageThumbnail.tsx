import { useEffect, useRef, useState, type ReactElement, type SyntheticEvent } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import {
  cacheLineImageFromHtmlImage,
  getLineImageDataUrl,
} from '@/lib/line-image-data-url-cache';

interface LineTableImageThumbnailProps {
  src: string;
  alt: string;
  imagePath?: string | null;
  pendingImagePreviewUrl?: string | null;
  className?: string;
}

export function LineTableImageThumbnail({
  src,
  alt,
  imagePath,
  pendingImagePreviewUrl,
  className,
}: LineTableImageThumbnailProps): ReactElement {
  const [open, setOpen] = useState(false);
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const closeTimerRef = useRef<number | null>(null);

  useEffect(() => {
    const media = window.matchMedia('(hover: none), (pointer: coarse)');
    const update = (): void => setIsTouchDevice(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    void getLineImageDataUrl(imagePath, pendingImagePreviewUrl ?? src);
  }, [imagePath, pendingImagePreviewUrl, src]);

  const clearCloseTimer = (): void => {
    if (closeTimerRef.current != null) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  };

  const handleMouseEnter = (): void => {
    if (isTouchDevice) return;
    clearCloseTimer();
    setOpen(true);
  };

  const handleMouseLeave = (): void => {
    if (isTouchDevice) return;
    clearCloseTimer();
    closeTimerRef.current = window.setTimeout(() => setOpen(false), 120);
  };

  const handleImageLoad = (event: SyntheticEvent<HTMLImageElement>): void => {
    cacheLineImageFromHtmlImage(imagePath, pendingImagePreviewUrl ?? src, event.currentTarget);
    void getLineImageDataUrl(imagePath, pendingImagePreviewUrl ?? src);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            'shrink-0 overflow-hidden rounded-md border border-zinc-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-500/40 dark:border-zinc-700',
            className,
          )}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          onClick={() => {
            if (isTouchDevice) {
              setOpen((current) => !current);
            }
          }}
          aria-label={alt}
        >
          <img
            src={src}
            alt={alt}
            loading="lazy"
            onLoad={handleImageLoad}
            className="h-10 w-10 object-cover"
          />
        </button>
      </PopoverTrigger>
      <PopoverContent
        side="right"
        align="start"
        sideOffset={8}
        className="w-auto max-w-[min(92vw,320px)] border-slate-200/90 bg-white p-2 shadow-xl dark:border-white/10 dark:bg-zinc-950"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <img
          src={src}
          alt={alt}
          className="max-h-64 max-w-[min(88vw,300px)] rounded-md object-contain"
        />
      </PopoverContent>
    </Popover>
  );
}

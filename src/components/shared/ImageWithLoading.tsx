import {
  type ImgHTMLAttributes,
  type ReactElement,
  type ReactNode,
  type SyntheticEvent,
  useState,
} from 'react';
import { ImageOff } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

type ImageLoadStatus = 'empty' | 'loading' | 'loaded' | 'error';

interface ImageWithLoadingProps
  extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'alt' | 'src'> {
  src: string | null | undefined;
  alt: string;
  containerClassName?: string;
  skeletonClassName?: string;
  fallback?: ReactNode;
  fallbackClassName?: string;
  isSourcePending?: boolean;
  as?: 'div' | 'span';
}

export function ImageWithLoading({
  src,
  alt,
  className,
  containerClassName,
  skeletonClassName,
  fallback,
  fallbackClassName,
  isSourcePending = false,
  as: Container = 'div',
  onLoad,
  onError,
  decoding = 'async',
  ...imageProps
}: ImageWithLoadingProps): ReactElement {
  const normalizedSource = src?.trim() || null;
  const [loadState, setLoadState] = useState<{
    source: string | null;
    status: ImageLoadStatus;
  }>({
    source: normalizedSource,
    status: normalizedSource ? 'loading' : 'empty',
  });

  const resolvedStatus = loadState.source === normalizedSource
    ? loadState.status
    : normalizedSource
      ? 'loading'
      : 'empty';
  const status: ImageLoadStatus = isSourcePending ? 'loading' : resolvedStatus;

  const handleLoad = (event: SyntheticEvent<HTMLImageElement>): void => {
    setLoadState({ source: normalizedSource, status: 'loaded' });
    onLoad?.(event);
  };

  const handleError = (event: SyntheticEvent<HTMLImageElement>): void => {
    setLoadState({ source: normalizedSource, status: 'error' });
    onError?.(event);
  };

  return (
    <Container
      className={cn('relative block overflow-hidden', containerClassName)}
      data-image-state={status}
      aria-busy={status === 'loading'}
    >
      {normalizedSource && status !== 'error' ? (
        <img
          {...imageProps}
          src={normalizedSource}
          alt={alt}
          decoding={decoding}
          className={cn(
            'transition-opacity duration-200',
            status === 'loading' ? 'opacity-0' : 'opacity-100',
            className,
          )}
          onLoad={handleLoad}
          onError={handleError}
        />
      ) : null}

      {status === 'loading' ? (
        <Skeleton
          className={cn('absolute inset-0 h-full w-full rounded-none', skeletonClassName)}
          data-image-loading="true"
          aria-hidden="true"
        />
      ) : null}

      {status === 'empty' || status === 'error' ? (
        fallback ?? (
          <span
            className={cn(
              'flex h-full w-full items-center justify-center bg-muted/70 text-muted-foreground',
              fallbackClassName,
            )}
            data-image-fallback="true"
          >
            <ImageOff className="h-5 w-5" aria-hidden="true" />
            <span className="sr-only">{alt}</span>
          </span>
        )
      ) : null}
    </Container>
  );
}

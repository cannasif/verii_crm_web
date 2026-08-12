import { type ReactElement, type ReactNode } from 'react';
import { ImageWithLoading } from './ImageWithLoading';

interface ProfileImageWithFallbackProps {
  src: string | null;
  alt: string;
  className?: string;
  fallback: ReactNode;
  isLoading?: boolean;
}

export function ProfileImageWithFallback({
  src,
  alt,
  className,
  fallback,
  isLoading = false,
}: ProfileImageWithFallbackProps): ReactElement {
  return (
    <ImageWithLoading
      src={src}
      alt={alt}
      className={className}
      containerClassName="h-full w-full"
      fallback={fallback}
      isSourcePending={isLoading}
    />
  );
}

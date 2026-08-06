import { type ReactElement, type ReactNode, useState } from 'react';

interface ProfileImageWithFallbackProps {
  src: string | null;
  alt: string;
  className?: string;
  fallback: ReactNode;
}

export function ProfileImageWithFallback({
  src,
  alt,
  className,
  fallback,
}: ProfileImageWithFallbackProps): ReactElement {
  const [failedSource, setFailedSource] = useState<string | null>(null);

  if (!src || failedSource === src) {
    return <>{fallback}</>;
  }

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      onError={() => setFailedSource(src)}
    />
  );
}

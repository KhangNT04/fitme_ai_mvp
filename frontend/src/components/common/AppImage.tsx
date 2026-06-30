"use client";

import Image, { type ImageProps } from "next/image";
import { useEffect, useState } from "react";
import { resolveImageSrc, PLACEHOLDER_PRODUCT } from "@/lib/media-url";

type AppImageProps = Omit<ImageProps, "src"> & {
  src?: string | null;
  fallback?: string;
};

/** Image wrapper that normalizes product/upload URLs and falls back safely. */
export function AppImage({ src, fallback = PLACEHOLDER_PRODUCT, alt, onError, ...props }: AppImageProps) {
  const [resolved, setResolved] = useState(() => resolveImageSrc(src, fallback));

  useEffect(() => {
    setResolved(resolveImageSrc(src, fallback));
  }, [src, fallback]);

  return (
    <Image
      src={resolved}
      alt={alt}
      onError={(event) => {
        if (resolved !== fallback) {
          setResolved(fallback);
        }
        onError?.(event);
      }}
      {...props}
    />
  );
}

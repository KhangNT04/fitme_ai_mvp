"use client";

import Image, { type ImageProps } from "next/image";
import { useState } from "react";
import { resolveImageSrc, PLACEHOLDER_PRODUCT } from "@/lib/media-url";

type AppImageProps = Omit<ImageProps, "src"> & {
  src?: string | null;
  fallback?: string;
};

/** Image wrapper that normalizes product/upload URLs and falls back safely. */
export function AppImage({ src, fallback = PLACEHOLDER_PRODUCT, alt, onError, ...props }: AppImageProps) {
  const [useFallback, setUseFallback] = useState(false);
  const resolved = useFallback ? fallback : resolveImageSrc(src, fallback);

  return (
    <Image
      key={resolved}
      src={resolved}
      alt={alt}
      onError={(event) => {
        if (!useFallback) {
          setUseFallback(true);
        }
        onError?.(event);
      }}
      {...props}
    />
  );
}

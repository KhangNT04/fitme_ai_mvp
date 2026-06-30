"use client";

import Image, { type ImageProps } from "next/image";
import { resolveImageSrc } from "@/lib/media-url";

type AppImageProps = Omit<ImageProps, "src"> & {
  src?: string | null;
  fallback?: string;
};

/** Image wrapper that normalizes product/upload URLs and falls back safely. */
export function AppImage({ src, fallback, alt, ...props }: AppImageProps) {
  return <Image src={resolveImageSrc(src, fallback)} alt={alt} {...props} />;
}

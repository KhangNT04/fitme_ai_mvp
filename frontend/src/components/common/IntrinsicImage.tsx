"use client";

import { useState } from "react";
import { ImageOff } from "lucide-react";
import { resolveImageSrc, PLACEHOLDER_PRODUCT } from "@/lib/media-url";
import { cn } from "@/lib/utils";

type IntrinsicImageProps = {
  src?: string | null;
  alt: string;
  className?: string;
  imgClassName?: string;
  /**
   * Ratio used until the real size is known (and as the fallback when the photo
   * cannot be loaded). Without it the box would collapse to zero height.
   */
  fallbackAspectRatio?: number;
  /** Rendered while the photo is loading, so the card does not jump around. */
  placeholderClassName?: string;
  /** Show a "photo unavailable" hint when the image cannot be loaded. */
  showErrorHint?: boolean;
};

/**
 * Image that keeps its own aspect ratio instead of being cropped to a fixed frame.
 *
 * Community photos are user uploads with very different ratios (portrait try-on shots,
 * landscape product shots). `object-cover` inside a fixed `aspect-*` box silently crops
 * them, so the reader loses part of the outfit. This wrapper measures the real size and
 * lets the photo define the box.
 *
 * The box always has a size, even when the photo is missing — a broken upload then shows
 * an empty placeholder instead of collapsing the grid row.
 */
export function IntrinsicImage({
  src,
  alt,
  className,
  imgClassName,
  fallbackAspectRatio = 3 / 4,
  placeholderClassName,
  showErrorHint = false,
}: IntrinsicImageProps) {
  const resolved = resolveImageSrc(src, PLACEHOLDER_PRODUCT);

  // The measuring state lives in a child keyed by the URL: a new photo then starts
  // from scratch without an effect that would reset state on every render.
  return (
    <MeasuredImage
      key={resolved}
      src={resolved}
      alt={alt}
      className={className}
      imgClassName={imgClassName}
      fallbackAspectRatio={fallbackAspectRatio}
      placeholderClassName={placeholderClassName}
      showErrorHint={showErrorHint}
    />
  );
}

function MeasuredImage({
  src,
  alt,
  className,
  imgClassName,
  fallbackAspectRatio,
  placeholderClassName,
  showErrorHint,
}: IntrinsicImageProps & { src: string }) {
  const [ratio, setRatio] = useState<number | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  return (
    <div
      className={cn("relative w-full overflow-hidden bg-muted", className)}
      style={{ aspectRatio: String(ratio ?? fallbackAspectRatio) }}
    >
      {!loaded && !failed ? (
        <div
          className={cn("absolute inset-0 animate-pulse bg-muted", placeholderClassName)}
          aria-hidden="true"
        />
      ) : null}
      {failed && showErrorHint ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 text-muted-foreground">
          <ImageOff className="h-5 w-5" aria-hidden="true" />
          <span className="text-[11px]">Ảnh không tải được</span>
        </div>
      ) : null}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        loading="lazy"
        onLoad={(event) => {
          const image = event.currentTarget;
          // A loaded image with real dimensions gives us the true ratio.
          if (image.naturalWidth && image.naturalHeight) {
            setRatio(image.naturalWidth / image.naturalHeight);
          }
          setLoaded(true);
        }}
        onError={() => setFailed(true)}
        className={cn(
          "absolute inset-0 h-full w-full object-contain",
          // Until the photo arrives the placeholder holds the space.
          !loaded && "opacity-0",
          imgClassName,
        )}
      />
    </div>
  );
}

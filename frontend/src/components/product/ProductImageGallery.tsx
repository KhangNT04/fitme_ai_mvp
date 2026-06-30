"use client";

import { createContext, useContext, useMemo, useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

interface GalleryImage {
  url: string;
  type?: string;
  sortOrder?: number;
}

interface ProductImageGalleryProviderProps {
  images: string[];
  imageDetails?: GalleryImage[];
  alt: string;
  children: React.ReactNode;
}

interface GalleryContextValue {
  gallery: string[];
  active: number;
  setActive: (index: number) => void;
  alt: string;
}

const GalleryContext = createContext<GalleryContextValue | null>(null);

function useGalleryContext() {
  const ctx = useContext(GalleryContext);
  if (!ctx) {
    throw new Error("ProductImageMain/Thumbnails must be used within ProductImageGalleryProvider");
  }
  return ctx;
}

function useGalleryImages(images: string[], imageDetails?: GalleryImage[]) {
  return useMemo(() => {
    const sorted = (imageDetails?.length
      ? [...imageDetails].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)).map((d) => d.url)
      : images) || [];
    return sorted.length ? sorted : images;
  }, [imageDetails, images]);
}

export function ProductImageGalleryProvider({
  images,
  imageDetails,
  alt,
  children,
}: ProductImageGalleryProviderProps) {
  const gallery = useGalleryImages(images, imageDetails);
  const [active, setActive] = useState(0);
  const value = useMemo(() => ({ gallery, active, setActive, alt }), [gallery, active, alt]);

  return <GalleryContext.Provider value={value}>{children}</GalleryContext.Provider>;
}

export function ProductImageMain({ className }: { className?: string }) {
  const { gallery, active, alt } = useGalleryContext();
  const mainUrl = gallery[active] || "/placeholder-product.svg";

  return (
    <div
      className={cn(
        "relative aspect-[4/5] w-full overflow-hidden rounded-2xl bg-muted shadow-sm ring-1 ring-border/40",
        "lg:aspect-auto lg:h-full lg:min-h-0",
        className,
      )}
    >
      <Image
        src={mainUrl}
        alt={alt}
        fill
        className="object-cover object-center"
        unoptimized
        priority
        sizes="(max-width: 1024px) 100vw, 32rem"
      />
    </div>
  );
}

export function ProductImageThumbnails({ className }: { className?: string }) {
  const { gallery, active, setActive, alt } = useGalleryContext();
  if (gallery.length <= 1) return null;

  return (
    <div className={cn("flex gap-2 overflow-x-auto pb-1", className)}>
      {gallery.map((url, index) => (
        <button
          key={`${url}-${index}`}
          type="button"
          onClick={() => setActive(index)}
          className={cn(
            "relative h-20 w-16 shrink-0 overflow-hidden rounded-xl border-2 transition-all",
            active === index
              ? "border-primary ring-2 ring-primary/20"
              : "border-transparent opacity-70 hover:opacity-100",
          )}
        >
          <Image src={url} alt={`${alt} ${index + 1}`} fill className="object-cover" unoptimized />
        </button>
      ))}
    </div>
  );
}

/** Stacked gallery for simple/mobile-only usage. */
export function ProductImageGallery({
  images,
  imageDetails,
  alt,
  className,
}: Omit<ProductImageGalleryProviderProps, "children"> & { className?: string }) {
  return (
    <ProductImageGalleryProvider images={images} imageDetails={imageDetails} alt={alt}>
      <div className={cn("flex flex-col gap-4", className)}>
        <ProductImageMain />
        <ProductImageThumbnails />
      </div>
    </ProductImageGalleryProvider>
  );
}

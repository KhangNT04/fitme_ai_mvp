"use client";

import { useState } from "react";
import Image from "next/image";

interface GalleryImage {
  url: string;
  type?: string;
  sortOrder?: number;
}

interface ProductImageGalleryProps {
  images: string[];
  imageDetails?: GalleryImage[];
  alt: string;
}

export function ProductImageGallery({ images, imageDetails, alt }: ProductImageGalleryProps) {
  const sorted = (imageDetails?.length
    ? [...imageDetails].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)).map((d) => d.url)
    : images) || [];
  const gallery = sorted.length ? sorted : images;
  const [active, setActive] = useState(0);
  const mainUrl = gallery[active] || "/placeholder-product.svg";

  return (
    <div className="space-y-4">
      <div className="relative aspect-[3/4] overflow-hidden rounded-2xl bg-muted shadow-sm ring-1 ring-border/40">
        <Image src={mainUrl} alt={alt} fill className="object-cover" unoptimized priority />
      </div>
      {gallery.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {gallery.map((url, index) => (
            <button
              key={`${url}-${index}`}
              type="button"
              onClick={() => setActive(index)}
              className={`relative h-20 w-16 shrink-0 overflow-hidden rounded-xl border-2 transition-all ${
                active === index ? "border-primary ring-2 ring-primary/20" : "border-transparent opacity-70 hover:opacity-100"
              }`}
            >
              <Image src={url} alt={`${alt} ${index + 1}`} fill className="object-cover" unoptimized />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

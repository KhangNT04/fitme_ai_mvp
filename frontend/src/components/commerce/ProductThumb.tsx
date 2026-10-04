import Link from "next/link";
import { AppImage } from "@/components/common/AppImage";
import { cn } from "@/lib/utils";

interface ProductThumbProps {
  src?: string | null;
  alt: string;
  href?: string;
  className?: string;
}

/** Small square product image used in cart / order lines. */
export function ProductThumb({ src, alt, href, className }: ProductThumbProps) {
  const box = (
    <div className={cn("relative h-20 w-16 shrink-0 overflow-hidden rounded-lg bg-muted sm:h-24 sm:w-20", className)}>
      <AppImage src={src} alt={alt} fill sizes="80px" className="object-cover" />
    </div>
  );
  return href ? (
    <Link href={href} className="shrink-0" aria-label={alt}>
      {box}
    </Link>
  ) : (
    box
  );
}

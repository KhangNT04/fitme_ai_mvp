"use client";

import { usePathname } from "next/navigation";

/** Fixed ambient layer — fashion e-commerce mesh + grain. Hidden on brand/admin portals. */
export function FashionAmbient() {
  const pathname = usePathname();
  const isPortal = pathname.startsWith("/brand") || pathname.startsWith("/admin");

  if (isPortal) return null;

  return (
    <div className="fashion-ambient pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden="true">
      <div className="fashion-mesh" />
      <div className="fashion-orb fashion-orb-1" />
      <div className="fashion-orb fashion-orb-2" />
      <div className="fashion-orb fashion-orb-3" />
      <div className="fashion-grain" />
    </div>
  );
}

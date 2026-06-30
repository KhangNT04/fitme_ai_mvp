"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { handleSamePageNavClick } from "@/lib/scroll-to-top";

type NavScrollLinkProps = React.ComponentProps<typeof Link>;

/** Nav link that scrolls to top when the target route is already active. */
export function NavScrollLink({ href, onClick, ...props }: NavScrollLinkProps) {
  const pathname = usePathname() ?? "/";
  const hrefStr = typeof href === "string" ? href : (href.pathname ?? "/");

  return (
    <Link
      href={href}
      onClick={(e) => {
        handleSamePageNavClick(e, pathname, hrefStr);
        onClick?.(e);
      }}
      {...props}
    />
  );
}

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import {
  portalTableBodyClass,
  portalTableClass,
  portalTableHeadClass,
  portalTableScrollClass,
  portalTableTdClass,
  portalTableThClass,
  portalTableWrapClass,
} from "@/lib/design-tokens";

interface PortalDataTableProps {
  children: ReactNode;
  className?: string;
  /** Show on mobile (default: hidden md+ like legacy portal tables). */
  showOnMobile?: boolean;
}

export function PortalDataTable({ children, className, showOnMobile }: PortalDataTableProps) {
  return (
    <div
      className={cn(
        portalTableWrapClass,
        !showOnMobile && "hidden md:block",
        className,
      )}
    >
      <div className={portalTableScrollClass}>
        <table className={portalTableClass}>{children}</table>
      </div>
    </div>
  );
}

export function PortalDataTableHead({ children }: { children: ReactNode }) {
  return <thead className={portalTableHeadClass}>{children}</thead>;
}

export function PortalDataTableBody({ children }: { children: ReactNode }) {
  return <tbody className={portalTableBodyClass}>{children}</tbody>;
}

export { portalTableTdClass, portalTableThClass };

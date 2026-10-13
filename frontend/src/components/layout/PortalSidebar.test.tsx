import { describe, expect, it } from "vitest";
import { adminNav, brandNav } from "@/lib/portal-nav";
import { adminIcons, brandIcons } from "./PortalSidebar";

describe("PortalSidebar icons", () => {
  it.each(adminNav.map((item) => [item.label, item.href]))("admin item %s has an icon", (_label, href) => {
    expect(adminIcons[href]).toBeDefined();
  });

  it.each(brandNav.map((item) => [item.label, item.href]))("brand item %s has an icon", (_label, href) => {
    expect(brandIcons[href]).toBeDefined();
  });
});

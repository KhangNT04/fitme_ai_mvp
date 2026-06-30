import { describe, expect, it } from "vitest";
import {
  getActiveMobileNavTab,
  isCompactHeader,
  isNavLevel2Route,
  shouldPinBackLink,
  shouldShowBottomNav,
} from "./mobile-chrome";

describe("mobile-chrome", () => {
  describe("shouldShowBottomNav", () => {
    it("shows on consumer hub routes", () => {
      expect(shouldShowBottomNav("/")).toBe(true);
      expect(shouldShowBottomNav("/discover")).toBe(true);
      expect(shouldShowBottomNav("/try-on")).toBe(true);
      expect(shouldShowBottomNav("/try-on/brand/abc")).toBe(true);
      expect(shouldShowBottomNav("/ai/start")).toBe(true);
      expect(shouldShowBottomNav("/profile")).toBe(true);
      expect(shouldShowBottomNav("/products/abc")).toBe(true);
    });

    it("hides on auth, portal, redirect, and wizard routes", () => {
      expect(shouldShowBottomNav("/auth/login")).toBe(false);
      expect(shouldShowBottomNav("/brand/dashboard")).toBe(false);
      expect(shouldShowBottomNav("/admin/dashboard")).toBe(false);
      expect(shouldShowBottomNav("/redirect/loading")).toBe(false);
      expect(shouldShowBottomNav("/ai/body-profile")).toBe(false);
      expect(shouldShowBottomNav("/try-on/input")).toBe(false);
      expect(shouldShowBottomNav("/try-on/result/abc")).toBe(false);
    });
  });

  describe("isCompactHeader", () => {
    it("matches bottom nav visibility on consumer routes", () => {
      expect(isCompactHeader("/discover")).toBe(true);
      expect(isCompactHeader("/ai/body-profile")).toBe(false);
      expect(isCompactHeader("/brand/login")).toBe(false);
    });
  });

  describe("getActiveMobileNavTab", () => {
    it("resolves active tab from pathname", () => {
      expect(getActiveMobileNavTab("/")).toBe("home");
      expect(getActiveMobileNavTab("/discover")).toBe("discover");
      expect(getActiveMobileNavTab("/products/x")).toBe("discover");
      expect(getActiveMobileNavTab("/products/x", { preferTryOn: true })).toBe("tryon");
      expect(getActiveMobileNavTab("/ai/start")).toBe("ai");
      expect(getActiveMobileNavTab("/try-on")).toBe("tryon");
      expect(getActiveMobileNavTab("/try-on/brand/abc")).toBe("tryon");
      expect(getActiveMobileNavTab("/discover/brand/abc")).toBe("discover");
      expect(getActiveMobileNavTab("/wardrobe")).toBe("profile");
      expect(getActiveMobileNavTab("/saved-outfits")).toBe("profile");
    });

    it("returns null when bottom nav is hidden", () => {
      expect(getActiveMobileNavTab("/auth/login")).toBeNull();
    });
  });

  describe("shouldPinBackLink", () => {
    it("does not pin on level-2 hub routes", () => {
      expect(shouldPinBackLink("/discover")).toBe(false);
      expect(shouldPinBackLink("/try-on")).toBe(false);
      expect(shouldPinBackLink("/profile")).toBe(false);
      expect(shouldPinBackLink("/ai/start")).toBe(false);
      expect(shouldPinBackLink("/auth/login")).toBe(false);
    });

    it("pins on deeper routes", () => {
      expect(shouldPinBackLink("/products/abc")).toBe(true);
      expect(shouldPinBackLink("/try-on/input")).toBe(true);
      expect(shouldPinBackLink("/profile/privacy")).toBe(true);
      expect(shouldPinBackLink("/ai/body-profile")).toBe(true);
      expect(shouldPinBackLink("/auth/forgot-password")).toBe(true);
    });

    it("classifies hub routes as level 2", () => {
      expect(isNavLevel2Route("/wardrobe")).toBe(true);
      expect(isNavLevel2Route("/try-on/result/abc")).toBe(false);
    });
  });
});

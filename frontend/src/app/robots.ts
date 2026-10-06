import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site-config";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/brand", "/api", "/auth", "/profile"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}

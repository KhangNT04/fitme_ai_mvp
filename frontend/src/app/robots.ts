import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site-config";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/brand", "/api", "/auth", "/profile", "/checkout", "/cart"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}

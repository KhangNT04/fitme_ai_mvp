import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site-config";

const PUBLIC_ROUTES: Array<{ path: string; priority: number; changeFrequency: "daily" | "weekly" | "monthly" }> = [
  { path: "/", priority: 1, changeFrequency: "weekly" },
  { path: "/discover", priority: 0.9, changeFrequency: "daily" },
  { path: "/try-on", priority: 0.8, changeFrequency: "weekly" },
  { path: "/ai/start", priority: 0.8, changeFrequency: "monthly" },
  { path: "/pricing", priority: 0.7, changeFrequency: "monthly" },
  { path: "/contact", priority: 0.4, changeFrequency: "monthly" },
  { path: "/privacy-policy", priority: 0.3, changeFrequency: "monthly" },
  { path: "/terms", priority: 0.3, changeFrequency: "monthly" },
];

export default function sitemap(): MetadataRoute.Sitemap {
  return PUBLIC_ROUTES.map((route) => ({
    url: `${SITE_URL}${route.path}`,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));
}

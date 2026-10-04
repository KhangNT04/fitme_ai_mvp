/** Public contact details, configured per deployment (Vercel env). */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://fitme-ai-mvp.vercel.app").replace(/\/$/, "");
export const SUPPORT_EMAIL = process.env.NEXT_PUBLIC_SUPPORT_EMAIL ?? "";
export const SUPPORT_PHONE = process.env.NEXT_PUBLIC_SUPPORT_PHONE ?? "";
export const FANPAGE_URL = process.env.NEXT_PUBLIC_FANPAGE_URL ?? "";

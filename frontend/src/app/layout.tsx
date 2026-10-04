import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { Providers } from "@/providers";
import { ConsumerChrome } from "@/components/layout/ConsumerChrome";
import { FashionAmbient } from "@/components/layout/FashionAmbient";
import { AnalyticsScripts } from "@/components/analytics/AnalyticsScripts";
import { SITE_URL } from "@/lib/site-config";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const plusJakarta = Plus_Jakarta_Sans({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
});

const SITE_DESCRIPTION =
  "Tư vấn size, phối đồ và thử mặc bằng AI trên ảnh của chính bạn. Mua thời trang đúng size ngay lần đầu.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "FitMe AI — Tư vấn size & phối đồ bằng AI",
  description: SITE_DESCRIPTION,
  openGraph: {
    type: "website",
    locale: "vi_VN",
    siteName: "FitMe AI",
    title: "FitMe AI — Thử trước khi mua",
    description: SITE_DESCRIPTION,
    images: ["/home-hero-bg.jpg"],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" className={`${geistSans.variable} ${geistMono.variable} ${plusJakarta.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-background text-foreground antialiased">
        <Providers>
          <FashionAmbient />
          <ConsumerChrome>{children}</ConsumerChrome>
        </Providers>
        <AnalyticsScripts />
      </body>
    </html>
  );
}

import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { Providers } from "@/providers";
import { ConsumerChrome } from "@/components/layout/ConsumerChrome";
import { FashionAmbient } from "@/components/layout/FashionAmbient";

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

export const metadata: Metadata = {
  title: "FitMe AI — Tư vấn size & phối đồ bằng AI",
  description: "Tư vấn size, phối đồ và preview outfit 2D bằng AI. Thử mặc minh họa thông minh.",
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
      </body>
    </html>
  );
}

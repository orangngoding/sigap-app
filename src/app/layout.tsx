
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { SiteHeader } from "@/components/global/site-header";
import { SiteFooter } from "@/components/global/site-footer";
import { MobileBottomNav } from "@/components/global/mobile-bottom-nav";
import { Providers } from "@/components/providers";
import { Toaster } from "@/components/global/toaster";
import { RegistrasiSW } from "@/components/darurat/registrasi-sw";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  openGraph: { type: "website", locale: "id_ID", siteName: "SIGAP" },
  title: {
    default: "SIGAP - Siaga dan Tanggap Bencana",
    template: "%s | SIGAP",
  },
  description:
    "Aplikasi kesiapsiagaan bencana untuk membantu masyarakat memahami risiko dan mempersiapkan langkah perlindungan sesuai kondisi keluarga dan lokasi.",
  applicationName: "SIGAP",
};

export default function RootLayout({
  children,
}: LayoutProps<"/">) {
  return (
    <html
      lang="id"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col pb-16 md:pb-0">
        <a
          href="#konten"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-primary-foreground"
        >
          Lewati ke konten utama
        </a>
        <SiteHeader />
        <Providers>{children}</Providers>
        <MobileBottomNav />
        <SiteFooter />
        <Toaster />
        {/* Didaftarkan di semua halaman agar Mode Darurat siap offline sejak kunjungan pertama (Blueprint 8.2) */}
        <RegistrasiSW />
      </body>
    </html>
  );
}

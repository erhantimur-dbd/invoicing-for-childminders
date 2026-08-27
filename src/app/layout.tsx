import type { Metadata, Viewport } from "next";
import { Nunito, Fraunces, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import CookieConsent from "@/components/CookieConsent";

// Warm, friendly body face with rounded terminals.
const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin"],
  display: "swap",
});

// Soft display serif for headings — adds warmth and personality.
const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  display: "swap",
  axes: ["SOFT", "opsz"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Dottie — for UK childminders",
    template: "%s | Dottie",
  },
  description: "Dottie answers new parents while you're with the children — start date, days, and 15/30-hour funding. Add invoicing when a child starts.",
  manifest: "/manifest.json",
  metadataBase: new URL("https://www.godottie.cloud"),
  verification: {
    google: "NdRl-7hEzWp8asSyK2YBfiiYKwcVhbXDbFHm-foNlBU",
  },
  openGraph: {
    siteName: "Dottie",
    title: "Dottie Enquiries — never miss a new parent",
    description: "Answer new parents, qualify funded hours, and book visits while you're with the children. Add invoicing when they start.",
    url: "https://www.godottie.cloud",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Dottie Enquiries — never miss a new parent",
    description: "Answer new parents, qualify funded hours, and book visits while you're with the children.",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#059669",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en-GB" className={`${nunito.variable} ${fraunces.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-[#fdf8f1]">
        {children}
        <Toaster richColors position="top-center" />
        <CookieConsent gaId="G-CCYVZXRWK0" />
      </body>
    </html>
  );
}

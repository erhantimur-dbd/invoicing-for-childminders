import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Dottie — Invoicing simplified.",
    template: "%s | Dottie",
  },
  description: "You didn't become a childminder to spend Sunday nights writing invoices. That's Dottie's job. Invoicing on autopilot for UK childcare professionals.",
  manifest: "/manifest.json",
  metadataBase: new URL("https://www.dottie.cloud"),
  openGraph: {
    siteName: "Dottie",
    title: "Dottie — Invoicing simplified.",
    description: "Invoicing on autopilot for UK childminders and childcare professionals.",
    url: "https://www.dottie.cloud",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Dottie — Invoicing simplified.",
    description: "Invoicing on autopilot for UK childminders and childcare professionals.",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#059669",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-gray-50">
        {children}
        <Toaster richColors position="top-center" />
      </body>
    </html>
  );
}

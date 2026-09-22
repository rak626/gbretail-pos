import type { Metadata } from "next";
import { Inter, Geist } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { ThemeProvider } from "@/components/theme-provider";

const geist = Geist({ subsets: ["latin"], variable: "--font-sans" });

const inter = Inter({ subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
  title: {
    default: "GB Retail — Fast POS, Stock & Khata",
    template: "%s | GB Retail",
  },
  description:
    "Offline-first POS for GB Retail — bill in seconds, manage stock, track Khata ledger and see real profit analytics. Works on 720p & 1080p kiosks, online or offline.",
  applicationName: "GB Retail",
  keywords: ["GB Retail", "POS", "Kirana", "Grocery", "Inventory", "Khata", "Ledger", "Billing", "Analytics"],
  authors: [{ name: "GB Retail" }],
  creator: "GB Retail",
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon.png", type: "image/png", sizes: "32x32" },
    ],
    apple: [{ url: "/apple-icon.png", sizes: "180x180", type: "image/png" }],
  },
  openGraph: {
    title: "GB Retail — Fast POS, Stock & Khata",
    description: "Billing in seconds, live inventory, Khata ledger & profit analytics for your local grocery store.",
    type: "website",
    locale: "en_IN",
  },
  manifest: "/manifest.webmanifest",
};

export const viewport = {
  themeColor: "#0f7a3c",
  colorScheme: "light dark" as const,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={cn("h-full", "font-sans", geist.variable)} suppressHydrationWarning>
      <body className={`h-full flex flex-col ${inter.className}`}>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}

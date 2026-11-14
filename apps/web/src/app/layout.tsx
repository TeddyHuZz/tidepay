import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { LANDING_URL } from "@/lib/config";

const arrayFont = localFont({
  src: "./fonts/Array/Fonts/WEB/fonts/Array-Regular.woff2",
  variable: "--font-array",
  display: "swap",
  weight: "100 900",
});

const khandFont = localFont({
  src: "./fonts/Khand/Fonts/WEB/fonts/Khand-Regular.woff2",
  variable: "--font-khand",
  display: "swap",
  weight: "100 900",
});

export const metadata: Metadata = {
  metadataBase: new URL(LANDING_URL),
  title: "TidePay | Non-Custodial Recurring Subscriptions on Solana & NEAR",
  description:
    "Purpose-built multi-chain recurring billing engine for Solana and NEAR. Zero custodial lockups, time-locked delegated pulls, prepaid NEP-141 epochs, NEAR Intents 1Click, and Solana Blinks.",
  openGraph: {
    title: "TidePay | Non-Custodial Recurring Subscriptions on Solana & NEAR",
    description:
      "Time-locked delegated pull billing on Solana, prepaid NEP-141 subscriptions on NEAR, and autonomous keeper cranks.",
    url: LANDING_URL,
    siteName: "TidePay",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "TidePay - Non-Custodial Recurring Subscriptions on Solana & NEAR",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "TidePay | Recurring Subscriptions on Solana & NEAR",
    description: "Zero custodial lockup. Solana Blinks, NEAR NEP-141 epochs & 1Click Intents.",
    images: ["/og-image.png"],
  },
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
    shortcut: "/icon.svg",
    apple: "/icon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`dark scroll-smooth ${arrayFont.variable} ${khandFont.variable}`}>
      <body className="min-h-screen bg-[#08090a] text-zinc-100 antialiased font-sans selection:bg-[#14F195]/30 selection:text-white">
        <div className="relative flex min-h-screen flex-col linear-glow-bg">
          <Navbar />
          <main className="flex-1">{children}</main>
          <Footer />
        </div>
      </body>
    </html>
  );
}

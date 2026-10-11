import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";

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
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "https://tidepay.xyz"),
  title: "TidePay | Non-Custodial Recurring Subscriptions on Solana",
  description:
    "Purpose-built recurring billing engine for Solana. Zero custodial escrow risk. Time-locked pull payments via Token-2022 and autonomous keeper cranks. Collect subscriptions in-feed with Solana Blinks.",
  openGraph: {
    title: "TidePay | Non-Custodial Recurring Subscriptions on Solana",
    description:
      "Time-locked delegated pull billing and autonomous keeper cranks for Solana.",
    url: "https://tidepay.xyz",
    siteName: "TidePay",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "TidePay - Non-Custodial Recurring Subscriptions on Solana",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "TidePay | Recurring Subscriptions on Solana",
    description: "Zero escrow. 1-click in-feed Blinks. Autonomous keeper cranks.",
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

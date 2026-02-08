import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { Navbar } from "@/components/Navbar";
import { ConfigBanner } from "@/components/ConfigBanner";
import { NetworkGuard } from "@/components/NetworkGuard";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Clawfolio | Launch autonomous trading agents on Monad",
  description: "Social agent launchpad for Monad. Create, tokenize, and verify autonomous trading agents onchain.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-[#0a0a0a] text-white min-h-screen`}
      >
        <Providers>
          <Navbar />
          <ConfigBanner />
          <NetworkGuard />
          <main>{children}</main>
        </Providers>
      </body>
    </html>
  );
}

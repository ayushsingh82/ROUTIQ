import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "ROUTIQ — One API. Every model. No single gatekeeper.",
  description: "Ethereum-native AI agent payments: private reads over Anon-RPC, spending policies enforced by EIP-8141 Frame Transactions on the Alternative Mempool, and an OpenAI-compatible router.",
  icons: { icon: [{ url: "/icon.svg", type: "image/svg+xml" }] },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full bg-black`}>
      <body className="flex min-h-full flex-col bg-black font-sans antialiased">{children}</body>
    </html>
  );
}

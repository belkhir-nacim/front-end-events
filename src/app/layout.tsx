import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { GeistPixelSquare } from "geist/font/pixel";
import "./globals.css";

const siteName = process.env.NEXT_PUBLIC_SITE_NAME ?? "Serenia";

export const metadata: Metadata = {
  title: {
    default: `${siteName} — Climate risk for your date & place`,
    template: `%s · ${siteName}`,
  },
  description:
    "Know the weather odds before you commit. Historical rain and heat risk for any address and any date — built on 80+ years of climate reanalysis, not a 10-day forecast.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"),
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${GeistSans.variable} ${GeistMono.variable} ${GeistPixelSquare.variable} h-full`}
    >
      <body className="min-h-full flex flex-col antialiased">{children}</body>
    </html>
  );
}

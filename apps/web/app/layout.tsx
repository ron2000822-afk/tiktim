import type { Metadata } from "next";
import { Suspense } from "react";
import { Heebo } from "next/font/google";
import "./globals.css";
import { Header } from "@/app/components/Header";
import { Footer } from "@/app/components/Footer";
import { CookieConsentServer } from "@/app/components/CookieConsentServer";
import { PostHogProvider } from "@/app/components/PostHogProvider";
import { SITE_DESCRIPTION, SITE_NAME } from "@/app/lib/copy/site";

const heebo = Heebo({
  variable: "--font-heebo",
  subsets: ["hebrew", "latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.SITE_URL ?? "http://localhost:3000"),
  title: {
    default: SITE_NAME,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="he" dir="rtl" className={`${heebo.variable} h-full`}>
      <body className="flex min-h-full flex-col font-sans antialiased">
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
        <PostHogProvider />
        <Suspense fallback={null}>
          <CookieConsentServer />
        </Suspense>
      </body>
    </html>
  );
}

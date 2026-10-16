import type { Metadata, Viewport } from "next";
import { fontVars } from "@/lib/fonts";
import "./globals.css";
import { PwaRegister } from "@/components/InstallApp";

export const metadata: Metadata = {
  title: "סגרנו – הצעות מחיר שנסגרות",
  description: "סגרנו: הצעות מחיר מעוצבות בעברית — לוגו, חתימה וחותמת, PDF, מייל ווואטסאפ, ואישור לקוח בלחיצה.",
  applicationName: "סגרנו",
  appleWebApp: { capable: true, title: "סגרנו", statusBarStyle: "default" },
  icons: { icon: [{ url: "/favicon-32.png", sizes: "32x32" }, { url: "/icons/icon-192.png", sizes: "192x192" }], apple: "/apple-touch-icon.png" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#16263F" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="he" dir="rtl" className={fontVars}>
      <body className="min-h-screen">
        <PwaRegister />
        {children}
      </body>
    </html>
  );
}

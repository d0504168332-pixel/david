import type { Metadata, Viewport } from "next";
import { fontVars } from "@/lib/fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: "QuoteCraft – הצעות מחיר מעוצבות",
  description: "הפקת הצעות מחיר מעוצבות בעברית — לוגו, חתימה וחותמת, PDF, מייל ווואטסאפ.",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, themeColor: "#1f3a5f" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="he" dir="rtl" className={fontVars}>
      <body className="min-h-screen">{children}</body>
    </html>
  );
}

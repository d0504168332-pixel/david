import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "סגרנו – הצעות מחיר שנסגרות",
    short_name: "סגרנו",
    description: "הצעות מחיר מעוצבות, בקשות מלקוחות ואישור בלחיצה — מהנייד",
    lang: "he",
    dir: "rtl",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#F6F3EC",
    theme_color: "#16263F",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "הצעה חדשה", url: "/quotes/new", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "בקשות מלקוחות", url: "/requests", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
    ],
  };
}

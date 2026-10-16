import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "QuoteCraft – הצעות מחיר",
    short_name: "הצעות מחיר",
    description: "הפקת הצעות מחיר מעוצבות, בקשות מלקוחות ונסיעות — מהנייד",
    lang: "he",
    dir: "rtl",
    start_url: "/quotes",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f5f3ef",
    theme_color: "#1f3a5f",
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

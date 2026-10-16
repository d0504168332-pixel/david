// Service worker מינימלי: מאפשר התקנה כאפליקציה ודף "אין חיבור" כשאין אינטרנט.
// לא שומר נתונים של המערכת במטמון — הכול נטען תמיד מהשרת.
const CACHE = "qc-shell-v1";
const OFFLINE = "/offline.html";

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll([OFFLINE, "/icons/icon-192.png"])).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.mode !== "navigate") return; // רק ניווט בין דפים
  e.respondWith(fetch(req).catch(() => caches.match(OFFLINE)));
});

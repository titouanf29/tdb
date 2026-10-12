/* Le service worker de CaptenTDB : il reçoit les notifications push et
 * ouvre la bonne page quand on les touche. Il ne met RIEN en cache — un
 * simulateur qui afficherait des cours d'hier hors ligne serait pire
 * qu'une page qui ne charge pas. */
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));

self.addEventListener("push", (e) => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch { d = { message: e.data && e.data.text() }; }
  e.waitUntil(self.registration.showNotification(d.titre || "CaptenTDB", {
    body: d.message || "",
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    lang: "fr",
    data: { lien: d.lien || "/dashboard" },
  }));
});

self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const lien = (e.notification.data && e.notification.data.lien) || "/dashboard";
  e.waitUntil((async () => {
    const fenetres = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const f of fenetres) {
      if (new URL(f.url).origin === self.location.origin) {
        await f.focus();
        return f.navigate(lien);
      }
    }
    return self.clients.openWindow(lien);
  })());
});
